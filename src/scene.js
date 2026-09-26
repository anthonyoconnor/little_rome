import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {SIZE,FOOTPRINT,cells,center,door,blocked,key,connected} from './layout.js';

export class Diorama {
  constructor(container,onPick,onHover){
    this.container=container;this.onPick=onPick;this.onHover=onHover;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;
    container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Little Rome interactive landscape');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c2ccc1');this.scene.fog=new THREE.Fog('#c2ccc1',42,105);
    this.camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,140);this.camera.position.set(12,14,17);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,-.6,0);this.controls.enablePan=false;
    this.controls.minDistance=12;this.controls.maxDistance=40;this.controls.minPolarAngle=.40;this.controls.maxPolarAngle=1.25;
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.ambient=new THREE.HemisphereLight('#e5f0fa','#56442a',2.0);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#ffe4b0',3.5);this.sun.position.set(-8,16,7);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.024;this.sun.shadow.radius=3;
    this.scene.add(this.sun);
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#bdc6b7',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-5.30;floor.receiveShadow=true;this.scene.add(floor);this.floor=floor;
    this.buildings=new THREE.Group();this.scene.add(this.buildings);this.nature=new THREE.Group();this.scene.add(this.nature);
    this.people=new THREE.Group();this.scene.add(this.people);this.personMap=new Map();this.buildingMap=new Map();
    this.grid=new THREE.GridHelper(SIZE,SIZE,0xd5d4a1,0xc6c7a0);this.grid.position.y=.085;this.grid.material.transparent=true;this.grid.material.opacity=.34;this.grid.visible=false;this.scene.add(this.grid);
    this.markers=new THREE.Group();this.scene.add(this.markers);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.renderer.domElement.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};});
    this.renderer.domElement.addEventListener('pointerup',e=>{if(!this.down||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5||e.button!==0)return;const hit=this.hit(e);onPick(hit);});
    this.renderer.domElement.addEventListener('pointermove',e=>{if(!e.buttons)onHover(this.hit(e));});
    this.renderer.domElement.addEventListener('pointerleave',()=>{if(this.ghost)this.ghost.visible=false;});
    addEventListener('resize',()=>this.resize());
    this.frames=[];this.lastFrame=performance.now();this.elapsed=0;this.state=null;this.planning=true;
  }
  async load(){
    const gltf=await new GLTFLoader().loadAsync('/assets/little-rome.glb');this.library=gltf.scene;
    this.library.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name.startsWith('Foliage')||o.material.name.startsWith('Olive')||o.material.name.startsWith('Petal'))o.material.side=THREE.DoubleSide;}});
    for(const name of ['Landscape','WildBorder','Pond']){const obj=this.asset(name);this.scene.add(obj);if(name==='Pond')this.pond=obj;}
    this.materials=new Map();this.library.traverse(o=>{if(o.isMesh&&!this.materials.has(o.material.uuid))this.materials.set(o.material.uuid,{m:o.material,color:o.material.color.clone(),roughness:o.material.roughness});});
    const rainGeo=new THREE.BufferGeometry();const rain=new Float32Array(900*6);for(let i=0;i<900;i++){const x=((i*17.13)%21)-10.5,z=((i*13.71)%21)-10.5,y=(i*.317)%10;rain.set([x,y,z,x-.10,y+.45,z+.025],i*6);}rainGeo.setAttribute('position',new THREE.BufferAttribute(rain,3));
    this.rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#d5e9eb',transparent:true,opacity:.24,depthWrite:false}));this.rain.visible=false;this.scene.add(this.rain);
    this.ready=true;
  }
  asset(name){const src=this.library.getObjectByName(name);if(!src)throw new Error(`Missing Blender asset ${name}`);return src.clone(true);}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);}
  world(p){return new THREE.Vector3(p.x-5.5,0,p.z-5.5);}
  hit(e){
    const r=this.renderer.domElement.getBoundingClientRect();this.pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);this.ray.setFromCamera(this.pointer,this.camera);
    const p=new THREE.Vector3();this.ray.ray.intersectPlane(this.ground,p);const tile={x:Math.floor(p.x+6),z:Math.floor(p.z+6)};
    const hits=this.ray.intersectObjects([...this.people.children,...this.buildings.children],true);let id=null,kind=null;
    for(const h of hits){let o=h.object;while(o&&!o.userData.id)o=o.parent;if(o?.userData.id){id=o.userData.id;kind=o.userData.kind;break;}}
    return {...tile,id,kind};
  }
  batch(name,positions,parent){
    const src=this.asset(name);src.updateMatrixWorld(true);
    src.traverse(o=>{if(!o.isMesh)return;const mesh=new THREE.InstancedMesh(o.geometry,o.material,positions.length);mesh.castShadow=true;mesh.receiveShadow=true;
      positions.forEach((p,i)=>{const mat=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y||0,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle||0),new THREE.Vector3().setScalar(p.scale||1));mat.multiply(o.matrixWorld);mesh.setMatrixAt(i,mat);});parent.add(mesh);});
  }
  setLayout(layout,planning=true){
    this.layout=layout;this.planning=planning;this.buildings.clear();this.nature.clear();this.markers.clear();this.buildingMap.clear();
    const occupied=new Set(layout.objects.flatMap(cells).map(p=>key(p.x,p.z))),patches=[[],[],[]],olives=[];
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)if(!occupied.has(key(x,z))&&!blocked(x,z,layout.level)){
      patches[(x+z)%3].push({x:x-5.5,z:z-5.5,angle:((x*7+z*3)%4)*Math.PI/2});
      if((x*17+z*23)%37===0&&!(x>2&&x<10&&z>2&&z<10))olives.push({x:x-5.5,z:z-5.5,scale:.7+(x%3)*.1});
    }
    patches.forEach((p,i)=>this.batch(`Meadow${i}`,p,this.nature));this.batch('Olive',olives,this.nature);
    const roads=layout.objects.filter(b=>b.type==='road');this.batch('Road',roads.map(b=>({x:b.x-5.5,z:b.z-5.5})),this.buildings);
    // Tile picking for the instanced road surface uses the ground tile in the UI.
    for(const b of layout.objects.filter(b=>b.type!=='road')){
      const group=new THREE.Group(),c=center(b);group.position.copy(this.world(c));group.rotation.y=-(b.rotation||0)*Math.PI/2;
      group.userData={id:b.id,kind:'building'};group.add(this.asset(b.type[0].toUpperCase()+b.type.slice(1)));
      const record={group};
      if(b.type==='home'){record.stores=this.asset('HomeStores');record.shutters=this.asset('ClosedShutters');record.shutters.visible=false;group.add(record.stores,record.shutters);}
      if(b.type==='well'){record.water=this.asset('WellWater');group.add(record.water);}
      if(b.type==='field'){record.crops=this.asset('Crops');record.crops.position.y=.07;record.crops.scale.y=.20;record.stores=this.asset('FieldStores');record.stores.visible=false;group.add(record.crops,record.stores);}
      this.buildings.add(group);this.buildingMap.set(b.id,record);
      if(planning){const d=door(b),marker=new THREE.Mesh(new THREE.RingGeometry(.10,.16,3),new THREE.MeshBasicMaterial({color:connected(layout,b)?'#ebdfb3':'#d27348',side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.copy(this.world(d));marker.position.y=.103;this.markers.add(marker);}
    }
    if(planning){this.people.clear();this.personMap.clear();this.state=null;this.grid.visible=!!this.tool;}
  }
  setTool(type){this.tool=type;this.grid.visible=!!type&&this.planning;if(this.ghost){this.scene.remove(this.ghost);this.ghost=null;}}
  preview(b,check){
    if(!this.planning||!b)return;
    if(!this.ghost||this.ghost.userData.type!==b.type){if(this.ghost)this.scene.remove(this.ghost);this.ghost=this.asset(b.type[0].toUpperCase()+b.type.slice(1));this.ghost.userData.type=b.type;this.ghost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.transparent=true;o.material.opacity=.58;o.material.depthWrite=false;o.castShadow=false;}});this.scene.add(this.ghost);}
    this.ghost.visible=true;this.ghost.position.copy(this.world(center(b)));this.ghost.position.y=.07;this.ghost.rotation.y=-(b.rotation||0)*Math.PI/2;
    this.ghost.traverse(o=>{if(o.isMesh)o.material.color.set(check.ok?'#80d68d':'#ec785c');});
  }
  person(p){
    const g=new THREE.Group();g.userData={id:p.id,kind:'person'};g.add(this.asset('ResidentBody'));
    const parts={};for(const name of ['ArmL','ArmR','LegL','LegR']){const o=this.asset(name);o.position.set(name.endsWith('L')?-.052:.052,name.startsWith('Arm')?.335:.15,0);g.add(o);parts[name]=o;}
    for(const name of ['WaterJug','FoodBasket','DeparturePack']){const o=this.asset(name);o.position.set(name==='DeparturePack'?0:.08,name==='DeparturePack'?.30:.18,name==='DeparturePack'?.075:-.10);o.visible=false;g.add(o);parts[name]=o;}
    this.people.add(g);const r={g,parts};this.personMap.set(p.id,r);return r;
  }
  setState(state){this.state=state;this.planning=false;this.grid.visible=false;this.markers.visible=false;if(this.ghost)this.ghost.visible=false;}
  showRoute(p){if(this.routeLine){this.scene.remove(this.routeLine);this.routeLine.geometry.dispose();this.routeLine.material.dispose();this.routeLine=null;}if(!p?.path?.length)return;const pts=[{x:p.x,z:p.z},...p.path.slice(p.pathIndex)].map(n=>this.world(n).setY(.15));this.routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#f8d586',transparent:true,opacity:.85}));this.scene.add(this.routeLine);}
  resetSeason(){this.scene.background.set('#c2ccc1');this.scene.fog.color.copy(this.scene.background);this.floor.material.color.copy(this.scene.background);this.sun.color.set('#ffe4b0');this.sun.intensity=3.5;this.ambient.intensity=2;this.rain.visible=false;for(const {m,color,roughness}of this.materials.values()){m.color.copy(color);m.roughness=roughness;if(m.name==='Window glow')m.emissiveIntensity=.1;}}
  applyState(){
    const s=this.state;if(!s)return;
    const seen=new Set();for(const p of s.people){if(p.departed)continue;seen.add(p.id);const r=this.personMap.get(p.id)||this.person(p);r.g.position.copy(this.world(p));r.g.position.y=.10;
      r.g.rotation.y=p.heading||0;const walking=p.path&&p.pathIndex<p.path.length,phase=s.tick*.34+p.id.length;
      const stride=walking?Math.sin(phase)*.6:0;r.parts.LegL.rotation.x=stride;r.parts.LegR.rotation.x=-stride;r.parts.ArmL.rotation.x=-stride*.7;r.parts.ArmR.rotation.x=p.carry?.type?-.65:stride*.7;
      r.parts.WaterJug.visible=p.carry?.type==='water';r.parts.FoodBasket.visible=p.carry?.type==='food';r.parts.DeparturePack.visible=p.job?.type==='depart';
    }
    for(const [id,r]of this.personMap)if(!seen.has(id))r.g.visible=false;else r.g.visible=true;
    for(const b of s.buildings){const r=this.buildingMap.get(b.id);if(!r)continue;
      if(b.type==='home'){r.stores.visible=b.food>3;r.shutters.visible=b.status==='abandoned'||b.status==='vacant';}
      if(b.type==='well')r.water.position.y=-.13+.22*(b.water/60);
      if(b.type==='field'){r.crops.visible=!b.dead&&s.season!=='Winter';r.crops.scale.y=.08+.92*(b.growth||0);r.crops.rotation.z=b.moisture<15?.16:0;r.stores.visible=b.food>1;}
    }
    const winter=s.season==='Winter',summer=s.season==='Summer',autumn=s.season==='Autumn',wet=s.weather==='Rain';
    const index=['Spring','Summer','Autumn','Winter'].indexOf(s.season),blend=THREE.MathUtils.smoothstep(s.day%14,0,1.2),previous=Math.max(0,index-1);
    const backgrounds=['#c2ccc1','#d4c7a4','#d5bca1','#879eac'],lights=['#ffe4b0','#ffe5b6','#ffcf90','#aabfd2'];
    this.scene.background.set(backgrounds[previous]).lerp(new THREE.Color(backgrounds[index]),blend);this.scene.fog.color.copy(this.scene.background);this.floor.material.color.copy(this.scene.background);
    this.sun.color.set(lights[previous]).lerp(new THREE.Color(lights[index]),blend);this.sun.intensity=winter?1.1:wet?1.7:3.5;
    this.ambient.intensity=winter?1.4:2;
    this.rain.visible=wet;this.rain.position.y=-(s.tick%40)*.09;
    for(const {m,color,roughness}of this.materials.values()){
      const target=color.clone();if(m.name.startsWith('Foliage')||m.name==='Meadow ground'){if(summer)target.lerp(new THREE.Color('#938b3b'),.25);if(autumn)target.lerp(new THREE.Color('#9a702e'),.38);if(winter)target.multiplyScalar(.69);}
      m.color.copy(target);if(m.name.includes('limestone')||m.name.includes('Limestone')||m.name.includes('terracotta'))m.roughness=wet?.34:roughness;
      if(m.name==='Window glow')m.emissiveIntensity=winter?3:.1;
    }
  }
  render(){const now=performance.now();if(this.ready){this.applyState();this.controls.update();this.renderer.render(this.scene,this.camera);}this.frames.push(now-this.lastFrame);if(this.frames.length>300)this.frames.shift();this.lastFrame=now;}
  rotate(delta){const off=this.camera.position.clone().sub(this.controls.target);off.applyAxisAngle(new THREE.Vector3(0,1,0),delta);this.camera.position.copy(this.controls.target).add(off);this.controls.update();}
  resetCamera(){this.camera.position.set(12,14,17);this.controls.target.set(0,-.6,0);this.controls.update();}
  projectTile(x,z){const p=this.world({x,z});p.y=.1;p.project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}
  metrics(){const a=this.frames.slice(-120).sort((a,b)=>a-b);return {medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)],drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}
