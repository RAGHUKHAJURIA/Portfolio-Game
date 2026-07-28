import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh, MeshBasicMaterial, Group } from 'three'
import { AdditiveBlending } from 'three'
import type { HouseMeta } from '../../../data/portfolioData'
import { useGameStore } from '../../../store/useGameStore'
import { playerState } from '../../../state/controls'

type Props = {
  meta: HouseMeta
  /** Ground height at the marker. */
  groundY: number
  /** Height of the floating label above the ground. */
  labelHeight: number
}

/**
 * The bit that makes the island legible at a glance: a pulsing ground ring
 * showing the interaction radius, a light beam, and a floating callout that
 * lights up when the player is inside the trigger.
 */
export function HouseMarker({ meta, groundY, labelHeight }: Props) {
  const ring = useRef<Mesh>(null)
  const innerRing = useRef<Mesh>(null)
  const beam = useRef<Mesh>(null)
  const labelGroup = useRef<Group>(null)

  const nearHouse = useGameStore((s) => s.nearHouse)
  const visited = useGameStore((s) => s.visited[meta.id])
  const active = nearHouse === meta.id

  const mx = meta.position[0] + meta.markerOffset[0]
  const mz = meta.position[1] + meta.markerOffset[1]

  useFrame(({ clock }) => {
    const t = clock.elapsedTime

    if (ring.current) {
      const s = 1 + Math.sin(t * 1.6) * 0.035
      ring.current.scale.setScalar(active ? s * 1.06 : s)
      const m = ring.current.material as MeshBasicMaterial
      m.opacity = (active ? 0.75 : 0.34) + Math.sin(t * 2.2) * 0.08
    }

    if (innerRing.current) {
      // Expanding sonar pulse.
      const p = (t * 0.55) % 1
      innerRing.current.scale.setScalar(0.15 + p * 0.95)
      const m = innerRing.current.material as MeshBasicMaterial
      m.opacity = (1 - p) * (active ? 0.5 : 0.22)
    }

    if (beam.current) {
      const m = beam.current.material as MeshBasicMaterial
      m.opacity = (active ? 0.2 : 0.09) + Math.sin(t * 1.3) * 0.03
    }

    // Fade the callout out when the player is right on top of it, so it
    // never covers the building it is labelling.
    if (labelGroup.current) {
      const d = Math.hypot(playerState.x - mx, playerState.z - mz)
      labelGroup.current.visible = d > meta.radius * 0.62
    }
  })

  return (
    <group position={[mx, groundY, mz]}>
      {/* Interaction radius */}
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[meta.radius - 0.28, meta.radius, 56]} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Sonar pulse */}
      <mesh ref={innerRing} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[meta.radius - 0.16, meta.radius, 48]} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={0.25}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Soft floor wash */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[meta.radius, 40]} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={0.07}
          depthWrite={false}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Light column */}
      <mesh ref={beam} position={[0, labelHeight * 0.5, 0]}>
        <cylinderGeometry args={[meta.radius * 0.34, meta.radius * 0.5, labelHeight, 18, 1, true]} />
        <meshBasicMaterial
          color={meta.color}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={2}
          blending={AdditiveBlending}
        />
      </mesh>

      {/* Floating callout */}
      <group ref={labelGroup} position={[0, labelHeight, 0]}>
        <Html center distanceFactor={22} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div
            className="select-none whitespace-nowrap text-center transition-all duration-200"
            style={{ transform: active ? 'scale(1.12)' : 'scale(1)' }}
          >
            <div
              className="mx-auto mb-1 flex h-9 w-9 items-center justify-center rounded-md border text-lg backdrop-blur-sm"
              style={{
                borderColor: meta.color,
                background: `${meta.color}22`,
                boxShadow: active ? `0 0 22px ${meta.color}` : `0 0 10px ${meta.color}55`,
              }}
            >
              {meta.icon}
            </div>
            <div
              className="font-stencil text-[13px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: meta.color, textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
            >
              {meta.label}
            </div>
            <div
              className="font-mono text-[8px] uppercase tracking-[0.16em] text-white/60"
              style={{ textShadow: '0 1px 5px rgba(0,0,0,0.9)' }}
            >
              {visited ? '✓ looted' : meta.sublabel}
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}
