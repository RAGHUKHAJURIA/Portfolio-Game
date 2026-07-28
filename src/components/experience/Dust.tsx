import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { InstancedMesh } from 'three'
import { Color, Matrix4, Object3D } from 'three'

/**
 * A tiny pooled particle system for footstep and landing dust.
 *
 * The pool is a fixed-size ring buffer of instances in one InstancedMesh, so
 * spawning never allocates and the whole thing is a single draw call. The
 * character emits into it via `spawnDust`, which is a plain function rather
 * than a prop or store action — it's called from inside the render loop and
 * must not trigger a React update.
 */

const POOL = 40

type Particle = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  life: number
  maxLife: number
  size: number
}

const pool: Particle[] = Array.from({ length: POOL }, () => ({
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
  maxLife: 1,
  size: 1,
}))

let cursor = 0

/** Emit a puff at a world position. `power` scales count, speed and size. */
export function spawnDust(x: number, y: number, z: number, power = 1) {
  const count = Math.max(1, Math.round(2 * power))
  for (let i = 0; i < count; i++) {
    const p = pool[cursor]
    cursor = (cursor + 1) % POOL
    const a = Math.random() * Math.PI * 2
    const s = (0.4 + Math.random() * 0.7) * power
    p.x = x + Math.cos(a) * 0.18
    p.y = y + 0.06
    p.z = z + Math.sin(a) * 0.18
    p.vx = Math.cos(a) * s * 0.55
    p.vy = 0.5 + Math.random() * 0.7 * power
    p.vz = Math.sin(a) * s * 0.55
    p.maxLife = 0.55 + Math.random() * 0.4
    p.life = p.maxLife
    p.size = (0.14 + Math.random() * 0.16) * power
  }
}

const _o = new Object3D()
const _hidden = new Matrix4().makeScale(0, 0, 0)
const _color = new Color()

export function Dust() {
  const mesh = useRef<InstancedMesh>(null)
  const tint = useMemo(() => new Color('#b8a985'), [])

  useFrame((_, rawDelta) => {
    const m = mesh.current
    if (!m) return
    const dt = Math.min(rawDelta, 1 / 20)

    for (let i = 0; i < POOL; i++) {
      const p = pool[i]
      if (p.life <= 0) {
        m.setMatrixAt(i, _hidden)
        continue
      }

      p.life -= dt
      if (p.life <= 0) {
        m.setMatrixAt(i, _hidden)
        continue
      }

      p.vy -= 1.6 * dt
      // Air drag, so puffs settle instead of flying off.
      const drag = Math.exp(-2.6 * dt)
      p.vx *= drag
      p.vz *= drag
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.z += p.vz * dt

      const t = p.life / p.maxLife
      // Grows as it fades.
      const scale = p.size * (1.6 - t * 0.6)
      _o.position.set(p.x, p.y, p.z)
      _o.scale.setScalar(scale)
      _o.rotation.set(0, 0, 0)
      _o.updateMatrix()
      m.setMatrixAt(i, _o.matrix)
      m.setColorAt(i, _color.copy(tint).multiplyScalar(0.35 + t * 0.65))
    }

    m.instanceMatrix.needsUpdate = true
    if (m.instanceColor) m.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, POOL]} frustumCulled={false}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial transparent opacity={0.42} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}
