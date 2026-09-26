"""Sculpted resident meshes and an editable armature, built inside Blender."""
import math
import bpy
from mathutils import Vector, Matrix, Quaternion


def build_residents(Mesh, material, mats):
    skin=material('Resident skin',(.53,.315,.19),.78,True)
    linen=material('Resident linen',(.77,.69,.53),.94,True)
    leather=material('Resident leather',(.13,.069,.031),.85,True)
    hair=material('Resident hair',(.075,.034,.014),.87)
    hairlight=material('Resident hair highlights',(.09,.044,.021),.84)
    eyes=material('Resident eyes',(.024,.015,.010),.48)
    ivory=material('Resident eye whites',(.38,.34,.27),.66)
    iris=material('Resident iris',(.15,.067,.026),.55)
    lips=material('Resident lips',(.30,.13,.079),.8)
    trim=material('Resident trim',(.48,.27,.09),.88)
    metal=material('Resident bronze',(.40,.26,.08),.48)
    produce=material('Resident produce',(.45,.18,.045),.85)
    flowing=material('Resident flowing water',(.16,.42,.51),.27)
    sash=mats['sash'];wood=mats['wood'];woodlight=mats['woodlight'];clay=mats['clay'];water=mats['water'];soil=mats['soil'];gold=mats['gold'];sack=mats['sack']

    def town_detail(obj):
        low=obj.copy();low.data=obj.data.copy();low.name=obj.name+'Town';bpy.context.collection.objects.link(low)
        bpy.context.view_layer.objects.active=low;decimate=low.modifiers.new('Town distance detail','DECIMATE');decimate.ratio=.22;decimate.use_collapse_triangulate=True
        bpy.ops.object.modifier_move_to_index(modifier=decimate.name,index=0);bpy.ops.object.modifier_apply(modifier=decimate.name)
        low.data.validate(clean_customdata=True);low.data.update()
        for vertex in low.data.vertices:
            weights=sorted([(g.group,g.weight)for g in vertex.groups],key=lambda item:item[1],reverse=True)
            total=sum(w for _,w in weights[:4])
            for index,w in weights[:4]:
                if total:low.vertex_groups[index].add([vertex.index],w/total,'REPLACE')
            for index,_ in weights[4:]:low.vertex_groups[index].remove([vertex.index])
        return low

    # All body geometry shares a skeleton. Cloth blends into hips/thighs instead
    # of rotating as an unbroken cone; limbs have separate knees and wrists.
    class Body(Mesh):
        def __init__(self,name):
            super().__init__(name);self.binding=lambda p:{'Spine':1};self.weights=[]
        def face(self,verts,mat,smooth=False):
            self.weights.extend(self.binding(p)for p in verts)
            super().face(verts,mat,smooth)
        def bind_vertices(self,obj):
            groups={name:obj.vertex_groups.new(name=name)for name in bones}
            for v in obj.data.vertices:
                weights=sorted(self.weights[v.index].items(),key=lambda item:item[1],reverse=True)[:4];total=sum(w for _,w in weights)
                for name,w in weights:
                    if w>0:groups[name].add([v.index],w/total,'REPLACE')
        def finish(self):
            obj=super().finish()
            obj.parent=rig;mod=obj.modifiers.new('Resident deformation','ARMATURE');mod.object=rig
            return obj

    bones={
        'Hips':((0,0,.302),(0,0,.330),None),
        'Spine':((0,0,.330),(0,0,.461),'Hips'),
        'Neck':((0,0,.455),(0,0,.479),'Spine'),
        'Head':((0,0,.479),(0,0,.578),'Neck'),
    }
    for suffix,side in [('L',-1),('R',1)]:
        bones['Arm'+suffix]=((side*.074,0,.443),(side*.095,-.002,.326),'Spine')
        bones['Forearm'+suffix]=((side*.095,-.002,.326),(side*.098,-.014,.218),'Arm'+suffix)
        bones['Hand'+suffix]=((side*.098,-.014,.218),(side*.098,-.023,.184),'Forearm'+suffix)
        bones['Leg'+suffix]=((side*.044,0,.302),(side*.044,0,.165),'Hips')
        bones['Shin'+suffix]=((side*.044,0,.165),(side*.044,0,.028),'Leg'+suffix)
        bones['Foot'+suffix]=((side*.044,0,.028),(side*.044,-.068,.025),'Shin'+suffix)
    data=bpy.data.armatures.new('Neighbour skeleton');rig=bpy.data.objects.new('ResidentRig',data);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for name,(head,tail,parent)in bones.items():
        b=data.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=data.edit_bones[parent]
    bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True

    def constant(name):return lambda p:{name:1}
    def cloth_weights(p):
        x,y,z=p
        if z>.352:
            shoulder=max(0,min(.8,(abs(x)-.046)/.044))*max(0,min(1,(z-.37)/.05))
            return {'Spine':1-shoulder,'Arm'+('L' if x<0 else 'R'):shoulder}
        if z>.292:
            t=(z-.292)/.060;return {'Hips':1-t,'Spine':t}
        t=min(.88,max(0,(.292-z)/.17));right=max(0,min(1,.5+x/.09));knee=max(0,min(.8,(.19-z)/.10))
        return {'Hips':1-t,'LegL':t*(1-right)*(1-knee),'LegR':t*right*(1-knee),'ShinL':t*(1-right)*knee,'ShinR':t*right*knee}

    for female in [False,True]:
        m=Body('ResidentFemale' if female else 'ResidentMale');m.binding=cloth_weights
        hem=.113 if female else .215;rows=[]
        levels=sorted(set([hem+(.365-hem)*j/11 for j in range(12)]+[.384,.400,.416,.431,.446,.456,.465]))
        for z in levels:
            t=(z-hem)/(.465-hem)
            if z<.300:rx=(.083 if female else .079)+(.302-z)*.17;ry=.053+(.302-z)*.18
            elif z<.34:rx=.059+(z-.30)*.18;ry=.039
            elif z<.429:rx=.062+(z-.34)*.16;ry=.040
            else:
                u=(z-.429)/.036;rx=.077*(1-u)+.026*u;ry=.040*(1-u)+.025*u
            row=[]
            for i in range(48):
                a=i*math.tau/48;fold=(.0007+.0073*(1-t))*(math.sin(a*10+z*10)+.30*math.sin(a*17-z*22))+.0025*math.sin(a*6+z*55)*math.exp(-((z-.34)/.045)**2)
                row.append((math.cos(a)*(rx+fold),math.sin(a)*(ry+fold),z+.0018*math.cos(a*9)*(1-t)))
            rows.append(row)
        low=levels.index(.384);high=levels.index(.446)
        for j in range(len(levels)-1):
            for i in range(48):
                if low<=j<high and (i<4 or i>=44 or 20<=i<28):continue
                m.face([rows[j][i],rows[j][(i+1)%48],rows[j+1][(i+1)%48],rows[j+1][i]],linen,True)
        # Extrude each sleeve directly from the torso opening. Shared vertices
        # make the shoulder a continuous cloth surface in every arm pose.
        for suffix,side,mid in [('R',1,0),('L',-1,24)]:
            lo=mid-4;hi=mid+4
            boundary=[rows[low][i%48]for i in range(lo,hi)]+[rows[j][hi%48]for j in range(low,high)]+[rows[high][i%48]for i in range(hi,lo,-1)]+[rows[j][lo%48]for j in range(high,low,-1)]
            end=[]
            for x,y,z in boundary:
                a=math.atan2((z-.415)/.031,y/.024)
                end.append((side*(.09+math.sin(a)*.025),math.cos(a)*.026,.387+math.sin(a)*.005))
            prev=boundary
            for j in range(1,5):
                t=j/4;ring=[tuple(a[k]*(1-t)+b[k]*t+(side*.004*math.sin(t*math.pi)if k==0 else 0)for k in range(3))for a,b in zip(boundary,end)]
                m.binding=lambda p,suffix=suffix,t=t:{'Arm'+suffix:.45+.55*t,'Spine':.55*(1-t)}
                for i in range(len(ring)):m.face([prev[i],prev[(i+1)%len(ring)],ring[(i+1)%len(ring)],ring[i]],linen,True)
                prev=ring
            m.binding=constant('Arm'+suffix)
            for a,b in zip(end,end[1:]+end[:1]):m.tube(a,b,.0016,trim,n=5)
        m.binding=cloth_weights
        # Stitched hem/collar follow the folded surface rather than painted rings.
        for row in [rows[0],rows[-1]]:
            for i in range(48):m.tube(row[i],row[(i+1)%48],.0019,trim,n=5)
        m.binding=constant('Hips');m.tube((0,0,.303),(0,0,.318),.064,leather,r2=.065,n=32)
        m.box((0,-.063,.311),(.023,.005,.018),metal)
        m.box((0,-.067,.311),(.014,.004,.010),leather)
        m.ellipsoid((.052,-.039,.288),(.017,.012,.030),leather,12,8)
        for suffix,side in [('L',-1),('R',1)]:
            m.binding=lambda p,suffix=suffix:{'Arm'+suffix:max(0,min(1,(p[2]-.309)/.034)),'Forearm'+suffix:1-max(0,min(1,(p[2]-.309)/.034))}
            arm_rows=[]
            for z,radius in [(.395,.020),(.378,.021),(.353,.019),(.337,.018),(.326,.0175),(.311,.017),(.290,.018),(.266,.016),(.240,.013),(.218,.0115)]:
                if z>=.326:t=(z-.326)/.069;x=side*(.095-.010*t);y=-.002*(1-t)
                else:t=(.326-z)/.108;x=side*(.095+.003*t);y=-.002-.012*t
                arm_rows.append([(x+math.cos(i*math.tau/24)*radius,y+math.sin(i*math.tau/24)*radius*.88,z)for i in range(24)])
            for a,b in zip(arm_rows,arm_rows[1:]):
                for i in range(24):m.face([a[i],b[i],b[(i+1)%24],a[(i+1)%24]],skin,True)
            m.binding=constant('Hand'+suffix)
            m.ellipsoid((side*.098,-.017,.207),(.015,.009,.019),skin,14,9)
            for finger in range(4):
                x=side*.098+(finger-1.5)*.0068;length=.020-abs(finger-1.5)*.002
                m.tube((x,-.019,.198),(x,-.024,.198-length),.0036,skin,n=8)
                m.tube((x,-.024,.198-length),(x,-.031,.191-length),.0033,skin,r2=.0028,n=8)
            m.tube((side*.085,-.020,.211),(side*.079,-.032,.198),.005,skin,r2=.0038,n=9)
            m.binding=lambda p,suffix=suffix:{'Leg'+suffix:max(0,min(1,(p[2]-.143)/.04)),'Shin'+suffix:1-max(0,min(1,(p[2]-.143)/.04))}
            leg_rows=[]
            for z,radius in [(.222,.024),(.200,.0235),(.181,.0215),(.165,.020),(.147,.021),(.125,.023),(.10,.024),(.080,.022),(.060,.018),(.042,.014),(.025,.013)]:
                if female and z>.125:continue
                leg_rows.append([(side*.044+math.cos(i*math.tau/24)*radius,math.sin(i*math.tau/24)*radius+.003*math.exp(-((z-.10)/.03)**2),z)for i in range(24)])
            for a,b in zip(leg_rows,leg_rows[1:]):
                for i in range(24):m.face([a[i],b[i],b[(i+1)%24],a[(i+1)%24]],skin,True)
            m.binding=constant('Foot'+suffix)
            m.ellipsoid((side*.044,-.017,.013),(.026,.052,.011),leather,20,9)
            m.ellipsoid((side*.044,-.018,.026),(.022,.044,.014),skin,20,9)
            for toe in range(5):m.ellipsoid((side*.044+(toe-2)*.008,-.054+(toe*.001),.023),(.0045,.008,.006),skin,8,5)
            for y in [-.035,-.008]:
                arc=[(side*.044+math.cos(a)*.024,y,.021+math.sin(a)*.018)for a in [i*math.pi/12 for i in range(13)]]
                for a,b in zip(arc,arc[1:]):m.tube(a,b,.0039,leather,n=6)
            m.tube((side*.024,-.038,.030),(side*.061,.012,.038),.004,leather,n=6)
            m.tube((side*.022,.006,.034),(side*.066,-.015,.039),.004,leather,n=6)
        if female:
            m.binding=cloth_weights
            for j in range(24):
                for i in range(18):
                    def shawl(u,v):
                        width=.046+.012*math.sin(v*math.pi);across=(u-.5)*width
                        x=-.068+.136*v+across;z=.452-.166*v+across*.85
                        y=-.027-.040*math.sin(v*math.pi)-.005*math.sin(u*math.pi*6+v*5)
                        return(x,y,z)
                    m.face([shawl(i/18,j/24),shawl((i+1)/18,j/24),shawl((i+1)/18,(j+1)/24),shawl(i/18,(j+1)/24)],sash,True)
            # The wrap continues over the shoulder and falls in a folded tail.
            for j in range(18):
                for i in range(16):
                    def drape(u,v):
                        x=-.065+(u-.5)*(.050+.022*v);y=.027+.016*math.sin(v*math.pi)+.004*math.cos(u*math.pi*8+v*2);z=.454-.177*v-.011*math.sin(u*math.pi)
                        return(x,y,z)
                    m.face([drape(i/16,j/18),drape(i/16,(j+1)/18),drape((i+1)/16,(j+1)/18),drape((i+1)/16,j/18)],sash,True)
            for j in range(18):
                for i in range(14):
                    def tail(u,v):return(-.067+(u-.5)*(.052+.015*v),-.060-.010*v+.007*math.sin(u*math.pi*5+v*2),.317-.142*v+.005*math.sin(u*9))
                    m.face([tail(i/14,j/18),tail((i+1)/14,j/18),tail((i+1)/14,(j+1)/18),tail(i/14,(j+1)/18)],sash,True)
        town_detail(m.finish())

    # Four face/hair silhouettes: braided bun, dark curls, silver beard, loose bun.
    for variant in range(4):
        m=Mesh('ResidentHead'+str(variant));rx=[.034,.037,.037,.034][variant];height=[.097,.100,.102,.095][variant]
        rows=[]
        for j in range(33):
            p=2.52*j/32;z=.047+math.cos(p)*height*.50;row=[]
            for i in range(64):
                a=i*math.tau/64;x=math.sin(p)*math.cos(a)*rx;y=math.sin(p)*math.sin(a)*.032
                # A jaw taper, cheeks, recessed eye plane and projecting brow.
                x*=.84+.16*min(1,max(0,(z-.005)/.041))
                front=max(0,-math.sin(a))**2
                cheeks=.0075*math.exp(-((abs(x)-.021)/.015)**2-((z-.043)/.012)**2)
                socket=-.0025*math.exp(-((abs(x)-.015)/.009)**2-((z-.060)/.007)**2)
                brow=.0028*math.exp(-((abs(x)-.016)/.012)**2-((z-.067)/.005)**2)
                muzzle=.0035*math.exp(-(x/.014)**2-((z-.027)/.014)**2)
                nose=.008*math.exp(-(x/.0065)**2-((z-.053)/.013)**2)+.005*math.exp(-(x/.007)**2-((z-.043)/.006)**2)
                y-=front*(cheeks+socket+brow+muzzle)+nose*front**4;row.append((x,y,z))
            rows.append(row)
        for z,r in [(-.006,.018),(-.023,.0195)]:rows.append([(math.cos(i*math.tau/64)*r,math.sin(i*math.tau/64)*r*.82+.003,z)for i in range(64)])
        for j in range(len(rows)-1):
            for i in range(64):m.face([rows[j][i],rows[j+1][i],rows[j+1][(i+1)%64],rows[j][(i+1)%64]],skin,True)
        for side in [-1,1]:
            m.ellipsoid((side*rx*.97,0,.051),(.0065,.010,.013),skin,12,9)
            m.ellipsoid((side*.0148,-.030,.059),(.008,.0031,.0037),ivory,16,9)
            m.ellipsoid((side*.0148,-.0328,.059),(.0033,.0012,.0033),iris,12,8)
            m.ellipsoid((side*.0148,-.0338,.059),(.0018,.0005,.0025),eyes,12,8)
            for top in [False,True]:
                arc=[]
                for k in range(9):
                    t=k/8;x=side*.0148+(t-.5)*.016;z=.059+(1 if top else -1)*math.sin(t*math.pi)*.0038
                    arc.append((x,-.0323,z))
                for a,b in zip(arc,arc[1:]):m.tube(a,b,.0008 if top else .00055,skin,n=5)
            last=None
            for k in range(8):
                t=k/7;p=(side*(.006+t*.019),-.0305,.068+math.sin(t*math.pi)*.002-(.002*t))
                if last:m.tube(last,p,.0016,hair,r2=.0010,n=6)
                last=p
        for side in [-1,1]:
            m.ellipsoid((side*.005,-.034,.040),(.0035,.003,.0028),skin,10,7)
            m.ellipsoid((side*.0045,-.0367,.039),(.0012,.0007,.0008),lips,8,5)
        for k in range(12):
            x=-.011+k*.002;y=-.032-.003*(1-(x/.012)**2);z=.028+.0026*(abs(x)/.011)**1.5
            m.tube((x,y,z),(x+.002,y,z+.0001),.0011,lips,n=6)
        m.ellipsoid((0,-.029,.024),(.009,.002,.002),skin,16,7)
        # Cap only above the hairline; lock shapes are rooted on this surface.
        def cap(u,v,lift=0):
            a=u*math.tau;end=(1.24+.14*math.sin(a*2+.8) if math.sin(a)<-.4 else 1.70);p=.03+v*end
            wave=.003*math.sin(a*8+p*3)+.0013*math.sin(a*5-p*12)+lift
            return(math.sin(p)*math.cos(a)*(rx+.002+wave),math.sin(p)*math.sin(a)*(.035+wave)+.003,.053+math.cos(p)*(.049+lift))
        for j in range(20):
            for i in range(64):m.face([cap(i/64,j/20),cap(i/64,(j+1)/20),cap((i+1)/64,(j+1)/20),cap((i+1)/64,j/20)],hair,True)
        if variant in [0,3]:
            for k in range(16):
                points=[cap(k/16+.042*math.sin(j/18*math.pi),.12+j/18*.87,.001)for j in range(19)]
                for j,(a,b)in enumerate(zip(points,points[1:])):m.tube(a,b,.0017*(.6+.4*math.sin(j/18*math.pi)),hairlight if k%5==0 else hair,n=6)
        else:
            for k in range(18):
                u=k*.381966;v=.24+(k%6)/6*.68;points=[]
                for j in range(15):
                    a=j/14*math.tau*1.1;points.append(cap(u+.030*math.cos(a),v+.070*math.sin(a),.002+.001*math.sin(a)))
                for a,b in zip(points,points[1:]):m.tube(a,b,.0034,hairlight if k%7==0 else hair,n=7)
        if variant in [0,3]:
            m.ellipsoid((0,.039,.061),(.024,.023,.025),hair,16,10)
            for k in range(8):
                points=[]
                for j in range(29):
                    a=j/28*math.tau;r=.020*(.72+.20*math.sin(a*2+k))
                    points.append((math.cos(a)*r,.051+k*.0015+.003*math.cos(a*3),.061+math.sin(a)*r))
                for a,b in zip(points,points[1:]):m.tube(a,b,.0015,hairlight if k%3==0 else hair,n=6)
            for side in [-1,1]:
                last=(side*.029,-.012,.080)
                for k in range(9):
                    t=(k+1)/9;p=(side*(.031+.004*math.sin(t*7)), -.017+.008*math.sin(t*5), .080-t*.054)
                    m.tube(last,p,.0018,hair,r2=.0011,n=6);last=p
        if variant==2:
            for j in range(10):
                for i in range(24):
                    def beard(u,v):
                        a=math.pi+u*math.pi;w=1-v*.45;z=.037-v*.034
                        return(math.cos(a)*.030*w,math.sin(a)*(.028*w+.003)+.001,z+.004*abs(math.cos(a)))
                    m.face([beard(i/24,j/10),beard(i/24,(j+1)/10),beard((i+1)/24,(j+1)/10),beard((i+1)/24,j/10)],hair,True)
            for k in range(17):
                a=math.pi+k/16*math.pi;m.tube((math.cos(a)*.029,math.sin(a)*.029,.030),(math.cos(a)*.018,math.sin(a)*.021,.004),.0015,hair,r2=.0007,n=5)
            m.ellipsoid((-.007,-.033,.033),(.008,.004,.003),hair,12,6);m.ellipsoid((.007,-.033,.033),(.008,.004,.003),hair,12,6)
        town_detail(m.finish())

    # Props are separate assets: the browser poses hands at their actual handles.
    m=Mesh('WaterJug')
    profile=[(0,.028),(.008,.040),(.05,.061),(.103,.060),(.135,.039),(.148,.027),(.169,.031),(.174,.034),(.174,.025),(.150,.021),(.130,.032)]
    rings=[[(math.cos(i*math.tau/32)*r,math.sin(i*math.tau/32)*r,z)for i in range(32)]for z,r in profile]
    for a,b in zip(rings,rings[1:]):
        for i in range(32):m.face([a[i],a[(i+1)%32],b[(i+1)%32],b[i]],clay,True)
    m.face(list(reversed(rings[0])),clay)
    m.face([(math.cos(i*math.tau/32)*.032,math.sin(i*math.tau/32)*.032,.127)for i in range(32)],soil)
    m.face([(math.cos(i*math.tau/32)*.024,math.sin(i*math.tau/32)*.024,.163)for i in range(32)],water)
    for side in [-1,1]:
        points=[(side*(.045+math.sin(i*math.pi/12)*.033),0,.107+math.cos(i*math.pi/12)*.035)for i in range(13)]
        for a,b in zip(points,points[1:]):m.tube(a,b,.0058,clay,n=8)
    m.finish()
    m=Mesh('WaterStream');m.tube((0,0,0),(0,0,1),.0038,flowing,r2=.0028,n=8);m.finish()
    m=Mesh('FoodBasket')
    # Open wicker walls, an inner lining and a recessed floor; never a solid lid.
    rings=[[(math.cos(i*math.tau/32)*r,math.sin(i*math.tau/32)*r,z)for i in range(32)]for z,r in [(0,.075),(.085,.102),(.085,.096),(.008,.070)]]
    for a,b in zip(rings,rings[1:]):
        for i in range(32):m.face([a[i],a[(i+1)%32],b[(i+1)%32],b[i]],woodlight,True)
    m.face(list(reversed(rings[0])),woodlight);m.face(rings[-1],wood)
    for h in [.008,.020,.032,.044,.056,.068,.080]:
        for k in range(32):
            a=k*math.tau/32;b=(k+1)*math.tau/32;r=.075+h*.32
            m.tube((math.cos(a)*r,math.sin(a)*r,h),(math.cos(b)*r,math.sin(b)*r,h),.0026,sack,n=5)
    for k in range(24):
        a=k*math.tau/24;m.tube((math.cos(a)*.075,math.sin(a)*.075,0),(math.cos(a)*.102,math.sin(a)*.102,.084),.0024,wood,n=5)
    for k in range(5):
        a=k*2.4;r=.022+(k%3)*.020;x=math.cos(a)*r;y=math.sin(a)*r
        m.ellipsoid((x,y,.090),(.024,.022,.021+(k%2)*.004),produce,14,8)
        for leaf in range(4):m.leaf((x,y,.111),.025+(leaf%2)*.013,mats['green'],a+leaf*1.6)
    for k in range(7):
        x=-.055+k*.005;y=.016+(k%3)*.01
        m.tube((x,y,.045),(x-.017,y+.01,.145),.0025,gold,n=5)
        for j in range(4):m.ellipsoid((x-.013+(.004 if j%2 else -.004),y+.008,.113+j*.009),(.004,.003,.008),gold,7,5)
    m.finish()
    m=Mesh('DeparturePack');m.ellipsoid((0,0,0),(.065,.042,.086),sack,16,10)
    for x in [-.026,.026]:m.tube((x,-.040,-.069),(x,-.042,.070),.004,leather,n=7)
    m.finish()
    m=Mesh('Hoe');m.tube((0,0,-.28),(0,0,.24),.006,woodlight,n=10);m.box((0,-.025,-.285),(.078,.052,.008),metal);m.finish()

    # Bake a complete step with planted stance feet, bent swing knees and ankle
    # roll into the editable Blender action. The game can override hands for jobs.
    bpy.context.view_layer.objects.active=rig
    for pb in rig.pose.bones:pb.rotation_mode='QUATERNION'
    def aim(name,point):
        pb=rig.pose.bones[name];a=pb.head.copy();direction=Vector(point)-a
        rest=data.bones[name].matrix_local.to_quaternion();axis=Vector(bones[name][1])-Vector(bones[name][0])
        q=axis.rotation_difference(direction);matrix=(q@rest).to_matrix().to_4x4();matrix.translation=a;pb.matrix=matrix;bpy.context.view_layer.update()
    def leg(suffix,target):
        upper=rig.pose.bones['Leg'+suffix];a=upper.head.copy();target=Vector(target);v=target-a;d=min(v.length,.272);u=v.normalized();along=d/2;height=math.sqrt(max(0,.137**2-along**2));bend=Vector((0,-1,0));bend=(bend-u*bend.dot(u)).normalized();knee=a+u*along+bend*height
        aim('Leg'+suffix,knee);aim('Shin'+suffix,target)
    for frame in range(1,26):
        phase=(frame-1)/24*math.tau
        for pb in rig.pose.bones:pb.matrix_basis=Matrix.Identity(4)
        rig.pose.bones['Hips'].location.y=-.029+.006*math.cos(phase*2)
        rig.pose.bones['Spine'].rotation_quaternion=Quaternion((0,1,0),.022*math.sin(phase))
        bpy.context.view_layer.update()
        for suffix,side in [('L',-1),('R',1)]:
            cycle=((phase/math.tau)+(0 if suffix=='L' else .5))%1
            if cycle<.60:
                y=-.100+cycle/.60*.200;pitch=-.18*max(0,1-cycle/.12)+.25*max(0,(cycle-.50)/.10)**2
                lift=(.068 if pitch>0 else .021)*abs(math.sin(pitch))
            else:
                t=(cycle-.60)/.40;y=.100-.200*t;pitch=.25*(1-t)-.18*t;lift=.045*math.sin(t*math.pi)+(.068 if pitch>0 else .021)*abs(math.sin(pitch))
            leg(suffix,(side*.044,y,.028+lift))
            foot=rig.pose.bones['Foot'+suffix];mat=(Quaternion((1,0,0),pitch)@data.bones['Foot'+suffix].matrix_local.to_quaternion()).to_matrix().to_4x4();mat.translation=foot.head;foot.matrix=mat
            for name,angle in [('Arm'+suffix,side*.33*math.cos(phase)),('Forearm'+suffix,-.20-.10*max(0,-side*math.cos(phase)))]:
                pb=rig.pose.bones[name];axis=data.bones[name].matrix_local.to_3x3().inverted()@Vector((1,0,0));pb.rotation_quaternion=Quaternion(axis,angle)
        bpy.context.view_layer.update()
        for pb in rig.pose.bones:
            pb.keyframe_insert(data_path='rotation_quaternion',frame=frame)
            if pb.name=='Hips':pb.keyframe_insert(data_path='location',frame=frame)
    rig.animation_data.action.name='Walk'
    bpy.context.scene.frame_set(1)
    return rig
