import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DROP_TO } from '../lib/constants'
import { playerState } from '../state/controls'
import { useGameStore } from '../store/useGameStore'
import { TerrainProxy } from '../components/experience/Terrain'
import { IslandProxy } from './IslandProxy'
import {
  chunkKey, chunkOf, distance, inWorld, STREAMING,
  type ChunkCoord, type Detail,
} from './config'

const loadChunk = () => import('./DetailChunk')
const Chunk = lazy(() => loadChunk().then((m) => ({ default: m.DetailChunk })))
const PropsGroup = lazy(() => loadChunk().then((m) => ({ default: m.WorldProps })))
type Entry = { coord: ChunkCoord; detail: Detail; lastNeeded: number; lastChange: number }

function desiredCells(center: ChunkCoord, ahead: ChunkCoord, mediumRadius: number) {
  const cells: { coord: ChunkCoord; detail: Detail; score: number }[] = []
  for (let x = center.x - mediumRadius; x <= center.x + mediumRadius; x++) {
    for (let z = center.z - mediumRadius; z <= center.z + mediumRadius; z++) {
      const coord = { x, z }
      if (!inWorld(coord)) continue
      const d = distance(center, coord)
      const predicted = distance(ahead, coord)
      const detail = d <= STREAMING.highRadius || (predicted === 0 && d <= mediumRadius)
        ? 'high' : 'medium'
      cells.push({ coord, detail, score: d * 10 + predicted * 3 + (detail === 'medium' ? 30 : 0) })
    }
  }
  return cells.sort((a, b) => a.score - b.score)
}

/** One React mount or LOD change per tick keeps work off the render loop. */
export function WorldStreaming() {
  const phase = useGameStore((s) => s.phase)
  const isMobile = useGameStore((s) => s.isMobile)
  const [moduleReady, setModuleReady] = useState(false)
  const [entries, setEntries] = useState<Map<string, Entry>>(() => new Map())
  const entriesRef = useRef(entries)
  const last = useRef({ x: playerState.x, z: playerState.z, time: 0, tick: 0 })
  const frameMetrics = useRef({ calls: 0, triangles: 0, frameMs: 0 })
  const { gl } = useThree()
  const debug = import.meta.env.DEV || new URLSearchParams(location.search).has('debug')

  useFrame(({ gl }, delta) => {
    if (!debug) return
    frameMetrics.current.calls = gl.info.render.calls
    frameMetrics.current.triangles = gl.info.render.triangles
    frameMetrics.current.frameMs = frameMetrics.current.frameMs * 0.9 + Math.min(delta * 1000, 200) * 0.1
    gl.info.reset()
  }, -1000)

  useEffect(() => {
    if (phase === 'loading' || moduleReady) return
    let cancelled = false
    loadChunk().then(() => { if (!cancelled) setModuleReady(true) })
      .catch((error) => console.error('World detail failed to load', error))
    return () => { cancelled = true }
  }, [phase, moduleReady])

  useFrame(({ clock }) => {
    if (phase === 'loading' || phase === 'ready' || !moduleReady) return
    const now = clock.elapsedTime
    if (now - last.current.tick < STREAMING.updateInterval) return
    const dt = Math.max(0.001, now - last.current.time)
    const vx = (playerState.x - last.current.x) / dt
    const vz = (playerState.z - last.current.z) / dt
    last.current = { x: playerState.x, z: playerState.z, time: now, tick: now }

    // The introduction follows a scripted target, so it is more reliable than
    // extrapolating one frame of fall velocity. Once walking, use measured speed.
    const center = phase === 'playing' ? chunkOf(playerState.x, playerState.z) : chunkOf(...DROP_TO)
    const ahead = phase === 'playing'
      ? chunkOf(playerState.x + vx * STREAMING.predictionSeconds, playerState.z + vz * STREAMING.predictionSeconds)
      : center
    const wanted = desiredCells(center, ahead,
      isMobile ? STREAMING.mobileMediumRadius : STREAMING.mediumRadius)
    const old = entriesRef.current
    const next = new Map(old)
    let changed = false
    let work = 0
    for (const cell of wanted) {
      const key = chunkKey(cell.coord)
      const prior = next.get(key)
      if (!prior) {
        if (work >= STREAMING.loadsPerTick) continue
        next.set(key, { coord: cell.coord, detail: cell.detail, lastNeeded: now, lastChange: now })
        changed = true
        work++
      } else if (prior.detail !== cell.detail && work < STREAMING.loadsPerTick &&
        (cell.detail === 'high' || now - prior.lastChange >= STREAMING.lodDelay)) {
        next.set(key, { ...prior, detail: cell.detail, lastNeeded: now, lastChange: now })
        changed = true
        work++
      } else if (now - prior.lastNeeded > 1) {
        next.set(key, { ...prior, lastNeeded: now })
      }
    }
    for (const [key, entry] of next) {
      if (distance(center, entry.coord) <=
        (isMobile ? STREAMING.mobileUnloadRadius : STREAMING.unloadRadius)) continue
      if (now - entry.lastNeeded < STREAMING.unloadDelay) continue
      if (work >= STREAMING.loadsPerTick) break
      next.delete(key)
      changed = true
      work++
    }
    if (changed) {
      entriesRef.current = next
      setEntries(next)
    } else {
      entriesRef.current = next
    }
    if (debug) {
      ;(window as unknown as { __streaming?: unknown }).__streaming = {
        center: chunkKey(center), active: next.size,
        high: [...next.values()].filter((e) => e.detail === 'high').length,
        medium: [...next.values()].filter((e) => e.detail === 'medium').length,
        drawCalls: frameMetrics.current.calls, triangles: frameMetrics.current.triangles,
        frameMs: frameMetrics.current.frameMs,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        heapMB: ((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? 0) / (1024 * 1024),
      }
    }
  })

  const hidden = useMemo(() => new Set([...entries].filter(([, e]) => e.detail === 'high').map(([key]) => key)), [entries])
  return <>
    <TerrainProxy hidden={hidden} />
    <IslandProxy hidden={hidden} />
    <Suspense fallback={null}>
      {entries.size > 0 && <PropsGroup entries={[...entries.values()]} />}
      {[...entries.entries()].map(([key, entry]) =>
        <Chunk key={key} coord={entry.coord} detail={entry.detail} />)}
    </Suspense>
  </>
}
