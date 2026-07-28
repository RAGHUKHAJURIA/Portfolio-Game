import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'
import { CHUTE_ALTITUDE } from '../../lib/constants'

/** Altitude readout while the parachute drop plays out. */
export function DropOverlay() {
  const phase = useGameStore((s) => s.phase)
  const [alt, setAlt] = useState(0)
  const raf = useRef(0)

  useEffect(() => {
    if (phase !== 'dropping') return
    const tick = () => {
      raf.current = requestAnimationFrame(tick)
      setAlt(Math.max(0, Math.round(playerState.y * 10)))
    }
    tick()
    return () => cancelAnimationFrame(raf.current)
  }, [phase])

  return (
    <AnimatePresence>
      {phase === 'dropping' && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="vignette absolute inset-0" />

          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="absolute left-1/2 top-[15%] -translate-x-1/2 text-center"
          >
            <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-white/45">
              altitude
            </div>
            <div
              className="font-stencil text-6xl font-bold leading-none text-flare tabular-nums"
              style={{ textShadow: '0 0 32px rgba(240,169,46,0.45)' }}
            >
              {alt}
              <span className="ml-1 text-2xl text-white/40">m</span>
            </div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.24em] text-white/35">
              {alt > CHUTE_ALTITUDE * 10 ? 'free fall' : alt > 8 ? 'chute deployed' : 'touchdown'}
            </div>
          </motion.div>

          {/* Corner framing */}
          {[
            'left-6 top-6 border-l-2 border-t-2',
            'right-6 top-6 border-r-2 border-t-2',
            'left-6 bottom-6 border-b-2 border-l-2',
            'right-6 bottom-6 border-b-2 border-r-2',
          ].map((c) => (
            <span key={c} className={`absolute h-8 w-8 border-flare/40 ${c}`} />
          ))}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="absolute bottom-[16%] left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[9px] uppercase tracking-[0.2em] text-white/30 sm:text-[10px] sm:tracking-[0.28em]"
          >
            landing zone · drop plaza
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
