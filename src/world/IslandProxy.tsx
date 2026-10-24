import { useEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { houses } from '../data/portfolioData'
import { terrainHeight } from '../lib/terrain'
import { chunkKey, chunkOf } from './config'

// Aerial silhouettes are intentionally cheap: one foliage draw call and five
// building outlines. Detailed building interiors never mount in aerial mode.
const trees = Array.from({ length: 240 }, (_, i) => {
  const angle = i * 2.39996323
  const radius = 19 + Math.sqrt((i + 0.5) / 240) * 105
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius
  return { x, z, y: terrainHeight(x, z), chunk: chunkKey(chunkOf(x, z)) }
})

export function IslandProxy({ hidden, activeHouses, activeRange }: {
  hidden: Set<string>; activeHouses: Set<string>; activeRange: boolean
}) {
  const foliage = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useEffect(() => {
    const mesh = foliage.current
    if (!mesh) return
    trees.forEach((tree, i) => {
      dummy.position.set(tree.x, tree.y + 2.7, tree.z)
      dummy.rotation.y = i * 1.73
      dummy.scale.setScalar(hidden.has(tree.chunk) ? 0 : 1 + (i % 5) * 0.12)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [hidden, dummy])
  return <>
    <instancedMesh ref={foliage} args={[undefined, undefined, trees.length]} frustumCulled={false} castShadow={false}>
      <coneGeometry args={[1.5, 5.4, 4]} />
      <meshStandardMaterial color="#3c5532" roughness={1} flatShading />
    </instancedMesh>
    {houses.map((h) => {
      if (activeHouses.has(h.id)) return null
      return <group key={h.id} position={[h.position[0], terrainHeight(...h.position), h.position[1]]}
        rotation={[0, h.rotation, 0]}>
        <mesh position={[0, 3, 0]}><boxGeometry args={[12, 6, 11]} />
          <meshStandardMaterial color="#69675e" roughness={1} /></mesh>
        <mesh position={[0, 6.7, 0]}><coneGeometry args={[9, 2.2, 4]} />
          <meshStandardMaterial color={h.color} roughness={1} /></mesh>
      </group>
    })}
    {!hidden.has(chunkKey(chunkOf(-104, -84))) &&
      <group position={[-104, terrainHeight(-104, -84), -84]}>
        <mesh position={[0, 6, 0]}><cylinderGeometry args={[1.5, 2.2, 12, 4]} />
          <meshStandardMaterial color="#66543b" /></mesh>
        <mesh position={[0, 13, 0]}><coneGeometry args={[4.5, 2, 4]} />
          <meshStandardMaterial color="#46504a" /></mesh>
      </group>}
    {!hidden.has(chunkKey(chunkOf(96, 96))) &&
      <mesh position={[96, terrainHeight(96, 96) + 1.1, 96]}>
        <boxGeometry args={[5, 2.4, 3.4]} /><meshStandardMaterial color="#8a5a3c" />
      </mesh>}
    {!activeRange &&
      <mesh position={[92, terrainHeight(92, 18) + 0.1, 6]}>
        <boxGeometry args={[26, 0.2, 44]} /><meshStandardMaterial color="#827c6e" />
      </mesh>}
  </>
}
