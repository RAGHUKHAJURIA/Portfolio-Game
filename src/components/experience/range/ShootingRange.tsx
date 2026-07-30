import { useCallback } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { Barrel, Colliders, Crate, useBuildMats } from '../houses/parts'
import { RANGE_ORIGIN, terrainHeight } from '../../../lib/terrain'
import { useGameStore } from '../../../store/useGameStore'
import { Target } from './Target'

/**
 * The shooting range — a bonus area, deliberately nowhere near the five
 * portfolio compounds and with nothing the visitor needs. Skipping it costs
 * them nothing; it exists so the island has somewhere to go that rewards
 * exploring.
 *
 * Downrange is −Z from the firing line. `terrain.ts` flattens a 26-unit pad
 * here so the lanes, stands and berm all sit at one level.
 */

const LANES = [-6, 0, 6]
/** Target distances down each lane. */
const ROWS = [-14, -22, -30]

export function ShootingRange() {
  const m = useBuildMats()
  const y = terrainHeight(RANGE_ORIGIN[0], RANGE_ORIGIN[1])
  const registerHit = useGameStore((s) => s.registerHit)
  const onScore = useCallback(() => registerHit(), [registerHit])

  return (
    <group position={[RANGE_ORIGIN[0], y, RANGE_ORIGIN[1]]}>
      {/* Gravel pad, sunk so its edges never float. */}
      <mesh receiveShadow position={[0, -1.4, -12]} material={m.tarmac}>
        <boxGeometry args={[26, 3, 44]} />
      </mesh>

      {/* Firing line, painted */}
      <mesh position={[0, 0.11, 4]} rotation={[-Math.PI / 2, 0, 0]} material={m.accent}>
        <planeGeometry args={[22, 0.4]} />
      </mesh>

      {/* Covered firing point */}
      <group position={[0, 0, 6.5]}>
        <mesh castShadow receiveShadow position={[0, 3.2, 0]} material={m.roofMetal}>
          <boxGeometry args={[24, 0.24, 5]} />
        </mesh>
        {[-11, -5.5, 0, 5.5, 11].map((x) => (
          <mesh key={x} castShadow position={[x, 1.6, 2.1]} material={m.metal}>
            <boxGeometry args={[0.24, 3.2, 0.24]} />
          </mesh>
        ))}
        {/* Back wall of the shelter */}
        <mesh castShadow receiveShadow position={[0, 1.6, 2.4]} material={m.concrete}>
          <boxGeometry args={[24, 3.2, 0.3]} />
        </mesh>
        <CuboidCollider args={[12, 1.6, 0.15]} position={[0, 1.6, 2.4]} />
        <pointLight position={[0, 2.8, 0]} intensity={12} distance={18} decay={1.6} color="#ffe0b8" />
      </group>

      {/* Lane benches and dividers */}
      {LANES.map((x) => (
        <group key={x} position={[x, 0, 4.8]}>
          <mesh castShadow receiveShadow position={[0, 0.95, 0]} material={m.wood}>
            <boxGeometry args={[2.4, 0.12, 1.1]} />
          </mesh>
          {[-1.05, 1.05].map((sx) => (
            <mesh key={sx} castShadow position={[sx, 0.45, 0]} material={m.woodDark}>
              <boxGeometry args={[0.14, 0.9, 0.9]} />
            </mesh>
          ))}
          <CuboidCollider args={[1.2, 0.5, 0.55]} position={[0, 0.5, 0]} />
          {/* Lane number board */}
          <mesh position={[0, 2.2, 1.4]} material={m.dark}>
            <boxGeometry args={[0.9, 0.5, 0.06]} />
          </mesh>
          <mesh position={[0, 2.2, 1.44]} material={m.accent}>
            <boxGeometry args={[0.12, 0.3, 0.02]} />
          </mesh>
        </group>
      ))}

      {/* Distance markers down the lanes */}
      {ROWS.map((z) => (
        <mesh key={z} position={[0, 0.12, z + 2]} rotation={[-Math.PI / 2, 0, 0]} material={m.plaster}>
          <planeGeometry args={[20, 0.22]} />
        </mesh>
      ))}

      {/* Knockdown targets: one per lane per row. */}
      {LANES.map((x) =>
        ROWS.map((z) => <Target key={`${x}:${z}`} position={[x, 0, z]} onScore={onScore} />)
      )}

      {/* Backstop berm — a stack of sunk boxes reading as a packed-earth bank */}
      {[0, 1, 2].map((i) => (
        <mesh key={i} receiveShadow castShadow position={[0, 1 + i * 1.1, -36 + i * 1.4]} material={m.sandbag}>
          <boxGeometry args={[26 - i * 2, 2.4, 6 - i * 1.2]} />
        </mesh>
      ))}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[13, 3.4, 4]} position={[0, 3.4, -35]} />
        {/* Side walls, so a stray round can't leave the range area */}
        <CuboidCollider args={[0.4, 2, 20]} position={[-12.6, 2, -16]} />
        <CuboidCollider args={[0.4, 2, 20]} position={[12.6, 2, -16]} />
      </RigidBody>
      {[-1, 1].map((s) => (
        <mesh key={s} receiveShadow castShadow position={[s * 12.6, 1, -16]} material={m.concreteDark}>
          <boxGeometry args={[0.8, 2, 40]} />
        </mesh>
      ))}

      {/*
        Pushable clutter. Plain dynamic bodies: the character controller already
        runs with setApplyImpulsesToDynamicBodies(true), so walking into these
        shoves them, and a bullet impulse does the same. Kept to a handful —
        the brief's "a few dozen, not hundreds" budget is mostly spent here.
      */}
      {[
        [-9.5, 1.4],
        [-8.6, 0.2],
        [9.2, 1.6],
        [10.1, 0.4],
        [-9.0, -3.6],
        [9.6, -3.2],
      ].map(([bx, bz], i) => (
        <RigidBody key={i} type="dynamic" colliders={false} position={[bx, 0.5, bz]} mass={12} linearDamping={0.6} angularDamping={0.8}>
          <Barrel position={[0, -0.45, 0]} mats={m} color={i % 2 ? 'metal' : 'rust'} />
          <CuboidCollider args={[0.32, 0.45, 0.32]} />
        </RigidBody>
      ))}
      {[
        [-6.4, 8.4],
        [6.4, 8.6],
        [0.4, 9.2],
      ].map(([bx, bz], i) => (
        <RigidBody key={i} type="dynamic" colliders={false} position={[bx, 0.55, bz]} mass={9} linearDamping={0.7} angularDamping={0.9}>
          <Crate size={1} position={[0, -0.5, 0]} mats={m} accent={i === 1} />
          <CuboidCollider args={[0.5, 0.5, 0.5]} />
        </RigidBody>
      ))}

      {/* Signage at the entrance so it reads as optional, not as content. */}
      <group position={[0, 0, 11]}>
        <mesh castShadow position={[0, 2.4, 0]} material={m.dark}>
          <boxGeometry args={[6, 1.1, 0.14]} />
        </mesh>
        <mesh position={[0, 2.4, 0.09]} material={m.accent}>
          <boxGeometry args={[5.5, 0.12, 0.03]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * 2.6, 1.2, 0]} material={m.metal}>
            <boxGeometry args={[0.16, 2.4, 0.16]} />
          </mesh>
        ))}
      </group>

      {/* Static dressing */}
      <Crate size={0.9} position={[-11, 0, 3.2]} rotation={0.3} mats={m} />
      <Crate size={0.7} position={[-11.1, 0.9, 3.1]} rotation={-0.4} mats={m} />
      <Colliders boxes={[{ args: [0.5, 0.5, 0.5], position: [-11, 0.45, 3.2] }]} />
    </group>
  )
}
