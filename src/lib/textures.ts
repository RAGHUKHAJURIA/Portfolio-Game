import { DataTexture, RGBAFormat, RepeatWrapping, LinearMipmapLinearFilter } from 'three'

/**
 * Procedural PBR maps.
 *
 * The site ships zero downloaded assets, so the roughness and normal maps that
 * stop every surface reading as flat plastic are generated here instead of
 * fetched. They use the same value noise as the terrain, but on a *wrapping*
 * lattice — `lib/noise` is open-ended, and tiling an open-ended noise puts a
 * visible seam down every wall.
 *
 * One 256² pair is shared by the whole site; individual surfaces vary the tile
 * density with `tiled()` rather than baking a texture each.
 */

const SIZE = 256
/** Lattice cells across the texture. Higher = finer grain. */
const PERIOD = 8

const hash = (x: number, y: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123
  return s - Math.floor(s)
}
const smooth = (t: number) => t * t * (3 - 2 * t)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const mod = (v: number, p: number) => ((v % p) + p) % p

/** Value noise in [0, 1] whose lattice wraps at `period`, so the result tiles. */
function wrapNoise(x: number, y: number, period: number): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = smooth(x - xi)
  const v = smooth(y - yi)
  const x0 = mod(xi, period)
  const x1 = mod(xi + 1, period)
  const y0 = mod(yi, period)
  const y1 = mod(yi + 1, period)
  return lerp(
    lerp(hash(x0, y0), hash(x1, y0), u),
    lerp(hash(x0, y1), hash(x1, y1), u),
    v
  )
}

/** Layered `wrapNoise` over UV in [0, 1). Tiles at every octave. */
function fbmWrapped(u: number, v: number, octaves = 4): number {
  let value = 0
  let amp = 0.5
  let freq = 1
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    value += wrapNoise(u * PERIOD * freq, v * PERIOD * freq, PERIOD * freq) * amp
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return value / norm
}

function finish(tex: DataTexture) {
  tex.wrapS = tex.wrapT = RepeatWrapping
  tex.minFilter = LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

/**
 * Height field both maps are derived from, so the bumps and the rough patches
 * line up instead of fighting each other.
 */
function heightField(): Float32Array {
  const h = new Float32Array(SIZE * SIZE)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) h[y * SIZE + x] = fbmWrapped(x / SIZE, y / SIZE)
  }
  return h
}

let cache: { normal: DataTexture; roughness: DataTexture } | null = null

function build() {
  const h = heightField()
  const at = (x: number, y: number) => h[mod(y, SIZE) * SIZE + mod(x, SIZE)]

  const n = new Uint8Array(SIZE * SIZE * 4)
  const r = new Uint8Array(SIZE * SIZE * 4)
  // Bump strength. High enough to catch the low sun, low enough that the
  // low-poly silhouette still reads as the point of the art direction.
  const STRENGTH = 2.6

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4

      // Central differences on the wrapped height field, then normalise.
      const dx = (at(x + 1, y) - at(x - 1, y)) * STRENGTH
      const dy = (at(x, y + 1) - at(x, y - 1)) * STRENGTH
      const len = Math.hypot(dx, dy, 1)
      n[i] = ((-dx / len) * 0.5 + 0.5) * 255
      n[i + 1] = ((-dy / len) * 0.5 + 0.5) * 255
      n[i + 2] = (1 / len) * 0.5 * 255 + 127.5
      n[i + 3] = 255

      // Roughness reads from the green channel; keep all three equal so the
      // same texture works as a metalness or AO map if that's ever wanted.
      const v = (0.62 + h[y * SIZE + x] * 0.38) * 255
      r[i] = r[i + 1] = r[i + 2] = v
      r[i + 3] = 255
    }
  }

  return {
    normal: finish(new DataTexture(n, SIZE, SIZE, RGBAFormat)),
    roughness: finish(new DataTexture(r, SIZE, SIZE, RGBAFormat)),
  }
}

/** Shared surface-detail maps, generated once on first use. */
export function surfaceMaps() {
  if (!cache) cache = build()
  return cache
}

/**
 * A view of one of the shared maps at a given tile density. Clones share the
 * underlying image, so this costs a sampler, not another 256 KB — repeat and
 * offset are per-material uniforms in three, the pixels are not.
 */
export function tiled(which: 'normal' | 'roughness', repeat: number) {
  const t = surfaceMaps()[which].clone()
  t.repeat.set(repeat, repeat)
  t.needsUpdate = true
  return t
}
