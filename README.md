# Drop Zone — 3D Battle-Royale Portfolio

An interactive, single-page 3D portfolio. You parachute onto a small island,
walk a third-person character around it, and open each building to read a
section of the portfolio: About, Projects, Skills, Experience, Contact.

Built in the spirit of [bruno-simon.com](https://bruno-simon.com), with a
battle-royale island instead of a go-kart playground.

---

## Everything here is procedural

There are **no downloaded 3D models, textures, or audio files**. The island,
the buildings, the trees, the character, and every sound are generated in
code at runtime:

| Thing | How it's made |
|---|---|
| Terrain | Value-noise heightfield (`src/lib/terrain.ts`), vertex-coloured by height, slope and trail proximity |
| Buildings | Composed from three.js box/cylinder primitives with hand-placed cuboid colliders |
| Character | Box-and-joint rig with a code-driven gait — leg/arm swing derived from actual movement speed |
| Trees, rocks, grass | Deterministic scatter into `<Instances>` — one draw call per prop type |
| Audio | Web Audio API: filtered noise bursts for footsteps, FM tones for UI, an LFO'd noise bed for wind |

This keeps the download tiny, sidesteps any asset licensing question, and
makes the whole island look like it belongs to one art direction.

The island is deterministic: the same seed produces the same layout on every
load, which is what lets the minimap, the dirt trails, and the prop scatter
all agree with each other.

---

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run build     # production build into dist/
npm run preview   # serve the production build
```

### Checks

```bash
npm run check     # typecheck + island/content invariants
npm run verify    # the above, plus a headless browser walkthrough
```

`npm run check` runs `scripts/smoke.ts`, which asserts things that are easy
to break by nudging a number: every building sits above sea level, every door
marker is reachable and inside the play boundary, no two interaction triggers
overlap, the trails are shallow enough for the character controller to climb,
and the content arrays are well-formed.

`npm run verify` additionally builds the site, launches it in headless
Chromium, drops in, walks around, opens all five panels, and fails on any
console error. Screenshots land in `shots/`. (Headless uses software WebGL,
so it runs at a few frames per second — that is the renderer, not the app.)

---

## Controls

**Desktop** — `WASD` / arrows to move, `Shift` to sprint, `Space` to jump,
drag the mouse to orbit the camera, scroll to zoom, `E` to enter a building,
`Esc` to close a panel.

**Mobile** — left-thumb joystick to move (push past ~72% of its travel to
sprint), drag the right half of the screen to look, on-screen buttons to jump
and enter.

---

## Editing the content

**All portfolio copy lives in one file: `src/data/portfolioData.ts`.** Nothing
else needs touching for a content update. It holds:

- `profile` — name, tagline, links, resume path
- `about` — dossier copy, stat block, focus areas
- `projects` — the crates in the warehouse, each with bullets, stack and links
- `loadout` — skills, as equipment slots with 1–5 proficiency bars
- `timeline` — education, experience and field-work entries
- `contactChannels` — email / GitHub / LinkedIn
- `HOUSE_DEFS` — where each building sits on the island and how it's labelled

### Before shipping — search the file for `// FILL IN`

1. **GitHub and LinkedIn URLs** in `profile` are placeholders.
2. **Resume** — drop your PDF at `public/resume.pdf` (or change `resumeUrl`).
3. **Project links** — every project has an empty `links: []`. Add
   `{ label: 'GitHub', url: '…' }` / `{ label: 'Live demo', url: '…' }` entries;
   the detail panel renders them automatically and shows "links coming soon"
   until you do.
4. **Project metrics** — accuracy, latency, dataset size. The bullets read as
   engineering descriptions right now; a number or two would sharpen them.
5. **Internships / hackathons** — there's a commented-out template in
   `timeline` ready to fill in.
6. **Skill levels** in `loadout` are a first pass. Adjust them to taste.

Adding a project automatically adds a crate to the warehouse. Adding a
timeline entry automatically adds an obstacle to the training ground.

### Moving a building

Edit its entry in `HOUSE_DEFS`. `position` is `[x, z]` on the island,
`rotation` is the Y-rotation in radians, and `doorDistance` is how far in
front of the door the interaction marker sits. Every building's door is
authored on its local `+Z`, so the marker, the dirt trail, and the minimap
pin are all derived from those three numbers — you never have to keep two
positions in sync by hand. Re-run `npm run check` afterwards; it will tell you
if you've put a building in the sea or made two triggers overlap.

---

## Layout

```
src/
  components/
    experience/          # everything inside the <Canvas>
      Terrain.tsx        # heightfield mesh + trimesh collider
      Water.tsx          # animated sea
      Props.tsx          # instanced trees/rocks/grass, debris, boundary
      Character.tsx      # Rapier kinematic character controller + drop
      CharacterModel.tsx # the procedural operator and their parachute
      CameraRig.tsx      # damped third-person boom with collision
      Lighting.tsx       # sun, sky, fog, player-tracking shadow frustum
      Zone.tsx           # decorative shrinking blue circle
      houses/            # the five buildings + shared parts and materials
    ui/                  # everything outside the <Canvas> (Tailwind)
      LoadingScreen.tsx  # boot log + DROP IN
      Hud.tsx            # callsign, objectives, minimap, controls legend
      Minimap.tsx        # canvas 2D, redrawn on rAF
      InteractionPrompt.tsx
      SectionModal.tsx   # panel shell
      panels/            # one panel per section
      MobileControls.tsx
      DropOverlay.tsx    # altimeter during the parachute drop
  data/portfolioData.ts  # <- all content
  lib/                   # noise, terrain, audio, shared constants
  hooks/                 # keyboard, pointer-look, proximity
  store/useGameStore.ts  # zustand: UI-facing state only
  state/controls.ts      # per-frame mutable input/camera/player state
```

### Why two kinds of state

`store/useGameStore.ts` (zustand) holds anything that should cause a React
render: which panel is open, load progress, mobile vs desktop, which sections
have been visited.

`state/controls.ts` holds anything read or written every frame: movement axes,
camera orbit, the player's transform. Routing those through a store would
re-render the tree 60x/second for no benefit — the 3D scene reads them
directly inside `useFrame`, and the minimap redraws itself on rAF from the
same object.

---

## Performance notes

- Props are drawn with `<Instances>` — one draw call per prop type regardless
  of count.
- The terrain mesh doubles as the physics trimesh, so what looks walkable is
  walkable, and there's no second collision mesh to keep in sync.
- The shadow camera follows the player, so a 2048² map covers a tight frustum
  instead of stretching over the whole island.
- The sea is flat-shaded and opaque: normals come from screen-space
  derivatives (no per-frame `computeVertexNormals`), and being opaque means
  this full-screen surface costs no blending.
- `<PerformanceMonitor>` + `<AdaptiveDpr>` drop resolution rather than frame
  rate on weaker GPUs.
- Materials are shared across every building rather than created per-mesh.

---

## Deploying to Vercel

`vercel.json` is already configured (Vite preset, `dist` output, immutable
caching on hashed assets).

```bash
npm i -g vercel
vercel        # preview
vercel --prod # production
```

Or point Vercel at the Git repo — it will detect Vite and need no
configuration. Update the `og:image` / `twitter:image` URLs in `index.html` if
you want absolute URLs for link previews on some platforms.

---

## Licensing

The PUBG *aesthetic* — military palette, battle-royale island, loot crates —
is used as inspiration only. No PUBG textures, logos, sounds, or assets of any
kind are used, and none are needed: see the first section.
