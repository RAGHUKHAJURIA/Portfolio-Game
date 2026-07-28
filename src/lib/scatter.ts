import { ISLAND, houses } from '../data/portfolioData'
import { pathStrength, terrainHeight } from './terrain'
import { rand } from './noise'

/**
 * Deterministic prop placement for the whole island.
 *
 * This lives outside the components because more than one system needs the
 * same answer: Props renders it, and CameraRig tests the camera boom against
 * the tree canopies (which have no physics colliders, so the boom's ray cast
 * would otherwise sail straight through them and park the camera inside a
 * ball of leaves).
 *
 * Same seed → same island on every load, which is also what lets the minimap,
 * the dirt trails and the scatter all agree with each other.
 */

export type Placed = {
  x: number
  y: number
  z: number
  rot: number
  scale: number
  variant: number
}

const MIN_R = 7
const MAX_R = 40.5
/** Keep clearings around each building. */
const HOUSE_CLEARANCE = 13

function clearOfHouses(x: number, z: number, pad = HOUSE_CLEARANCE) {
  for (const h of houses) {
    if (Math.hypot(x - h.position[0], z - h.position[1]) < pad) return false
    const mx = h.position[0] + h.markerOffset[0]
    const mz = h.position[1] + h.markerOffset[1]
    if (Math.hypot(x - mx, z - mz) < h.radius + 2.5) return false
  }
  return true
}

export function scatter(opts: {
  count: number
  seed: number
  minR?: number
  maxR?: number
  clearance?: number
  maxPath?: number
  minHeight?: number
  variants?: number
  spacing?: number
  scaleRange?: [number, number]
}): Placed[] {
  const {
    count,
    seed,
    minR = MIN_R,
    maxR = MAX_R,
    clearance = HOUSE_CLEARANCE,
    maxPath = 0.25,
    minHeight = -0.4,
    variants = 1,
    spacing = 0,
    scaleRange = [0.8, 1.3],
  } = opts

  const out: Placed[] = []
  const attempts = count * 14

  for (let i = 0; i < attempts && out.length < count; i++) {
    // Golden-angle spiral jittered by hash — even coverage, cheaply.
    const a = i * 2.39996 + seed
    const rr = Math.sqrt(rand(i, seed)) * (maxR - minR) + minR
    const x = Math.cos(a) * rr + (rand(i, seed + 11) - 0.5) * 6
    const z = Math.sin(a) * rr + (rand(i, seed + 23) - 0.5) * 6

    const d = Math.hypot(x, z)
    if (d < minR || d > maxR) continue
    if (!clearOfHouses(x, z, clearance)) continue
    if (pathStrength(x, z) > maxPath) continue

    const y = terrainHeight(x, z)
    if (y < minHeight) continue

    if (spacing > 0) {
      let tooClose = false
      for (const p of out) {
        if (Math.hypot(p.x - x, p.z - z) < spacing) {
          tooClose = true
          break
        }
      }
      if (tooClose) continue
    }

    out.push({
      x,
      y,
      z,
      rot: rand(i, seed + 37) * Math.PI * 2,
      scale: scaleRange[0] + rand(i, seed + 53) * (scaleRange[1] - scaleRange[0]),
      variant: Math.floor(rand(i, seed + 71) * variants),
    })
  }
  return out
}

/* ── The island's actual contents ───────────────────────── */

/** `maxPath: 0.06` keeps trunks well clear of the trails you walk down. */
export const TREES = scatter({
  count: 92,
  seed: 3,
  spacing: 3.6,
  variants: 2,
  scaleRange: [0.85, 1.5],
  minHeight: -0.2,
  maxPath: 0.06,
})

export const PINES = TREES.filter((t) => t.variant === 0)
export const BROADLEAF = TREES.filter((t) => t.variant === 1)

export const BUSHES = scatter({
  count: 110,
  seed: 17,
  spacing: 2.0,
  clearance: 10,
  scaleRange: [0.5, 1.1],
  maxPath: 0.4,
})

export const ROCKS = scatter({
  count: 70,
  seed: 41,
  spacing: 2.6,
  clearance: 11,
  variants: 2,
  scaleRange: [0.5, 1.9],
})

export const TUFTS = scatter({
  count: 200,
  seed: 91,
  minR: 4,
  spacing: 1.1,
  clearance: 8,
  maxPath: 0.5,
  scaleRange: [0.6, 1.4],
})

export const DEBRIS = scatter({
  count: 9,
  seed: 61,
  minR: 12,
  maxR: 34,
  spacing: 9,
  clearance: 14,
  maxPath: 0.75,
  variants: 3,
})

export const SHORE_ROCKS: Placed[] = Array.from({ length: 54 }, (_, i) => {
  const a = (i / 54) * Math.PI * 2 + rand(i, 7) * 0.08
  const rr = ISLAND.boundary + 1.6 + rand(i, 13) * 3.4
  const x = Math.cos(a) * rr
  const z = Math.sin(a) * rr
  return {
    x,
    y: terrainHeight(x, z),
    z,
    rot: rand(i, 29) * Math.PI * 2,
    scale: 1.1 + rand(i, 31) * 1.8,
    variant: 0,
  }
})

export const BOUNDARY_POSTS = Array.from({ length: 68 }, (_, i) => {
  const a = (i / 68) * Math.PI * 2
  const x = Math.cos(a) * ISLAND.boundary
  const z = Math.sin(a) * ISLAND.boundary
  return { x, y: terrainHeight(x, z), z }
})

/**
 * Bounding spheres for the tree canopies, in world space. Only the camera
 * uses these — they are not physics colliders, because the player should be
 * able to walk through foliage while the camera should not sit inside it.
 */
export type Canopy = { x: number; y: number; z: number; r: number }

export const CANOPIES: Canopy[] = [
  ...PINES.map((t) => ({
    x: t.x,
    // Centre of the stacked cones.
    y: t.y + 3.4 * t.scale,
    z: t.z,
    r: 1.5 * t.scale,
  })),
  ...BROADLEAF.map((t) => ({
    x: t.x,
    y: t.y + 3.4 * t.scale,
    z: t.z,
    r: 1.75 * t.scale,
  })),
]
