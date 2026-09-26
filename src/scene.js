import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {TownOcclusion} from './ambient-occlusion.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {SIZE,FOOTPRINT,cells,center,door,blocked,key,connected} from './layout.js';
import {climate} from './simulation.js';
import {wetRoads} from './wet-ground.js';
import {miniatureLens} from './miniature-lens.js';

export class Diorama {
  constructor(container,onPick,onHover){
    this.container=container;this.onPick=onPick;this.onHover=onHover;
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.10;
    container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Little Rome interactive landscape');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c2ccc1');this.scene.fog=new THREE.Fog('#c2ccc1',42,105);
    const pmrem=new THREE.PMREMGenerator(this.renderer),room=new RoomEnvironment();this.scene.environment=pmrem.fromScene(room,.04).texture;this.scene.environmentIntensity=.16;room.dispose();pmrem.dispose();
    this.camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,140);this.camera.position.set(-9.6,11.0,13.5);
    this.camera.zoom=Math.min(1,this.camera.aspect/1.45);this.camera.updateProjectionMatrix();
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.3,0);this.controls.enablePan=false;
    this.controls.minDistance=12;this.controls.maxDistance=40;this.controls.minPolarAngle=.40;this.controls.maxPolarAngle=1.25;
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.ambient=new THREE.HemisphereLight('#c4d9f2','#bba47f',.82);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#ffead0',5.2);this.sun.position.set(-12,16,0);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.024;this.sun.shadow.radius=3;
    this.scene.add(this.sun);
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.info.autoReset=false;
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.ao=new TownOcclusion(this,innerWidth,innerHeight);this.composer.addPass(this.ao);this.lens=miniatureLens(this.ao.depthTexture,this.camera.near,this.camera.far);this.composer.addPass(this.lens);this.composer.addPass(new OutputPass());this.composer.addPass(new SMAAPass());
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
    this.frames=[];this.lastFrame=performance.now();this.elapsed=0;this.state=null;this.planning=true;this.effectsRevision=0;this.lastEffects=0;
  }
  async load(){
    const gltf=await new GLTFLoader().loadAsync('/assets/little-rome.glb');this.library=gltf.scene;const clip=gltf.animations[0];if(clip)this.walkClip=new THREE.AnimationClip('Walk',clip.duration,clip.tracks.filter(t=>t.name.endsWith('.quaternion')));
    this.library.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name.startsWith('Foliage')||o.material.name.startsWith('Olive')||o.material.name.startsWith('Petal')||o.material.name.startsWith('Cypress needles'))o.material.side=THREE.DoubleSide;if(o.material.map)o.material.map.anisotropy=8;if(o.material.name==='Water'){o.material.metalness=.35;o.material.roughness=.16;}}});
    for(const name of ['Landscape','WildBorder','Pond']){const obj=this.asset(name);this.scene.add(obj);if(name==='Pond')this.pond=obj;}
    this.materials=new Map();this.library.traverse(o=>{if(o.isMesh&&!this.materials.has(o.material.uuid))this.materials.set(o.material.uuid,{m:o.material,color:o.material.color.clone(),roughness:o.material.roughness});});
    const rainGeo=new THREE.BufferGeometry();const rain=new Float32Array(800*6);for(let i=0;i<800;i++){const x=((i*17.13)%16)-8,z=((i*13.71)%16)-8,y=(i*.317)%8;rain.set([x,y,z,x-.045,y+.25,z+.025],i*6);}rainGeo.setAttribute('position',new THREE.BufferAttribute(rain,3));
    this.rain=new THREE.LineSegments(rainGeo,new THREE.LineBasicMaterial({color:'#d5e9eb',transparent:true,opacity:.18,depthWrite:false}));this.rain.visible=false;this.scene.add(this.rain);
    this.ao.setSize(Math.round(innerWidth*.5),Math.round(innerHeight*.5));this.resetSeason();this.ready=true;
  }
  asset(name){const src=this.library.getObjectByName(name);if(!src)throw new Error(`Missing Blender asset ${name}`);return src.clone(true);}
  resize(){this.camera.aspect=innerWidth/innerHeight;this.camera.zoom=Math.min(1,this.camera.aspect/1.45);this.camera.updateProjectionMatrix();this.renderer.setSize(innerWidth,innerHeight);this.composer?.setSize(innerWidth,innerHeight);this.ao?.setSize(Math.round(innerWidth*.5),Math.round(innerHeight*.5));}
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
    this.renderer.shadowMap.needsUpdate=true;this.ao.dirty=true;
    this.layout=layout;this.planning=planning;this.buildings.clear();this.nature.clear();this.markers.clear();this.buildingMap.clear();
    const occupied=new Set(layout.objects.flatMap(cells).map(p=>key(p.x,p.z))),patches=[[],[],[]],olives=[],shrubs=[];
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)if(!occupied.has(key(x,z))&&!blocked(x,z,layout.level)){
      const cover=Math.sin(x*.91+z*.23)+Math.cos(z*1.17-x*.31),variant=cover>.65?0:cover<-.2?1:2;
      patches[variant].push({x:x-5.5,z:z-5.5,angle:((x*7+z*3)%4)*Math.PI/2});
      if((x*17+z*23)%37===0&&!(x>2&&x<10&&z>2&&z<10))olives.push({x:x-5.5,z:z-5.5,scale:.7+(x%3)*.1});
      if((x*13+z*7)%9===0)shrubs.push({x:x-5.5+.18,z:z-5.5,scale:.85});
    }
    patches.forEach((p,i)=>this.batch(`Meadow${i}`,p,this.nature));this.batch('Olive',olives,this.nature);this.batch('Shrub',shrubs,this.nature);
    if(layout.level==='terrain'){const rocks=[];for(let z=4;z<=7;z++)rocks.push({x:2.5,z:z-5.5,angle:z*1.2});this.batch('Rock',rocks,this.nature);}
    const roads=layout.objects.filter(b=>b.type==='road');for(let i=0;i<3;i++)this.batch(i?'Road'+i:'Road',roads.filter(b=>(b.x+b.z)%3===i).map(b=>({x:b.x-5.5,z:b.z-5.5})),this.buildings);
    if(this.wetRoad){this.scene.remove(this.wetRoad);this.wetRoad.geometry.dispose();this.wetRoad.dispose();}this.wetRoad=wetRoads(this,roads);
    // Tile picking for the instanced road surface uses the ground tile in the UI.
    for(const b of layout.objects.filter(b=>b.type!=='road')){
      const group=new THREE.Group(),c=center(b);group.position.copy(this.world(c));group.rotation.y=-(b.rotation||0)*Math.PI/2;
      group.userData={id:b.id,kind:'building'};group.add(this.asset(b.type[0].toUpperCase()+b.type.slice(1)));
      const record={group};
      if(b.type==='home'){const variant=Number(b.id.slice(1))%3;group.add(this.asset('HomeDetails'+variant));group.traverse(o=>{if(o.isMesh&&o.material.name==='Warm lime plaster'){o.material=o.material.clone();o.material.color.set(['#fffaf0','#f4e9d3','#fff6e0'][variant]);}});}
      if(b.type==='home'){group.scale.y=.93+(Number(b.id.slice(1))%3)*.075;record.stores=this.asset('HomeStores');record.shutters=this.asset('ClosedShutters');record.shutters.visible=false;record.pack=this.asset('DeparturePack');record.pack.position.set(-.45,.22,.87);record.pack.scale.setScalar(1.6);record.pack.visible=false;group.add(record.stores,record.shutters,record.pack);record.glow=new THREE.PointLight('#ff9c30',0,2.4,2);record.glow.position.set(.4,.65,.75);group.add(record.glow);record.warning=this.warningSprite();record.warning.position.set(0,2.35,0);record.warning.visible=false;group.add(record.warning);}
      if(b.type==='well'){record.water=this.asset('WellWater');group.add(record.water);}
      if(b.type==='field'){record.vegetables=Number(b.id.slice(1))%2===1;record.crops=this.asset(record.vegetables?'Vegetables':'Crops');record.cropMats=[];record.crops.traverse(o=>{if(o.isMesh){o.material=o.material.clone();record.cropMats.push({mat:o.material,color:o.material.color.clone()});}});record.crops.position.y=.07;record.crops.scale.y=.20;record.stores=this.asset('FieldStores');record.stores.visible=false;group.add(record.crops,record.stores);}
      if(b.type==='field'){record.soilMats=[];group.traverse(o=>{if(o.isMesh&&['Cultivated earth','Freshly turned soil'].includes(o.material.name)){o.material=o.material.clone();record.soilMats.push({mat:o.material,color:o.material.color.clone()});}});}
      this.buildings.add(group);this.buildingMap.set(b.id,record);
      if(planning){const d=door(b),marker=new THREE.Mesh(new THREE.RingGeometry(.10,.16,3),new THREE.MeshBasicMaterial({color:connected(layout,b)?'#ebdfb3':'#d27348',side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.copy(this.world(d));marker.position.y=.103;this.markers.add(marker);}
    }
    if(planning){this.people.clear();this.personMap.clear();this.state=null;this.grid.visible=!!this.tool;}
  }
  setTool(type){this.tool=type;this.grid.visible=!!type&&this.planning;if(this.ghost){this.scene.remove(this.ghost);this.ghost=null;}}
  preview(b,check){
    if(!this.planning||!b)return;
    if(!this.ghost||this.ghost.userData.type!==b.type){if(this.ghost)this.scene.remove(this.ghost);this.ghost=this.asset(b.type[0].toUpperCase()+b.type.slice(1));this.ghost.userData.type=b.type;this.ghost.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.map=null;o.material.normalMap=null;o.material.transparent=true;o.material.opacity=.48;o.material.depthWrite=false;o.castShadow=false;}});const n=FOOTPRINT[b.type],outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(n,.035,n)),new THREE.LineBasicMaterial({color:'#ecffbc',transparent:true,opacity:.95,depthTest:false}));outline.renderOrder=20;this.ghost.add(outline);this.scene.add(this.ghost);}
    this.ghost.visible=true;this.ghost.position.copy(this.world(center(b)));this.ghost.position.y=.07;this.ghost.rotation.y=-(b.rotation||0)*Math.PI/2;
    this.ghost.traverse(o=>{if(o.isMesh||o.isLineSegments)o.material.color.set(check.ok?(check.access?'#a4e9a0':'#ffe19d'):'#f9866a');});
  }
  person(p){
    const g=new THREE.Group();g.scale.setScalar(1.7);g.userData={id:p.id,kind:'person'};const torso=new THREE.Group();torso.position.y=.27;g.add(torso);const body=this.asset('ResidentBody');body.position.y=-.27;torso.add(body);
    body.traverse(o=>{if(o.isMesh&&['Madder sash','Woven linen'].includes(o.material.name)){const tunic=o.material.name==='Woven linen';o.material=o.material.clone();o.material.color.set((tunic?['#f1e4c7','#90a39b','#e7d4a4','#b3724b','#ccbdaa','#91a4ba']:['#98462f','#546d66','#ac864a'])[Number(p.id.slice(1))%(tunic?6:3)]);}});
    const parts={};for(const name of ['ArmL','ArmR','LegL','LegR']){const o=this.asset(name),arm=name.startsWith('Arm');o.position.set(name.endsWith('L')?-.052:.052,arm?.065:.15,0);(arm?torso:g).add(o);parts[name]=o;}
    for(const name of ['WaterJug','FoodBasket','DeparturePack','Hoe']){const o=this.asset(name);o.position.set(name==='DeparturePack'?0:.08,name==='DeparturePack'?.03:-.09,name==='DeparturePack'?-.09:.13);o.visible=false;torso.add(o);parts[name]=o;}
    this.people.add(g);const r={g,parts,body,torso};if(this.walkClip){r.mixer=new THREE.AnimationMixer(g);r.mixer.clipAction(this.walkClip).play();}this.personMap.set(p.id,r);return r;
  }
  warningSprite(){const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#ac7934';ctx.strokeStyle='#f9db95';ctx.lineWidth=4;ctx.beginPath();ctx.arc(48,48,40,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0ca';ctx.beginPath();ctx.moveTo(48,22);ctx.bezierCurveTo(40,36,31,45,31,56);ctx.bezierCurveTo(31,80,66,80,66,56);ctx.bezierCurveTo(66,45,56,35,48,22);ctx.fill();const m=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,depthWrite:false,transparent:true});m.map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(m);s.scale.set(.40,.40,1);return s;}
  setState(state){
    // At 4×, several simulation updates can land in one display frame. Refresh
    // expensive secondary views at most every 75 ms; people and rain still move
    // every frame. Explicit scrubs and jumps update all visual state immediately.
    const now=performance.now(),jump=this.snapPeople||!this.state||Math.abs(state.tick-this.state.tick)>8;
    if(this.state?.tick!==state.tick&&(jump||now-this.lastEffects>=75)){this.effectsRevision++;this.lastEffects=now;this.renderer.shadowMap.needsUpdate=true;}
    this.previousState=!this.snapPeople&&this.state?.tick===state.tick-1?this.state:null;this.snapPeople=false;this.state=state;this.planning=false;this.grid.visible=false;this.markers.visible=false;if(this.ghost)this.ghost.visible=false;
  }
  showRoute(p){if(this.routeLine){this.scene.remove(this.routeLine);this.routeLine.geometry.dispose();this.routeLine.material.dispose();this.routeLine=null;}if(!p?.path?.length)return;const pts=[{x:p.x,z:p.z},...p.path.slice(p.pathIndex)].map(n=>this.world(n).setY(.15));this.routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#f8d586',transparent:true,opacity:.85}));this.scene.add(this.routeLine);}
  resetSeason(){this.scene.background.set('#8fa9a6');this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=42;this.scene.fog.far=105;this.floor.material.color.copy(this.scene.background);this.sun.color.set('#ffead0');this.sun.intensity=5.2;this.ambient.intensity=.82;this.rain.visible=false;this.pond.position.y=0;this.previousState=null;if(this.wetRoad)this.wetRoad.visible=false;for(const {m,color,roughness}of this.materials.values()){m.color.copy(color);m.roughness=roughness;if(m.name==='Window glow')m.emissiveIntensity=.1;}}
  applyState(){
    const s=this.state;if(!s)return;
    const fraction=this.fraction??1,visualTick=this.previousState?s.tick-1+fraction:s.tick,winterGlow=s.season==='Winter'?THREE.MathUtils.smoothstep(s.day-42,0,1.2):0;
    const seen=new Set();for(const p of s.people){if(p.departed)continue;seen.add(p.id);const r=this.personMap.get(p.id)||this.person(p);r.g.position.copy(this.world(p));r.g.position.y=.10;
      const prev=this.previousState?.people.find(x=>x.id===p.id);if(prev){r.g.position.x=THREE.MathUtils.lerp(prev.x,p.x,fraction)-5.5;r.g.position.z=THREE.MathUtils.lerp(prev.z,p.z,fraction)-5.5;}
      r.g.rotation.y=p.heading||0;const walking=p.path&&p.pathIndex<p.path.length,phase=visualTick*.75;
      if(r.mixer)r.mixer.setTime(walking?visualTick/8:0);else{const stride=walking?Math.sin(phase)*.52:0;r.parts.LegL.rotation.x=stride;r.parts.LegR.rotation.x=-stride;r.parts.ArmL.rotation.x=-stride*.7;r.parts.ArmR.rotation.x=stride*.7;}
      if(p.carry?.type)r.parts.ArmR.rotation.x=-.65;
      r.parts.WaterJug.visible=p.carry?.type==='water'||p.job?.resource==='water';r.parts.WaterJug.traverse(o=>{if(o.isMesh&&o.material.name==='Water')o.visible=p.carry?.type==='water'&&p.carry.amount>0;});r.parts.FoodBasket.visible=p.carry?.type==='food';r.parts.DeparturePack.visible=['depart','arrive'].includes(p.job?.type);
      const working=!walking&&p.job?.type==='tend',harvesting=!walking&&p.job?.type==='harvest',pouring=!walking&&p.job?.resource==='water'&&p.job?.phase==='deliver';
      r.parts.Hoe.visible=working;r.torso.rotation.x=working?.85+Math.sin(visualTick*.12)*.12:harvesting?1.05:pouring?.35:0;
      r.parts.WaterJug.rotation.x=pouring?-.8:0;r.parts.WaterJug.position.y=pouring?.03:-.09;
      if(working){r.parts.ArmR.rotation.x=-.9+Math.sin(visualTick*.12)*.45;r.parts.ArmL.rotation.x=-.6;r.parts.Hoe.rotation.x=r.parts.ArmR.rotation.x;r.parts.Hoe.position.y=.01;}
      if(harvesting){r.parts.ArmR.rotation.x=-1.1+Math.sin(visualTick*.2)*.2;r.parts.ArmL.rotation.x=-1.1-Math.sin(visualTick*.2)*.2;}
      if(pouring)r.parts.ArmR.rotation.x=-1.25;
    }
    for(const [id,r]of this.personMap)if(!seen.has(id))r.g.visible=false;else r.g.visible=true;
    for(const b of s.buildings){const r=this.buildingMap.get(b.id);if(!r)continue;
      if(b.type==='home'){r.stores.visible=b.food>3;r.stores.scale.y=Math.min(1,.35+b.food/30);r.shutters.visible=b.status==='abandoned'||b.status==='vacant';r.glow.intensity=!r.shutters.visible?.70*winterGlow:0;r.pack.visible=['preparing','leaving'].includes(b.status);r.warning.visible=b.arrived&&b.water<1&&!r.shutters.visible;}
      if(b.type==='well')r.water.position.y=-.13+.22*(b.water/60);
      if(b.type==='field'){r.crops.visible=true;r.crops.scale.y=(r.vegetables?1:.72)*THREE.MathUtils.lerp(b.dead?.38:.08+.92*(b.growth||0),.10,winterGlow);r.crops.rotation.z=b.moisture<15?.20:0;r.stores.visible=b.food>1;r.stores.scale.y=.55+.45*Math.min(1,b.food/25);for(const {mat,color}of r.cropMats){mat.color.copy(color);if(b.dead||s.season==='Winter')mat.color.lerp(new THREE.Color('#87643c'),b.dead?.9:.9*winterGlow);else if(b.moisture<20)mat.color.lerp(new THREE.Color('#ac893b'),.55);else if(!r.vegetables&&(mat.name==='Crop stems'||mat.name.startsWith('Foliage')))mat.color.lerp(new THREE.Color('#cba747'),THREE.MathUtils.smoothstep(b.growth,.42,.92)*.85);}}
      if(b.type==='field'){const dryness=1-Math.min(1,b.moisture/50);for(const {mat,color}of r.soilMats){mat.color.copy(color).multiplyScalar(.82+.62*dryness);mat.roughness=.65+.3*dryness;}}
    }
    const winter=s.season==='Winter',summer=s.season==='Summer',autumn=s.season==='Autumn',wet=s.weather==='Rain';
    const wasWet=climate(Math.max(0,s.day-.5),s.layout.level).rain,weatherBlend=THREE.MathUtils.smoothstep(s.day%1,0,.2),wetness=THREE.MathUtils.lerp(wasWet?1:0,wet?1:0,weatherBlend);
    const drought=s.layout.level==='dry'?(s.day<28?THREE.MathUtils.smoothstep(s.day,19,28):1-THREE.MathUtils.smoothstep(s.day,29,33)):0;this.pond.position.y=-drought*.065;
    const index=['Spring','Summer','Autumn','Winter'].indexOf(s.season),blend=THREE.MathUtils.smoothstep(Math.min(s.day,55.999)%14,0,1.2),previous=Math.max(0,index-1);
    const summerAmount=summer?blend:autumn?1-blend:0,autumnAmount=autumn?blend:winter?1-blend:0;
    const backgrounds=['#8fa9a6','#87a2a0','#bba990','#879eac'],lights=['#ffead0','#ffebce','#ffdbac','#bdcddd'];
    this.scene.background.set(backgrounds[previous]).lerp(new THREE.Color(backgrounds[index]),blend);if(drought)this.scene.background.lerp(new THREE.Color('#d9b480'),drought*.8);this.scene.fog.color.copy(this.scene.background);this.floor.material.color.copy(this.scene.background);this.scene.fog.near=winter?29:42;this.scene.fog.far=winter?60:105;
    this.sun.color.set(lights[previous]).lerp(new THREE.Color(lights[index]),blend);this.sun.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(5.2,3.0,wetness),1.15,winterGlow);
    this.ambient.intensity=THREE.MathUtils.lerp(.82,.72,winterGlow);
    if(this.wetRoad){this.wetRoad.visible=wetness>.01;this.wetRoad.material.uniforms.strength.value=wetness*.9;this.wetRoad.material.uniforms.time.value=visualTick*.09;}
    this.rain.visible=wetness>0;this.rain.material.opacity=.18*wetness;if(this.rain.visible){const pos=this.rain.geometry.attributes.position;for(let i=0;i<800;i++){const y=((i*.317-visualTick*.13)%8+8)%8;pos.array[i*6+1]=y;pos.array[i*6+4]=y+.25;}pos.needsUpdate=true;}
    for(const {m,color,roughness}of this.materials.values()){
      const target=color.clone();if(m.name.startsWith('Foliage')||m.name==='Meadow ground'){target.lerp(new THREE.Color('#938b3b'),.25*summerAmount);target.lerp(new THREE.Color('#9a702e'),.38*autumnAmount);target.multiplyScalar(1-.31*winterGlow);}
      if(m.name.includes('terracotta')||m.name.includes('Limestone')||m.name==='Cultivated earth'||m.name==='Meadow ground')target.multiplyScalar(1-.28*wetness);
      if(drought&&(m.name.startsWith('Foliage')||m.name==='Meadow ground'||m.name.startsWith('Petal')))target.lerp(new THREE.Color('#bc995a'),drought*.88);
      m.color.copy(target);if(m.name.includes('limestone')||m.name.includes('Limestone')||m.name.includes('terracotta'))m.roughness=THREE.MathUtils.lerp(roughness,.29,wetness);
      if(m.name==='Window glow')m.emissiveIntensity=.06+1.44*winterGlow;
      if(m.name==='Water'&&m.normalMap)m.normalMap.offset.set(visualTick*.00012,visualTick*.00009);
    }
  }
  render(){const now=performance.now();if(this.ready){this.applyState();this.controls.update();this.lens.uniforms.focus.value=this.camera.position.distanceTo(new THREE.Vector3(0,.4,0));this.lens.uniforms.texel.value.set(1/(innerWidth*this.renderer.getPixelRatio()),1/(innerHeight*this.renderer.getPixelRatio()));this.renderer.info.reset();this.composer.render();}this.frames.push(now-this.lastFrame);if(this.frames.length>300)this.frames.shift();this.lastFrame=now;}
  thumbnails(){const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setSize(152,116);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;const result={};for(const name of ['Road','Home','Field','Well']){const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff6da','#7c694c',3));const sun=new THREE.DirectionalLight('#fff1d2',3);sun.position.set(-3,5,4);sc.add(sun);const object=this.asset(name);sc.add(object);if(name==='Field'){const crops=this.asset('Crops');crops.position.y=.07;sc.add(crops);}const box=new THREE.Box3().setFromObject(object),c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z)*.88;const cam=new THREE.OrthographicCamera(-span*1.31,span*1.31,span,-span,.1,30);cam.position.copy(c).add(new THREE.Vector3(3,2.6,4));cam.lookAt(c);r.render(sc,cam);result[name.toLowerCase()]=r.domElement.toDataURL('image/png');}r.dispose();return result;}
  rotate(delta){const off=this.camera.position.clone().sub(this.controls.target);off.applyAxisAngle(new THREE.Vector3(0,1,0),delta);this.camera.position.copy(this.controls.target).add(off);this.controls.update();}
  resetCamera(){this.camera.position.set(-9.6,11.0,13.5);this.controls.target.set(0,.3,0);this.controls.update();}
  projectTile(x,z){const p=this.world({x,z});p.y=.1;p.project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}
  metrics(){const a=this.frames.slice(-120).sort((a,b)=>a-b);return {medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)],drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}
