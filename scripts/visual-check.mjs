/**
 * Loads the built site in headless Chromium (SwiftShader WebGL), clicks
 * through the drop sequence, walks the character around, opens every panel,
 * and screenshots each stage. Any console error or page exception fails
 * the run.
 *
 *   node scripts/visual-check.mjs [baseUrl] [outDir]
 *
 * `QUICK=1` stops after landing and one look-around. Software WebGL takes ten
 * minutes over the full pass, which is too slow a loop for tuning lighting.
 */
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:4173'
const outDir = process.argv[3] ?? 'shots'
const quick = !!process.env.QUICK
mkdirSync(outDir, { recursive: true })

const errors = []
const warnings = []

const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
})

const watch = (p, tag = '') => {
  p.on('console', (msg) => {
    const t = msg.type()
    if (t === 'error') errors.push(tag + msg.text())
    else if (t === 'warning') warnings.push(tag + msg.text())
  })
  p.on('pageerror', (e) => errors.push(`${tag}PAGEERROR: ${e.message}\n${e.stack ?? ''}`))
  return p
}

const page = watch(await browser.newPage({ viewport: { width: 1366, height: 768 } }))

/**
 * Capture via CDP rather than page.screenshot().
 *
 * Software WebGL renders this scene at a few frames per second and the page
 * never goes idle, so Playwright's screenshot helper sits waiting for a
 * stable compositor frame that is never coming. Page.captureScreenshot grabs
 * whatever is on screen right now, which is all we need. This is a
 * headless-renderer limitation, not an app problem.
 */
const sessions = new WeakMap()
const shot = async (name, target = page) => {
  let client = sessions.get(target)
  if (!client) {
    client = await target.context().newCDPSession(target)
    sessions.set(target, client)
  }
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(data, 'base64'))
  console.log(`  > ${outDir}/${name}.png`)
}

const wait = (ms) => page.waitForTimeout(ms)

console.log(`Loading ${base} ...`)
await page.goto(`${base}?debug`, { waitUntil: 'load', timeout: 60000 })

// Confirm WebGL actually came up.
const glInfo = await page.evaluate(() => {
  const c = document.createElement('canvas')
  const gl = c.getContext('webgl2') || c.getContext('webgl')
  if (!gl) return null
  const dbg = gl.getExtension('WEBGL_debug_renderer_info')
  return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'unknown renderer'
})
console.log(`WebGL: ${glInfo ?? 'UNAVAILABLE'}`)
if (!glInfo) errors.push('WebGL context unavailable')

await wait(2600)
await shot('01-loading')

// Drop in.
const dropBtn = page.getByRole('button', { name: /drop in/i })
await dropBtn.waitFor({ state: 'visible', timeout: 30000 })
await dropBtn.click({ force: true, timeout: 120000 })
console.log('Dropped in.')

await wait(1600)
await shot('02-parachute')

// Wait out the descent, then confirm we actually reached the island.
await wait(9000)
await shot('03-landed')
await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 90000 })
console.log('Landed, HUD is up.')

const box = await (await page.$('canvas')).boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

/**
 * Orbit sweep — the regression test for props vanishing at certain camera
 * angles.
 *
 * The assertion is on the batches themselves, not on draw calls: the scene is
 * mostly individual house meshes, and honest per-mesh culling swings the
 * draw-call count by hundreds as buildings leave the view, so a cliff in that
 * number proves nothing. What does prove something is that no InstancedMesh is
 * still trusting a bounding sphere computed while its count was 0 — an empty
 * sphere passes the frustum test only when the world origin is on screen, which
 * is what made every tree and rock blink out when you turned around.
 */
const probe = () =>
  page.evaluate(() => {
    const s = window.__r3f
    if (!s) return null
    const { gl, scene } = s.getState ? s.getState() : s
    const bad = []
    let batches = 0
    scene.traverse((o) => {
      if (!o.isInstancedMesh || !o.visible) return
      batches++
      // Either culling is off, or the cached sphere actually covers the batch.
      if (o.frustumCulled && !(o.boundingSphere && o.boundingSphere.radius > 0)) {
        bad.push(`${o.name || o.type} r=${o.boundingSphere?.radius}`)
      }
    })
    return { calls: gl.info.render.calls, batches, bad }
  })

const sweep = []
for (let step = 0; step < (quick ? 2 : 8); step++) {
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  // 45° of yaw per step, with the pitch dipped and raised on the way round.
  // Keep the swing modest or the pitch clamp pins the sweep to a top-down view.
  await page.mouse.move(cx + 300, cy + [0, 70, 0, -70][step % 4], { steps: 10 })
  await page.mouse.up()
  if (step === 2) await page.mouse.wheel(0, -600) // zoom in
  if (step === 5) await page.mouse.wheel(0, 900) // and back out
  await wait(700)
  const p = await probe()
  if (!p) {
    errors.push('debug hook missing — cannot verify camera-angle culling')
    break
  }
  // Draw calls are not reported: with the effect composer in the pipeline,
  // `info.render.calls` reflects only the last fullscreen pass.
  sweep.push(`${p.batches}b`)
  // 12 prop batches from Props.tsx plus the dust pool. A drop here means the
  // traverse found nothing and the assertion below is vacuous.
  if (p.batches < 13) errors.push(`only ${p.batches} instanced batches in the scene — expected 13`)
  if (p.bad.length) {
    errors.push(`instanced batch with an empty bounding sphere: ${p.bad.join(', ')}`)
  }
  if (step === 0 || step === 4) await shot(`04-orbit-${step}`)
}
console.log(`Orbit sweep (live instanced batches): ${sweep.join(', ')}`)
await shot('04-look')

// Walk, then sprint.
await page.keyboard.down('KeyW')
await wait(1600)
await shot('05-walking')
if (quick) {
  await page.keyboard.up('KeyW')
  await browser.close()
  console.log(errors.length ? `\nQUICK FAIL\n  x ${errors.join('\n  x ')}` : '\nQUICK PASS')
  process.exit(errors.length ? 1 : 0)
}
await page.keyboard.down('ShiftLeft')
await wait(1600)
await shot('06-sprinting')
await page.keyboard.up('ShiftLeft')
await page.keyboard.up('KeyW')

// Jump.
await page.keyboard.press('Space')
await wait(340)
await shot('07-jump')
await wait(1400)

// Open every section from the objective tracker.
for (const label of ['ABOUT', 'PROJECTS', 'SKILLS', 'EXPERIENCE', 'CONTACT']) {
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  await page.locator(`button[title="Open ${label}"]`).click({ timeout: 120000 })
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 60000 })
  await wait(900)
  await shot(`08-panel-${label.toLowerCase()}`)

  if (label === 'PROJECTS') {
    await page.getByTestId('crate-card').first().click({ timeout: 120000 })
    await wait(900)
    await shot('09-project-detail')
    // First Escape backs out of the crate detail, second closes the panel.
    await page.keyboard.press('Escape')
    await wait(500)
  }

  await page.keyboard.press('Escape')
  await wait(700)
  // The objective tracker only exists while no panel is open.
  await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 30000 })
}

await wait(900)
await shot('10-back-on-island')
console.log('All five panels opened and closed.')

// Mobile pass. Close the desktop page first - two live WebGL scenes at once
// is more than software rendering can keep up with.
await page.close()

const mob = watch(
  await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  }),
  'MOBILE: '
)
await mob.goto(base, { waitUntil: 'load', timeout: 60000 })
await mob.waitForTimeout(2800)
await shot('11-mobile-loading', mob)

const mDrop = mob.getByRole('button', { name: /drop in/i })
await mDrop.waitFor({ state: 'visible', timeout: 30000 })
await mDrop.click({ force: true, timeout: 120000 })

// Wait for the drop to actually finish rather than guessing a duration —
// software rendering makes the intro take far longer here than on real
// hardware, and the app's own watchdog caps it at 9s of wall clock.
await mob
  .locator('button[title="Open PROJECTS"]')
  .waitFor({ state: 'visible', timeout: 120000 })
await mob.waitForTimeout(1200)
await shot('12-mobile-hud', mob)

// Confirm the touch UI is actually present.
const stick = await mob.locator('[data-ui].rounded-full').first().isVisible().catch(() => false)
console.log(`Mobile joystick visible: ${stick}`)
if (!stick) errors.push('MOBILE: on-screen joystick not rendered')

// Open a panel by touch.
await mob.locator('button[title="Open PROJECTS"]').click({ timeout: 60000 })
await mob.waitForTimeout(1000)
await shot('13-mobile-panel', mob)

await browser.close()

console.log(`\n${'='.repeat(60)}`)
if (warnings.length) {
  const uniq = [...new Set(warnings)]
  console.log(`\n${uniq.length} unique warning(s):`)
  for (const w of uniq.slice(0, 12)) console.log('  ! ' + w.slice(0, 300))
}
if (errors.length) {
  const uniq = [...new Set(errors)]
  console.log(`\nFAILED - ${uniq.length} unique error(s):`)
  for (const e of uniq.slice(0, 20)) console.log('  x ' + e.slice(0, 900))
  process.exit(1)
}
console.log('\nPASS - no console errors or page exceptions')
