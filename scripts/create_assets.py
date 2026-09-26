"""Rebuild the editable Blender library and browser GLB; Blender 5.2 Python."""
import bpy, math, random, os
import numpy as np
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public'/'assets'; OUT.mkdir(parents=True,exist_ok=True)
SOURCE=ROOT/'assets'; SOURCE.mkdir(exist_ok=True)
random.seed(24)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
MATS=[]
def material(name,color,rough=.85,texture=False):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1);m.use_nodes=True
    bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough
    if texture:
        rng=np.random.default_rng(len(MATS)+14);n=256;y,x=np.mgrid[0:n,0:n]
        noise=rng.normal(0,.07,(n,n))+np.sin(x*.13+np.cos(y*.05)*2)*.035+np.sin(y*.29)*.035
        ar=np.ones((n,n,4),dtype=np.float32)
        for i,c in enumerate(color):ar[:,:,i]=np.clip(c*(1+noise),0,1)
        im=bpy.data.images.new(name+'_surface',width=n,height=n);im.pixels.foreach_set(ar.ravel());im.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
    MATS.append(m);return len(MATS)-1
plaster=material('Warm lime plaster',(.78,.69,.51),texture=True)
ivory=material('Cut limestone',(.69,.60,.43),texture=True)
stones=[material('Limestone '+str(i),(.44+i*.039,.37+i*.035,.265+i*.03),texture=True) for i in range(7)]
roofs=[material('Fired terracotta '+str(i),(.32+i*.045,.092+i*.017,.04+i*.01),texture=True)for i in range(6)]
wood=material('Weathered chestnut',(.20,.115,.047),texture=True)
woodlight=material('Cut wood',(.34,.23,.10),texture=True)
dark=material('Deep recess',(.047,.036,.022))
soil=material('Cultivated earth',(.19,.13,.061),texture=True)
earth=material('Stratified ochre earth',(.29,.205,.115),texture=True)
ground=material('Meadow ground',(.29,.32,.105),texture=True)
greens=[material('Foliage '+str(i),(.063+i*.023,.13+i*.027,.033+i*.014))for i in range(7)]
silvers=[material('Olive leaves '+str(i),(.20+i*.026,.265+i*.027,.12+i*.023))for i in range(4)]
gold=material('Ripe wheat',(.62,.40,.09));stem=material('Crop stems',(.27,.32,.055))
flower=[material('Petal '+str(i),c)for i,c in enumerate([(.85,.59,.1),(.80,.77,.60),(.39,.22,.48)])]
water=material('Water',(.045,.29,.31),.18)
linen=material('Woven linen',(.84,.77,.58));skin=material('Sun warmed skin',(.53,.29,.15));hair=material('Dark hair',(.07,.041,.021))
sash=material('Madder sash',(.37,.083,.035));window=material('Window glow',(.95,.54,.13),.35)
bs=MATS[window].node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.32,.035,1);bs.inputs['Emission Strength'].default_value=.35

class Mesh:
    def __init__(self,name):self.name=name;self.v=[];self.f=[];self.mi=[];self.smooth=[]
    def face(self,verts,mat,smooth=False):
        k=len(self.v);self.v.extend(verts);self.f.append(tuple(range(k,k+len(verts))));self.mi.append(mat);self.smooth.append(smooth)
    def box(self,c,s,mat,rz=0):
        x,y,z=c;a,b,d=[t/2 for t in s];co=math.cos(rz);si=math.sin(rz)
        vs=[(x+u*co-v*si,y+u*si+v*co,z+w)for u,v,w in [(-a,-b,-d),(a,-b,-d),(a,b,-d),(-a,b,-d),(-a,-b,d),(a,-b,d),(a,b,d),(-a,b,d)]]
        for ids in [(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]:self.face([vs[i]for i in ids],mat)
    def ellipsoid(self,c,s,mat,segments=8,rings=5,jitter=0):
        x,y,z=c;vs=[]
        for j in range(rings+1):
            p=math.pi*j/rings
            for i in range(segments):
                t=2*math.pi*i/segments;f=1+random.uniform(-jitter,jitter)
                vs.append((x+math.sin(p)*math.cos(t)*s[0]*f,y+math.sin(p)*math.sin(t)*s[1]*f,z+math.cos(p)*s[2]*f))
        for j in range(rings):
            for i in range(segments):self.face([vs[j*segments+i],vs[j*segments+(i+1)%segments],vs[(j+1)*segments+(i+1)%segments],vs[(j+1)*segments+i]],mat,not jitter)
    def tube(self,a,b,r,mat,r2=None,n=8):
        a=Vector(a);b=Vector(b);axis=(b-a).normalized();u=axis.cross(Vector((0,0,1)))
        if u.length<.01:u=axis.cross(Vector((0,1,0)))
        u.normalize();v=axis.cross(u);r2=r if r2 is None else r2
        aa=[a+r*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*v)for i in range(n)]
        bb=[b+r2*(math.cos(i*math.tau/n)*u+math.sin(i*math.tau/n)*v)for i in range(n)]
        for i in range(n):self.face([aa[i],aa[(i+1)%n],bb[(i+1)%n],bb[i]],mat,True)
        self.face(list(reversed(aa)),mat);self.face(bb,mat)
    def leaf(self,c,s,mat,angle=0):
        x,y,z=c;dx=math.cos(angle)*s;dy=math.sin(angle)*s;w=s*.30
        self.face([(x-dx,y-dy,z),(x-dy*.3,y+dx*.3,z+w),(x+dx,y+dy,z+w*.5),(x+dy*.3,y-dx*.3,z)],mat)
    def finish(self):
        mesh=bpy.data.meshes.new(self.name);mesh.from_pydata(self.v,[],self.f);mesh.update()
        obj=bpy.data.objects.new(self.name,mesh);bpy.context.collection.objects.link(obj)
        for m in MATS:mesh.materials.append(m)
        uv=mesh.uv_layers.new(name='Surface UV')
        for p,mat,sm in zip(mesh.polygons,self.mi,self.smooth):
            p.material_index=mat;p.use_smooth=sm
            normal=p.normal;axis=max(range(3),key=lambda a:abs(normal[a]));axes=[a for a in range(3)if a!=axis]
            for li in p.loop_indices:
                v=mesh.vertices[mesh.loops[li].vertex_index].co;uv.data[li].uv=(v[axes[0]]*2,v[axes[1]]*2)
        return obj

def roof(m,c,width,depth,eave,rise):
    x,y,z=c; rows=max(3,round(depth/.19));cols=max(4,round(width/.16))
    for side in [-1,1]:
        for i in range(cols):
            xx=x-width/2+(i+.5)*width/cols
            for j in range(rows):
                yy=y+side*(j+.5)*depth/rows/2;zz=z+eave+rise*(1-(j+.5)/rows)
                # Individual curved Roman roof tiles. Their overlap catches light.
                a=(xx,yy-side*depth/rows*.28,zz+rise/rows*.56)
                b=(xx,yy+side*depth/rows*.31,zz-rise/rows*.62)
                m.tube(a,b,width/cols*.51,random.choice(roofs),n=8)
    for i in range(cols):m.tube((x-width/2+i*width/cols,y,z+eave+rise+.03),(x-width/2+(i+1.04)*width/cols,y,z+eave+rise+.03),.08,roofs[3],n=10)
    for xx in [x-width/2,x+width/2]:
        for side in [-1,1]:m.tube((xx,y,z+eave+rise),(xx,y+side*depth/2,z+eave),.045,woodlight,n=6)
def pot(m,x,y,z,scale=1,plant=False):
    m.tube((x,y,z),(x,y,z+.20*scale),.09*scale,roofs[2],r2=.14*scale,n=12)
    m.tube((x,y,z+.20*scale),(x,y,z+.235*scale),.15*scale,roofs[3],n=12)
    m.tube((x,y,z+.236*scale),(x,y,z+.237*scale),.113*scale,soil,n=12)
    if plant:
        for i in range(14):
            a=i*2.4;m.leaf((x+math.cos(a)*.06*scale,y+math.sin(a)*.06*scale,z+(.25+random.random()*.19)*scale),.16*scale,greens[i%7],a)
def olive(m,x,y,z,s=1):
    m.tube((x,y,z),(x+.08*s,y,z+1.0*s),.085*s,wood,r2=.043*s)
    for i in range(6):
        a=i*2.4;xx=x+math.cos(a)*.42*s;yy=y+math.sin(a)*.42*s;zz=z+(1+random.random()*.45)*s
        m.tube((x+.05*s,y,z+.60*s),(xx,yy,zz),.045*s,wood,r2=.018*s)
        for j in range(80):
            b=random.random()*math.tau;r=random.random()**.5*.32*s
            m.leaf((xx+math.cos(b)*r,yy+math.sin(b)*r,zz+random.uniform(-.22,.22)*s),random.uniform(.045,.09)*s,random.choice(silvers),random.random()*math.tau)
def cypress(m,x,y,z,s=1):
    m.tube((x,y,z),(x,y,z+1.6*s),.055*s,wood,r2=.015*s)
    for i in range(25):
        h=.35+i*.073;r=(1-h/2.35)*.27*s;a=i*2.4
        m.ellipsoid((x+math.cos(a)*r*.44,y+math.sin(a)*r*.44,z+h*s),(r,r,.32*s),greens[i%4],6,4,.16)
def tuft(m,x,y,z,s=1):
    for i in range(6):
        a=i*2.4;h=random.uniform(.11,.3)*s;dx=math.cos(a)*h*.65;dy=math.sin(a)*h*.65
        m.face([(x-.013*s,y,z),(x+.013*s,y,z),(x+dx,y+dy,z+h)],random.choice(greens))
def blossom(m,x,y,z,s=1):
    a=random.random()*math.tau;h=random.uniform(.1,.24)*s
    m.tube((x,y,z),(x+.025,y,z+h),.008*s,greens[3],n=3)
    mat=random.choice(flower)
    for i in range(5):m.leaf((x+math.cos(i*1.256)*.025*s,y+math.sin(i*1.256)*.025*s,z+h),.035*s,mat,i*1.256)

# The fixed landscape. Playable tiles lie inside a wilder one-metre border.
m=Mesh('Landscape');m.box((0,0,-2.65),(13.6,13.6,5.2),earth);m.box((0,0,-.11),(13.7,13.7,.20),ground)
for side in range(4):
    for row in range(13):
        for col in range(28):
            a=-6.7+(col+(.5 if row%2 else 0))*.49+random.uniform(-.06,.06);zz=-.21-row*.39
            p=[(a,-6.78,zz),(6.78,a,zz),(a,6.78,zz),(-6.78,a,zz)][side]
            dims=(random.uniform(.24,.36),random.uniform(.13,.25),random.uniform(.16,.24)) if side%2==0 else (random.uniform(.13,.25),random.uniform(.24,.36),random.uniform(.16,.24))
            m.ellipsoid(p,dims,random.choice(stones),7,4,.27)
    # Trailing roots and ivy down all four exposed faces.
    for i in range(25):
        t=random.uniform(-6.7,6.7);length=random.uniform(.4,2.8)
        def point(h,off=0):return [(t+off,-6.97,-h),(6.97,t+off,-h),(t+off,6.97,-h),(-6.97,t+off,-h)][side]
        last=point(0)
        for j in range(9):
            p=point((j+1)*length/9,math.sin(j*.8)*.08);m.tube(last,p,.009,wood,n=4);last=p
            m.ellipsoid(p,(.055,.055,.10),greens[(i+j)%6],5,3)
for i in range(130):
    a=random.random()*math.tau;r=random.uniform(6.15,6.7)
    x=math.cos(a)*r;y=math.sin(a)*r
    if abs(x)<5.8 and abs(y)<5.8:continue
    m.ellipsoid((x,y,.035),(random.uniform(.1,.3),random.uniform(.1,.3),random.uniform(.08,.22)),random.choice(stones),7,4,.25)
# Pond exactly matches the unbuildable north-west tiles (game z maps to -Blender y).
m.ellipsoid((-4.65,4.65,-.04),(1.4,1.4,.10),soil,32,4)
for i in range(43):
    a=i*math.tau/43;x=-4.65+math.cos(a)*1.37;y=4.65+math.sin(a)*1.37
    m.ellipsoid((x,y,.07),(.19,.15,.15),random.choice(stones),8,4,.3)
    if i%2==0:
        for j in range(5):m.tube((x,y,.05),(x+random.uniform(-.15,.15),y+random.uniform(-.15,.15),random.uniform(.3,.65)),.012,greens[4],r2=.003,n=4)
for x,y in [(5.3,5.4),(5.8,5.4),(5.5,6.0)]:m.ellipsoid((x,y,.23),(.45,.48,.5),stones[5],9,5,.30)
m.finish()
m=Mesh('Pond');m.ellipsoid((-4.65,4.65,.011),(1.30,1.30,.035),water,48,3)
for i in range(22):
    a=random.random()*math.tau;r=random.random()*1.15;x=-4.65+math.cos(a)*r;y=4.65+math.sin(a)*r
    m.tube((x,y,.06),(x,y,.064),random.uniform(.035,.10),greens[5],n=9)
m.finish()
m=Mesh('WildBorder')
for i in range(550):
    side=i%4;t=random.uniform(-6.6,6.6);d=random.uniform(6.05,6.7)
    x,y=[(t,d),(t,-d),(d,t),(-d,t)][side]
    if abs(x-.5)<.65 and y<-6:continue
    tuft(m,x,y,.03,random.uniform(.7,1.3))
    if i%2==0:blossom(m,x,y,.04)
for x,y,s in [(-6.3,5.5,1.1),(-3,6.3,1.2),(.2,6.3,1.3),(4.1,6.2,1.0),(6.25,3.5,1.1),(6.3,-1.8,.9),(5.8,-6.2,.95),(-4,-6.2,.9),(-6.25,-2.6,1.0),(-6.25,1.2,1.1)]:cypress(m,x,y,0,s)
for x,y,s in [(-5.5,6.2,1.1),(2,6.3,1.1),(6.2,5.4,.95),(6.3,.6,1.05),(3,-6.3,.9),(-2,-6.3,1),(-6.25,-4.7,.95),(-6.3,3.3,.9)]:olive(m,x,y,.04,s)
m.finish()
# Reusable vegetation patches are hidden automatically under construction.
for variant in range(3):
    m=Mesh('Meadow'+str(variant))
    for i in range(22):
        x=random.uniform(-.48,.48);y=random.uniform(-.48,.48);tuft(m,x,y,0,random.uniform(.55,1.0))
        if i%3==0:blossom(m,x,y,.03,.8)
    for i in range(5):m.ellipsoid((random.uniform(-.43,.43),random.uniform(-.43,.43),.014),(.035,.04,.024),stones[3],5,3,.2)
    m.finish()
m=Mesh('Olive');olive(m,0,0,0,1);m.finish()
m=Mesh('Cypress');cypress(m,0,0,0,1);m.finish()

m=Mesh('Road')
m.box((0,0,.013),(.99,.99,.04),soil)
for i in range(4):
    for j in range(4):m.box((-.375+i*.25+random.uniform(-.007,.007),-.375+j*.25+random.uniform(-.007,.007),.042),(.235+random.uniform(-.015,.007),.234,.057),random.choice(stones[3:]),random.uniform(-.035,.035))
m.finish()

m=Mesh('Home')
m.box((0,0,.065),(1.93,1.94,.13),ivory)
m.box((0,.17,.73),(1.64,1.34,1.35),plaster)
for side in [-1,1]:
    m.face([(side*.82,-.50,1.40),(side*.82,.84,1.40),(side*.82,.17,1.98)],plaster)
roof(m,(0,.17,0),1.95,1.70,1.43,.60)
# Front facade faces negative Blender Y, positive browser Z.
m.box((-.23,-.508,.51),(.36,.025,.89),dark)
for i in range(5):m.box((-.38+i*.071,-.535,.49),(.064,.035,.83),wood)
m.box((-.23,-.571,.93),(.48,.08,.10),ivory)
m.ellipsoid((-.10,-.576,.48),(.02,.018,.02),gold,8,4)
m.box((.45,-.522,.89),(.31,.03,.36),dark)
m.box((.45,-.545,.89),(.22,.02,.28),window)
for xx in [.29,.61]:m.box((xx,-.559,.89),(.082,.06,.41),woodlight)
m.box((.45,-.577,.89),(.025,.05,.31),wood)
for yy in [-.21,.47]:
    m.box((.825,yy,.87),(.025,.31,.34),dark);m.box((.843,yy,.87),(.024,.22,.25),window)
    m.box((.86,yy,.87),(.025,.025,.29),wood)
for x in [-.78,.78]:
    for z in range(7):m.box((x,-.51,.18+z*.18),(.16,.10,.12),stones[5])
m.box((.55,.52,1.81),(.22,.25,.81),plaster);m.box((.55,.52,2.22),(.30,.33,.10),ivory);m.box((.55,.52,2.28),(.17,.20,.02),dark)
for i in range(8):m.box((-.5+i*.16,-.85,.09),(.15,.22,.13),stones[4+i%3])
# A vine covered pergola and everyday pots, bench, and doorstep.
for x in [-.79,.73]:m.tube((x,-.86,.13),(x,-.86,1.03),.033,wood,n=7)
for i in range(7):m.box((-.8+i*.25,-.67,1.055),(.045,.75,.055),woodlight)
for i in range(80):
    x=random.uniform(-.86,.86);y=random.uniform(-1.0,-.35)
    m.leaf((x,y,1.09+random.uniform(-.035,.065)),.08,greens[i%7],i*2.4)
pot(m,-.65,-.77,.14,1,True);pot(m,.70,-.68,.14,.85,True)
m.box((-.9,.28,.36),(.17,.63,.05),woodlight)
for y in [.06,.49]:m.box((-.9,y,.22),(.07,.06,.30),wood)
for i in range(22):
    x=random.uniform(-.78,.78);z=random.uniform(.18,1.35)
    if abs(x+.23)<.28 and z<1:continue
    m.box((x,-.505,z),(.07+random.random()*.1,.01,.04),stones[5])
m.finish()
m=Mesh('HomeStores')
for i in range(6):pot(m,-.76+(i%3)*.19,.55+(i//3)*.20,.14,.62)
m.finish()
m=Mesh('ClosedShutters');m.box((.45,-.60,.89),(.36,.04,.39),wood);m.box((.865,-.21,.87),(.03,.32,.37),wood);m.box((.865,.47,.87),(.03,.32,.37),wood);m.finish()

m=Mesh('Well')
for i in range(13):
    a=i*math.tau/13;m.box((math.cos(a)*.36,math.sin(a)*.36,.065),(.19,.16,.10),stones[4],a)
for row in range(4):
    for i in range(12):
        a=(i+(row%2)*.5)*math.tau/12
        m.box((math.cos(a)*.27,math.sin(a)*.27,.15+row*.10),(.135,.12,.088),stones[3+(i+row)%4],a+math.pi/2)
for x in [-.35,.35]:m.box((x,0,.58),(.065,.08,1.08),wood)
m.tube((-.36,0,.77),(.36,0,.77),.042,woodlight)
m.tube((0,0,.79),(0,0,.23),.010,wood)
roof(m,(0,0,0),.91,.76,1.04,.29)
pot(m,.33,-.32,.10,.57)
m.finish()
m=Mesh('WellWater');m.tube((0,0,.20),(0,0,.21),.21,water,n=24);m.finish()

m=Mesh('Field');m.box((0,0,.025),(2.87,2.87,.075),soil)
for row in range(8):m.tube((-1.28,-1.22+row*.34,.062),(1.28,-1.22+row*.34,.062),.062,earth,n=6)
for side in [-1,1]:
    for i in range(8):m.tube((-1.44+i*.41,side*1.44,.03),(-1.44+i*.41,side*1.44,.40),.025,woodlight,n=5)
    for h in [.18,.34]:m.tube((-1.44,side*1.44,h),(1.44,side*1.44,h),.018,woodlight,n=5)
    for i in range(8):m.tube((side*1.44,-1.44+i*.41,.03),(side*1.44,-1.44+i*.41,.40),.025,woodlight,n=5)
    for h in [.18,.34]:m.tube((side*1.44,-1.44,h),(side*1.44,1.44,h),.018,woodlight,n=5)
for x in [.88,1.30]:m.box((x,1.10,.36),(.04,.05,.65),wood)
roof(m,(1.09,1.1,0),.65,.65,.69,.18)
m.box((1.1,1.15,.20),(.5,.4,.05),woodlight)
m.finish()
m=Mesh('Crops')
for row in range(8):
    for col in range(13):
        x=-1.23+col*.19+random.uniform(-.03,.03);y=-1.22+row*.34
        if x>.7 and y>.7:continue
        h=random.uniform(.46,.69)
        m.tube((x,y,0),(x+.015,y,h),.009,stem,n=4)
        for j in range(3):m.leaf((x,y,.14+j*.11),.13,greens[4],j*2.4+col)
        for j in range(5):
            m.ellipsoid((x+(-1 if j%2 else 1)*.023,y,h-.055+j*.023),(.023,.018,.049),gold,5,3)
m.finish()
m=Mesh('FieldStores')
for i in range(8):pot(m,.83+(i%3)*.18,.81+(i//3)*.18,.11,.62)
m.finish()

# Resident rig: separately named body parts keep walking and carrying tied to state.
m=Mesh('ResidentBody');m.tube((0,0,.15),(0,0,.35),.083,linen,r2=.055,n=10);m.tube((0,0,.275),(0,0,.294),.061,sash,n=10);m.ellipsoid((0,0,.424),(.043,.045,.057),skin,10,7);m.ellipsoid((0,.008,.446),(.046,.042,.04),hair,10,5);m.finish()
for name,side in [('ArmL',-1),('ArmR',1)]:
    m=Mesh(name);m.tube((0,0,0),(side*.015,-.012,-.13),.019,skin,r2=.016,n=7);m.tube((0,0,.015),(0,0,-.058),.026,linen,r2=.022,n=7);m.finish()
for name in ['LegL','LegR']:
    m=Mesh(name);m.tube((0,0,0),(0,0,-.14),.019,skin,n=7);m.ellipsoid((0,-.021,-.135),(.024,.044,.015),wood,8,4);m.finish()
m=Mesh('WaterJug');pot(m,0,0,0,.40);m.tube((0,0,.095),(0,0,.10),.043,water,n=10);m.finish()
m=Mesh('FoodBasket');m.tube((0,0,0),(0,0,.105),.065,woodlight,r2=.085,n=10)
for i in range(7):m.ellipsoid((random.uniform(-.048,.048),random.uniform(-.04,.04),.11),(.026,.022,.035),gold,6,4)
m.finish()
m=Mesh('DeparturePack');m.ellipsoid((0,0,0),(.077,.049,.10),woodlight,9,6);m.finish()

# Preserve source, and export only browser-ready meshes. Y-up conversion is glTF's default.
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'little-rome.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'little-rome.glb'),export_format='GLB',export_yup=True,export_apply=True,export_animations=False)
print('LITTLE_ROME_ASSETS_READY',len(bpy.data.objects),sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
