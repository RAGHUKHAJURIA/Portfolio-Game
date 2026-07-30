import { useEffect } from 'react'
import { cameraOrbit, input } from '../state/controls'
import { isInputFrozen } from '../store/useGameStore'

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
      if (isInputFrozen()) return
      if (isUi(e.target)) return
      if (e.pointerType !== 'touch' && e.button !== 0 && e.button !== 2) return
      // On touch, the left half of the screen belongs to the joystick.
      if (e.pointerType === 'touch' && e.clientX < window.innerWidth * 0.4) return

      // Right-hold shoulders the weapon; left-click fires, but only while
      // aiming. Firing on any left-click would put a round downrange every
      // time the player grabbed the camera to look around.
      if (e.pointerType !== 'touch') {
        if (e.button === 2) input.aim = true
        else if (e.button === 0 && input.aim) input.firePressed = true
      }

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
      if (e.pointerType !== 'touch' && e.button === 2) input.aim = false
      if (pointerId !== null && e.pointerId !== pointerId) return
      dragging = false
      pointerId = null
    }

    // A right-drag that ends outside the window never fires pointerup, and the
    // weapon would stay shouldered for ever.
    const onBlur = () => {
      input.aim = false
      input.firePressed = false
    }

    const onWheel = (e: WheelEvent) => {
      if (isInputFrozen()) return
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
    window.addEventListener('blur', onBlur)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('blur', onBlur)
    }
  }, [])
}
