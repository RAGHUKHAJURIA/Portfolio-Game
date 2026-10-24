import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGameStore } from '../../store/useGameStore'
import { initialQuality, type Quality } from '../../lib/quality'

const ORDER: Quality[] = ['low', 'medium', 'high']
const AUTO = typeof window !== 'undefined' &&
  !new URLSearchParams(location.search).has('quality')

/** Uses sustained frame time after touchdown; one slow chunk mount is ignored. */
export function QualityMonitor() {
  const phase = useGameStore((s) => s.phase)
  const quality = useGameStore((s) => s.quality)
  const setQuality = useGameStore((s) => s.setQuality)
  const lastChange = useRef(-20)
  const window = useRef({ time: 0, frames: 0, bad: 0, good: 0 })

  useFrame(({ clock }, rawDelta) => {
    if (!AUTO || phase !== 'playing') return
    const sample = window.current
    // Ignore tab switches and exceptional mounts. Ordinary slow frames still
    // count, including sustained sub-10-FPS software or integrated GPUs.
    if (rawDelta > 1) return
    sample.time += rawDelta
    sample.frames++
    if (sample.time < 4) return
    const fps = sample.frames / sample.time
    sample.time = 0
    sample.frames = 0
    sample.bad = fps < 38 ? sample.bad + 1 : 0
    sample.good = fps > 58 ? sample.good + 1 : 0
    const now = clock.elapsedTime
    if (now - lastChange.current < 20) return
    const index = ORDER.indexOf(quality)
    if (sample.bad >= 2 && index > 0) {
      setQuality(ORDER[index - 1])
    } else if (sample.good >= 10 && index < ORDER.indexOf(initialQuality())) {
      setQuality(ORDER[index + 1])
    } else return
    lastChange.current = now
    sample.bad = 0
    sample.good = 0
  })
  return null
}
