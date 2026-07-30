import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh, MeshStandardMaterial } from 'three'
import { Barrel, Colliders, Crate, HouseFrame, useBuildMats } from './parts'
import { HouseInterior, IN_X, IN_Z, UPPER_H, UPPER_Y } from './HouseInterior'
import { contactChannels } from '../../../data/portfolioData'

const OUT_X = IN_X + 0.3
const OUT_Z = IN_Z + 0.3
const EAVE = UPPER_Y + UPPER_H + 0.25

/**
 * House 5 — comms: a walk-in radio shack beside a lattice antenna mast with a
 * rotating dish and a blinking aircraft-warning beacon. One whip antenna per
 * contact channel; the radio desk upstairs is what opens the panel.
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
    <HouseFrame id="contact" labelHeight={10.2}>
      {/* Pad */}
      <mesh receiveShadow position={[0, -1.45, 1.5]} material={m.tarmac}>
        <boxGeometry args={[15, 3, 15]} />
      </mesh>

      <HouseInterior mats={m} lampColor="#9fd0ff">
        {/* ── Content object: the radio desk. ── */}
        <group position={[2.2, UPPER_Y, -IN_Z + 0.35]}>
          {/* Equipment rack against the wall */}
          <mesh castShadow receiveShadow position={[0, 1.1, 0.28]} material={m.metalDark}>
            <boxGeometry args={[2.4, 2.2, 0.5]} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => (
            <mesh key={i} position={[0, 0.35 + i * 0.34, 0.55]} material={m.dark}>
              <boxGeometry args={[2.1, 0.26, 0.06]} />
            </mesh>
          ))}
          {/* One lit channel indicator per contact route */}
          {contactChannels.map((_, i) => (
            <mesh key={i} position={[-0.85 + i * 0.3, 1.95, 0.58]}>
              <boxGeometry args={[0.12, 0.12, 0.03]} />
              <meshStandardMaterial
                color="#3fa9f5"
                emissive="#3fa9f5"
                emissiveIntensity={3}
                toneMapped={false}
              />
            </mesh>
          ))}
          {/* Desk with a handset */}
          <mesh castShadow receiveShadow position={[0, 0.76, 0.95]} material={m.wood}>
            <boxGeometry args={[2.2, 0.08, 0.8]} />
          </mesh>
          {[-0.95, 0.95].map((x) => (
            <mesh key={x} castShadow position={[x, 0.38, 0.95]} material={m.woodDark}>
              <boxGeometry args={[0.1, 0.76, 0.7]} />
            </mesh>
          ))}
          <mesh castShadow position={[0.6, 0.87, 0.95]} material={m.dark}>
            <boxGeometry args={[0.34, 0.14, 0.22]} />
          </mesh>
          <pointLight position={[0, 2.0, 1.3]} intensity={3.4} distance={4.5} color="#9fd0ff" />
        </group>

        {/* Ground floor: generator, cable spools, a bench. */}
        <mesh castShadow receiveShadow position={[-3.3, 0.55, -2.2]} material={m.accent}>
          <boxGeometry args={[1.6, 1.1, 1.0]} />
        </mesh>
        <mesh position={[-3.3, 1.24, -2.4]} material={m.metalDark}>
          <cylinderGeometry args={[0.11, 0.11, 0.5, 6]} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} castShadow position={[-3.4, 0.4, 1.8 + i * 1.1]} rotation={[Math.PI / 2, 0, 0]} material={m.woodDark}>
            <cylinderGeometry args={[0.4, 0.4, 0.34, 10]} />
          </mesh>
        ))}
        <Crate size={0.85} position={[3.4, 0, 2.4]} rotation={0.3} mats={m} />
        <Barrel position={[3.6, 0, -1.6]} mats={m} color="metal" />
      </HouseInterior>

      {/* Concrete banding + roof */}
      <mesh position={[0, 0.5, 0]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 0.08, 1.0, OUT_Z * 2 + 0.08]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, EAVE + 0.2, 0]} material={m.roofMetal}>
        <boxGeometry args={[OUT_X * 2 + 1, 0.4, OUT_Z * 2 + 1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, EAVE + 0.55, s * (OUT_Z + 0.5)]} material={m.metalDark}>
          <boxGeometry args={[OUT_X * 2 + 1, 0.3, 0.12]} />
        </mesh>
      ))}

      {/* Door surround on +Z */}
      <mesh position={[0, 1.2, OUT_Z + 0.02]} material={m.dark}>
        <boxGeometry args={[2.2, 2.7, 0.12]} />
      </mesh>
      <mesh position={[0, 2.66, OUT_Z + 0.08]} material={m.accent}>
        <boxGeometry args={[2.4, 0.14, 0.2]} />
      </mesh>
      <pointLight position={[0, 2.4, OUT_Z + 0.9]} intensity={7} distance={9} color="#7fc4ff" />

      {/* Windows */}
      {[
        [-3.2, 1.7, OUT_Z + 0.02, 0],
        [3.2, 1.7, OUT_Z + 0.02, 0],
        [-OUT_X - 0.02, UPPER_Y + 1.4, 0.4, Math.PI / 2],
        [OUT_X + 0.02, UPPER_Y + 1.4, 0.4, Math.PI / 2],
      ].map(([px, py, pz, ry], i) => (
        <group key={i} position={[px, py, pz]} rotation={[0, ry, 0]}>
          <mesh material={m.metalDark}>
            <boxGeometry args={[1.5, 1.1, 0.1]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} material={m.glass}>
            <boxGeometry args={[1.3, 0.92, 0.05]} />
          </mesh>
        </group>
      ))}

      {/* AC unit + cable conduit down the back wall */}
      <mesh castShadow position={[2.4, EAVE + 0.7, -1.6]} material={m.metal}>
        <boxGeometry args={[1.1, 0.6, 1.0]} />
      </mesh>
      <mesh position={[-3.0, 3.2, -OUT_Z - 0.1]} material={m.metalDark}>
        <boxGeometry args={[0.16, 6, 0.16]} />
      </mesh>

      {/* Lattice mast, clear of the building */}
      <group position={[-7.4, 0, -3.6]}>
        {[1, 3, 5, 7, 9, 11].map((y, i) => (
          <group key={y}>{mast(y, 0.62 - i * 0.07)}</group>
        ))}
        {/* Whip antennas — one per contact channel */}
        {contactChannels.map((_, i) => (
          <mesh
            key={i}
            position={[
              Math.sin((i / contactChannels.length) * Math.PI * 2) * 0.5,
              12.6,
              Math.cos((i / contactChannels.length) * Math.PI * 2) * 0.5,
            ]}
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
      <group ref={dish} position={[7.2, 0, -2.4]}>
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

      {/* Fuel and stores outside */}
      <Barrel position={[-6.0, 0, OUT_Z + 0.6]} mats={m} />
      <Barrel position={[-6.7, 0, OUT_Z + 1.0]} mats={m} color="metal" />
      <Crate size={0.9} position={[6.2, 0, OUT_Z + 0.8]} rotation={0.3} mats={m} />
      <Crate size={0.7} position={[6.3, 0.9, OUT_Z + 0.7]} rotation={-0.4} mats={m} />

      <Colliders
        boxes={[
          { args: [0.75, 1.5, 0.75], position: [-7.4, 1.5, -3.6] },
          { args: [0.6, 0.2, 0.6], position: [7.2, 0.15, -2.4] },
        ]}
      />
    </HouseFrame>
  )
}
