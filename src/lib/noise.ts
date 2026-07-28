/**
 * Tiny deterministic value-noise. Used for terrain displacement and for
 * scattering props — same seed always produces the same island, so the map
 * never shifts between reloads.
 */

const hash2 = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}

const smooth = (t: number) => t * t * (3 - 2 * t)

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Value noise in roughly [-1, 1]. */
export function noise2(x: number, y: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const xf = x - xi
  const yf = y - yi

  const a = hash2(xi, yi)
  const b = hash2(xi + 1, yi)
  const c = hash2(xi, yi + 1)
  const d = hash2(xi + 1, yi + 1)

  const u = smooth(xf)
  const v = smooth(yf)

  return (lerp(lerp(a, b, u), lerp(c, d, u), v) - 0.5) * 2
}

/** Layered value noise. */
export function fbm(x: number, y: number, octaves = 4): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    value += noise2(x * freq, y * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return value / norm
}

/** Deterministic pseudo-random from an integer index, in [0, 1). */
export function rand(i: number, salt = 0): number {
  const s = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453123
  return s - Math.floor(s)
}
