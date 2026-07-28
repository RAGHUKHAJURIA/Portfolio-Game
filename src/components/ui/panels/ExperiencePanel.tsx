import { motion } from 'framer-motion'
import { timeline } from '../../../data/portfolioData'

const KIND_META = {
  education: { icon: '🎓', label: 'Education' },
  experience: { icon: '💼', label: 'Experience' },
  achievement: { icon: '🏅', label: 'Field Work' },
} as const

export function ExperiencePanel({ color }: { color: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-white/55">
        Training record — coursework, research, and the things I built outside of it.
      </p>

      <div className="relative">
        {/* Spine */}
        <div
          className="absolute bottom-3 left-[15px] top-3 w-px"
          style={{ background: `linear-gradient(180deg, ${color}, ${color}22)` }}
        />

        <div className="space-y-5">
          {timeline.map((e, i) => {
            const meta = KIND_META[e.kind]
            return (
              <motion.div
                key={`${e.org}-${i}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08 }}
                className="relative pl-11"
              >
                {/* Node */}
                <span
                  className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm"
                  style={{
                    borderColor: color,
                    background: '#12161b',
                    boxShadow: `0 0 14px ${color}55`,
                  }}
                >
                  {meta.icon}
                </span>

                <div className="border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]"
                      style={{ color, borderColor: `${color}55`, background: `${color}12` }}
                    >
                      {meta.label}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/40">
                      {e.period}
                    </span>
                  </div>

                  <h4 className="hud-title mt-2 text-base font-semibold text-white">{e.title}</h4>
                  <p className="mt-0.5 font-mono text-[11px] text-white/50">
                    {e.org}
                    {e.location ? ` · ${e.location}` : ''}
                  </p>

                  <ul className="mt-3 space-y-2">
                    {e.points.map((p, k) => (
                      <li key={k} className="flex gap-2.5 text-[13px] leading-relaxed text-white/68">
                        <span
                          className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45"
                          style={{ background: color }}
                        />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>

                  {e.tags && e.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {e.tags.map((t) => (
                        <span
                          key={t}
                          className="border border-white/10 bg-black/30 px-1.5 py-0.5 font-mono text-[9px] text-white/50"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
