import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Color } from 'three'
import { ISLAND, houses } from '../../data/portfolioData'
import { INLETS, groundColor, terrainHeight } from '../../lib/terrain'
import { playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'
import { playClick } from '../../lib/audio'

/**
 * Full-screen tactical map.
 *
 * The island image is baked from the same height field the terrain mesh is
 * built from, once, on first open, and cached for the rest of the session.
 * The brief asked for a pre-baked image rather than a live orthographic
 * render, and this is that — just baked from the source of truth instead of
 * drawn by hand. A hand-made PNG would be one more asset to fetch and would
 * silently drift from the world the moment a terrain constant moved; this
 * cannot, because it calls `terrainHeight` and `groundColor` directly.
 */

/** Raster size. Upscaled on screen — soft reads fine for a satellite plate. */
const RES = 256
/** World half-span the raster covers: the landmass plus a rim of sea. */
const EXTENT = ISLAND.radius + 14

const C_SEA_SHALLOW = new Color('#2c5a6b')
const C_SEA_DEEP = new Color('#12303c')
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

let baked: HTMLCanvasElement | null = null

function bakeIsland(): HTMLCanvasElement {
  if (baked) return baked

  const cv = document.createElement('canvas')
  cv.width = RES
  cv.height = RES
  const ctx = cv.getContext('2d')!
  const img = ctx.createImageData(RES, RES)

  const step = (EXTENT * 2) / RES
  const toWorld = (i: number) => -EXTENT + (i + 0.5) * step

  /**
   * Heights first, into a flat array. Shading and slope then come from
   * neighbouring samples instead of resampling the noise three more times per
   * pixel — that single change is the difference between ~40 and ~110 sin
   * calls per pixel, i.e. between a blink and a visible stall on open.
   */
  const h = new Float32Array(RES * RES)
  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) h[y * RES + x] = terrainHeight(toWorld(x), toWorld(y))
  }

  const c = new Color()
  const at = (x: number, y: number) =>
    h[Math.min(RES - 1, Math.max(0, y)) * RES + Math.min(RES - 1, Math.max(0, x))]

  for (let y = 0; y < RES; y++) {
    for (let x = 0; x < RES; x++) {
      const i = y * RES + x
      const wy = h[i]
      const o = i * 4

      if (wy < ISLAND.seaLevel) {
        c.copy(C_SEA_SHALLOW).lerp(C_SEA_DEEP, clamp01((ISLAND.seaLevel - wy) / 7))
        c.multiplyScalar(1.25)
      } else {
        const dx = (at(x + 1, y) - at(x - 1, y)) / (2 * step)
        const dz = (at(x, y + 1) - at(x, y - 1)) / (2 * step)
        groundColor(toWorld(x), toWorld(y), wy, Math.min(1, Math.hypot(dx, dz)), c)
        // Hillshade. The sun sits at -x/-z, so a face tilted that way catches
        // it; without this the map is a flat green disc with roads on it.
        //
        // The 1.15 base is exposure, not shading: groundColor returns unlit
        // albedo, and in the world the sun and sky env bring it up. Left at a
        // sub-1 multiplier the plate comes out near-black and unreadable.
        // Overflow is fine — ImageData is a Uint8ClampedArray.
        c.multiplyScalar(1.15 + (-dx - dz) * 0.5)
      }

      img.data[o] = c.r * 255
      img.data[o + 1] = c.g * 255
      img.data[o + 2] = c.b * 255
      img.data[o + 3] = 255
    }
  }

  ctx.putImageData(img, 0, 0)
  baked = cv
  return cv
}

export function FullMap() {
  const mapOpen = useGameStore((s) => s.mapOpen)
  const closeMap = useGameStore((s) => s.closeMap)
  const setPin = useGameStore((s) => s.setPin)
  const visited = useGameStore((s) => s.visited)
  const isMobile = useGameStore((s) => s.isMobile)

  const canvas = useRef<HTMLCanvasElement>(null)
  // Read through refs so the rAF loop never needs to be torn down and rebuilt.
  const visitedRef = useRef(visited)
  visitedRef.current = visited
  const pinRef = useRef(useGameStore.getState().pin)
  useEffect(
    () => useGameStore.subscribe((s) => { pinRef.current = s.pin }),
    []
  )

  useEffect(() => {
    if (!mapOpen) return
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    const plate = bakeIsland()
    let raf = 0

    const draw = () => {
      raf = requestAnimationFrame(draw)
      const size = cv.clientWidth
      if (!size) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      if (cv.width !== size * dpr) {
        cv.width = size * dpr
        cv.height = size * dpr
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, size, size)

      const k = size / (EXTENT * 2)
      const toX = (x: number) => (x + EXTENT) * k
      const toY = (z: number) => (z + EXTENT) * k

      ctx.imageSmoothingEnabled = true
      ctx.drawImage(plate, 0, 0, size, size)

      // Grid, so distances are readable at a glance. 50 world units a cell.
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 1
      for (let g = -EXTENT; g <= EXTENT; g += 50) {
        ctx.beginPath()
        ctx.moveTo(toX(g), 0)
        ctx.lineTo(toX(g), size)
        ctx.moveTo(0, toY(g))
        ctx.lineTo(size, toY(g))
        ctx.stroke()
      }

      // Play boundary.
      ctx.beginPath()
      ctx.arc(toX(0), toY(0), ISLAND.boundary * k, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.34)'
      ctx.lineWidth = 1.5
      ctx.setLineDash([6, 5])
      ctx.stroke()
      ctx.setLineDash([])

      // Dropped pin, with a line back to the player so the bearing reads.
      const pin = pinRef.current
      if (pin) {
        const gx = toX(pin[0])
        const gy = toY(pin[1])
        ctx.strokeStyle = 'rgba(240,169,46,0.5)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(toX(playerState.x), toY(playerState.z))
        ctx.lineTo(gx, gy)
        ctx.stroke()
        ctx.setLineDash([])

        ctx.beginPath()
        ctx.moveTo(gx, gy)
        ctx.lineTo(gx - 6, gy - 15)
        ctx.lineTo(gx + 6, gy - 15)
        ctx.closePath()
        ctx.fillStyle = '#f0a92e'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(gx, gy - 17, 5.5, 0, Math.PI * 2)
        ctx.fillStyle = '#f0a92e'
        ctx.fill()
        ctx.strokeStyle = '#0d1014'
        ctx.lineWidth = 1.4
        ctx.stroke()

        const dist = Math.round(Math.hypot(pin[0] - playerState.x, pin[1] - playerState.z))
        ctx.font = '600 11px ui-monospace, monospace'
        ctx.textAlign = 'center'
        ctx.fillStyle = 'rgba(13,16,20,0.8)'
        ctx.fillRect(gx - 22, gy + 4, 44, 15)
        ctx.fillStyle = '#f0a92e'
        ctx.fillText(`${dist}m`, gx, gy + 15)
      }

      // Houses.
      for (const house of houses) {
        const hx = toX(house.position[0] + house.markerOffset[0])
        const hy = toY(house.position[1] + house.markerOffset[1])
        const seen = visitedRef.current[house.id]

        ctx.beginPath()
        ctx.arc(hx, hy, 15, 0, Math.PI * 2)
        ctx.fillStyle = `${house.color}26`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(hx, hy, 7.5, 0, Math.PI * 2)
        ctx.fillStyle = seen ? house.color : 'rgba(13,16,20,0.9)'
        ctx.fill()
        ctx.strokeStyle = house.color
        ctx.lineWidth = 2.2
        ctx.stroke()

        if (seen) {
          ctx.strokeStyle = '#0d1014'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(hx - 3.2, hy)
          ctx.lineTo(hx - 0.6, hy + 2.8)
          ctx.lineTo(hx + 3.4, hy - 2.8)
          ctx.stroke()
        }

        ctx.font = '600 11px ui-monospace, monospace'
        ctx.textAlign = 'center'
        const label = house.label
        const w = ctx.measureText(label).width + 12
        ctx.fillStyle = 'rgba(13,16,20,0.78)'
        ctx.fillRect(hx - w / 2, hy + 12, w, 16)
        ctx.fillStyle = house.color
        ctx.fillText(label, hx, hy + 24)
      }

      // Player, last so nothing covers it.
      const px = toX(playerState.x)
      const py = toY(playerState.z)
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-playerState.heading + Math.PI)
      const cone = ctx.createLinearGradient(0, 0, 0, -46)
      cone.addColorStop(0, 'rgba(255,255,255,0.5)')
      cone.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 46, -Math.PI / 2 - 0.42, -Math.PI / 2 + 0.42)
      ctx.closePath()
      ctx.fillStyle = cone
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(0, -10)
      ctx.lineTo(7, 8)
      ctx.lineTo(0, 4)
      ctx.lineTo(-7, 8)
      ctx.closePath()
      ctx.fillStyle = '#ffffff'
      ctx.fill()
      ctx.strokeStyle = '#0d1014'
      ctx.lineWidth = 1.6
      ctx.stroke()
      ctx.restore()
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [mapOpen])

  const onMapClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cv = canvas.current
    if (!cv) return
    const r = cv.getBoundingClientRect()
    const wx = ((e.clientX - r.left) / r.width) * EXTENT * 2 - EXTENT
    const wz = ((e.clientY - r.top) / r.height) * EXTENT * 2 - EXTENT
    playClick()
    // Tapping the existing pin clears it, so there's a way back to no marker.
    const cur = useGameStore.getState().pin
    const near = cur && Math.hypot(cur[0] - wx, cur[1] - wz) < 8
    setPin(near ? null : [wx, wz])
  }

  return (
    <AnimatePresence>
      {mapOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, pointerEvents: 'none' }}
          transition={{ duration: 0.22 }}
          className="fixed inset-0 z-40 flex flex-col items-center justify-center
                     bg-steel-900/85 backdrop-blur-sm"
          onClick={closeMap}
          role="dialog"
          aria-modal="true"
          aria-label="Tactical map"
        >
          <div
            className="flex w-full max-w-[min(88vh,94vw)] items-end justify-between px-1 pb-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="font-stencil text-[15px] uppercase tracking-[0.24em] text-white/85">
                tactical map
              </div>
              <div className="font-mono text-[9px] uppercase tracking-[0.16em] text-white/40">
                {Math.round(ISLAND.radius * 2)}m across · {isMobile ? 'tap' : 'click'} to mark
              </div>
            </div>
            <button
              // Gives a keyboard user somewhere to land when the overlay opens,
              // instead of tabbing into the gameplay UI behind it.
              autoFocus
              onClick={() => {
                playClick()
                closeMap()
              }}
              className="hud-panel px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em]
                         text-white/60 transition-colors hover:text-white"
            >
              {isMobile ? 'close' : 'esc / m'}
            </button>
          </div>

          <div
            className="hud-panel clip-panel relative overflow-hidden"
            style={{ width: 'min(88vh, 94vw)', height: 'min(88vh, 94vw)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <canvas
              ref={canvas}
              onClick={onMapClick}
              className="block h-full w-full cursor-crosshair"
            />
            <div className="scanlines pointer-events-none absolute inset-0 opacity-25" />
            <span className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 font-mono text-[10px] tracking-widest text-white/55">
              N
            </span>
          </div>

          <div
            className="flex w-full max-w-[min(88vh,94vw)] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-1 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            {INLETS.length > 0 && (
              <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
                ◆ water is impassable
              </span>
            )}
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
              ◆ dashed ring = play boundary
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-white/35">
              ◆ {isMobile ? 'tap' : 'click'} your pin to clear it
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
