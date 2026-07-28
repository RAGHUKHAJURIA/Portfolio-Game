import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { houseById, houses } from '../../data/portfolioData'
import { useGameStore } from '../../store/useGameStore'
import { playClick, playClose } from '../../lib/audio'
import { AboutPanel } from './panels/AboutPanel'
import { ProjectsPanel } from './panels/ProjectsPanel'
import { SkillsPanel } from './panels/SkillsPanel'
import { ExperiencePanel } from './panels/ExperiencePanel'
import { ContactPanel } from './panels/ContactPanel'

export function SectionModal() {
  const activeHouse = useGameStore((s) => s.activeHouse)
  const subIndex = useGameStore((s) => s.subIndex)
  const closeHouse = useGameStore((s) => s.closeHouse)
  const openHouse = useGameStore((s) => s.openHouse)
  const scroller = useRef<HTMLDivElement>(null)

  const meta = activeHouse ? houseById[activeHouse] : null

  // Reset scroll when switching section or drilling into a crate.
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [activeHouse, subIndex])

  const close = () => {
    playClose()
    closeHouse()
  }

  const index = meta ? houses.findIndex((h) => h.id === meta.id) : -1
  const prev = index > 0 ? houses[index - 1] : houses[houses.length - 1]
  const next = index >= 0 ? houses[(index + 1) % houses.length] : houses[0]

  return (
    <AnimatePresence>
      {meta && (
        <motion.div
          data-ui
          className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, pointerEvents: 'auto' }}
          // Stop the scrim swallowing clicks while it fades out — otherwise a
          // fast "close this, open that" lands on a panel that's already gone.
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.22 }}
        >
          {/* Scrim */}
          <div
            className="absolute inset-0 bg-black/65 backdrop-blur-[3px]"
            onClick={close}
            aria-hidden
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={meta.label}
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 550) close()
            }}
            className="relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden
                       border bg-steel-900/95 shadow-2xl sm:max-h-[86vh]"
            style={{
              borderColor: `${meta.color}66`,
              boxShadow: `0 0 0 1px ${meta.color}22, 0 30px 90px rgba(0,0,0,0.75), 0 0 90px ${meta.color}1f`,
            }}
          >
            {/* Grab handle (mobile) */}
            <div className="flex justify-center pt-2 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-white/25" />
            </div>

            {/* Header */}
            <div
              className="relative shrink-0 border-b px-5 pb-4 pt-4 sm:px-7"
              style={{
                borderColor: `${meta.color}33`,
                background: `linear-gradient(180deg, ${meta.color}14, transparent)`,
              }}
            >
              <div className="scanlines pointer-events-none absolute inset-0 opacity-50" />

              <div className="relative flex items-start gap-3.5">
                <span
                  className="flex h-12 w-12 shrink-0 items-center justify-center border text-2xl"
                  style={{
                    borderColor: meta.color,
                    background: `${meta.color}1a`,
                    boxShadow: `0 0 24px ${meta.color}55`,
                  }}
                >
                  {meta.icon}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="font-mono text-[9px] uppercase tracking-[0.26em]"
                      style={{ color: meta.color }}
                    >
                      {meta.sublabel}
                    </span>
                    <span className="h-px flex-1" style={{ background: `${meta.color}33` }} />
                  </div>
                  <h2 className="hud-title mt-0.5 text-2xl font-bold leading-tight text-white sm:text-3xl">
                    {meta.label}
                  </h2>
                </div>

                <button
                  onClick={close}
                  aria-label="Close"
                  className="flex h-9 w-9 shrink-0 items-center justify-center border border-white/15
                             text-white/50 transition-colors hover:border-white/40 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Body */}
            <div ref={scroller} className="panel-scroll flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {meta.id === 'about' && <AboutPanel color={meta.color} />}
              {meta.id === 'projects' && <ProjectsPanel />}
              {meta.id === 'skills' && <SkillsPanel color={meta.color} />}
              {meta.id === 'experience' && <ExperiencePanel color={meta.color} />}
              {meta.id === 'contact' && <ContactPanel color={meta.color} />}
            </div>

            {/* Footer: jump between sections without walking back */}
            <div className="flex shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-black/30 px-4 py-2.5 safe-b sm:px-6">
              <button
                onClick={() => {
                  playClick()
                  openHouse(prev.id)
                }}
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
              >
                ← {prev.label}
              </button>

              <button
                onClick={close}
                className="border border-white/15 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/50 transition-colors hover:border-white/35 hover:text-white"
              >
                <span className="hidden sm:inline">esc · </span>back to island
              </button>

              <button
                onClick={() => {
                  playClick()
                  openHouse(next.id)
                }}
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-white/40 transition-colors hover:text-white"
              >
                {next.label} →
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
