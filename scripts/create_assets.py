"""Rebuild the editable Blender library and browser GLB; Blender 5.2 Python."""
import bpy, bmesh, math, random, os
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
        def cloud(resolution):
            grid=rng.normal(0,1,(resolution+1,resolution+1));q=np.linspace(0,resolution,n,endpoint=False);ix=q.astype(int);f=q-ix;f=f*f*(3-2*f)
            low=grid[ix[:,None],ix[None,:]]*(1-f[None,:])+grid[ix[:,None],ix[None,:]+1]*f[None,:]
            high=grid[ix[:,None]+1,ix[None,:]]*(1-f[None,:])+grid[ix[:,None]+1,ix[None,:]+1]*f[None,:]
            return low*(1-f[:,None])+high*f[:,None]
        noise=rng.normal(0,.045,(n,n))+cloud(7)*.065+cloud(27)*.038+cloud(63)*.020
        ar=np.ones((n,n,4),dtype=np.float32)
        for i,c in enumerate(color):ar[:,:,i]=np.clip(c*(1+noise),0,1)
        im=bpy.data.images.new(name+'_surface',width=n,height=n);im.pixels.foreach_set(ar.ravel());im.pack()
        tex=m.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;m.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color'])
        dy,dx=np.gradient(noise);normal=np.ones((n,n,4),dtype=np.float32);normal[:,:,0]=.5-dx*.7;normal[:,:,1]=.5-dy*.7;normal[:,:,2]=.99
        nm=bpy.data.images.new(name+'_normal',width=n,height=n);nm.colorspace_settings.name='Non-Color';nm.pixels.foreach_set(normal.ravel());nm.pack()
        nt=m.node_tree.nodes.new('ShaderNodeTexImage');nt.image=nm;nn=m.node_tree.nodes.new('ShaderNodeNormalMap');nn.inputs['Strength'].default_value=.38;m.node_tree.links.new(nt.outputs['Color'],nn.inputs['Color']);m.node_tree.links.new(nn.outputs['Normal'],bs.inputs['Normal'])
    MATS.append(m);return len(MATS)-1
plaster=material('Warm lime plaster',(.86,.79,.64),texture=True)
ivory=material('Cut limestone',(.82,.75,.60),texture=True)
stones=[material('Limestone '+str(i),(.52+i*.047,.44+i*.046,.32+i*.043),texture=True) for i in range(7)]
roofs=[material('Fired terracotta '+str(i),(.47+i*.039,.22+i*.02,.115+i*.012),texture=True)for i in range(6)]
wood=material('Weathered chestnut',(.20,.115,.047),texture=True)
woodlight=material('Cut wood',(.34,.23,.10),texture=True)
dark=material('Deep recess',(.047,.036,.022))
soil=material('Cultivated earth',(.19,.13,.061),texture=True)
earth=material('Stratified ochre earth',(.42,.315,.19),texture=True)
ground=material('Meadow ground',(.40,.42,.20),texture=True)
greens=[material('Foliage '+str(i),(.063+i*.023,.13+i*.027,.033+i*.014))for i in range(7)]
cypress_greens=[material('Cypress needles '+str(i),(.013+i*.009,.045+i*.014,.018+i*.006))for i in range(5)]
silvers=[material('Olive leaves '+str(i),(.12+i*.026,.19+i*.024,.075+i*.018))for i in range(4)]
gold=material('Ripe wheat',(.62,.40,.09));stem=material('Crop stems',(.27,.32,.055))
flower=[material('Petal '+str(i),c)for i,c in enumerate([(.85,.59,.1),(.80,.77,.60),(.39,.22,.48)])]
water=material('Water',(.045,.29,.31),.18)
linen=material('Woven linen',(.84,.77,.58),texture=True);skin=material('Sun warmed skin',(.53,.29,.15));hair=material('Dark hair',(.07,.041,.021))
sack=material('Woven grain sacks',(.56,.41,.23),texture=True)
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
            for i in range(segments):self.face([vs[j*segments+i],vs[(j+1)*segments+i],vs[(j+1)*segments+(i+1)%segments],vs[j*segments+(i+1)%segments]],mat,not jitter or mat in greens or mat in silvers or mat in cypress_greens)
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
        for p,mat,sm in zip(mesh.polygons,self.mi,self.smooth):
            p.material_index=mat;p.use_smooth=sm
        # Share coincident vertices before calculating normals: curved parts must
        # shade continuously, while explicitly flat stone and plaster stay crisp.
        bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000001);bm.to_mesh(mesh);bm.free();mesh.update()
        uv=mesh.uv_layers.new(name='Surface UV')
        for p in mesh.polygons:
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
                mat=random.choice(roofs);a=Vector(a);b=Vector(b);across=Vector((1,0,0));up=Vector((0,side*rise/(depth/2),1)).normalized();half=width/cols*.49
                face=[a-across*half,a+across*half,b+across*half,b-across*half]
                m.face(face if side==1 else list(reversed(face)),mat)
                # Tegula pan and a thin, open imbrex cap: actual clay shells,
                # rather than full cylinders that resemble round roof logs.
                radius=width/cols*.23;arcA=[];arcB=[]
                for k in range(9):
                    theta=k*math.pi/8;offset=across*(half+math.cos(theta)*radius)+up*math.sin(theta)*radius
                    arcA.append(a+offset);arcB.append(b+offset)
                for k in range(8):
                    face=[arcA[k],arcB[k],arcB[k+1],arcA[k+1]]
                    m.face(face if side==1 else list(reversed(face)),mat,True)
                    m.tube(arcB[k],arcB[k+1],.0035,mat,n=4)
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
    m.tube((x,y,z),(x+.09*s,y+.03*s,z+.48*s),.105*s,wood,r2=.071*s)
    m.tube((x+.09*s,y+.03*s,z+.48*s),(x-.04*s,y,z+.86*s),.073*s,wood,r2=.050*s)
    for i in range(9):
        a=i*2.4;xx=x+math.cos(a)*.52*s;yy=y+math.sin(a)*.52*s;zz=z+(1.02+random.random()*.43)*s
        m.tube((x-.04*s,y,z+.71*s),(xx,yy,zz),.044*s,wood,r2=.018*s)
        # Open, branching crowns: no globular filler hidden beneath leaf cards.
        for branch in range(4):
            angle=a+branch*1.57;end=(xx+math.cos(angle)*.3*s,yy+math.sin(angle)*.3*s,zz+random.uniform(-.09,.2)*s)
            m.tube((xx,yy,zz-.08*s),end,.017*s,wood,r2=.003*s,n=5)
        for j in range(420):
            b=random.random()*math.tau;r=random.random()**.5*.38*s
            m.leaf((xx+math.cos(b)*r,yy+math.sin(b)*r,zz+random.uniform(-.20,.22)*s),random.uniform(.035,.063)*s,random.choice(silvers),random.random()*math.tau)
def cypress(m,x,y,z,s=1):
    m.tube((x,y,z),(x,y,z+1.6*s),.055*s,wood,r2=.015*s)
    m.ellipsoid((x,y,z+1.22*s),(.18*s,.18*s,1.02*s),cypress_greens[0],12,16,.045)
    for i in range(1800):
        h=random.uniform(.24,2.24);r=math.sin((h-.20)/2.12*math.pi)**.7*.25*s;a=i*2.4
        rad=random.uniform(.55,1)*r
        xx=x+math.cos(a)*rad;yy=y+math.sin(a)*rad;zz=z+h*s
        m.leaf((xx,yy,zz),random.uniform(.018,.039)*s,cypress_greens[i%5],a)
        if i%30==0:m.tube((x,y,zz-.08*s),(xx,yy,zz+.03*s),.008*s,wood,r2=.003*s,n=4)
def tuft(m,x,y,z,s=1):
    for i in range(6):
        a=i*2.4;h=random.uniform(.11,.3)*s;dx=math.cos(a)*h*.65;dy=math.sin(a)*h*.65
        m.face([(x-.013*s,y,z),(x+.013*s,y,z),(x+dx,y+dy,z+h)],random.choice(greens))
def blossom(m,x,y,z,s=1):
    a=random.random()*math.tau;h=random.uniform(.1,.24)*s
    m.tube((x,y,z),(x+.025,y,z+h),.008*s,greens[3],n=3)
    mat=random.choices(flower,weights=[6,2,2])[0]
    for i in range(5):m.leaf((x+math.cos(i*1.256)*.029*s,y+math.sin(i*1.256)*.029*s,z+h),.045*s,mat,i*1.256)
    m.ellipsoid((x,y,z+h+.01),(.019*s,.019*s,.01*s),gold,6,3)
def shrub(m,x,y,z,s=1):
    for j in range(6):
        a=j*2.4;xx=x+math.cos(a)*.15*s;yy=y+math.sin(a)*.15*s;zz=z+random.uniform(.12,.28)*s
        m.ellipsoid((xx,yy,zz),(.10*s,.11*s,.10*s),greens[j%5],7,4,.20)
        for i in range(25):m.leaf((xx+random.uniform(-.15,.15)*s,yy+random.uniform(-.15,.15)*s,zz+random.uniform(-.03,.14)*s),.065*s,greens[(i+j)%7],i*2.4)

# The fixed landscape. Playable tiles lie inside a wilder one-metre border.
m=Mesh('Landscape');m.box((0,0,-2.65),(13.6,13.6,5.2),earth);m.box((0,0,-.11),(13.7,13.7,.20),ground)
for side in range(4):
    for rock in range(500):
        a=random.uniform(-6.65,6.65);zz=random.uniform(-5.14,-.19)
        p=[(a,-6.78,zz),(6.78,a,zz),(a,6.78,zz),(-6.78,a,zz)][side]
        breadth=random.uniform(.18,.57);height=random.uniform(.15,.44);depth=random.uniform(.14,.29)
        dims=(breadth,depth,height) if side%2==0 else (depth,breadth,height)
        m.ellipsoid(p,dims,random.choice(stones),10,6,.13)
        if rock%2==0:
            crumb=[p[0],p[1],p[2]-.16];crumb[1 if side%2==0 else 0]+=[-.10,.10,.10,-.10][side]
            m.ellipsoid(crumb,(.07,.07,.085),stones[2],6,4,.17)
    # Trailing roots and ivy down all four exposed faces.
    for i in range(50):
        t=random.uniform(-6.7,6.7);length=random.uniform(.4,3.1)
        def point(h,off=0):return [(t+off,-6.97,-h),(6.97,t+off,-h),(t+off,6.97,-h),(-6.97,t+off,-h)][side]
        last=point(0)
        for j in range(9):
            p=point((j+1)*length/9,math.sin(j*.8)*.08);m.tube(last,p,.009,wood,n=4);last=p
            tangent=(1,0,0) if side%2==0 else (0,1,0)
            outward=[(0,-1,0),(1,0,0),(0,1,0),(-1,0,0)][side]
            for branch in [-1,1]:
                cx=p[0]+tangent[0]*branch*.067;cy=p[1]+tangent[1]*branch*.067;cz=p[2]
                m.face([(cx-tangent[0]*.052,cy-tangent[1]*.052,cz),(cx,cy,cz+.036),(cx+tangent[0]*.058,cy+tangent[1]*.058,cz),(cx+outward[0]*.045,cy+outward[1]*.045,cz-.12)],greens[(i+j)%6])
for i in range(130):
    a=random.random()*math.tau;r=random.uniform(6.15,6.7)
    x=math.cos(a)*r;y=math.sin(a)*r
    if abs(x)<5.8 and abs(y)<5.8:continue
    m.ellipsoid((x,y,.035),(random.uniform(.1,.3),random.uniform(.1,.3),random.uniform(.08,.22)),random.choice(stones),7,4,.25)
# Pond exactly matches the unbuildable north-west tiles (game z maps to -Blender y).
m.ellipsoid((-4.65,4.65,-.04),(1.4,1.4,.055),soil,32,4)
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
for i in range(1400):
    side=i%4;t=random.uniform(-6.6,6.6);d=random.uniform(6.05,6.7)
    x,y=[(t,d),(t,-d),(d,t),(-d,t)][side]
    if abs(x-.5)<.65 and y<-6:continue
    tuft(m,x,y,.03,random.uniform(.7,1.3))
    if i%2==0:blossom(m,x,y,.04,1.2)
    if i%17==0:shrub(m,x,y,.02,random.uniform(.7,1.3))
for x,y,s in [(-6.3,5.5,1.1),(-3,6.3,1.2),(.2,6.3,1.3),(4.1,6.2,1.0),(6.25,3.5,1.1),(6.3,-1.8,.9),(5.8,-6.2,.95),(-4,-6.2,.9),(-6.25,-2.6,1.0),(-6.25,1.2,1.1)]:cypress(m,x,y,0,s)
for x,y,s in [(-5.5,6.2,1.1),(2,6.3,1.1),(6.2,5.4,.95),(6.3,.6,1.05),(3,-6.3,.9),(-2,-6.3,1),(-6.25,-4.7,.95),(-6.3,3.3,.9)]:olive(m,x,y,.04,s)
m.finish()
# Reusable vegetation patches are hidden automatically under construction.
for variant in range(3):
    m=Mesh('Meadow'+str(variant))
    for i in range(42):
        x=random.uniform(-.48,.48);y=random.uniform(-.48,.48);tuft(m,x,y,0,random.uniform(.55,1.0))
        if (x+.18)**2+(y-.12)**2<.13 and i%2==0:blossom(m,x,y,.03,1.0)
    if variant!=1:shrub(m,-.18 if variant==0 else .23,.19,.01,.60)
    for i in range(5):m.ellipsoid((random.uniform(-.43,.43),random.uniform(-.43,.43),.014),(.035,.04,.024),stones[3],5,3,.2)
    m.finish()
m=Mesh('Olive');olive(m,0,0,0,1);m.finish()
m=Mesh('Cypress');cypress(m,0,0,0,1);m.finish()
m=Mesh('Shrub');shrub(m,0,0,0,1);m.finish()
m=Mesh('Rock');m.ellipsoid((0,0,.26),(.46,.49,.53),stones[5],9,6,.22);m.finish()

for variant in range(3):
    m=Mesh('Road' if variant==0 else 'Road'+str(variant))
    m.box((0,0,.013),(.998,.998,.04),soil)
    nodes=[[(i*.25-.5+(random.uniform(-.034,.034) if i not in [0,4] else 0),j*.25-.5+(random.uniform(-.034,.034) if j not in [0,4] else 0)) for j in range(5)]for i in range(5)]
    for i in range(4):
        for j in range(4):
            quad=[nodes[i][j],nodes[i+1][j],nodes[i+1][j+1],nodes[i][j+1]];cx=sum(p[0]for p in quad)/4;cy=sum(p[1]for p in quad)/4
            top=[]
            for k,p in enumerate(quad):
                for adjacent in [quad[(k-1)%4],quad[(k+1)%4]]:top.append((cx+(p[0]*.91+adjacent[0]*.09-cx)*.96,cy+(p[1]*.91+adjacent[1]*.09-cy)*.96,.076))
            mat=random.choice(stones[3:]);m.face(top,mat)
            lower=[(cx+(p[0]-cx)*1.035,cy+(p[1]-cy)*1.035,.057)for p in top]
            for k in range(8):m.face([top[k],lower[k],lower[(k+1)%8],top[(k+1)%8]],mat)
    m.finish()
# A reusable patch of shallow rainwater, rendered with a cached planar reflection.
m=Mesh('WetRoad')
for x,y,rx,ry in [(-.18,.08,.27,.20),(.25,-.27,.19,.13),(.3,.33,.14,.16)]:
    pts=[]
    for i in range(22):
        a=i*math.tau/22;r=random.uniform(.82,1.08);pts.append((x+math.cos(a)*rx*r,y+math.sin(a)*ry*r,0))
    for i in range(len(pts)):m.face([(x,y,0),pts[i],pts[(i+1)%len(pts)]],water)
m.finish()

m=Mesh('Home')
m.box((0,0,.065),(1.93,1.94,.13),ivory)
m.box((0,.17,.73),(1.64,1.34,1.35),plaster)
for side in [-1,1]:
    m.face([(side*.82,-.50,1.40),(side*.82,.84,1.40),(side*.82,.17,1.98)],plaster)
roof(m,(0,.17,0),1.78,1.63,1.43,.60)
# Front facade faces negative Blender Y, positive browser Z.
m.box((-.23,-.508,.51),(.36,.025,.89),dark)
for i in range(5):m.box((-.38+i*.071,-.535,.49),(.064,.035,.83),wood)
m.box((-.23,-.571,.93),(.48,.08,.10),ivory)
m.ellipsoid((-.10,-.576,.48),(.02,.018,.02),gold,8,4)
m.box((.45,-.522,.89),(.31,.03,.36),dark)
m.box((.45,-.545,.89),(.22,.02,.28),window)
for xx in [.29,.61]:m.box((xx,-.559,.89),(.082,.06,.41),woodlight)
m.box((.45,-.577,.89),(.025,.05,.31),wood)
for side in [-1,1]:
    for yy in [-.21,.47]:
        m.box((side*.825,yy,.87),(.025,.31,.34),dark);m.box((side*.843,yy,.87),(.024,.22,.25),window)
        m.box((side*.86,yy,.87),(.025,.025,.29),wood)
        m.box((side*.855,yy,1.065),(.065,.40,.075),ivory)
        for yoff in [-.19,.19]:m.box((side*.86,yy+yoff,.87),(.042,.10,.39),woodlight)
for x in [-.43,.43]:
    m.box((x,.849,.90),(.32,.03,.36),dark);m.box((x,.867,.90),(.24,.02,.28),window);m.box((x,.89,.90),(.025,.04,.28),wood)
    m.box((x,.89,1.105),(.41,.07,.075),ivory)
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
m=Mesh('HomeDetails0')
for i in range(30):
    z=.20+i*.035;x=.80+math.sin(i*.45)*.025
    m.tube((x,-.58,z),(x+.02,-.58,z+.05),.008,wood,n=4)
    m.leaf((x-.07,-.63,z),.095,greens[i%7],i*.8)
m.finish()
m=Mesh('HomeDetails1')
for x in [-.5,-.10,.28]:pot(m,x,.92,.13,.65,True)
# A worn ochre canvas shade on one facade, supported by its existing pergola.
for i in range(12):
    x=-.81+i*.137;m.face([(x,-.98,.99),(x+.13,-.98,.99),(x+.13,-.36,1.10),(x,-.36,1.10)],linen)
m.finish()
m=Mesh('HomeDetails2')
for y in [-.3,.05,.4,.72]:
    pot(m,.92,y,.13,.48,True)
    for z in [.40,.80,1.20]:m.leaf((.87,y,z),.13,greens[3],y*3+z)
m.box((-.53,-.73,.28),(.28,.22,.28),woodlight)
for i in range(5):m.ellipsoid((-.6+i*.03,-.73,.46),(.03,.03,.06),gold,6,4)
m.finish()
m=Mesh('HomeStores')
for i in range(3):pot(m,.43+i*.18,-.85,.14,.63)
for i in range(3):
    x=-.67+i*.15;y=-.93
    m.ellipsoid((x,y,.26),(.075,.065,.12),sack,10,6)
    m.tube((x,y,.33),(x,y,.4),.027,sack,r2=.016,n=8)
m.finish()
m=Mesh('ClosedShutters');m.box((.45,-.60,.89),(.36,.04,.39),wood)
for side in [-1,1]:
    for yy in [-.21,.47]:m.box((side*.885,yy,.87),(.035,.32,.37),wood)
for x in [-.43,.43]:m.box((x,.91,.9),(.34,.04,.39),wood)
m.finish()

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
    for h in [.18,.34]:
        if side==-1:
            m.tube((-1.44,side*1.44,h),(-.24,side*1.44,h),.018,woodlight,n=5)
            m.tube((.24,side*1.44,h),(1.44,side*1.44,h),.018,woodlight,n=5)
        else:m.tube((-1.44,side*1.44,h),(1.44,side*1.44,h),.018,woodlight,n=5)
    for i in range(8):m.tube((side*1.44,-1.44+i*.41,.03),(side*1.44,-1.44+i*.41,.40),.025,woodlight,n=5)
    for h in [.18,.34]:m.tube((side*1.44,-1.44,h),(side*1.44,1.44,h),.018,woodlight,n=5)
for x in [.88,1.30]:m.box((x,1.10,.36),(.04,.05,.65),wood)
roof(m,(1.09,1.1,0),.65,.65,.69,.18)
m.box((1.1,1.15,.20),(.5,.4,.05),woodlight)
m.finish()
m=Mesh('Crops')
for row in range(12):
    for col in range(19):
        x=-1.25+col*.139+random.uniform(-.03,.03);y=-1.25+row*.226+random.uniform(-.04,.04)
        if x>.7 and y>.7:continue
        h=random.uniform(.46,.69)
        bend=random.uniform(-.09,.09);m.tube((x,y,0),(x+bend*.3,y,h*.55),.006,stem,n=4);m.tube((x+bend*.3,y,h*.55),(x+bend,y,h),.0045,stem,n=4)
        for j in range(3):m.leaf((x,y,.14+j*.11),.08,greens[4],j*2.4+col)
        for j in range(5):
            m.ellipsoid((x+bend+(-1 if j%2 else 1)*.012,y,h-.035+j*.017),(.015,.012,.033),gold,6,4)
            m.tube((x+bend,y,h+j*.017),(x+bend+(-1 if j%2 else 1)*.04,y+.01,h+.07+j*.017),.002,gold,n=3)
m.finish()
m=Mesh('Vegetables')
for row in range(9):
    for col in range(10):
        x=-1.22+col*.267+random.uniform(-.025,.025);y=-1.22+row*.30+random.uniform(-.025,.025)
        if x>.7 and y>.7:continue
        for j in range(11):
            a=j*2.4+col;length=random.uniform(.10,.19);h=random.uniform(.12,.29)
            p=(x+math.cos(a)*length,y+math.sin(a)*length,h)
            m.tube((x,y,.02),p,.006,stem,n=4)
            u=math.cos(a);v=math.sin(a);w=.055
            edge=[]
            for k in range(7):
                t=k/6;width=math.sin(t*math.pi)*w;zz=.025+(h-.025)*math.sin(t*math.pi*.57)
                edge.append([(x+u*length*t-v*width,y+v*length*t+u*width,zz),(x+u*length*t,y+v*length*t,zz+.014*math.sin(t*math.pi)),(x+u*length*t+v*width,y+v*length*t-u*width,zz)])
            for k in range(6):
                for side in range(2):m.face([edge[k][side],edge[k+1][side],edge[k+1][side+1],edge[k][side+1]],greens[(j+col)%7],True)
        if row%3==0:m.ellipsoid((x,y,.055),(.043,.04,.055),roofs[3],8,5)
m.finish()
m=Mesh('FieldStores')
for i in range(4):pot(m,.88+(i%2)*.22,.91+(i//2)*.22,.11,.75)
for i in range(5):
    x=.80+(i%3)*.21;y=.47+(i//3)*.22
    m.ellipsoid((x,y,.28),(.09,.075,.17),sack,10,6);m.tube((x,y,.39),(x,y,.48),.024,sack,r2=.037,n=8)
m.finish()

# Resident rig: separately named body parts keep walking and carrying tied to state.
m=Mesh('ResidentBody')
rings=[]
for z,rx,ry in [(.145,.080,.053),(.21,.071,.047),(.275,.049,.034),(.32,.062,.035),(.36,.058,.028)]:
    rings.append([(math.cos(i*math.tau/24)*(rx+.004*math.sin(i*3.14/2)),math.sin(i*math.tau/24)*(ry+.004*math.sin(i*3.14/2)),z+.004*math.cos(i*1.57))for i in range(24)])
for j in range(len(rings)-1):
    for i in range(24):m.face([rings[j][i],rings[j][(i+1)%24],rings[j+1][(i+1)%24],rings[j+1][i]],linen,True)
m.tube((0,0,.27),(0,0,.285),.054,sash,r2=.056,n=16)
m.tube((0,0,.35),(0,0,.401),.018,skin,n=12)
m.ellipsoid((0,0,.424),(.037,.039,.052),skin,16,10)
m.ellipsoid((0,.009,.448),(.040,.037,.030),hair,14,8)
m.ellipsoid((0,-.039,.42),(.010,.012,.014),skin,10,6)
for side in [-1,1]:
    m.ellipsoid((side*.036,0,.425),(.007,.011,.014),skin,8,5)
    m.ellipsoid((side*.016,-.035,.434),(.004,.003,.0035),dark,6,4)
m.finish()
for name,side in [('ArmL',-1),('ArmR',1)]:
    m=Mesh(name);m.tube((0,0,0),(side*.015,-.012,-.074),.018,skin,r2=.014,n=10);m.tube((side*.015,-.012,-.074),(side*.013,-.025,-.127),.014,skin,r2=.010,n=10);m.ellipsoid((side*.013,-.025,-.14),(.012,.009,.019),skin,10,6);m.tube((0,0,.015),(side*.01,-.006,-.048),.026,linen,r2=.021,n=10);m.finish()
for name in ['LegL','LegR']:
    m=Mesh(name);m.tube((0,0,0),(0,0,-.14),.019,skin,n=7);m.ellipsoid((0,-.021,-.135),(.024,.044,.015),wood,8,4);m.finish()
m=Mesh('WaterJug');pot(m,0,0,0,.40);m.tube((0,0,.095),(0,0,.10),.043,water,n=10);m.finish()
m=Mesh('FoodBasket');m.tube((0,0,0),(0,0,.105),.065,woodlight,r2=.085,n=10)
for i in range(7):m.ellipsoid((random.uniform(-.048,.048),random.uniform(-.04,.04),.11),(.026,.022,.035),gold,6,4)
m.finish()
m=Mesh('DeparturePack');m.ellipsoid((0,0,0),(.077,.049,.10),woodlight,9,6);m.finish()
m=Mesh('Hoe');m.tube((0,0,0),(0,.03,-.26),.011,woodlight,n=6);m.box((0,.002,-.26),(.075,.018,.023),stones[1]);m.finish()

# Preserve source, and export only browser-ready meshes. Y-up conversion is glTF's default.
bpy.context.scene.render.fps=24;bpy.context.scene.frame_start=1;bpy.context.scene.frame_end=25
for name,sign in [('ArmL',1),('ArmR',-1),('LegL',-1),('LegR',1)]:
    obj=bpy.data.objects[name]
    for frame,angle in [(1,0),(7,.52),(13,0),(19,-.52),(25,0)]:
        obj.rotation_euler.x=angle*sign;obj.keyframe_insert(data_path='rotation_euler',frame=frame)
    obj.animation_data.action.name='Walk_'+name
bpy.context.scene.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'little-rome.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'little-rome.glb'),export_format='GLB',export_yup=True,export_apply=True,export_animations=True,export_animation_mode='ACTIVE_ACTIONS',export_nla_strips_merged_animation_name='Walk')
print('LITTLE_ROME_ASSETS_READY',len(bpy.data.objects),sum(len(o.data.polygons) for o in bpy.data.objects if o.type=='MESH'))
