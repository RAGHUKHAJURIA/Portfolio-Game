import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { AdditiveBlending, BufferAttribute, CylinderGeometry, DoubleSide } from 'three'
import { ISLAND } from '../../data/portfolioData'
import { useGameStore } from '../../store/useGameStore'

const CYCLE = 95
const R_MAX = ISLAND.boundary - 1
const R_MIN = 15
const WALL_HEIGHT = 30

/**
 * Decoration only — a blue play-zone wall that slowly contracts and resets.
 * It has no gameplay effect: it never blocks movement and never damages the
 * player. It is here purely because a battle-royale island without a
 * shrinking circle doesn't read as one.
 */
export function Zone() {
  const wall = useRef<Mesh>(null)
  const ring = useRef<Mesh>(null)
  const phase = useGameStore((s) => s.phase)

  /**
   * A plain translucent cylinder reads as a hard-edged glass box — you can
   * see exactly where its top edge stops. Baking a vertical alpha ramp into
   * a 4-component colour attribute fades it out into the sky instead, with
   * no custom shader.
   */
  const wallGeometry = useMemo(() => {
    const g = new CylinderGeometry(1, 1, WALL_HEIGHT, 80, 12, true)
    const pos = g.attributes.position
    const colors = new Float32Array(pos.count * 4)
    for (let i = 0; i < pos.count; i++) {
      const t = (pos.getY(i) + WALL_HEIGHT / 2) / WALL_HEIGHT // 0 bottom … 1 top
      colors[i * 4] = 0.25
      colors[i * 4 + 1] = 0.66
      colors[i * 4 + 2] = 0.96
      // Brightest just above the ground, gone well before the top edge.
      colors[i * 4 + 3] = Math.pow(1 - t, 2.6) * 0.55
    }
    g.setAttribute('color', new BufferAttribute(colors, 4))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (phase !== 'playing' && phase !== 'dropping') return
    const t = (clock.elapsedTime % CYCLE) / CYCLE
    // Hold, then contract, then reset.
    const contract = Math.max(0, Math.min(1, (t - 0.25) / 0.55))
    const eased = contract * contract * (3 - 2 * contract)
    const r = R_MAX - (R_MAX - R_MIN) * eased
    // The centre drifts a little so it doesn't always close on the plaza.
    const cx = Math.sin(clock.elapsedTime * 0.05) * 6
    const cz = Math.cos(clock.elapsedTime * 0.037) * 6

    if (wall.current) {
      wall.current.scale.set(r, 1, r)
      wall.current.position.set(cx, ISLAND.seaLevel + WALL_HEIGHT / 2, cz)
      const mat = wall.current.material as MeshBasicMaterial
      mat.opacity = 0.16 + (1 - eased) * 0.05
    }
    if (ring.current) {
      ring.current.scale.set(r, r, 1)
      ring.current.position.set(cx, ISLAND.seaLevel + 0.35, cz)
      const mat = ring.current.material as MeshBasicMaterial
      mat.opacity = 0.3 + Math.sin(clock.elapsedTime * 2) * 0.06
    }
  })

  return (
    <group>
      {/* Vertical wall of light, alpha-ramped so it dissolves upward */}
      <mesh ref={wall} geometry={wallGeometry} renderOrder={5}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.18}
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Ground trace */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
        <ringGeometry args={[0.982, 1, 96]} />
        <meshBasicMaterial
          color="#7fd0ff"
          transparent
          opacity={0.3}
          side={DoubleSide}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>
    </group>
  )
}
