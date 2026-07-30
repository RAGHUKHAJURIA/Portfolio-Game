import { Terrain } from './Terrain'
import { Water } from './Water'
import { Props } from './Props'
import { Zone } from './Zone'
import { ShootingRange } from './range/ShootingRange'
import { Dust } from './Dust'
import { AboutHouse } from './houses/AboutHouse'
import { ProjectsHouse } from './houses/ProjectsHouse'
import { SkillsHouse } from './houses/SkillsHouse'
import { ExperienceHouse } from './houses/ExperienceHouse'
import { ContactHouse } from './houses/ContactHouse'

/** Everything that isn't the player, the camera, or the lights. */
export function Island() {
  return (
    <>
      <Terrain />
      <Water />
      <Props />

      <AboutHouse />
      <ProjectsHouse />
      <SkillsHouse />
      <ExperienceHouse />
      <ContactHouse />

      <ShootingRange />

      <Dust />
      <Zone />
    </>
  )
}
