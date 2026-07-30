import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { houses } from '../data/portfolioData'
import type { HouseId } from '../data/portfolioData'
import { input, playerState } from '../state/controls'
import { useGameStore, isInputFrozen } from '../store/useGameStore'
import { playOpen, playPrompt } from '../lib/audio'
import { houseGroundY } from '../lib/terrain'
import { FEET_OFFSET } from '../lib/constants'

/**
 * Precomputed content-object positions — these never move.
 *
 * The trigger is the object *inside* the building, on its upper floor, not the
 * door marker outside: the door marker is signage now. That makes the test
 * three-dimensional, because the ground floor sits directly beneath the upper
 * one and a flat XZ check would fire the panel from downstairs.
 */
const FLOOR_TOLERANCE = 1.6

const TRIGGERS = houses.map((h) => ({
  id: h.id,
  x: h.position[0] + h.interiorOffset[0],
  z: h.position[1] + h.interiorOffset[1],
  /** Height of the floor the object stands on, in world space. */
  y: houseGroundY[h.id] + h.interiorY,
  r2: h.interiorRadius * h.interiorRadius,
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

    if (isInputFrozen()) {
      if (last.current !== null) {
        last.current = null
        store.setNearHouse(null)
      }
      input.interactPressed = false
      return
    }

    // playerState.y is the capsule centre; the feet are what stand on a floor.
    const feetY = playerState.y - FEET_OFFSET

    let best: HouseId | null = null
    let bestD2 = Infinity
    for (const t of TRIGGERS) {
      if (Math.abs(feetY - t.y) > FLOOR_TOLERANCE) continue
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
