/**
 * WebGL availability probe, run once at startup.
 *
 * Plenty of real visitors can't run this scene: locked-down corporate
 * laptops with hardware acceleration disabled, older mobile browsers, some
 * remote-desktop sessions. Without this check they'd sit on the loading
 * screen, press DROP IN, and fall through into a frozen sky — so we detect it
 * up front and serve the same content as a plain document instead.
 */
export function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) return false
    // Losing the context immediately keeps the probe from holding one open.
    const lose = (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')
    lose?.loseContext()
    return true
  } catch {
    return false
  }
}
