import { useEffect, useMemo } from 'react'
import { BufferAttribute, PlaneGeometry, Vector2 } from 'three'
import { RigidBody } from '@react-three/rapier'
import { groundColor, terrainHeight } from '../../lib/terrain'
import { tiled } from '../../lib/textures'
import { CHUNK_SIZE, MIN_CHUNK, MAX_CHUNK, STREAMING, chunkKey, type ChunkCoord } from '../../world/config'

const NORMAL_SCALE = new Vector2(0.55, 0.55)

function TerrainMesh({ coord, proxy }: { coord: ChunkCoord; proxy: boolean }) {
  const size = CHUNK_SIZE
  const segments = proxy ? STREAMING.lowTerrainSegments : STREAMING.highTerrainSegments
  const cx = (coord.x + 0.5) * CHUNK_SIZE
  const cz = (coord.z + 0.5) * CHUNK_SIZE
  const geometry = useMemo(() => {
    const geo = new PlaneGeometry(size, size, segments, segments)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.attributes.position as BufferAttribute
    const colors = new Float32Array(pos.count * 3)
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx
      const z = pos.getZ(i) + cz
      pos.setY(i, terrainHeight(x, z))
      const eps = 1.2
      const dx = (terrainHeight(x + eps, z) - terrainHeight(x - eps, z)) / (2 * eps)
      const dz = (terrainHeight(x, z + eps) - terrainHeight(x, z - eps)) / (2 * eps)
      const slope = Math.min(1, Math.hypot(dx, dz))
      const c = groundColor(x, z, pos.getY(i), slope)
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    geo.setAttribute('color', new BufferAttribute(colors, 3))
    geo.computeVertexNormals()
    return geo
  }, [size, segments, cx, cz])
  useEffect(() => () => geometry.dispose(), [geometry])
  const detail = useMemo(() => proxy ? null : tiled('normal', 52 / 6), [proxy])
  useEffect(() => () => detail?.dispose(), [detail])
  return (
    <mesh geometry={geometry} position={[cx, proxy ? -0.65 : 0, cz]} receiveShadow={!proxy} castShadow={false}>
      <meshStandardMaterial vertexColors flatShading roughness={0.95} metalness={0}
        dithering normalMap={detail} normalScale={NORMAL_SCALE} />
    </mesh>
  )
}

/** Lightweight cells can be removed under detailed ground without overlap. */
const proxyCells: ChunkCoord[] = []
for (let x = MIN_CHUNK; x <= MAX_CHUNK; x++)
  for (let z = MIN_CHUNK; z <= MAX_CHUNK; z++) proxyCells.push({ x, z })
export function TerrainProxy({ hidden }: { hidden: Set<string> }) {
  return <>{proxyCells.map((coord) => hidden.has(chunkKey(coord)) ? null :
    <TerrainMesh key={chunkKey(coord)} coord={coord} proxy />)}</>
}

/** Fine terrain and its exact visual collider exist only in active cells. */
export function TerrainChunk({ coord }: { coord: ChunkCoord }) {
  return <RigidBody type="fixed" colliders="trimesh" friction={1}>
    <TerrainMesh coord={coord} proxy={false} />
  </RigidBody>
}
