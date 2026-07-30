import { Crate, HouseFrame, Sandbags, useBuildMats } from './parts'
import { HouseInterior, IN_X, IN_Z, UPPER_H, UPPER_Y } from './HouseInterior'

/** Outer half-extents, matching the interior shell plus its wall thickness. */
const OUT_X = IN_X + 0.3
const OUT_Z = IN_Z + 0.3
/** Top of the ceiling slab — where the roof sits. */
const EAVE = UPPER_Y + UPPER_H + 0.25

/**
 * House 1 — a two-storey weathered bungalow with a porch. Door faces +Z.
 *
 * The shell (walls, floors, stairs, lighting, colliders) comes from
 * HouseInterior; everything here is the exterior dressing that hangs off it.
 * There is no solid collider block any more — the building is hollow and
 * walk-in, so the walls themselves are the collision.
 */
export function AboutHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="about" labelHeight={9.4}>
      {/* Foundation, a touch proud of the walls so they don't meet the ground
          on a knife edge. */}
      <mesh receiveShadow position={[0, -0.16, 0.4]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 0.7, 0.4, OUT_Z * 2 + 0.9]} />
      </mesh>

      <HouseInterior mats={m}>
        {/* ── Content object: a corkboard and desk on the upper floor. The
               panel opens from here, so you have to climb to reach it. ── */}
        <group position={[2.2, UPPER_Y, -IN_Z + 0.35]}>
          <mesh castShadow receiveShadow position={[0, 1.55, 0.06]} material={m.woodDark}>
            <boxGeometry args={[2.5, 1.7, 0.1]} />
          </mesh>
          <mesh position={[0, 1.55, 0.12]} material={m.sandbag}>
            <boxGeometry args={[2.3, 1.5, 0.03]} />
          </mesh>
          {/* Pinned notes, at angles so it reads as a working board */}
          {[
            [-0.72, 1.95, 0.36],
            [0.1, 2.02, -0.2],
            [0.82, 1.88, 0.14],
            [-0.5, 1.24, -0.3],
            [0.55, 1.16, 0.24],
          ].map(([px, py, rot], i) => (
            <mesh key={i} position={[px, py, 0.15]} rotation={[0, 0, rot]} material={i % 2 ? m.plaster : m.accent}>
              <boxGeometry args={[0.46, 0.34, 0.01]} />
            </mesh>
          ))}
          {/* Desk below it */}
          <mesh castShadow receiveShadow position={[0, 0.72, 0.55]} material={m.wood}>
            <boxGeometry args={[2.1, 0.09, 0.85]} />
          </mesh>
          {[-0.9, 0.9].map((x) => (
            <mesh key={x} castShadow position={[x, 0.35, 0.55]} material={m.woodDark}>
              <boxGeometry args={[0.1, 0.7, 0.75]} />
            </mesh>
          ))}
          {/* Lamp on the desk, warm so the board is the brightest thing up here */}
          <mesh position={[-0.75, 0.92, 0.5]} material={m.metalDark}>
            <cylinderGeometry args={[0.05, 0.11, 0.32, 8]} />
          </mesh>
          <pointLight position={[-0.75, 1.15, 0.45]} intensity={3.2} distance={4.5} color="#ffd9a0" />
          <Crate size={0.6} position={[-1.6, 0, 0.9]} rotation={0.4} mats={m} />
        </group>

        {/* Ground-floor dressing, so the room you walk into isn't empty. */}
        <Crate size={0.85} position={[-3.4, 0, 2.6]} rotation={0.2} mats={m} />
        <Crate size={0.7} position={[-3.5, 0.85, 2.5]} rotation={-0.4} mats={m} />
        <mesh castShadow receiveShadow position={[3.4, 0.4, 2.2]} material={m.wood}>
          <boxGeometry args={[1.9, 0.8, 0.9]} />
        </mesh>
        <mesh castShadow position={[2.9, 0.95, 2.2]} material={m.metal}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
        </mesh>
      </HouseInterior>

      {/* Weathered lower band on the outside of the shell */}
      <mesh position={[0, 0.5, 0]} material={m.concrete}>
        <boxGeometry args={[OUT_X * 2 + 0.06, 1, OUT_Z * 2 + 0.06]} />
      </mesh>
      {/* Floor band marking the storey division from outside */}
      <mesh position={[0, UPPER_Y - 0.1, 0]} material={m.concrete}>
        <boxGeometry args={[OUT_X * 2 + 0.1, 0.34, OUT_Z * 2 + 0.1]} />
      </mesh>

      {/* Gable roof. Sign matters: rotation.x = +θ drops the panel's far
          edge, which is what makes a ridge. Negating it builds a butterfly
          roof that rises outward and leaves the ridge cap in mid-air. */}
      <group position={[0, EAVE, 0]}>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            castShadow
            receiveShadow
            position={[0, 0.66, s * 1.75]}
            rotation={[s * 0.6, 0, 0]}
            material={m.roofTile}
          >
            <boxGeometry args={[OUT_X * 2 + 1, 0.24, 4.5]} />
          </mesh>
        ))}
        <mesh position={[0, 1.9, 0]} material={m.roofMetal}>
          <boxGeometry args={[OUT_X * 2 + 1.1, 0.2, 0.44]} />
        </mesh>
        {/* Gable infill closing the triangle at each end */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (OUT_X - 0.02), 0.88, 0]} material={m.plaster}>
            <boxGeometry args={[0.14, 1.86, 3.4]} />
          </mesh>
        ))}
      </group>

      {/* Chimney */}
      <mesh castShadow position={[2.9, EAVE + 1.6, -1.6]} material={m.concreteDark}>
        <boxGeometry args={[0.75, 2.2, 0.75]} />
      </mesh>

      {/* Door surround + a leaf hinged open against the wall, so the opening
          reads as a doorway you can walk through rather than a hole. */}
      <mesh position={[0, 1.15, OUT_Z + 0.02]} material={m.woodDark}>
        <boxGeometry args={[2.2, 2.6, 0.12]} />
      </mesh>
      <mesh position={[0, 2.42, OUT_Z + 0.08]} material={m.wood}>
        <boxGeometry args={[2.3, 0.18, 0.24]} />
      </mesh>
      <mesh castShadow position={[1.32, 1.15, OUT_Z + 0.3]} rotation={[0, -1.15, 0]} material={m.wood}>
        <boxGeometry args={[1.7, 2.2, 0.09]} />
      </mesh>

      {/* Windows: ground floor either side of the door, upper floor above. */}
      {[
        [-3.1, 1.7, OUT_Z + 0.02, 0],
        [3.1, 1.7, OUT_Z + 0.02, 0],
        [-2.4, UPPER_Y + 1.5, OUT_Z + 0.02, 0],
        [2.4, UPPER_Y + 1.5, OUT_Z + 0.02, 0],
        [-OUT_X - 0.02, 1.7, -1.4, Math.PI / 2],
        [OUT_X + 0.02, 1.7, 1.4, Math.PI / 2],
      ].map(([px, py, pz, ry], i) => (
        <group key={i} position={[px, py, pz]} rotation={[0, ry, 0]}>
          <mesh material={m.woodDark}>
            <boxGeometry args={[1.34, 1.24, 0.12]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} material={m.glass}>
            <boxGeometry args={[1.16, 1.06, 0.06]} />
          </mesh>
          <mesh position={[0, 0, 0.09]} material={m.woodDark}>
            <boxGeometry args={[0.06, 1.06, 0.04]} />
          </mesh>
        </group>
      ))}

      {/* Porch */}
      <group position={[0, 0, OUT_Z + 1.4]}>
        <mesh receiveShadow position={[0, 0.16, 0]} material={m.wood}>
          <boxGeometry args={[5.6, 0.32, 2.6]} />
        </mesh>
        {[-2.4, 2.4].map((x) => (
          <mesh key={x} castShadow position={[x, 1.5, 0.9]} material={m.wood}>
            <boxGeometry args={[0.2, 2.7, 0.2]} />
          </mesh>
        ))}
        {/* Slopes down and away from the house, like a porch awning should. */}
        <mesh castShadow position={[0, 2.95, 0.25]} rotation={[0.17, 0, 0]} material={m.roofMetal}>
          <boxGeometry args={[6, 0.16, 3]} />
        </mesh>
        {/* Steps down to the ground */}
        {[0, 1].map((i) => (
          <mesh key={i} receiveShadow position={[0, 0.1 - i * 0.11, 1.5 + i * 0.36]} material={m.concrete}>
            <boxGeometry args={[2.6, 0.2, 0.38]} />
          </mesh>
        ))}
      </group>

      {/* Dressing outside */}
      <Crate size={0.9} position={[-4.2, 0, OUT_Z + 1.9]} rotation={0.3} mats={m} />
      <Crate size={0.7} position={[-4.4, 0.9, OUT_Z + 1.8]} rotation={-0.5} mats={m} />
      <Sandbags count={4} rows={2} position={[4.3, 0, OUT_Z + 1.6]} rotation={0.1} mats={m} />

      {/* Hanging lamp by the door */}
      <mesh position={[1.4, 2.65, OUT_Z + 0.1]} material={m.metalDark}>
        <boxGeometry args={[0.22, 0.26, 0.22]} />
      </mesh>
      <pointLight position={[1.4, 2.5, OUT_Z + 0.5]} intensity={5} distance={8} color="#ffca7a" />
    </HouseFrame>
  )
}
