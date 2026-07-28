import { Barrel, Colliders, Crate, HouseFrame, Sandbags, useBuildMats } from './parts'
import { loadout } from '../../../data/portfolioData'

/**
 * House 3 — the armory: a canvas field tent over a hard frame, with weapon
 * racks and ammo crates. One rack post per loadout slot.
 */
export function SkillsHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="skills" labelHeight={7.4}>
      {/* Gravel pad — thick slab sunk into the ground, not a thin sheet. */}
      <mesh receiveShadow position={[0, -1.46, 1]} material={m.tarmac}>
        <boxGeometry args={[13, 3, 14]} />
      </mesh>

      {/* Tent body */}
      <mesh castShadow receiveShadow position={[0, 1.2, 0]} material={m.canvasTent}>
        <boxGeometry args={[8.4, 2.4, 6.4]} />
      </mesh>

      {/* Ridge roof — a proper field-tent pitch. A shallower angle reads as a
          flat slab floating over the tent from the game camera's height. */}
      <group position={[0, 2.4, 0]}>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            castShadow
            receiveShadow
            position={[0, 0.72, s * 1.65]}
            // Sign matters: rotation.x = +θ drops the panel's far edge, which
            // is what makes a ridge. Negating it builds a butterfly roof that
            // rises outward and leaves the ridge cap floating in mid-air.
            rotation={[s * 0.72, 0, 0]}
            material={m.canvasDark}
          >
            <boxGeometry args={[8.8, 0.18, 4.4]} />
          </mesh>
        ))}
        <mesh position={[0, 2.12, 0]} material={m.canvasTent}>
          <boxGeometry args={[8.9, 0.18, 0.44]} />
        </mesh>
        {/* Gable infill closing the triangle at each end */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 4.28, 1.0, 0]} material={m.canvasTent}>
            <boxGeometry args={[0.16, 2.1, 3.0]} />
          </mesh>
        ))}
        {/* Ridge pole ends poking out */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 4.7, 2.12, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={m.woodDark}
          >
            <cylinderGeometry args={[0.06, 0.06, 0.9, 5]} />
          </mesh>
        ))}
      </group>

      {/* Guy ropes + stakes */}
      {[
        [-4.6, 3.6],
        [4.6, 3.6],
        [-4.6, -3.6],
        [4.6, -3.6],
      ].map(([x, z], i) => (
        <mesh
          key={i}
          position={[x * 0.72, 1.3, z * 0.72]}
          rotation={[Math.atan2(z, 4) * 0.5, Math.atan2(x, z), 0.5]}
        >
          <cylinderGeometry args={[0.02, 0.02, 3.4, 4]} />
          <meshStandardMaterial color="#cfc7ae" roughness={1} />
        </mesh>
      ))}

      {/* Entrance flaps on +Z */}
      <mesh position={[0, 1.15, 3.24]} material={m.dark}>
        <boxGeometry args={[2.6, 2.3, 0.1]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} castShadow position={[s * 1.55, 1.2, 3.34]} rotation={[0, s * -0.35, 0]} material={m.canvasDark}>
          <boxGeometry args={[1.3, 2.4, 0.09]} />
        </mesh>
      ))}
      <pointLight position={[0, 1.9, 2.4]} intensity={7} distance={8} color="#ffb08a" />

      {/* Weapon racks flanking the entrance — one post per loadout slot */}
      {loadout.map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const idx = Math.floor(i / 2)
        return (
          <group key={i} position={[side * (2.6 + idx * 1.5), 0, 4.6]} rotation={[0, side * 0.25, 0]}>
            <mesh castShadow position={[0, 0.62, 0]} material={m.woodDark}>
              <boxGeometry args={[0.12, 1.24, 0.12]} />
            </mesh>
            <mesh castShadow position={[0, 1.18, 0]} material={m.woodDark}>
              <boxGeometry args={[1.1, 0.1, 0.12]} />
            </mesh>
            <mesh position={[0, 0.55, 0]} material={m.woodDark}>
              <boxGeometry args={[1.1, 0.08, 0.1]} />
            </mesh>
            {/* Stylised rifle silhouettes on the rack */}
            {[-0.3, 0.0, 0.3].map((x) => (
              <group key={x} position={[x, 0.86, 0.02]} rotation={[0, 0, 0.06]}>
                <mesh castShadow material={m.dark}>
                  <boxGeometry args={[0.05, 0.72, 0.05]} />
                </mesh>
                <mesh position={[0, -0.24, 0.05]} material={m.woodDark}>
                  <boxGeometry args={[0.07, 0.26, 0.09]} />
                </mesh>
                <mesh position={[0, 0.1, 0.06]} material={m.metalDark}>
                  <boxGeometry args={[0.045, 0.16, 0.07]} />
                </mesh>
              </group>
            ))}
          </group>
        )
      })}

      {/* Ammo crates + supplies */}
      <Crate size={0.85} position={[-4.6, 0.16, 1.4]} rotation={0.2} mats={m} />
      <Crate size={0.85} position={[-4.6, 1.01, 1.4]} rotation={-0.3} mats={m} accent />
      <Crate size={0.85} position={[-4.5, 0.16, 2.4]} rotation={0.5} mats={m} />
      <Crate size={0.8} position={[4.8, 0.16, 1.1]} rotation={-0.2} mats={m} />

      <Barrel position={[5.0, 0.16, 2.6]} mats={m} color="accent" />
      {/* Kept off the centre line — the door marker sits at local (0, 6.2)
          and the player has to be able to stand on it. */}
      <Sandbags count={6} rows={3} position={[-4.4, 0.16, 6.6]} rotation={0.32} mats={m} />
      <Sandbags count={4} rows={2} position={[4.6, 0.16, 6.2]} rotation={-0.3} mats={m} />

      {/* Target range behind the tent */}
      {[-2.4, 0, 2.4].map((x, i) => (
        <group key={i} position={[x, 0, -5.4]}>
          <mesh castShadow position={[0, 0.85, 0]} material={m.woodDark}>
            <boxGeometry args={[0.1, 1.7, 0.1]} />
          </mesh>
          <mesh castShadow position={[0, 1.55, 0.04]} material={m.plaster}>
            <boxGeometry args={[0.85, 0.85, 0.05]} />
          </mesh>
          <mesh position={[0, 1.55, 0.08]} material={m.red}>
            <circleGeometry args={[0.26, 16]} />
          </mesh>
          <mesh position={[0, 1.55, 0.09]} material={m.dark}>
            <circleGeometry args={[0.09, 12]} />
          </mesh>
        </group>
      ))}

      {/* Flag pole */}
      <mesh castShadow position={[5.6, 2.2, 5.4]} material={m.metal}>
        <cylinderGeometry args={[0.05, 0.06, 4.4, 6]} />
      </mesh>
      <mesh position={[6.2, 3.8, 5.4]} material={m.red}>
        <boxGeometry args={[1.2, 0.72, 0.03]} />
      </mesh>

      <Colliders
        boxes={[
          { args: [4.25, 1.75, 3.25], position: [0, 1.75, 0] },
          { args: [1.6, 0.5, 0.4], position: [-4.4, 0.45, 6.6], rotation: 0.32 },
          { args: [1.1, 0.4, 0.4], position: [4.6, 0.35, 6.2], rotation: -0.3 },
          { args: [0.06, 2.2, 0.06], position: [5.6, 2.2, 5.4] },
        ]}
      />
    </HouseFrame>
  )
}
