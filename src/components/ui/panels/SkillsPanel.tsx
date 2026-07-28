import { motion } from 'framer-motion'
import { loadout } from '../../../data/portfolioData'

/** Skills as an equipment loadout — gear slots rather than a bullet list. */
export function SkillsPanel({ color }: { color: string }) {
  return (
    <div className="space-y-5">
      <p className="text-[13px] leading-relaxed text-white/55">
        Current loadout. Bars are honest self-assessment, not marketing — five means I've shipped
        production work with it, three means I'm competent and still learning.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {loadout.map((slot, si) => (
          <motion.div
            key={slot.slot}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: si * 0.06 }}
            className="clip-panel border border-white/10 bg-white/[0.03] p-3.5"
          >
            <div className="mb-3 flex items-center gap-2.5 border-b border-white/10 pb-2">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center border text-base"
                style={{ borderColor: `${color}55`, background: `${color}14` }}
              >
                {slot.icon}
              </span>
              <span className="min-w-0">
                <span
                  className="block font-mono text-[9px] uppercase tracking-[0.26em]"
                  style={{ color }}
                >
                  {slot.slot}
                </span>
                <span className="hud-title block text-[13px] font-semibold text-white/85">
                  {slot.category}
                </span>
              </span>
            </div>

            <div className="space-y-2">
              {slot.items.map((item, ii) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-[112px] shrink-0 truncate font-mono text-[11px] text-white/70"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                  <span className="flex flex-1 gap-[3px]">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <motion.span
                        key={n}
                        initial={{ opacity: 0, scaleX: 0 }}
                        animate={{ opacity: 1, scaleX: 1 }}
                        transition={{ delay: si * 0.06 + ii * 0.03 + n * 0.02, duration: 0.2 }}
                        className="h-[7px] flex-1 origin-left"
                        style={{
                          background: n <= item.level ? color : 'rgba(255,255,255,0.08)',
                          boxShadow: n <= item.level ? `0 0 6px ${color}66` : 'none',
                        }}
                      />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div
        className="flex items-center justify-between border-l-2 bg-white/[0.03] px-4 py-3"
        style={{ borderColor: color }}
      >
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/50">
          total gear slots equipped
        </span>
        <span className="font-stencil text-xl font-bold" style={{ color }}>
          {loadout.reduce((n, s) => n + s.items.length, 0)}
        </span>
      </div>
    </div>
  )
}
