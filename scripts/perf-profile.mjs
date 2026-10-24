/** Repeatable software-WebGL profile of the built site. Usage:
 *   node scripts/perf-profile.mjs [url] [output.json]
 * Keep the same machine, viewport and browser for before/after comparisons.
 */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const output = process.argv[3]
const short = process.env.PERF_SHORT === '1'
const browser = await chromium.launch({ args: [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
await page.addInitScript(() => {
  window.__perfFrames = []
  window.__perfLongTasks = []
  let previous = 0
  const frame = (time) => {
    if (previous) window.__perfFrames.push(time - previous)
    previous = time
    requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
  try {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__perfLongTasks.push(entry.duration)
    }).observe({ type: 'longtask', buffered: true })
  } catch { /* unsupported browser */ }
})

const samples = []
const sample = async (name, ms = 2500) => {
  await page.evaluate(() => { window.__perfFrames.length = 0; window.__perfLongTasks.length = 0 })
  await page.waitForTimeout(ms)
  const result = await page.evaluate((label) => {
    const frames = window.__perfFrames.slice().sort((a, b) => a - b)
    const mean = frames.reduce((a, b) => a + b, 0) / Math.max(1, frames.length)
    const index = (p) => frames[Math.min(frames.length - 1, Math.floor(frames.length * p))] ?? 0
    const state = window.__r3f?.getState?.() ?? window.__r3f
    let meshes = 0, shadows = 0, instances = 0
    state?.scene?.traverse?.((o) => {
      if (o.isMesh) { meshes++; if (o.castShadow) shadows++ }
      if (o.isInstancedMesh) instances++
    })
    return { name: label, frames: frames.length, meanMs: +mean.toFixed(1),
      fps: +(1000 / mean).toFixed(1), low1Fps: +(1000 / Math.max(1, index(0.99))).toFixed(1),
      p99Ms: +index(0.99).toFixed(1), worstMs: +(frames.at(-1) ?? 0).toFixed(1),
      longTasks: window.__perfLongTasks.length,
      longTaskMs: Math.round(window.__perfLongTasks.reduce((a, b) => a + b, 0)),
      meshes, shadows, instances, dpr: state?.gl?.getPixelRatio?.(),
      streaming: window.__streaming ?? null }
  }, name)
  samples.push(result)
  console.log(JSON.stringify(result))
}

try {
  const start = Date.now()
  const address = new URL(base)
  address.searchParams.set('debug', '')
  await page.goto(address.href, { waitUntil: 'load', timeout: 60000 })
  await page.getByRole('button', { name: /drop in/i }).waitFor({ timeout: 45000 })
  const boot = await page.evaluate(() => ({
    readyAtMs: Math.round(performance.now()),
    scripts: performance.getEntriesByType('resource').filter((e) => e.name.endsWith('.js'))
      .map((e) => ({ name: e.name.split('/').at(-1), transfer: e.transferSize, duration: Math.round(e.duration) })),
    longTasks: window.__perfLongTasks.length,
    longTaskMs: Math.round(window.__perfLongTasks.reduce((a, b) => a + b, 0)),
    measures: performance.getEntriesByType('measure').filter((e) => e.name.startsWith('dropzone:'))
      .map((e) => ({ name: e.name, ms: +e.duration.toFixed(1) })),
  }))
  console.log('BOOT', JSON.stringify(boot))
  await sample('ready', 2000)
  await page.getByRole('button', { name: /drop in/i }).click({ force: true })
  await sample('aerial', 1800)
  await sample('descent', 2500)
  await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 60000 })
  await sample('groundIdle', 3000)
  if (!short) {
  await page.keyboard.down('KeyW')
  await sample('walking', 3000)
  await page.keyboard.down('ShiftLeft')
  await sample('sprinting', 3000)
  await page.keyboard.up('ShiftLeft')
  await page.keyboard.up('KeyW')
  await page.evaluate(() => window.__tp?.(-70, 20, -40))
  await sample('chunkCrossing', 4000)
  await page.evaluate(() => window.__tp?.(2.2, 7.4, -65.4))
  await sample('building', 3500)
  await page.evaluate(() => window.__tp?.(92, 8, 18))
  await sample('range', 3500)
  }
  const measures = await page.evaluate(() => performance.getEntriesByType('measure')
    .filter((e) => e.name.startsWith('dropzone:'))
    .map((e) => ({ name: e.name, ms: +e.duration.toFixed(1) })))
  const result = { boot, samples, measures, errors, wallTimeSeconds: Math.round((Date.now() - start) / 1000) }
  if (output) writeFileSync(output, JSON.stringify(result, null, 2))
  console.log('ERRORS', JSON.stringify(errors))
} finally {
  await browser.close()
}
