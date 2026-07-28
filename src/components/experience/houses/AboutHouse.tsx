import { Colliders, Crate, HouseFrame, Sandbags, useBuildMats } from './parts'

/** House 1 — a small weathered bungalow with a porch. Door faces +Z. */
export function AboutHouse() {
  const m = useBuildMats()

  return (
    <HouseFrame id="about" labelHeight={6.4}>
      {/* Foundation */}
      <mesh receiveShadow position={[0, 0.14, 0.4]} material={m.concreteDark}>
        <boxGeometry args={[8.6, 0.28, 8]} />
      </mesh>

      {/* Main volume */}
      <mesh castShadow receiveShadow position={[0, 1.85, 0]} material={m.plaster}>
        <boxGeometry args={[7.4, 3.2, 6.4]} />
      </mesh>

      {/* Weathered lower band */}
      <mesh position={[0, 0.62, 0]} material={m.concrete}>
        <boxGeometry args={[7.46, 0.75, 6.46]} />
      </mesh>

      {/* Gable roof. Sign matters: rotation.x = +θ drops the panel's far
          edge, which is what makes a ridge. Negating it builds a butterfly
          roof that rises outward and leaves the ridge cap in mid-air. */}
      <group position={[0, 3.45, 0]}>
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            castShadow
            receiveShadow
            position={[0, 0.62, s * 1.68]}
            rotation={[s * 0.62, 0, 0]}
            material={m.roofTile}
          >
            <boxGeometry args={[8.2, 0.22, 4.1]} />
          </mesh>
        ))}
        {/* Ridge cap, sitting on the peak the panels actually meet at. */}
        <mesh position={[0, 1.8, 0]} material={m.roofMetal}>
          <boxGeometry args={[8.3, 0.18, 0.42]} />
        </mesh>
        {/* Gable infill closing the triangle at each end */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 3.7, 0.82, 0]} material={m.plaster}>
            <boxGeometry args={[0.12, 1.75, 3.1]} />
          </mesh>
        ))}
      </group>

      {/* Chimney */}
      <mesh castShadow position={[2.3, 4.7, -1.4]} material={m.concreteDark}>
        <boxGeometry args={[0.7, 1.5, 0.7]} />
      </mesh>

      {/* Door recess + door */}
      <mesh position={[0, 1.15, 3.22]} material={m.dark}>
        <boxGeometry args={[1.5, 2.3, 0.12]} />
      </mesh>
      <mesh position={[0, 1.12, 3.3]} material={m.wood}>
        <boxGeometry args={[1.24, 2.14, 0.1]} />
      </mesh>
      <mesh position={[0.42, 1.12, 3.37]} material={m.metal}>
        <sphereGeometry args={[0.06, 8, 6]} />
      </mesh>

      {/* Windows */}
      {[
        [-2.5, 1.9, 3.23],
        [2.5, 1.9, 3.23],
        [-3.72, 1.9, -1.2],
        [3.72, 1.9, 1.2],
      ].map((p, i) => {
        const sideWall = i >= 2
        return (
          <group key={i} position={p as [number, number, number]} rotation={[0, sideWall ? Math.PI / 2 : 0, 0]}>
            <mesh material={m.woodDark}>
              <boxGeometry args={[1.32, 1.22, 0.1]} />
            </mesh>
            <mesh position={[0, 0, 0.05]} material={m.glass}>
              <boxGeometry args={[1.14, 1.04, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.09]} material={m.woodDark}>
              <boxGeometry args={[0.06, 1.04, 0.04]} />
            </mesh>
          </group>
        )
      })}

      {/* Porch */}
      <group position={[0, 0, 4.3]}>
        <mesh receiveShadow position={[0, 0.32, 0]} material={m.wood}>
          <boxGeometry args={[5.2, 0.16, 2.2]} />
        </mesh>
        {[-2.2, 2.2].map((x) => (
          <mesh key={x} castShadow position={[x, 1.4, 0.8]} material={m.wood}>
            <boxGeometry args={[0.18, 2.3, 0.18]} />
          </mesh>
        ))}
        {/* Slopes down and away from the house, like a porch awning should. */}
        <mesh castShadow position={[0, 2.66, 0.2]} rotation={[0.17, 0, 0]} material={m.roofMetal}>
          <boxGeometry args={[5.6, 0.14, 2.6]} />
        </mesh>
        {/* Steps */}
        {[0, 1].map((i) => (
          <mesh key={i} receiveShadow position={[0, 0.2 - i * 0.11, 1.35 + i * 0.35]} material={m.concrete}>
            <boxGeometry args={[2.4, 0.12, 0.36]} />
          </mesh>
        ))}
      </group>

      {/* Dressing */}
      <Crate size={0.9} position={[-3.3, 0.34, 4.6]} rotation={0.3} mats={m} />
      <Crate size={0.7} position={[-3.5, 1.24, 4.5]} rotation={-0.5} mats={m} />
      <Sandbags count={4} rows={2} position={[3.6, 0.3, 4.4]} rotation={0.1} mats={m} />

      {/* Hanging lamp by the door */}
      <mesh position={[1.0, 2.5, 3.28]} material={m.metalDark}>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
      </mesh>
      <pointLight position={[1.0, 2.35, 3.6]} intensity={4} distance={7} color="#ffca7a" />

      {/* Physics: one solid mass for the house, one for the porch deck. */}
      <Colliders
        boxes={[
          { args: [3.75, 2.4, 3.25], position: [0, 2.4, 0] },
          { args: [2.6, 0.22, 1.1], position: [0, 0.3, 4.3] },
          { args: [0.12, 1.2, 0.12], position: [-2.2, 1.4, 5.1] },
          { args: [0.12, 1.2, 0.12], position: [2.2, 1.4, 5.1] },
        ]}
      />
    </HouseFrame>
  )
}
