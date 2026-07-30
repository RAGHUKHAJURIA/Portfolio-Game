import { useMemo } from 'react'
import { BufferAttribute, PlaneGeometry, Vector2 } from 'three'
import { RigidBody } from '@react-three/rapier'
import { ISLAND } from '../../data/portfolioData'
import { groundColor, terrainHeight } from '../../lib/terrain'
import { tiled } from '../../lib/textures'

/**
 * 128 segments over the 372-unit mesh puts a vertex every ~2.9 units and makes
 * a ~33k-triangle trimesh collider. Keeping the old ~1.7-unit spacing at this
 * size would have been 93k triangles, all of which Rapier has to build a BVH
 * over at load; chunkier facets also suit the low-poly look.
 */
const SEGMENTS = 128
const SIZE = ISLAND.half * 2
/** Gentle — the terrain silhouette is the art, this is just grain on top. */
const NORMAL_SCALE = new Vector2(0.55, 0.55)

/**
 * The island ground. One geometry serves both rendering and physics — the
 * trimesh collider is generated from the exact mesh the player can see, so
 * what looks walkable is walkable.
 */
export function Terrain() {
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(SIZE, SIZE, SEGMENTS, SEGMENTS)
    geo.rotateX(-Math.PI / 2)

    const pos = geo.attributes.position as BufferAttribute
    const count = pos.count
    const colors = new Float32Array(count * 3)

    // Displace.
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)
      pos.setY(i, terrainHeight(x, z))
    }

    // Colour, using a finite-difference slope so cliffs turn rocky.
    const eps = 1.2
    for (let i = 0; i < count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z = pos.getZ(i)
      const dx = (terrainHeight(x + eps, z) - terrainHeight(x - eps, z)) / (2 * eps)
      const dz = (terrainHeight(x, z + eps) - terrainHeight(x, z - eps)) / (2 * eps)
      const slope = Math.min(1, Math.hypot(dx, dz))
      const c = groundColor(x, z, y, slope)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }

    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [])

  // 72 segments over 124 units puts a vertex every 1.7m, so the ground is
  // otherwise one enormous untextured facet per step. A high tile count of the
  // shared detail normal gives it grain without another geometry pass.
  const detail = useMemo(() => tiled('normal', 52), [])

  return (
    <RigidBody type="fixed" colliders="trimesh" friction={1}>
      <mesh geometry={geometry} receiveShadow castShadow>
        <meshStandardMaterial
          vertexColors
          flatShading
          roughness={0.95}
          metalness={0}
          dithering
          normalMap={detail}
          normalScale={NORMAL_SCALE}
        />
      </mesh>
    </RigidBody>
  )
}
