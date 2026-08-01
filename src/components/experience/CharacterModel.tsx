import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { MeshStandardMaterial, Vector2 } from 'three'
import { cameraOrbit, playerState } from '../../state/controls'
import { CHUTE_ALTITUDE, FEET_OFFSET } from '../../lib/constants'
import { tiled } from '../../lib/textures'
import { terrainHeight } from '../../lib/terrain'
import { insideHouse } from './houses/HouseInterior'

/**
 * A hand-built low-poly operator. Deliberately not a downloaded rig — the
 * whole scene is procedural, so the character is boxes and a code-driven gait
 * rather than a Mixamo GLB.
 *
 * ── Anatomy ────────────────────────────────────────────────
 * The first version of this read as a featureless pawn, for three concrete
 * reasons, all fixed here:
 *
 *  1. The arms were *inside* the torso silhouette. Shoulders sat at x = ±0.34
 *     with a half-width of 0.085, so the outer edge landed at 0.425 against a
 *     vest half-width of 0.28 — the limbs never broke the outline. Shoulders
 *     are now outboard of the vest with a visible gap, and the torso is
 *     narrower than the shoulder span.
 *  2. Nothing bent. Each limb was one rigid group rotating at the hip or
 *     shoulder, so legs swung like sticks. Every limb is now two segments with
 *     a real joint between them — `kneeL/R` and `elbowL/R` — and the gait
 *     drives knee flexion on the swing phase and elbow flexion throughout.
 *  3. The weapon was parented to the chest, floating 0.28 above the hands and
 *     0.16 to one side, attached to nothing. It now hangs off the right hand
 *     group, so it tracks the arm through every pose by construction, and the
 *     left arm is posed to meet the handguard.
 *
 * Proportions are 7 heads tall (1.82 units, head 0.26), which is the standard
 * heroic-realistic figure — the old rig was nearer 6.3 and read as stumpy.
 * Model space has y = 0 at the soles; Character mounts this at -FEET_OFFSET.
 *
 * ── Animation ──────────────────────────────────────────────
 * There are no clips to crossfade, because the pose is computed rather than
 * sampled. Every pose parameter is critically damped toward its target instead
 * of switched, which is what a crossfade is for.
 */

/* ── Skeleton dimensions. Everything else is derived from these. ── */
const HIP_Y = 1.02
const THIGH = 0.46
const SHIN = 0.42
const SHOULDER_X = 0.33
const SHOULDER_Y = 0.4
const UPPER_ARM = 0.36
const FOREARM = 0.3
/** Chest-local y of the neck joint and the head pivot. */
const NECK_Y = 0.46
const HEAD_Y = 0.54

/** Frame-rate independent approach. */
const damp = (cur: number, target: number, dt: number, rate: number) =>
  cur + (target - cur) * (1 - Math.exp(-dt * rate))

/** Half the stance width — the lateral offset of each foot from the centreline. */
const HALF_STANCE = 0.16
/** How far a leg may drop to reach lower ground before it just floats. */
const MAX_FOOT_DROP = 0.4
/** Clamp on how far the head turns away from the body, in radians. */
const MAX_HEAD_TURN = 0.7

/**
 * Arm poses, as [shoulder.x, shoulder.y, shoulder.z, elbow.x].
 *
 * Kept in one table because these are the numbers that get tuned by eye, and
 * hunting them down inside the frame loop is miserable. `lowered` is the
 * patrol carry, `aimed` is shouldered. The rifle rides the right hand, so the
 * right pair positions the weapon and the left pair reaches for the handguard.
 */
/*
 * Sign note, because it is easy to get backwards and the result looks absurd:
 * a limb hangs along local -y, and rotating a joint by +x swings the far end
 * toward -z, i.e. *backwards*. That is what a knee does, so knee flexion is
 * positive. An elbow bends the other way, so elbow flexion is NEGATIVE. The
 * first pass had these positive and the arms hyperextended, which pointed the
 * muzzle back over the character's own shoulder.
 *
 * Shoulders stay close to hanging and the elbows do the work — an upper arm
 * extended out front puts the elbow somewhere no shooter's elbow goes.
 */
const POSE = {
  rightLowered: [-0.3, 0, -0.15, -1.2] as const,
  rightAimed: [-0.55, -0.15, -0.22, -1.55] as const,
  leftLowered: [-0.5, 0.34, 0.3, -1.3] as const,
  leftAimed: [-0.75, 0.46, 0.42, -1.28] as const,
}

/** Shortest signed angle from `from` to `to`. */
const shortestAngle = (from: number, to: number) => {
  let d = (to - from) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

const useMats = () =>
  useMemo(() => {
    // Fabric gets fine grain; the tile is small because the character is small.
    const normalMap = tiled('normal', 9)
    const roughnessMap = tiled('roughness', 9)
    const mk = (color: string, roughness = 0.85, metalness = 0, bump = 1) =>
      new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: true,
        normalMap,
        normalScale: new Vector2(bump, bump),
        roughnessMap: bump > 0.3 ? roughnessMap : null,
      })
    // Pitched a couple of stops brighter than real fatigues would be: the sun
    // sits low and behind the island, so a realistic olive drab turns the
    // character into an unreadable silhouette from most camera angles.
    return {
      fatigue: mk('#7d8a5c', 0.95, 0, 1.3),
      fatigueDark: mk('#65714a', 0.95, 0, 1.3),
      vest: mk('#4a5240', 0.9, 0, 1.5),
      strap: mk('#2f342a', 0.95, 0, 1.6),
      boot: mk('#3a332c', 0.75, 0, 1.1),
      skin: mk('#c9976a', 0.8, 0, 0.25),
      skinDark: mk('#a87749', 0.8, 0, 0.25),
      helmet: mk('#5c6647', 0.7, 0.1, 0.7),
      pack: mk('#75694f', 0.95, 0, 1.5),
      accent: mk('#f0a92e', 0.5, 0, 0.3),
      glass: mk('#2c4450', 0.2, 0.7, 0),
      eye: mk('#20242a', 0.35, 0, 0),
      // Buckles, clips and weapon furniture — the only genuinely metal bits.
      buckle: mk('#8d8b84', 0.35, 0.85, 0.3),
      gunmetal: mk('#33383a', 0.45, 0.7, 0.4),
      polymer: mk('#2b2f2c', 0.8, 0, 0.6),
    }
  }, [])

type Mats = ReturnType<typeof useMats>

/**
 * One leg: thigh, then a knee group carrying the shin and boot. The knee group
 * is the joint — rotating it bends the leg at the right place, which is the
 * whole difference between a walking figure and a swinging stick.
 */
function Leg({ mats, knee }: { mats: Mats; knee: React.RefObject<Group> }) {
  return (
    <>
      <mesh castShadow position={[0, -THIGH / 2, 0]} material={mats.fatigue}>
        <boxGeometry args={[0.23, THIGH, 0.25]} />
      </mesh>
      {/* Thigh pocket, so the leg isn't one flat column */}
      <mesh position={[0.11, -0.26, 0.02]} material={mats.fatigueDark}>
        <boxGeometry args={[0.04, 0.18, 0.16]} />
      </mesh>

      <group ref={knee} position={[0, -THIGH, 0]}>
        {/* Knee pad sits on the joint itself */}
        <mesh castShadow position={[0, -0.03, 0.11]} material={mats.vest}>
          <boxGeometry args={[0.21, 0.16, 0.08]} />
        </mesh>
        <mesh castShadow position={[0, -SHIN / 2, 0]} material={mats.fatigueDark}>
          <boxGeometry args={[0.2, SHIN, 0.21]} />
        </mesh>
        {/* Boot cuff, boot, and a sole proud of it so the foot reads */}
        <mesh position={[0, -SHIN + 0.03, 0]} material={mats.boot}>
          <boxGeometry args={[0.22, 0.1, 0.23]} />
        </mesh>
        <mesh castShadow position={[0, -SHIN - 0.05, 0.03]} material={mats.boot}>
          <boxGeometry args={[0.23, 0.14, 0.32]} />
        </mesh>
        <mesh castShadow position={[0, -SHIN - 0.135, 0.04]} material={mats.polymer}>
          <boxGeometry args={[0.25, 0.05, 0.35]} />
        </mesh>
        <mesh position={[0, -SHIN - 0.02, 0.16]} material={mats.strap}>
          <boxGeometry args={[0.19, 0.08, 0.02]} />
        </mesh>
      </group>
    </>
  )
}

/**
 * One arm: upper arm, then an elbow group carrying the forearm and hand.
 * `hand` is the socket a weapon attaches to.
 */
function Arm({
  mats,
  side,
  elbow,
  hand,
  children,
}: {
  mats: Mats
  side: 1 | -1
  elbow: React.RefObject<Group>
  hand: React.RefObject<Group>
  children?: React.ReactNode
}) {
  return (
    <>
      {/* Shoulder pad bridges the gap to the vest so the join doesn't gape */}
      <mesh castShadow position={[side * 0.02, 0.02, 0]} material={mats.vest}>
        <boxGeometry args={[0.19, 0.17, 0.22]} />
      </mesh>
      <mesh castShadow position={[0, -UPPER_ARM / 2, 0]} material={mats.fatigue}>
        <boxGeometry args={[0.15, UPPER_ARM, 0.17]} />
      </mesh>

      <group ref={elbow} position={[0, -UPPER_ARM, 0]}>
        {/* Elbow pad on the joint */}
        <mesh castShadow position={[0, 0, 0.08]} material={mats.vest}>
          <boxGeometry args={[0.15, 0.14, 0.07]} />
        </mesh>
        <mesh castShadow position={[0, -FOREARM / 2, 0]} material={mats.fatigueDark}>
          <boxGeometry args={[0.13, FOREARM, 0.15]} />
        </mesh>
        {/* Cuff */}
        <mesh position={[0, -FOREARM + 0.03, 0]} material={mats.strap}>
          <boxGeometry args={[0.14, 0.06, 0.16]} />
        </mesh>

        <group ref={hand} position={[0, -FOREARM - 0.06, 0]}>
          <mesh castShadow material={mats.boot}>
            <boxGeometry args={[0.12, 0.14, 0.15]} />
          </mesh>
          {/* Thumb, so the hand is not a cube */}
          <mesh position={[side * -0.06, 0.01, 0.05]} material={mats.boot}>
            <boxGeometry args={[0.04, 0.08, 0.07]} />
          </mesh>
          {children}
        </group>
      </group>
    </>
  )
}

/**
 * Carried weapon.
 *
 * Deliberately a generic blocky carbine — receiver, handguard, tube barrel,
 * box magazine, stock, and a slab optic. It is not modelled on, and is not
 * meant to resemble, any specific real firearm; a recognisable one would mean
 * replicating a trademarked design for no gain at this poly count.
 *
 * Authored with the barrel along +z and the pistol grip at (0, -0.11, -0.06),
 * which is the point the right hand grips — see WEAPON_IN_HAND.
 */
function Rifle({ mats }: { mats: Mats }) {
  return (
    <group>
      {/* Receiver */}
      <mesh castShadow material={mats.gunmetal}>
        <boxGeometry args={[0.07, 0.11, 0.34]} />
      </mesh>
      {/* Handguard */}
      <mesh castShadow position={[0, -0.005, 0.3]} material={mats.polymer}>
        <boxGeometry args={[0.06, 0.08, 0.28]} />
      </mesh>
      {/* Barrel */}
      <mesh castShadow position={[0, 0.01, 0.53]} rotation={[Math.PI / 2, 0, 0]} material={mats.gunmetal}>
        <cylinderGeometry args={[0.016, 0.018, 0.22, 6]} />
      </mesh>
      {/* Optic */}
      <mesh castShadow position={[0, 0.09, 0.06]} material={mats.polymer}>
        <boxGeometry args={[0.045, 0.055, 0.14]} />
      </mesh>
      <mesh position={[0, 0.095, 0.135]} rotation={[Math.PI / 2, 0, 0]} material={mats.glass}>
        <cylinderGeometry args={[0.021, 0.021, 0.01, 8]} />
      </mesh>
      {/* Magazine */}
      <mesh castShadow position={[0, -0.13, 0.04]} rotation={[0.16, 0, 0]} material={mats.polymer}>
        <boxGeometry args={[0.05, 0.19, 0.08]} />
      </mesh>
      {/* Grip — the part the right hand closes around */}
      <mesh castShadow position={[0, -0.11, -0.06]} rotation={[-0.34, 0, 0]} material={mats.polymer}>
        <boxGeometry args={[0.045, 0.16, 0.06]} />
      </mesh>
      {/* Stock */}
      <mesh castShadow position={[0, 0, -0.29]} material={mats.polymer}>
        <boxGeometry args={[0.05, 0.09, 0.24]} />
      </mesh>
      <mesh castShadow position={[0, -0.035, -0.42]} material={mats.polymer}>
        <boxGeometry args={[0.055, 0.13, 0.05]} />
      </mesh>
      {/* Sling swivel */}
      <mesh position={[0, -0.06, 0.36]} material={mats.buckle}>
        <boxGeometry args={[0.02, 0.035, 0.02]} />
      </mesh>
    </group>
  )
}

/**
 * Seats the rifle in the right palm.
 *
 * The hand's local -y runs down the forearm, so rotating the weapon +90° about
 * x aligns its barrel (+z) with that axis: point the arm forward and the
 * muzzle follows. The offset then slides the grip into the palm rather than
 * leaving the receiver centred on the wrist.
 */
const WEAPON_IN_HAND = {
  position: [0, -0.05, 0.09] as [number, number, number],
  // π/2 alone points the barrel straight down the forearm, which — once the
  // shoulder and elbow rotations of the aimed pose are composed — comes out
  // ~30° above horizontal (barrel direction resolves to (-0.15, 0.50, 0.85)).
  // The extra 0.53 rad pitches it back down to level: rotating past π/2 mixes
  // in the hand's local -z, which points world-down in that pose. Solving
  // 0.499·cos δ - 0.860·sin δ = 0 gives δ = 0.53.
  rotation: [Math.PI / 2 + 0.53, 0, 0] as [number, number, number],
}

export function CharacterModel({ dropping }: { dropping: boolean }) {
  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const head = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const kneeL = useRef<Group>(null)
  const kneeR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const elbowL = useRef<Group>(null)
  const elbowR = useRef<Group>(null)
  const handR = useRef<Group>(null)
  const handL = useRef<Group>(null)
  const chute = useRef<Group>(null)
  const pack = useRef<Group>(null)
  const glow = useRef<Mesh>(null)

  const mats = useMats()
  const phase = useRef(0)

  // Damped pose parameters. These are the crossfade: nothing here ever jumps
  // when the gait changes, it eases.
  const swingRef = useRef(0)
  const armSwingRef = useRef(0)
  const leanRef = useRef(0)
  const aimRef = useRef(0)
  const footL = useRef(0)
  const footR = useRef(0)
  const rollRef = useRef(0)
  const headYaw = useRef(0)
  const headPitch = useRef(0)

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const { speed, grounded, gait } = playerState

    // Aiming is suppressed in the air and while sprinting — you can't shoulder
    // a weapon mid-stride, and it stops the pose fighting the run cycle.
    const aimTarget = playerState.aim > 0 && grounded && gait !== 2 ? 1 : 0
    aimRef.current = damp(aimRef.current, aimTarget, dt, 9)
    const aim = aimRef.current

    // Gait cycle advances with actual speed so the feet never skate.
    const cadence = gait === 2 ? 2.05 : gait === 1 ? 2.35 : 0
    phase.current += dt * speed * cadence
    const t = phase.current

    swingRef.current = damp(swingRef.current, gait === 2 ? 0.95 : gait === 1 ? 0.62 : 0, dt, 11)
    armSwingRef.current = damp(
      // Arms stop swinging when the weapon comes up; they're holding it.
      armSwingRef.current,
      (gait === 2 ? 0.72 : gait === 1 ? 0.45 : 0) * (1 - aim),
      dt,
      11
    )
    leanRef.current = damp(leanRef.current, gait === 2 ? 0.19 : gait === 1 ? 0.07 : 0, dt, 8)
    const swing = swingRef.current
    const armSwing = armSwingRef.current

    const idleBob = Math.sin(performance.now() * 0.0016) * 0.018
    const runBob = gait ? Math.abs(Math.sin(t)) * (gait === 2 ? 0.07 : 0.04) : 0

    if (dropping) {
      // Skydive pose: arched back, arms and legs out.
      const flutter = Math.sin(performance.now() * 0.006) * 0.09
      const deployed = playerState.y < CHUTE_ALTITUDE
      // Belly-to-earth in freefall, upright once the canopy takes the weight.
      if (hips.current) hips.current.rotation.set(deployed ? -0.06 : -0.4, 0, 0)
      if (chest.current) chest.current.rotation.x = (deployed ? 0.04 : 0.24) + flutter * 0.3
      if (legL.current) legL.current.rotation.set(deployed ? 0.12 : 0.6 + flutter, 0, 0.16)
      if (legR.current) legR.current.rotation.set(deployed ? 0.12 : 0.6 - flutter, 0, -0.16)
      if (kneeL.current) kneeL.current.rotation.x = deployed ? 0.3 : 0.85
      if (kneeR.current) kneeR.current.rotation.x = deployed ? 0.3 : 0.85
      if (armL.current) armL.current.rotation.set(deployed ? -2.5 : -1.9, 0, (deployed ? 0.5 : 0.8) + flutter)
      if (armR.current) armR.current.rotation.set(deployed ? -2.5 : -1.9, 0, (deployed ? -0.5 : -0.8) - flutter)
      if (elbowL.current) elbowL.current.rotation.x = -0.5
      if (elbowR.current) elbowR.current.rotation.x = -0.5
      if (head.current) head.current.rotation.set(deployed ? -0.05 : -0.35, 0, 0)
      if (root.current) root.current.position.y = 0
      if (chute.current) {
        chute.current.visible = deployed
        // Canopy inflates over the first moment after deployment.
        const ct = Math.min(1, (CHUTE_ALTITUDE - playerState.y) / 3)
        const s = 0.25 + 0.75 * (ct * ct * (3 - 2 * ct))
        chute.current.scale.setScalar(s)
        chute.current.rotation.z = Math.sin(performance.now() * 0.0022) * 0.07
        chute.current.rotation.x = Math.cos(performance.now() * 0.0019) * 0.05
      }
      return
    }

    if (chute.current) chute.current.visible = false

    /* ── Legs ─────────────────────────────────────────────── */
    if (!grounded) {
      // Airborne: tuck, with the knees actually folded.
      if (legL.current) legL.current.rotation.set(0.55, 0, 0)
      if (legR.current) legR.current.rotation.set(-0.2, 0, 0)
      if (kneeL.current) kneeL.current.rotation.x = 0.95
      if (kneeR.current) kneeR.current.rotation.x = 0.45
      if (chest.current) chest.current.rotation.x = 0.1
    } else {
      const sw = Math.sin(t)
      if (legL.current) legL.current.rotation.set(sw * swing, 0, 0)
      if (legR.current) legR.current.rotation.set(-sw * swing, 0, 0)
      // The knee folds on the swing phase — the half of the cycle where the
      // leg travels forward and the foot has to clear the ground. A straight
      // leg through that phase is exactly what reads as a stick.
      if (kneeL.current) kneeL.current.rotation.x = Math.max(0, -sw) * swing * 1.15 + 0.06
      if (kneeR.current) kneeR.current.rotation.x = Math.max(0, sw) * swing * 1.15 + 0.06
      if (chest.current) {
        // Lean into a sprint; square up to the target when aiming.
        chest.current.rotation.x = leanRef.current * (1 - aim * 0.6)
        chest.current.rotation.y = Math.sin(t) * (gait ? 0.07 : 0) * (1 - aim)
      }
      if (hips.current) hips.current.rotation.y = -Math.sin(t) * (gait ? 0.09 : 0) * (1 - aim * 0.7)
    }

    /* ── Arms ─────────────────────────────────────────────── */
    // Both arms interpolate between the lowered carry and the shouldered aim,
    // then the gait swing is added on top of the shoulder pitch.
    const mix = (a: readonly number[], b: readonly number[], i: number) => a[i] + (b[i] - a[i]) * aim
    const swingOffset = Math.sin(t) * armSwing

    if (armR.current) {
      armR.current.rotation.set(
        mix(POSE.rightLowered, POSE.rightAimed, 0) + swingOffset,
        mix(POSE.rightLowered, POSE.rightAimed, 1),
        mix(POSE.rightLowered, POSE.rightAimed, 2)
      )
    }
    if (elbowR.current) elbowR.current.rotation.x = mix(POSE.rightLowered, POSE.rightAimed, 3)
    if (armL.current) {
      armL.current.rotation.set(
        mix(POSE.leftLowered, POSE.leftAimed, 0) - swingOffset,
        mix(POSE.leftLowered, POSE.leftAimed, 1),
        mix(POSE.leftLowered, POSE.leftAimed, 2)
      )
    }
    if (elbowL.current) elbowL.current.rotation.x = mix(POSE.leftLowered, POSE.leftAimed, 3)

    /* ── Foot planting ──────────────────────────────────────
       The island has 15° hills now, so a level stance leaves the uphill foot
       buried and the downhill one hanging in the air. Each leg drops to the
       ground under its own foot and the hips roll toward the low side.

       Sampled from the height field rather than raycast: terrainHeight is the
       same function the collider mesh is built from, so it is exact and costs
       nothing. That also means it is only valid outdoors — indoors the player
       stands on a slab the height field knows nothing about, so the correction
       switches off, which is right anyway because floors are flat. */
    let targetL = 0
    let targetR = 0
    let targetRoll = 0
    const outdoors = grounded && !insideHouse(playerState.x, playerState.y, playerState.z)
    if (outdoors) {
      const yaw = playerState.heading
      const c = Math.cos(yaw)
      const s = Math.sin(yaw)
      // Local (±HALF_STANCE, 0, 0) into world, matching the rotation
      // convention used for the house marker offsets.
      const soleY = playerState.y - FEET_OFFSET
      const gR = terrainHeight(playerState.x + c * HALF_STANCE, playerState.z - s * HALF_STANCE)
      const gL = terrainHeight(playerState.x - c * HALF_STANCE, playerState.z + s * HALF_STANCE)
      // The capsule rests on the higher contact, so these are never positive
      // by much; clamping keeps a cliff edge from stretching a leg to nothing.
      targetL = Math.max(-MAX_FOOT_DROP, Math.min(0, gL - soleY))
      targetR = Math.max(-MAX_FOOT_DROP, Math.min(0, gR - soleY))
      targetRoll = Math.max(-0.16, Math.min(0.16, (targetR - targetL) * 0.45))
    }
    footL.current = damp(footL.current, targetL, dt, 12)
    footR.current = damp(footR.current, targetR, dt, 12)
    rollRef.current = damp(rollRef.current, targetRoll, dt, 9)
    if (legL.current) legL.current.position.y = footL.current
    if (legR.current) legR.current.position.y = footR.current
    if (hips.current) hips.current.rotation.z = rollRef.current

    /* ── Head tracking ──────────────────────────────────────
       The head turns toward where the camera is looking rather than sweeping
       on a fixed sine. Standing still and panning the camera now reads as the
       character looking around, which is the cheapest "alive" cue there is. */
    if (head.current) {
      const wantYaw = Math.max(
        -MAX_HEAD_TURN,
        Math.min(MAX_HEAD_TURN, shortestAngle(playerState.heading, cameraOrbit.yaw + Math.PI))
      )
      // Aiming locks the head down the sights; sprinting drops the gaze ahead.
      headYaw.current = damp(headYaw.current, wantYaw * (1 - aim), dt, 6)
      headPitch.current = damp(
        headPitch.current,
        (gait === 2 ? -0.12 : 0) + aim * 0.1 - cameraOrbit.pitch * 0.25 * (1 - aim),
        dt,
        6
      )
      head.current.rotation.y = headYaw.current
      head.current.rotation.x = headPitch.current
    }

    // Breathing: a slow rise and fall of the chest, strongest at rest. Without
    // it a stationary character is completely frozen between footsteps.
    if (chest.current) {
      const breath = Math.sin(performance.now() * 0.0011) * (gait ? 0.004 : 0.012)
      chest.current.position.y = breath
    }

    // Backpack sway, a beat behind the torso — cheap secondary motion that
    // stops the whole upper body reading as one rigid block.
    if (pack.current) {
      pack.current.rotation.x = Math.sin(t - 0.5) * (gait ? 0.05 : 0.012)
      pack.current.rotation.z = Math.sin(t * 0.5) * (gait ? 0.03 : 0.008)
    }

    if (root.current) root.current.position.y = idleBob + runBob
    if (glow.current) {
      const m = glow.current.material as MeshStandardMaterial
      m.opacity = 0.25 + Math.sin(performance.now() * 0.003) * 0.08
    }
  })

  return (
    <group ref={root}>
      {/* Parachute — only visible once deployed. Sized and lifted so it never
          fills the frame from the over-the-shoulder camera. */}
      <group ref={chute} visible={false} position={[0, 4.6, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[1.35, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <meshStandardMaterial color="#e8623c" side={2} flatShading roughness={0.9} />
        </mesh>
        <mesh position={[0, -0.03, 0]}>
          <sphereGeometry args={[1.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
          <meshStandardMaterial color="#f2f2ef" side={2} flatShading roughness={0.9} />
        </mesh>
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh
              key={`${sx}${sz}`}
              position={[sx * 0.52, -1.7, sz * 0.52]}
              rotation={[sz * 0.28, 0, -sx * 0.28]}
            >
              <cylinderGeometry args={[0.015, 0.015, 3.4, 4]} />
              <meshStandardMaterial color="#d8d4c8" />
            </mesh>
          ))
        )}
      </group>

      <group ref={hips} position={[0, HIP_Y, 0]}>
        {/* Belt and holster sit on the hips, so they don't swim with the torso */}
        <mesh castShadow position={[0, 0.03, 0]} material={mats.strap}>
          <boxGeometry args={[0.48, 0.1, 0.3]} />
        </mesh>
        <mesh position={[0, 0.03, 0.16]} material={mats.buckle}>
          <boxGeometry args={[0.09, 0.07, 0.03]} />
        </mesh>
        <mesh castShadow position={[0.26, -0.13, 0.03]} rotation={[0, 0, 0.1]} material={mats.pack}>
          <boxGeometry args={[0.09, 0.22, 0.13]} />
        </mesh>
        <mesh castShadow position={[-0.25, -0.1, -0.02]} material={mats.pack}>
          <boxGeometry args={[0.09, 0.16, 0.12]} />
        </mesh>

        {/* Legs hang from the hips. Each leg group is the hip joint; the knee
            group inside it is the knee. */}
        <group ref={legL} position={[-HALF_STANCE, 0, 0]}>
          <Leg mats={mats} knee={kneeL} />
        </group>
        <group ref={legR} position={[HALF_STANCE, 0, 0]}>
          <Leg mats={mats} knee={kneeR} />
        </group>

        <group ref={chest}>
          {/* Torso — narrower than the shoulder span, so the arms break the
              outline instead of disappearing into it. */}
          <mesh castShadow position={[0, 0.23, 0]} material={mats.fatigue}>
            <boxGeometry args={[0.42, 0.46, 0.26]} />
          </mesh>
          {/* Plate carrier */}
          <mesh castShadow position={[0, 0.25, 0.01]} material={mats.vest}>
            <boxGeometry args={[0.45, 0.38, 0.31]} />
          </mesh>
          {/* Shoulder straps running over the plate, with buckles */}
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[s * 0.15, 0.42, 0.02]} material={mats.strap}>
              <boxGeometry args={[0.1, 0.11, 0.34]} />
            </mesh>
          ))}
          <mesh position={[0, 0.25, 0.16]} material={mats.strap}>
            <boxGeometry args={[0.47, 0.06, 0.03]} />
          </mesh>
          {[-0.16, 0.16].map((x) => (
            <mesh key={x} position={[x, 0.36, 0.17]} material={mats.buckle}>
              <boxGeometry args={[0.06, 0.05, 0.03]} />
            </mesh>
          ))}
          {/* Mag pouches */}
          {[-0.12, 0.02, 0.16].map((x) => (
            <mesh key={x} castShadow position={[x, 0.14, 0.17]} material={mats.pack}>
              <boxGeometry args={[0.11, 0.15, 0.07]} />
            </mesh>
          ))}
          {/* Radio on the left shoulder */}
          <mesh castShadow position={[-0.25, 0.31, -0.04]} material={mats.polymer}>
            <boxGeometry args={[0.07, 0.15, 0.09]} />
          </mesh>
          {/* Shoulder patch */}
          <mesh position={[-0.24, 0.4, 0.02]} material={mats.accent}>
            <boxGeometry args={[0.03, 0.09, 0.11]} />
          </mesh>

          {/* Backpack — its own group so it can lag the torso. */}
          <group ref={pack} position={[0, 0.22, -0.14]}>
            <mesh castShadow position={[0, 0, -0.1]} material={mats.pack}>
              <boxGeometry args={[0.4, 0.46, 0.2]} />
            </mesh>
            <mesh castShadow position={[0, 0.08, -0.21]} material={mats.strap}>
              <boxGeometry args={[0.28, 0.15, 0.06]} />
            </mesh>
            <mesh position={[0, -0.13, -0.2]} material={mats.strap}>
              <boxGeometry args={[0.32, 0.07, 0.04]} />
            </mesh>
            {/* Bedroll lashed across the top */}
            <mesh castShadow position={[0, 0.22, -0.13]} rotation={[0, 0, Math.PI / 2]} material={mats.fatigueDark}>
              <cylinderGeometry args={[0.065, 0.065, 0.38, 7]} />
            </mesh>
          </group>

          {/* Arms. Shoulders sit outboard of the vest (0.33 against a 0.225
              half-width) so the limbs are visible from every angle. */}
          <group ref={armL} position={[-SHOULDER_X, SHOULDER_Y, 0]}>
            <Arm mats={mats} side={-1} elbow={elbowL} hand={handL} />
          </group>
          <group ref={armR} position={[SHOULDER_X, SHOULDER_Y, 0]}>
            <Arm mats={mats} side={1} elbow={elbowR} hand={handR}>
              {/* The weapon lives in the hand, so it tracks the arm through
                  every pose rather than floating beside the chest. */}
              <group position={WEAPON_IN_HAND.position} rotation={WEAPON_IN_HAND.rotation}>
                <Rifle mats={mats} />
              </group>
            </Arm>
          </group>

          {/* Neck, then the head */}
          <mesh position={[0, NECK_Y, -0.01]} material={mats.skinDark}>
            <boxGeometry args={[0.13, 0.1, 0.13]} />
          </mesh>

          <group ref={head} position={[0, HEAD_Y, 0]}>
            <mesh castShadow position={[0, 0.13, 0]} material={mats.skin}>
              <boxGeometry args={[0.22, 0.26, 0.23]} />
            </mesh>
            {/* Face. Small, but the difference between a person and a post. */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.055, 0.15, 0.117]} material={mats.eye}>
                <boxGeometry args={[0.045, 0.032, 0.01]} />
              </mesh>
            ))}
            <mesh position={[0, 0.115, 0.125]} material={mats.skinDark}>
              <boxGeometry args={[0.04, 0.05, 0.03]} />
            </mesh>
            <mesh position={[0, 0.06, 0.117]} material={mats.skinDark}>
              <boxGeometry args={[0.075, 0.018, 0.01]} />
            </mesh>
            {/* Stubble along the jaw */}
            <mesh position={[0, 0.035, 0.03]} material={mats.skinDark}>
              <boxGeometry args={[0.215, 0.05, 0.215]} />
            </mesh>
            {/* Helmet, sitting above the brow rather than over the eyes */}
            <mesh castShadow position={[0, 0.29, -0.01]} material={mats.helmet}>
              <boxGeometry args={[0.27, 0.16, 0.28]} />
            </mesh>
            <mesh position={[0, 0.235, 0.1]} material={mats.helmet}>
              <boxGeometry args={[0.26, 0.05, 0.11]} />
            </mesh>
            {/* Chin strap */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.115, 0.14, 0.01]} material={mats.strap}>
                <boxGeometry args={[0.025, 0.2, 0.03]} />
              </mesh>
            ))}
            {/* Goggles pushed up onto the helmet — they used to cover the face */}
            <mesh position={[0, 0.3, 0.09]} material={mats.glass}>
              <boxGeometry args={[0.28, 0.07, 0.14]} />
            </mesh>
            {/* Helmet rail + counterweight pouch */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.14, 0.29, 0]} material={mats.polymer}>
                <boxGeometry args={[0.02, 0.05, 0.24]} />
              </mesh>
            ))}
            <mesh castShadow position={[0, 0.28, -0.17]} material={mats.pack}>
              <boxGeometry args={[0.18, 0.12, 0.07]} />
            </mesh>
            {/* Antenna */}
            <mesh position={[0.11, 0.45, -0.11]} rotation={[0.18, 0, 0.12]}>
              <cylinderGeometry args={[0.008, 0.012, 0.32, 4]} />
              <meshStandardMaterial color="#20241c" />
            </mesh>
          </group>
        </group>
      </group>

      {/* Soft contact shadow / presence blob so the player never loses themself. */}
      <mesh ref={glow} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.62, 20]} />
        <meshBasicMaterial color="#f0a92e" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  )
}
