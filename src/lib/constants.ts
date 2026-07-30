/**
 * Character and drop tuning shared between the controller (Character) and
 * the mesh that has to pose to match it (CharacterModel). Kept in its own
 * module so the two don't have to import each other.
 */

export const CAPSULE_RADIUS = 0.36
export const CAPSULE_HALF = 0.5
/** Distance from the rigid-body origin down to the soles. */
export const FEET_OFFSET = CAPSULE_HALF + CAPSULE_RADIUS

export const WALK_SPEED = 4.2
export const RUN_SPEED = 8.4

/** Boom length once the player has control. */
export const PLAY_DISTANCE = 8.5

/**
 * Where the parachute drop begins and roughly where it lands. Scaled up with
 * the island so the descent actually shows it off, but kept short enough to
 * stay well inside Character's MAX_DROP_SECONDS watchdog.
 */
export const DROP_FROM: [number, number, number] = [55, 78, 70]
export const DROP_TO: [number, number] = [0, 9]
/** World Y at which the canopy opens. */
export const CHUTE_ALTITUDE = 26
export const FREEFALL_TERMINAL = -30
export const CHUTE_SPEED = -10
