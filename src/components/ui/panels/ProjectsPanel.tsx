import { AnimatePresence, motion } from 'framer-motion'
import { projects } from '../../../data/portfolioData'
import type { Project } from '../../../data/portfolioData'
import { useGameStore } from '../../../store/useGameStore'
import { playClick, playOpen } from '../../../lib/audio'

const RARITY: Record<Project['rarity'], { label: string; color: string }> = {
  legendary: { label: 'Legendary', color: '#f0a92e' },
  epic: { label: 'Epic', color: '#a678f0' },
  rare: { label: 'Rare', color: '#4aa8f0' },
  common: { label: 'Common', color: '#9aa0a6' },
}

function CrateCard({ p, index, onOpen }: { p: Project; index: number; onOpen: () => void }) {
  const r = RARITY[p.rarity]
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045 }}
      onClick={onOpen}
      data-testid="crate-card"
      className="group relative overflow-hidden border border-white/10 bg-white/[0.03] p-4 text-left
                 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
      style={{ borderTopColor: r.color, borderTopWidth: 2 }}
    >
      {/* Sweep */}
      <span
        className="pointer-events-none absolute inset-0 -translate-x-full transition-transform duration-700 group-hover:translate-x-full"
        style={{ background: `linear-gradient(90deg, transparent, ${r.color}22, transparent)` }}
      />

      <div className="relative flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-mono text-[9px] uppercase tracking-[0.2em]"
              style={{ color: r.color }}
            >
              {p.crate}
            </span>
            <span className="h-px w-4" style={{ background: `${r.color}66` }} />
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/30">
              {r.label}
            </span>
          </div>
          <h4 className="hud-title mt-1.5 truncate text-base font-semibold text-white">
            {p.name}
          </h4>
          <p className="mt-0.5 truncate font-mono text-[11px] text-white/45">{p.short}</p>
          {p.status && (
            <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[0.14em] text-white/30">
              {p.status}
            </p>
          )}
        </div>

        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center border text-xl transition-transform group-hover:scale-110"
          style={{ borderColor: `${r.color}55`, background: `${r.color}14` }}
        >
          📦
        </span>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1">
        {p.stack.slice(0, 4).map((s) => (
          <span
            key={s}
            className="border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/50"
          >
            {s}
          </span>
        ))}
        {p.stack.length > 4 && (
          <span className="px-1.5 py-0.5 font-mono text-[9px] text-white/30">
            +{p.stack.length - 4}
          </span>
        )}
      </div>

      <div
        className="relative mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] transition-colors"
        style={{ color: `${r.color}bb` }}
      >
        open crate
        <span className="transition-transform group-hover:translate-x-1">→</span>
      </div>
    </motion.button>
  )
}

function Detail({ p, onBack }: { p: Project; onBack: () => void }) {
  const r = RARITY[p.rarity]
  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -24 }}
      transition={{ duration: 0.22 }}
      className="space-y-5"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/45 transition-colors hover:text-white"
      >
        <span>←</span> back to crates
      </button>

      <div className="border-l-2 pl-4" style={{ borderColor: r.color }}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{ color: r.color, borderColor: `${r.color}66`, background: `${r.color}14` }}
          >
            {r.label}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/30">
            crate · {p.crate}
          </span>
          {p.status && (
            <span className="border border-white/15 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white/50">
              {p.status}
            </span>
          )}
        </div>
        <h3 className="hud-title mt-1.5 text-2xl font-bold text-white sm:text-3xl">{p.name}</h3>
        <p className="mt-2 text-[13.5px] leading-relaxed text-white/70">{p.summary}</p>
      </div>

      <div>
        <div className="hud-label mb-2.5 border-b border-white/10 pb-1.5">what's inside</div>
        <ul className="space-y-2.5">
          {p.bullets.map((b, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex gap-3 text-[13px] leading-relaxed text-white/70"
            >
              <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: r.color }} />
              <span>{b}</span>
            </motion.li>
          ))}
        </ul>
      </div>

      <div>
        <div className="hud-label mb-2.5 border-b border-white/10 pb-1.5">attachments</div>
        <div className="flex flex-wrap gap-1.5">
          {p.stack.map((s) => (
            <span
              key={s}
              className="border border-white/12 bg-white/[0.04] px-2 py-1 font-mono text-[10px] text-white/65"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      {p.links.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {p.links.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer noopener"
              className="border px-4 py-2 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors"
              style={{ color: r.color, borderColor: `${r.color}66` }}
            >
              {l.label} ↗
            </a>
          ))}
        </div>
      ) : (
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/25">
          links coming soon
        </p>
      )}
    </motion.div>
  )
}

export function ProjectsPanel() {
  const subIndex = useGameStore((s) => s.subIndex)
  const setSubIndex = useGameStore((s) => s.setSubIndex)
  const active = subIndex !== null ? projects[subIndex] : null

  return (
    <AnimatePresence mode="wait">
      {active ? (
        <Detail
          key="detail"
          p={active}
          onBack={() => {
            playClick()
            setSubIndex(null)
          }}
        />
      ) : (
        <motion.div
          key="grid"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, x: 24 }}
          transition={{ duration: 0.2 }}
        >
          <p className="mb-4 text-[13px] leading-relaxed text-white/55">
            {projects.length} supply crates recovered from the warehouse. Open one to see what's
            inside.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {projects.map((p, i) => (
              <CrateCard
                key={p.id}
                p={p}
                index={i}
                onOpen={() => {
                  playOpen()
                  setSubIndex(i)
                }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
