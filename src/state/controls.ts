/**
 * Per-frame mutable state, deliberately outside React.
 *
 * Anything read or written every frame (input axes, camera orbit, player
 * transform) lives here as a plain object. Routing this through zustand would
 * re-render the whole tree 60×/second for no benefit — the 3D scene reads
 * these directly inside useFrame, and only genuinely UI-facing state
 * (which panel is open, load progress) goes through the store.
 */

/** Normalised movement intent in camera space. */
export const input = {
  /** −1 back … +1 forward */
  forward: 0,
  /** −1 left … +1 right */
  right: 0,
  jump: false,
  sprint: false,
  /** Rising-edge interact; consumed by the interaction system. */
  interactPressed: false,
}

/** Orbit state for the third-person camera. */
export const cameraOrbit = {
  /** Horizontal angle, radians. Character faces this on move. */
  yaw: 0,
  /** Vertical angle, radians. Clamped in CameraRig. */
  pitch: 0.28,
  /** Boom length. */
  distance: 8.5,
  targetDistance: 8.5,
}

/** Live player transform, published by Character for HUD/minimap/proximity. */
export const playerState = {
  x: 0,
  y: 2,
  z: 6,
  /** Facing direction, radians. */
  heading: 0,
  /** Horizontal speed, world units/sec. */
  speed: 0,
  grounded: true,
  /** 0 idle, 1 walk, 2 run */
  gait: 0 as 0 | 1 | 2,
}

export const resetInput = () => {
  input.forward = 0
  input.right = 0
  input.jump = false
  input.sprint = false
  input.interactPressed = false
}
