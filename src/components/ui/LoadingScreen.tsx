import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useProgress } from '@react-three/drei'
import { useGameStore } from '../../store/useGameStore'
import { profile } from '../../data/portfolioData'
import { initAudio, playDrop } from '../../lib/audio'

const BOOT_LINES = [
  'establishing uplink……… ok',
  'loading terrain heightfield… ok',
  'compiling shaders…………… ok',
  'spawning physics world…… ok',
  'scanning for structures…… 5 found',
  'operator ready.',
]

export function LoadingScreen() {
  const phase = useGameStore((s) => s.phase)
  const setPhase = useGameStore((s) => s.setPhase)
  const isMobile = useGameStore((s) => s.isMobile)
  const { progress, active } = useProgress()

  const [shown, setShown] = useState(0)
  const [minTimeDone, setMinTimeDone] = useState(false)

  // A short floor on the loading time — the scene is procedural and often
  // ready in well under a second, which reads as a broken flash otherwise.
  useEffect(() => {
    const t = setTimeout(() => setMinTimeDone(true), 1400)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (shown >= BOOT_LINES.length) return
    const t = setTimeout(() => setShown((s) => s + 1), 200 + shown * 60)
    return () => clearTimeout(t)
  }, [shown])

  const ready = minTimeDone && !active && shown >= BOOT_LINES.length
  const pct = Math.round(ready ? 100 : Math.min(96, Math.max(progress, shown * 16)))

  useEffect(() => {
    if (ready && phase === 'loading') setPhase('ready')
  }, [ready, phase, setPhase])

  const drop = () => {
    initAudio()
    playDrop()
    setPhase('dropping')
  }

  useEffect(() => {
    if (phase !== 'ready') return
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault()
        drop()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const visible = phase === 'loading' || phase === 'ready'

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          data-ui
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-steel-900"
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.7, ease: 'easeInOut' }}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, #1e2731 0%, #12161b 45%, #080a0d 100%)',
            }}
          />
          <div className="scanlines pointer-events-none absolute inset-0 opacity-60" />
          <div className="vignette pointer-events-none absolute inset-0" />

          {/* Faint contour grid */}
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.07]"
            aria-hidden
          >
            <defs>
              <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
                <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#f0a92e" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>

          <div className="relative flex w-full max-w-xl flex-col items-center px-6">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-1 flex items-center gap-3"
            >
              <span className="h-px w-10 bg-flare/60" />
              <span className="hud-label text-flare/80">drop zone · portfolio</span>
              <span className="h-px w-10 bg-flare/60" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="hud-title text-center text-5xl font-bold leading-none text-white sm:text-7xl"
              style={{ textShadow: '0 0 40px rgba(240,169,46,0.28)' }}
            >
              {profile.name}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-3 text-center font-mono text-[11px] uppercase tracking-[0.3em] text-white/45 sm:text-xs"
            >
              {profile.tagline}
            </motion.p>

            {/* Boot log */}
            <div className="mt-9 h-[104px] w-full max-w-sm font-mono text-[10px] leading-relaxed text-emerald-300/55 sm:text-[11px]">
              {BOOT_LINES.slice(0, shown).map((l) => (
                <motion.div
                  key={l}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2"
                >
                  <span className="text-white/25">›</span>
                  <span>{l}</span>
                </motion.div>
              ))}
            </div>

            {/* Progress */}
            <div className="mt-4 w-full max-w-sm">
              <div className="mb-2 flex items-baseline justify-between">
                <span className="hud-label">deployment</span>
                <span className="font-mono text-sm font-bold text-flare tabular-nums">
                  {pct}%
                </span>
              </div>
              <div className="relative h-[6px] w-full overflow-hidden border border-white/15 bg-black/50">
                <motion.div
                  className="h-full bg-gradient-to-r from-flare-dim via-flare to-flare-glow"
                  animate={{ width: `${pct}%` }}
                  transition={{ ease: 'easeOut', duration: 0.4 }}
                />
                <div className="absolute inset-0 scanlines opacity-40" />
              </div>
            </div>

            {/* Drop button */}
            <div className="mt-10 h-[76px]">
              <AnimatePresence mode="wait">
                {phase === 'ready' ? (
                  <motion.button
                    key="drop"
                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                    onClick={drop}
                    className="group relative overflow-hidden border-2 border-flare bg-flare/10 px-12 py-4
                               font-stencil text-xl font-bold uppercase tracking-[0.3em] text-flare
                               transition-colors hover:bg-flare hover:text-steel-900 sm:text-2xl"
                    style={{ boxShadow: '0 0 44px rgba(240,169,46,0.3)' }}
                  >
                    <span className="relative z-10">Drop In</span>
                    <span className="pointer-events-none absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-full" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="wait"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full items-center font-mono text-[11px] uppercase tracking-[0.28em] text-white/35"
                  >
                    <span className="animate-pulse">preparing drop…</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {phase === 'ready' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-white/30"
              >
                {isMobile ? (
                  'tap to deploy · joystick to move · drag right side to look'
                ) : (
                  <>
                    press <span className="text-white/60">space</span> to deploy ·{' '}
                    <span className="text-white/60">wasd</span> to move ·{' '}
                    <span className="text-white/60">drag</span> to look
                  </>
                )}
              </motion.p>
            )}
          </div>

          <div className="absolute bottom-5 left-0 right-0 px-6 text-center font-mono text-[9px] uppercase tracking-[0.24em] text-white/20">
            no game assets used · everything on this island is procedurally generated
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
