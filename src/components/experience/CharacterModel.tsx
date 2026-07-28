import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import { MeshStandardMaterial } from 'three'
import { playerState } from '../../state/controls'
import { CHUTE_ALTITUDE } from '../../lib/constants'

/**
 * A hand-built low-poly operator. Deliberately not a downloaded rig — the
 * whole scene is procedural, so the character is boxes and a code-driven
 * gait rather than a Mixamo GLB. Keeps the silhouette consistent with the
 * island and the download at zero bytes.
 */

const useMats = () =>
  useMemo(() => {
    const mk = (color: string, roughness = 0.85, metalness = 0) =>
      new MeshStandardMaterial({ color, roughness, metalness, flatShading: true })
    // Pitched a couple of stops brighter than real fatigues would be: the sun
    // sits low and behind the island, so a realistic olive drab turns the
    // character into an unreadable silhouette from most camera angles.
    return {
      fatigue: mk('#7d8a5c'),
      fatigueDark: mk('#65714a'),
      vest: mk('#4a5240'),
      strap: mk('#2f342a'),
      boot: mk('#3a332c'),
      skin: mk('#c9976a'),
      helmet: mk('#5c6647'),
      pack: mk('#75694f'),
      accent: mk('#f0a92e', 0.5),
      glass: mk('#2c4450', 0.25, 0.7),
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
      <mesh castShadow position={[0, -0.6, 0]} material={mats.fatigueDark}>
        <boxGeometry args={[0.21, 0.36, 0.21]} />
      </mesh>
      <mesh castShadow position={[0, -0.82, 0.04]} material={mats.boot}>
        <boxGeometry args={[0.24, 0.14, 0.32]} />
      </mesh>
    </group>
  )
}

function Arm({ mats, side }: { mats: Mats; side: 1 | -1 }) {
  return (
    <group position={[0.34 * side, 0.02, 0]}>
      <mesh castShadow position={[0, -0.2, 0]} material={mats.fatigue}>
        <boxGeometry args={[0.17, 0.4, 0.19]} />
      </mesh>
      <mesh castShadow position={[0, -0.52, 0]} material={mats.fatigueDark}>
        <boxGeometry args={[0.15, 0.28, 0.16]} />
      </mesh>
      <mesh castShadow position={[0, -0.7, 0.01]} material={mats.skin}>
        <boxGeometry args={[0.15, 0.14, 0.17]} />
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
  const glow = useRef<Mesh>(null)

  const mats = useMats()
  const phase = useRef(0)

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05)
    const { speed, grounded, gait } = playerState

    // Gait cycle advances with actual speed so the feet never skate.
    const cadence = gait === 2 ? 2.05 : gait === 1 ? 2.35 : 0
    phase.current += dt * speed * cadence
    const t = phase.current

    const swing = gait === 2 ? 0.95 : gait === 1 ? 0.62 : 0
    const armSwing = gait === 2 ? 0.72 : gait === 1 ? 0.45 : 0

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
        const t = Math.min(1, (CHUTE_ALTITUDE - playerState.y) / 3)
        const s = 0.25 + 0.75 * (t * t * (3 - 2 * t))
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
      if (armL.current) {
        armL.current.rotation.x = -Math.sin(t) * armSwing
        armL.current.rotation.z = 0.09 + (gait ? 0.05 : 0)
      }
      if (armR.current) {
        armR.current.rotation.x = Math.sin(t) * armSwing
        armR.current.rotation.z = -0.09 - (gait ? 0.05 : 0)
      }
      if (chest.current) {
        // Lean into a sprint.
        chest.current.rotation.x = gait === 2 ? 0.19 : gait === 1 ? 0.07 : 0
        chest.current.rotation.y = Math.sin(t) * (gait ? 0.07 : 0)
      }
      if (hips.current) hips.current.rotation.y = -Math.sin(t) * (gait ? 0.09 : 0)
    }

    if (head.current) {
      head.current.rotation.x = gait === 2 ? -0.12 : 0
      head.current.rotation.y = gait ? 0 : Math.sin(performance.now() * 0.0007) * 0.16
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
          <mesh position={[0, 0.28, 0.19]} material={mats.strap}>
            <boxGeometry args={[0.58, 0.07, 0.03]} />
          </mesh>
          {/* Mag pouches */}
          {[-0.14, 0.02, 0.18].map((x) => (
            <mesh key={x} castShadow position={[x, 0.15, 0.2]} material={mats.pack}>
              <boxGeometry args={[0.12, 0.16, 0.07]} />
            </mesh>
          ))}
          {/* Shoulder patch */}
          <mesh position={[-0.29, 0.4, 0.02]} material={mats.accent}>
            <boxGeometry args={[0.03, 0.1, 0.12]} />
          </mesh>
          {/* Backpack */}
          <mesh castShadow position={[0, 0.24, -0.26]} material={mats.pack}>
            <boxGeometry args={[0.44, 0.5, 0.22]} />
          </mesh>
          <mesh position={[0, 0.1, -0.38]} material={mats.strap}>
            <boxGeometry args={[0.34, 0.08, 0.04]} />
          </mesh>

          <group ref={armL} position={[0, 0.44, 0]}>
            <Arm mats={mats} side={-1} />
          </group>
          <group ref={armR} position={[0, 0.44, 0]}>
            <Arm mats={mats} side={1} />
          </group>

          {/* Head */}
          <group ref={head} position={[0, 0.62, 0]}>
            <mesh castShadow position={[0, 0.11, 0]} material={mats.skin}>
              <boxGeometry args={[0.26, 0.28, 0.26]} />
            </mesh>
            {/* Helmet */}
            <mesh castShadow position={[0, 0.2, -0.01]} material={mats.helmet}>
              <boxGeometry args={[0.32, 0.2, 0.33]} />
            </mesh>
            <mesh position={[0, 0.13, 0.15]} material={mats.helmet}>
              <boxGeometry args={[0.3, 0.05, 0.09]} />
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
