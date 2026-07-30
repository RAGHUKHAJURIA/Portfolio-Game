import { Colliders, Crate, HouseFrame, Sandbags, Tire, useBuildMats } from './parts'
import { HouseInterior, IN_X, IN_Z, UPPER_H, UPPER_Y } from './HouseInterior'
import { timeline } from '../../../data/portfolioData'

const OUT_X = IN_X + 0.3
const OUT_Z = IN_Z + 0.3
const EAVE = UPPER_Y + UPPER_H + 0.25

/**
 * House 4 — the training ground: a walk-in observation post overlooking an
 * obstacle course. One course obstacle per timeline entry outside; the
 * briefing board on the upper floor is what opens the panel.
 */
export function ExperienceHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="experience" labelHeight={10.4}>
      {/* Packed-earth pad. Deliberately a thick slab sunk into the ground
          rather than a thin sheet: the terrain is only perfectly flat within
          ~10 units of the building, so a thin pad would float at its corners
          wherever the ground falls away. Buried, it reads as a raised
          concrete platform instead. */}
      <mesh receiveShadow position={[0, -1.45, 1.5]} material={m.tarmac}>
        <boxGeometry args={[16, 3, 16]} />
      </mesh>

      <HouseInterior mats={m} lampColor="#cdbcff">
        {/* ── Content object: the briefing board and map table. ── */}
        <group position={[2.2, UPPER_Y, -IN_Z + 0.35]}>
          <mesh castShadow receiveShadow position={[0, 1.6, 0.06]} material={m.dark}>
            <boxGeometry args={[2.9, 1.9, 0.1]} />
          </mesh>
          {/* One pinned card per timeline entry, on a rising diagonal */}
          {timeline.map((_, i) => (
            <group key={i} position={[-1.0 + i * 0.65, 1.2 + i * 0.32, 0.13]}>
              <mesh material={m.plaster}>
                <boxGeometry args={[0.52, 0.36, 0.02]} />
              </mesh>
              <mesh position={[0, 0.24, 0.01]} material={m.accent}>
                <boxGeometry args={[0.52, 0.06, 0.02]} />
              </mesh>
            </group>
          ))}
          {/* Map table below it */}
          <mesh castShadow receiveShadow position={[0, 0.78, 0.75]} material={m.metalDark}>
            <boxGeometry args={[2.2, 0.09, 1.2]} />
          </mesh>
          {[-0.95, 0.95].map((x) =>
            [-0.45, 0.45].map((z) => (
              <mesh key={`${x}${z}`} castShadow position={[x, 0.38, 0.75 + z]} material={m.metal}>
                <boxGeometry args={[0.08, 0.76, 0.08]} />
              </mesh>
            ))
          )}
          <mesh position={[0, 0.84, 0.75]} rotation={[-Math.PI / 2, 0, 0.1]} material={m.sandbag}>
            <planeGeometry args={[1.7, 0.95]} />
          </mesh>
          <pointLight position={[0, 2.1, 1.2]} intensity={3.4} distance={4.5} color="#cdbcff" />
        </group>

        {/* Ground floor: kit benches and a locker row. */}
        {[-1, 1].map((s) => (
          <mesh key={s} castShadow receiveShadow position={[s * 3.4, 0.45, -1.2]} material={m.wood}>
            <boxGeometry args={[1.4, 0.1, 3.4]} />
          </mesh>
        ))}
        {[-1, 1].map((s) =>
          [-2.4, 0.0].map((z) => (
            <mesh key={`${s}${z}`} castShadow position={[s * 3.4, 0.2, z]} material={m.woodDark}>
              <boxGeometry args={[1.2, 0.4, 0.14]} />
            </mesh>
          ))
        )}
        {[-1.4, -0.5, 0.4].map((x) => (
          <mesh key={x} castShadow receiveShadow position={[x, 1.0, -IN_Z + 0.4]} material={m.metalDark}>
            <boxGeometry args={[0.8, 2.0, 0.5]} />
          </mesh>
        ))}
        <Crate size={0.85} position={[3.3, 0, 2.6]} rotation={0.35} mats={m} />
      </HouseInterior>

      {/* Concrete banding */}
      <mesh position={[0, 0.5, 0]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 0.08, 1.0, OUT_Z * 2 + 0.08]} />
      </mesh>

      {/* Cantilevered observation deck around the upper floor */}
      <mesh castShadow receiveShadow position={[0, UPPER_Y - 0.12, 0]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 1.8, 0.3, OUT_Z * 2 + 1.8]} />
      </mesh>
      {[
        [0, OUT_Z + 0.9, OUT_X * 2 + 1.8, 0.1],
        [0, -OUT_Z - 0.9, OUT_X * 2 + 1.8, 0.1],
        [OUT_X + 0.9, 0, 0.1, OUT_Z * 2 + 1.8],
        [-OUT_X - 0.9, 0, 0.1, OUT_Z * 2 + 1.8],
      ].map(([px, pz, w, d], i) => (
        <mesh key={i} position={[px, UPPER_Y + 0.45, pz]} material={m.metalDark}>
          <boxGeometry args={[w, 0.9, d]} />
        </mesh>
      ))}

      {/* Observation slit band on the upper storey */}
      <mesh position={[0, UPPER_Y + 1.5, OUT_Z + 0.03]} material={m.dark}>
        <boxGeometry args={[6.4, 0.9, 0.12]} />
      </mesh>
      <mesh position={[0, UPPER_Y + 1.5, OUT_Z + 0.07]} material={m.glass}>
        <boxGeometry args={[6.1, 0.72, 0.08]} />
      </mesh>

      {/* Flat roof + railing */}
      <mesh castShadow receiveShadow position={[0, EAVE + 0.2, 0]} material={m.roofMetal}>
        <boxGeometry args={[OUT_X * 2 + 0.9, 0.4, OUT_Z * 2 + 0.9]} />
      </mesh>
      {[
        [0, OUT_Z + 0.45, OUT_X * 2 + 0.9, 0.1],
        [0, -OUT_Z - 0.45, OUT_X * 2 + 0.9, 0.1],
        [OUT_X + 0.45, 0, 0.1, OUT_Z * 2 + 0.9],
        [-OUT_X - 0.45, 0, 0.1, OUT_Z * 2 + 0.9],
      ].map(([px, pz, w, d], i) => (
        <mesh key={i} position={[px, EAVE + 0.85, pz]} material={m.metalDark}>
          <boxGeometry args={[w, 0.9, d]} />
        </mesh>
      ))}

      {/* Doorway surround on +Z */}
      <mesh position={[0, 1.2, OUT_Z + 0.02]} material={m.dark}>
        <boxGeometry args={[2.2, 2.7, 0.12]} />
      </mesh>
      <mesh position={[0, 2.62, OUT_Z + 0.08]} material={m.accent}>
        <boxGeometry args={[2.4, 0.16, 0.2]} />
      </mesh>
      <pointLight position={[0, 2.3, OUT_Z + 0.9]} intensity={6} distance={9} color="#c7b9ff" />

      {/* Obstacle course — one obstacle per timeline entry. Set off to the
          side of the door marker at local (0, 7.0) so the approach stays
          clear, and kept within ~10 units of centre so it sits on flattened
          ground rather than floating over the natural terrain. */}
      {timeline.map((_, i) => {
        const x = -5.2 + i * 5.2
        return (
          <group key={i} position={[x, 0, 10.2]}>
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
          position={[-7.4 + (i % 2) * 1.0, 0.28, 5.6 + Math.floor(i / 2) * 1.0]}
          rotation={[Math.PI / 2, 0, i * 0.4]}
          scale={0.95}
        />
      ))}

      {/* Climbing frame */}
      <group position={[7.6, 0, 6.6]}>
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
      <Sandbags count={7} rows={3} position={[-5.6, 0, OUT_Z + 0.9]} rotation={0.06} mats={m} />
      <Crate size={0.9} position={[5.6, 0, OUT_Z + 0.8]} rotation={0.4} mats={m} />
      <Crate size={0.9} position={[5.7, 0.9, OUT_Z + 0.9]} rotation={-0.2} mats={m} />

      {/* Range flag */}
      <mesh castShadow position={[-8.0, 1.7, 2.2]} material={m.metal}>
        <cylinderGeometry args={[0.05, 0.05, 3.4, 6]} />
      </mesh>
      <mesh position={[-7.5, 3.0, 2.2]} material={m.accent}>
        <boxGeometry args={[1.0, 0.6, 0.03]} />
      </mesh>

      <Colliders
        boxes={[
          { args: [1.5, 0.6, 0.2], position: [-5.6, 0.5, OUT_Z + 0.9] },
          ...timeline.map((_, i) => ({
            args: [1.5, 0.65, 0.2] as [number, number, number],
            position: [-5.2 + i * 5.2, 0.65, 10.2] as [number, number, number],
          })),
          { args: [1.6, 1.6, 0.2], position: [7.6, 1.6, 6.6] },
        ]}
      />
    </HouseFrame>
  )
}
