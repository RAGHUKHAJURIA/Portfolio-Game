/**
 * Rasterises the SVG social card and app icon into PNGs.
 *
 * This is not decoration. Every major link-preview scraper — Facebook,
 * LinkedIn, X, Slack, WhatsApp, iMessage — refuses SVG for og:image, so an
 * SVG card means a blank preview everywhere the link gets shared, which for a
 * portfolio is the one place it matters most. Same story for
 * apple-touch-icon: iOS wants a PNG.
 *
 * Rendered with the Playwright Chromium that is already a dev dependency, so
 * this adds no new tooling.
 *
 *   node scripts/make-images.mjs
 */
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pub = join(here, '..', 'public')

const TARGETS = [
  { svg: 'og.svg', png: 'og.png', width: 1200, height: 630 },
  { svg: 'favicon.svg', png: 'apple-touch-icon.png', width: 180, height: 180 },
  { svg: 'favicon.svg', png: 'favicon-96.png', width: 96, height: 96 },
]

const browser = await chromium.launch()

for (const t of TARGETS) {
  const svg = readFileSync(join(pub, t.svg), 'utf8')
  const page = await browser.newPage({
    viewport: { width: t.width, height: t.height },
    // 1: these are exact-pixel deliverables, not screen captures — a device
    // scale factor would silently double the dimensions scrapers expect.
    deviceScaleFactor: 1,
  })
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;background:#14181d}
       svg{display:block;width:${t.width}px;height:${t.height}px}
     </style>${svg}`,
    { waitUntil: 'load' }
  )
  const buf = await page.screenshot({ type: 'png' })
  writeFileSync(join(pub, t.png), buf)
  console.log(`  > public/${t.png}  ${t.width}x${t.height}  ${buf.length}B`)
  await page.close()
}

await browser.close()
console.log('\nDone. Commit the PNGs — the build copies public/ verbatim.')
