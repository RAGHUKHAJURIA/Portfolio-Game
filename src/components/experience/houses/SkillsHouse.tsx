import { Barrel, Colliders, Crate, HouseFrame, Sandbags, useBuildMats } from './parts'
import { HouseInterior, IN_X, IN_Z, UPPER_H, UPPER_Y } from './HouseInterior'
import { loadout } from '../../../data/portfolioData'

const OUT_X = IN_X + 0.3
const OUT_Z = IN_Z + 0.3
const EAVE = UPPER_Y + UPPER_H + 0.25

/**
 * House 3 — the armory: a sandbagged concrete blockhouse under a canvas
 * awning, with weapon racks flanking the entrance. The old field tent could
 * not be made two-storey and walk-in, so the canvas moved to the awning and
 * the building underneath became a blockhouse. The loadout board upstairs is
 * what opens the panel; there's one rack post per loadout slot outside.
 */
export function SkillsHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="skills" labelHeight={10.2}>
      {/* Gravel pad — thick slab sunk into the ground, not a thin sheet. */}
      <mesh receiveShadow position={[0, -1.46, 1]} material={m.tarmac}>
        <boxGeometry args={[15, 3, 15]} />
      </mesh>

      <HouseInterior mats={m} lampColor="#ffb08a">
        {/* ── Content object: the loadout board, one row per slot. ── */}
        <group position={[2.2, UPPER_Y, -IN_Z + 0.35]}>
          <mesh castShadow receiveShadow position={[0, 1.5, 0.06]} material={m.metalDark}>
            <boxGeometry args={[2.8, 2.0, 0.1]} />
          </mesh>
          <mesh position={[0, 1.5, 0.12]} material={m.dark}>
            <boxGeometry args={[2.6, 1.8, 0.03]} />
          </mesh>
          {loadout.map((_, i) => (
            <group key={i} position={[-0.9, 2.15 - i * 0.34, 0.15]}>
              <mesh material={m.accent}>
                <boxGeometry args={[0.2, 0.2, 0.02]} />
              </mesh>
              <mesh position={[0.9, 0, 0]} material={m.sandbag}>
                <boxGeometry args={[1.4, 0.12, 0.02]} />
              </mesh>
            </group>
          ))}
          {/* Rifle rack under the board */}
          <mesh castShadow position={[0, 0.62, 0.7]} material={m.woodDark}>
            <boxGeometry args={[2.4, 0.1, 0.4]} />
          </mesh>
          <mesh castShadow position={[0, 1.1, 0.7]} material={m.woodDark}>
            <boxGeometry args={[2.4, 0.08, 0.35]} />
          </mesh>
          {[-0.75, -0.25, 0.25, 0.75].map((x) => (
            <group key={x} position={[x, 0.9, 0.7]} rotation={[0, 0, 0.05]}>
              <mesh castShadow material={m.dark}>
                <boxGeometry args={[0.06, 0.8, 0.06]} />
              </mesh>
              <mesh position={[0, -0.28, 0.04]} material={m.woodDark}>
                <boxGeometry args={[0.08, 0.28, 0.1]} />
              </mesh>
            </group>
          ))}
          <pointLight position={[0, 2.2, 1.2]} intensity={3.4} distance={4.5} color="#ffc48a" />
        </group>

        {/* Ground floor: ammo crates and a workbench. */}
        <Crate size={0.85} position={[-3.5, 0, 2.4]} rotation={0.2} mats={m} />
        <Crate size={0.85} position={[-3.5, 0.85, 2.4]} rotation={-0.3} mats={m} accent />
        <Crate size={0.85} position={[-3.4, 0, 1.3]} rotation={0.5} mats={m} />
        <Barrel position={[3.6, 0, 2.6]} mats={m} color="accent" />
        <mesh castShadow receiveShadow position={[3.2, 0.45, -2.2]} material={m.wood}>
          <boxGeometry args={[2.4, 0.1, 1.0]} />
        </mesh>
        {[2.2, 4.2].map((x) => (
          <mesh key={x} castShadow position={[x, 0.2, -2.2]} material={m.woodDark}>
            <boxGeometry args={[0.12, 0.4, 0.9]} />
          </mesh>
        ))}
      </HouseInterior>

      {/* Sandbag revetment banked against the outside walls */}
      <Sandbags count={9} rows={3} position={[-OUT_X - 0.45, 0, -1.5]} rotation={Math.PI / 2} mats={m} />
      <Sandbags count={9} rows={3} position={[OUT_X + 0.45, 0, -1.5]} rotation={Math.PI / 2} mats={m} />
      <Sandbags count={7} rows={4} position={[0, 0, -OUT_Z - 0.45]} rotation={0} mats={m} />

      {/* Concrete banding so the blockhouse doesn't read as one flat slab */}
      <mesh position={[0, 0.55, 0]} material={m.concrete}>
        <boxGeometry args={[OUT_X * 2 + 0.08, 1.1, OUT_Z * 2 + 0.08]} />
      </mesh>
      <mesh position={[0, UPPER_Y - 0.1, 0]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 0.12, 0.36, OUT_Z * 2 + 0.12]} />
      </mesh>

      {/* Flat roof with a parapet — an armoury doesn't get a pitched roof. */}
      <mesh castShadow receiveShadow position={[0, EAVE + 0.2, 0]} material={m.concreteDark}>
        <boxGeometry args={[OUT_X * 2 + 0.8, 0.4, OUT_Z * 2 + 0.8]} />
      </mesh>
      {[
        [0, OUT_Z + 0.4, OUT_X * 2 + 0.8, 0.26],
        [0, -OUT_Z - 0.4, OUT_X * 2 + 0.8, 0.26],
        [OUT_X + 0.4, 0, 0.26, OUT_Z * 2 + 0.8],
        [-OUT_X - 0.4, 0, 0.26, OUT_Z * 2 + 0.8],
      ].map(([px, pz, w, d], i) => (
        <mesh key={i} castShadow position={[px, EAVE + 0.85, pz]} material={m.concrete}>
          <boxGeometry args={[w, 0.9, d]} />
        </mesh>
      ))}

      {/* Canvas awning over the entrance, the last of the old field-tent look */}
      <group position={[0, 0, OUT_Z + 1.5]}>
        <mesh castShadow position={[0, 2.9, 0]} rotation={[0.2, 0, 0]} material={m.canvasDark}>
          <boxGeometry args={[6.4, 0.14, 3.4]} />
        </mesh>
        {[-2.8, 2.8].map((x) => (
          <mesh key={x} castShadow position={[x, 1.5, 1.4]} material={m.woodDark}>
            <boxGeometry args={[0.16, 3, 0.16]} />
          </mesh>
        ))}
        {/* Guy ropes to the ground */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3.5, 0.9, 2.2]} rotation={[0.5, 0, s * -0.5]} material={m.sandbag}>
            <cylinderGeometry args={[0.02, 0.02, 2.6, 4]} />
          </mesh>
        ))}
      </group>
      <pointLight position={[0, 2.4, OUT_Z + 0.9]} intensity={7} distance={9} color="#ffb08a" />

      {/* Weapon racks flanking the entrance — one post per loadout slot */}
      {loadout.map((_, i) => {
        const side = i % 2 === 0 ? -1 : 1
        const idx = Math.floor(i / 2)
        return (
          <group key={i} position={[side * (3.2 + idx * 1.6), 0, OUT_Z + 3.4]} rotation={[0, side * 0.25, 0]}>
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
              </group>
            ))}
          </group>
        )
      })}

      {/* Dressing kept off the door line — the marker sits at local (0, 6.2). */}
      <Sandbags count={6} rows={3} position={[-4.6, 0, OUT_Z + 2.2]} rotation={0.32} mats={m} />
      <Crate size={0.8} position={[5.2, 0, OUT_Z + 1.4]} rotation={-0.2} mats={m} />
      <Barrel position={[5.6, 0, OUT_Z + 2.4]} mats={m} color="accent" />

      {/* Flag pole */}
      <mesh castShadow position={[6.4, 2.2, OUT_Z + 0.8]} material={m.metal}>
        <cylinderGeometry args={[0.05, 0.06, 4.4, 6]} />
      </mesh>
      <mesh position={[7.0, 3.8, OUT_Z + 0.8]} material={m.red}>
        <boxGeometry args={[1.2, 0.72, 0.03]} />
      </mesh>

      <Colliders
        boxes={[
          { args: [1.6, 0.5, 0.4], position: [-4.6, 0.45, OUT_Z + 2.2], rotation: 0.32 },
          { args: [0.06, 2.2, 0.06], position: [6.4, 2.2, OUT_Z + 0.8] },
        ]}
      />
    </HouseFrame>
  )
}
