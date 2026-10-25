"""Add a game-ready humanoid armature and basic movement clips to Blood Raven."""

import math
import os
import bpy
from mathutils import Vector

ROOT = os.getcwd()
SOURCE = os.path.join(ROOT, 'models/player/blood_raven_x_suit/scene.gltf')
OUTPUT = os.path.join(ROOT, 'public/models/player/blood_raven_x_suit/scene_rigged.glb')

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=SOURCE)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']

# The imported character is 190.7 Blender units tall, Z-up, and faces +Y.
# The original GLTF is not skinned, so create the deform skeleton in its
# existing coordinates. At runtime the GLTF is uniformly normalized to 1.85m.
bone_specs = {
    'Root': ((0, 0, 0), (0, 0, 92), None, False),
    'Hips': ((0, 0, 91), (0, 0, 111), 'Root', True),
    'Spine': ((0, 0, 105), (0, 0, 137), 'Hips', True),
    'Chest': ((0, 0, 137), (0, 0, 153), 'Spine', True),
    'Neck': ((0, 0, 153), (0, 0, 165), 'Chest', True),
    'Head': ((0, 0, 163), (0, 0, 181), 'Neck', True),
}
for side, sign in (('Left', -1), ('Right', 1)):
    bone_specs.update({
        f'{side}UpperLeg': ((sign * 12, 0, 101), (sign * 15, 0, 57), 'Hips', True),
        f'{side}LowerLeg': ((sign * 15, 0, 57), (sign * 14, 0, 16), f'{side}UpperLeg', True),
        f'{side}Foot': ((sign * 14, 0, 16), (sign * 14, 12, 7), f'{side}LowerLeg', True),
        f'{side}Toe': ((sign * 14, 12, 7), (sign * 14, 21, 6), f'{side}Foot', True),
        f'{side}UpperArm': ((sign * 18, 0, 147), (sign * 34, 0, 126), 'Chest', True),
        f'{side}LowerArm': ((sign * 34, 0, 126), (sign * 32, 2, 105), f'{side}UpperArm', True),
        f'{side}Hand': ((sign * 32, 2, 105), (sign * 31, 7, 97), f'{side}LowerArm', True),
    })

arm_data = bpy.data.armatures.new('BloodRaven_Rig')
armature = bpy.data.objects.new('BloodRaven_Rig', arm_data)
bpy.context.collection.objects.link(armature)
armature.show_in_front = True
bpy.context.view_layer.objects.active = armature
armature.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
edit_bones = {}
for name, (head, tail, parent, deform) in bone_specs.items():
    bone = arm_data.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    bone.use_deform = deform
    bone.use_connect = False
    edit_bones[name] = bone
for name, (_, _, parent, _) in bone_specs.items():
    if parent:
        edit_bones[name].parent = edit_bones[parent]
for bone in edit_bones.values():
    bone.align_roll(Vector((1, 0, 0)))
bpy.ops.object.mode_set(mode='OBJECT')
armature.select_set(False)

def point_segment_distance(point, a, b):
    ab = b - a
    denom = ab.length_squared
    if denom <= 1e-9:
        return (point - a).length
    t = max(0.0, min(1.0, (point - a).dot(ab) / denom))
    return (point - (a + t * ab)).length

deforming = [
    (name, Vector(head), Vector(tail))
    for name, (head, tail, _parent, use_deform) in bone_specs.items()
    if use_deform
]
upper_names = {'Hips', 'Spine', 'Chest', 'Neck', 'Head'}
for side in ('Left', 'Right'):
    upper_names.update({f'{side}UpperArm', f'{side}LowerArm', f'{side}Hand'})
lower_names = {'Hips'}
for side in ('Left', 'Right'):
    lower_names.update({f'{side}UpperLeg', f'{side}LowerLeg', f'{side}Foot', f'{side}Toe'})

def bind_to_one_bone(obj, bone_name):
    group = obj.vertex_groups.new(name=bone_name)
    group.add(list(range(len(obj.data.vertices))), 1.0, 'REPLACE')

def bind_weighted(obj, allowed):
    bone_segments = [item for item in deforming if item[0] in allowed]
    groups = {name: obj.vertex_groups.new(name=name) for name, _, _ in bone_segments}
    memberships = {name: [] for name, _, _ in bone_segments}
    for vertex in obj.data.vertices:
        point = obj.matrix_world @ vertex.co
        distances = sorted(
            (point_segment_distance(point, a, b), name)
            for name, a, b in bone_segments
        )[:3]
        # Inverse-square blending gives smooth transitions at joints while
        # keeping disconnected armor panels assigned to their nearest limb.
        raw = [(name, 1.0 / max(distance, 1.5) ** 2) for distance, name in distances]
        total = sum(weight for _, weight in raw)
        for name, weight in raw:
            memberships[name].append((vertex.index, weight / total))
    for name, values in memberships.items():
        for index, weight in values:
            groups[name].add([index], weight, 'REPLACE')

for obj in meshes:
    world = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = world
    if obj.name.startswith('Top'):
        bind_weighted(obj, upper_names)
    elif obj.name.startswith('Pant'):
        bind_weighted(obj, lower_names)
    elif obj.name.startswith('HEAD') or obj.name.startswith('Mask'):
        bind_to_one_bone(obj, 'Head')
    elif obj.name.startswith('Bag'):
        bind_to_one_bone(obj, 'Chest')
    else:
        bind_to_one_bone(obj, 'Spine')
    mod = obj.modifiers.new('BloodRaven_Skin', 'ARMATURE')
    mod.object = armature
    mod.use_vertex_groups = True
    obj.parent = armature
    obj.matrix_parent_inverse = armature.matrix_world.inverted()

# Remove empty glTF import wrappers after meshes have been reparented.
for obj in list(bpy.context.scene.objects):
    if obj.type == 'EMPTY':
        bpy.data.objects.remove(obj, do_unlink=True)

armature.animation_data_create()
for action in list(bpy.data.actions):
    bpy.data.actions.remove(action)

pose_bones = armature.pose.bones
for bone in pose_bones:
    bone.rotation_mode = 'XYZ'

def make_action(name, frames, pose_at, loop=False):
    action = bpy.data.actions.new(name)
    armature.animation_data.action = action
    for frame in frames:
        bpy.context.scene.frame_set(frame)
        pose = pose_at(frame)
        for bone in pose_bones:
            rot = pose.get(bone.name, (0.0, 0.0, 0.0))
            bone.rotation_euler = rot
            bone.keyframe_insert(data_path='rotation_euler', frame=frame, group=bone.name)
        hips = pose_bones.get('Hips')
        hips.location = (0.0, 0.0, pose.get('_hips_z', 0.0))
        hips.keyframe_insert(data_path='location', frame=frame, group='Hips')
    for layer in action.layers:
        for strip in layer.strips:
            for bag in getattr(strip, 'channelbags', []):
                for curve in bag.fcurves:
                    for key in curve.keyframe_points:
                        key.interpolation = 'BEZIER'
                        key.handle_left_type = 'AUTO_CLAMPED'
                        key.handle_right_type = 'AUTO_CLAMPED'
    action.use_cyclic = loop
    action['description'] = 'Blood Raven procedural rig animation'
    return action

def idle_pose(frame):
    phase = (frame - 1) / 48 * math.tau
    return {'Spine': (0.012 * math.sin(phase), 0, 0), '_hips_z': 0.7 * math.sin(phase)}

def gait_pose(frame, running=False):
    phase = (frame - 1) / 24 * math.tau
    swing = math.sin(phase) * (0.78 if running else 0.48)
    knee = max(0.0, math.sin(phase)) * (0.72 if running else 0.42)
    arm = -swing * (0.78 if running else 0.72)
    elbow = 0.4 if running else 0.18
    return {
        'LeftUpperLeg': (swing, 0, 0), 'RightUpperLeg': (-swing, 0, 0),
        'LeftLowerLeg': (-knee, 0, 0), 'RightLowerLeg': (knee, 0, 0),
        'LeftFoot': (knee * 0.25, 0, 0), 'RightFoot': (-knee * 0.25, 0, 0),
        'LeftUpperArm': (arm, 0, 0), 'RightUpperArm': (-arm, 0, 0),
        'LeftLowerArm': (-elbow, 0, 0), 'RightLowerArm': (-elbow, 0, 0),
        'Spine': (0.025 * math.sin(phase * 2), 0, 0),
        '_hips_z': (1.8 if running else 1.0) * abs(math.sin(phase)),
    }

def jump_pose(frame):
    t = (frame - 1) / 18
    crouch = max(0.0, 1.0 - t * 2.5)
    airborne = math.sin(min(1.0, t) * math.pi)
    return {
        'LeftUpperLeg': (-0.18 * crouch + 0.35 * airborne, 0, 0),
        'RightUpperLeg': (-0.18 * crouch + 0.35 * airborne, 0, 0),
        'LeftLowerLeg': (-0.45 * crouch - 0.25 * airborne, 0, 0),
        'RightLowerLeg': (-0.45 * crouch - 0.25 * airborne, 0, 0),
        'LeftUpperArm': (-0.28 * airborne, 0, 0),
        'RightUpperArm': (-0.28 * airborne, 0, 0),
        '_hips_z': -4 * crouch + 3 * airborne,
    }

def fall_pose(_frame):
    return {
        'LeftUpperLeg': (0.22, 0, 0), 'RightUpperLeg': (0.22, 0, 0),
        'LeftLowerLeg': (-0.12, 0, 0), 'RightLowerLeg': (-0.12, 0, 0),
        'LeftUpperArm': (-0.34, 0, -0.12), 'RightUpperArm': (-0.34, 0, 0.12),
    }

def land_pose(frame):
    t = (frame - 1) / 12
    bend = math.sin(min(1.0, t) * math.pi) * 0.55
    return {
        'LeftUpperLeg': (-bend * 0.35, 0, 0), 'RightUpperLeg': (-bend * 0.35, 0, 0),
        'LeftLowerLeg': (-bend, 0, 0), 'RightLowerLeg': (-bend, 0, 0),
        'Spine': (-bend * 0.08, 0, 0), '_hips_z': -bend * 3,
    }

def freefall_pose(_frame):
    return {
        'LeftUpperLeg': (0.18, 0, -0.12), 'RightUpperLeg': (0.18, 0, 0.12),
        'LeftLowerLeg': (-0.1, 0, 0), 'RightLowerLeg': (-0.1, 0, 0),
        'LeftUpperArm': (0, 0, -0.55), 'RightUpperArm': (0, 0, 0.55),
        'LeftLowerArm': (-0.18, 0, 0), 'RightLowerArm': (-0.18, 0, 0),
    }

def parachute_pose(_frame):
    return {
        'LeftUpperArm': (-0.35, 0, -1.2), 'RightUpperArm': (-0.35, 0, 1.2),
        'LeftLowerArm': (-0.72, 0, 0), 'RightLowerArm': (-0.72, 0, 0),
        'LeftUpperLeg': (0.12, 0, -0.06), 'RightUpperLeg': (0.12, 0, 0.06),
        'LeftLowerLeg': (-0.14, 0, 0), 'RightLowerLeg': (-0.14, 0, 0),
    }

make_action('Idle', [1, 13, 25, 37, 49], idle_pose, True)
make_action('Walk', [1, 7, 13, 19, 25], lambda f: gait_pose(f, False), True)
make_action('Run', [1, 7, 13, 19, 25], lambda f: gait_pose(f, True), True)
make_action('Jump', [1, 5, 10, 15, 19], jump_pose, False)
make_action('Fall', [1, 13], fall_pose, True)
make_action('Land', [1, 4, 8, 13], land_pose, False)
make_action('Freefall', [1, 13], freefall_pose, True)
make_action('Parachute', [1, 13], parachute_pose, True)
armature.animation_data.action = bpy.data.actions.get('Idle')
bpy.context.scene.frame_set(1)

os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
bpy.ops.object.select_all(action='DESELECT')
armature.select_set(True)
for obj in meshes:
    obj.select_set(True)
bpy.context.view_layer.objects.active = armature
bpy.ops.export_scene.gltf(
    filepath=OUTPUT,
    export_format='GLB',
    use_selection=True,
    export_animations=True,
    export_animation_mode='ACTIONS',
    export_skins=True,
    export_morph=False,
    export_apply=False,
    export_force_sampling=True,
    export_optimize_animation_size=False,
)
print('EXPORTED', OUTPUT, os.path.getsize(OUTPUT))
print('BONES', len(armature.data.bones), [bone.name for bone in armature.data.bones])
print('CLIPS', [action.name for action in bpy.data.actions])
