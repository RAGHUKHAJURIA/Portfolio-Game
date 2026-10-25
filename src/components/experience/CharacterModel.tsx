import { Component, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { Bone, Box3, LoopOnce, LoopRepeat, Vector3 } from 'three'
import type { AnimationAction } from 'three'
import type { ErrorInfo } from 'react'
import type { Group } from 'three'
import { CHUTE_ALTITUDE } from '../../lib/constants'
import { playerState } from '../../state/controls'

const PLAYER_MODEL_URL = '/models/player/blood_raven_x_suit/scene_rigged.glb'
const PLAYER_HEIGHT = 1.85

// This fixed correction is isolated from the runtime yaw controlled by Character.tsx.
const MODEL_YAW_OFFSET = Math.PI

// Start fetching while the existing loading screen is visible. useGLTF and
// useGLTF.preload share drei's useLoader cache, so this does not fetch twice.
useGLTF.preload(PLAYER_MODEL_URL)

type Calibration = { scale: number; yOffset: number }
type BonePose = { bone: Bone; x: number; y: number; z: number }

function resolveBone(scene: Group, name: string): BonePose | undefined {
  const bone = scene.getObjectByName(name)
  if (!(bone instanceof Bone)) return undefined
  return { bone, x: bone.rotation.x, y: bone.rotation.y, z: bone.rotation.z }
}

function ImportedPlayer({ dropping }: { dropping: boolean }) {
  const { scene, animations } = useGLTF(PLAYER_MODEL_URL)
  const { actions } = useAnimations(animations, scene)
  const activeState = useRef<string | null>(null)
  const activeAction = useRef<AnimationAction | null>(null)
  const gaitPhase = useRef(0)
  const gaitWeight = useRef(0)
  const rig = useMemo(() => ({
    leftThigh: resolveBone(scene, 'LeftUpperLeg'),
    rightThigh: resolveBone(scene, 'RightUpperLeg'),
    leftKnee: resolveBone(scene, 'LeftLowerLeg'),
    rightKnee: resolveBone(scene, 'RightLowerLeg'),
    leftFoot: resolveBone(scene, 'LeftFoot'),
    rightFoot: resolveBone(scene, 'RightFoot'),
    leftArm: resolveBone(scene, 'LeftUpperArm'),
    rightArm: resolveBone(scene, 'RightUpperArm'),
    leftElbow: resolveBone(scene, 'LeftLowerArm'),
    rightElbow: resolveBone(scene, 'RightLowerArm'),
  }), [scene])

  const calibration = useMemo<Calibration>(() => {
    // Keep the cached GLTF skeleton, materials, and textures; visit meshes once.
    scene.updateMatrixWorld(true)
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        object.castShadow = true
        object.receiveShadow = true
      }
    })

    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const scale = PLAYER_HEIGHT / Math.max(size.y, 0.001)
    return { scale, yOffset: -bounds.min.y * scale }
  }, [scene])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05)
    let state: string
    if (dropping) {
      state = playerState.y < CHUTE_ALTITUDE ? 'Parachute' : 'Freefall'
    } else if (!playerState.grounded) {
      state = playerState.verticalVelocity > 0.45 ? 'Jump' : 'Fall'
    } else if (performance.now() - playerState.landedAt < 420 && playerState.landedAt > 0) {
      state = 'Land'
    } else {
      // Grounded locomotion is posed below from the controller's actual
      // displacement. The Idle clip supplies the neutral pose and breathing.
      state = 'Idle'
    }

    const next = actions[state]
    if (!next) return
    if (activeState.current !== state) {
      const looping = ['Idle', 'Fall', 'Freefall', 'Parachute'].includes(state)
      next.reset()
      next.enabled = true
      next.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1)
      next.clampWhenFinished = !looping
      next.setEffectiveWeight(1)
      next.setEffectiveTimeScale(1)
      next.fadeIn(0.18).play()
      activeAction.current?.fadeOut(0.18)
      activeAction.current = next
      activeState.current = state
    }

    const movingOnGround = !dropping && state === 'Idle' && playerState.grounded && playerState.speed > 0.35
    const targetWeight = movingOnGround ? 1 : 0
    gaitWeight.current += (targetWeight - gaitWeight.current) * (1 - Math.exp(-10 * delta))

    if (movingOnGround) {
      // A full cycle advances by distance traveled, not wall-clock time. This
      // keeps feet synchronized when the controller accelerates or hits an obstacle.
      const running = playerState.gait === 2
      const strideLength = running ? 3.2 : 2.2
      gaitPhase.current = (gaitPhase.current + playerState.speed * delta * Math.PI * 2 / strideLength) % (Math.PI * 2)
    }

    const phase = gaitPhase.current
    const swing = Math.sin(phase) * (playerState.gait === 2 ? 0.78 : 0.48) * gaitWeight.current
    const kneeLeft = Math.max(0, Math.sin(phase)) * (playerState.gait === 2 ? 0.72 : 0.42) * gaitWeight.current
    const kneeRight = Math.max(0, -Math.sin(phase)) * (playerState.gait === 2 ? 0.72 : 0.42) * gaitWeight.current
    const armSwing = swing * (playerState.gait === 2 ? 0.72 : 0.62)

    rig.leftThigh?.bone.rotation.set(rig.leftThigh.x + swing, rig.leftThigh.y, rig.leftThigh.z)
    rig.rightThigh?.bone.rotation.set(rig.rightThigh.x - swing, rig.rightThigh.y, rig.rightThigh.z)
    rig.leftKnee?.bone.rotation.set(rig.leftKnee.x - kneeLeft, rig.leftKnee.y, rig.leftKnee.z)
    rig.rightKnee?.bone.rotation.set(rig.rightKnee.x + kneeRight, rig.rightKnee.y, rig.rightKnee.z)
    rig.leftFoot?.bone.rotation.set(rig.leftFoot.x + kneeLeft * 0.25, rig.leftFoot.y, rig.leftFoot.z)
    rig.rightFoot?.bone.rotation.set(rig.rightFoot.x - kneeRight * 0.25, rig.rightFoot.y, rig.rightFoot.z)
    rig.leftArm?.bone.rotation.set(rig.leftArm.x - armSwing, rig.leftArm.y, rig.leftArm.z)
    rig.rightArm?.bone.rotation.set(rig.rightArm.x + armSwing, rig.rightArm.y, rig.rightArm.z)
    rig.leftElbow?.bone.rotation.set(rig.leftElbow.x - kneeLeft * 0.25, rig.leftElbow.y, rig.leftElbow.z)
    rig.rightElbow?.bone.rotation.set(rig.rightElbow.x - kneeRight * 0.25, rig.rightElbow.y, rig.rightElbow.z)
  })

  return (
    <group name="PlayerModelCorrectionRoot" rotation={[0, MODEL_YAW_OFFSET, 0]}>
      <group name="BloodRavenVisual" scale={calibration.scale}
        position={[0, calibration.yOffset, 0]}>
        <primitive object={scene} dispose={null} />
      </group>
    </group>
  )
}

class PlayerModelErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    console.error(`Failed to load player model: ${PLAYER_MODEL_URL}`, error)
  }

  render() {
    if (this.state.failed) {
      // Keep the capsule visually represented if the optional GLTF fails; the
      // Rapier body and all player controls continue to work.
      return (
        <mesh name="PlayerModelFallback" position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.32, 1.15, 4, 8]} />
          <meshStandardMaterial color="#f0a92e" roughness={0.8} />
        </mesh>
      )
    }
    return this.props.children
  }
}

function Parachute({ dropping }: { dropping: boolean }) {
  const canopy = useRef<Group>(null)

  useFrame(() => {
    const group = canopy.current
    if (!group) return
    const deployed = dropping && playerState.y < CHUTE_ALTITUDE
    group.visible = deployed
    if (!deployed) return

    const t = Math.min(1, (CHUTE_ALTITUDE - playerState.y) / 3)
    const eased = t * t * (3 - 2 * t)
    group.scale.setScalar(0.25 + 0.75 * eased)
    group.rotation.z = Math.sin(performance.now() * 0.0022) * 0.07
    group.rotation.x = Math.cos(performance.now() * 0.0019) * 0.05
  })

  return (
    <group ref={canopy} name="PlayerParachute" visible={false} position={[0, 4.6, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[1.35, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#e8623c" side={2} flatShading roughness={0.9} />
      </mesh>
      <mesh position={[0, -0.03, 0]}>
        <sphereGeometry args={[1.22, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#f2f2ef" side={2} flatShading roughness={0.9} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => (
        <mesh
          key={`${sx}${sz}`}
          position={[sx * 0.52, -1.7, sz * 0.52]}
          rotation={[sz * 0.28, 0, -sx * 0.28]}
        >
          <cylinderGeometry args={[0.015, 0.015, 3.4, 4]} />
          <meshStandardMaterial color="#d8d4c8" />
        </mesh>
      )))}
    </group>
  )
}

/** Visual-only model. Character.tsx retains the Rapier capsule and yaw root. */
export function CharacterModel({ dropping }: { dropping: boolean }) {
  return (
    <>
      <PlayerModelErrorBoundary>
        <ImportedPlayer dropping={dropping} />
      </PlayerModelErrorBoundary>
      <Parachute dropping={dropping} />
    </>
  )
}
