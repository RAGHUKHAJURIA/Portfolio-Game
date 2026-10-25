import { Component, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { AnimationMixer, Box3, LoopOnce, LoopRepeat, Vector3 } from 'three'
import type { AnimationAction } from 'three'
import type { ErrorInfo } from 'react'
import type { Group } from 'three'
import { CHUTE_ALTITUDE } from '../../lib/constants'
import { playerState } from '../../state/controls'

const PLAYER_MODEL_URL = '/models/player/blood_raven_x_suit/walk.glb'
const PLAYER_HEIGHT = 1.85

// Blender +Y forward exports to glTF -Z. The controller's heading zero is +Z.
const MODEL_YAW_OFFSET = Math.PI

// Start fetching while the existing loading screen is visible. useGLTF and
// useGLTF.preload share drei's useLoader cache, so this does not fetch twice.
useGLTF.preload(PLAYER_MODEL_URL)

type Calibration = { scale: number; yOffset: number }

function ImportedPlayer({ dropping }: { dropping: boolean }) {
  const { scene, animations } = useGLTF(PLAYER_MODEL_URL)
  const mixer = useMemo(() => new AnimationMixer(scene), [scene])
  const actions = useMemo(() => Object.fromEntries(
    animations.map((clip) => [clip.name, mixer.clipAction(clip)]),
  ), [animations, mixer])
  const activeState = useRef<string | null>(null)
  const activeAction = useRef<AnimationAction | null>(null)
  const lastDistance = useRef(playerState.distanceTravelled)
  const walkLoops = useRef(0)
  const strides = useMemo(() => {
    const data = scene.getObjectByName('BloodRaven_Rig')?.userData
    return { walk: Number(data?.walkStride) || 1.55, run: Number(data?.runStride) || 3.2 }
  }, [scene])

  useEffect(() => {
    const onLoop = (event: { action: AnimationAction }) => {
      if (event.action === actions.Walk) walkLoops.current++
    }
    mixer.addEventListener('loop', onLoop)
    const debugWindow = window as typeof window & { __characterAnimation?: () => unknown }
    if (new URLSearchParams(location.search).has('debug')) {
      debugWindow.__characterAnimation = () => ({
        state: activeState.current, mixerTime: mixer.time,
        actionTime: activeAction.current?.time, walkLoops: walkLoops.current,
        speed: playerState.speed, grounded: playerState.grounded,
        distance: playerState.distanceTravelled,
        clips: animations.map((clip) => ({ name: clip.name, duration: clip.duration })),
      })
    }
    return () => {
      delete debugWindow.__characterAnimation
      mixer.removeEventListener('loop', onLoop)
      mixer.stopAllAction()
      mixer.uncacheRoot(scene)
      activeState.current = null
      activeAction.current = null
    }
  }, [actions, animations, mixer, scene])

  const calibration = useMemo<Calibration>(() => {
    // Keep the cached GLTF skeleton, materials, and textures; visit meshes once.
    scene.updateMatrixWorld(true)
    scene.traverse((object) => {
      if ('isMesh' in object && object.isMesh) {
        object.castShadow = true
        object.receiveShadow = true
        // Skinned bounds change with the pose; never cull a moving limb using
        // the static bind-pose bounding volume.
        if ('isSkinnedMesh' in object && object.isSkinnedMesh) object.frustumCulled = false
      }
    })

    const bounds = new Box3().setFromObject(scene)
    const size = bounds.getSize(new Vector3())
    const scale = PLAYER_HEIGHT / Math.max(size.y, 0.001)
    return { scale, yOffset: -bounds.min.y * scale }
  }, [scene])

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 0.1)
    const distance = Math.max(0, playerState.distanceTravelled - lastDistance.current)
    lastDistance.current = playerState.distanceTravelled
    let state: string
    if (dropping) {
      state = playerState.y < CHUTE_ALTITUDE ? 'Parachute' : 'Freefall'
    } else if (!playerState.grounded) {
      state = playerState.verticalVelocity > 0.45 ? 'Jump' : 'Fall'
    } else if (performance.now() - playerState.landedAt < 420 && playerState.landedAt > 0) {
      state = 'Land'
    } else {
      state = playerState.speed > 0.35
        ? (playerState.gait === 2 ? 'Run' : 'Walk')
        : 'Idle'
    }

    const next = actions[state]
    if (!next) return
    if (activeState.current !== state) {
      const looping = state !== 'Jump' && state !== 'Land'
      next.reset()
      next.enabled = true
      next.setLoop(looping ? LoopRepeat : LoopOnce, looping ? Infinity : 1)
      next.clampWhenFinished = !looping
      next.setEffectiveWeight(1)
      next.setEffectiveTimeScale(1)
      next.fadeIn(0.25).play()
      activeAction.current?.fadeOut(0.25)
      activeAction.current = next
      activeState.current = state
    }

    // Advance one cycle per stride actually travelled. Using distance rather
    // than requested velocity also handles blocked movement and clamped physics
    // timesteps on slow frames without speeding the legs past the controller.
    if (state === 'Walk' || state === 'Run') {
      const stride = state === 'Walk' ? strides.walk : strides.run
      next.setEffectiveTimeScale(delta > 0 ? distance * next.getClip().duration / (stride * delta) : 0)
    }
    // This is the ONLY mixer update. Bones are exclusively owned by the clips.
    mixer.update(delta)
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
