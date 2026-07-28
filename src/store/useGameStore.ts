import { create } from 'zustand'
import type { HouseId } from '../data/portfolioData'

export type Phase = 'loading' | 'ready' | 'dropping' | 'playing'

type GameState = {
  /** Coarse app phase. */
  phase: Phase
  /** Asset/scene load progress, 0–100. */
  progress: number
  /** House the player is currently standing inside the trigger of. */
  nearHouse: HouseId | null
  /** House whose panel is open. null = playing. */
  activeHouse: HouseId | null
  /** Sub-panel index inside a house panel (e.g. which project crate). */
  subIndex: number | null
  /** Touch device — swaps to on-screen controls. */
  isMobile: boolean
  /** Player has moved at least once — used to fade the controls legend. */
  hasMoved: boolean
  /** Houses the player has opened at least once. */
  visited: Record<string, boolean>
  /** Global mute. */
  muted: boolean

  setPhase: (p: Phase) => void
  setProgress: (p: number) => void
  setNearHouse: (h: HouseId | null) => void
  openHouse: (h: HouseId) => void
  closeHouse: () => void
  setSubIndex: (i: number | null) => void
  setIsMobile: (m: boolean) => void
  markMoved: () => void
  toggleMute: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  phase: 'loading',
  progress: 0,
  nearHouse: null,
  activeHouse: null,
  subIndex: null,
  isMobile: false,
  hasMoved: false,
  visited: {},
  muted: false,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setNearHouse: (nearHouse) => {
    if (get().nearHouse !== nearHouse) set({ nearHouse })
  },
  openHouse: (h) =>
    set((s) => ({
      activeHouse: h,
      subIndex: null,
      visited: { ...s.visited, [h]: true },
    })),
  closeHouse: () => set({ activeHouse: null, subIndex: null }),
  setSubIndex: (subIndex) => set({ subIndex }),
  setIsMobile: (isMobile) => set({ isMobile }),
  markMoved: () => {
    if (!get().hasMoved) set({ hasMoved: true })
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}))

/** True when the character should ignore input (panel open, not playing yet). */
export const isInputFrozen = () => {
  const s = useGameStore.getState()
  return s.activeHouse !== null || s.phase !== 'playing'
}
