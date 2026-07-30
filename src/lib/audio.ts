/**
 * Synthesised audio. Every sound here is generated with the Web Audio API —
 * no .mp3/.wav downloads, nothing to license, nothing to wait on during load.
 * Footsteps are filtered noise bursts, UI blips are short FM tones, and the
 * ambient bed is looping pink-ish noise through a slow LFO'd filter.
 */

let ctx: AudioContext | null = null
let master: GainNode | null = null
let ambientGain: GainNode | null = null
let noiseBuffer: AudioBuffer | null = null
let started = false
let muted = false

function ensure(): AudioContext | null {
  if (typeof window === 'undefined') return null
  // Browsers refuse to start an AudioContext outside a user gesture and log a
  // warning if you try. Nothing constructs one until initAudio() runs from the
  // DROP IN click.
  if (!started) return null
  if (!ctx) {
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = muted ? 0 : 0.55
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function getNoise(c: AudioContext): AudioBuffer {
  if (noiseBuffer) return noiseBuffer
  const len = c.sampleRate * 2
  const buf = c.createBuffer(1, len, c.sampleRate)
  const data = buf.getChannelData(0)
  let b0 = 0
  let b1 = 0
  let b2 = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    // Cheap pink-ish filtering — plain white noise sounds like a hiss.
    b0 = 0.99765 * b0 + white * 0.099
    b1 = 0.963 * b1 + white * 0.2965
    b2 = 0.57 * b2 + white * 1.0526
    data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.22
  }
  noiseBuffer = buf
  return buf
}

/** Must be called from a user gesture (the DROP IN button). */
export function initAudio() {
  if (started) return
  started = true
  if (!ensure()) {
    started = false
    return
  }
  startAmbient()
}

export function setMuted(m: boolean) {
  muted = m
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.55, ctx.currentTime, 0.05)
}

function startAmbient() {
  const c = ensure()
  if (!c || !master || ambientGain) return

  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  src.loop = true

  const filter = c.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.value = 420
  filter.Q.value = 0.6

  ambientGain = c.createGain()
  ambientGain.gain.value = 0
  ambientGain.gain.setTargetAtTime(0.16, c.currentTime, 2)

  // Slow gusting.
  const lfo = c.createOscillator()
  lfo.frequency.value = 0.06
  const lfoGain = c.createGain()
  lfoGain.gain.value = 190
  lfo.connect(lfoGain)
  lfoGain.connect(filter.frequency)
  lfo.start()

  src.connect(filter)
  filter.connect(ambientGain)
  ambientGain.connect(master)
  src.start()
}

function burst(opts: {
  freq: number
  q: number
  dur: number
  gain: number
  type?: BiquadFilterType
}) {
  const c = ensure()
  if (!c || !master) return
  const src = c.createBufferSource()
  src.buffer = getNoise(c)
  const offset = Math.random() * 1.5

  const filter = c.createBiquadFilter()
  filter.type = opts.type ?? 'bandpass'
  filter.frequency.value = opts.freq
  filter.Q.value = opts.q

  const g = c.createGain()
  const t = c.currentTime
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(opts.gain, t + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, t + opts.dur)

  src.connect(filter)
  filter.connect(g)
  g.connect(master)
  src.start(t, offset, opts.dur + 0.05)
  src.stop(t + opts.dur + 0.05)
}

function tone(freq: number, dur: number, gain = 0.12, type: OscillatorType = 'sine', slideTo?: number) {
  const c = ensure()
  if (!c || !master) return
  const osc = c.createOscillator()
  osc.type = type
  const t = c.currentTime
  osc.frequency.setValueAtTime(freq, t)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur)

  const g = c.createGain()
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(gain, t + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)

  osc.connect(g)
  g.connect(master)
  osc.start(t)
  osc.stop(t + dur + 0.02)
}

export const playFootstep = (running: boolean) =>
  burst({
    freq: 240 + Math.random() * 190,
    q: 0.9,
    dur: running ? 0.13 : 0.1,
    gain: running ? 0.2 : 0.13,
  })

export const playJump = () => tone(320, 0.14, 0.07, 'triangle', 520)

export const playLand = () => {
  burst({ freq: 150, q: 0.7, dur: 0.22, gain: 0.26, type: 'lowpass' })
  tone(90, 0.16, 0.08, 'sine', 60)
}

export const playPrompt = () => tone(880, 0.07, 0.045, 'sine', 1180)

export const playOpen = () => {
  tone(392, 0.16, 0.075, 'triangle', 784)
  setTimeout(() => tone(587, 0.2, 0.055, 'sine'), 70)
}

export const playClose = () => tone(520, 0.14, 0.05, 'triangle', 300)

export const playClick = () => tone(1100, 0.045, 0.05, 'square', 900)

/**
 * Gunshot: a hard noise crack over a short low thump, deliberately quiet.
 * A portfolio should not blast a recruiter's laptop, and the HUD mute toggle
 * covers the rest.
 */
export const playShot = () => {
  burst({ freq: 2000, q: 0.35, dur: 0.09, gain: 0.16, type: 'highpass' })
  burst({ freq: 180, q: 0.6, dur: 0.16, gain: 0.13, type: 'lowpass' })
  tone(150, 0.09, 0.05, 'square', 60)
}

/** Metallic ping on a target hit — the reward sound, so it reads clearly. */
export const playHit = () => {
  tone(1560, 0.11, 0.06, 'square', 2300)
  setTimeout(() => tone(2100, 0.09, 0.035, 'sine'), 35)
}

/** Dull thud for a shot that hit scenery rather than a target. */
export const playImpact = () =>
  burst({ freq: 420, q: 0.8, dur: 0.11, gain: 0.09, type: 'lowpass' })

export const playDrop = () => {
  tone(120, 1.2, 0.1, 'sawtooth', 60)
  burst({ freq: 700, q: 0.4, dur: 1.6, gain: 0.18, type: 'lowpass' })
}
