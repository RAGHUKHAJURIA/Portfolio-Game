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

// On a hill flank, where foot planting actually has something to do: a level
// stance here buries the uphill boot and hangs the downhill one in the air.
// (-81, -49) is the largest hill; this sits on its side, not its crown.
await page.evaluate(() => window.__tp && window.__tp(-70, 20, -40))
await wait(2400)
// Zoom in and pitch down, or the boots — the whole point of the shot — are a
// dozen pixels tall at the default boom length.
await page.mouse.move(cx, cy)
// Moderate zoom only: the minimum boom crops the figure, and a downward drag
// pins the camera overhead where the whole character reads as a helmet.
await page.mouse.wheel(0, -300)
await page.mouse.down()
await page.mouse.move(cx + 240, cy - 40, { steps: 10 })
await page.mouse.up()
await wait(1600)
await shot('05b-slope')

// The grip and the face need open ground and a view from the front, so this
// one happens on the landing plaza with the camera orbited most of the way
// round — in the trees on a hillside you photograph a backpack.
await page.evaluate(() => window.__tp && window.__tp(0, 8, 9))
await wait(2400)
await page.mouse.down()
await page.mouse.move(cx + 700, cy - 30, { steps: 16 })
await page.mouse.up()
await wait(1400)
await shot('05d-front')

await page.mouse.down({ button: 'right' })
await wait(1600)
await shot('05c-aiming')
await page.mouse.up({ button: 'right' })
await wait(600)

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

// Full map: M opens, clicking drops a pin, Escape returns to gameplay.
await page.keyboard.press('KeyM')
const mapPanel = page.getByRole('dialog', { name: /tactical map/i })
await mapPanel.waitFor({ state: 'visible', timeout: 60000 })
await wait(900)
await shot('14-fullmap')

const mapCanvas = mapPanel.locator('canvas')
const mapBox = await mapCanvas.boundingBox()
await mapCanvas.click({ position: { x: mapBox.width * 0.34, y: mapBox.height * 0.3 } })
await wait(700)
await shot('15-fullmap-pin')

await page.keyboard.press('Escape')
await mapPanel.waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 30000 })
// Second M must reopen, and a second press must close again — the freeze check
// runs before movement keys, so a one-way toggle would trap the player.
await page.keyboard.press('KeyM')
await mapPanel.waitFor({ state: 'visible', timeout: 30000 })
await page.keyboard.press('KeyM')
await mapPanel.waitFor({ state: 'detached', timeout: 30000 }).catch(() => {})
const hudBack = await page.locator('button[title="Open ABOUT"]').isVisible()
if (!hudBack) errors.push('HUD did not come back after closing the full map')
console.log(`Full map opened, pinned and closed. HUD restored: ${hudBack}`)
await wait(500)

// Jump.
await page.keyboard.press('Space')
await wait(340)
await shot('07-jump')
await wait(1400)

/**
 * Walkable interior. The content trigger moved indoors and onto the upper
 * floor, so this checks the thing that can actually break: a proximity test
 * that ignores height would fire the panel from the ground floor, directly
 * underneath the object, and nobody would ever need the stairs.
 */
// The About house sits at (0, -62) unrotated with its corkboard at local
// (2.2, -3.4), so both floors share world XZ (2.2, -65.4). Each teleport lands
// a little above its floor and lets gravity settle, rather than pinning an
// exact Y the terrain could move out from under.
const CORK_X = 2.2
const CORK_Z = -65.4

await page.evaluate(([x, z]) => window.__tp && window.__tp(x, 7.4, z), [CORK_X, CORK_Z])
await wait(1600)
const promptDownstairs = await page.getByTestId('interact-prompt').isVisible().catch(() => false)
await shot('16-interior-ground')

// Upper floor, same spot: now it must.
await page.evaluate(([x, z]) => window.__tp && window.__tp(x, 10.6, z), [CORK_X, CORK_Z])
await wait(1600)
const promptUpstairs = await page.getByTestId('interact-prompt').isVisible().catch(() => false)
await shot('17-interior-upper')

console.log(`Interior prompt — ground floor: ${promptDownstairs}, upper floor: ${promptUpstairs}`)
if (promptDownstairs) errors.push('content prompt fires from the ground floor — the height check is not working')
if (!promptUpstairs) errors.push('content prompt does not fire on the upper floor next to the object')

if (promptUpstairs) {
  await page.keyboard.press('KeyE')
  await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 30000 })
  await wait(700)
  await shot('18-interior-panel')
  await page.keyboard.press('Escape')
  await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 30000 })
  console.log('Opened the About panel from inside the building.')
}

/**
 * Shooting range. The firing line is at world (92, 18) + z ≈ 5, and the
 * targets run away down −Z, so facing the player that way and holding right
 * mouse puts a plate under the crosshair.
 */
await page.evaluate(() => window.__tp && window.__tp(92, 10, 23))
await wait(2000)
await shot('19-range')

const beforeShots = await page.evaluate(() => document.body.innerText.includes('RANGE'))
void beforeShots

// Aim down the lanes: yaw 0 looks toward −Z with the camera behind the player.
await page.mouse.move(cx, cy)
await page.mouse.down({ button: 'right' })
await wait(900)
await shot('20-aiming')

for (let i = 0; i < 4; i++) {
  await page.mouse.down({ button: 'left' })
  await page.mouse.up({ button: 'left' })
  await wait(450)
}
await wait(700)
await shot('21-firing')
await page.mouse.up({ button: 'right' })
await wait(600)

const score = await page.evaluate(() => {
  const el = [...document.querySelectorAll('[data-ui]')].find((n) => /range/i.test(n.textContent))
  return el ? el.textContent.replace(/\s+/g, ' ').trim() : null
})
console.log(`Range scoreboard: ${score ?? 'not shown'}`)
if (!score) errors.push('firing produced no scoreboard — the weapon never registered a shot')

// Back to the plaza for the rest of the run.
await page.evaluate(() => window.__tp && window.__tp(0, 6, 9))
await wait(900)

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
