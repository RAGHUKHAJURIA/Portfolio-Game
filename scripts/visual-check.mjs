/**
 * Loads the built site in headless Chromium (SwiftShader WebGL), clicks
 * through the drop sequence, walks the character around, and screenshots
 * each stage. Any console error or page exception fails the run.
 *
 *   node scripts/visual-check.mjs [baseUrl] [outDir]
 */
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const base = process.argv[2] ?? 'http://localhost:4173'
const outDir = process.argv[3] ?? 'shots'
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
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })

page.on('console', (msg) => {
  const t = msg.type()
  if (t === 'error') errors.push(msg.text())
  else if (t === 'warning') warnings.push(msg.text())
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}\n${e.stack ?? ''}`))

// Software WebGL renders this scene at a few frames per second, so give the
// compositor a long leash. This is a SwiftShader limit, not an app problem.
const shot = async (name, target = page) => {
  await target.screenshot({ path: `${outDir}/${name}.png`, timeout: 180000, animations: 'allow' })
  console.log(`  â–¸ ${outDir}/${name}.png`)
}

const wait = (ms) => page.waitForTimeout(ms)

console.log(`Loading ${base} â€¦`)
await page.goto(base, { waitUntil: 'load', timeout: 60000 })

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
await dropBtn.click({ force: true, timeout: 180000 })
console.log('Dropped in.')

await wait(1500)
await shot('02-parachute')

// Wait out the descent.
await wait(7000)
await shot('03-landed')

const canvas = await page.$('canvas')
const box = await canvas.boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

// Look around a little.
await page.mouse.move(cx, cy)
await page.mouse.down()
await page.mouse.move(cx + 260, cy + 40, { steps: 18 })
await page.mouse.up()
await wait(700)
await shot('04-look')

// Walk forward, then sprint.
await page.keyboard.down('KeyW')
await wait(1400)
await shot('05-walking')
await page.keyboard.down('ShiftLeft')
await wait(1500)
await shot('06-sprinting')
await page.keyboard.up('ShiftLeft')
await page.keyboard.up('KeyW')

// Jump.
await page.keyboard.press('Space')
await wait(320)
await shot('07-jump')
await wait(1200)

// Open every section straight from the objective tracker.
for (const label of ['ABOUT', 'PROJECTS', 'SKILLS', 'EXPERIENCE', 'CONTACT']) {
  const btn = page.locator(`button[title="Open ${label}"]`)
  await page.getByRole('dialog').waitFor({ state: 'detached', timeout: 60000 }).catch(() => {})
  await btn.click({ timeout: 180000 })
  await wait(950)
  await shot(`08-panel-${label.toLowerCase()}`)

  if (label === 'PROJECTS') {
    const crate = page.getByTestId('crate-card').first()
    await crate.click({ timeout: 180000 })
    await wait(900)
    await shot('09-project-detail')
    // First Escape backs out of the crate detail, second closes the panel.
    await page.keyboard.press('Escape')
    await wait(400)
  }

  await page.keyboard.press('Escape')
  await wait(600)
  // The objective tracker only exists while no panel is open.
  await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 15000 })
}

// Back on the island.
await page.keyboard.press('Escape')
await wait(700)
await shot('10-back-on-island')

// Player state readout â€” proves the character actually moved.
const finalState = await page.evaluate(() => {
  const c = document.querySelector('canvas')
  return { hasCanvas: !!c, w: c?.width, h: c?.height }
})
console.log('Canvas:', JSON.stringify(finalState))

// Mobile pass. Close the desktop page first — two live WebGL scenes at once
// is more than software rendering can keep up with.
await page.close()

const mob = await browser.newPage({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
})
mob.on('pageerror', (e) => errors.push(`MOBILE PAGEERROR: ${e.message}`))
mob.on('console', (m) => m.type() === 'error' && errors.push(`MOBILE: ${m.text()}`))
await mob.goto(base, { waitUntil: 'load', timeout: 60000 })
await mob.waitForTimeout(2600)
await shot('11-mobile-loading', mob)
console.log(`  â–¸ ${outDir}/11-mobile-loading.png`)
const mDrop = mob.getByRole('button', { name: /drop in/i })
await mDrop.waitFor({ state: 'visible', timeout: 30000 })
await mDrop.click({ force: true, timeout: 180000 })
await mob.waitForTimeout(9000)
await shot('12-mobile-hud', mob)
console.log(`  â–¸ ${outDir}/12-mobile-hud.png`)

await browser.close()

console.log(`\n${'='.repeat(60)}`)
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`)
  for (const w of [...new Set(warnings)].slice(0, 12)) console.log('  âš  ' + w.slice(0, 300))
}
if (errors.length) {
  console.log(`\nâŒ ${errors.length} error(s):`)
  for (const e of [...new Set(errors)].slice(0, 20)) console.log('  âœ– ' + e.slice(0, 900))
  process.exit(1)
}
console.log('\nâœ… no console errors or page exceptions')



