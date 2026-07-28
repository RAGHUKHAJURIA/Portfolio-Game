import { useMemo } from 'react'
import type { ReactNode } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { HouseId } from '../../../data/portfolioData'
import { houseById } from '../../../data/portfolioData'
import { terrainHeight } from '../../../lib/terrain'
import { HouseMarker } from './HouseMarker'
import { useBuildMats } from './materials'
import type { BuildMats } from './materials'

/**
 * Places a building at its map position with a fixed rigid body, and drops
 * the interaction marker at the door. Children are authored in local space
 * with y = 0 at ground level.
 */
export function HouseFrame({
  id,
  labelHeight,
  children,
}: {
  id: HouseId
  labelHeight: number
  children: ReactNode
}) {
  const meta = houseById[id]
  const groundY = terrainHeight(meta.position[0], meta.position[1])
  const markerY = terrainHeight(
    meta.position[0] + meta.markerOffset[0],
    meta.position[1] + meta.markerOffset[1]
  )

  return (
    <>
      <RigidBody
        type="fixed"
        colliders={false}
        position={[meta.position[0], groundY, meta.position[1]]}
        rotation={[0, meta.rotation, 0]}
      >
        {children}
      </RigidBody>
      <HouseMarker meta={meta} groundY={markerY + 0.02} labelHeight={labelHeight} />
    </>
  )
}

/* ── Reusable set dressing ──────────────────────────────── */

export function Crate({
  size = 1,
  position = [0, 0, 0],
  rotation = 0,
  mats,
  accent,
}: {
  size?: number
  position?: [number, number, number]
  rotation?: number
  mats: BuildMats
  accent?: boolean
}) {
  const s = size
  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <mesh castShadow receiveShadow position={[0, s / 2, 0]} material={accent ? mats.rust : mats.crate}>
        <boxGeometry args={[s, s, s]} />
      </mesh>
      {/* Corner banding */}
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[(sx * s) / 2, s / 2, 0]} material={mats.woodDark}>
          <boxGeometry args={[0.04, s * 0.98, s * 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, s * 0.5, (s / 2) * 1.005]} material={mats.accent}>
        <boxGeometry args={[s * 0.42, s * 0.1, 0.01]} />
      </mesh>
    </group>
  )
}

export function Barrel({
  position = [0, 0, 0],
  mats,
  color = 'rust',
}: {
  position?: [number, number, number]
  mats: BuildMats
  color?: 'rust' | 'metal' | 'accent'
}) {
  const m = color === 'rust' ? mats.rust : color === 'accent' ? mats.accent : mats.metal
  return (
    <group position={position}>
      <mesh castShadow receiveShadow position={[0, 0.45, 0]} material={m}>
        <cylinderGeometry args={[0.32, 0.32, 0.9, 10]} />
      </mesh>
      {[0.24, 0.66].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={mats.metalDark}>
          <cylinderGeometry args={[0.335, 0.335, 0.07, 10]} />
        </mesh>
      ))}
    </group>
  )
}

export function Sandbags({
  count = 5,
  rows = 2,
  position = [0, 0, 0],
  rotation = 0,
  mats,
}: {
  count?: number
  rows?: number
  position?: [number, number, number]
  rotation?: number
  mats: BuildMats
}) {
  const bags = useMemo(() => {
    const out: { p: [number, number, number]; r: number }[] = []
    for (let r = 0; r < rows; r++) {
      // Stagger alternate courses like real sandbag work, so the vertical
      // joints don't line up into an obvious grid.
      const stagger = r % 2 === 0 ? 0 : 0.26
      const n = r % 2 === 0 ? count : count - 1
      for (let i = 0; i < n; i++) {
        out.push({
          p: [(i - (n - 1) / 2) * 0.52 + stagger, 0.13 + r * 0.24, 0],
          r: (i * 0.37 + r) % 0.2,
        })
      }
    }
    return out
  }, [count, rows])

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      {bags.map((b, i) => (
        <mesh key={i} castShadow receiveShadow position={b.p} rotation={[0, b.r, 0]} material={mats.sandbag}>
          <boxGeometry args={[0.5, 0.24, 0.34]} />
        </mesh>
      ))}
    </group>
  )
}

export function Tire({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: {
  position?: [number, number, number]
  rotation?: [number, number, number]
  scale?: number
}) {
  return (
    <mesh castShadow receiveShadow position={position} rotation={rotation} scale={scale}>
      <torusGeometry args={[0.42, 0.16, 6, 12]} />
      <meshStandardMaterial color="#22242a" roughness={0.95} flatShading />
    </mesh>
  )
}

/** A stack of solid-cuboid colliders declared in one place. */
export function Colliders({
  boxes,
}: {
  boxes: { args: [number, number, number]; position: [number, number, number]; rotation?: number }[]
}) {
  return (
    <>
      {boxes.map((b, i) => (
        <CuboidCollider
          key={i}
          args={b.args}
          position={b.position}
          rotation={b.rotation ? [0, b.rotation, 0] : undefined}
        />
      ))}
    </>
  )
}

export { useBuildMats }
