// Exercise the actual exported skeleton/clip in Three.js without a GPU.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { AnimationMixer, LoopRepeat, Vector3, Box3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

const bytes = readFileSync(new URL('../public/models/player/blood_raven_x_suit/walk.glb', import.meta.url))
let data, binary
for (let offset = 12; offset < bytes.length;) {
  const length = bytes.readUInt32LE(offset)
  const type = bytes.readUInt32LE(offset + 4)
  const chunk = bytes.subarray(offset + 8, offset + 8 + length)
  if (type === 0x4e4f534a) data = JSON.parse(chunk.toString())
  if (type === 0x004e4942) binary = chunk
  offset += 8 + length
}
assert(data && binary)
console.log(`Asset: ${bytes.length} bytes, ${data.materials.length} materials, ${data.images.length} images`)
assert(!data.nodes.some((n) => /^(Area|Point|Camera)(\.|$)/.test(n.name ?? '')))
// Image decoding requires a browser. Keep real geometry, weights and clips;
// replace only material descriptions for this CPU skeleton regression check.
data.materials = data.materials.map((m) => ({ name: m.name }))
data.images = []
data.textures = []
data.buffers[0].uri = `data:application/octet-stream;base64,${binary.toString('base64')}`
globalThis.ProgressEvent ??= class { constructor(type, init) { this.type = type; Object.assign(this, init) } }
const gltf = await new GLTFLoader().parseAsync(JSON.stringify(data), '')
const walk = gltf.animations.find((clip) => clip.name === 'Walk')
assert(walk, 'Walk clip missing')
assert(Math.abs(walk.duration - 1) < .001, `Walk duration ${walk.duration}`)
assert(gltf.animations.some((clip) => clip.name === 'Idle'))
const height = new Box3().setFromObject(gltf.scene).getSize(new Vector3()).y
assert(Math.abs(height - 1.85) < .02, `Bind height ${height}`)
const bones = []
gltf.scene.traverse((object) => { if (object.isBone) bones.push(object) })
assert.equal(new Set(bones.map((b) => b.name)).size, 22)
const mixer = new AnimationMixer(gltf.scene)
const action = mixer.clipAction(walk).setLoop(LoopRepeat, Infinity)
action.clampWhenFinished = false
action.play()
let loops = 0
mixer.addEventListener('loop', () => loops++)
const ankle = gltf.scene.getObjectByName('LeftFoot')
const hand = gltf.scene.getObjectByName('RightHand')
const root = gltf.scene.getObjectByName('Root')
const rootStart = root.position.clone()
const samples = []
for (let i = 0; i < 1260; i++) {
  mixer.update(1 / 120)
  gltf.scene.updateMatrixWorld(true)
  if (i >= 1200) samples.push({ foot: ankle.getWorldPosition(new Vector3()), hand: hand.getWorldPosition(new Vector3()) })
}
assert(loops >= 10 && action.isRunning(), 'Walk froze before ten cycles')
const range = (part, axis) => Math.max(...samples.map((s) => s[part][axis])) - Math.min(...samples.map((s) => s[part][axis]))
assert(range('foot', 'z') > .4, 'Foot has no forward/back motion')
assert(range('foot', 'x') < .08, `Sideways foot swing ${range('foot', 'x')}`)
assert(range('hand', 'z') > .1, 'Arm does not swing')
assert(root.position.distanceTo(rootStart) < 1e-6, 'Clip contains root travel')
mixer.setTime(0)
const start = bones.map((b) => ({ q: b.quaternion.clone(), p: b.position.clone() }))
mixer.setTime(1)
bones.forEach((b, i) => {
  assert(b.quaternion.clone().normalize().angleTo(start[i].q.normalize()) < .0001, `Loop rotation seam: ${b.name}`)
  assert(b.position.distanceTo(start[i].p) < .0001, `Loop position seam: ${b.name}`)
})
console.log(`PASS: Walk ${walk.duration}s, ${loops} loops, height ${height.toFixed(3)}m, 22 bones`)
console.log(`Late-cycle movement: foot fore/aft ${range('foot', 'z').toFixed(3)}m, sideways ${range('foot', 'x').toFixed(3)}m, hand ${range('hand', 'z').toFixed(3)}m`)
console.log('PASS: in-place root, seamless loop, no freeze after ten cycles')
