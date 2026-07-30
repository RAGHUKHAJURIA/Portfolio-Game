import { useEffect, useRef, useState } from 'react'
import { input } from '../../state/controls'
import { useGameStore, isInputFrozen } from '../../store/useGameStore'
import { playClick } from '../../lib/audio'

const BASE = 116
const KNOB = 50
const MAX = (BASE - KNOB) / 2

/**
 * Left-thumb virtual joystick. Movement magnitude drives speed, so a small
 * push walks and a full push sprints — no separate run button needed.
 */
function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const active = useRef<number | null>(null)
  const origin = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const el = base.current
    if (!el) return

    const set = (dx: number, dy: number) => {
      const dist = Math.hypot(dx, dy)
      const clamped = dist > MAX ? MAX / dist : 1
      const kx = dx * clamped
      const ky = dy * clamped
      setKnob({ x: kx, y: ky })

      const nx = kx / MAX
      const ny = ky / MAX
      input.right = nx
      input.forward = -ny
      // Push past ~72% of the stick's travel to sprint.
      input.sprint = Math.hypot(nx, ny) > 0.72
    }

    const release = () => {
      active.current = null
      setKnob({ x: 0, y: 0 })
      input.right = 0
      input.forward = 0
      input.sprint = false
    }

    const onDown = (e: PointerEvent) => {
      if (active.current !== null) return
      if (isInputFrozen()) return
      active.current = e.pointerId
      const r = el.getBoundingClientRect()
      origin.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      set(e.clientX - origin.current.x, e.clientY - origin.current.y)
      el.setPointerCapture(e.pointerId)
      e.preventDefault()
    }

    const onMove = (e: PointerEvent) => {
      if (active.current !== e.pointerId) return
      set(e.clientX - origin.current.x, e.clientY - origin.current.y)
      e.preventDefault()
    }

    const onUp = (e: PointerEvent) => {
      if (active.current !== e.pointerId) return
      release()
    }

    el.addEventListener('pointerdown', onDown)
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
    window.addEventListener('blur', release)

    return () => {
      el.removeEventListener('pointerdown', onDown)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      window.removeEventListener('blur', release)
      release()
    }
  }, [])

  const pushed = Math.hypot(knob.x, knob.y) / MAX

  return (
    <div
      ref={base}
      data-ui
      className="relative touch-none rounded-full border border-white/20 bg-black/35 backdrop-blur-sm"
      style={{ width: BASE, height: BASE }}
    >
      {/* Sprint threshold ring */}
      <div
        className="pointer-events-none absolute rounded-full border border-dashed transition-colors"
        style={{
          inset: 10,
          borderColor: pushed > 0.72 ? 'rgba(240,169,46,0.7)' : 'rgba(255,255,255,0.12)',
        }}
      />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center font-mono text-[9px] uppercase tracking-[0.2em] text-white/20">
        {pushed > 0.72 ? '' : 'move'}
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border-2 transition-colors"
        style={{
          width: KNOB,
          height: KNOB,
          marginLeft: -KNOB / 2,
          marginTop: -KNOB / 2,
          transform: `translate(${knob.x}px, ${knob.y}px)`,
          background: pushed > 0.72 ? 'rgba(240,169,46,0.32)' : 'rgba(255,255,255,0.16)',
          borderColor: pushed > 0.72 ? '#f0a92e' : 'rgba(255,255,255,0.45)',
          boxShadow: pushed > 0.72 ? '0 0 20px rgba(240,169,46,0.5)' : 'none',
        }}
      />
    </div>
  )
}

function ActionButton({
  label,
  onPress,
  accent,
  size = 62,
}: {
  label: string
  onPress: () => void
  accent?: string
  size?: number
}) {
  return (
    <button
      data-ui
      onPointerDown={(e) => {
        e.preventDefault()
        onPress()
      }}
      className="flex touch-none items-center justify-center rounded-full border-2 font-stencil uppercase
                 tracking-[0.12em] backdrop-blur-sm transition-transform active:scale-90"
      style={{
        width: size,
        height: size,
        fontSize: size > 58 ? 12 : 11,
        borderColor: accent ?? 'rgba(255,255,255,0.35)',
        background: accent ? `${accent}2e` : 'rgba(0,0,0,0.35)',
        color: accent ?? 'rgba(255,255,255,0.8)',
        boxShadow: accent ? `0 0 22px ${accent}55` : 'none',
      }}
    >
      {label}
    </button>
  )
}

export function MobileControls() {
  const isMobile = useGameStore((s) => s.isMobile)
  const phase = useGameStore((s) => s.phase)
  const activeHouse = useGameStore((s) => s.activeHouse)
  const mapOpen = useGameStore((s) => s.mapOpen)
  const nearHouse = useGameStore((s) => s.nearHouse)
  const openHouse = useGameStore((s) => s.openHouse)

  if (!isMobile || phase !== 'playing' || activeHouse !== null || mapOpen) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 select-none safe-b">
      <div className="pointer-events-none flex items-end justify-between px-5 pb-6">
        <div className="pointer-events-auto">
          <Joystick />
        </div>

        <div className="pointer-events-auto flex flex-col items-end gap-3">
          {/* Aim is a hold, so it needs up/cancel as well as down — the shared
              ActionButton only fires on press. */}
          <div className="flex items-end gap-3">
            <button
              data-ui
              onPointerDown={(e) => {
                e.preventDefault()
                input.aim = true
              }}
              onPointerUp={() => (input.aim = false)}
              onPointerCancel={() => (input.aim = false)}
              onPointerLeave={() => (input.aim = false)}
              className="flex h-[52px] w-[52px] touch-none items-center justify-center rounded-full
                         border-2 border-white/35 bg-black/35 font-stencil text-[11px] uppercase
                         tracking-[0.12em] text-white/80 backdrop-blur-sm transition-transform active:scale-90"
            >
              AIM
            </button>
            <ActionButton
              label="FIRE"
              accent="#e05c5c"
              size={58}
              onPress={() => {
                input.firePressed = true
              }}
            />
          </div>

          <div className="flex items-end gap-3">
            <ActionButton label="JUMP" onPress={() => (input.jump = true)} size={56} />
            <ActionButton
              label={nearHouse ? 'OPEN' : '—'}
              accent={nearHouse ? '#f0a92e' : undefined}
              size={72}
              onPress={() => {
                if (!nearHouse) return
                playClick()
                openHouse(nearHouse)
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
