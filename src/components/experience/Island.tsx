import { Water } from './Water'
import { Zone } from './Zone'
import { Dust } from './Dust'
import { WorldStreaming } from '../../world/WorldStreaming'

/** Everything that isn't the player, the camera, or the lights. */
export function Island() {
  return (
    <>
      <WorldStreaming />
      <Water />

      <Dust />
      <Zone />
    </>
  )
}
