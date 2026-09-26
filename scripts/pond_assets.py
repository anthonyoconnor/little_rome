"""Detailed pond bed, bank and aquatic plants, authored in Blender."""
import math
import random
import bmesh
import bpy
import numpy as np
from mathutils import Vector


def build_pond(Mesh, material, mats, materials):
    saved=random.getstate();random.seed(614)
    stones=[material('Limestone pond '+str(i),(.50+i*.035,.42+i*.034,.30+i*.032),.86,True)for i in range(5)];water=mats['water'];greens=mats['greens']
    soil=material('Pond sediment',(.31,.245,.14),.96,True)
    pebbles=[material('Pond pebble '+str(i),c,.86,True)for i,c in enumerate([(.29,.25,.17),(.41,.34,.24),(.53,.44,.31)])]
    pad=material('Pond lily leaves',(.22,.32,.065),.55,True)
    vein=material('Pond lily veins',(.23,.30,.07),.85)
    reed=material('Pond reed blades',(.29,.38,.12),.76,True)
    moss=material('Pond bank moss',(.10,.16,.045),.97,True)
    cx,cy=-4.65,4.65
    def radius(a):return 1.38+.09*math.sin(a*3)+.045*math.sin(a*7)
    def height(t,a):
        if t<=1:return -.29*max(0,1-t*t)**1.2+.030+.008*math.cos(a)*t
        r=radius(a)*t;x=cx+math.cos(a)*r;y=cy+math.sin(a)*r
        rim=math.sin(max(0,min(1,(max(abs(x),abs(y))-5.8)/1.05))*math.pi)
        h=.009+.009*math.sin(x*1.1+y*.5)+.009*math.cos(y*.9-x*.3)+rim*(.13+.08*math.sin(x*1.6+y*.6)+.06*math.cos(y*1.8-x*.3))
        blend=max(0,min(1,(t-1)/.30));blend=blend*blend*(3-2*blend)
        return (.030+(t-1)*.14)*(1-blend)+(h+.009)*blend
    def point(t,a):
        r=radius(a)*t
        return (cx+math.cos(a)*r,cy+math.sin(a)*r,height(t,a))
    def stone(m,centre,scale,mat):
        bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=2,radius=1)
        phase=random.random()*math.tau;turn=random.random()*math.tau
        for face in bm.faces:
            points=[]
            for vertex in face.verts:
                v=vertex.co;noise=1+.10*math.sin(v.x*9+v.y*7+v.z*5+phase)
                x=max(-.77,min(.85,v.x))*scale[0]*noise;y=max(-.75,min(.81,v.y))*scale[1]*noise;z=max(-.82,min(.63-v.x*.22,v.z))*scale[2]*noise
                points.append((centre[0]+x*math.cos(turn)-y*math.sin(turn),centre[1]+x*math.sin(turn)+y*math.cos(turn),centre[2]+z))
            m.face(points,mat,abs(face.normal.z)<.62)
        bm.free()

    m=Mesh('PondBed')
    for ring in range(22):
        for i in range(96):
            a=i*math.tau/96;b=(i+1)*math.tau/96;t=ring/15;u=(ring+1)/15
            m.face([point(t,a),point(u,a),point(u,b),point(t,b)],soil,True)
    for i in range(670):
        a=random.random()*math.tau;t=random.uniform(.46,1.26);x,y,z=point(t,a)
        size=random.uniform(.012,.052)*(1.35 if i%7==0 else 1)
        m.ellipsoid((x,y,z+size*.2),(size,size*random.uniform(.65,1.3),size*.5),pebbles[i%3],8,5,.08)
    obj=m.finish()
    # Blend sediment into the same packed meadow texture in world coordinates.
    # The transition lives in a texture, so it cannot reveal triangle boundaries.
    im=bpy.data.images['Pond sediment_surface'];n=512;yy,xx=np.mgrid[0:n,0:n];wx=(xx/n-.5)*4.8+cx;wy=(yy/n-.5)*4.8+cy
    a=np.arctan2(wy-cy,wx-cx);rr=np.hypot(wx-cx,wy-cy)/(1.38+.09*np.sin(a*3)+.045*np.sin(a*7))
    rng=np.random.default_rng(731);noise=rng.normal(0,.045,(n,n));edge=1.07+.040*np.sin(a*9)+.019*np.sin(a*21)
    blend=np.clip((rr-edge)/.15,0,1);blend=blend*blend*(3-2*blend)
    original=bpy.data.images['Meadow ground_surface'];w,h=original.size;ground_pixels=np.array(original.pixels[:]).reshape(h,w,4)
    gx=np.clip(((wx+6.85)/13.7*w).astype(int),0,w-1);gy=np.clip(((wy+6.85)/13.7*h).astype(int),0,h-1)
    pixels=np.ones((n,n,4),np.float32);sediment=np.array([.31,.245,.14])*(1+noise[:,:,None])
    pixels[:,:,:3]=sediment*(1-blend[:,:,None])+ground_pixels[gy,gx,:3]*blend[:,:,None]
    im.scale(n,n);im.pixels.foreach_set(pixels.ravel());im.pack()
    for poly in obj.data.polygons:
        if poly.material_index==soil:
            for li in poly.loop_indices:
                v=obj.data.vertices[obj.data.loops[li].vertex_index].co;obj.data.uv_layers.active.data[li].uv=((v.x-cx)/4.8+.5,(v.y-cy)/4.8+.5)

    m=Mesh('PondBank')
    # Uneven groups and low gravel beaches interrupt the former uniform ring.
    for i in range(30):
        a=i*math.tau/30+random.uniform(-.055,.055)
        if .55<a<1.08 or 3.78<a<4.15:continue
        t=random.uniform(.99,1.12);x,y,z=point(t,a);size=random.uniform(.105,.235)
        stone(m,(x,y,z+size*.16),(size*random.uniform(.8,1.35),size*random.uniform(.65,1.12),size*.8),stones[i%5])
        if i%3==0:
            x,y,z=point(.94,a+.07);stone(m,(x,y,z+.012),(.075,.06,.05),stones[3])
        for j in range(4):
            x,y,z=point(t+random.uniform(-.015,.07),a+random.uniform(-.045,.045));m.ellipsoid((x,y,z+.01),(.022,.017,.01),moss,6,3)
    for k,a in enumerate([.18,1.22,1.75,2.5,3.35,4.35,5.10,5.75]):
        t=.89+(k%3)*.025;x,y,z=point(t,a)
        for j in range(12+k%4*3):
            theta=j*2.4;start=Vector((x+math.cos(theta)*.047,y+math.sin(theta)*.047,z-.018));h=random.uniform(.30,.72);direction=Vector((math.cos(theta),math.sin(theta),0));across=Vector((-math.sin(theta),math.cos(theta),0));rows=[];bend=random.uniform(.20,.66)
            for step in range(6):
                f=step/5;centre=start+Vector((0,0,h*f))+direction*(h*bend*f*f);width=.013*math.sin((f*.88+.12)*math.pi)
                rows.append([centre-across*width,centre+direction*.003,centre+across*width])
            for step in range(5):
                for side in range(2):m.face([rows[step][side],rows[step+1][side],rows[step+1][side+1],rows[step][side+1]],reed,True)
            if j in [0,4]:
                top=start+Vector((0,0,h*1.12));m.tube(start,top,.0035,greens[3],r2=.0016,n=5);m.ellipsoid(top,(.010,.010,.037),mats['wood'],7,5)
    for cluster in range(32):
        a=cluster*2.399;t=random.uniform(1.075,1.19);x,y,z=point(t,a)
        for j in range(9):
            theta=j*2.4;h=random.uniform(.055,.15);dx=math.cos(theta);dy=math.sin(theta);width=.004
            m.face([(x-dy*width,y+dx*width,z),(x+dy*width,y-dx*width,z),(x+dx*.035+dy*width*.5,y+dy*.035-dx*width*.5,z+h*.65),(x+dx*.06,y+dy*.06,z+h)],reed,True)
        if cluster%3==0:
            for j in range(5):
                angle=j*math.tau/5;m.leaf((x+math.cos(angle)*.013,y+math.sin(angle)*.013,z+.11),.020,mats['flower'][1],angle)
    m.finish()

    m=Mesh('Pond')
    for i in range(96):
        arc=[]
        for k in [i,i+1]:
            a=k*math.tau/96;r=radius(a);arc.append((cx+math.cos(a)*r,cy+math.sin(a)*r,.029))
        m.face([(cx,cy,.029),*arc],water)
    for i in range(18):
        a=i*2.399+random.uniform(-.15,.15);r=random.uniform(.64,1.13);x=cx+math.cos(a)*r;y=cy+math.sin(a)*r;size=random.uniform(.060,.115);turn=random.random()*math.tau
        centre=(x,y,.041);rim=[]
        for j in range(25):
            angle=turn+.16+j/24*(math.tau-.32);rr=size*(1+.025*math.sin(j*2.4));rim.append((x+math.cos(angle)*rr,y+math.sin(angle)*rr,.041+.006*(.5+.5*math.sin(angle*3+i))))
        for j in range(24):m.face([centre,rim[j],rim[j+1]],pad,True)
        for j in [2,6,10,14,18,22]:
            end=Vector(rim[j]);start=Vector(centre);end=start.lerp(end,.90);start.z+=.002;end.z+=.002;m.tube(start,end,.00065,vein,r2=.00025,n=3)
        m.tube((x,y,-.12),(x,y,.040),.0018,reed,n=4)
    m.finish();random.setstate(saved)
