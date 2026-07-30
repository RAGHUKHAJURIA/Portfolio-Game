import { readFileSync } from 'node:fs'
import {
  BoxGeometry,
  Frustum,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  PerspectiveCamera,
} from 'three'
import { houses, ISLAND, projects, loadout, timeline } from '../src/data/portfolioData.ts'
import { terrainHeight, pathStrength, houseGroundY, INLETS, isSubmerged } from '../src/lib/terrain.ts'

/** Inside a declared water inlet, where being under the waterline is the point. */
const inInlet = (x: number, z: number) =>
  INLETS.some((m) => Math.hypot(x - m.x, z - m.z) < m.r)

let fail = 0
const check = (name: string, ok: boolean, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`)
  if (!ok) fail++
}

console.log('--- house placement ---')
for (const h of houses) {
  const [hx, hz] = h.position
  const mx = hx + h.markerOffset[0]
  const mz = hz + h.markerOffset[1]
  const hy = terrainHeight(hx, hz)
  const my = terrainHeight(mx, mz)
  const rFromCentre = Math.hypot(hx, hz)
  const rMarker = Math.hypot(mx, mz)

  console.log(
    `${h.id.padEnd(11)} pos=(${hx},${hz}) y=${hy.toFixed(2)}  marker=(${mx.toFixed(1)},${mz.toFixed(1)}) y=${my.toFixed(2)}  |r|=${rFromCentre.toFixed(1)} markR=${rMarker.toFixed(1)}`
  )
  check(`  ${h.id}: house inside boundary`, rFromCentre < ISLAND.boundary - 8)
  check(`  ${h.id}: marker inside boundary`, rMarker < ISLAND.boundary - 1)
  check(`  ${h.id}: pad above sea`, hy > ISLAND.seaLevel + 1)
  check(`  ${h.id}: marker pad flat`, Math.abs(hy - my) < 0.6, `dy=${(my - hy).toFixed(3)}`)
  check(`  ${h.id}: houseGroundY agrees`, Math.abs(houseGroundY[h.id] - hy) < 1e-9)
  check(`  ${h.id}: trail reaches marker`, pathStrength(mx, mz) > 0.2, `p=${pathStrength(mx, mz).toFixed(2)}`)
}

console.log('\n--- house separation ---')
for (let i = 0; i < houses.length; i++) {
  for (let j = i + 1; j < houses.length; j++) {
    const d = Math.hypot(
      houses[i].position[0] - houses[j].position[0],
      houses[i].position[1] - houses[j].position[1]
    )
    check(`  ${houses[i].id} â†” ${houses[j].id} >= 20`, d >= 20, `d=${d.toFixed(1)}`)
  }
}

console.log('\n--- indoor content triggers ---')
// Triggers live on the upper floor now, so they must sit inside the shell and
// clear of the stairwell, and the exterior door marker must not reach them.
const IN_X = 4.7
const IN_Z = 4.2
const STAIRWELL_X = -IN_X + 1.5 + 0.4
for (const h of houses) {
  const [lx, lz] = h.interior
  check(
    `  ${h.id}: content object inside the shell`,
    Math.abs(lx) < IN_X - 0.3 && Math.abs(lz) < IN_Z - 0.3,
    `local=(${lx}, ${lz})`
  )
  check(`  ${h.id}: content object clear of the stairwell`, lx > STAIRWELL_X + 0.5)
  check(`  ${h.id}: trigger fits inside the room`, h.interiorRadius < IN_Z)
}
for (let i = 0; i < houses.length; i++) {
  for (let j = i + 1; j < houses.length; j++) {
    const a = houses[i]
    const b = houses[j]
    const d = Math.hypot(
      a.position[0] + a.interiorOffset[0] - (b.position[0] + b.interiorOffset[0]),
      a.position[1] + a.interiorOffset[1] - (b.position[1] + b.interiorOffset[1])
    )
    check(
      `  triggers ${a.id}/${b.id} disjoint`,
      d > a.interiorRadius + b.interiorRadius,
      `d=${d.toFixed(1)}`
    )
  }
}

console.log('\n--- building compound is flat ---')
// Every house authors its props and aprons at local y = 0, which is only
// correct where terrain.ts has flattened the ground. If the terrain deviates
// from pad height inside this radius, those props float or sink.
const COMPOUND_R = 10
for (const h of houses) {
  const padY = terrainHeight(h.position[0], h.position[1])
  let worstDev = 0
  for (let ring = 1; ring <= 4; ring++) {
    const r = (COMPOUND_R * ring) / 4
    for (let a = 0; a < 24; a++) {
      const t = (a / 24) * Math.PI * 2
      const dev = Math.abs(
        terrainHeight(h.position[0] + Math.cos(t) * r, h.position[1] + Math.sin(t) * r) - padY
      )
      worstDev = Math.max(worstDev, dev)
    }
  }
  check(`  ${h.id}: flat within ${COMPOUND_R}u`, worstDev < 0.5, `maxDev=${worstDev.toFixed(2)}`)
}

console.log('\n--- terrain sanity ---')
const spawn = terrainHeight(0, 2)
check('plaza above sea', spawn > ISLAND.seaLevel + 1, `y=${spawn.toFixed(2)}`)
check('drop landing point above sea', terrainHeight(0, 9) > ISLAND.seaLevel + 1)
check('boundary ring above sea', (() => {
  for (let a = 0; a < 256; a++) {
    const t = (a / 256) * Math.PI * 2
    const bx = Math.cos(t) * ISLAND.boundary
    const bz = Math.sin(t) * ISLAND.boundary
    // Inlets deliberately breach the boundary circle; what stops the player
    // there is Character's wet guard, not terrain height.
    if (inInlet(bx, bz)) continue
    if (terrainHeight(bx, bz) < ISLAND.seaLevel + 0.2) return false
  }
  return true
})(), 'walkable all the way to the fence, inlets excepted')
check('far offshore is underwater', terrainHeight(ISLAND.half, 0) < ISLAND.seaLevel)

let minH = Infinity
let maxH = -Infinity
let wet: [number, number] | null = null
const SAMPLE_R = ISLAND.boundary
for (let x = -SAMPLE_R; x <= SAMPLE_R; x += 3) {
  for (let z = -SAMPLE_R; z <= SAMPLE_R; z += 3) {
    if (Math.hypot(x, z) > SAMPLE_R) continue
    if (inInlet(x, z)) continue
    const y = terrainHeight(x, z)
    minH = Math.min(minH, y)
    maxH = Math.max(maxH, y)
    if (y < ISLAND.seaLevel && !wet) wet = [x, z]
  }
}
console.log(`  land height range: ${minH.toFixed(2)} â€¦ ${maxH.toFixed(2)}`)
check(
  'no walkable land below sea outside an inlet',
  wet === null,
  wet ? `wet at (${wet[0]}, ${wet[1]})` : `min=${minH.toFixed(2)}`
)
check('terrain relief is reasonable', maxH - minH < 26, `range=${(maxH - minH).toFixed(2)}`)

console.log('\n--- water inlets and dry footing ---')
for (const m of INLETS) {
  const y = terrainHeight(m.x, m.z)
  check(`  inlet (${m.x},${m.z}) breaks the waterline`, y < ISLAND.seaLevel, `y=${y.toFixed(2)}`)
  check(`  inlet (${m.x},${m.z}) reaches the sea`, Math.hypot(m.x, m.z) + m.r > ISLAND.boundary)
  // The wet guard has to agree with the terrain or the player wades in anyway.
  check(`  inlet (${m.x},${m.z}) reads as submerged`, isSubmerged(m.x, m.z))
}
for (const h of houses) {
  const mx = h.position[0] + h.markerOffset[0]
  const mz = h.position[1] + h.markerOffset[1]
  check(`  ${h.id}: door marker is dry`, !isSubmerged(mx, mz))
}
check('drop plaza is dry', !isSubmerged(0, 2) && !isSubmerged(0, 9))

console.log('\n--- max slope on the trails ---')
let worst = 0
for (const h of houses) {
  const mx = h.position[0] + h.markerOffset[0]
  const mz = h.position[1] + h.markerOffset[1]
  const steps = 60
  for (let s = 0; s < steps; s++) {
    const t0 = s / steps
    const t1 = (s + 1) / steps
    const p0 = [0 + (mx - 0) * t0, 2 + (mz - 2) * t0]
    const p1 = [0 + (mx - 0) * t1, 2 + (mz - 2) * t1]
    const dy = Math.abs(terrainHeight(p1[0], p1[1]) - terrainHeight(p0[0], p0[1]))
    const dxz = Math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    worst = Math.max(worst, dy / dxz)
  }
}
const angle = (Math.atan(worst) * 180) / Math.PI
check('trails climbable (< 58Â° controller limit)', angle < 50, `steepest=${angle.toFixed(1)}Â°`)

console.log('\n--- instanced prop batches are not frustum-culled ---')
// The "props vanish at certain camera angles" bug. drei's <Instances> has
// count = 0 on its first frame; three computes an InstancedMesh's bounding
// sphere once, lazily, from that count, and caches an *empty* sphere forever.
// An empty sphere (radius -1) only passes the frustum test when the world
// origin is on screen, so every batch pops out when you look away from (0,0,0).
{
  const im = new InstancedMesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial(), 100)
  im.count = 0
  im.computeBoundingSphere()
  check(
    'three still caches an empty sphere at count=0 (workaround still needed)',
    im.boundingSphere!.radius < 0,
    `r=${im.boundingSphere!.radius}`
  )

  const cam = new PerspectiveCamera(55, 1.6, 0.1, 900)
  cam.position.set(0, 10, 30)
  cam.lookAt(0, 0, 60) // origin behind the camera
  cam.updateMatrixWorld()
  cam.updateProjectionMatrix()
  const f = new Frustum().setFromProjectionMatrix(
    new Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse)
  )
  check('… and that sphere is culled looking away from the origin', !f.intersectsObject(im))

  const props = readFileSync(new URL('../src/components/experience/Props.tsx', import.meta.url), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '') // the comments talk about <Instances> too
  const wrapper = /function Batch\([\s\S]*?<Instances frustumCulled={false}/.test(props)
  const bare = props.match(/<Instances (?!frustumCulled)/g)?.length ?? 0
  check('Props.tsx routes batches through <Batch frustumCulled={false}>', wrapper)
  check('no bare <Instances> left in Props.tsx', bare === 0, `found ${bare}`)
}

console.log('\n--- content ---')
check('7 projects', projects.length === 7)
check('all projects have bullets', projects.every((p) => p.bullets.length >= 3))
check('all projects have stack', projects.every((p) => p.stack.length >= 4))
check('unique project ids', new Set(projects.map((p) => p.id)).size === projects.length)
check('5 loadout slots', loadout.length === 5)
check('levels in 1..5', loadout.every((s) => s.items.every((i) => i.level >= 1 && i.level <= 5)))
check('timeline non-empty', timeline.length >= 3)
check('5 houses', houses.length === 5)

console.log(`\n${fail === 0 ? 'âœ… all checks passed' : `âŒ ${fail} check(s) failed`}`)
process.exit(fail === 0 ? 0 : 1)

