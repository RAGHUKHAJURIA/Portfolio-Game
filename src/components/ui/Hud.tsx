import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Minimap } from './Minimap'
import { houses, profile } from '../../data/portfolioData'
import { useGameStore } from '../../store/useGameStore'
import { playClick, setMuted } from '../../lib/audio'

function ControlsLegend() {
  const hasMoved = useGameStore((s) => s.hasMoved)
  const isMobile = useGameStore((s) => s.isMobile)
  const [open, setOpen] = useState(true)
  const [autoClosed, setAutoClosed] = useState(false)

  // Fade out a few seconds after the player first moves — they've got it.
  // Only ever auto-closes once, so re-opening it manually sticks.
  useEffect(() => {
    if (!hasMoved || autoClosed) return
    const t = setTimeout(() => {
      setOpen(false)
      setAutoClosed(true)
    }, 6000)
    return () => clearTimeout(t)
  }, [hasMoved, autoClosed])

  const rows = isMobile
    ? [
        { k: ['STICK'], label: 'move' },
        { k: ['DRAG'], label: 'look around' },
        { k: ['JUMP'], label: 'jump' },
        { k: ['TAP'], label: 'enter building' },
      ]
    : [
        { k: ['W', 'A', 'S', 'D'], label: 'move' },
        { k: ['SHIFT'], label: 'sprint' },
        { k: ['SPACE'], label: 'jump' },
        { k: ['DRAG'], label: 'look around' },
        { k: ['SCROLL'], label: 'zoom' },
        { k: ['E'], label: 'enter building' },
        { k: ['ESC'], label: 'close panel' },
      ]

  return (
    <div data-ui className="flex flex-col items-end gap-1.5">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 18 }}
            transition={{ duration: 0.3 }}
            className="hud-panel clip-panel px-3.5 py-3"
          >
            <div className="hud-label mb-2 border-b border-white/10 pb-1.5">controls</div>
            <div className="space-y-1.5">
              {rows.map((r) => (
                <div key={r.label} className="flex items-center justify-end gap-2.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
                    {r.label}
                  </span>
                  <span className="flex gap-1">
                    {r.k.map((key) => (
                      <span key={key} className="key-cap">
                        {key}
                      </span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          playClick()
          setAutoClosed(true)
          setOpen((o) => !o)
        }}
        className="hud-panel px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-white/45
                   transition-colors hover:text-white/80"
      >
        {open ? 'hide' : 'controls'}
      </button>
    </div>
  )
}

function ObjectiveTracker() {
  const visited = useGameStore((s) => s.visited)
  const openHouse = useGameStore((s) => s.openHouse)
  const found = houses.filter((h) => visited[h.id]).length
  const done = found === houses.length

  return (
    <div data-ui className="hud-panel clip-panel w-[190px] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-1.5">
        <span className="hud-label">objectives</span>
        <span
          className={`font-mono text-[11px] font-bold tabular-nums ${
            done ? 'text-emerald-400' : 'text-flare'
          }`}
        >
          {found}/{houses.length}
        </span>
      </div>

      <div className="space-y-1">
        {houses.map((h) => {
          const seen = visited[h.id]
          return (
            <button
              key={h.id}
              onClick={() => {
                playClick()
                openHouse(h.id)
              }}
              className="group flex w-full items-center gap-2 rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-white/5"
              title={`Open ${h.label}`}
            >
              <span
                className="h-1.5 w-1.5 shrink-0 rotate-45 transition-all"
                style={{
                  background: seen ? h.color : 'transparent',
                  border: `1px solid ${h.color}`,
                  boxShadow: seen ? `0 0 8px ${h.color}` : 'none',
                }}
              />
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.13em] transition-colors ${
                  seen ? 'text-white/70 line-through decoration-white/25' : 'text-white/45'
                } group-hover:text-white`}
              >
                {h.label}
              </span>
            </button>
          )
        })}
      </div>

      {done && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-2 border-t border-white/10 pt-1.5 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-emerald-400"
        >
          winner winner ✓
        </motion.div>
      )}
    </div>
  )
}

function TopBar() {
  const muted = useGameStore((s) => s.muted)
  const toggleMute = useGameStore((s) => s.toggleMute)

  useEffect(() => {
    setMuted(muted)
  }, [muted])

  return (
    <div data-ui className="pointer-events-auto flex items-center gap-2">
      <div className="hud-panel clip-tag flex items-center gap-2.5 px-3 py-1.5">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
        <span className="font-stencil text-[13px] uppercase tracking-[0.2em] text-white/85">
          {profile.callsign}
        </span>
        <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-white/35 sm:inline">
          {profile.location}
        </span>
      </div>

      <button
        onClick={() => {
          playClick()
          toggleMute()
        }}
        className="hud-panel flex h-[30px] w-[30px] items-center justify-center text-sm text-white/60 transition-colors hover:text-white"
        title={muted ? 'Unmute' : 'Mute'}
      >
        {muted ? '🔇' : '🔊'}
      </button>
    </div>
  )
}

export function Hud() {
  const phase = useGameStore((s) => s.phase)
  const activeHouse = useGameStore((s) => s.activeHouse)
  const isMobile = useGameStore((s) => s.isMobile)
  const visible = phase === 'playing' && activeHouse === null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="pointer-events-none fixed inset-0 z-20"
        >
          {/* Top-left */}
          <div className="absolute left-4 top-4">
            <TopBar />
          </div>

          {/* Top-right objectives */}
          <div className="pointer-events-auto absolute right-4 top-4">
            <ObjectiveTracker />
          </div>

          {/* Bottom-left minimap */}
          <div
            className={`pointer-events-auto absolute left-4 ${
              isMobile ? 'bottom-[11.5rem]' : 'bottom-4'
            }`}
          >
            {/* 150px eats 38% of a 390px-wide phone — scale it down there. */}
            <Minimap size={isMobile ? 108 : 150} />
          </div>

          {/* Bottom-right controls */}
          {!isMobile && (
            <div className="pointer-events-auto absolute bottom-4 right-4">
              <ControlsLegend />
            </div>
          )}

          {/* Crosshair-ish centre tick */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-25">
            <div className="h-3 w-px bg-white/70" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
