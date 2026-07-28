import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://127.0.0.1:4173'
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

page.on('console', (m) => console.log(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => console.log(`[pageerror] ${e.message}\n${e.stack}`))
page.on('requestfailed', (r) => console.log(`[reqfail] ${r.url()} :: ${r.failure()?.errorText}`))

await page.goto(base, { waitUntil: 'load', timeout: 60000 })
await page.waitForTimeout(Number(process.argv[3] ?? 5000))

const html = await page.evaluate(() => document.getElementById('root')?.innerHTML?.slice(0, 800))
console.log('\n--- #root innerHTML (first 800) ---')
console.log(html || '(EMPTY)')

await browser.close()
