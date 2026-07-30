import type { ComponentProps } from 'react'
import { Instance, Instances } from '@react-three/drei'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import {
  BOUNDARY_POSTS,
  BROADLEAF,
  BUSHES,
  DEBRIS,
  PINES,
  ROCKS,
  SHORE_ROCKS,
  TREES,
  TUFTS,
} from '../../lib/scatter'
import { terrainHeight } from '../../lib/terrain'

/**
 * `<Instances limit>` allocates its buffer up front and silently drops
 * anything past it, and scatter counts vary with rejection sampling, so every
 * limit is derived from the array it actually has to hold.
 */
const cap = (n: number) => Math.max(1, n)

/**
 * Every prop batch goes through here, because bare `<Instances>` disappears.
 *
 * drei's `<Instances>` still has `count = 0` on the first frame — its children
 * subscribe from a layout effect, so the parent's `instances` state is empty
 * until the following render. three.js computes an InstancedMesh's bounding
 * sphere once, lazily, from whatever `count` is at that moment, and `count = 0`
 * yields an *empty* sphere (centre = origin, radius = −1) which is then cached
 * forever. `Frustum.intersectsSphere` on a −1 radius passes only when the world
 * origin is at least a unit inside every frustum plane, so the whole batch pops
 * out of existence the moment you look away from (0, 0, 0).
 *
 * Batch-level culling never fires for a batch that spans the whole island
 * anyway, so switching it off costs nothing. `scripts/smoke.ts` pins the
 * three.js behaviour this works around.
 *
 * `frames={2}` is the other half of the wrapper's job. By default `<Instances>`
 * recomposes every child's matrix and re-uploads the whole instanceMatrix
 * buffer every single frame. Across the ~6000 props on the enlarged island
 * that is megabytes of pointless upload per frame for scenery that never
 * moves. Two frames is enough: the children subscribe from a layout effect, so
 * the first frame can still see an empty list, and the re-render that follows
 * resets the counter and catches the full set.
 */
function Batch(props: ComponentProps<typeof Instances>) {
  return <Instances frustumCulled={false} frames={2} {...props} />
}

/* ── Vegetation ─────────────────────────────────────────── */

function Trees() {
  return (
    <>
      {/* Trunks (shared across both tree types) */}
      <Batch limit={cap(TREES.length)} range={TREES.length} castShadow receiveShadow>
        <cylinderGeometry args={[0.13, 0.22, 2.6, 6]} />
        <meshStandardMaterial color="#4a3a28" roughness={1} flatShading />
        {TREES.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, t.y + 1.3 * t.scale, t.z]}
            rotation={[0, t.rot, 0]}
            scale={[t.scale, t.scale, t.scale]}
          />
        ))}
      </Batch>

      {/* Conifer canopies — stacked cones */}
      {[0, 1, 2].map((tier) => (
        <Batch key={tier} limit={cap(PINES.length)} range={PINES.length} castShadow receiveShadow>
          <coneGeometry args={[1.5 - tier * 0.38, 1.9 - tier * 0.25, 7]} />
          <meshStandardMaterial
            color={tier === 0 ? '#354a2b' : tier === 1 ? '#3e5531' : '#4a613a'}
            roughness={1}
            flatShading
          />
          {PINES.map((t, i) => (
            <Instance
              key={i}
              position={[t.x, t.y + (2.3 + tier * 1.0) * t.scale, t.z]}
              rotation={[0, t.rot + tier * 0.5, 0]}
              scale={[t.scale, t.scale, t.scale]}
            />
          ))}
        </Batch>
      ))}

      {/* Broadleaf canopies — chunky low-poly blobs */}
      <Batch limit={cap(BROADLEAF.length)} range={BROADLEAF.length} castShadow receiveShadow>
        <icosahedronGeometry args={[1.6, 0]} />
        <meshStandardMaterial color="#425734" roughness={1} flatShading />
        {BROADLEAF.map((t, i) => (
          <Instance
            key={i}
            position={[t.x, t.y + 3.1 * t.scale, t.z]}
            rotation={[t.rot * 0.3, t.rot, t.rot * 0.2]}
            scale={[t.scale * 1.1, t.scale * 0.85, t.scale * 1.1]}
          />
        ))}
      </Batch>
      <Batch limit={cap(BROADLEAF.length)} range={BROADLEAF.length} castShadow>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#51683d" roughness={1} flatShading />
        {BROADLEAF.map((t, i) => (
          <Instance
            key={i}
            position={[t.x + 0.5 * t.scale, t.y + 3.9 * t.scale, t.z - 0.3 * t.scale]}
            rotation={[t.rot, t.rot * 0.5, 0]}
            scale={[t.scale, t.scale, t.scale]}
          />
        ))}
      </Batch>

      {/* Trunk collision, batched into one static body. Sized to the actual
          trunk — an oversized box here reads as an invisible wall. The
          canopies deliberately have no collider: you walk through foliage.
          The camera avoids them analytically instead (see lib/scatter). */}
      <RigidBody type="fixed" colliders={false}>
        {TREES.map((t, i) => (
          <CuboidCollider
            key={i}
            args={[0.2 * t.scale, 1.4 * t.scale, 0.2 * t.scale]}
            position={[t.x, t.y + 1.4 * t.scale, t.z]}
          />
        ))}
      </RigidBody>
    </>
  )
}

function Bushes() {
  return (
    <Batch limit={cap(BUSHES.length)} range={BUSHES.length} castShadow receiveShadow>
      <icosahedronGeometry args={[0.62, 0]} />
      <meshStandardMaterial color="#455631" roughness={1} flatShading />
      {BUSHES.map((b, i) => (
        <Instance
          key={i}
          position={[b.x, b.y + 0.34 * b.scale, b.z]}
          rotation={[b.rot * 0.4, b.rot, 0]}
          scale={[b.scale * 1.25, b.scale * 0.8, b.scale * 1.25]}
        />
      ))}
    </Batch>
  )
}

function Rocks() {
  const big = ROCKS.filter((r) => r.scale > 1.15)

  return (
    <>
      <Batch limit={cap(ROCKS.length)} range={ROCKS.length} castShadow receiveShadow>
        <dodecahedronGeometry args={[0.85, 0]} />
        <meshStandardMaterial color="#6e6d64" roughness={0.95} flatShading />
        {ROCKS.map((r, i) => (
          <Instance
            key={i}
            position={[r.x, r.y + 0.3 * r.scale, r.z]}
            rotation={[r.rot * 0.5, r.rot, r.rot * 0.3]}
            scale={[r.scale * 1.2, r.scale * 0.85, r.scale]}
          />
        ))}
      </Batch>
      <RigidBody type="fixed" colliders={false}>
        {big.map((r, i) => (
          <CuboidCollider
            key={i}
            args={[0.85 * r.scale, 0.7 * r.scale, 0.75 * r.scale]}
            position={[r.x, r.y + 0.5 * r.scale, r.z]}
          />
        ))}
      </RigidBody>
    </>
  )
}

function GrassTufts() {
  return (
    <Batch limit={cap(TUFTS.length)} range={TUFTS.length} receiveShadow>
      <coneGeometry args={[0.22, 0.65, 4]} />
      <meshStandardMaterial color="#74854a" roughness={1} flatShading />
      {TUFTS.map((g, i) => (
        <Instance
          key={i}
          position={[g.x, g.y + 0.3 * g.scale, g.z]}
          rotation={[0.12, g.rot, 0.08]}
          scale={[g.scale, g.scale, g.scale]}
        />
      ))}
    </Batch>
  )
}

/* ── Set dressing ───────────────────────────────────────── */

function ShoreRocks() {
  return (
    <Batch limit={cap(SHORE_ROCKS.length)} range={SHORE_ROCKS.length} castShadow receiveShadow>
      <dodecahedronGeometry args={[1.1, 0]} />
      <meshStandardMaterial color="#615f57" roughness={0.95} flatShading />
      {SHORE_ROCKS.map((r, i) => (
        <Instance
          key={i}
          position={[r.x, r.y + 0.5 * r.scale, r.z]}
          rotation={[r.rot * 0.4, r.rot, r.rot * 0.25]}
          scale={[r.scale * 1.3, r.scale, r.scale * 1.1]}
        />
      ))}
    </Batch>
  )
}

/** Red-and-white posts marking the edge of the play area. */
function BoundaryPosts() {
  return (
    <>
      <Batch limit={cap(BOUNDARY_POSTS.length)} range={BOUNDARY_POSTS.length} castShadow>
        <cylinderGeometry args={[0.07, 0.07, 1.5, 5]} />
        <meshStandardMaterial color="#d8d5cc" roughness={0.9} />
        {BOUNDARY_POSTS.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 0.75, p.z]} />
        ))}
      </Batch>
      <Batch limit={cap(BOUNDARY_POSTS.length)} range={BOUNDARY_POSTS.length}>
        <cylinderGeometry args={[0.075, 0.075, 0.42, 5]} />
        <meshStandardMaterial color="#c0392b" roughness={0.9} />
        {BOUNDARY_POSTS.map((p, i) => (
          <Instance key={i} position={[p.x, p.y + 1.1, p.z]} />
        ))}
      </Batch>
    </>
  )
}

/** The landing plaza where the parachute drop puts you down. */
function DropPlaza() {
  const y = terrainHeight(0, 2)
  return (
    <group position={[0, y, 2]}>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <circleGeometry args={[6.2, 40]} />
        <meshStandardMaterial color="#5b5546" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]}>
        <ringGeometry args={[5.4, 5.75, 48]} />
        <meshBasicMaterial color="#e8e2d2" transparent opacity={0.55} />
      </mesh>
      {/* Landing "H" */}
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.08, 0]}>
          <planeGeometry args={[0.5, 3.4]} />
          <meshBasicMaterial color="#e8e2d2" transparent opacity={0.7} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <planeGeometry args={[1.8, 0.5]} />
        <meshBasicMaterial color="#e8e2d2" transparent opacity={0.7} />
      </mesh>

      {/* Wind sock */}
      <group position={[5.0, 0, 3.4]}>
        <mesh castShadow position={[0, 1.5, 0]}>
          <cylinderGeometry args={[0.06, 0.07, 3, 6]} />
          <meshStandardMaterial color="#8b8578" roughness={0.9} />
        </mesh>
        <mesh castShadow position={[0.7, 2.85, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.3, 1.4, 8, 1, true]} />
          <meshStandardMaterial color="#e8623c" side={2} roughness={0.9} flatShading />
        </mesh>
      </group>
    </group>
  )
}

/** Wrecked vehicles, containers and ruins scattered along the trails. */
function Debris() {
  return (
    <>
      {DEBRIS.map((s, i) => {
        if (s.variant === 0) {
          // Shipping container
          return (
            <RigidBody key={i} type="fixed" colliders={false} position={[s.x, s.y, s.z]} rotation={[0, s.rot, 0]}>
              <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
                <boxGeometry args={[6, 2.4, 2.4]} />
                <meshStandardMaterial color={i % 2 ? '#8a5a3c' : '#3f6070'} roughness={0.92} flatShading />
              </mesh>
              {Array.from({ length: 9 }, (_, k) => (
                <mesh key={k} position={[-2.6 + k * 0.65, 1.2, 1.23]}>
                  <boxGeometry args={[0.14, 2.3, 0.06]} />
                  <meshStandardMaterial color="#000000" transparent opacity={0.22} />
                </mesh>
              ))}
              <CuboidCollider args={[3, 1.2, 1.2]} position={[0, 1.2, 0]} />
            </RigidBody>
          )
        }
        if (s.variant === 1) {
          // Burnt-out car
          return (
            <RigidBody key={i} type="fixed" colliders={false} position={[s.x, s.y, s.z]} rotation={[0, s.rot, 0.06]}>
              <mesh castShadow receiveShadow position={[0, 0.62, 0]}>
                <boxGeometry args={[4.2, 0.85, 1.9]} />
                <meshStandardMaterial color="#4a4038" roughness={0.98} flatShading />
              </mesh>
              <mesh castShadow position={[-0.3, 1.32, 0]}>
                <boxGeometry args={[2.1, 0.8, 1.7]} />
                <meshStandardMaterial color="#3b332c" roughness={0.98} flatShading />
              </mesh>
              {[
                [-1.5, 0.85],
                [1.5, 0.85],
                [-1.5, -0.85],
                [1.5, -0.85],
              ].map(([wx, wz], k) => (
                <mesh key={k} position={[wx, 0.34, wz]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.34, 0.34, 0.26, 8]} />
                  <meshStandardMaterial color="#1e2024" roughness={1} />
                </mesh>
              ))}
              <CuboidCollider args={[2.1, 0.7, 0.95]} position={[0, 0.7, 0]} />
            </RigidBody>
          )
        }
        // Ruined wall
        return (
          <RigidBody key={i} type="fixed" colliders={false} position={[s.x, s.y, s.z]} rotation={[0, s.rot, 0]}>
            {[0, 1, 2].map((k) => (
              <mesh key={k} castShadow receiveShadow position={[k * 1.7 - 1.7, 1.3 - k * 0.35, 0]}>
                <boxGeometry args={[1.7, 2.6 - k * 0.7, 0.45]} />
                <meshStandardMaterial color="#8b8578" roughness={0.98} flatShading />
              </mesh>
            ))}
            <CuboidCollider args={[2.55, 1.1, 0.25]} position={[0, 1.1, 0]} />
          </RigidBody>
        )
      })}
    </>
  )
}

/**
 * Landmarks. Pure atmosphere — no triggers, no content, nothing to interact
 * with. They exist so the enlarged island has something to navigate by and
 * something to walk toward that isn't one of the five compounds.
 */
function Landmarks() {
  const tower = terrainHeight(-104, -84)
  const cargo = terrainHeight(96, 96)

  return (
    <>
      {/* Watchtower — four splayed legs, a caged platform, a shallow roof. */}
      <RigidBody type="fixed" colliders={false} position={[-104, tower, -84]} rotation={[0, 0.6, 0]}>
        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz], i) => (
          <mesh
            key={i}
            castShadow
            position={[sx * 2.1, 5, sz * 2.1]}
            rotation={[sz * 0.06, 0, -sx * 0.06]}
          >
            <boxGeometry args={[0.34, 10, 0.34]} />
            <meshStandardMaterial color="#5b4a30" roughness={1} flatShading />
          </mesh>
        ))}
        {/* Cross-bracing, the thing that makes it read as a tower and not posts */}
        {[2.4, 5.2, 7.8].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[4.7, 0.18, 4.7]} />
            <meshStandardMaterial color="#4e3d28" roughness={1} flatShading />
          </mesh>
        ))}
        <mesh castShadow receiveShadow position={[0, 10.1, 0]}>
          <boxGeometry args={[5.6, 0.3, 5.6]} />
          <meshStandardMaterial color="#6d5638" roughness={1} flatShading />
        </mesh>
        {[
          [0, -2.7],
          [0, 2.7],
          [-2.7, 0],
          [2.7, 0],
        ].map(([px, pz], i) => (
          <mesh key={i} position={[px, 10.8, pz]}>
            <boxGeometry args={[px === 0 ? 5.6 : 0.16, 1.1, pz === 0 ? 5.6 : 0.16]} />
            <meshStandardMaterial color="#4e3d28" roughness={1} flatShading />
          </mesh>
        ))}
        <mesh castShadow position={[0, 13.4, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[4.6, 1.7, 4]} />
          <meshStandardMaterial color="#46504a" roughness={0.9} flatShading />
        </mesh>
        <CuboidCollider args={[2.6, 5.2, 2.6]} position={[0, 5.2, 0]} />
      </RigidBody>

      {/* Downed cargo crate, half-buried, chute still tangled on it. */}
      <RigidBody type="fixed" colliders={false} position={[96, cargo, 96]} rotation={[0.1, -0.8, 0.05]}>
        <mesh castShadow receiveShadow position={[0, 1.1, 0]}>
          <boxGeometry args={[5, 2.4, 3.4]} />
          <meshStandardMaterial color="#8a5a3c" roughness={0.95} flatShading />
        </mesh>
        <mesh position={[0, 1.1, 1.73]}>
          <boxGeometry args={[4.4, 1.9, 0.08]} />
          <meshStandardMaterial color="#f0a92e" roughness={0.7} flatShading />
        </mesh>
        {/* Collapsed canopy draped over the top */}
        <mesh castShadow position={[-0.6, 2.5, -0.4]} rotation={[0.3, 0.4, -0.2]}>
          <sphereGeometry args={[2.5, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
          <meshStandardMaterial color="#c9ccc4" roughness={0.95} side={2} flatShading />
        </mesh>
        <CuboidCollider args={[2.5, 1.2, 1.7]} position={[0, 1.1, 0]} />
      </RigidBody>
    </>
  )
}

export function Props() {
  return (
    <>
      <Trees />
      <Bushes />
      <Rocks />
      <GrassTufts />
      <ShoreRocks />
      <BoundaryPosts />
      <DropPlaza />
      <Debris />
      <Landmarks />
    </>
  )
}
