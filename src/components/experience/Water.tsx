import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { BufferAttribute } from 'three'
import { PlaneGeometry } from 'three'
import { ISLAND } from '../../data/portfolioData'

/** Wide enough that the far edge is always buried in fog. */
const SIZE = 520
const SEG = 46

/**
 * Cheap animated ocean: a few sine terms on a low-res plane.
 *
 * Two deliberate optimisations: the material is flat-shaded, so normals come
 * from screen-space derivatives and there is no need to recompute the normal
 * attribute after moving vertices; and it's opaque, so this full-screen
 * surface costs no blending and can write depth.
 */
export function Water() {
  const geometry = useMemo(() => {
    const g = new PlaneGeometry(SIZE, SIZE, SEG, SEG)
    g.rotateX(-Math.PI / 2)
    return g
  }, [])

  const base = useMemo(() => {
    const pos = geometry.attributes.position as BufferAttribute
    const x = new Float32Array(pos.count)
    const z = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      x[i] = pos.getX(i)
      z[i] = pos.getZ(i)
    }
    return { x, z }
  }, [geometry])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const pos = geometry.attributes.position as BufferAttribute
    const arr = pos.array as Float32Array
    for (let i = 0; i < pos.count; i++) {
      const x = base.x[i]
      const z = base.z[i]
      arr[i * 3 + 1] =
        Math.sin(x * 0.06 + t * 0.7) * 0.28 +
        Math.sin(z * 0.083 - t * 0.55) * 0.22 +
        Math.sin((x + z) * 0.031 + t * 0.35) * 0.3
    }
    pos.needsUpdate = true
  })

  return (
    <mesh geometry={geometry} position={[0, ISLAND.seaLevel, 0]}>
      <meshStandardMaterial
        color="#2c5a6b"
        roughness={0.18}
        metalness={0.4}
        flatShading
      />
    </mesh>
  )
}
