import { Barrel, Colliders, Crate, HouseFrame, useBuildMats } from './parts'
import { projects } from '../../../data/portfolioData'

/**
 * House 2 — a corrugated supply warehouse with an arched roof and an open
 * loading bay on the +Z face. The crates on the apron mirror the project
 * list, so the building shows how much loot is inside before you enter.
 */
export function ProjectsHouse() {
  const m = useBuildMats()
  const crateCount = Math.min(projects.length, 7)

  return (
    <HouseFrame id="projects" labelHeight={9.6}>
      {/* Concrete apron running out to the door */}
      <mesh receiveShadow position={[0, 0.09, 5.5]} material={m.tarmac}>
        <boxGeometry args={[16, 0.18, 12]} />
      </mesh>

      {/* Hangar body — long axis on X, bay faces +Z */}
      <mesh castShadow receiveShadow position={[0, 2.4, 0]} material={m.metal}>
        <boxGeometry args={[13, 4.8, 9]} />
      </mesh>

      {/* Corrugation ribs on the long side walls */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={i}>
          <mesh position={[-6.53, 2.4, -3.9 + i * 1.12]} material={m.metalDark}>
            <boxGeometry args={[0.09, 4.7, 0.16]} />
          </mesh>
          <mesh position={[6.53, 2.4, -3.9 + i * 1.12]} material={m.metalDark}>
            <boxGeometry args={[0.09, 4.7, 0.16]} />
          </mesh>
        </group>
      ))}

      {/* Rust streaks */}
      <mesh position={[0, 0.7, -4.56]} material={m.rust}>
        <boxGeometry args={[13.05, 1.2, 0.04]} />
      </mesh>
      <mesh position={[-4.4, 3.4, -4.56]} material={m.rust}>
        <boxGeometry args={[1.8, 1.8, 0.04]} />
      </mesh>
      <mesh position={[6.55, 1.0, 1.5]} material={m.rust}>
        <boxGeometry args={[0.04, 1.6, 3]} />
      </mesh>

      {/* Arched roof */}
      <mesh
        castShadow
        receiveShadow
        position={[0, 4.8, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={m.roofMetal}
      >
        <cylinderGeometry args={[4.6, 4.6, 13.4, 18, 1, false, 0, Math.PI]} />
      </mesh>
      {[-4, 0, 4].map((x) => (
        <mesh key={x} castShadow position={[x, 9.5, 0]} material={m.metalDark}>
          <cylinderGeometry args={[0.4, 0.5, 0.75, 8]} />
        </mesh>
      ))}

      {/* Loading bay in the +Z wall */}
      <group position={[0, 0, 4.5]}>
        {/* dark interior */}
        <mesh position={[0, 2.1, -0.4]} material={m.dark}>
          <boxGeometry args={[7.2, 4.2, 0.4]} />
        </mesh>
        {/* roller shutter, half raised */}
        <mesh castShadow position={[0, 3.55, 0.16]} material={m.metalDark}>
          <boxGeometry args={[7.2, 1.5, 0.14]} />
        </mesh>
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} position={[0, 2.95 + i * 0.28, 0.25]} material={m.metal}>
            <boxGeometry args={[7.2, 0.14, 0.06]} />
          </mesh>
        ))}
        {/* Hazard-striped frame */}
        {[-1, 1].map((s) => (
          <mesh key={s} castShadow position={[s * 3.75, 2.1, 0.12]} material={m.accent}>
            <boxGeometry args={[0.32, 4.3, 0.34]} />
          </mesh>
        ))}
        <mesh position={[0, 4.35, 0.12]} material={m.accent}>
          <boxGeometry args={[7.8, 0.3, 0.34]} />
        </mesh>
        {/* Interior glow — signals "there is something in here" */}
        <pointLight position={[0, 2.4, -2.0]} intensity={11} distance={12} color="#5fd3a0" />
      </group>

      {/* Signage above the bay */}
      <mesh position={[0, 5.35, 4.4]} material={m.dark}>
        <boxGeometry args={[6.4, 1.0, 0.14]} />
      </mesh>
      <mesh position={[0, 5.35, 4.5]} material={m.accent}>
        <boxGeometry args={[5.9, 0.14, 0.04]} />
      </mesh>
      <mesh position={[-3.6, 5.35, 4.5]} material={m.accent}>
        <boxGeometry args={[0.4, 0.9, 0.04]} />
      </mesh>
      <mesh position={[3.6, 5.35, 4.5]} material={m.accent}>
        <boxGeometry args={[0.4, 0.9, 0.04]} />
      </mesh>

      {/* Loading dock off to the side, clear of the approach */}
      <mesh receiveShadow position={[-8.4, 0.55, 3.0]} material={m.concreteDark}>
        <boxGeometry args={[3.4, 1.1, 5.6]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} receiveShadow position={[-6.9, 0.92 - i * 0.3, 5.4]} material={m.concrete}>
          <boxGeometry args={[2.6, 0.16, 0.6 + i * 0.4]} />
        </mesh>
      ))}

      {/* Loot crates — one per project, stacked on the dock */}
      {Array.from({ length: crateCount }, (_, i) => {
        const col = i % 3
        const row = Math.floor(i / 3)
        return (
          <Crate
            key={i}
            size={1.05}
            position={[-9.5 + col * 1.2, 1.1, 1.0 + row * 1.25]}
            rotation={(i * 0.7) % 0.45}
            mats={m}
            accent={i % 4 === 3}
          />
        )
      })}
      <Crate size={0.95} position={[-9.4, 2.15, 1.6]} rotation={0.35} mats={m} />

      <Barrel position={[7.3, 0.18, 3.4]} mats={m} />
      <Barrel position={[8.0, 0.18, 3.9]} mats={m} color="metal" />
      <Barrel position={[7.6, 0.18, 4.6]} mats={m} color="accent" />

      {/* Forklift silhouette for scale */}
      <group position={[6.2, 0.18, 8.0]} rotation={[0, -0.9, 0]}>
        <mesh castShadow position={[0, 0.55, 0]} material={m.accent}>
          <boxGeometry args={[1.1, 0.8, 1.9]} />
        </mesh>
        <mesh castShadow position={[0, 1.4, -0.35]} material={m.metalDark}>
          <boxGeometry args={[0.9, 1.0, 0.9]} />
        </mesh>
        <mesh position={[0, 1.35, 1.0]} material={m.metal}>
          <boxGeometry args={[0.9, 2.3, 0.1]} />
        </mesh>
        <mesh position={[0, 0.35, 1.3]} material={m.metalDark}>
          <boxGeometry args={[0.85, 0.1, 0.7]} />
        </mesh>
      </group>

      {/* Floodlight over the bay */}
      <mesh position={[0, 6.1, 4.3]} rotation={[0.5, 0, 0]} material={m.metalDark}>
        <boxGeometry args={[0.7, 0.24, 0.34]} />
      </mesh>
      <spotLight
        position={[0, 6.0, 4.6]}
        target-position={[0, 0, 9]}
        angle={0.7}
        penumbra={0.7}
        intensity={26}
        distance={20}
        color="#cfe6d8"
      />

      <Colliders
        boxes={[
          // Shell: back wall, two side walls, and the two piers either side
          // of the bay so you can't squeeze through the opening.
          { args: [6.6, 3.6, 0.35], position: [0, 3.6, -4.65] },
          { args: [0.35, 3.6, 4.7], position: [-6.65, 3.6, 0] },
          { args: [0.35, 3.6, 4.7], position: [6.65, 3.6, 0] },
          { args: [1.5, 3.6, 0.35], position: [-5.15, 3.6, 4.5] },
          { args: [1.5, 3.6, 0.35], position: [5.15, 3.6, 4.5] },
          // The half-lowered shutter is a ceiling, not a wall — leave a gap.
          { args: [3.7, 0.9, 0.35], position: [0, 5.2, 4.5] },
          // Dock
          { args: [1.7, 0.6, 2.8], position: [-8.4, 0.55, 3.0] },
          // Forklift
          { args: [0.7, 0.9, 1.1], position: [6.2, 0.9, 8.0], rotation: -0.9 },
        ]}
      />
    </HouseFrame>
  )
}
