/** A short repeated streaming tour against the production preview. */
import { chromium } from 'playwright'
import { writeFileSync } from 'node:fs'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const output = process.argv[3] ?? 'perf-memory-tour.json'
const browser = await chromium.launch({ args: [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push(e.message))
const samples = []
try {
  const url = new URL(base)
  url.searchParams.set('debug', '')
  url.searchParams.set('quality', 'medium')
  await page.goto(url.href, { waitUntil: 'load', timeout: 60000 })
  await page.getByRole('button', { name: /drop in/i }).click({ timeout: 60000 })
  await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 90000 })
  const visit = async (name, x, y, z, settle = 4500) => {
    await page.evaluate(([x, y, z]) => window.__tp?.(x, y, z), [x, y, z])
    await page.waitForTimeout(settle)
    const sample = await page.evaluate((name) => {
      const state = window.__r3f?.getState?.() ?? window.__r3f
      let objects = 0, meshes = 0
      state.scene.traverse((o) => { objects++; if (o.isMesh) meshes++ })
      return { name, ...window.__streaming, objects, meshes }
    }, name)
    samples.push(sample)
    console.log(JSON.stringify(sample))
  }
  for (let lap = 1; lap <= 2; lap++) {
    await visit(`center-${lap}`, 0, 7, 9, 8500)
    await visit(`about-${lap}`, 0, 7, -62)
    await visit(`projects-${lap}`, -68, 7, 5)
    await visit(`range-${lap}`, 92, 10, 18)
  }
  await visit('center-final', 0, 7, 9, 10000)
  writeFileSync(output, JSON.stringify({ samples, errors }, null, 2))
  if (errors.length) throw new Error(`${errors.length} browser errors: ${errors.slice(0, 3).join('; ')}`)
} finally {
  await browser.close()
}
