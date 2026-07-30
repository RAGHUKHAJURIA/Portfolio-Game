import { defineConfig } from 'vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Rewrites the root-relative og:image, og:url and canonical URLs in
 * index.html to absolute ones at build time.
 *
 * Link scrapers do not resolve relative paths — a relative og:image is the
 * same as no preview card at all. The origin comes from Vercel's own
 * `VERCEL_PROJECT_PRODUCTION_URL`, which is the stable production domain
 * rather than the per-deployment URL, so previews and production both point
 * at the same canonical card. Set SITE_URL to override (custom domain, or a
 * local build you want to check).
 *
 * With neither set the tags stay relative, which is correct for `vite dev`
 * and merely inert anywhere else.
 */
function absoluteUrls(): Plugin {
  const origin =
    process.env.SITE_URL ??
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null)

  return {
    name: 'absolute-urls',
    // 'pre' so the tags are absolute before anything else reads the HTML.
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        if (!origin) return html
        const base = origin.replace(/\/$/, '')
        return html
          .replace(/(content=")(\/og\.png")/g, `$1${base}$2`)
          .replace(
            '</head>',
            `  <link rel="canonical" href="${base}/" />\n` +
              `    <meta property="og:url" content="${base}/" />\n  </head>`
          )
      },
    },
  }
}

export default defineConfig({
  plugins: [react(), absoluteUrls()],
  build: {
    // three.js + the Rapier wasm blob are both large and both needed on the
    // first frame, so there is nothing useful to lazy-load here. Splitting
    // them into their own chunks still helps: they change far less often than
    // app code, so they stay cached across deploys.
    chunkSizeWarningLimit: 1800,
    rolldownOptions: {
      output: {
        advancedChunks: {
          groups: [
            { name: 'three', test: /node_modules[\\/](three)[\\/]/ },
            { name: 'rapier', test: /node_modules[\\/]@dimforge[\\/]/ },
          ],
        },
      },
    },
  },
  server: { host: true },
  preview: { host: true },
})
