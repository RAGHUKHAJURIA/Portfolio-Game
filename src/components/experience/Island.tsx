import { Water } from './Water'
import { Zone } from './Zone'
import { Dust } from './Dust'
import { WorldStreaming } from '../../world/WorldStreaming'
import { perfFlag } from '../../lib/perfFlags'

/** Everything that isn't the player, the camera, or the lights. */
export function Island() {
  return (
    <>
      <WorldStreaming />
      {!perfFlag('water') && <Water />}

      {!perfFlag('particles') && <Dust />}
      <Zone />
    </>
  )
}
