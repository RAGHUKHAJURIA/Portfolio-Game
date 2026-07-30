import { useMemo } from 'react'
import { MeshStandardMaterial, Vector2 } from 'three'
import { tiled } from '../../../lib/textures'

/**
 * One shared material set for every building on the island. Sharing keeps
 * the draw-call count down and — more importantly — keeps the five houses
 * looking like they belong to the same abandoned military installation.
 *
 * All of them are PBR (`MeshStandardMaterial`) and pick up the sky as an
 * environment map via `<Environment>` in Lighting. What they were missing was
 * surface detail: a single procedural normal/roughness pair (lib/textures)
 * breaks up the flat facets so the low sun grazes across concrete and canvas
 * instead of leaving each face one uniform tone.
 */
export function useBuildMats() {
  return useMemo(() => {
    // Buildings are boxes with 0..1 UVs per face and faces a few units across,
    // so one tile density suits all of them and they can share the sampler.
    const normalMap = tiled('normal', 3)
    const roughnessMap = tiled('roughness', 3)

    const mk = (color: string, roughness = 0.9, metalness = 0, bump = 1) =>
      new MeshStandardMaterial({
        color,
        roughness,
        metalness,
        flatShading: true,
        normalMap,
        normalScale: new Vector2(bump, bump),
        // Painted and glazed surfaces stay evenly glossy; everything else gets
        // the mottled roughness that makes weathering read.
        roughnessMap: bump > 0.35 ? roughnessMap : null,
      })

    return {
      // Pulled down from #8e8b80/#a8a294: the sky environment map adds a lot
      // of light to a rough light surface, and at the old values the buildings
      // read as freshly painted rather than weathered.
      concrete: mk('#807b70'),
      concreteDark: mk('#63615a'),
      plaster: mk('#978f80'),
      metal: mk('#5b6570', 0.55, 0.55, 0.5),
      metalDark: mk('#3a424c', 0.6, 0.5, 0.5),
      rust: mk('#7e4c33', 0.95, 0, 1.4),
      roofTile: mk('#7a3f34'),
      roofMetal: mk('#4d5a5f', 0.5, 0.45, 0.5),
      wood: mk('#6d5638', 0.9, 0, 1.2),
      woodDark: mk('#4e3d28', 0.9, 0, 1.2),
      crate: mk('#b07a41', 0.9, 0, 1.2),
      canvasTent: mk('#5d6440', 0.95, 0, 1.3),
      canvasDark: mk('#464c30', 0.95, 0, 1.3),
      sandbag: mk('#93855f', 1, 0, 1.6),
      glass: mk('#2a3b45', 0.15, 0.6, 0),
      dark: mk('#22262a', 0.85, 0, 0.6),
      accent: mk('#f0a92e', 0.45, 0, 0.3),
      red: mk('#c0392b', 0.6, 0, 0.3),
      // Light enough to read as gravel against bright grass. Darker than
      // this and the aprons look like holes cut in the ground.
      tarmac: mk('#827c6e', 0.95, 0, 2),
    }
  }, [])
}

export type BuildMats = ReturnType<typeof useBuildMats>
