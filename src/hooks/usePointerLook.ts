import { useEffect } from 'react'
import { cameraOrbit } from '../state/controls'
import { useGameStore } from '../store/useGameStore'

const PITCH_MIN = -0.32
const PITCH_MAX = 1.05
const SENS = 0.0042
const TOUCH_SENS = 0.006

/**
 * Drag-to-orbit for the third-person camera.
 *
 * Desktop: drag anywhere on the scene. Mobile: drag on the right half only,
 * so the left half stays free for the movement stick.
 *
 * Any pointer that starts inside an element marked `data-ui` is ignored —
 * that's how buttons and panels opt out of camera control.
 */
export function usePointerLook() {
  useEffect(() => {
    let dragging = false
    let pointerId: number | null = null
    let lastX = 0
    let lastY = 0

    const isUi = (t: EventTarget | null) =>
      t instanceof Element && t.closest('[data-ui]') !== null

    const onPointerDown = (e: PointerEvent) => {
      const s = useGameStore.getState()
      if (s.activeHouse !== null || s.phase !== 'playing') return
      if (isUi(e.target)) return
      if (e.pointerType !== 'touch' && e.button !== 0 && e.button !== 2) return
      // On touch, the left half of the screen belongs to the joystick.
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4) return

      dragging = true
      pointerId = e.pointerId
      lastX = e.clientX
      lastY = e.clientY
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pointerId) return
      const sens = e.pointerType === 'touch' ? TOUCH_SENS : SENS
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY

      cameraOrbit.yaw -= dx * sens
      cameraOrbit.pitch = Math.max(
        PITCH_MIN,
        Math.min(PITCH_MAX, cameraOrbit.pitch + dy * sens)
      )
    }

    const stop = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return
      dragging = false
      pointerId = null
    }

    const onWheel = (e: WheelEvent) => {
      const s = useGameStore.getState()
      if (s.activeHouse !== null || s.phase !== 'playing') return
      if (isUi(e.target)) return
      e.preventDefault()
      cameraOrbit.targetDistance = Math.max(
        3.4,
        Math.min(18, cameraOrbit.targetDistance + e.deltaY * 0.011)
      )
    }

    const onContextMenu = (e: MouseEvent) => {
      if (!isUi(e.target)) e.preventDefault()
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('contextmenu', onContextMenu)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('contextmenu', onContextMenu)
    }
  }, [])
}
