import { useEffect, useRef } from 'react'
import { ISLAND, houses } from '../../data/portfolioData'
import { INLETS, PATH_SEGMENTS } from '../../lib/terrain'
import { playerState } from '../../state/controls'
import { useGameStore } from '../../store/useGameStore'
import { perfFlag } from '../../lib/perfFlags'

const WORLD_R = ISLAND.boundary + 4
const DPR = Math.min(2, typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)

/** Static geography is drawn once; live markers update at 20 Hz without React. */
export function Minimap({ size: SIZE = 150 }: { size?: number }) {
  if (perfFlag('minimap')) return null
  const canvas = useRef<HTMLCanvasElement>(null)
  const visited = useGameStore((s) => s.visited)
  const visitedRef = useRef(visited)
  visitedRef.current = visited

  // A pin the player can't see while walking is a pin that does nothing, so it
  // has to appear here too, not just on the full map. Read through a ref: the
  // draw loop runs on rAF and must not be rebuilt when the pin moves.
  const pinRef = useRef(useGameStore.getState().pin)
  useEffect(
    () =>
      useGameStore.subscribe((s) => {
        pinRef.current = s.pin
      }),
    []
  )

  useEffect(() => {
    const cv = canvas.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return

    cv.width = SIZE * DPR
    cv.height = SIZE * DPR
    ctx.scale(DPR, DPR)

    const c = SIZE / 2
    const k = (SIZE / 2 - 8) / WORLD_R
    const toX = (x: number) => c + x * k
    const toY = (z: number) => c + z * k

    const background = document.createElement('canvas')
    background.width = cv.width
    background.height = cv.height
    const bg = background.getContext('2d')
    if (!bg) return
    bg.scale(DPR, DPR)

    const drawBackground = () => {

      // Water
      bg.fillStyle = '#16323d'
      bg.fillRect(0, 0, SIZE, SIZE)

      // Island landmass
      bg.beginPath()
      bg.arc(c, c, ISLAND.radius * k, 0, Math.PI * 2)
      bg.fillStyle = '#4c5a33'
      bg.fill()

      bg.beginPath()
      bg.arc(c, c, (ISLAND.radius - 5) * k, 0, Math.PI * 2)
      bg.fillStyle = '#576636'
      bg.fill()

      // Water inlets, before the roads so a road never appears to cross one.
      bg.fillStyle = '#16323d'
      for (const m of INLETS) {
        bg.beginPath()
        // The visible water reaches roughly where the mound clears sea level,
        // which is well inside its full falloff radius.
        bg.arc(toX(m.x), toY(m.z), m.r * 0.72 * k, 0, Math.PI * 2)
        bg.fill()
      }

      // The road network, straight from the terrain so the two never disagree.
      bg.strokeStyle = 'rgba(150,124,84,0.7)'
      bg.lineWidth = 2.5
      bg.lineCap = 'round'
      for (const [ax, az, bx, bz] of PATH_SEGMENTS) {
        bg.beginPath()
        bg.moveTo(toX(ax), toY(az))
        bg.lineTo(toX(bx), toY(bz))
        bg.stroke()
      }

      // Boundary
      bg.beginPath()
      bg.arc(c, c, ISLAND.boundary * k, 0, Math.PI * 2)
      bg.strokeStyle = 'rgba(255,255,255,0.28)'
      bg.lineWidth = 1
      bg.setLineDash([3, 3])
      bg.stroke()
      bg.setLineDash([])
    }
    drawBackground()
    const grad = ctx.createLinearGradient(0, 0, 0, -26)
    grad.addColorStop(0, 'rgba(240,169,46,0.45)')
    grad.addColorStop(1, 'rgba(240,169,46,0)')

    const draw = () => {
      ctx.clearRect(0, 0, SIZE, SIZE)
      ctx.drawImage(background, 0, 0, SIZE, SIZE)

      // Buildings
      for (const h of houses) {
        const hx = toX(h.position[0] + h.markerOffset[0])
        const hy = toY(h.position[1] + h.markerOffset[1])
        const seen = visitedRef.current[h.id]

        ctx.beginPath()
        ctx.arc(hx, hy, 8, 0, Math.PI * 2)
        ctx.fillStyle = `${h.color}33`
        ctx.fill()

        ctx.beginPath()
        ctx.arc(hx, hy, 4.6, 0, Math.PI * 2)
        ctx.fillStyle = seen ? h.color : '#0d1014'
        ctx.fill()
        ctx.strokeStyle = h.color
        ctx.lineWidth = 1.8
        ctx.stroke()

        if (seen) {
          ctx.strokeStyle = '#0d1014'
          ctx.lineWidth = 1.6
          ctx.beginPath()
          ctx.moveTo(hx - 2, hy)
          ctx.lineTo(hx - 0.4, hy + 1.8)
          ctx.lineTo(hx + 2.2, hy - 1.8)
          ctx.stroke()
        }
      }

      // Dropped pin
      const pin = pinRef.current
      if (pin) {
        const gx = toX(pin[0])
        const gy = toY(pin[1])
        ctx.beginPath()
        ctx.moveTo(gx, gy)
        ctx.lineTo(gx - 3.4, gy - 8)
        ctx.lineTo(gx + 3.4, gy - 8)
        ctx.closePath()
        ctx.fillStyle = '#f0a92e'
        ctx.fill()
        ctx.beginPath()
        ctx.arc(gx, gy - 9.5, 3.2, 0, Math.PI * 2)
        ctx.fillStyle = '#f0a92e'
        ctx.fill()
        ctx.strokeStyle = '#0d1014'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      // Player
      const px = toX(playerState.x)
      const py = toY(playerState.z)

      // View cone
      ctx.save()
      ctx.translate(px, py)
      ctx.rotate(-playerState.heading + Math.PI)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 26, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      // Arrow
      ctx.beginPath()
      ctx.moveTo(0, -6)
      ctx.lineTo(4.4, 5)
      ctx.lineTo(0, 2.6)
      ctx.lineTo(-4.4, 5)
      ctx.closePath()
      ctx.fillStyle = '#f0a92e'
      ctx.fill()
      ctx.strokeStyle = '#0d1014'
      ctx.lineWidth = 1.2
      ctx.stroke()
      ctx.restore()
    }

    draw()
    const timer = window.setInterval(draw, 50)
    return () => clearInterval(timer)
  }, [SIZE])

  return (
    <div className="relative">
      <div
        className="hud-panel clip-panel relative overflow-hidden"
        style={{ width: SIZE, height: SIZE }}
      >
        <canvas ref={canvas} style={{ width: SIZE, height: SIZE }} />
        <div className="scanlines pointer-events-none absolute inset-0 opacity-40" />
        {/* Cardinal marks */}
        <span className="pointer-events-none absolute left-1/2 top-0.5 -translate-x-1/2 font-mono text-[8px] text-white/50">
          N
        </span>
        <span className="pointer-events-none absolute bottom-0.5 left-1/2 -translate-x-1/2 font-mono text-[8px] text-white/30">
          S
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between px-1">
        <span className="hud-label">tac map</span>
        <span className="font-mono text-[9px] text-white/35 tabular-nums">
          {Math.round(ISLAND.radius * 2)}m
        </span>
      </div>
    </div>
  )
}

