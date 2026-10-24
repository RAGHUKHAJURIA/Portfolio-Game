import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { CHUTE_ALTITUDE, DROP_TO, RUN_SPEED } from '../lib/constants'
import { houses } from '../data/portfolioData'
import { RANGE_ORIGIN } from '../lib/terrain'
import { playerState } from '../state/controls'
import { useGameStore } from '../store/useGameStore'
import { TerrainProxy } from '../components/experience/Terrain'
import { IslandProxy } from './IslandProxy'
import { perfFlag } from '../lib/perfFlags'
import { QUALITY } from '../lib/quality'
import {
  chunkKey, chunkOf, distance, distanceToChunk, inWorld, STREAMING,
  type ChunkCoord, type Detail,
} from './config'

const loadChunk = () => import('./DetailChunk')
const Chunk = lazy(() => loadChunk().then((m) => ({ default: m.DetailChunk })))
const PropsGroup = lazy(() => loadChunk().then((m) => ({ default: m.WorldProps })))
const HouseGroup = lazy(() => loadChunk().then((m) => ({ default: m.HouseDetails })))
const RangeGroup = lazy(() => loadChunk().then((m) => ({ default: m.RangeDetails })))
type Entry = { coord: ChunkCoord; detail: Detail; lastNeeded: number; lastChange: number }

function desiredCells(center: ChunkCoord, ahead: ChunkCoord, playerX: number, playerZ: number,
  mediumRadius: number, highDistance: number) {
  const cells: { coord: ChunkCoord; detail: Detail; score: number }[] = []
  for (let x = center.x - mediumRadius; x <= center.x + mediumRadius; x++) {
    for (let z = center.z - mediumRadius; z <= center.z + mediumRadius; z++) {
      const coord = { x, z }
      if (!inWorld(coord)) continue
      const d = distance(center, coord)
      const predicted = distance(ahead, coord)
      const near = distanceToChunk(playerX, playerZ, coord)
      const detail = d === 0 || predicted === 0 || (d <= 1 && near <= highDistance)
        ? 'high' : 'medium'
      const score = d === 0 ? -100 : predicted === 0 ? -80
        : detail === 'high' ? near : 100 + d * 10 + near
      cells.push({ coord, detail, score })
    }
  }
  return cells.sort((a, b) => a.score - b.score)
}

/** One React mount or LOD change per tick keeps work off the render loop. */
export function WorldStreaming() {
  const phase = useGameStore((s) => s.phase)
  const isMobile = useGameStore((s) => s.isMobile)
  const quality = useGameStore((s) => s.quality)
  const [moduleReady, setModuleReady] = useState(false)
  const [entries, setEntries] = useState<Map<string, Entry>>(() => new Map())
  const [activeHouses, setActiveHouses] = useState<Set<string>>(() => new Set())
  const activeHousesRef = useRef(activeHouses)
  const [furnishedHouses, setFurnishedHouses] = useState<Set<string>>(() => new Set())
  const furnishedRef = useRef(furnishedHouses)
  const [activeRange, setActiveRange] = useState(false)
  const activeRangeRef = useRef(false)
  const entriesRef = useRef(entries)
  const last = useRef({ x: playerState.x, z: playerState.z, time: 0, tick: 0 })
  const frameMetrics = useRef({ calls: 0, triangles: 0, frameMs: 0 })
  const { gl } = useThree()
  const { world } = useRapier()
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
    const velocityScale = Math.min(1, RUN_SPEED * 1.5 / Math.max(0.001, Math.hypot(vx, vz)))
    last.current.x = playerState.x
    last.current.z = playerState.z
    last.current.time = now
    last.current.tick = now

    // The introduction follows a scripted target, so it is more reliable than
    // extrapolating one frame of fall velocity. Once walking, use measured speed.
    const center = phase === 'playing' ? chunkOf(playerState.x, playerState.z) : chunkOf(...DROP_TO)
    const ahead = phase === 'playing'
      ? chunkOf(playerState.x + vx * velocityScale * STREAMING.predictionSeconds,
        playerState.z + vz * velocityScale * STREAMING.predictionSeconds)
      : center
    // Only collision at the known landing seam is urgent while the player is
    // high in the air. The neighboring detail is staged during the chute.
    const farAerial = phase === 'dropping' && playerState.y > CHUTE_ALTITUDE + 15
    const mediumRadius = farAerial ? 1 : Math.min(
      isMobile ? STREAMING.mobileMediumRadius : STREAMING.mediumRadius,
      QUALITY[quality].mediumRadius)
    const highDistance = farAerial ? 1 :
      isMobile ? STREAMING.mobileHighDistance : QUALITY[quality].highDistance
    const focusX = phase === 'playing' ? playerState.x : DROP_TO[0]
    const focusZ = phase === 'playing' ? playerState.z : DROP_TO[1]
    const wanted = desiredCells(center, ahead, focusX, focusZ, mediumRadius, highDistance)
    const wantedByKey = new Map(wanted.map((cell) => [chunkKey(cell.coord), cell]))

    // Buildings and the range are expensive even when their host terrain cell
    // is nearby. Prepare them by distance to their real footprint instead.
    const houseIds = new Set(phase === 'playing' ? houses
      .filter((h) => Math.hypot(playerState.x - h.position[0], playerState.z - h.position[1])
        <= (activeHousesRef.current.has(h.id) ? STREAMING.houseUnloadDistance
          : STREAMING.houseDetailDistance)).map((h) => h.id) : [])
    if (houseIds.size !== activeHousesRef.current.size ||
      [...houseIds].some((id) => !activeHousesRef.current.has(id))) {
      activeHousesRef.current = houseIds
      setActiveHouses(houseIds)
    }
    const furnished = new Set(phase === 'playing' ? houses
      .filter((h) => Math.hypot(playerState.x - h.position[0], playerState.z - h.position[1])
        <= (furnishedRef.current.has(h.id) ? STREAMING.houseFurnishUnloadDistance
          : STREAMING.houseFurnishDistance)).map((h) => h.id) : [])
    if (furnished.size !== furnishedRef.current.size ||
      [...furnished].some((id) => !furnishedRef.current.has(id))) {
      furnishedRef.current = furnished
      setFurnishedHouses(furnished)
    }
    const rangeX = Math.max(Math.abs(playerState.x - RANGE_ORIGIN[0]) - 13, 0)
    const rangeZ = Math.max(Math.abs(playerState.z - (RANGE_ORIGIN[1] - 12)) - 22, 0)
    const needsRange = phase === 'playing' && Math.hypot(rangeX, rangeZ) <=
      (activeRangeRef.current ? STREAMING.rangeUnloadDistance : STREAMING.rangeDetailDistance)
    if (needsRange !== activeRangeRef.current) {
      activeRangeRef.current = needsRange
      setActiveRange(needsRange)
    }
    const old = entriesRef.current
    const next = new Map(old)
    let changed = false
    for (const cell of wanted) {
      const key = chunkKey(cell.coord)
      const prior = next.get(key)
      if (prior && now - prior.lastNeeded > 1) {
        next.set(key, { ...prior, lastNeeded: now })
      }
    }

    // A current or predicted collision cell always wins. Release obsolete high
    // detail before spending the next tick on medium foliage. This prevents
    // old 3x3 regions accumulating during travel or teleportation.
    const critical = wanted.find((cell) => cell.detail === 'high' &&
      next.get(chunkKey(cell.coord))?.detail !== 'high')
    if (critical) {
      const key = chunkKey(critical.coord)
      next.set(key, { coord: critical.coord, detail: 'high', lastNeeded: now, lastChange: now })
      changed = true
    } else {
      const staleHigh = [...next.entries()].filter(([key, entry]) => entry.detail === 'high' &&
        wantedByKey.get(key)?.detail !== 'high' &&
        (now - entry.lastChange >= STREAMING.lodDelay || distance(center, entry.coord) > mediumRadius))
        .sort((a, b) => distance(center, b[1].coord) - distance(center, a[1].coord))[0]
      if (staleHigh) {
        const [key, entry] = staleHigh
        if (wantedByKey.has(key)) next.set(key, { ...entry, detail: 'medium', lastChange: now })
        else next.delete(key)
        changed = true
      } else {
        const missing = wanted.find((cell) => !next.has(chunkKey(cell.coord)))
        if (missing) {
          next.set(chunkKey(missing.coord), { coord: missing.coord, detail: 'medium',
            lastNeeded: now, lastChange: now })
          changed = true
        } else {
          const staleMedium = [...next.entries()].find(([key, entry]) =>
            !wantedByKey.has(key) && entry.detail === 'medium' &&
            now - entry.lastNeeded >= STREAMING.unloadDelay &&
            distance(center, entry.coord) >
              (isMobile ? STREAMING.mobileUnloadRadius : STREAMING.unloadRadius))
          if (staleMedium) { next.delete(staleMedium[0]); changed = true }
        }
      }
    }
    if (changed) {
      entriesRef.current = next
      setEntries(next)
    } else {
      entriesRef.current = next
    }
    if (debug) {
      ;(window as unknown as { __streaming?: unknown }).__streaming = {
        center: chunkKey(center), predicted: chunkKey(ahead), active: next.size,
        high: [...next.values()].filter((e) => e.detail === 'high').length,
        medium: [...next.values()].filter((e) => e.detail === 'medium').length,
        drawCalls: frameMetrics.current.calls, triangles: frameMetrics.current.triangles,
        frameMs: frameMetrics.current.frameMs,
        geometries: gl.info.memory.geometries, textures: gl.info.memory.textures,
        heapMB: ((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory
          ?.usedJSHeapSize ?? 0) / (1024 * 1024),
        colliders: world.colliders.len(), rigidBodies: world.bodies.len(),
        quality, shadowMap: QUALITY[quality].shadowMap, dpr: gl.getPixelRatio(),
      }
    }
  })

  const hidden = useMemo(() => new Set([...entries].filter(([, e]) => e.detail === 'high').map(([key]) => key)), [entries])
  return <>
    <TerrainProxy hidden={hidden} />
    <IslandProxy hidden={hidden} activeHouses={activeHouses} activeRange={activeRange} />
    <Suspense fallback={null}>
      {entries.size > 0 && !perfFlag('props') && <PropsGroup entries={[...entries.values()]} />}
      {[...entries.entries()].map(([key, entry]) =>
        <Chunk key={key} coord={entry.coord} detail={entry.detail} />)}
      {activeHouses.size > 0 && <HouseGroup active={activeHouses} furnished={furnishedHouses} />}
      {activeRange && <RangeGroup />}
    </Suspense>
  </>
}
