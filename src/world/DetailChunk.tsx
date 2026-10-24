import { memo, useMemo } from 'react'
import { TerrainChunk } from '../components/experience/Terrain'
import { ChunkDebris, ChunkPropColliders, CentralProps, LandmarkProps } from '../components/experience/Props'
import { StreamedProps } from './StreamedProps'
import { AboutHouse } from '../components/experience/houses/AboutHouse'
import { ProjectsHouse } from '../components/experience/houses/ProjectsHouse'
import { SkillsHouse } from '../components/experience/houses/SkillsHouse'
import { ExperienceHouse } from '../components/experience/houses/ExperienceHouse'
import { ContactHouse } from '../components/experience/houses/ContactHouse'
import { ShootingRange } from '../components/experience/range/ShootingRange'
import { RANGE_ORIGIN } from '../lib/terrain'
import { contentFor } from './manifest'
import { chunkOf, type ChunkCoord, type Detail } from './config'

type Entry = { coord: ChunkCoord; detail: Detail }
export function WorldProps({ entries }: { entries: Entry[] }) {
  const visible = useMemo(() => {
    const empty = () => ({ trees: [], pines: [], broadleaf: [], bushes: [], rocks: [],
      tufts: [], debris: [], shoreRocks: [], boundaryPosts: [], houses: [] }) as ReturnType<typeof contentFor>
    const visible = empty()
    for (const entry of entries) {
      const content = contentFor(entry.coord)
      if (entry.detail === 'high') {
        visible.trees.push(...content.trees)
        visible.pines.push(...content.pines)
        visible.broadleaf.push(...content.broadleaf)
        visible.bushes.push(...content.bushes)
        visible.rocks.push(...content.rocks)
        visible.tufts.push(...content.tufts)
        visible.shoreRocks.push(...content.shoreRocks)
        visible.boundaryPosts.push(...content.boundaryPosts)
      } else {
        visible.trees.push(...content.trees.filter((_, i) => i % 3 === 0))
        visible.pines.push(...content.pines.filter((_, i) => i % 3 === 0))
        visible.broadleaf.push(...content.broadleaf.filter((_, i) => i % 3 === 0))
        visible.bushes.push(...content.bushes.filter((_, i) => i % 4 === 0))
        visible.rocks.push(...content.rocks.filter((_, i) => i % 3 === 0))
        visible.shoreRocks.push(...content.shoreRocks.filter((_, i) => i % 3 === 0))
      }
    }
    return visible
  }, [entries])
  return <StreamedProps content={visible} />
}

/** Exact existing authored content, mounted only where it belongs. */
export const DetailChunk = memo(function DetailChunk({ coord, detail }: { coord: ChunkCoord; detail: Detail }) {
  const content = contentFor(coord)
  const here = (x: number, z: number) => {
    const c = chunkOf(x, z)
    return c.x === coord.x && c.z === coord.z
  }
  return <>
    {detail === 'high' && <TerrainChunk coord={coord} />}
    {detail === 'high' && <>
      <ChunkPropColliders content={content} />
      <ChunkDebris content={content} />
      {content.houses.includes('about') && <AboutHouse />}
      {content.houses.includes('projects') && <ProjectsHouse />}
      {content.houses.includes('skills') && <SkillsHouse />}
      {content.houses.includes('experience') && <ExperienceHouse />}
      {content.houses.includes('contact') && <ContactHouse />}
      {here(0, 2) && <CentralProps />}
      {here(-104, -84) && <LandmarkProps kind="tower" />}
      {here(96, 96) && <LandmarkProps kind="cargo" />}
      {here(RANGE_ORIGIN[0], RANGE_ORIGIN[1]) && <ShootingRange />}
    </>}
  </>
})
