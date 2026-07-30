import type { ReactNode } from 'react'
import { CuboidCollider } from '@react-three/rapier'
import { houses } from '../../../data/portfolioData'
import { houseGroundY } from '../../../lib/terrain'
import type { BuildMats } from './materials'

/**
 * Shared walkable interior: a hollow two-storey shell with a doorway, real
 * stairs, an upper floor with a stairwell cut into it, and its own lighting.
 *
 * Approach (a) from the brief — interior geometry attached to the exterior, in
 * island coordinates — not (b) teleport-to-a-separate-scene. Teleporting would
 * fight three things Character does unconditionally: the hard clamp to
 * `ISLAND.boundary`, the `terrainHeight` safety floor, and the position it
 * publishes to the minimap and proximity system. All three assume the player is
 * on the island, and an interior 5000 units away would be yanked back, shoved
 * to island ground height, and drawn off the edge of the map. Staying in world
 * space costs one thing — the interiors are lit by their own lights under a
 * roof the sun can't get through, which is what we wanted anyway.
 *
 * Everything is authored in local space with y = 0 at the building's pad.
 */

/** Inner half-extents of the shell. */
export const IN_X = 4.7
export const IN_Z = 4.2
/** Wall thickness, ground-floor ceiling height, upper-floor slab thickness. */
const WALL = 0.3
export const FLOOR_H = 3.0
const SLAB = 0.25
/** Top surface of the upper floor — where the stairs have to arrive. */
export const UPPER_Y = FLOOR_H + SLAB
export const UPPER_H = 2.8

/** Doorway, centred on the +Z wall. */
const DOOR_W = 1.8
const DOOR_H = 2.3

/* Stairs run up the −X side toward +Z. Rise stays well under the character
   controller's 0.6 autostep ceiling and the run over its 0.3 minimum, so the
   threshold and any single step elsewhere still behave. */
const STEPS = 12
const RISE = UPPER_Y / STEPS
const RUN = 0.34
const STAIR_W = 1.5
const STAIR_Z0 = -3.6
const STAIR_X = -IN_X + STAIR_W / 2

/** Stairwell opening in the upper slab. */
const HOLE_X = -IN_X + STAIR_W + 0.4
const HOLE_Z = STAIR_Z0 + STEPS * RUN + 0.5

/**
 * Is a world point inside any building's shell?
 *
 * The camera needs this: its boom bottoms out at MIN_BOOM so it can't collapse
 * onto the character's backpack in trees, but MIN_BOOM is longer than a
 * 3-metre room is wide, so indoors that same floor pushes the camera straight
 * through a wall. Rather than shorten the boom everywhere and regress the
 * foliage case, it shortens only in here.
 *
 * A box test against five buildings, not a raycast — it runs every frame.
 */
const SHELLS = houses.map((h) => ({
  x: h.position[0],
  z: h.position[1],
  cos: Math.cos(h.rotation),
  sin: Math.sin(h.rotation),
  base: houseGroundY[h.id],
}))

export function insideHouse(x: number, y: number, z: number): boolean {
  for (const s of SHELLS) {
    if (y < s.base - 0.6 || y > s.base + UPPER_Y + UPPER_H) continue
    const dx = x - s.x
    const dz = z - s.z
    // Inverse of the local→world rotation used for the marker offsets.
    const lx = dx * s.cos - dz * s.sin
    const lz = dx * s.sin + dz * s.cos
    if (Math.abs(lx) < IN_X + 0.4 && Math.abs(lz) < IN_Z + 0.4) return true
  }
  return false
}

function Stairs({ mats }: { mats: BuildMats }) {
  return (
    <>
      {Array.from({ length: STEPS }, (_, i) => {
        const top = (i + 1) * RISE
        return (
          <mesh
            key={i}
            castShadow
            receiveShadow
            position={[STAIR_X, top / 2, STAIR_Z0 + i * RUN + RUN / 2]}
            material={mats.concrete}
          >
            <boxGeometry args={[STAIR_W, top, RUN]} />
          </mesh>
        )
      })}

      {/* Handrail, so the stairwell edge reads before you walk off it. */}
      <mesh
        castShadow
        position={[STAIR_X + STAIR_W / 2 - 0.06, UPPER_Y / 2 + 0.95, STAIR_Z0 + (STEPS * RUN) / 2]}
        rotation={[-Math.atan2(UPPER_Y, STEPS * RUN), 0, 0]}
        material={mats.metalDark}
      >
        <boxGeometry args={[0.07, 0.07, Math.hypot(STEPS * RUN, UPPER_Y)]} />
      </mesh>

      {/*
        One ramp collider under the stepped visuals rather than twelve step
        colliders. The controller's autostep can climb the boxes, but it
        re-solves at every edge and the camera judders the whole way up; a
        38° ramp is under the 58° slope limit and walks perfectly smoothly.
        The visual/physical gap is at most one riser and invisible from a
        third-person camera.
      */}
      <CuboidCollider
        args={[STAIR_W / 2, 0.12, Math.hypot(STEPS * RUN, UPPER_Y) / 2]}
        position={[
          STAIR_X,
          UPPER_Y / 2 - 0.094,
          STAIR_Z0 + (STEPS * RUN) / 2 - 0.075,
        ]}
        rotation={[-Math.atan2(UPPER_Y, STEPS * RUN), 0, 0]}
      />
    </>
  )
}

export function HouseInterior({
  mats,
  /** Warm interior key light colour. */
  lampColor = '#ffcf9a',
  /** Rendered on the upper floor — the content object plus any dressing. */
  children,
}: {
  mats: BuildMats
  lampColor?: string
  children?: ReactNode
}) {
  const wallY = FLOOR_H / 2
  const upperWallY = UPPER_Y + UPPER_H / 2
  const sideW = (IN_X * 2 + WALL * 2) / 2

  /** One wall pair per storey; +Z gets a doorway on the ground floor only. */
  const wall = (
    args: [number, number, number],
    position: [number, number, number],
    material = mats.plaster
  ) => (
    <>
      <mesh castShadow receiveShadow position={position} material={material}>
        <boxGeometry args={args} />
      </mesh>
      <CuboidCollider args={[args[0] / 2, args[1] / 2, args[2] / 2]} position={position} />
    </>
  )

  return (
    <group>
      {/* ── Ground floor slab ── */}
      <mesh receiveShadow position={[0, -0.06, 0]} material={mats.concreteDark}>
        <boxGeometry args={[IN_X * 2, 0.12, IN_Z * 2]} />
      </mesh>

      {/* ── Ground-floor walls ── */}
      {wall([WALL, FLOOR_H, IN_Z * 2 + WALL * 2], [-IN_X - WALL / 2, wallY, 0])}
      {wall([WALL, FLOOR_H, IN_Z * 2 + WALL * 2], [IN_X + WALL / 2, wallY, 0])}
      {wall([IN_X * 2 + WALL * 2, FLOOR_H, WALL], [0, wallY, -IN_Z - WALL / 2])}

      {/* +Z wall, split around the doorway: two jambs and a lintel. */}
      {wall(
        [(IN_X * 2 + WALL * 2 - DOOR_W) / 2, FLOOR_H, WALL],
        [-(DOOR_W + (IN_X * 2 + WALL * 2 - DOOR_W) / 2) / 2, wallY, IN_Z + WALL / 2]
      )}
      {wall(
        [(IN_X * 2 + WALL * 2 - DOOR_W) / 2, FLOOR_H, WALL],
        [(DOOR_W + (IN_X * 2 + WALL * 2 - DOOR_W) / 2) / 2, wallY, IN_Z + WALL / 2]
      )}
      {wall(
        [DOOR_W, FLOOR_H - DOOR_H, WALL],
        [0, DOOR_H + (FLOOR_H - DOOR_H) / 2, IN_Z + WALL / 2]
      )}

      {/* ── Upper floor, built as three slabs so the stairwell is a real hole.
             A single slab with a collider would seal the stairs off. ── */}
      <mesh receiveShadow castShadow position={[(HOLE_X + IN_X) / 2, FLOOR_H + SLAB / 2, 0]} material={mats.concrete}>
        <boxGeometry args={[IN_X - HOLE_X, SLAB, IN_Z * 2]} />
      </mesh>
      <CuboidCollider
        args={[(IN_X - HOLE_X) / 2, SLAB / 2, IN_Z]}
        position={[(HOLE_X + IN_X) / 2, FLOOR_H + SLAB / 2, 0]}
      />

      <mesh
        receiveShadow
        castShadow
        position={[(-IN_X + HOLE_X) / 2, FLOOR_H + SLAB / 2, (HOLE_Z + IN_Z) / 2]}
        material={mats.concrete}
      >
        <boxGeometry args={[HOLE_X + IN_X, SLAB, IN_Z - HOLE_Z]} />
      </mesh>
      <CuboidCollider
        args={[(HOLE_X + IN_X) / 2, SLAB / 2, (IN_Z - HOLE_Z) / 2]}
        position={[(-IN_X + HOLE_X) / 2, FLOOR_H + SLAB / 2, (HOLE_Z + IN_Z) / 2]}
      />

      <mesh
        receiveShadow
        castShadow
        position={[(-IN_X + HOLE_X) / 2, FLOOR_H + SLAB / 2, (-IN_Z + STAIR_Z0 - 0.4) / 2]}
        material={mats.concrete}
      >
        <boxGeometry args={[HOLE_X + IN_X, SLAB, IN_Z + STAIR_Z0 - 0.4]} />
      </mesh>
      <CuboidCollider
        args={[(HOLE_X + IN_X) / 2, SLAB / 2, (IN_Z + STAIR_Z0 - 0.4) / 2]}
        position={[(-IN_X + HOLE_X) / 2, FLOOR_H + SLAB / 2, (-IN_Z + STAIR_Z0 - 0.4) / 2]}
      />

      {/* Guard rail around the open side of the stairwell. */}
      <mesh castShadow position={[HOLE_X, UPPER_Y + 0.5, (STAIR_Z0 - 0.4 + HOLE_Z) / 2]} material={mats.metalDark}>
        <boxGeometry args={[0.08, 1, HOLE_Z - STAIR_Z0 + 0.4]} />
      </mesh>

      <Stairs mats={mats} />

      {/* ── Upper-floor walls ── */}
      {wall([WALL, UPPER_H, IN_Z * 2 + WALL * 2], [-IN_X - WALL / 2, upperWallY, 0])}
      {wall([WALL, UPPER_H, IN_Z * 2 + WALL * 2], [IN_X + WALL / 2, upperWallY, 0])}
      {wall([sideW * 2, UPPER_H, WALL], [0, upperWallY, -IN_Z - WALL / 2])}
      {wall([sideW * 2, UPPER_H, WALL], [0, upperWallY, IN_Z + WALL / 2])}

      {/* Ceiling — keeps the sun out so the interior lights actually read. */}
      <mesh receiveShadow position={[0, UPPER_Y + UPPER_H + SLAB / 2, 0]} material={mats.concreteDark}>
        <boxGeometry args={[IN_X * 2 + WALL * 2, SLAB, IN_Z * 2 + WALL * 2]} />
      </mesh>
      <CuboidCollider
        args={[IN_X + WALL, SLAB / 2, IN_Z + WALL]}
        position={[0, UPPER_Y + UPPER_H + SLAB / 2, 0]}
      />

      {/* Upper-floor windows, so it isn't a sealed box from outside either. */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (IN_X + WALL / 2), UPPER_Y + 1.4, 1.4]} material={mats.glass}>
          <boxGeometry args={[WALL + 0.04, 1.1, 1.5]} />
        </mesh>
      ))}

      {/* ── Lighting. One lamp per storey plus a low fill, all short-range so
             they never leak out of the doorway onto the terrain. ── */}
      <pointLight position={[0, FLOOR_H - 0.45, -0.6]} intensity={9} distance={11} decay={1.7} color={lampColor} />
      <pointLight position={[1.2, UPPER_Y + UPPER_H - 0.5, -0.4]} intensity={8} distance={10} decay={1.7} color={lampColor} />
      {/* Cool bounce from the doorway, so the entrance reads from inside. */}
      <pointLight position={[0, 1.6, IN_Z - 0.6]} intensity={3.5} distance={7} decay={1.8} color="#bcd3e2" />

      {/* Lamp housings */}
      {[
        [0, FLOOR_H - 0.22, -0.6],
        [1.2, UPPER_Y + UPPER_H - 0.26, -0.4],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} material={mats.metalDark}>
          <boxGeometry args={[0.34, 0.1, 0.34]} />
        </mesh>
      ))}

      {children}
    </group>
  )
}
