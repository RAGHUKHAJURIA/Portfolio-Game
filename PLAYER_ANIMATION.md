# Blood Raven player rig

The original `scene.gltf` remains untouched. It contains six static meshes and no
skin or animation. `rig_and_walk.py` imports those meshes, applies their transforms,
removes the camera/light wrappers, normalizes height to 1.85 m, joins the four body
parts, and builds a 22-bone armature. Coincident UV-seam vertices are welded before
automatic weighting; UV loops and the six source material slots are preserved.
Weights are then restricted to nearby joints and the correct body side. Head/mask
are attached to Head; Bag/Wings have 100% Chest weights. The wings remain rigid.

## Rebuild

From the repository root, with Blender 4.4+ on PATH:

```sh
blender -b -P rig_and_walk.py
```

PowerShell on this machine:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' -b -P rig_and_walk.py
```

Output: `public/models/player/blood_raven_x_suit/walk.glb`.
Append `-- --preview` to render front and side contact/passing poses into the OS
temporary directory. The previous `scripts/rig-player-model.py` entry point now
delegates to this builder.

## Playback and tuning

- `CharacterModel.tsx` owns one AnimationMixer and calls `mixer.update()` once per
  frame. No runtime code also writes to its bones. Walk/Run/Idle loop infinitely;
  Jump/Land play once. Transitions fade over 0.25 seconds.
- The Rapier controller still moves the capsule. WASD/arrows, smooth heading,
  collision, autostep, camera and parachute remain in their existing systems.
- The clip is in-place. `distanceTravelled` advances from corrected controller
  displacement, excluding teleports. One cycle advances per authored stride.
  This also prevents a clamped physics timestep from making animation run too
  fast on slow frames.
- `WALK_STRIDE = 1.55`, `RUN_STRIDE = 3.2`, and `ARM_SWING = 0.35` are in
  `rig_and_walk.py`. Rebuild after editing; stride metadata is embedded in the
  GLB and read by the component.
- `src/lib/constants.ts` sets W/arrow movement to `4.2 m/s` and Shift running to
  `8.4 m/s`. Raising speed automatically increases cadence; these are brisk game
  traversal speeds rather than a slow pedestrian pace.
- Blender +Y forward becomes glTF -Z. The fixed visual yaw correction is pi
  because the controller uses +Z at heading zero. The gameplay root uses yaw only.
- The walk uses an offline two-bone sagittal solve for contact, down, passing and
  up phases, with foot roll, pelvis bob and torso counter-twist. It is animation
  synchronized with controller physics; it is not a limb ragdoll or terrain IK.

## Verification checklist

```sh
node scripts/check-player-animation.mjs
npm run check
npm run build
npm run verify
```

For the focused browser regression in PowerShell after building:

```powershell
$env:PLAYER_ONLY='1'; node scripts/verify.mjs
Remove-Item Env:PLAYER_ONLY
```

- Confirm `Walk` exists and has duration 1.0 s; `Idle` is 2.0 s.
- Hold W for more than four complete cycles, release, and resume with ArrowUp.
  Legs must continue, then settle into Idle and restart smoothly.
- Test Shift, jump, slopes, stairs and the complete drop sequence.
- Open `?debug` and evaluate `window.__characterAnimation()` in the console:
  `mixerTime` advances, `walkLoops` increases, and the active state changes.
- Check Network: `walk.glb` is fetched once. Textures are embedded in that GLB.
- Check Console for errors. The CPU regression also checks loop seams, ten-cycle
  playback, forward/back limb travel, static root and normalized height.

## Limits and artist fallback

The source includes overlapping armor and long skirt panels. Automated weights
are corrected at joints, but extreme poses can still need manual weight painting;
the cloth has no simulation. For higher-quality skinning, export the body in a
T-pose without Wings/Bag, upload it to Mixamo, download **With Skin** and obtain a
Walking clip **In Place**. Reattach the original Wings/Bag rigidly to `Spine2`,
then replace the exported asset while preserving the same capsule/controller.

## Attribution

This work is based on "Blood Raven X Suit" (https://sketchfab.com/3d-models/blood-raven-x-suit-a5fd847b2d3c452aa1b7d2e416c0d3d0) by DFLEX (https://sketchfab.com/DFLEX) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Changes: normalized transforms, joined body, skin weights, humanoid rig and
in-place animations. Attribution is also shown on the game's loading screen;
the original `license.txt` is retained alongside the model.
