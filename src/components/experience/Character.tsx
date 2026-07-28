import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CapsuleCollider, RigidBody, useRapier } from '@react-three/rapier'
import type { RapierRigidBody } from '@react-three/rapier'
import type { Group } from 'three'
import { CharacterModel } from './CharacterModel'
import { cameraOrbit, input, playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'
import { ISLAND } from '../../data/portfolioData'
import { terrainHeight } from '../../lib/terrain'
import { playFootstep, playLand, playJump } from '../../lib/audio'
import { spawnDust } from './Dust'

import {
  CAPSULE_HALF,
  CAPSULE_RADIUS,
  CHUTE_ALTITUDE,
  CHUTE_SPEED,
  DROP_FROM,
  DROP_TO,
  FEET_OFFSET,
  FREEFALL_TERMINAL,
  PLAY_DISTANCE,
  RUN_SPEED,
  WALK_SPEED,
} from '../../lib/constants'

const ACCEL = 14
const AIR_ACCEL = 3.5
const GRAVITY = -24
const JUMP_V = 8.4
const TURN_RATE = 12

const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

/** @react-three/rapier has moved this between a ref and a direct value. */
const rawWorld = (w: unknown): any => (w as any)?.raw?.() ?? (w as any)?.current ?? w

export function Character() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const { world } = useRapier()

  const controller = useRef<any>(null)
  const velY = useRef(0)
  const velX = useRef(0)
  const velZ = useRef(0)
  const yaw = useRef(0)
  const wasGrounded = useRef(true)
  const stepAccum = useRef(0)
  const dropStarted = useRef(false)

  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const markMoved = useGameStore((s) => s.markMoved)

  /* Rapier's kinematic character controller does the heavy lifting:
     shape-casting, wall sliding, step-up and ground snapping. */
  useEffect(() => {
    const w = rawWorld(world)
    if (!w?.createCharacterController) return
    const c = w.createCharacterController(0.02)
    c.setUp({ x: 0, y: 1, z: 0 })
    c.enableAutostep(0.6, 0.3, true)
    c.enableSnapToGround(0.7)
    c.setMaxSlopeClimbAngle((58 * Math.PI) / 180)
    c.setMinSlopeSlideAngle((45 * Math.PI) / 180)
    c.setApplyImpulsesToDynamicBodies(true)
    c.setCharacterMass(75)
    c.setSlideEnabled(true)
    controller.current = c
    return () => {
      try {
        w.removeCharacterController(c)
      } catch {
        /* world already torn down */
      }
    }
  }, [world])

  /* Teleport to altitude the moment the drop begins. */
  useEffect(() => {
    if (phase !== 'dropping') {
      dropStarted.current = false
      return
    }
    const b = body.current
    if (!b) return
    b.setTranslation({ x: DROP_FROM[0], y: DROP_FROM[1], z: DROP_FROM[2] }, true)
    velY.current = 0
    velX.current = 0
    velZ.current = 0
    playerState.x = DROP_FROM[0]
    playerState.y = DROP_FROM[1]
    playerState.z = DROP_FROM[2]
    playerState.gait = 0
    playerState.speed = 0
    dropStarted.current = true
    // Point the camera down the drop line for a wide hero shot.
    cameraOrbit.yaw = Math.atan2(DROP_FROM[0] - DROP_TO[0], DROP_FROM[2] - DROP_TO[1])
    cameraOrbit.pitch = 0.42
    cameraOrbit.distance = 15
    cameraOrbit.targetDistance = 15
  }, [phase])

  useFrame((_, rawDelta) => {
    const b = body.current
    const ctrl = controller.current
    if (!b) return
    const dt = Math.min(rawDelta, 1 / 30)

    const pos = b.translation()

    /* ── Parachute drop: scripted, not simulated ──────────── */
    if (phase === 'dropping' && dropStarted.current) {
      const underChute = pos.y < CHUTE_ALTITUDE
      const target = underChute ? CHUTE_SPEED : FREEFALL_TERMINAL
      velY.current += (target - velY.current) * Math.min(1, dt * (underChute ? 4.5 : 2.2))

      let y = pos.y + velY.current * dt
      // Ease horizontally toward the landing zone as altitude bleeds off.
      const k = Math.min(1, dt * (underChute ? 0.85 : 0.35))
      const x = pos.x + (DROP_TO[0] - pos.x) * k
      const z = pos.z + (DROP_TO[1] - pos.z) * k

      const groundY = terrainHeight(x, z) + FEET_OFFSET
      let landed = false
      if (y <= groundY) {
        y = groundY
        landed = true
      }

      b.setNextKinematicTranslation({ x, y, z })
      playerState.x = x
      playerState.y = y
      playerState.z = z

      const travel = Math.hypot(DROP_TO[0] - x, DROP_TO[1] - z)
      if (travel > 0.4) {
        yaw.current = Math.atan2(DROP_TO[0] - x, DROP_TO[1] - z)
        playerState.heading = yaw.current
      }
      if (visual.current) visual.current.rotation.y = yaw.current

      if (landed) {
        velY.current = 0
        playLand()
        spawnDust(x, y - FEET_OFFSET, z, 2.4)
        // Pull the camera back in from the wide drop framing to the normal
        // over-the-shoulder boom.
        cameraOrbit.targetDistance = PLAY_DISTANCE
        cameraOrbit.pitch = 0.26
        setPhase('playing')
      }
      return
    }

    /* ── Normal play ─────────────────────────────────────── */
    const frozen = useGameStore.getState().activeHouse !== null || phase !== 'playing'

    let mx = 0
    let mz = 0
    if (!frozen) {
      const cy = cameraOrbit.yaw
      // Camera-relative basis on the XZ plane.
      const fx = -Math.sin(cy)
      const fz = -Math.cos(cy)
      const rx = -fz
      const rz = fx
      mx = fx * input.forward + rx * input.right
      mz = fz * input.forward + rz * input.right
      // Clamp rather than normalise: diagonal keyboard input gets capped at 1
      // so it isn't faster than straight-line, while a half-pushed mobile
      // stick keeps its analogue magnitude and walks slowly.
      const len = Math.hypot(mx, mz)
      if (len > 1) {
        mx /= len
        mz /= len
      }
    }

    const intent = Math.hypot(mx, mz)
    // Desktop holds Shift; on mobile the stick sprints past ~72% travel.
    const top = input.sprint ? RUN_SPEED : WALK_SPEED

    const grounded = playerState.grounded
    const accel = grounded ? ACCEL : AIR_ACCEL
    const targetVX = mx * top
    const targetVZ = mz * top
    const blend = Math.min(1, dt * accel)
    velX.current += (targetVX - velX.current) * blend
    velZ.current += (targetVZ - velZ.current) * blend
    if (Math.abs(velX.current) < 0.02) velX.current = 0
    if (Math.abs(velZ.current) < 0.02) velZ.current = 0

    // Vertical. Jump is a rising edge: consume the flag every frame so a
    // press made mid-air doesn't queue up and fire the instant we land.
    const wantJump = input.jump
    input.jump = false
    if (!frozen && wantJump && grounded) {
      velY.current = JUMP_V
      playJump()
    } else if (grounded && velY.current <= 0) {
      velY.current = -2
    } else {
      velY.current += GRAVITY * dt
      if (velY.current < -45) velY.current = -45
    }

    const desired = {
      x: velX.current * dt,
      y: velY.current * dt,
      z: velZ.current * dt,
    }

    let nx = pos.x + desired.x
    let ny = pos.y + desired.y
    let nz = pos.z + desired.z
    let nowGrounded = grounded

    const collider = b.collider(0)
    if (ctrl && collider) {
      ctrl.computeColliderMovement(collider, desired)
      const corrected = ctrl.computedMovement()
      nx = pos.x + corrected.x
      ny = pos.y + corrected.y
      nz = pos.z + corrected.z
      nowGrounded = ctrl.computedGrounded()
    } else {
      // Fallback if the controller failed to initialise: ride the heightfield.
      const gy = terrainHeight(nx, nz) + FEET_OFFSET
      if (ny <= gy) {
        ny = gy
        nowGrounded = true
      } else {
        nowGrounded = false
      }
    }

    // Hard island boundary — a cliff edge you slide along rather than fall off.
    const r = Math.hypot(nx, nz)
    if (r > ISLAND.boundary) {
      const s = ISLAND.boundary / r
      nx *= s
      nz *= s
    }
    // Safety net: never let the player end up under the world.
    const floor = terrainHeight(nx, nz) + FEET_OFFSET
    if (ny < floor - 0.15) {
      ny = floor
      nowGrounded = true
      velY.current = 0
    }

    b.setNextKinematicTranslation({ x: nx, y: ny, z: nz })

    if (nowGrounded && !wasGrounded.current && velY.current < -6) {
      playLand()
      spawnDust(nx, ny - FEET_OFFSET, nz, 1.8)
    }
    wasGrounded.current = nowGrounded

    const speed = Math.hypot(velX.current, velZ.current)

    // Face the direction of travel.
    if (intent > 0.05 && speed > 0.25) {
      const want = Math.atan2(velX.current, velZ.current)
      yaw.current += shortestAngle(yaw.current, want) * Math.min(1, dt * TURN_RATE)
    }
    if (visual.current) visual.current.rotation.y = yaw.current

    playerState.x = nx
    playerState.y = ny
    playerState.z = nz
    playerState.heading = yaw.current
    playerState.speed = speed
    playerState.grounded = nowGrounded
    playerState.gait = speed < 0.35 ? 0 : speed < WALK_SPEED + 1.2 ? 1 : 2

    // Footsteps, spaced by distance travelled rather than time.
    if (nowGrounded && speed > 0.6) {
      stepAccum.current += speed * dt
      const stride = playerState.gait === 2 ? 2.0 : 1.35
      if (stepAccum.current > stride) {
        stepAccum.current = 0
        playFootstep(playerState.gait === 2)
        spawnDust(nx, ny - FEET_OFFSET, nz, playerState.gait === 2 ? 1.1 : 0.6)
      }
      if (speed > 1) markMoved()
    } else {
      stepAccum.current = Math.max(stepAccum.current, 1.0)
    }
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[0, 6, 10]}
      enabledRotations={[false, false, false]}
    >
      <CapsuleCollider args={[CAPSULE_HALF, CAPSULE_RADIUS]} />
      <group ref={visual} position={[0, -FEET_OFFSET, 0]}>
        <CharacterModel dropping={phase === 'dropping'} />
      </group>
    </RigidBody>
  )
}
