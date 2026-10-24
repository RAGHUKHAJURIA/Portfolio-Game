import { useEffect, useState } from 'react'

type Metrics = { center: string; active: number; high: number; medium: number;
  geometries: number; textures: number; drawCalls: number; triangles: number;
  frameMs: number; heapMB: number }

/** Opt-in with ?debug. Kept outside Canvas so it does not touch the game loop. */
export function StreamingDebug() {
  const [data, setData] = useState<Metrics | null>(null)
  useEffect(() => {
    if (!new URLSearchParams(location.search).has('debug')) return
    const timer = window.setInterval(() => {
      setData((window as unknown as { __streaming?: Metrics }).__streaming ?? null)
    }, 500)
    return () => clearInterval(timer)
  }, [])
  if (!new URLSearchParams(location.search).has('debug') || !data) return null
  return <aside style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 100,
    padding: '8px 10px', background: '#101820df', color: '#b8f4cf',
    font: '11px/1.5 monospace', pointerEvents: 'none' }}>
    cell {data.center}<br />active {data.active} · high {data.high} · medium {data.medium}<br />
    GPU geometries {data.geometries} · textures {data.textures}
    {data.heapMB > 0 && <> · JS heap {data.heapMB.toFixed(0)} MB</>}<br />
    frame {data.frameMs.toFixed(1)} ms · calls {data.drawCalls} · triangles {data.triangles}
  </aside>
}
