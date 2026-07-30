import { useEffect, useRef } from 'react'
import { playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'

/**
 * Aiming reticle and range scoreboard.
 *
 * Driven from `playerState.aim` on rAF rather than React state — aiming is a
 * per-frame value and pushing it through the store would re-render the HUD
 * sixty times a second for an opacity change.
 */
export function Crosshair() {
  const wrap = useRef<HTMLDivElement>(null)
  const phase = useGameStore((s) => s.phase)
  const shots = useGameStore((s) => s.shots)
  const hits = useGameStore((s) => s.hits)

  useEffect(() => {
    let raf = 0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const el = wrap.current
      if (!el) return
      const a = playerState.aim
      el.style.opacity = String(a)
      // Reticle tightens as the weapon comes up.
      el.style.transform = `translate(-50%, -50%) scale(${1.5 - a * 0.5})`
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  if (phase !== 'playing') return null

  return (
    <>
      <div
        ref={wrap}
        className="pointer-events-none fixed left-1/2 top-1/2 z-20"
        style={{ opacity: 0 }}
      >
        <div className="relative h-8 w-8">
          {/* Four ticks and a centre dot — no circle, so it never hides the
              thing being aimed at. */}
          <span className="absolute left-1/2 top-0 h-2.5 w-px -translate-x-1/2 bg-white/90" />
          <span className="absolute bottom-0 left-1/2 h-2.5 w-px -translate-x-1/2 bg-white/90" />
          <span className="absolute left-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-white/90" />
          <span className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-white/90" />
          <span className="absolute left-1/2 top-1/2 h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-flare" />
        </div>
      </div>

      {/* Scoreboard, only once the player has actually taken a shot. */}
      {shots > 0 && (
        <div
          data-ui
          className="hud-panel clip-tag pointer-events-none fixed left-1/2 top-4 z-20
                     -translate-x-1/2 px-3 py-1.5"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
            range
          </span>
          <span className="ml-2 font-mono text-[12px] font-bold tabular-nums text-flare">
            {hits}
            <span className="text-white/35"> / {shots}</span>
          </span>
        </div>
      )}
    </>
  )
}
