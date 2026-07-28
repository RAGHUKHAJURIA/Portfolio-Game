/**
 * Boots `vite preview` on a free port, runs the headless browser walkthrough
 * against it, then shuts the server down. Used by `npm run verify`.
 */
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')

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
const url = `http://127.0.0.1:${port}`

console.log(`Starting preview on ${url} …`)
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
process.on('SIGINT', () => {
  stop()
  process.exit(130)
})

// Poll until the server answers rather than sleeping a fixed amount.
const deadline = Date.now() + 30000
for (;;) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) })
    if (r.ok) break
  } catch {
    /* not up yet */
  }
  if (Date.now() > deadline) {
    stop()
    console.error('Preview server did not start within 30s')
    process.exit(1)
  }
  await new Promise((r) => setTimeout(r, 300))
}

const check = spawn(process.execPath, [join(here, 'visual-check.mjs'), url, join(root, 'shots')], {
  cwd: root,
  stdio: 'inherit',
})

const code = await new Promise((resolve) => check.on('close', resolve))
stop()
process.exit(code ?? 1)
