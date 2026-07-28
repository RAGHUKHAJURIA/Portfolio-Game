import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { Vector3 } from 'three'
import { cameraOrbit, playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'
import { terrainHeight } from '../../lib/terrain'
import { CANOPIES } from '../../lib/scatter'

const HEAD_HEIGHT = 1.55
/** Over-the-shoulder offset, in camera-right units. */
const SHOULDER = 0.7
/** Closest the boom is ever allowed to pull in. */
const MIN_BOOM = 3.4

const _target = new Vector3()
const _desired = new Vector3()
const _dir = new Vector3()
const _right = new Vector3()

const rawWorld = (w: unknown): any => (w as any)?.raw?.() ?? (w as any)?.current ?? w

/**
 * Ray/sphere test against the tree canopies. Returns the nearest hit distance
 * along `dir` within `maxT`, or null. Only canopies near the ray's origin are
 * considered, so this stays a handful of arithmetic ops per frame rather than
 * a sweep over all ~90 trees.
 */
function canopyHit(ox: number, oy: number, oz: number, dir: Vector3, maxT: number): number | null {
  let best: number | null = null
  for (const c of CANOPIES) {
    const dx = c.x - ox
    const dz = c.z - oz
    // Cheap XZ reject before touching the full 3D maths.
    if (dx * dx + dz * dz > (maxT + c.r) * (maxT + c.r)) continue

    const dy = c.y - oy
    // Projection of the centre onto the ray.
    const tca = dx * dir.x + dy * dir.y + dz * dir.z
    if (tca < 0) continue
    const d2 = dx * dx + dy * dy + dz * dz - tca * tca
    const r2 = c.r * c.r
    if (d2 > r2) continue

    const thc = Math.sqrt(r2 - d2)
    const t = tca - thc
    if (t > 0 && t < maxT && (best === null || t < best)) best = t
  }
  return best
}

/**
 * Smooth-follow third-person camera. Position and look-at are both damped,
 * the boom shortens when geometry gets between the camera and the player,
 * and the whole thing is frame-rate independent (exponential damping rather
 * than a fixed lerp factor).
 */
export function CameraRig() {
  const { camera } = useThree()
  const { world, rapier } = useRapier()
  const look = useRef(new Vector3(0, 1.4, 0))
  const boom = useRef(cameraOrbit.distance)
  const initialised = useRef(false)

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 20)
    const phase = useGameStore.getState().phase

    // Ease the zoom toward its target.
    cameraOrbit.distance += (cameraOrbit.targetDistance - cameraOrbit.distance) * Math.min(1, dt * 8)

    const { yaw, pitch } = cameraOrbit
    const dist = cameraOrbit.distance

    _target.set(playerState.x, playerState.y + HEAD_HEIGHT, playerState.z)

    // Spherical offset behind the character.
    const cp = Math.cos(pitch)
    _dir.set(Math.sin(yaw) * cp, Math.sin(pitch), Math.cos(yaw) * cp)
    _right.set(Math.cos(yaw), 0, -Math.sin(yaw))

    // Shoulder offset, dialled out while parachuting for a wide hero shot.
    const shoulder = phase === 'dropping' ? 0 : SHOULDER

    let wanted = dist

    // Boom collision: cast outward from the player's head (already clear of
    // their own capsule, so there's nothing to filter out).
    const w = rawWorld(world)
    if (w?.castRay && rapier?.Ray) {
      try {
        const ray = new rapier.Ray(
          { x: _target.x + _right.x * shoulder, y: _target.y, z: _target.z + _right.z * shoulder },
          { x: _dir.x, y: _dir.y, z: _dir.z }
        )
        const hit = w.castRay(ray, dist, true)
        if (hit) {
          const toi = (hit as any).timeOfImpact ?? (hit as any).toi
          if (typeof toi === 'number') wanted = Math.min(wanted, toi - 0.4)
        }
      } catch {
        /* rapier build differences — degrade to no boom collision */
      }
    }

    // Tree canopies are not physics colliders (you walk through foliage), so
    // the ray above sails right through them. Test them here instead, or the
    // camera ends up parked inside a ball of leaves.
    const canopyToi = canopyHit(_target.x, _target.y, _target.z, _dir, wanted)
    if (canopyToi !== null) wanted = Math.min(wanted, canopyToi - 0.5)

    // Never collapse all the way onto the character — a third-person camera
    // inside the backpack is worse than one clipping a trunk for a moment.
    wanted = Math.max(MIN_BOOM, Math.min(dist, wanted))

    // Damp the boom out quickly when blocked, back out slowly when clear.
    const boomSpeed = wanted < boom.current ? 22 : 5
    boom.current += (wanted - boom.current) * Math.min(1, dt * boomSpeed)

    _desired.set(
      _target.x + _dir.x * boom.current + _right.x * shoulder,
      _target.y + _dir.y * boom.current,
      _target.z + _dir.z * boom.current + _right.z * shoulder
    )

    // Never let the camera bury itself in the ground.
    const groundClear = terrainHeight(_desired.x, _desired.z) + 1.1
    if (_desired.y < groundClear) _desired.y = groundClear

    if (!initialised.current) {
      camera.position.copy(_desired)
      look.current.copy(_target)
      initialised.current = true
    } else {
      const posK = 1 - Math.exp(-dt * (phase === 'dropping' ? 3.5 : 11))
      const lookK = 1 - Math.exp(-dt * (phase === 'dropping' ? 3 : 14))
      camera.position.lerp(_desired, posK)
      look.current.lerp(_target, lookK)
    }

    // Aim slightly past the shoulder so the character sits off-centre.
    camera.lookAt(
      look.current.x + _right.x * shoulder * 0.6,
      look.current.y,
      look.current.z + _right.z * shoulder * 0.6
    )
  })

  return null
}
