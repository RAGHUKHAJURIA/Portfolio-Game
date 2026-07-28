import { motion } from 'framer-motion'
import { houses, profile } from '../../data/portfolioData'
import { useGameStore } from '../../store/useGameStore'

/**
 * Served instead of the island when the browser can't do WebGL. Same content,
 * same panels, no 3D — the section modals are plain DOM, so nothing is lost
 * except the walking about.
 */
export function FallbackShell() {
  const openHouse = useGameStore((s) => s.openHouse)
  const visited = useGameStore((s) => s.visited)

  return (
    <div className="absolute inset-0 overflow-y-auto panel-scroll bg-steel-900">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 0%, #1e2731 0%, #12161b 45%, #080a0d 100%)',
        }}
      />
      <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />

      <div className="relative mx-auto flex min-h-full w-full max-w-3xl flex-col px-6 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-2 flex items-center gap-3"
        >
          <span className="h-px w-8 bg-flare/60" />
          <span className="hud-label text-flare/80">drop zone · portfolio</span>
        </motion.div>

        <h1 className="hud-title text-4xl font-bold leading-none text-white sm:text-6xl">
          {profile.name}
        </h1>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.28em] text-white/45">
          {profile.tagline}
        </p>

        <p className="mt-8 max-w-prose text-[13.5px] leading-relaxed text-white/70">
          {profile.hook}
        </p>

        <div
          className="mt-6 border-l-2 border-flare/70 bg-white/[0.03] px-4 py-3 font-mono text-[11px] leading-relaxed text-white/55"
          role="status"
        >
          This portfolio is normally a 3D island you walk around, but your
          browser can't run WebGL — so here are the same five sections as plain
          panels. Everything is here; only the walking is missing.
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {houses.map((h, i) => (
            <motion.button
              key={h.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openHouse(h.id)}
              className="group flex items-center gap-3.5 border border-white/10 bg-white/[0.03] p-4 text-left
                         transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              style={{ borderTopColor: h.color, borderTopWidth: 2 }}
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center border text-xl transition-transform group-hover:scale-110"
                style={{ borderColor: `${h.color}66`, background: `${h.color}16` }}
              >
                {h.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block font-mono text-[9px] uppercase tracking-[0.22em]"
                  style={{ color: h.color }}
                >
                  {h.sublabel}
                </span>
                <span className="hud-title block text-lg font-semibold text-white">
                  {h.label}
                </span>
              </span>
              <span
                className="font-mono text-[10px] uppercase tracking-[0.16em] transition-transform group-hover:translate-x-1"
                style={{ color: `${h.color}bb` }}
              >
                {visited[h.id] ? '✓' : 'open →'}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-2">
          <a
            href={`mailto:${profile.email}`}
            className="border-2 border-flare px-5 py-3 font-stencil text-sm font-semibold uppercase tracking-[0.2em] text-flare transition-colors hover:bg-flare hover:text-steel-900"
          >
            {profile.email}
          </a>
          <a
            href={profile.resumeUrl}
            download
            className="border border-white/15 bg-white/[0.04] px-5 py-3 font-stencil text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors hover:bg-white/[0.09] hover:text-white"
          >
            ⬇ resume
          </a>
        </div>

        <p className="mt-auto pt-12 font-mono text-[9px] uppercase tracking-[0.22em] text-white/20">
          {profile.location} · {profile.status}
        </p>
      </div>
    </div>
  )
}
