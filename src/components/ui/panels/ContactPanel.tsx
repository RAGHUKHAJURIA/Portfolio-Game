import { useState } from 'react'
import { motion } from 'framer-motion'
import { contactChannels, profile } from '../../../data/portfolioData'
import { playClick } from '../../../lib/audio'

export function ContactPanel({ color }: { color: string }) {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = async (value: string, id: string) => {
    playClick()
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1600)
    } catch {
      /* clipboard blocked — the link still works */
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
            style={{ background: color }}
          />
          <span
            className="relative inline-flex h-2.5 w-2.5 rounded-full"
            style={{ background: color }}
          />
        </span>
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/60">
          channel open · accepting transmissions
        </p>
      </div>

      <p className="text-[13.5px] leading-relaxed text-white/70">
        Open to full-time SDE / ML engineering roles and interesting side projects. Fastest way to
        reach me is email — I answer everything.
      </p>

      {/* Channels */}
      <div className="space-y-2">
        {contactChannels.map((ch, i) => (
          <motion.div
            key={ch.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="group flex items-center gap-3 border border-white/10 bg-white/[0.03] p-3 transition-colors hover:bg-white/[0.07]"
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center border font-stencil text-sm font-semibold"
              style={{ borderColor: `${color}55`, background: `${color}14`, color }}
            >
              {ch.icon}
            </span>

            <a
              href={ch.href}
              target={ch.id === 'email' ? undefined : '_blank'}
              rel="noreferrer noopener"
              onClick={() => playClick()}
              className="min-w-0 flex-1"
            >
              <span className="flex items-center gap-2">
                <span className="hud-label">{ch.label}</span>
                <span className="font-mono text-[9px] text-white/20">{ch.freq} MHz</span>
              </span>
              <span className="mt-0.5 block truncate font-mono text-[12px] text-white/80 transition-colors group-hover:text-white">
                {ch.value}
              </span>
            </a>

            <button
              onClick={() => copy(ch.id === 'email' ? profile.email : ch.href, ch.id)}
              className="shrink-0 border border-white/15 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-white/45 transition-colors hover:border-white/35 hover:text-white"
            >
              {copied === ch.id ? '✓ copied' : 'copy'}
            </button>
          </motion.div>
        ))}
      </div>

      {/* Resume */}
      <div className="grid gap-2 sm:grid-cols-2">
        <a
          href={profile.resumeUrl}
          download
          onClick={() => playClick()}
          className="group flex items-center justify-center gap-2.5 border-2 px-5 py-3.5 font-stencil text-sm font-semibold uppercase tracking-[0.2em] transition-colors"
          style={{ color, borderColor: color }}
        >
          <span className="text-base transition-transform group-hover:translate-y-0.5">⬇</span>
          download resume
        </a>
        <a
          href={`mailto:${profile.email}?subject=${encodeURIComponent('Hello from your 3D portfolio')}`}
          onClick={() => playClick()}
          className="flex items-center justify-center gap-2.5 border border-white/15 bg-white/[0.04] px-5 py-3.5 font-stencil text-sm font-semibold uppercase tracking-[0.2em] text-white/80 transition-colors hover:bg-white/[0.09] hover:text-white"
        >
          <span className="text-base">✉</span>
          send a message
        </a>
      </div>

      <div
        className="border-l-2 bg-white/[0.03] px-4 py-3 font-mono text-[10px] uppercase tracking-[0.14em] text-white/45"
        style={{ borderColor: color }}
      >
        based in {profile.location} · open to relocation
      </div>
    </div>
  )
}
