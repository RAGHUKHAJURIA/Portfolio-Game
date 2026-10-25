"""Rig the original Blood Raven asset and bake in-place game animations.

Run from the repository: blender -b -P rig_and_walk.py
Optional: append -- --preview to render a front/side pose sheet in the temp folder.
Requires Blender 4.4+ (tested with 5.2). Original textures/materials are retained.
"""
import json
import math
import sys
import tempfile
from pathlib import Path

import bpy
import bmesh
from mathutils import Euler, Quaternion, Vector

ROOT = Path(__file__).resolve().parent
SOURCE = ROOT / 'models/player/blood_raven_x_suit/scene.gltf'
OUTPUT = ROOT / 'public/models/player/blood_raven_x_suit/walk.glb'
HEIGHT = 1.85
FPS = 24
WALK_STRIDE = 1.55  # metres per complete two-step cycle; mirrored in CharacterModel.tsx
RUN_STRIDE = 3.2
ARM_SWING = 0.35

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE))
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start, scene.frame_end = 1, 25
meshes = [o for o in scene.objects if o.type == 'MESH']

# Bake the import's axis/scale wrappers into vertices before discarding them.
# Only mesh bounds count: export cameras/lights have enormous, irrelevant scales.
for obj in meshes:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.data.transform(world)
    obj.matrix_world.identity()
for obj in list(scene.objects):
    if obj not in meshes:
        bpy.data.objects.remove(obj, do_unlink=True)
floor = min(v.co.z for o in meshes for v in o.data.vertices)
ceiling = max(v.co.z for o in meshes for v in o.data.vertices)
scale = HEIGHT / (ceiling - floor)
for obj in meshes:
    for vertex in obj.data.vertices:
        vertex.co = Vector((vertex.co.x, vertex.co.y, vertex.co.z - floor)) * scale
    obj.data.update()

# Positions measured on the original mesh (centimetre-like source units).
# Arms are in an A-pose: the actual wrists are at x=46, not x=32.
specs = {
    'Root': ((0, 0, 0), (0, 0, 20), None, False),
    'Hips': ((0, 0, 96), (0, 0, 108), 'Root', True),
    'Spine': ((0, 0, 108), (0, 0, 130), 'Hips', True),
    'Chest': ((0, 0, 130), (0, 0, 149), 'Spine', True),
    'Neck': ((0, 0, 149), (0, 0, 161), 'Chest', True),
    'Head': ((0, 0, 161), (0, 0, 180), 'Neck', True),
}
for side, sign in [('Left', -1), ('Right', 1)]:
    specs.update({
        side+'Shoulder': ((sign*8, 0, 145), (sign*22, 0, 145), 'Chest', True),
        side+'UpperArm': ((sign*22, 0, 145), (sign*36, 2, 122), side+'Shoulder', True),
        side+'LowerArm': ((sign*36, 2, 122), (sign*46, 7, 104), side+'UpperArm', True),
        side+'Hand': ((sign*46, 7, 104), (sign*50, 12, 94), side+'LowerArm', True),
        side+'UpperLeg': ((sign*15, 0, 96), (sign*15, 0, 53), 'Hips', True),
        side+'LowerLeg': ((sign*15, 0, 53), (sign*15, 0, 12), side+'UpperLeg', True),
        side+'Foot': ((sign*15, 0, 12), (sign*15, 13, 12), side+'LowerLeg', True),
        side+'Toe': ((sign*15, 13, 12), (sign*15, 21, 12), side+'Foot', True),
    })
arm_data = bpy.data.armatures.new('BloodRaven_Rig')
rig = bpy.data.objects.new('BloodRaven_Rig', arm_data)
bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, (head, tail, parent, deform) in specs.items():
    bone = arm_data.edit_bones.new(name)
    bone.head = Vector(head)*scale
    bone.tail = Vector(tail)*scale
    bone.use_deform = deform
    if parent:
        bone.parent = arm_data.edit_bones[parent]
    # align_roll aligns LOCAL Z, not X. The previous rig aligned Z to world X
    # and then animated local X, which swung the limbs sideways.
    local_z = Vector((1, 0, 0)).cross(bone.tail-bone.head)
    if local_z.length > 1e-6:
        bone.align_roll(local_z)
bpy.ops.object.mode_set(mode='OBJECT')

body_parts = [o for o in meshes if o.name.startswith(('Top', 'Pant', 'HEAD', 'Mask'))]
accessories = [o for o in meshes if o not in body_parts]
for obj in body_parts:
    part = obj.name.split('_')[0]
    obj.vertex_groups.new(name='_part_'+part).add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
bpy.ops.object.select_all(action='DESELECT')
for obj in body_parts:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body_parts[0]
bpy.ops.object.join()
body = bpy.context.object
body.name = 'BloodRavenBody'
# glTF duplicates vertices at UV seams. Weld coincident positions for the heat
# solver; UVs remain per-face-corner data and material slots stay unchanged.
bm = bmesh.new()
bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=0.000001)
bm.to_mesh(body.data)
bm.free()
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
auto_error = None
try:
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
except RuntimeError as error:
    auto_error = str(error)
    print('Automatic weights warning:', auto_error)
if not any(m.type == 'ARMATURE' for m in body.modifiers):
    body.modifiers.new('Skin', 'ARMATURE').object = rig
body.parent = rig

def segment_distance(point, a, b):
    v = b-a
    t = max(0, min(1, (point-a).dot(v)/v.length_squared))
    return (point-(a+t*v)).length

groups = {name: body.vertex_groups.get(name) or body.vertex_groups.new(name=name)
          for name, spec in specs.items() if spec[3]}
segments = {name: (Vector(spec[0])*scale, Vector(spec[1])*scale)
            for name, spec in specs.items() if spec[3]}
parts = {g.index: g.name[6:] for g in body.vertex_groups if g.name.startswith('_part_')}
group_names = {g.index: g.name for g in body.vertex_groups}
repaired = 0
cross_leg_vertices = 0
for v in body.data.vertices:
    part = next((parts[g.group] for g in v.groups if g.group in parts), '')
    weights = {group_names[g.group]: g.weight for g in v.groups if group_names[g.group] in groups}
    side = 'Left' if v.co.x < 0 else 'Right'
    if part in ('HEAD', 'Mask'):
        allowed = {'Head'}
    elif part == 'Pant':
        # The central hanging tabard belongs to the pelvis, not both thighs.
        if abs(v.co.x) < 4*scale:
            allowed = {'Hips'}
        else:
            allowed = {'Hips', *(side+n for n in ('UpperLeg', 'LowerLeg', 'Foot', 'Toe'))}
    else:
        allowed = {'Hips', 'Spine', 'Chest', 'Neck', 'Head',
                   *(side+n for n in ('Shoulder', 'UpperArm', 'LowerArm', 'Hand'))}
    nearest = sorted((segment_distance(v.co, *segments[n]), n) for n in allowed)
    # Heat weights can reach through disconnected armor to a distant joint.
    # Restrict them to the nearest joint neighbourhood (including seam blends).
    local = {name for distance, name in nearest[:3] if distance <= nearest[0][0]+.06}
    weights = {name: w for name, w in weights.items() if name in local and w > 1e-5}
    if not weights:
        repaired += 1
        weights = {name: 1/max(d, .008)**4 for d, name in nearest[:2] if name in local}
    weights = dict(sorted(weights.items(), key=lambda item: -item[1])[:4])
    total = sum(weights.values())
    for group in groups.values():
        group.remove([v.index])
    for name, weight in weights.items():
        groups[name].add([v.index], weight/total, 'REPLACE')
    if part == 'Pant' and any(n.startswith('Left') for n in weights) and any(n.startswith('Right') for n in weights):
        cross_leg_vertices += 1
for group in list(body.vertex_groups):
    if group.name.startswith('_part_'):
        body.vertex_groups.remove(group)
assert cross_leg_vertices == 0, 'Pant has mixed left/right leg weights'
for obj in accessories:
    obj.vertex_groups.clear()
    obj.vertex_groups.new(name='Chest').add(list(range(len(obj.data.vertices))), 1, 'REPLACE')
    obj.modifiers.new('RigidChestSkin', 'ARMATURE').object = rig
    obj.parent = rig

# Pose values below are in Blender world axes: X is the sagittal hinge, Z is up.
# Convert these deltas through each bind basis ONCE when baking, never at runtime.
bases = {b.name: b.matrix_local.to_quaternion() for b in arm_data.bones}
for bone in rig.pose.bones:
    bone.rotation_mode = 'QUATERNION'
rig.animation_data_create()

def bake(name, last_frame, pose_at, loop=False):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for frame in range(1, last_frame+1):
        pose, bob = pose_at((frame-1)/(last_frame-1))
        for bone in rig.pose.bones:
            rotation = Euler(pose.get(bone.name, (0, 0, 0)), 'XYZ').to_quaternion()
            basis = bases[bone.name]
            bone.rotation_quaternion = basis.inverted() @ rotation @ basis
            bone.location = basis.inverted() @ Vector((0, 0, bob)) if bone.name == 'Hips' else (0, 0, 0)
            bone.keyframe_insert('rotation_quaternion', frame=frame, group=bone.name)
            bone.keyframe_insert('location', frame=frame, group=bone.name)
    action.use_cyclic = loop
    return action

def walk_pose(t, running=False):
    phase = (t % 1)*math.tau
    stride = RUN_STRIDE if running else WALK_STRIDE
    bob = -.10 - .02*math.cos(2*phase)
    pose = {'Hips': (0, 0, .025*math.sin(phase)),
            'Chest': (0, 0, -.035*math.sin(phase))}
    l1, l2 = 43*scale, 41*scale
    for side, shift, sign in [('Left', 0, -1), ('Right', .5, 1)]:
        p = (t+shift) % 1
        duty = .26 if running else .55
        travel = stride*duty
        if p < duty:
            y = travel/2-stride*p
            lift = 0
            heel = .16*max(0, 1-p/.1)-.22*max(0, (p-.43)/.12)
        else:
            u = (p-duty)/(1-duty)
            smooth = u*u*(3-2*u)
            y = -travel/2+travel*smooth
            lift = (.16 if running else .10)*math.sin(math.pi*u)**1.5
            heel = -.15*math.sin(math.pi*u)
        z = 12*scale+lift-(96*scale+bob)
        reach = min(math.hypot(y, z), (l1+l2)*.998)
        angle = math.atan2(y, -z)
        hip = angle+math.acos(max(-1, min(1, (l1*l1+reach*reach-l2*l2)/(2*l1*reach))))
        knee = -(math.pi-math.acos(max(-1, min(1, (l1*l1+l2*l2-reach*reach)/(2*l1*l2)))))
        pose[side+'UpperLeg'] = (hip, 0, 0)
        pose[side+'LowerLeg'] = (knee, 0, 0)
        pose[side+'Foot'] = (-hip-knee+heel, 0, 0)
        pose[side+'Toe'] = (-heel*.65, 0, 0)
        swing = math.cos(phase+shift*math.tau)
        pose[side+'UpperArm'] = (-(.55 if running else ARM_SWING)*swing, sign*.30, 0)
        pose[side+'LowerArm'] = (.65 if running else .15+.12*(1-swing)/2, 0, 0)
    return pose, bob

def idle_pose(t):
    return {'Spine': (.008*math.sin(t*math.tau), 0, 0),
            'LeftUpperArm': (0, -.30, 0), 'RightUpperArm': (0, .30, 0)}, .003*math.sin(t*math.tau)

def air_pose(t, mode):
    pose = {}
    for side, sign in [('Left', -1), ('Right', 1)]:
        pose[side+'UpperLeg'] = (.20, 0, 0)
        pose[side+'LowerLeg'] = (-.35, 0, 0)
        pose[side+'UpperArm'] = ((2.5 if mode == 'Parachute' else .2), sign*(.35 if mode == 'Freefall' else .12), 0)
        pose[side+'LowerArm'] = (.65, 0, 0)
    if mode == 'Land':
        compression = math.sin(t*math.pi)
        for side in ('Left', 'Right'):
            pose[side+'UpperLeg'] = (.3*compression, 0, 0)
            pose[side+'LowerLeg'] = (-.6*compression, 0, 0)
        return pose, -.06*compression
    return pose, 0

bake('Idle', 49, idle_pose, True)
bake('Walk', 25, walk_pose, True)
bake('Run', 25, lambda t: walk_pose(t, True), True)
for name in ('Jump', 'Fall', 'Land', 'Freefall', 'Parachute'):
    bake(name, 13 if name == 'Land' else 25, lambda t, n=name: air_pose(t, n), name in ('Fall', 'Freefall', 'Parachute'))

# Save a neutral bind pose. Skin calibration must not use a crouched walk frame.
rig.animation_data.action = None
for bone in rig.pose.bones:
    bone.rotation_quaternion = Quaternion()
    bone.location = (0, 0, 0)
bpy.context.view_layer.update()
rig['walkStride'] = WALK_STRIDE
rig['runStride'] = RUN_STRIDE
rig['credit'] = 'Blood Raven X Suit by DFLEX, CC-BY-4.0; rigging and animation modified.'
bpy.ops.object.select_all(action='DESELECT')
for obj in [rig, body, *accessories]:
    obj.select_set(True)
bpy.context.view_layer.objects.active = rig
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB', use_selection=True,
    export_animations=True, export_animation_mode='ACTIONS', export_skins=True,
    export_force_sampling=True, export_frame_range=False, export_anim_slide_to_zero=True, export_extras=True,
    export_optimize_animation_size=True, export_cameras=False, export_lights=False)
print(json.dumps({'output': str(OUTPUT), 'bytes': OUTPUT.stat().st_size,
    'bones': len(arm_data.bones), 'clips': [a.name for a in bpy.data.actions],
    'sourceScale': scale, 'automaticWeightError': auto_error,
    'verticesNeedingWeightFallback': repaired, 'mixedLegVertices': cross_leg_vertices}))

if '--preview' in sys.argv:
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.display.shading.color_type = 'TEXTURE'
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.resolution_percentage = 100
    bpy.ops.object.camera_add()
    camera = bpy.context.object
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = 2.2
    scene.camera = camera
    rig.animation_data.action = bpy.data.actions['Walk']
    for view, location in [('front', (0, 4, .85)), ('side', (4, 0, .85))]:
        camera.location = location
        camera.rotation_euler = (Vector((0, 0, .85))-camera.location).to_track_quat('-Z', 'Y').to_euler()
        for frame in (1, 7, 13, 19):
            scene.frame_set(frame)
            scene.render.filepath = str(Path(tempfile.gettempdir()) / f'blood-walk-{view}-{frame}.png')
            bpy.ops.render.render(write_still=True)
