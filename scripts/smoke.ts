import { houses, ISLAND, projects, loadout, timeline } from '../src/data/portfolioData.ts'
import { terrainHeight, pathStrength, houseGroundY } from '../src/lib/terrain.ts'

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

console.log('\n--- trigger overlap ---')
for (let i = 0; i < houses.length; i++) {
  for (let j = i + 1; j < houses.length; j++) {
    const a = houses[i]
    const b = houses[j]
    const d = Math.hypot(
      a.position[0] + a.markerOffset[0] - (b.position[0] + b.markerOffset[0]),
      a.position[1] + a.markerOffset[1] - (b.position[1] + b.markerOffset[1])
    )
    check(`  triggers ${a.id}/${b.id} disjoint`, d > a.radius + b.radius, `d=${d.toFixed(1)}`)
  }
}

console.log('\n--- terrain sanity ---')
const spawn = terrainHeight(0, 2)
check('plaza above sea', spawn > ISLAND.seaLevel + 1, `y=${spawn.toFixed(2)}`)
check('drop landing point above sea', terrainHeight(0, 9) > ISLAND.seaLevel + 1)
check('boundary ring above sea', (() => {
  for (let a = 0; a < 64; a++) {
    const t = (a / 64) * Math.PI * 2
    if (terrainHeight(Math.cos(t) * ISLAND.boundary, Math.sin(t) * ISLAND.boundary) < ISLAND.seaLevel + 0.2) return false
  }
  return true
})(), 'walkable all the way to the fence')
check('far offshore is underwater', terrainHeight(58, 0) < ISLAND.seaLevel)

let minH = Infinity
let maxH = -Infinity
for (let x = -40; x <= 40; x += 2) {
  for (let z = -40; z <= 40; z += 2) {
    if (Math.hypot(x, z) > 40) continue
    const y = terrainHeight(x, z)
    minH = Math.min(minH, y)
    maxH = Math.max(maxH, y)
  }
}
console.log(`  land height range: ${minH.toFixed(2)} â€¦ ${maxH.toFixed(2)}`)
check('no walkable land below sea', minH > ISLAND.seaLevel, `min=${minH.toFixed(2)}`)
check('terrain relief is reasonable', maxH - minH < 14, `range=${(maxH - minH).toFixed(2)}`)

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

