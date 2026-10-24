import { chromium } from 'playwright'

const browser = await chromium.launch({ args: [
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
] })
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
page.on('pageerror', (e) => console.log('ERROR', e.message))
await page.goto('http://127.0.0.1:4173/?debug&quality=medium', { waitUntil: 'load' })
await page.getByRole('button', { name: /drop in/i }).click()
await page.locator('button[title="Open ABOUT"]').waitFor({ state: 'visible', timeout: 90000 })
const snapshot = async (tag) => console.log(tag, await page.evaluate(() => {
  const scene = (window.__r3f.getState?.() ?? window.__r3f).scene
  const player = scene.getObjectByName('CharacterYawRoot')
  player.updateWorldMatrix(true, false)
  const e = player.matrixWorld.elements
  return { x: +e[12].toFixed(2), feetY: +e[13].toFixed(2), z: +e[14].toFixed(2),
    prompt: !!document.querySelector('[data-testid="interact-prompt"]'),
    streaming: window.__streaming }
}))
await page.evaluate(() => window.__tp(2.2, 7.4, -65.4))
await page.waitForTimeout(3500)
await snapshot('downstairs')
await page.evaluate(() => window.__tp(2.2, 9.3, -65.4))
for (let i = 0; i < 12; i++) {
  await page.waitForTimeout(800)
  await snapshot(`upstairs-${i}`)
}
await page.keyboard.press('KeyE')
await page.waitForTimeout(1500)
console.log('dialog', await page.getByRole('dialog').isVisible().catch(() => false))
await browser.close()
