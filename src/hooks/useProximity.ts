import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { houses } from '../data/portfolioData'
import type { HouseId } from '../data/portfolioData'
import { input, playerState } from '../state/controls'
import { useGameStore } from '../store/useGameStore'
import { playOpen, playPrompt } from '../lib/audio'

/** Precomputed marker positions — these never move. */
const TRIGGERS = houses.map((h) => ({
  id: h.id,
  x: h.position[0] + h.markerOffset[0],
  z: h.position[1] + h.markerOffset[1],
  r2: h.radius * h.radius,
}))

/**
 * Finds the nearest building whose trigger the player is standing in, keeps
 * the store in sync, and consumes the interact button. Runs inside the
 * render loop but only writes to the store when the answer actually changes.
 */
export function useProximity() {
  const last = useRef<HouseId | null>(null)

  useFrame(() => {
    const store = useGameStore.getState()

    if (store.phase !== 'playing' || store.activeHouse !== null) {
      if (last.current !== null) {
        last.current = null
        store.setNearHouse(null)
      }
      input.interactPressed = false
      return
    }

    let best: HouseId | null = null
    let bestD2 = Infinity
    for (const t of TRIGGERS) {
      const dx = playerState.x - t.x
      const dz = playerState.z - t.z
      const d2 = dx * dx + dz * dz
      if (d2 < t.r2 && d2 < bestD2) {
        bestD2 = d2
        best = t.id
      }
    }

    if (best !== last.current) {
      last.current = best
      store.setNearHouse(best)
      if (best) playPrompt()
    }

    if (input.interactPressed) {
      input.interactPressed = false
      if (best) {
        store.openHouse(best)
        playOpen()
      }
    }
  })
}

/** Component wrapper so the hook can live inside the Canvas. */
export function ProximitySystem() {
  useProximity()
  return null
}
