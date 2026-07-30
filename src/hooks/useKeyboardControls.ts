import { useEffect } from 'react'
import { input, resetInput } from '../state/controls'
import { useGameStore } from '../store/useGameStore'

const FORWARD = new Set(['KeyW', 'ArrowUp'])
const BACK = new Set(['KeyS', 'ArrowDown'])
const LEFT = new Set(['KeyA', 'ArrowLeft'])
const RIGHT = new Set(['KeyD', 'ArrowRight'])
const INTERACT = new Set(['KeyE', 'Enter'])
const BLOCK_SCROLL = new Set([
  'Space',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

/**
 * Raw keyboard → the mutable `input` object. Deliberately does not touch
 * React state: holding W should not re-render anything.
 */
export function useKeyboardControls() {
  useEffect(() => {
    const held = new Set<string>()

    const apply = () => {
      let f = 0
      let r = 0
      for (const c of held) {
        if (FORWARD.has(c)) f += 1
        else if (BACK.has(c)) f -= 1
        else if (LEFT.has(c)) r -= 1
        else if (RIGHT.has(c)) r += 1
      }
      input.forward = Math.max(-1, Math.min(1, f))
      input.right = Math.max(-1, Math.min(1, r))
      input.sprint = held.has('ShiftLeft') || held.has('ShiftRight')
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return

      const store = useGameStore.getState()

      if (e.code === 'Escape') {
        if (store.mapOpen) store.closeMap()
        else if (store.activeHouse) {
          if (store.subIndex !== null) store.setSubIndex(null)
          else store.closeHouse()
        }
        return
      }

      // M toggles the full map, and has to be handled before the freeze check
      // below or it could open the map but never close it.
      if (e.code === 'KeyM' && !store.reducedMode && store.phase === 'playing') {
        store.toggleMap()
        return
      }

      // While a panel or the map is open the arrow keys and space belong to the
      // overlay's scroll container, and in reduced mode they belong to the page
      // — so only swallow them when there's an island to walk around.
      if (store.activeHouse !== null || store.mapOpen || store.reducedMode) return
      if (BLOCK_SCROLL.has(e.code)) e.preventDefault()

      if (store.phase === 'ready' && (e.code === 'Space' || e.code === 'Enter')) {
        return // handled by the loading screen
      }

      if (INTERACT.has(e.code)) {
        input.interactPressed = true
        return
      }
      if (e.code === 'Space') {
        if (!e.repeat) input.jump = true
        return
      }
      if (e.repeat) return
      held.add(e.code)
      apply()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      held.delete(e.code)
      apply()
    }

    const onBlur = () => {
      held.clear()
      resetInput()
    }

    window.addEventListener('keydown', onKeyDown, { passive: false })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)

    // Opening or closing an overlay should never leave a key stuck down.
    const unsub = useGameStore.subscribe((s, prev) => {
      if (s.activeHouse !== prev.activeHouse || s.mapOpen !== prev.mapOpen) {
        held.clear()
        resetInput()
      }
    })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      unsub()
    }
  }, [])
}
