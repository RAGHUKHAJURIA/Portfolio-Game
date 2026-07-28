import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'

/**
 * One shared material set for every building on the island. Sharing keeps
 * the draw-call count down and — more importantly — keeps the five houses
 * looking like they belong to the same abandoned military installation.
 */
export function useBuildMats() {
  return useMemo(() => {
    const mk = (color: string, roughness = 0.9, metalness = 0) =>
      new MeshStandardMaterial({ color, roughness, metalness, flatShading: true })
    return {
      concrete: mk('#8e8b80'),
      concreteDark: mk('#6f6d64'),
      plaster: mk('#a8a294'),
      metal: mk('#5b6570', 0.55, 0.55),
      metalDark: mk('#3a424c', 0.6, 0.5),
      rust: mk('#7e4c33', 0.95),
      roofTile: mk('#7a3f34'),
      roofMetal: mk('#4d5a5f', 0.5, 0.45),
      wood: mk('#6d5638'),
      woodDark: mk('#4e3d28'),
      crate: mk('#b07a41'),
      canvasTent: mk('#5d6440'),
      canvasDark: mk('#464c30'),
      sandbag: mk('#93855f'),
      glass: mk('#2a3b45', 0.15, 0.6),
      dark: mk('#22262a'),
      accent: mk('#f0a92e', 0.45),
      red: mk('#c0392b', 0.6),
      tarmac: mk('#57544d'),
    }
  }, [])
}

export type BuildMats = ReturnType<typeof useBuildMats>
