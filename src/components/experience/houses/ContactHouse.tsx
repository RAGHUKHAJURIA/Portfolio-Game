import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { Barrel, Colliders, Crate, HouseFrame, useBuildMats } from './parts'
import { contactChannels } from '../../../data/portfolioData'

/**
 * House 5 — comms: a small radio shack under a lattice antenna mast with a
 * rotating dish and a blinking aircraft-warning beacon. One whip antenna
 * per contact channel.
 */
export function ContactHouse() {
  const m = useBuildMats()
  const dish = useRef<Group>(null)
  const beacon = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (dish.current) dish.current.rotation.y = Math.sin(t * 0.22) * 0.9
    if (beacon.current) {
      const mat = beacon.current.material as MeshStandardMaterial
      const on = Math.sin(t * 2.4) > 0.55
      mat.emissiveIntensity = on ? 5 : 0.25
    }
  })

  const mast = (y: number, half: number) => (
    <>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh key={i} castShadow position={[sx * half, y, sz * half]} material={m.metal}>
          <boxGeometry args={[0.1, 2.0, 0.1]} />
        </mesh>
      ))}
      {/* Cross bracing */}
      {[0, 1].map((axis) =>
        [-1, 1].map((s) => (
          <mesh
            key={`${axis}${s}`}
            position={axis === 0 ? [0, y, s * half] : [s * half, y, 0]}
            rotation={axis === 0 ? [0, 0, s * 0.72] : [s * -0.72, Math.PI / 2, 0]}
            material={m.metalDark}
          >
            <boxGeometry args={[0.05, 2.6, 0.05]} />
          </mesh>
        ))
      )}
      <mesh position={[0, y + 1, 0]} material={m.metalDark}>
        <boxGeometry args={[half * 2, 0.06, 0.06]} />
      </mesh>
      <mesh position={[0, y + 1, 0]} rotation={[0, Math.PI / 2, 0]} material={m.metalDark}>
        <boxGeometry args={[half * 2, 0.06, 0.06]} />
      </mesh>
    </>
  )

  return (
    <HouseFrame id="contact" labelHeight={7.2}>
      {/* Pad */}
      <mesh receiveShadow position={[0, 0.08, 1.5]} material={m.tarmac}>
        <boxGeometry args={[13, 0.16, 12]} />
      </mesh>

      {/* Radio shack */}
      <mesh castShadow receiveShadow position={[0, 1.4, 0]} material={m.plaster}>
        <boxGeometry args={[5.6, 2.8, 4.4]} />
      </mesh>
      <mesh position={[0, 0.45, 0]} material={m.concreteDark}>
        <boxGeometry args={[5.66, 0.9, 4.46]} />
      </mesh>
      <mesh castShadow position={[0, 2.92, 0]} material={m.roofMetal}>
        <boxGeometry args={[6.2, 0.26, 5.0]} />
      </mesh>
      {/* Roof-edge lip */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 3.1, s * 2.44]} material={m.metalDark}>
          <boxGeometry args={[6.2, 0.16, 0.12]} />
        </mesh>
      ))}

      {/* Door on +Z */}
      <mesh position={[0, 1.1, 2.22]} material={m.dark}>
        <boxGeometry args={[1.4, 2.2, 0.12]} />
      </mesh>
      <mesh position={[0, 1.08, 2.3]} material={m.metalDark}>
        <boxGeometry args={[1.2, 2.04, 0.08]} />
      </mesh>
      <mesh position={[0, 2.42, 2.3]} material={m.dark}>
        <boxGeometry args={[2.2, 0.42, 0.06]} />
      </mesh>
      <mesh position={[0, 2.42, 2.34]} material={m.accent}>
        <boxGeometry args={[1.9, 0.1, 0.03]} />
      </mesh>
      <pointLight position={[0, 2.3, 2.9]} intensity={7} distance={8} color="#7fc4ff" />

      {/* Windows */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 2.83, 1.6, 0.4]} rotation={[0, Math.PI / 2, 0]}>
          <mesh material={m.metalDark}>
            <boxGeometry args={[1.4, 1.0, 0.08]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} material={m.glass}>
            <boxGeometry args={[1.22, 0.84, 0.05]} />
          </mesh>
        </group>
      ))}

      {/* AC unit + cable conduit */}
      <mesh castShadow position={[2.0, 3.32, -1.2]} material={m.metal}>
        <boxGeometry args={[1.1, 0.6, 1.0]} />
      </mesh>
      <mesh position={[-2.6, 1.9, -2.24]} material={m.metalDark}>
        <boxGeometry args={[0.16, 2.6, 0.16]} />
      </mesh>

      {/* Lattice mast */}
      <group position={[-0.2, 0, -3.6]}>
        {[1, 3, 5, 7, 9, 11].map((y, i) => (
          <group key={y}>{mast(y, 0.62 - i * 0.07)}</group>
        ))}
        {/* Whip antennas — one per contact channel */}
        {contactChannels.map((_, i) => (
          <mesh
            key={i}
            position={[Math.sin((i / contactChannels.length) * Math.PI * 2) * 0.5, 12.6, Math.cos((i / contactChannels.length) * Math.PI * 2) * 0.5]}
            rotation={[0.1 * (i - 1), 0, 0.12 * (i - 1)]}
            material={m.metalDark}
          >
            <cylinderGeometry args={[0.02, 0.03, 2.4, 4]} />
          </mesh>
        ))}
        {/* Warning beacon */}
        <mesh ref={beacon} position={[0, 12.3, 0]}>
          <sphereGeometry args={[0.17, 10, 8]} />
          <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={4} toneMapped={false} />
        </mesh>
        {/* Guy wires */}
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.sin(a) * 1.9, 4.0, Math.cos(a) * 1.9]}
              rotation={[Math.cos(a) * 0.44, -a, -Math.sin(a) * 0.44]}
              material={m.metalDark}
            >
              <cylinderGeometry args={[0.02, 0.02, 8.8, 4]} />
            </mesh>
          )
        })}
      </group>

      {/* Satellite dish */}
      <group ref={dish} position={[3.6, 0, -2.4]}>
        <mesh castShadow position={[0, 0.6, 0]} material={m.metalDark}>
          <cylinderGeometry args={[0.14, 0.2, 1.2, 8]} />
        </mesh>
        <mesh castShadow position={[0, 1.7, 0]} rotation={[-0.8, 0, 0]} material={m.plaster}>
          <sphereGeometry args={[1.25, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2.6]} />
        </mesh>
        <mesh position={[0, 1.9, 0.75]} rotation={[-0.8, 0, 0]} material={m.metalDark}>
          <cylinderGeometry args={[0.07, 0.07, 1.0, 6]} />
        </mesh>
        <mesh position={[0, 0.14, 0]} material={m.concreteDark}>
          <boxGeometry args={[1.1, 0.28, 1.1]} />
        </mesh>
      </group>

      {/* Generator + fuel */}
      <group position={[-3.6, 0, 1.6]}>
        <mesh castShadow receiveShadow position={[0, 0.55, 0]} material={m.accent}>
          <boxGeometry args={[1.6, 1.1, 1.0]} />
        </mesh>
        <mesh position={[0, 1.24, -0.2]} material={m.metalDark}>
          <cylinderGeometry args={[0.11, 0.11, 0.5, 6]} />
        </mesh>
      </group>
      <Barrel position={[-3.6, 0.16, 3.2]} mats={m} />
      <Barrel position={[-4.3, 0.16, 3.6]} mats={m} color="metal" />
      <Crate size={0.9} position={[3.4, 0.16, 2.4]} rotation={0.3} mats={m} />
      <Crate size={0.7} position={[3.5, 1.06, 2.3]} rotation={-0.4} mats={m} />

      <Colliders
        boxes={[
          { args: [2.85, 1.65, 2.25], position: [0, 1.65, 0] },
          { args: [0.75, 1.5, 0.75], position: [-0.2, 1.5, -3.6] },
          { args: [0.8, 0.6, 0.6], position: [-3.6, 0.55, 1.6] },
          { args: [0.6, 0.2, 0.6], position: [3.6, 0.15, -2.4] },
        ]}
      />
    </HouseFrame>
  )
}
