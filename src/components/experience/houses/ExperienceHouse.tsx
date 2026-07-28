import { Colliders, Crate, HouseFrame, Sandbags, Tire, useBuildMats } from './parts'
import { timeline } from '../../../data/portfolioData'

/**
 * House 4 — the training ground: a two-storey observation post looking over
 * an obstacle course. One course obstacle per timeline entry.
 */
export function ExperienceHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="experience" labelHeight={9.4}>
      {/* Packed-earth pad. Deliberately a thick slab sunk into the ground
          rather than a thin sheet: the terrain is only perfectly flat within
          ~7.5 units of the building, so a thin pad would float at its corners
          wherever the ground falls away. Buried, it reads as a raised
          concrete platform instead. */}
      <mesh receiveShadow position={[0, -1.45, 1.5]} material={m.tarmac}>
        <boxGeometry args={[15, 3, 15]} />
      </mesh>

      {/* Observation post — concrete base */}
      <mesh castShadow receiveShadow position={[0, 1.6, 0]} material={m.concrete}>
        <boxGeometry args={[6.2, 3.2, 5.2]} />
      </mesh>
      <mesh position={[0, 0.5, 0]} material={m.concreteDark}>
        <boxGeometry args={[6.26, 1.0, 5.26]} />
      </mesh>

      {/* Upper deck */}
      <mesh castShadow receiveShadow position={[0, 3.4, 0]} material={m.concreteDark}>
        <boxGeometry args={[7.0, 0.35, 6.0]} />
      </mesh>
      <mesh castShadow receiveShadow position={[0, 4.8, -0.5]} material={m.concrete}>
        <boxGeometry args={[5.0, 2.5, 4.0]} />
      </mesh>
      {/* Observation slit */}
      <mesh position={[0, 5.1, 1.52]} material={m.dark}>
        <boxGeometry args={[4.4, 0.8, 0.14]} />
      </mesh>
      <mesh position={[0, 5.1, 1.56]} material={m.glass}>
        <boxGeometry args={[4.2, 0.66, 0.08]} />
      </mesh>

      {/* Roof + railing */}
      <mesh castShadow position={[0, 6.2, -0.5]} material={m.roofMetal}>
        <boxGeometry args={[5.6, 0.24, 4.6]} />
      </mesh>
      {[
        [0, 2.9, 6.6, 0.1],
        [-3.4, 0, 0.1, 5.8],
        [3.4, 0, 0.1, 5.8],
      ].map(([x, z, w, d], i) => (
        <mesh key={i} position={[x, 3.98, z]} material={m.metalDark}>
          <boxGeometry args={[w, 0.9, d]} />
        </mesh>
      ))}

      {/* Access stair on +Z */}
      <group position={[2.1, 0, 3.4]}>
        {Array.from({ length: 7 }, (_, i) => (
          <mesh key={i} castShadow receiveShadow position={[0, 0.35 + i * 0.46, 1.6 - i * 0.42]} material={m.metalDark}>
            <boxGeometry args={[1.5, 0.12, 0.5]} />
          </mesh>
        ))}
        <mesh position={[0.78, 2.0, 0.6]} rotation={[0.73, 0, 0]} material={m.metal}>
          <boxGeometry args={[0.06, 0.06, 4.4]} />
        </mesh>
      </group>

      {/* Doorway on +Z */}
      <mesh position={[-1.6, 1.15, 2.62]} material={m.dark}>
        <boxGeometry args={[1.5, 2.3, 0.12]} />
      </mesh>
      <mesh position={[-1.6, 1.12, 2.7]} material={m.metalDark}>
        <boxGeometry args={[1.3, 2.16, 0.08]} />
      </mesh>
      <pointLight position={[-1.6, 2.2, 3.4]} intensity={6} distance={8} color="#c7b9ff" />

      {/* Obstacle course — one obstacle per timeline entry. Set off to the
          side of the door marker at local (0, 7.0) so the approach stays
          clear, and kept within ~10 units of centre so it sits on flattened
          ground rather than floating over the natural terrain. */}
      {timeline.map((_, i) => {
        const x = -5.2 + i * 5.2
        return (
          <group key={i} position={[x, 0, 9.2]}>
            {/* Low wall */}
            <mesh castShadow receiveShadow position={[0, 0.6, 0]} material={m.wood}>
              <boxGeometry args={[3.0, 1.2, 0.3]} />
            </mesh>
            {[-1.4, 1.4].map((px) => (
              <mesh key={px} castShadow position={[px, 0.65, 0]} material={m.woodDark}>
                <boxGeometry args={[0.22, 1.3, 0.4]} />
              </mesh>
            ))}
            <mesh position={[0, 1.05, 0.17]} material={m.accent}>
              <boxGeometry args={[2.6, 0.14, 0.03]} />
            </mesh>
          </group>
        )
      })}

      {/* Tire run */}
      {Array.from({ length: 6 }, (_, i) => (
        <Tire
          key={i}
          position={[-6.6 + (i % 2) * 1.0, 0.28, 4.6 + Math.floor(i / 2) * 1.0]}
          rotation={[Math.PI / 2, 0, i * 0.4]}
          scale={0.95}
        />
      ))}

      {/* Climbing frame */}
      <group position={[6.8, 0, 6.2]}>
        {[-1.4, 1.4].map((x) => (
          <mesh key={x} castShadow position={[x, 1.6, 0]} material={m.woodDark}>
            <boxGeometry args={[0.2, 3.2, 0.2]} />
          </mesh>
        ))}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={i} castShadow position={[0, 0.6 + i * 0.62, 0]} material={m.wood}>
            <boxGeometry args={[2.9, 0.12, 0.12]} />
          </mesh>
        ))}
      </group>

      {/* Dressing */}
      <Sandbags count={7} rows={3} position={[-5.0, 0.16, 3.8]} rotation={0.06} mats={m} />
      <Crate size={0.9} position={[5.2, 0.16, 2.0]} rotation={0.4} mats={m} />
      <Crate size={0.9} position={[5.3, 1.06, 2.1]} rotation={-0.2} mats={m} />

      {/* Range flag */}
      <mesh castShadow position={[-7.4, 1.7, 2.2]} material={m.metal}>
        <cylinderGeometry args={[0.05, 0.05, 3.4, 6]} />
      </mesh>
      <mesh position={[-6.9, 3.0, 2.2]} material={m.accent}>
        <boxGeometry args={[1.0, 0.6, 0.03]} />
      </mesh>

      <Colliders
        boxes={[
          { args: [3.15, 1.75, 2.65], position: [0, 1.75, 0] },
          { args: [3.5, 0.2, 3.0], position: [0, 3.5, 0] },
          { args: [2.5, 1.4, 2.0], position: [0, 4.9, -0.5] },
          { args: [1.5, 0.6, 0.2], position: [-5.0, 0.5, 3.8] },
          ...timeline.map((_, i) => ({
            args: [1.5, 0.65, 0.2] as [number, number, number],
            position: [-5.2 + i * 5.2, 0.65, 9.2] as [number, number, number],
          })),
          { args: [1.6, 1.6, 0.2], position: [6.8, 1.6, 6.2] },
        ]}
      />
    </HouseFrame>
  )
}
