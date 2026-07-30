import { AnimatePresence, motion } from 'framer-motion'
import { houseById } from '../../data/portfolioData'
import { useGameStore } from '../../store/useGameStore'
import { playOpen } from '../../lib/audio'

/** Top-centre "[E] Open" callout while the player stands in a content trigger. */
export function InteractionPrompt() {
  const nearHouse = useGameStore((s) => s.nearHouse)
  const activeHouse = useGameStore((s) => s.activeHouse)
  const mapOpen = useGameStore((s) => s.mapOpen)
  const phase = useGameStore((s) => s.phase)
  const isMobile = useGameStore((s) => s.isMobile)
  const openHouse = useGameStore((s) => s.openHouse)

  const show = nearHouse !== null && activeHouse === null && !mapOpen && phase === 'playing'
  const meta = nearHouse ? houseById[nearHouse] : null

  return (
    <AnimatePresence>
      {show && meta && (
        <motion.div
          key={meta.id}
          data-ui
          data-testid="interact-prompt"
          initial={{ opacity: 0, y: -14, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 380, damping: 26 }}
          className="pointer-events-none fixed left-1/2 top-[13%] z-30 -translate-x-1/2"
        >
          <button
            onClick={() => {
              openHouse(meta.id)
              playOpen()
            }}
            className="pointer-events-auto flex items-center gap-3 border bg-steel-900/85 px-5 py-3
                       backdrop-blur-md transition-transform active:scale-95"
            style={{
              borderColor: meta.color,
              boxShadow: `0 0 34px ${meta.color}44, 0 8px 26px rgba(0,0,0,0.5)`,
            }}
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border text-lg"
              style={{ borderColor: `${meta.color}88`, background: `${meta.color}1f` }}
            >
              {meta.icon}
            </span>

            <span className="text-left">
              <span className="block font-mono text-[9px] uppercase tracking-[0.24em] text-white/45">
                {meta.sublabel}
              </span>
              <span
                className="hud-title block text-lg font-semibold leading-tight"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
            </span>

            <span className="ml-2 flex items-center gap-2 border-l border-white/15 pl-3">
              {isMobile ? (
                <span className="key-cap px-3 animate-pulse">TAP</span>
              ) : (
                <>
                  <span className="key-cap animate-pulse">E</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/55">
                    open
                  </span>
                </>
              )}
            </span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
