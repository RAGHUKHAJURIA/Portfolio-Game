import { houses } from '../data/portfolioData'
import {
  BOUNDARY_POSTS, BROADLEAF, BUSHES, DEBRIS, PINES, ROCKS,
  SHORE_ROCKS, TREES, TUFTS, type Placed,
} from '../lib/scatter'
import { chunkKey, chunkOf, type ChunkCoord } from './config'

type Point = { x: number; z: number }
export type ChunkContent = {
  trees: Placed[]; pines: Placed[]; broadleaf: Placed[]; bushes: Placed[]
  rocks: Placed[]; tufts: Placed[]; debris: Placed[]; shoreRocks: Placed[]
  boundaryPosts: typeof BOUNDARY_POSTS
  houses: string[]
}

const lists = {
  trees: TREES, pines: PINES, broadleaf: BROADLEAF, bushes: BUSHES,
  rocks: ROCKS, tufts: TUFTS, debris: DEBRIS, shoreRocks: SHORE_ROCKS,
  boundaryPosts: BOUNDARY_POSTS,
}

// A metadata index only: no meshes, GPU buffers, materials, or colliders exist
// until a chunk mounts. The scatter itself is deterministic and shared.
const manifest = new Map<string, ChunkContent>()
export function contentFor(coord: ChunkCoord): ChunkContent {
  const key = chunkKey(coord)
  let content = manifest.get(key)
  if (content) return content
  const inside = (p: Point) => {
    const c = chunkOf(p.x, p.z)
    return c.x === coord.x && c.z === coord.z
  }
  content = {
    trees: lists.trees.filter(inside), pines: lists.pines.filter(inside),
    broadleaf: lists.broadleaf.filter(inside), bushes: lists.bushes.filter(inside),
    rocks: lists.rocks.filter(inside), tufts: lists.tufts.filter(inside),
    debris: lists.debris.filter(inside), shoreRocks: lists.shoreRocks.filter(inside),
    boundaryPosts: lists.boundaryPosts.filter(inside),
    houses: houses.filter((h) => inside({ x: h.position[0], z: h.position[1] })).map((h) => h.id),
  }
  manifest.set(key, content)
  return content
}
