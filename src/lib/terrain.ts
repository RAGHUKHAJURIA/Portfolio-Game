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
 * ±4.3, so this has to clear `ISLAND.seaLevel` by more than that or the low
 * spots of the island end up underwater. `scripts/smoke.ts` asserts it.
 */
const LAND_BASE = 5.0
/** Where the plateau ends and the beach starts sloping. */
const SHORE_START = 122
/** Where the terrain is fully underwater. */
const SHORE_END = 172
/** How far below zero the sea floor drops past the shore. */
const SHORE_DEPTH = 9

type Mound = { x: number; z: number; r: number; h: number }

/**
 * Hills, as additive smooth mounds. Slopes are kept near h/r ≈ 0.25 (about
 * 15°) — the character controller tops out at 58°, but anything much steeper
 * than this turns walking across the island into a chore.
 */
const HILLS: Mound[] = [
  { x: -81, z: -49, r: 40, h: 11 },
  { x: 76, z: 70, r: 46, h: 9 },
  { x: 16, z: 92, r: 30, h: 6 },
  { x: -92, z: 54, r: 27, h: 5 },
  { x: 104, z: -62, r: 34, h: 8 },
  { x: -34, z: -104, r: 32, h: 6.5 },
  { x: 6, z: 24, r: 22, h: 3 },
  { x: -108, z: -8, r: 26, h: 5.5 },
]

/**
 * Water inlets — the same shape as a hill, subtracted instead of added, deep
 * enough to break the waterline. Placed to bite into the shore rather than sit
 * inland, so they read as bays rather than ponds.
 *
 * These are the only places the island is deliberately below sea level, so the
 * "no walkable land underwater" invariant in smoke.ts checks against this list,
 * and Character keeps the player from wading in.
 */
export const INLETS: Mound[] = [{ x: 0, z: 118, r: 34, h: 9 }]

function moundAt(list: Mound[], x: number, z: number): number {
  let sum = 0
  for (const m of list) {
    const d = Math.hypot(x - m.x, z - m.z)
    if (d < m.r) sum += m.h * smoothstep(1 - d / m.r)
  }
  return sum
}

/** Terrain before building pads are flattened into it. */
function baseHeight(x: number, z: number): number {
  let h = LAND_BASE
  // Broad rolling form first — on an island this size the old two octaves
  // alone read as one flat green table with bumps on it.
  h += fbm(x * 0.008 - 60, z * 0.008 + 25, 3) * 2.6
  h += fbm(x * 0.028, z * 0.028, 4) * 1.35
  h += fbm(x * 0.11 + 40, z * 0.11 - 17, 2) * 0.35
  h += moundAt(HILLS, x, z)
  h -= moundAt(INLETS, x, z)

  const d = Math.hypot(x, z)
  const shore = smoothstep(clamp01((d - SHORE_START) / (SHORE_END - SHORE_START)))
  // Blend the land down into a beach, then keep going under the waterline.
  return h * (1 - shore) - shore * SHORE_DEPTH
}

/** True where the ground is at or under water — inlets, and past the beach. */
export function isSubmerged(x: number, z: number): boolean {
  return terrainHeight(x, z) < ISLAND.seaLevel + 0.35
}

/**
 * Flat pad around each building. `PAD_INNER` has to comfortably exceed the
 * radius each house scatters its aprons and props over — everything inside a
 * house component is authored at local y = 0, so any prop sitting outside the
 * flattened zone floats or sinks. `scripts/smoke.ts` asserts this.
 */
const PAD_INNER = 10.5
const PAD_OUTER = 16.5

/**
 * Flat ground that isn't a house compound. The shooting range needs the same
 * treatment — its firing line, lanes and target stands are all authored at a
 * single local y, so it has to stand on level ground exactly like a building
 * does. Sitting it on a thick slab instead would leave a step the player has
 * to jump onto from every direction.
 */
export const RANGE_ORIGIN: [number, number] = [92, 18]
/** Wider than a house pad: the range is long rather than square. */
const RANGE_PAD_INNER = 26
const RANGE_PAD_OUTER = 36

const PADS = [
  ...houses.map((h) => ({
    x: h.position[0],
    z: h.position[1],
    y: baseHeight(h.position[0], h.position[1]),
    inner: PAD_INNER,
    outer: PAD_OUTER,
  })),
  {
    x: RANGE_ORIGIN[0],
    z: RANGE_ORIGIN[1],
    y: baseHeight(RANGE_ORIGIN[0], RANGE_ORIGIN[1]),
    inner: RANGE_PAD_INNER,
    outer: RANGE_PAD_OUTER,
  },
]

/** Final ground height at a world XZ. */
export function terrainHeight(x: number, z: number): number {
  let h = baseHeight(x, z)
  for (const p of PADS) {
    const d = Math.hypot(x - p.x, z - p.z)
    if (d < p.outer) {
      const t = 1 - smoothstep(clamp01((d - p.inner) / (p.outer - p.inner)))
      h = h + (p.y - h) * t
    }
  }
  return h
}

/** Ground height at each house centre — where the building sits. */
export const houseGroundY: Record<string, number> = Object.fromEntries(
  houses.map((h) => [h.id, terrainHeight(h.position[0], h.position[1])])
)

/* ── Dirt road network ──────────────────────────────────────
   Roads are terrain vertex colour, not geometry: `pathStrength` below is
   sampled by groundColor, so a road can never float above or sink into the
   ground the way a separate ribbon mesh would, and it costs no draw call.

   Two layers. Spokes run from the centre plaza to every door, so a player
   who has no idea where to go can just follow one. A ring road links
   neighbouring compounds in the order they sit around the island, so getting
   from Skills to Experience doesn't mean walking all the way back to the
   middle.                                                                */

const PATH_HUB: [number, number] = [0, 2]

/** Door marker in world space — where every road has to actually arrive. */
const doorOf = (h: (typeof houses)[number]): [number, number] => [
  h.position[0] + h.markerOffset[0],
  h.position[1] + h.markerOffset[1],
]

/** Houses ordered by their bearing from the island centre, so the ring joins
 *  actual neighbours instead of criss-crossing the middle. */
const RING = [...houses].sort(
  (a, b) => Math.atan2(a.position[1], a.position[0]) - Math.atan2(b.position[1], b.position[0])
)

/**
 * Exported so the minimap and full map can draw the same network the terrain
 * paints. Two copies of this list would drift the moment a house moves.
 */
export const PATH_SEGMENTS: [number, number, number, number][] = [
  // Spokes: plaza → each door.
  ...houses.map((h): [number, number, number, number] => {
    const [dx, dz] = doorOf(h)
    return [PATH_HUB[0], PATH_HUB[1], dx, dz]
  }),
  // Ring: door → next door around the island, closing the loop.
  ...RING.map((h, i): [number, number, number, number] => {
    const [ax, az] = doorOf(h)
    const [bx, bz] = doorOf(RING[(i + 1) % RING.length])
    return [ax, az, bx, bz]
  }),
]

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const dx = bx - ax
  const dz = bz - az
  const len2 = dx * dx + dz * dz
  let t = len2 === 0 ? 0 : ((px - ax) * dx + (pz - az) * dz) / len2
  t = clamp01(t)
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t))
}

/** Half-width of the packed centre of a road, then how far it feathers out. */
const ROAD_CORE = 2.4
const ROAD_EDGE = 3.6
/** Matches the plaza disc drawn in Props, so the paint lines up with the mesh. */
const PLAZA_R = 6.2

/** 0 = no road, 1 = centre of a worn dirt road. */
export function pathStrength(x: number, z: number): number {
  let best = Infinity
  for (const s of PATH_SEGMENTS) {
    const d = distToSegment(x, z, s[0], s[1], s[2], s[3])
    if (d < best) best = d
  }
  // Plaza at the drop point.
  const hub = Math.hypot(x - PATH_HUB[0], z - PATH_HUB[1]) - PLAZA_R
  if (hub < best) best = Math.max(hub, 0)
  return 1 - smoothstep(clamp01((best - ROAD_CORE) / ROAD_EDGE))
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

  // Grass, tinted by elevation. Divisor tracks the island's height range —
  // hilltops now reach ~20, and on the old /5 scale everything above the
  // beach saturated to the same pale green.
  const el = clamp01((y + 1) / 19)
  out.copy(C_GRASS_DARK).lerp(C_GRASS, clamp01(el * 2.6))
  if (el > 0.4) out.lerp(C_GRASS_LIGHT, clamp01((el - 0.4) * 1.9))

  // Rock on steep faces.
  const rock = clamp01((slope - 0.42) / 0.3)
  if (rock > 0) out.lerp(C_ROCK, rock * 0.85)

  // Dirt trails.
  const path = pathStrength(x, z)
  if (path > 0) out.lerp(C_DIRT, path * 0.9)

  // Beach ring, then wet sand as it goes under. Scaled to the shore blend —
  // a 7-unit sand band on a 280-unit island reads as a pencil line.
  const beach = smoothstep(clamp01((d - (SHORE_START - 10)) / 24))
  if (beach > 0) out.lerp(C_SAND, beach)
  if (y < ISLAND.seaLevel + 0.6) {
    out.lerp(C_WET_SAND, clamp01((ISLAND.seaLevel + 0.6 - y) / 1.6))
  }

  return out
}
