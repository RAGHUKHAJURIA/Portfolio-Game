import { ISLAND } from '../data/portfolioData'

// Six cells across the authored 372-unit terrain. The landing plaza, compounds,
// and walking speed make one cell (~62 units) a useful streaming unit.
export const CHUNK_SIZE = ISLAND.half / 3
export const MIN_CHUNK = -3
export const MAX_CHUNK = 2

export const STREAMING = {
  // Detailed ground is needed ahead of the player, not in every cell of a
  // permanent 3x3 square. At run speed this gives several seconds of lead.
  highDistance: 24,
  mobileHighDistance: 18,
  mediumRadius: 2,
  mobileMediumRadius: 1,
  unloadRadius: 2,
  mobileUnloadRadius: 1,
  predictionSeconds: 2.5,
  updateInterval: 0.25,
  unloadDelay: 3,
  lodDelay: 1.5,
  houseDetailDistance: 58,
  houseUnloadDistance: 70,
  houseFurnishDistance: 24,
  houseFurnishUnloadDistance: 32,
  rangeDetailDistance: 45,
  rangeUnloadDistance: 56,
  lowTerrainSegments: 8,
  highTerrainSegments: 22,
} as const

export type ChunkCoord = { x: number; z: number }
export type Detail = 'high' | 'medium'
export const chunkOf = (x: number, z: number): ChunkCoord => ({
  x: Math.floor(x / CHUNK_SIZE),
  z: Math.floor(z / CHUNK_SIZE),
})
export const chunkKey = ({ x, z }: ChunkCoord) => `${x},${z}`
export const inWorld = ({ x, z }: ChunkCoord) =>
  x >= MIN_CHUNK && x <= MAX_CHUNK && z >= MIN_CHUNK && z <= MAX_CHUNK
export const distance = (a: ChunkCoord, b: ChunkCoord) =>
  Math.max(Math.abs(a.x - b.x), Math.abs(a.z - b.z))
export const distanceToChunk = (x: number, z: number, cell: ChunkCoord) => {
  const left = cell.x * CHUNK_SIZE
  const right = left + CHUNK_SIZE
  const top = cell.z * CHUNK_SIZE
  const bottom = top + CHUNK_SIZE
  return Math.hypot(Math.max(left - x, 0, x - right), Math.max(top - z, 0, z - bottom))
}
