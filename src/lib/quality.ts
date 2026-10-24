export type Quality = 'low' | 'medium' | 'high'

export const QUALITY = {
  low: { dpr: [0.75, 1] as [number, number], shadowMap: 512, ao: false,
    bloom: false, smaa: false, highDistance: 18, mediumRadius: 1 },
  medium: { dpr: [1, 1.25] as [number, number], shadowMap: 1024, ao: false,
    bloom: true, smaa: true, highDistance: 24, mediumRadius: 2 },
  high: { dpr: [1, 1.5] as [number, number], shadowMap: 2048, ao: true,
    bloom: true, smaa: true, highDistance: 30, mediumRadius: 2 },
} as const

/** Conservative AUTO choice. Runtime samples can lower it further. */
export function initialQuality(): Quality {
  if (typeof window === 'undefined') return 'medium'
  const requested = new URLSearchParams(location.search).get('quality')
  if (requested === 'low' || requested === 'medium' || requested === 'high') return requested
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  if ((memory && memory <= 4) || (navigator.hardwareConcurrency || 8) <= 4 ||
    window.innerWidth * window.innerHeight > 2_500_000 ||
    window.matchMedia('(pointer: coarse)').matches) return 'low'
  return 'medium'
}
