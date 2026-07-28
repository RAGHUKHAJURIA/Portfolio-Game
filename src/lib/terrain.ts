import { Color } from 'three'
import { fbm } from './noise'
import { ISLAND, houses } from '../data/portfolioData'

/**
 * The island's height field. This is the single source of truth for ground
 * height — the terrain mesh, the prop scatter, and the house placement all
 * call the same function, so nothing ever floats or sinks.
 */

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const smoothstep = (t: number) => t * t * (3 - 2 * t)

/**
 * Base elevation of the plateau above y=0. The noise below swings roughly
 * ±1.7, so this has to clear `ISLAND.seaLevel` by more than that or the low
 * spots of the island end up underwater.
 */
const LAND_BASE = 3.2
/** Where the plateau ends and the beach starts sloping. */
const SHORE_START = 40
/** Where the terrain is fully underwater. */
const SHORE_END = 58
/** How far below zero the sea floor drops past the shore. */
const SHORE_DEPTH = 7

type Hill = { x: number; z: number; r: number; h: number }

const HILLS: Hill[] = [
  { x: -30, z: -18, r: 15, h: 4.2 },
  { x: 28, z: 26, r: 17, h: 3.2 },
  { x: 6, z: 34, r: 11, h: 2.0 },
  { x: -34, z: 20, r: 10, h: 1.6 },
]

function hillAt(x: number, z: number): number {
  let sum = 0
  for (const h of HILLS) {
    const d = Math.hypot(x - h.x, z - h.z)
    if (d < h.r) {
      const t = 1 - d / h.r
      sum += h.h * smoothstep(t)
    }
  }
  return sum
}

/** Terrain before building pads are flattened into it. */
function baseHeight(x: number, z: number): number {
  let h = LAND_BASE
  h += fbm(x * 0.028, z * 0.028, 4) * 1.35
  h += fbm(x * 0.11 + 40, z * 0.11 - 17, 2) * 0.35
  h += hillAt(x, z)

  const d = Math.hypot(x, z)
  const shore = smoothstep(clamp01((d - SHORE_START) / (SHORE_END - SHORE_START)))
  // Blend the land down into a beach, then keep going under the waterline.
  return h * (1 - shore) - shore * SHORE_DEPTH
}

/** Flat pad radius around each building. */
const PAD_INNER = 7.5
const PAD_OUTER = 13

const PADS = houses.map((h) => ({
  x: h.position[0],
  z: h.position[1],
  y: baseHeight(h.position[0], h.position[1]),
}))

/** Final ground height at a world XZ. */
export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z)
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < PAD_OUTER) {
      const t = 1 - smoothstep(clamp01((d - PAD_INNER) / (PAD_OUTER - PAD_INNER)))
      h = h + (p.y - h) * t
    }
  }
  return h
}

/** Ground height at each house centre — where the building sits. */
export const houseGroundY: Record<string, number> = Object.fromEntries(
  houses.map((h) => [h.id, terrainHeight(h.position[0], h.position[1])])
)

/* ── Dirt paths ─────────────────────────────────────────────
   A trail runs from the island's centre plaza out to each building, so a
   player who has no idea where to go can just follow a path.            */

const PATH_HUB: [number, number] = [0, 2]
/** Each trail runs the whole way to the door marker, not just near it. */
const PATH_SEGMENTS: [number, number, number, number][] = houses.map((h) => [
  PATH_HUB[0],
  PATH_HUB[1],
  h.position[0] + h.markerOffset[0],
  h.position[1] + h.markerOffset[1],
])

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2
  t = clamp01(t)
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

/** 0 = no path, 1 = centre of a worn dirt trail. */
export function pathStrength(x: number, z: number): number {
  let best = Infinity
  for (const s of PATH_SEGMENTS) {
    const d = distToSegment(x, z, s[0], s[1], s[2], s[3])
    if (d < best) best = d
  }
  // Plaza at the drop point.
  const hub = Math.hypot(x - PATH_HUB[0], z - PATH_HUB[1]) - 3.5
  if (hub < best) best = Math.max(hub, 0)
  return 1 - smoothstep(clamp01((best - 1.2) / 1.9))
}

/* ── Vertex colouring ───────────────────────────────────── */

const C_GRASS_DARK = new Color('#48562f')
const C_GRASS = new Color('#5f6f3e')
const C_GRASS_LIGHT = new Color('#79894f')
const C_ROCK = new Color('#6b6b60')
const C_SAND = new Color('#c9b98a')
const C_WET_SAND = new Color('#9d8e64')
const C_DIRT = new Color('#6d5a3c')

const _c = new Color()

/** Terrain vertex colour at a point, given its height and slope. */
export function groundColor(x: number, z: number, y: number, slope: number, out = _c): Color {
  const d = Math.hypot(x, z)

  // Grass, tinted by elevation.
  const el = clamp01((y + 1) / 5)
  out.copy(C_GRASS_DARK).lerp(C_GRASS, clamp01(el * 2.2))
  if (el > 0.45) out.lerp(C_GRASS_LIGHT, clamp01((el - 0.45) * 1.8))

  // Rock on steep faces.
  const rock = clamp01((slope - 0.42) / 0.3)
  if (rock > 0) out.lerp(C_ROCK, rock * 0.85)

  // Dirt trails.
  const path = pathStrength(x, z)
  if (path > 0) out.lerp(C_DIRT, path * 0.9)

  // Beach ring, then wet sand as it goes under.
  const beach = smoothstep(clamp01((d - (SHORE_START - 3)) / 7))
  if (beach > 0) out.lerp(C_SAND, beach)
  if (y < ISLAND.seaLevel + 0.6) {
    out.lerp(C_WET_SAND, clamp01((ISLAND.seaLevel + 0.6 - y) / 1.6))
  }

  return out
}
