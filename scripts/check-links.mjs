/**
 * Checks every outbound URL in portfolioData actually resolves, and that the
 * resume downloads from a *built* preview rather than only the dev server.
 *
 * Split out from visual-check because it needs no browser and no GPU — it is
 * seconds, not the ten minutes a software-WebGL walkthrough takes, so it can
 * be run every time content changes.
 *
 *   node scripts/check-links.mjs [previewUrl]
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

const { projects, contactChannels, profile } = await import('../src/data/portfolioData.ts')

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
const base = process.argv[2] ?? `http://127.0.0.1:${port}`

let preview = null
if (!process.argv[2]) {
  preview = spawn(
    process.platform === 'win32' ? 'npx.cmd' : 'npx',
    ['vite', 'preview', '--port', String(port), '--host', '127.0.0.1', '--strictPort'],
    { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' }
  )
  const deadline = Date.now() + 30000
  for (;;) {
    try {
      const r = await fetch(base, { signal: AbortSignal.timeout(1500) })
      if (r.ok) break
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) {
      preview.kill()
      console.error('Preview server did not start within 30s')
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 300))
  }
}

const failures = []
const blocked = []

/**
 * HEAD first; a lot of hosts answer HEAD with 405 and need a GET.
 *
 * 401/403/429 are reported separately from a real failure. LinkedIn in
 * particular rate-limits anything that isn't a browser, so treating its 429 as
 * a broken link would make this script cry wolf on every run and train
 * everyone to ignore it.
 */
const BOT_BLOCKED = new Set([401, 403, 429, 999])

async function reachable(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const r = await fetch(url, {
        method,
        redirect: 'follow',
        signal: AbortSignal.timeout(15000),
        headers: { 'user-agent': 'Mozilla/5.0 (link-check)' },
      })
      if (r.ok) return { ok: true, status: r.status }
      if (method === 'GET') {
        return { ok: BOT_BLOCKED.has(r.status), blocked: BOT_BLOCKED.has(r.status), status: r.status }
      }
    } catch (e) {
      if (method === 'GET') return { ok: false, status: e.name === 'TimeoutError' ? 'timeout' : e.message }
    }
  }
  return { ok: false, status: 'unknown' }
}

const note = (label, url, r) => {
  const tag = r.blocked ? 'BLOCK' : r.ok ? 'PASS' : 'FAIL'
  console.log(`${tag.padEnd(5)} ${label.padEnd(18)} ${r.status}  ${url}`)
  if (r.blocked) blocked.push(`${label} -> ${r.status} ${url}`)
  else if (!r.ok) failures.push(`${label} -> ${r.status} ${url}`)
}

console.log('--- built index.html ---')
{
  const html = await (await fetch(base, { signal: AbortSignal.timeout(10000) })).text()
  const abs = /property="og:image" content="https:\/\/[^"]+\/og\.png"/.test(html)
  const canon = /rel="canonical" href="https:\/\/[^"]+"/.test(html)
  if (process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    console.log(`${abs ? 'PASS' : 'FAIL'}  og:image is absolute`)
    console.log(`${canon ? 'PASS' : 'FAIL'}  canonical injected`)
    if (!abs) failures.push('og:image is still relative in the built HTML')
    if (!canon) failures.push('canonical missing from the built HTML')
  } else {
    // Without an origin the tags stay relative on purpose. On Vercel the
    // platform supplies VERCEL_PROJECT_PRODUCTION_URL, so this only ever
    // shows up on a bare local build.
    console.log('NOTE  no SITE_URL / VERCEL_PROJECT_PRODUCTION_URL — og tags stay relative')
  }
}

console.log('\n--- resume, from the built preview ---')
const resume = await fetch(`${base}${profile.resumeUrl}`, { signal: AbortSignal.timeout(10000) })
const ctype = resume.headers.get('content-type') ?? ''
const bytes = Number(resume.headers.get('content-length') ?? 0)
const okResume = resume.ok && ctype.includes('pdf') && bytes > 10000
console.log(
  `${okResume ? 'PASS' : 'FAIL'}  ${profile.resumeUrl}  ${resume.status} ${ctype} ${bytes}B`
)
if (!okResume) failures.push(`resume ${profile.resumeUrl} -> ${resume.status} ${ctype} ${bytes}B`)

console.log('\n--- profile links ---')
for (const [key, url] of Object.entries(profile)) {
  if (typeof url !== 'string' || !url.startsWith('http')) continue
  note(key, url, await reachable(url))
}

console.log('\n--- contact channels ---')
for (const c of contactChannels) {
  if (c.href.startsWith('mailto:')) {
    console.log(`SKIP  ${c.id.padEnd(18)} mailto`)
    continue
  }
  note(c.id, c.href, await reachable(c.href))
}

console.log('\n--- project links ---')
for (const p of projects) {
  if (!p.links.length) {
    console.log(`NOTE  ${p.id.padEnd(18)} no links yet`)
    continue
  }
  for (const l of p.links) {
    note(`${p.id}/${l.label}`, l.url, await reachable(l.url))
  }
}

preview?.kill()

console.log(`\n${'='.repeat(56)}`)
if (blocked.length) {
  console.log('\nBot-blocked (not broken — these hosts refuse non-browser requests):')
  for (const b of blocked) console.log('  ! ' + b)
}
if (failures.length) {
  console.log(`\nFAILED - ${failures.length} unreachable link(s):`)
  for (const f of failures) console.log('  x ' + f)
  process.exit(1)
}
console.log('\nPASS - every link resolved and the resume downloads')
