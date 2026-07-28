import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sky } from '@react-three/drei'
import type { DirectionalLight, PointLight } from 'three'
import { Vector3 } from 'three'
import { cameraOrbit, playerState } from '../../state/controls'

const SUN = new Vector3(-52, 46, -38)

/**
 * Late-afternoon island light: warm low sun, cool sky fill, heavy haze.
 * The shadow camera follows the player so a tight, high-resolution shadow
 * frustum covers wherever they actually are instead of the whole island.
 */
export function Lighting() {
  const sun = useRef<DirectionalLight>(null)
  const fill = useRef<PointLight>(null)

  useFrame(() => {
    // Track the player so a tight, high-resolution shadow frustum always
    // covers wherever they are, instead of stretching over the whole island.
    const l = sun.current
    if (l) {
      l.position.set(playerState.x + SUN.x, SUN.y, playerState.z + SUN.z)
      l.target.position.set(playerState.x, 0, playerState.z)
      l.target.updateMatrixWorld()
    }

    // Camera-side fill. The sun is low and behind the island, so without this
    // the character reads as a black silhouette whenever you're looking
    // roughly into the light. Sitting behind the camera means it always lifts
    // the side you can actually see.
    const f = fill.current
    if (f) {
      const cp = Math.cos(cameraOrbit.pitch)
      f.position.set(
        playerState.x + Math.sin(cameraOrbit.yaw) * cp * 4.5,
        playerState.y + 3.2,
        playerState.z + Math.cos(cameraOrbit.yaw) * cp * 4.5
      )
    }
  })

  return (
    <>
      <Sky
        distance={4000}
        sunPosition={[SUN.x, SUN.y, SUN.z]}
        inclination={0.49}
        azimuth={0.25}
        turbidity={7}
        rayleigh={1.4}
        mieCoefficient={0.006}
        mieDirectionalG={0.82}
      />

      <fogExp2 attach="fog" args={['#a9b6bd', 0.0085]} />

      <hemisphereLight args={['#c3daea', '#57603c', 1.0]} />
      <ambientLight intensity={0.4} color="#dfe6ea" />

      {/* Follows the camera side of the player — see useFrame above. */}
      <pointLight ref={fill} intensity={11} distance={11} decay={1.6} color="#ffeacd" />

      <directionalLight
        ref={sun}
        castShadow
        intensity={2.1}
        color="#ffe6bd"
        position={[SUN.x, SUN.y, SUN.z]}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={190}
        shadow-camera-left={-46}
        shadow-camera-right={46}
        shadow-camera-top={46}
        shadow-camera-bottom={-46}
        shadow-bias={-0.0006}
        shadow-normalBias={0.035}
      />

      {/* Cool rim from the opposite side so silhouettes read against the fog. */}
      <directionalLight intensity={0.42} color="#8fb4d8" position={[40, 22, 48]} />
    </>
  )
}
