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
  /** No WebGL — the island never runs and the panels are served as a document. */
  reducedMode: boolean
  /** Full-screen map overlay is up. Freezes the player, same as a panel. */
  mapOpen: boolean
  /** Player-dropped map pin, world [x, z]. Not persisted across reloads. */
  pin: [number, number] | null
  /** Range scoreboard. Bonus-area only — nothing gates portfolio content. */
  shots: number
  hits: number

  setPhase: (p: Phase) => void
  setProgress: (p: number) => void
  setNearHouse: (h: HouseId | null) => void
  openHouse: (h: HouseId) => void
  closeHouse: () => void
  setSubIndex: (i: number | null) => void
  setIsMobile: (m: boolean) => void
  setReducedMode: (r: boolean) => void
  markMoved: () => void
  toggleMute: () => void
  toggleMap: () => void
  closeMap: () => void
  setPin: (p: [number, number] | null) => void
  registerShot: () => void
  registerHit: () => void
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
  reducedMode: false,
  mapOpen: false,
  pin: null,
  shots: 0,
  hits: 0,

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
  setReducedMode: (reducedMode) => set({ reducedMode }),
  markMoved: () => {
    if (!get().hasMoved) set({ hasMoved: true })
  },
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  // The map is only ever reachable from gameplay; opening it over a content
  // panel would stack two full-screen overlays.
  toggleMap: () =>
    set((s) => (s.activeHouse !== null ? s : { mapOpen: !s.mapOpen })),
  closeMap: () => set({ mapOpen: false }),
  setPin: (pin) => set({ pin }),
  registerShot: () => set((s) => ({ shots: s.shots + 1 })),
  registerHit: () => set((s) => ({ hits: s.hits + 1 })),
}))

/** True when the character should ignore input (panel or map open, not playing yet). */
export const isInputFrozen = () => {
  const s = useGameStore.getState()
  return s.activeHouse !== null || s.mapOpen || s.phase !== 'playing'
}
