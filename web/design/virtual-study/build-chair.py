"""Rebuild the reading chair/throw as a reusable glTF asset. Blender 5.2, no add-ons.
Run: Blender --background --factory-startup --python build-chair.py
Local modelling coordinates below are Three.js-style (x, height, depth).
"""
from pathlib import Path
import math
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'public/study/models/reading-chair'
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.context.preferences.filepaths.save_version=0

def point(x, y, z):
    return (x, -z, y)

def material(name, color, rough=.8):
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = rough
    if 'Sheen Weight' in p.inputs and 'linen' in name: p.inputs['Sheen Weight'].default_value = .45
    return m

linen = material('chair_linen', (.72,.66,.55))
wool = material('throw_wool', (.40,.18,.085), .96)
wood = material('chair_oak', (.43,.29,.15), .6)
accent = material('chair_accent', (.66,.27,.14), .9)
seam = material('chair_seam', (.65,.58,.47))
for mat, scale, strength in [(linen,145,.11), (wool,120,.13)]:
    n = mat.node_tree.nodes.new('ShaderNodeTexNoise'); n.inputs['Scale'].default_value = scale
    b = mat.node_tree.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = strength; b.inputs['Distance'].default_value = .012
    mat.node_tree.links.new(n.outputs['Fac'],b.inputs['Height']); mat.node_tree.links.new(b.outputs['Normal'],mat.node_tree.nodes.get('Principled BSDF').inputs['Normal'])

parts=[]
def mesh(name, verts, faces, mat, uv=None):
    data=bpy.data.meshes.new(name); data.from_pydata([point(*v) for v in verts], [], faces); data.update()
    obj=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(obj); data.materials.append(mat)
    for poly in data.polygons: poly.use_smooth=True
    if uv:
        layer=data.uv_layers.new(name='UVMap')
        for poly in data.polygons:
            for loop_index in poly.loop_indices: layer.data[loop_index].uv=uv[data.loops[loop_index].vertex_index]
    parts.append(obj); return obj

def rounded(name,size,loc,mat,radius):
    bpy.ops.mesh.primitive_cube_add(size=1,location=point(*loc)); obj=bpy.context.object; obj.name=name
    obj.dimensions=(size[0],size[2],size[1]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.append(mat)
    bevel=obj.modifiers.new('Soft padded edges','BEVEL'); bevel.width=radius; bevel.segments=7
    normal=obj.modifiers.new('Weighted normals','WEIGHTED_NORMAL'); normal.keep_sharp=True
    for poly in obj.data.polygons: poly.use_smooth=True
    parts.append(obj); return obj

def cord(name,pts,mat,radius=.008):
    curve=bpy.data.curves.new(name,'CURVE'); curve.dimensions='3D'; curve.resolution_u=6; curve.bevel_depth=radius; curve.bevel_resolution=3
    spline=curve.splines.new('POLY'); spline.points.add(len(pts)-1)
    for p,v in zip(spline.points,pts): p.co=(*point(*v),1)
    obj=bpy.data.objects.new(name,curve); bpy.context.collection.objects.link(obj); obj.data.materials.append(mat); parts.append(obj); return obj

rounded('Upholstered seat base',(1.86,.38,1.56),(0,.70,-.06),linen,.18)
rounded('Loose seat cushion',(1.43,.27,1.28),(0,.98,-.16),linen,.125)

# Continuous upholstered tub shell, not a back disc and disconnected oval arms.
verts=[]; faces=[]; uv=[]; nt=76; nq=34; theta_max=math.radians(117)
def arm_top(theta): return 1.45+.67*max(0,math.cos(theta/theta_max*math.pi/2))**1.15
for a in range(nt+1):
    theta=-theta_max+2*theta_max*a/nt; top=arm_top(theta)
    for b in range(nq+1):
        q=b/nq
        if q<.34:
            t=q/.34; offset=.033*math.sin(math.pi*t); height=.65+(top-.13-.65)*t
        elif q<.66:
            angle=(q-.34)/.32*math.pi; offset=-.11+.11*math.cos(angle); height=top-.13+.13*math.sin(angle)
        else:
            t=(q-.66)/.34; offset=-.22-.012*math.sin(math.pi*t); height=top-.13-(top-.13-.65)*t
        verts.append(((.92+offset)*math.sin(theta),height,.055+(.81+offset)*math.cos(theta)))
        uv.append((a/nt*2.5,q*1.4))
for a in range(nt):
    for b in range(nq):
        i=a*(nq+1)+b; faces.append((i,i+nq+1,i+nq+2,i+1))
for a,reverse in [(0,True),(nt,False)]:
    ids=[a*(nq+1)+b for b in range(nq+1)]; center=tuple(sum(verts[i][j] for i in ids)/len(ids) for j in range(3)); ci=len(verts); verts.append(center); uv.append((.5,.5))
    for b in range(nq): faces.append((ci,ids[b+1],ids[b]) if reverse else (ci,ids[b],ids[b+1]))
shell=mesh('Continuous rounded tub back and arms',verts,faces,linen,uv)
smooth=shell.modifiers.new('Upholstery subdivision','SUBSURF'); smooth.levels=1; smooth.render_levels=1
top_points=[]
for a in range(nt+1):
    theta=-theta_max+2*theta_max*a/nt
    top_points.append((.81*math.sin(theta),arm_top(theta)+.002,.055+.70*math.cos(theta)))
cord('Upholstery top piping',top_points,seam,.007)

for sx in [-1,1]:
    for sz in [-1,1]:
        p1=Vector(point(sx*.70,.05,sz*.60)); p2=Vector(point(sx*.61,.61,sz*.51)); delta=p2-p1
        bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=.05,radius2=.072,depth=delta.length,location=(p1+p2)/2)
        obj=bpy.context.object; obj.name='Splayed oak leg'; obj.rotation_euler=delta.to_track_quat('Z','Y').to_euler(); obj.data.materials.append(wood)
        bevel=obj.modifiers.new('Foot edge bevel','BEVEL'); bevel.width=.012; bevel.segments=3
        for poly in obj.data.polygons: poly.use_smooth=True
        parts.append(obj)
pillow=rounded('Coral lumbar cushion',(.66,.67,.25),(-.26,1.32,.32),accent,.12)
pillow.rotation_euler[0]=math.radians(-13); pillow.rotation_euler[1]=math.radians(-12)

def catmull(points,t):
    p=min(len(points)-2,int(t*(len(points)-1))); f=t*(len(points)-1)-p
    p0=points[max(p-1,0)]; p1=points[p]; p2=points[p+1]; p3=points[min(p+2,len(points)-1)]
    return tuple(.5*((2*p1[k])+(-p0[k]+p2[k])*f+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*f*f+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*f*f*f) for k in range(2))

# The throw follows the right arm in cross-section and falls OUTSIDE the chair.
nv=62; nu=42; verts=[]; faces=[]; uv=[]
for v in range(nv+1):
    t=v/nv
    for u in range(nu+1):
        s=u/nu; z=-.31+s*.80; theta=math.acos(max(-1,min(1,(z-.055)/.81))); outer=.92*math.sin(theta); top=arm_top(theta)
        path=[(.16,1.145),(outer-.25,top-.105),(outer-.10,top+.028),(outer+.035,top-.06),(outer+.145,top-.36),(outer+.18,.73),(outer+.21,.29)]
        x,y=catmull(path,t); amplitude=.025*math.sin(math.pi*t)**.4
        x+=amplitude*(math.sin(s*math.pi*8+t*.6)+.3*math.sin(s*math.pi*18))
        y+=.014*math.sin(s*math.pi*6+.7)*math.sin(math.pi*t)
        verts.append((x,y,z)); uv.append((s,t))
for v in range(nv):
    for u in range(nu):
        i=v*(nu+1)+u; faces.append((i,i+1,i+nu+2,i+nu+1))
throw=mesh('Wool throw draped over right arm',verts,faces,wool,uv)
sub=throw.modifiers.new('Smooth fabric folds','SUBSURF'); sub.levels=1; sub.render_levels=1
thick=throw.modifiers.new('Real cloth thickness','SOLIDIFY'); thick.thickness=.009; thick.offset=0
for side in [0,nu]: cord('Blanket woven hem',[verts[v*(nu+1)+side] for v in range(nv+1)],wool,.006)
for n in range(37):
    s=(n+.5)/37; z=-.31+s*.8; theta=math.acos((z-.055)/.81); x=.92*math.sin(theta)+.21; length=.09+.028*math.sin(n*2.3)
    cord('Fine blanket fringe',[(x,.29,z),(x+.008,.25,z+.005*math.sin(n)),(x-.005,.29-length,z+.01*math.sin(n*1.3))],wool,.0045)

# Export real mesh objects with modifiers applied and proper smooth normals.
bpy.ops.object.select_all(action='DESELECT')
for obj in parts: obj.select_set(True)
bpy.context.view_layer.objects.active=shell
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).with_name('reading-chair.blend')))
# Consolidate small pieces by material to reduce draw calls in the browser.
for obj in list(parts):
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    bpy.ops.object.convert(target='MESH')
merged=[]
for mat in [linen,wool,wood,accent,seam]:
    group=[obj for obj in bpy.context.scene.objects if obj.type=='MESH' and len(obj.data.materials) and obj.data.materials[0]==mat]
    if not group: continue
    bpy.ops.object.select_all(action='DESELECT')
    for obj in group: obj.select_set(True)
    bpy.context.view_layer.objects.active=group[0]
    if len(group)>1: bpy.ops.object.join()
    group[0].name=mat.name; merged.append(group[0])
bpy.ops.object.select_all(action='DESELECT')
for obj in merged: obj.select_set(True)
bpy.context.view_layer.objects.active=merged[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'reading-chair.glb'),export_format='GLB',use_selection=True,export_apply=True,export_animations=False)

# An isolated reference render for inspecting chair/throw shape before browser integration.
floor=rounded('Preview floor',(200,.03,200),(0,-.03,0),material('preview_floor',(.84,.80,.72)),.005)
bpy.ops.object.camera_add(location=(4.0,-4.3,3.5)); camera=bpy.context.object
direction=Vector((.25,0,1.05))-camera.location; camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler(); camera.data.type='ORTHO'; camera.data.ortho_scale=3.7; bpy.context.scene.camera=camera
for name,loc,energy,size in [('Key',(-3,-4,5),550,4),('Fill',(3,1,4),140,3)]:
    bpy.ops.object.light_add(type='AREA',location=loc); light=bpy.context.object; light.name=name; light.data.energy=energy; light.data.shape='DISK'; light.data.size=size; light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene; scene.render.engine='CYCLES'; scene.cycles.samples=48; scene.cycles.use_denoising=True; scene.world.color=(.28,.25,.22)
scene.render.resolution_x=900; scene.render.resolution_y=1000; scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'; scene.render.filepath='/private/tmp/booksome-chair-refinement.png'
bpy.ops.render.render(write_still=True)
print('CHAIR_ASSET_READY',OUT/'reading-chair.glb')
