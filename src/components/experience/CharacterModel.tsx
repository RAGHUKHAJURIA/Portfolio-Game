import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { MeshStandardMaterial, Vector2 } from 'three'
import { playerState } from '../../state/controls'
import { CHUTE_ALTITUDE } from '../../lib/constants'
import { tiled } from '../../lib/textures'

/**
 * A hand-built low-poly operator. Deliberately not a downloaded rig — the
 * whole scene is procedural, so the character is boxes and a code-driven
 * gait rather than a Mixamo GLB. Keeps the silhouette consistent with the
 * island and the download at zero bytes.
 *
 * On animation blending: the brief asks for crossfades rather than hard cuts,
 * via drei's mixer. There are no clips to mix — the pose is computed, not
 * sampled — so the equivalent is done directly: every pose parameter (stride,
 * arm swing, lean, aim) is critically damped toward its target instead of
 * being switched, which is what a crossfade is actually for. Reaching for
 * `useAnimations` would mean shipping a rigged GLB and giving up the
 * zero-asset property for no visible gain.
 */

/** Frame-rate independent approach. */
const damp = (cur: number, target: number, dt: number, rate: number) =>
  cur + (target - cur) * (1 - Math.exp(-dt * rate))

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
      helmet: mk('#5c6647', 0.7, 0.1, 0.7),
      pack: mk('#75694f', 0.95, 0, 1.5),
      accent: mk('#f0a92e', 0.5, 0, 0.3),
      glass: mk('#2c4450', 0.2, 0.7, 0),
      // Buckles, clips and weapon furniture — the only genuinely metal bits.
      buckle: mk('#8d8b84', 0.35, 0.85, 0.3),
      gunmetal: mk('#33383a', 0.45, 0.7, 0.4),
      polymer: mk('#2b2f2c', 0.8, 0, 0.6),
    }
  }, [])

type Mats = ReturnType<typeof useMats>

function Leg({ mats, side }: { mats: Mats; side: 1 | -1 }) {
  return (
    <group position={[0.17 * side, 0, 0]}>
      {/* thigh + shin as one tapered stack */}
      <mesh castShadow position={[0, -0.22, 0]} material={mats.fatigue}>
        <boxGeometry args={[0.24, 0.46, 0.24]} />
      </mesh>
      {/* Knee pad — reads at silhouette distance and breaks the straight leg. */}
      <mesh castShadow position={[0, -0.42, 0.11]} material={mats.vest}>
        <boxGeometry args={[0.22, 0.16, 0.08]} />
      </mesh>
      <mesh castShadow position={[0, -0.6, 0]} material={mats.fatigueDark}>
        <boxGeometry args={[0.21, 0.36, 0.21]} />
      </mesh>
      {/* Boot: upper, then a sole that sits proud so the foot doesn't taper
          into the ground. */}
      <mesh castShadow position={[0, -0.81, 0.04]} material={mats.boot}>
        <boxGeometry args={[0.24, 0.13, 0.32]} />
      </mesh>
      <mesh castShadow position={[0, -0.89, 0.05]} material={mats.polymer}>
        <boxGeometry args={[0.26, 0.05, 0.35]} />
      </mesh>
      {/* Laces */}
      <mesh position={[0, -0.78, 0.2]} material={mats.strap}>
        <boxGeometry args={[0.2, 0.09, 0.02]} />
      </mesh>
    </group>
  )
}

function Arm({ mats, side }: { mats: Mats; side: 1 | -1 }) {
  return (
    <group position={[0.34 * side, 0.02, 0]}>
      {/* Shoulder cap, so the join doesn't read as a gap when the arm swings */}
      <mesh castShadow position={[0, 0.01, 0]} material={mats.vest}>
        <boxGeometry args={[0.2, 0.16, 0.22]} />
      </mesh>
      <mesh castShadow position={[0, -0.2, 0]} material={mats.fatigue}>
        <boxGeometry args={[0.17, 0.4, 0.19]} />
      </mesh>
      {/* Elbow pad */}
      <mesh castShadow position={[0, -0.38, 0.07]} material={mats.vest}>
        <boxGeometry args={[0.16, 0.13, 0.07]} />
      </mesh>
      <mesh castShadow position={[0, -0.52, 0]} material={mats.fatigueDark}>
        <boxGeometry args={[0.15, 0.28, 0.16]} />
      </mesh>
      {/* Glove rather than bare hand — darker, so it reads against the rifle */}
      <mesh castShadow position={[0, -0.7, 0.01]} material={mats.boot}>
        <boxGeometry args={[0.15, 0.14, 0.17]} />
      </mesh>
    </group>
  )
}

/**
 * Carried weapon.
 *
 * Deliberately a generic blocky carbine — receiver, handguard, tube barrel,
 * box magazine, stock, and a slab optic. It is not modelled on, and is not
 * meant to resemble, any specific real firearm; a recognisable one would mean
 * replicating a trademarked design for no gain at this poly count.
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
      {/* Grip */}
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

export function CharacterModel({ dropping }: { dropping: boolean }) {
  const root = useRef<Group>(null)
  const hips = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const head = useRef<Group>(null)
  const legL = useRef<Group>(null)
  const legR = useRef<Group>(null)
  const armL = useRef<Group>(null)
  const armR = useRef<Group>(null)
  const chute = useRef<Group>(null)
  const pack = useRef<Group>(null)
  const weapon = useRef<Group>(null)
  const glow = useRef<Mesh>(null)

  const mats = useMats()
  const phase = useRef(0)

  // Damped pose parameters. These are the crossfade: nothing here ever jumps
  // when the gait changes, it eases.
  const swingRef = useRef(0)
  const armSwingRef = useRef(0)
  const leanRef = useRef(0)
  const aimRef = useRef(0)

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
      if (hips.current) hips.current.rotation.x = deployed ? -0.06 : -0.4
      if (chest.current) chest.current.rotation.x = (deployed ? 0.04 : 0.24) + flutter * 0.3
      if (legL.current) legL.current.rotation.set(deployed ? 0.12 : 0.6 + flutter, 0, 0.16)
      if (legR.current) legR.current.rotation.set(deployed ? 0.12 : 0.6 - flutter, 0, -0.16)
      if (armL.current) armL.current.rotation.set(deployed ? -2.5 : -1.9, 0, (deployed ? 0.5 : 0.8) + flutter)
      if (armR.current) armR.current.rotation.set(deployed ? -2.5 : -1.9, 0, (deployed ? -0.5 : -0.8) - flutter)
      if (head.current) head.current.rotation.x = deployed ? -0.05 : -0.35
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

    if (!grounded) {
      // Airborne: tuck.
      if (legL.current) legL.current.rotation.x = 0.5
      if (legR.current) legR.current.rotation.x = -0.25
      if (armL.current) armL.current.rotation.set(-0.9, 0, 0.28)
      if (armR.current) armR.current.rotation.set(-0.9, 0, -0.28)
      if (chest.current) chest.current.rotation.x = 0.1
      if (hips.current) hips.current.rotation.x = 0
    } else {
      if (legL.current) legL.current.rotation.x = Math.sin(t) * swing
      if (legR.current) legR.current.rotation.x = -Math.sin(t) * swing
      // Lowered arms swing with the gait; shouldered arms hold the weapon.
      if (armL.current) {
        armL.current.rotation.x = -Math.sin(t) * armSwing + aim * -1.36
        armL.current.rotation.z = 0.09 + (gait ? 0.05 : 0) + aim * 0.42
        armL.current.rotation.y = aim * 0.3
      }
      if (armR.current) {
        armR.current.rotation.x = Math.sin(t) * armSwing + aim * -1.42
        armR.current.rotation.z = -0.09 - (gait ? 0.05 : 0) - aim * 0.12
        armR.current.rotation.y = aim * -0.16
      }
      if (chest.current) {
        // Lean into a sprint; square up to the target when aiming.
        chest.current.rotation.x = leanRef.current * (1 - aim * 0.6)
        chest.current.rotation.y = Math.sin(t) * (gait ? 0.07 : 0) * (1 - aim)
      }
      if (hips.current) hips.current.rotation.y = -Math.sin(t) * (gait ? 0.09 : 0) * (1 - aim * 0.7)
    }

    if (head.current) {
      head.current.rotation.x = (gait === 2 ? -0.12 : 0) + aim * 0.1
      head.current.rotation.y = gait && !aim ? 0 : Math.sin(performance.now() * 0.0007) * 0.16 * (1 - aim)
    }

    // The weapon rides between a lowered carry and the shoulder.
    if (weapon.current) {
      weapon.current.position.set(
        0.16 - aim * 0.13,
        0.02 + aim * 0.42,
        0.16 + aim * 0.12
      )
      weapon.current.rotation.set(
        0.42 - aim * 0.42,
        -0.5 + aim * 0.5,
        0.22 - aim * 0.22
      )
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

      <group ref={hips} position={[0, 0.86, 0]}>
        {/* Belt and holster sit on the hips, so they don't swim with the torso */}
        <mesh castShadow position={[0, 0.02, 0]} material={mats.strap}>
          <boxGeometry args={[0.56, 0.09, 0.34]} />
        </mesh>
        <mesh position={[0, 0.02, 0.18]} material={mats.buckle}>
          <boxGeometry args={[0.09, 0.07, 0.03]} />
        </mesh>
        <mesh castShadow position={[0.29, -0.13, 0.03]} rotation={[0, 0, 0.1]} material={mats.pack}>
          <boxGeometry args={[0.1, 0.22, 0.13]} />
        </mesh>
        <mesh castShadow position={[-0.28, -0.1, -0.02]} material={mats.pack}>
          <boxGeometry args={[0.09, 0.16, 0.12]} />
        </mesh>

        {/* Legs hang from the hips. */}
        <group ref={legL}>
          <Leg mats={mats} side={-1} />
        </group>
        <group ref={legR}>
          <Leg mats={mats} side={1} />
        </group>

        <group ref={chest}>
          {/* Torso */}
          <mesh castShadow position={[0, 0.26, 0]} material={mats.fatigue}>
            <boxGeometry args={[0.52, 0.56, 0.3]} />
          </mesh>
          {/* Plate carrier */}
          <mesh castShadow position={[0, 0.28, 0.01]} material={mats.vest}>
            <boxGeometry args={[0.56, 0.44, 0.36]} />
          </mesh>
          {/* Shoulder straps running over the plate, with buckles */}
          {[-1, 1].map((s) => (
            <mesh key={s} castShadow position={[s * 0.19, 0.46, 0.03]} material={mats.strap}>
              <boxGeometry args={[0.11, 0.12, 0.4]} />
            </mesh>
          ))}
          <mesh position={[0, 0.28, 0.19]} material={mats.strap}>
            <boxGeometry args={[0.58, 0.07, 0.03]} />
          </mesh>
          {[-0.2, 0.2].map((x) => (
            <mesh key={x} position={[x, 0.4, 0.2]} material={mats.buckle}>
              <boxGeometry args={[0.06, 0.05, 0.03]} />
            </mesh>
          ))}
          {/* Mag pouches */}
          {[-0.14, 0.02, 0.18].map((x) => (
            <mesh key={x} castShadow position={[x, 0.15, 0.2]} material={mats.pack}>
              <boxGeometry args={[0.12, 0.16, 0.07]} />
            </mesh>
          ))}
          {/* Radio on the left shoulder, antenna included */}
          <mesh castShadow position={[-0.3, 0.34, -0.04]} material={mats.polymer}>
            <boxGeometry args={[0.07, 0.16, 0.09]} />
          </mesh>
          {/* Shoulder patch */}
          <mesh position={[-0.29, 0.44, 0.02]} material={mats.accent}>
            <boxGeometry args={[0.03, 0.1, 0.12]} />
          </mesh>
          {/* Backpack — its own group so it can lag the torso. */}
          <group ref={pack} position={[0, 0.24, -0.16]}>
            <mesh castShadow position={[0, 0, -0.1]} material={mats.pack}>
              <boxGeometry args={[0.44, 0.5, 0.22]} />
            </mesh>
            <mesh castShadow position={[0, 0.08, -0.23]} material={mats.strap}>
              <boxGeometry args={[0.3, 0.16, 0.06]} />
            </mesh>
            <mesh position={[0, -0.14, -0.22]} material={mats.strap}>
              <boxGeometry args={[0.34, 0.08, 0.04]} />
            </mesh>
            {/* Bedroll lashed across the top */}
            <mesh castShadow position={[0, 0.24, -0.14]} rotation={[0, 0, Math.PI / 2]} material={mats.fatigueDark}>
              <cylinderGeometry args={[0.07, 0.07, 0.42, 7]} />
            </mesh>
          </group>

          <group ref={armL} position={[0, 0.44, 0]}>
            <Arm mats={mats} side={-1} />
          </group>
          <group ref={armR} position={[0, 0.44, 0]}>
            <Arm mats={mats} side={1} />
          </group>

          {/* Weapon. Parented to the chest so it tracks the torso, and moved
              between carry and shoulder in the frame loop. */}
          <group ref={weapon} position={[0.16, 0.02, 0.16]}>
            <Rifle mats={mats} />
          </group>

          {/* Head */}
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh castShadow position={[0, 0.11, 0]} material={mats.skin}>
              <boxGeometry args={[0.26, 0.28, 0.26]} />
            </mesh>
            {/* Collar, so the head doesn't float on the torso */}
            <mesh position={[0, -0.02, 0]} material={mats.fatigueDark}>
              <boxGeometry args={[0.3, 0.1, 0.28]} />
            </mesh>
            {/* Helmet */}
            <mesh castShadow position={[0, 0.2, -0.01]} material={mats.helmet}>
              <boxGeometry args={[0.32, 0.2, 0.33]} />
            </mesh>
            <mesh position={[0, 0.13, 0.15]} material={mats.helmet}>
              <boxGeometry args={[0.3, 0.05, 0.09]} />
            </mesh>
            {/* Chin strap */}
            <mesh position={[0, 0.06, 0.01]} material={mats.strap}>
              <boxGeometry args={[0.34, 0.04, 0.3]} />
            </mesh>
            {/* Helmet rail + counterweight pouch */}
            {[-1, 1].map((s) => (
              <mesh key={s} position={[s * 0.165, 0.21, 0]} material={mats.polymer}>
                <boxGeometry args={[0.02, 0.05, 0.26]} />
              </mesh>
            ))}
            <mesh castShadow position={[0, 0.19, -0.19]} material={mats.pack}>
              <boxGeometry args={[0.2, 0.13, 0.07]} />
            </mesh>
            {/* Goggles */}
            <mesh position={[0, 0.24, 0.06]} material={mats.glass}>
              <boxGeometry args={[0.33, 0.08, 0.28]} />
            </mesh>
            {/* Antenna */}
            <mesh position={[0.13, 0.36, -0.12]} rotation={[0.18, 0, 0.12]}>
              <cylinderGeometry args={[0.008, 0.012, 0.34, 4]} />
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
