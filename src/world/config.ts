import { ISLAND } from '../data/portfolioData'

// Six cells across the authored 372-unit terrain. The landing plaza, compounds,
// and walking speed make one cell (~62 units) a useful streaming unit.
export const CHUNK_SIZE = ISLAND.half / 3
export const MIN_CHUNK = -3
export const MAX_CHUNK = 2

export const STREAMING = {
  highRadius: 1,
  mediumRadius: 2,
  mobileMediumRadius: 1,
  unloadRadius: 2,
  mobileUnloadRadius: 1,
  predictionSeconds: 2.5,
  updateInterval: 0.25,
  unloadDelay: 3,
  lodDelay: 1.5,
  loadsPerTick: 1,
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
