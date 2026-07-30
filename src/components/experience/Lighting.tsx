import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Environment, Sky } from '@react-three/drei'
import type { DirectionalLight, PointLight } from 'three'
import { Vector3 } from 'three'
import { cameraOrbit, playerState } from '../../state/controls'

const SUN = new Vector3(-52, 46, -38)

/** Shared by the visible sky and the one baked into the environment map. */
const SKY = {
  distance: 4000,
  sunPosition: [SUN.x, SUN.y, SUN.z] as [number, number, number],
  inclination: 0.49,
  azimuth: 0.25,
  turbidity: 7,
  rayleigh: 1.4,
  mieCoefficient: 0.006,
  mieDirectionalG: 0.82,
}

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
      <Sky {...SKY} />

      {/* Image-based lighting, baked from the sky that's actually on screen.
          A downloaded HDRI would be a megabytes-sized fetch that has to
          succeed before the island looks right, and it would light the scene
          from a different sky than the one the player can see. Rendering the
          existing <Sky> to a small cubemap once costs nothing after frame one
          and gives every PBR material real sky ambient and reflections. */}
      {/* `far` matters: the portal's cube camera defaults to far = 1000 and the
          sky dome sits at 4000, so on the default it captures nothing and the
          environment map comes out black. */}
      {/* `environmentIntensity` is not optional here. The Preetham sky shader
          emits radiance well above 1, and the cube camera captures it raw —
          three skips tone mapping when rendering into a render target. At full
          strength that HDR sky floods every surface with uniform diffuse light
          and the island comes out milky with no shadow contrast. */}
      <Environment
        frames={1}
        resolution={128}
        background={false}
        far={9000}
        environmentIntensity={0.38}
      >
        <Sky {...SKY} />
      </Environment>

      {/* Density is tuned so the far shore fogs by about the same amount it
          used to on the small island: 0.0085 × 88 ÷ 280. At the old value you
          could not see across the enlarged island at all. */}
      <fogExp2 attach="fog" args={['#a9b6bd', 0.0027]} />

      {/* Trimmed hard from 1.0/0.4: the environment map now supplies the sky
          bounce these two were faking, and stacking all three flattens the
          scene. The sun goes up to buy the contrast back. */}
      <hemisphereLight args={['#c3daea', '#57603c', 0.38]} />
      <ambientLight intensity={0.1} color="#dfe6ea" />

      {/* Follows the camera side of the player — see useFrame above. */}
      <pointLight ref={fill} intensity={11} distance={11} decay={1.6} color="#ffeacd" />

      <directionalLight
        ref={sun}
        castShadow
        intensity={2.6}
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
