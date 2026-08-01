/**
 * Screenshots the player character, and nothing else.
 *
 * The full walkthrough spends minutes on the drop, the orbit sweep, panels and
 * the mobile pass before it reaches the character — under software WebGL that
 * is most of a ten-minute run to inspect one figure. Tuning arm angles by eye
 * needs a tight loop, so this does the minimum: land, place the character on
 * open ground, orbit round to the front, and shoot it lowered and shouldered.
 *
 *   node scripts/shot-character.mjs
 */
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { mkdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const outDir = join(root, 'shots')
mkdirSync(outDir, { recursive: true })

const freePort = () =>
  new Promise((resolve, reject) => {
    const s = createServer()
    s.once('error', reject)
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })

const port = await freePort()
const base = `http://127.0.0.1:${port}`
const preview = spawn(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'],
  { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' }
)
const stop = () => {
  try {
    preview.kill()
  } catch {
    /* already gone */
  }
}
process.on('exit', stop)

for (let deadline = Date.now() + 30000; ; ) {
  try {
    if ((await fetch(base, { signal: AbortSignal.timeout(1500) })).ok) break
  } catch {
    /* not up yet */
  }
  if (Date.now() > deadline) {
    stop()
    console.error('preview did not start')
    process.exit(1)
  }
  await new Promise((r) => setTimeout(r, 300))
}

const errors = []
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

// Same CDP capture as visual-check: software rendering never goes idle, so
// Playwright's screenshot helper waits for a stable frame that never arrives.
const client = await page.context().newCDPSession(page)
const shot = async (name) => {
  const { data } = await client.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'))
  console.log(`  > shots/${name}.png`)
}
const wait = (ms) => page.waitForTimeout(ms)

console.log(`Loading ${base} ...`)
await page.goto(`${base}?debug`, { waitUntil: 'load', timeout: 60000 })

const drop = page.getByRole('button', { name: /drop in/i })
await drop.waitFor({ state: 'visible', timeout: 30000 })
await drop.click({ force: true, timeout: 120000 })
await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 120000 })
console.log('Landed.')

const box = await (await page.$('canvas')).boundingBox()
const cx = box.x + box.width / 2
const cy = box.y + box.height / 2

// Open, flat ground. In the trees on a hillside you photograph a backpack.
await page.evaluate(() => window.__tp && window.__tp(0, 8, 9))
await wait(2200)

// Pull the boom in to ~5 units, then orbit most of the way round to the front.
// Minimum zoom crops the figure; a downward drag pins the camera overhead.
await page.mouse.move(cx, cy)
await page.mouse.wheel(0, -180)
await page.mouse.down()
await page.mouse.move(cx + 700, cy - 30, { steps: 16 })
await page.mouse.up()
await wait(1600)
await shot('char-01-front-lowered')

await page.mouse.down({ button: 'right' })
await wait(1800)
await shot('char-02-front-aimed')
await page.mouse.up({ button: 'right' })
await wait(800)

// Side-on, where elbow and knee flexion actually read.
await page.mouse.down()
await page.mouse.move(cx - 380, cy, { steps: 12 })
await page.mouse.up()
await wait(1400)
await shot('char-03-side-lowered')

await page.mouse.down({ button: 'right' })
await wait(1800)
await shot('char-04-side-aimed')
await page.mouse.up({ button: 'right' })

await browser.close()
stop()

if (errors.length) {
  console.log(`\nFAILED - ${[...new Set(errors)].length} console error(s):`)
  for (const e of [...new Set(errors)].slice(0, 10)) console.log('  x ' + e.slice(0, 300))
  process.exit(1)
}
console.log('\nPASS - four character shots, no console errors')
