import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { InstancedMesh, Object3D } from 'three'
import { TREES, PINES, BROADLEAF, BUSHES, ROCKS, TUFTS,
  SHORE_ROCKS, BOUNDARY_POSTS, type Placed } from '../lib/scatter'
import type { ChunkContent } from './manifest'

type Post = ChunkContent['boundaryPosts'][number]
type Transform<T> = (item: T, index: number, object: Object3D) => void

function Batch<T>({ items, capacity, transform, castShadow = false, receiveShadow = false, children }:
  { items: T[]; capacity: number; transform: Transform<T>; castShadow?: boolean;
    receiveShadow?: boolean; children: ReactNode }) {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  useLayoutEffect(() => {
    const target = mesh.current
    if (!target) return
    target.count = items.length
    for (let i = 0; i < items.length; i++) {
      dummy.position.set(0, 0, 0)
      dummy.rotation.set(0, 0, 0)
      dummy.scale.set(1, 1, 1)
      transform(items[i], i, dummy)
      dummy.updateMatrix()
      target.setMatrixAt(i, dummy.matrix)
    }
    target.instanceMatrix.needsUpdate = true
  }, [items, transform, dummy])
  return <instancedMesh ref={mesh} args={[undefined, undefined, capacity]}
    frustumCulled={false} castShadow={castShadow} receiveShadow={receiveShadow}>
    {children}
  </instancedMesh>
}

const trunk: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 1.3 * t.scale, t.z)
  o.rotation.y = t.rot
  o.scale.setScalar(t.scale)
}
const pine = (tier: number): Transform<Placed> => (t, _, o) => {
  o.position.set(t.x, t.y + (2.3 + tier) * t.scale, t.z)
  o.rotation.y = t.rot + tier * 0.5
  o.scale.setScalar(t.scale)
}
const broadA: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 3.1 * t.scale, t.z)
  o.rotation.set(t.rot * 0.3, t.rot, t.rot * 0.2)
  o.scale.set(t.scale * 1.1, t.scale * 0.85, t.scale * 1.1)
}
const broadB: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x + 0.5 * t.scale, t.y + 3.9 * t.scale, t.z - 0.3 * t.scale)
  o.rotation.y = t.rot * 0.5
  o.rotation.x = t.rot
  o.scale.setScalar(t.scale)
}
const bush: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 0.34 * t.scale, t.z)
  o.rotation.set(t.rot * 0.4, t.rot, 0)
  o.scale.set(t.scale * 1.25, t.scale * 0.8, t.scale * 1.25)
}
const rock: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 0.3 * t.scale, t.z)
  o.rotation.set(t.rot * 0.5, t.rot, t.rot * 0.3)
  o.scale.set(t.scale * 1.2, t.scale * 0.85, t.scale)
}
const grass: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 0.3 * t.scale, t.z)
  o.rotation.set(0.12, t.rot, 0.08)
  o.scale.setScalar(t.scale)
}
const shore: Transform<Placed> = (t, _, o) => {
  o.position.set(t.x, t.y + 0.5 * t.scale, t.z)
  o.rotation.set(t.rot * 0.4, t.rot, t.rot * 0.25)
  o.scale.set(t.scale * 1.3, t.scale, t.scale * 1.1)
}
const post: Transform<Post> = (t, _, o) => { o.position.set(t.x, t.y + 0.75, t.z) }
const postBand: Transform<Post> = (t, _, o) => { o.position.set(t.x, t.y + 1.1, t.z) }

// Capacity is the full deterministic scatter maximum. Only active instances
// are drawn; fixed buffers avoid GPU reallocations when crossing a boundary.
const CAP = { trees: TREES.length, pines: PINES.length, broadleaf: BROADLEAF.length,
  bushes: BUSHES.length, rocks: ROCKS.length, tufts: TUFTS.length,
  shoreRocks: SHORE_ROCKS.length, boundaryPosts: BOUNDARY_POSTS.length }

export function StreamedProps({ content: c }: { content: ChunkContent }) {
  return <>
    <Batch items={c.trees} capacity={CAP.trees} transform={trunk} castShadow receiveShadow>
      <cylinderGeometry args={[0.13, 0.22, 2.6, 6]} />
      <meshStandardMaterial color="#4a3a28" roughness={1} flatShading />
    </Batch>
    {[0, 1, 2].map((tier) => <Batch key={tier} items={c.pines} capacity={CAP.pines}
      transform={pine(tier)} castShadow receiveShadow>
      <coneGeometry args={[1.5 - tier * 0.38, 1.9 - tier * 0.25, 7]} />
      <meshStandardMaterial color={tier === 0 ? '#354a2b' : tier === 1 ? '#3e5531' : '#4a613a'}
        roughness={1} flatShading />
    </Batch>)}
    <Batch items={c.broadleaf} capacity={CAP.broadleaf} transform={broadA} castShadow receiveShadow>
      <icosahedronGeometry args={[1.6, 0]} />
      <meshStandardMaterial color="#425734" roughness={1} flatShading />
    </Batch>
    <Batch items={c.broadleaf} capacity={CAP.broadleaf} transform={broadB} castShadow>
      <icosahedronGeometry args={[1.1, 0]} />
      <meshStandardMaterial color="#51683d" roughness={1} flatShading />
    </Batch>
    <Batch items={c.bushes} capacity={CAP.bushes} transform={bush} castShadow receiveShadow>
      <icosahedronGeometry args={[0.62, 0]} />
      <meshStandardMaterial color="#455631" roughness={1} flatShading />
    </Batch>
    <Batch items={c.rocks} capacity={CAP.rocks} transform={rock} castShadow receiveShadow>
      <dodecahedronGeometry args={[0.85, 0]} />
      <meshStandardMaterial color="#6e6d64" roughness={0.95} flatShading />
    </Batch>
    <Batch items={c.tufts} capacity={CAP.tufts} transform={grass} receiveShadow>
      <coneGeometry args={[0.22, 0.65, 4]} />
      <meshStandardMaterial color="#74854a" roughness={1} flatShading />
    </Batch>
    <Batch items={c.shoreRocks} capacity={CAP.shoreRocks} transform={shore} castShadow receiveShadow>
      <dodecahedronGeometry args={[1.1, 0]} />
      <meshStandardMaterial color="#615f57" roughness={0.95} flatShading />
    </Batch>
    <Batch items={c.boundaryPosts} capacity={CAP.boundaryPosts} transform={post} castShadow>
      <cylinderGeometry args={[0.07, 0.07, 1.5, 5]} />
      <meshStandardMaterial color="#d8d5cc" roughness={0.9} />
    </Batch>
    <Batch items={c.boundaryPosts} capacity={CAP.boundaryPosts} transform={postBand}>
      <cylinderGeometry args={[0.075, 0.075, 0.42, 5]} />
      <meshStandardMaterial color="#c0392b" roughness={0.9} />
    </Batch>
  </>
}
