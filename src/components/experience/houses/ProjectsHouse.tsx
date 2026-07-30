import { Barrel, Colliders, Crate, HouseFrame, useBuildMats } from './parts'
import { HouseInterior, IN_X, IN_Z, UPPER_H, UPPER_Y } from './HouseInterior'
import { projects } from '../../../data/portfolioData'

const OUT_X = IN_X + 0.3
const OUT_Z = IN_Z + 0.3
const EAVE = UPPER_Y + UPPER_H + 0.25

/**
 * House 2 — a corrugated supply warehouse with an arched roof and a walk-in
 * loading bay on the +Z face. The crates on the dock mirror the project list,
 * so the building shows how much loot is inside before you enter; the rack
 * upstairs is the one that opens the panel.
 */
export function ProjectsHouse() {
  const m = useBuildMats()
  const crateCount = Math.min(projects.length, 7)

  return (
    <HouseFrame id="projects" labelHeight={10.6}>
      {/* Concrete apron running out to the door. A thick slab sunk into the
          ground, not a thin sheet — see the note in ExperienceHouse. */}
      <mesh receiveShadow position={[0, -1.45, 3]} material={m.tarmac}>
        <boxGeometry args={[17, 3, 15]} />
      </mesh>

      <HouseInterior mats={m} lampColor="#cfe6d8">
        {/* ── Content object: a shelving rack of numbered supply crates. ── */}
        <group position={[2.2, UPPER_Y, -IN_Z + 0.35]}>
          {[0, 1].map((shelf) => (
            <mesh key={shelf} castShadow receiveShadow position={[0, 0.85 + shelf * 0.95, 0.45]} material={m.metalDark}>
              <boxGeometry args={[3.0, 0.08, 0.9]} />
            </mesh>
          ))}
          {[-1.45, 1.45].map((x) => (
            <mesh key={x} castShadow position={[x, 1.1, 0.45]} material={m.metal}>
              <boxGeometry args={[0.1, 2.2, 0.9]} />
            </mesh>
          ))}
          {/* One crate per project, split across the two shelves. */}
          {Array.from({ length: crateCount }, (_, i) => {
            const shelf = i < 4 ? 0 : 1
            const col = i < 4 ? i : i - 4
            return (
              <Crate
                key={i}
                size={0.55}
                position={[-1.05 + col * 0.7, 0.89 + shelf * 0.95, 0.45]}
                rotation={(i * 0.4) % 0.3}
                mats={m}
                accent={i % 4 === 3}
              />
            )
          })}
          {/* Manifest board above the rack */}
          <mesh position={[0, 2.5, 0.1]} material={m.dark}>
            <boxGeometry args={[2.2, 0.7, 0.06]} />
          </mesh>
          <mesh position={[0, 2.5, 0.14]} material={m.accent}>
            <boxGeometry args={[1.9, 0.1, 0.02]} />
          </mesh>
          <pointLight position={[0, 2.3, 1.1]} intensity={3.4} distance={4.5} color="#8ff0c4" />
        </group>

        {/* Ground floor: pallets and barrels you walk between. */}
        <Crate size={0.95} position={[-3.4, 0, 2.4]} rotation={0.25} mats={m} />
        <Crate size={0.95} position={[-3.3, 0.95, 2.5]} rotation={-0.3} mats={m} accent />
        <Crate size={0.8} position={[3.5, 0, -2.6]} rotation={0.5} mats={m} />
        <Barrel position={[3.6, 0, 1.8]} mats={m} />
        <Barrel position={[2.7, 0, 2.3]} mats={m} color="metal" />
        {/* Pallet stack */}
        {[0, 1, 2].map((i) => (
          <mesh key={i} receiveShadow position={[-3.4, 0.06 + i * 0.14, -2.4]} material={m.woodDark}>
            <boxGeometry args={[1.6, 0.12, 1.2]} />
          </mesh>
        ))}
      </HouseInterior>

      {/* Corrugation ribs down the outside of the shell */}
      {Array.from({ length: 9 }, (_, i) => (
        <group key={i}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * (OUT_X + 0.05), 2.6, -3.9 + i * 0.98]} material={m.metalDark}>
              <boxGeometry args={[0.09, 6.2, 0.16]} />
            </mesh>
          ))}
        </group>
      ))}
      {/* Rust streaks */}
      <mesh position={[0, 0.9, -OUT_Z - 0.05]} material={m.rust}>
        <boxGeometry args={[OUT_X * 2, 1.4, 0.04]} />
      </mesh>
      <mesh position={[-2.4, 4.2, -OUT_Z - 0.05]} material={m.rust}>
        <boxGeometry args={[1.8, 2.0, 0.04]} />
      </mesh>

      {/* Arched roof spanning the shell */}
      <mesh
        castShadow
        receiveShadow
        position={[0, EAVE, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={m.roofMetal}
      >
        <cylinderGeometry args={[OUT_Z + 0.4, OUT_Z + 0.4, OUT_X * 2 + 0.8, 18, 1, false, 0, Math.PI]} />
      </mesh>
      {[-3.2, 0, 3.2].map((x) => (
        <mesh key={x} castShadow position={[x, EAVE + 4.8, 0]} material={m.metalDark}>
          <cylinderGeometry args={[0.4, 0.5, 0.75, 8]} />
        </mesh>
      ))}

      {/* Hazard-striped bay frame around the doorway */}
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 1.4, 1.2, OUT_Z + 0.12]} material={m.accent}>
          <boxGeometry args={[0.34, 2.7, 0.34]} />
        </mesh>
      ))}
      <mesh position={[0, 2.6, OUT_Z + 0.12]} material={m.accent}>
        <boxGeometry args={[3.2, 0.3, 0.34]} />
      </mesh>
      {/* Half-raised roller shutter above the opening */}
      <mesh castShadow position={[0, 3.0, OUT_Z + 0.16]} material={m.metalDark}>
        <boxGeometry args={[2.9, 0.7, 0.14]} />
      </mesh>

      {/* Signage above the bay */}
      <mesh position={[0, EAVE - 1.4, OUT_Z + 0.06]} material={m.dark}>
        <boxGeometry args={[6.4, 1.0, 0.14]} />
      </mesh>
      <mesh position={[0, EAVE - 1.4, OUT_Z + 0.16]} material={m.accent}>
        <boxGeometry args={[5.9, 0.14, 0.04]} />
      </mesh>
      {[-3.6, 3.6].map((x) => (
        <mesh key={x} position={[x, EAVE - 1.4, OUT_Z + 0.16]} material={m.accent}>
          <boxGeometry args={[0.4, 0.9, 0.04]} />
        </mesh>
      ))}

      {/* Loading dock off to the side, clear of the approach */}
      <mesh receiveShadow position={[-8.4, 0.55, 3.0]} material={m.concreteDark}>
        <boxGeometry args={[3.4, 1.1, 5.6]} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} receiveShadow position={[-6.9, 0.92 - i * 0.3, 5.4]} material={m.concrete}>
          <boxGeometry args={[2.6, 0.16, 0.6 + i * 0.4]} />
        </mesh>
      ))}
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

      <Barrel position={[7.3, 0.18, 3.4]} mats={m} />
      <Barrel position={[8.0, 0.18, 3.9]} mats={m} color="metal" />
      <Barrel position={[7.6, 0.18, 4.6]} mats={m} color="accent" />

      {/* Forklift silhouette for scale */}
      <group position={[6.8, 0.18, 8.4]} rotation={[0, -0.9, 0]}>
        <mesh castShadow position={[0, 0.55, 0]} material={m.accent}>
          <boxGeometry args={[1.1, 0.8, 1.9]} />
        </mesh>
        <mesh castShadow position={[0, 1.4, -0.35]} material={m.metalDark}>
          <boxGeometry args={[0.9, 1.0, 0.9]} />
        </mesh>
        <mesh position={[0, 1.35, 1.0]} material={m.metal}>
          <boxGeometry args={[0.9, 2.3, 0.1]} />
        </mesh>
      </group>

      {/* Floodlight over the bay */}
      <mesh position={[0, EAVE - 0.4, OUT_Z + 0.2]} rotation={[0.5, 0, 0]} material={m.metalDark}>
        <boxGeometry args={[0.7, 0.24, 0.34]} />
      </mesh>
      <spotLight
        position={[0, EAVE - 0.5, OUT_Z + 0.5]}
        target-position={[0, 0, 12]}
        angle={0.7}
        penumbra={0.7}
        intensity={30}
        distance={22}
        color="#cfe6d8"
      />

      {/* Only the outbuildings need colliders now — the shell supplies its own. */}
      <Colliders
        boxes={[
          { args: [1.7, 0.6, 2.8], position: [-8.4, 0.55, 3.0] },
          { args: [0.7, 0.9, 1.1], position: [6.8, 0.9, 8.4], rotation: -0.9 },
        ]}
      />
    </HouseFrame>
  )
}
