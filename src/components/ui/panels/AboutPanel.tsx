import { motion } from 'framer-motion'
import { about, profile } from '../../../data/portfolioData'

export function AboutPanel({ color }: { color: string }) {
  return (
    <div className="space-y-7">
      {/* Hook */}
      <motion.blockquote
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="brackets px-5 py-4 text-lg leading-snug text-white/90 sm:text-xl"
        style={{ color }}
      >
        <span className="font-stencil tracking-wide text-white">“{about.hook}”</span>
      </motion.blockquote>

      {/* Stat block */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {about.stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * i }}
            className="clip-tag border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <div className="hud-label">{s.label}</div>
            <div className="mt-0.5 flex items-baseline gap-1">
              <span
                className="font-stencil text-2xl font-bold leading-none"
                style={{ color }}
              >
                {s.value}
              </span>
              <span className="font-mono text-[10px] text-white/35">{s.sub}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Body */}
      <div className="space-y-3.5">
        {about.paragraphs.map((p, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.08 + 0.06 * i }}
            className="text-[13.5px] leading-relaxed text-white/70"
          >
            {p}
          </motion.p>
        ))}
      </div>

      {/* Interests */}
      <div>
        <div className="hud-label mb-2.5 border-b border-white/10 pb-1.5">focus areas</div>
        <div className="grid gap-2 sm:grid-cols-3">
          {about.interests.map((it, i) => (
            <motion.div
              key={it.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.16 + 0.05 * i }}
              className="flex items-start gap-2.5 border border-white/10 bg-white/[0.03] px-3 py-2.5"
            >
              <span className="text-lg leading-none">{it.icon}</span>
              <span>
                <span className="block font-stencil text-[13px] uppercase tracking-wide text-white/85">
                  {it.label}
                </span>
                <span className="block font-mono text-[10px] text-white/40">{it.note}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Status strip */}
      <div
        className="flex items-center gap-3 border-l-2 bg-white/[0.03] px-4 py-3"
        style={{ borderColor: color }}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-70"
            style={{ background: color }}
          />
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
        </span>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/65">
          {profile.status}
        </span>
      </div>

      {/* A portfolio inside a portfolio doesn't warrant its own crate, but the
          previous one is worth a line for anyone curious how this evolved. */}
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/30">
        previous portfolio ·{' '}
        <a
          href={profile.previousPortfolio}
          target="_blank"
          rel="noreferrer noopener"
          className="underline decoration-white/20 underline-offset-2 transition-colors hover:text-white/70"
        >
          raghubuilds.vercel.app ↗
        </a>
      </p>
    </div>
  )
}
