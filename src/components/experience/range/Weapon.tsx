import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import type { Mesh, MeshBasicMaterial } from 'three'
import { AdditiveBlending, Vector3 } from 'three'
import { cameraOrbit, input, playerState } from '../../../state/controls'
import { useGameStore, isInputFrozen } from '../../../store/useGameStore'
import { playShot, playHit, playImpact } from '../../../lib/audio'
import { spawnDust } from '../Dust'
import { TARGETS } from './Target'

/**
 * Instant-hit weapon.
 *
 * Raycast from the camera rather than simulated projectiles: at these ranges
 * travel time is imperceptible, and a ray costs nothing next to spawning and
 * stepping a rigid body per shot.
 *
 * The ray starts *past* the player, not at the camera. The camera sits behind
 * the character, so a ray from the lens hits their own backpack every time;
 * skipping forward to just beyond them is a line of arithmetic instead of
 * threading the player's collider handle through to a filter callback.
 */

const RANGE = 140
const FIRE_INTERVAL = 0.12
/** How long the tracer stays visible. Long enough to see, short enough to
 *  read as a streak rather than a laser beam. */
const TRACER_LIFE = 0.07
const RECOIL_KICK = 0.035
const RECOIL_SETTLE = 0.15

const _origin = new Vector3()
const _dir = new Vector3()
const _hit = new Vector3()
const _mid = new Vector3()

const rawWorld = (w: unknown): any => (w as any)?.raw?.() ?? (w as any)?.current ?? w

export function Weapon() {
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const registerShot = useGameStore((s) => s.registerShot)

  const tracer = useRef<Mesh>(null)
  const flash = useRef<Mesh>(null)
  const cooldown = useRef(0)
  const tracerLeft = useRef(0)
  const recoil = useRef(0)

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    cooldown.current = Math.max(0, cooldown.current - dt)

    const frozen = isInputFrozen()

    // Aim is a held state; it decays to zero whenever input is frozen so a
    // panel opening mid-aim doesn't leave the weapon shouldered.
    playerState.aim = frozen ? 0 : input.aim ? 1 : 0

    // Recoil settles back over roughly RECOIL_SETTLE seconds.
    if (recoil.current > 0) {
      recoil.current = Math.max(0, recoil.current - dt / RECOIL_SETTLE)
      cameraOrbit.pitch += recoil.current * RECOIL_KICK * (dt / RECOIL_SETTLE) * -1
    }

    const wantFire = input.firePressed
    input.firePressed = false

    if (wantFire && !frozen && input.aim && cooldown.current === 0) {
      cooldown.current = FIRE_INTERVAL
      registerShot()
      playShot()

      camera.getWorldDirection(_dir)
      // Step past the character so the shot doesn't hit its own capsule.
      const skip = camera.position.distanceTo(
        _hit.set(playerState.x, playerState.y, playerState.z)
      ) + 1.1
      _origin.copy(camera.position).addScaledVector(_dir, skip)

      let dist = RANGE
      let struck = false
      const w = rawWorld(world)
      if (w?.castRay && rapier?.Ray) {
        try {
          const ray = new rapier.Ray(
            { x: _origin.x, y: _origin.y, z: _origin.z },
            { x: _dir.x, y: _dir.y, z: _dir.z }
          )
          const h = w.castRay(ray, RANGE, true)
          if (h) {
            const toi = (h as any).timeOfImpact ?? (h as any).toi
            if (typeof toi === 'number') {
              dist = toi
              struck = true
            }
          }
        } catch {
          /* rapier build differences — degrade to a tracer with no impact */
        }
      }

      _hit.copy(_origin).addScaledVector(_dir, dist)

      // Nearest target to the impact point wins. Matching a Rapier collider
      // handle back to its React component is far more plumbing than a
      // distance test over nine plates, and behaves identically.
      let best: (typeof TARGETS)[number] | null = null
      let bestD = 1.1
      for (const t of TARGETS) {
        const b = t.body
        if (!b) continue
        const p = b.translation()
        const d = Math.hypot(p.x - _hit.x, p.y + 0.42 - _hit.y, p.z - _hit.z)
        if (d < bestD) {
          bestD = d
          best = t
        }
      }

      if (best) {
        best.knock(2.6)
        playHit()
      } else if (struck) {
        playImpact()
        spawnDust(_hit.x, _hit.y, _hit.z, 0.7)
      }

      // Tracer: a thin box stretched from the muzzle to the impact point.
      if (tracer.current) {
        _mid.copy(_origin).addScaledVector(_dir, dist * 0.5)
        tracer.current.position.copy(_mid)
        tracer.current.scale.set(1, 1, dist)
        tracer.current.lookAt(_hit)
        tracer.current.visible = true
        tracerLeft.current = TRACER_LIFE
      }
      if (flash.current) {
        flash.current.position.copy(_origin)
        flash.current.visible = true
      }

      recoil.current = 1
      // Immediate kick; the loop above eases it back down.
      cameraOrbit.pitch = Math.min(1.2, cameraOrbit.pitch + RECOIL_KICK)
    }

    if (tracerLeft.current > 0) {
      tracerLeft.current -= dt
      const t = Math.max(0, tracerLeft.current / TRACER_LIFE)
      if (tracer.current) {
        ;(tracer.current.material as MeshBasicMaterial).opacity = t * 0.75
        if (t <= 0) tracer.current.visible = false
      }
      if (flash.current) {
        flash.current.scale.setScalar(0.35 + (1 - t) * 0.5)
        ;(flash.current.material as MeshBasicMaterial).opacity = t
        if (t <= 0) flash.current.visible = false
      }
    }
  })

  return (
    <>
      {/* Tracer. frustumCulled off for the same reason as the prop batches:
          its bounds are rewritten every shot and a stale sphere would blink it
          out at exactly the angles you are looking down. */}
      <mesh ref={tracer} visible={false} frustumCulled={false} renderOrder={6}>
        <boxGeometry args={[0.035, 0.035, 1]} />
        <meshBasicMaterial
          color="#ffd48a"
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Muzzle flash */}
      <mesh ref={flash} visible={false} frustumCulled={false} renderOrder={7}>
        <sphereGeometry args={[0.22, 8, 6]} />
        <meshBasicMaterial
          color="#ffdf9e"
          transparent
          opacity={1}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </>
  )
}
