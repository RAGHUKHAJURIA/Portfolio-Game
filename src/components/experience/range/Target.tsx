import { useEffect, useRef } from 'react'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import { useBuildMats } from '../houses/materials'

/**
 * A knockdown target: a steel plate on a post that falls flat when it's hit
 * and pops back up a few seconds later.
 *
 * The plate is a genuine Rapier *dynamic* body, not an animated one, so a
 * bullet impulse, a barrel rolling into it or the player walking into it all
 * produce the same behaviour for free. Translations are locked and only
 * rotation about X is enabled, which turns the body into a hinge without
 * needing a joint — the plate pivots at its base like the real thing, and
 * cannot be knocked off its post and lost.
 */

/** Registered so the weapon raycast can find which plate it hit. */
export type TargetHandle = {
  id: number
  body: RapierRigidBody | null
  knock: (strength: number) => void
}

export const TARGETS: TargetHandle[] = []

let nextId = 1

export function Target({
  position,
  onScore,
}: {
  position: [number, number, number]
  onScore?: () => void
}) {
  const m = useBuildMats()
  const plate = useRef<RapierRigidBody>(null)
  const down = useRef(false)
  const resetAt = useRef(0)

  useEffect(() => {
    const id = nextId++
    const handle: TargetHandle = {
      id,
      body: null,
      knock: (strength) => {
        const b = plate.current
        if (!b || down.current) return
        down.current = true
        resetAt.current = performance.now() + 3200
        // Torque about X tips it away from the shooter.
        b.applyTorqueImpulse({ x: -strength, y: 0, z: 0 }, true)
        onScore?.()
      },
    }
    TARGETS.push(handle)
    // Keep the body reachable after mount so the raycast can match a collider
    // back to its target.
    const t = setTimeout(() => {
      handle.body = plate.current
    }, 0)
    return () => {
      clearTimeout(t)
      const i = TARGETS.indexOf(handle)
      if (i >= 0) TARGETS.splice(i, 1)
    }
  }, [onScore])

  // Stand it back up once it's been down long enough.
  useEffect(() => {
    const iv = setInterval(() => {
      if (!down.current || performance.now() < resetAt.current) return
      const b = plate.current
      if (!b) return
      down.current = false
      b.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
      b.setAngvel({ x: 0, y: 0, z: 0 }, true)
      b.setLinvel({ x: 0, y: 0, z: 0 }, true)
    }, 250)
    return () => clearInterval(iv)
  }, [])

  return (
    <group position={position}>
      {/* Post — static, so the plate always has something to sit on. */}
      <RigidBody type="fixed" colliders={false}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]} material={m.metalDark}>
          <boxGeometry args={[0.14, 1, 0.14]} />
        </mesh>
        <mesh receiveShadow position={[0, 0.04, 0]} material={m.concreteDark}>
          <boxGeometry args={[0.9, 0.08, 0.7]} />
        </mesh>
        <CuboidCollider args={[0.45, 0.06, 0.35]} position={[0, 0.05, 0]} />
      </RigidBody>

      {/*
        The plate. enabledTranslations all false makes this a pure hinge:
        gravity still pulls it over once tipped, but it can never leave the
        post. Damping keeps it from oscillating for ever after it lands.
      */}
      <RigidBody
        ref={plate}
        type="dynamic"
        colliders={false}
        position={[0, 1.0, 0]}
        enabledTranslations={[false, false, false]}
        enabledRotations={[true, false, false]}
        angularDamping={1.6}
        mass={4}
      >
        <mesh castShadow receiveShadow position={[0, 0.42, 0]} material={m.plaster}>
          <boxGeometry args={[0.78, 0.84, 0.06]} />
        </mesh>
        {/* Scoring rings, front face only */}
        <mesh position={[0, 0.42, 0.04]} material={m.red}>
          <circleGeometry args={[0.26, 18]} />
        </mesh>
        <mesh position={[0, 0.42, 0.05]} material={m.plaster}>
          <circleGeometry args={[0.15, 14]} />
        </mesh>
        <mesh position={[0, 0.42, 0.06]} material={m.dark}>
          <circleGeometry args={[0.07, 12]} />
        </mesh>
        <CuboidCollider args={[0.39, 0.42, 0.04]} position={[0, 0.42, 0]} />
      </RigidBody>
    </group>
  )
}
