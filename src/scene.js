import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {TownOcclusion} from './ambient-occlusion.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {SIZE,FOOTPRINT,cells,center,door,blocked,key,connected} from './layout.js';
import {climate} from './simulation.js';
import {wetRoads} from './wet-ground.js';
import {miniatureLens} from './miniature-lens.js';
import {pondWater} from './pond-water.js';
import {createResident,poseResident,detailResidents,settleResident} from './residents.js';

export class Diorama {
  constructor(container,onPick,onHover){
    this.container=container;this.onPick=onPick;this.onHover=onHover;
    this.renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,preserveDrawingBuffer:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.35));this.renderer.setSize(innerWidth,innerHeight);
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.10;
    container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','Little Rome interactive landscape');
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c2ccc1');this.scene.fog=new THREE.Fog('#c2ccc1',42,105);
    const pmrem=new THREE.PMREMGenerator(this.renderer),sky=new Sky(),skyScene=new THREE.Scene();sky.scale.setScalar(100);sky.material.uniforms.sunPosition.value.set(10,14,12);sky.material.uniforms.turbidity.value=5;sky.material.uniforms.rayleigh.value=2;skyScene.add(sky);this.scene.environment=pmrem.fromScene(skyScene,.04).texture;this.scene.environmentIntensity=.06;sky.geometry.dispose();sky.material.dispose();pmrem.dispose();
    this.camera=new THREE.PerspectiveCamera(32,innerWidth/innerHeight,.1,140);this.camera.position.set(-9.6,11.0,13.5);
    this.camera.zoom=Math.min(1,this.camera.aspect/1.45);this.camera.updateProjectionMatrix();
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.target.set(0,.3,0);this.controls.enablePan=false;
    this.controls.minDistance=2.2;this.controls.maxDistance=40;this.controls.minPolarAngle=.40;this.controls.maxPolarAngle=1.25;
    this.controls.addEventListener('start',()=>{this.followPerson=null;});
    this.controls.enableDamping=true;this.controls.dampingFactor=.09;this.controls.mouseButtons={LEFT:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:THREE.MOUSE.ROTATE};
    this.ambient=new THREE.HemisphereLight('#c4d9f2','#bba47f',.82);this.scene.add(this.ambient);
    this.sun=new THREE.DirectionalLight('#ffdfb4',5.2);this.sun.position.set(10,14,12);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(2048,2048);Object.assign(this.sun.shadow.camera,{left:-12,right:12,top:12,bottom:-12,near:1,far:45});this.sun.shadow.bias=-.0003;this.sun.shadow.normalBias=.024;this.sun.shadow.radius=3;
    this.scene.add(this.sun);
    this.renderer.shadowMap.autoUpdate=false;this.renderer.shadowMap.needsUpdate=true;this.renderer.info.autoReset=false;
    this.composer=new EffectComposer(this.renderer);this.composer.addPass(new RenderPass(this.scene,this.camera));this.ao=new TownOcclusion(this,innerWidth,innerHeight);this.composer.addPass(this.ao);this.lens=miniatureLens(this.ao.depthTexture,this.camera.near,this.camera.far);this.composer.addPass(this.lens);this.composer.addPass(new OutputPass());this.composer.addPass(new SMAAPass());
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(240,240),new THREE.MeshStandardMaterial({color:'#bdc6b7',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-5.30;floor.receiveShadow=true;this.scene.add(floor);this.floor=floor;
    this.buildings=new THREE.Group();this.scene.add(this.buildings);this.nature=new THREE.Group();this.scene.add(this.nature);
    this.people=new THREE.Group();this.scene.add(this.people);this.personMap=new Map();this.buildingMap=new Map();
    this.grid=new THREE.GridHelper(SIZE,SIZE,0xd5d4a1,0xc6c7a0);this.grid.position.y=.085;this.grid.material.transparent=true;this.grid.material.opacity=.34;this.grid.visible=false;this.scene.add(this.grid);
    this.markers=new THREE.Group();this.scene.add(this.markers);this.personRing=new THREE.Mesh(new THREE.RingGeometry(.16,.20,40),new THREE.MeshBasicMaterial({color:'#ffdd7e',transparent:true,opacity:.9,depthTest:false}));this.personRing.rotation.x=-Math.PI/2;this.personRing.visible=false;this.personRing.renderOrder=15;this.scene.add(this.personRing);
    this.ray=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.ground=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    this.renderer.domElement.addEventListener('pointerdown',e=>{this.down={x:e.clientX,y:e.clientY};});
    this.renderer.domElement.addEventListener('pointerup',e=>{if(!this.down||Math.hypot(e.clientX-this.down.x,e.clientY-this.down.y)>5||e.button!==0)return;const hit=this.hit(e);onPick(hit);});
    this.renderer.domElement.addEventListener('pointermove',e=>{if(!e.buttons)onHover(this.hit(e));});
    this.renderer.domElement.addEventListener('pointerleave',()=>{if(this.ghost)this.ghost.visible=false;this.previewPlants(null);});
    addEventListener('resize',()=>this.resize());
    this.frames=[];this.lastFrame=performance.now();this.elapsed=0;this.state=null;this.planning=true;this.effectsRevision=0;this.lastEffects=0;
  }
  async load(){
    const gltf=await new GLTFLoader().loadAsync('/assets/little-rome.glb');this.library=gltf.scene;const clip=gltf.animations.find(c=>c.name==='Walk')||gltf.animations[0];if(clip)this.walkClip=new THREE.AnimationClip('Walk',clip.duration,clip.tracks.filter(t=>t.name.endsWith('.quaternion')||t.name==='Hips.position'));
    this.library.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material.name.startsWith('Foliage')||o.material.name.startsWith('Olive')||o.material.name.startsWith('Vine')||o.material.name.startsWith('Shrub')||o.material.name.startsWith('Fallen')||o.material.name.startsWith('Petal')||o.material.name.startsWith('Cypress needles'))o.material.side=THREE.DoubleSide;if(o.material.map)o.material.map.anisotropy=8;if(o.material.name==='Water'){o.material.metalness=.20;o.material.roughness=.22;if(o.material.normalScale)o.material.normalScale.set(.20,.20);}}});
    for(const name of ['Landscape','WildBorder','Pond']){const obj=this.asset(name);this.scene.add(obj);if(name==='Pond')this.pond=obj;}this.pondReflection=pondWater(this);
    this.materials=new Map();this.library.traverse(o=>{if(o.isMesh&&!this.materials.has(o.material.uuid))this.materials.set(o.material.uuid,{m:o.material,color:o.material.color.clone(),roughness:o.material.roughness});});
    this.waterNormals=[...this.materials.values()].filter(({m})=>m.name==='Water'&&m.normalMap).map(({m})=>m.normalMap);
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
      positions.forEach((p,i)=>{const mat=new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y||0,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.angle||0),new THREE.Vector3().setScalar(p.scale||1));mat.multiply(o.matrixWorld);mesh.setMatrixAt(i,mat);});mesh.userData.tiles=positions.map(p=>key(Math.round(p.x+5.5),Math.round(p.z+5.5)));parent.add(mesh);});
  }
  setLayout(layout,planning=true){
    this.followPerson=null;
    this.previewPlants(null);this.renderer.shadowMap.needsUpdate=true;this.ao.dirty=true;
    for(const mesh of this.nature.children)mesh.dispose?.();
    this.layout=layout;this.layoutRevision=(this.layoutRevision||0)+1;this.planning=planning;this.buildings.clear();this.nature.clear();if(this.litter)this.scene.remove(this.litter);this.litter=new THREE.Group();this.litter.visible=false;this.scene.add(this.litter);this.markers.clear();this.buildingMap.clear();
    const occupied=new Set(layout.objects.flatMap(cells).map(p=>key(p.x,p.z))),patches=[[],[],[],[]],olives=[],shrubs=[];
    const gardens=new Set([[1,3],[3,1],[3,10],[8,10]].map(([x,z])=>key(x,z)));
    for(const b of layout.objects.filter(b=>b.type==='field'))for(const [dx,dz]of [[-1,-1],[3,-1],[-1,3],[3,3]])gardens.add(key(b.x+dx,b.z+dz));
    for(let x=0;x<SIZE;x++)for(let z=0;z<SIZE;z++)if(!occupied.has(key(x,z))&&!blocked(x,z,layout.level)){
      const cover=Math.sin(x*.91+z*.23)+Math.cos(z*1.17-x*.31),nearGarden=layout.objects.some(b=>b.type!=='road'&&cells(b).some(p=>Math.abs(p.x-x)+Math.abs(p.z-z)===1)),variant=gardens.has(key(x,z))?3:cover>.65||nearGarden&&cover>-.8?0:cover<-.2?1:2;
      patches[variant].push({x:x-5.5,z:z-5.5,angle:x*2.399+z*1.27});
      if((x*17+z*23)%37===0&&!(x>2&&x<10&&z>2&&z<10))olives.push({x:x-5.5,z:z-5.5,scale:.7+(x%3)*.1});
      if((x*13+z*7)%9===0)shrubs.push({x:x-5.5+.18,z:z-5.5,scale:.85});
    }
    patches.forEach((p,i)=>this.batch(`Meadow${i}`,p,this.nature));this.batch('Olive',olives,this.nature);this.batch('Shrub',shrubs,this.nature);
    if(layout.level==='terrain'){const rocks=[];for(let z=4;z<=7;z++)rocks.push({x:2.5,z:z-5.5,angle:z*1.2});this.batch('Rock',rocks,this.nature);}
    const roads=layout.objects.filter(b=>b.type==='road');this.batch('LeafLitter',roads.map(b=>({x:b.x-5.5,z:b.z-5.5,y:.09,angle:b.x%2*Math.PI})),this.litter);for(let i=0;i<3;i++)this.batch(i?'Road'+i:'Road',roads.filter(b=>(b.x+b.z)%3===i).map(b=>({x:b.x-5.5,z:b.z-5.5})),this.buildings);
    if(this.wetRoad){this.scene.remove(this.wetRoad);this.wetRoad.geometry.dispose();this.wetRoad.dispose();}this.wetRoad=wetRoads(this,roads);
    // Tile picking for the instanced road surface uses the ground tile in the UI.
    for(const b of layout.objects.filter(b=>b.type!=='road')){
      const group=new THREE.Group(),c=center(b);group.position.copy(this.world(c));group.rotation.y=-(b.rotation||0)*Math.PI/2;
      group.userData={id:b.id,kind:'building'};group.add(this.asset(b.type[0].toUpperCase()+b.type.slice(1)));
      const record={group};
      if(b.type==='home'){const variant=Number(b.id.slice(1))%3;group.add(this.asset('HomeDetails'+variant));group.traverse(o=>{if(o.isMesh&&o.material.name==='Warm lime plaster'){o.material=o.material.clone();o.material.color.set(['#fffaf0','#f4e9d3','#fff6e0'][variant]);}});}
      if(b.type==='home'){record.receiver=this.asset('WaterJug');record.receiver.position.set(.80,.10,1.18);record.receiver.scale.setScalar(1.8);group.add(record.receiver);record.receiverWater=[];record.receiver.traverse(o=>{if(o.isMesh&&o.material.name==='Water')record.receiverWater.push(o);});}
      if(b.type==='home'){group.scale.y=[1.10,.94,1.06][Number(b.id.slice(1))%3];record.stores=this.asset('HomeStores');record.shutters=this.asset('ClosedShutters');record.shutters.visible=false;record.pack=this.asset('DeparturePack');record.pack.position.set(-.45,.22,.87);record.pack.scale.setScalar(1.6);record.pack.visible=false;group.add(record.stores,record.shutters,record.pack);record.glow=new THREE.PointLight('#ff9c30',0,3.2,2);record.glow.position.set(.4,.65,.75);group.add(record.glow);record.warning=this.warningSprite();record.warning.position.set(0,2.35,0);record.warning.visible=false;group.add(record.warning);}
      if(b.type==='well'){record.water=this.asset('WellWater');group.add(record.water);}
      if(b.type==='field'){record.vegetables=Number(b.id.slice(1))%2===1;record.crops=this.asset(record.vegetables?'Vegetables':'Crops');record.cropMats=[];record.heads=[];record.crops.traverse(o=>{if(o.isMesh){o.material=o.material.clone();record.cropMats.push({mat:o.material,color:o.material.color.clone()});if(o.material.name==='Ripe wheat')record.heads.push(o);}});record.stubble=this.asset('Stubble');record.stubble.position.y=.09;record.stubble.visible=false;group.add(record.stubble);record.crops.position.y=.07;record.crops.scale.y=.20;record.stores=this.asset('FieldStores');record.stores.visible=false;group.add(record.crops,record.stores);}
      if(b.type==='field'){record.soilMats=[];group.traverse(o=>{if(o.isMesh&&['Cultivated earth','Freshly turned soil'].includes(o.material.name)){o.material=o.material.clone();record.soilMats.push({mat:o.material,color:o.material.color.clone()});}});}
      this.buildings.add(group);this.buildingMap.set(b.id,record);
      if(planning){const d=door(b),marker=new THREE.Mesh(new THREE.RingGeometry(.10,.16,3),new THREE.MeshBasicMaterial({color:connected(layout,b)?'#ebdfb3':'#d27348',side:THREE.DoubleSide}));marker.rotation.x=-Math.PI/2;marker.position.copy(this.world(d));marker.position.y=.103;this.markers.add(marker);}
    }
    if(planning){this.people.clear();this.personMap.clear();this.state=null;this.grid.visible=!!this.tool;}
  }
  clearGhost(){if(!this.ghost)return;this.ghost.traverse(o=>{if(o.isMesh||o.isLineSegments)o.material.dispose();if(o.isLineSegments)o.geometry.dispose();});this.scene.remove(this.ghost);this.ghost=null;}
  setTool(type){this.previewPlants(null);this.tool=type;this.grid.visible=!!type&&this.planning;this.clearGhost();}
  previewPlants(b){
    const signature=b?`${b.type}:${b.x}:${b.z}`:null;if(signature===this.previewPlantKey)return;
    for(const {mesh,index,matrix}of this.hiddenPlants||[]){mesh.setMatrixAt(index,matrix);if(mesh.instanceMatrix)mesh.instanceMatrix.needsUpdate=true;}
    this.hiddenPlants=[];this.previewPlantKey=signature;
    if(b){const footprint=new Set(cells(b).map(p=>key(p.x,p.z))),hidden=new THREE.Matrix4().makeScale(0,0,0);
      for(const mesh of this.nature.children)for(const [index,tile]of (mesh.userData.tiles||[]).entries())if(footprint.has(tile)){
        const matrix=new THREE.Matrix4();mesh.getMatrixAt(index,matrix);this.hiddenPlants.push({mesh,index,matrix});mesh.setMatrixAt(index,hidden);if(mesh.instanceMatrix)mesh.instanceMatrix.needsUpdate=true;
      }
    }
    this.renderer.shadowMap.needsUpdate=true;if(this.ao)this.ao.dirty=true;
  }
  preview(b,check){
    if(!this.planning||!b)return;
    this.previewPlants(b);
    if(!this.ghost||this.ghost.userData.type!==b.type){this.clearGhost();this.ghost=this.asset(b.type[0].toUpperCase()+b.type.slice(1));this.ghost.userData.type=b.type;const meshes=[];this.ghost.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshBasicMaterial({transparent:true,opacity:.60,depthWrite:true,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});o.castShadow=false;meshes.push(o);}});for(const mesh of meshes){const edge=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,60),new THREE.LineBasicMaterial({transparent:true,opacity:.55}));edge.renderOrder=20;mesh.add(edge);}const n=FOOTPRINT[b.type],outline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(n,.035,n)),new THREE.LineBasicMaterial({transparent:true,opacity:1,depthTest:false}));outline.renderOrder=21;this.ghost.add(outline);this.scene.add(this.ghost);}
    this.ghost.visible=true;this.ghost.position.copy(this.world(center(b)));this.ghost.position.y=.07;this.ghost.rotation.y=-(b.rotation||0)*Math.PI/2;
    this.ghost.traverse(o=>{if(o.isMesh)o.material.color.set(check.ok?(check.access?'#53b76b':'#d6ab4b'):'#dc624a');if(o.isLineSegments)o.material.color.set(check.ok?(check.access?'#174f2a':'#6b4712'):'#701c17');});
  }
  person(p){return createResident(this,p);}
  warningSprite(){const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');ctx.fillStyle='#ac7934';ctx.strokeStyle='#f9db95';ctx.lineWidth=4;ctx.beginPath();ctx.arc(48,48,40,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#fff0ca';ctx.beginPath();ctx.moveTo(48,22);ctx.bezierCurveTo(40,36,31,45,31,56);ctx.bezierCurveTo(31,80,66,80,66,56);ctx.bezierCurveTo(66,45,56,35,48,22);ctx.fill();const m=new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),depthTest:false,depthWrite:false,transparent:true});m.map.colorSpace=THREE.SRGBColorSpace;const s=new THREE.Sprite(m);s.scale.set(.40,.40,1);return s;}
  setState(state){
    // At 4×, several simulation updates can land in one display frame. Refresh
    // expensive secondary views at most every 75 ms; people and rain still move
    // every frame. Explicit scrubs and jumps update all visual state immediately.
    this.previewPlants(null);const now=performance.now(),jump=this.snapPeople||!this.state||Math.abs(state.tick-this.state.tick)>8;
    if(this.state?.tick!==state.tick&&(jump||now-this.lastEffects>=75)){this.effectsRevision++;this.lastEffects=now;this.renderer.shadowMap.needsUpdate=true;}
    this.previousState=!this.snapPeople&&this.state?.tick===state.tick-1?this.state:null;this.snapPeople=false;this.state=state;this.planning=false;this.grid.visible=false;this.markers.visible=false;if(this.ghost)this.ghost.visible=false;
  }
  showRoute(p){this.selectedPerson=p?.id;this.personRing.visible=!!p;if(p)this.personRing.position.copy(this.world(p)).setY(.12);if(this.routeLine){this.scene.remove(this.routeLine);this.routeLine.geometry.dispose();this.routeLine.material.dispose();this.routeLine=null;}if(!p?.path?.length)return;const pts=[{x:p.x,z:p.z},...p.path.slice(p.pathIndex)].map(n=>this.world(n).setY(.15));this.routeLine=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#f8d586',transparent:true,opacity:.85}));this.scene.add(this.routeLine);}
  resetSeason(){this.scene.background.set('#67888b');this.scene.fog.color.copy(this.scene.background);this.scene.fog.near=42;this.scene.fog.far=105;this.floor.material.color.copy(this.scene.background);this.sun.color.set('#ffdfb4');this.sun.intensity=5.2;this.ambient.intensity=.82;this.rain.visible=false;this.pond.position.y=0;this.pondReflection.position.y=.032;this.pondReflection.material.uniforms.time.value=0;this.previousState=null;if(this.litter)this.litter.visible=false;if(this.wetRoad)this.wetRoad.visible=false;for(const {m,color,roughness}of this.materials.values()){m.color.copy(color);m.roughness=roughness;if(m.name==='Window glow')m.emissiveIntensity=.1;}}
  applyState(){
    const s=this.state;if(!s)return;
    const fraction=this.fraction??1,visualTick=this.previousState?s.tick-1+fraction:s.tick,winterGlow=s.season==='Winter'?THREE.MathUtils.smoothstep(s.day-42,0,1.2):0;
    if(this.posedState!==s||this.posedTick!==visualTick){this.posedState=s;this.posedTick=visualTick;
    const seen=new Set();for(const p of s.people){if(p.departed)continue;seen.add(p.id);const r=this.personMap.get(p.id)||this.person(p);
      poseResident(this,r,p,s,visualTick,this.previousState?.people.find(x=>x.id===p.id),fraction);
      if(p.id===this.selectedPerson)this.personRing.position.copy(r.g.position).setY(.12);
    }
    for(const [id,r]of this.personMap)if(!seen.has(id))r.g.visible=false;else r.g.visible=true;
    // Ease neighbouring silhouettes apart within the path width. This only
    // offsets their presentation; routes, arrivals and finite loads stay fixed.
    const neighbours=s.people.filter(p=>!p.departed).map(p=>({r:this.personMap.get(p.id),mobility:p.pathIndex<p.path.length?1:.15}));
    for(let pass=0;pass<3;pass++)for(let i=0;i<neighbours.length;i++)for(let j=i+1;j<neighbours.length;j++){
      const a=neighbours[i],b=neighbours[j],ap=a.r.g.position,bp=b.r.g.position;let dx=bp.x-ap.x,dz=bp.z-ap.z,d=Math.hypot(dx,dz);
      if(d>=.49)continue;if(d<.001){dx=.001;dz=0;d=.001;}const push=(.49-d)/(a.mobility+b.mobility);
      ap.x-=dx/d*push*a.mobility;ap.z-=dz/d*push*a.mobility;bp.x+=dx/d*push*b.mobility;bp.z+=dz/d*push*b.mobility;
    }
    for(const {r}of neighbours){settleResident(r);if(r.g.userData.id===this.selectedPerson)this.personRing.position.copy(r.g.position).setY(.12);}
    }
    const selected=this.personMap.get(this.selectedPerson);if(selected)this.personRing.position.copy(selected.g.position).setY(.12);
    // Stored snapshots change only on simulation ticks. Buildings and seasonal
    // materials need no work between ticks; articulated people still interpolate.
    if(this.appliedState!==s){this.appliedState=s;
    for(const b of s.buildings){const r=this.buildingMap.get(b.id);if(!r)continue;
      if(b.type==='home'){r.stores.visible=b.food>3;r.stores.scale.y=Math.min(1,.35+b.food/30);r.shutters.visible=b.status==='abandoned'||b.status==='vacant';r.glow.intensity=!r.shutters.visible?1.3*winterGlow:0;r.pack.visible=['preparing','leaving'].includes(b.status);r.warning.visible=b.arrived&&b.water<1&&!r.shutters.visible;}
      if(b.type==='home')for(const water of r.receiverWater)water.visible=b.water>0;
      if(b.type==='well')r.water.position.y=-.13+.22*(b.water/60);
      if(b.type==='field'){for(const head of r.heads)head.visible=b.dead||b.growth>.38;r.crops.visible=winterGlow<1;r.stubble.visible=winterGlow>.5;r.crops.scale.y=(r.vegetables?1:.72)*THREE.MathUtils.lerp(b.dead?.38:.08+.92*(b.growth||0),.10,winterGlow);r.crops.rotation.z=b.moisture<15?.20:0;r.stores.visible=b.food>1;r.stores.scale.y=.55+.45*Math.min(1,b.food/25);for(const {mat,color}of r.cropMats){mat.color.copy(color);if(b.dead||s.season==='Winter')mat.color.lerp(new THREE.Color('#87643c'),b.dead?.9:.9*winterGlow);else if(b.moisture<20)mat.color.lerp(new THREE.Color('#ac893b'),.55);else if(!r.vegetables&&(mat.name==='Crop stems'||mat.name.startsWith('Foliage')))mat.color.lerp(new THREE.Color('#cba747'),THREE.MathUtils.smoothstep(b.growth,.42,.92)*.85);}}
      if(b.type==='field'){const dryness=1-Math.min(1,b.moisture/50);for(const {mat,color}of r.soilMats){mat.color.copy(color).multiplyScalar(.82+.62*dryness);mat.roughness=.65+.3*dryness;}}
    }
    const winter=s.season==='Winter',summer=s.season==='Summer',autumn=s.season==='Autumn',wet=s.weather==='Rain';
    const wasWet=climate(Math.max(0,s.day-.5),s.layout.level).rain,weatherBlend=THREE.MathUtils.smoothstep(s.day%1,0,.2),wetness=THREE.MathUtils.lerp(wasWet?1:0,wet?1:0,weatherBlend);
    const drought=s.layout.level==='dry'?(s.day<28?THREE.MathUtils.smoothstep(s.day,19,28):1-THREE.MathUtils.smoothstep(s.day,29,33)):0;this.pond.position.y=-drought*.12;this.pondReflection.position.y=.032+this.pond.position.y;
    const index=['Spring','Summer','Autumn','Winter'].indexOf(s.season),blend=THREE.MathUtils.smoothstep(Math.min(s.day,55.999)%14,0,1.2),previous=Math.max(0,index-1);
    const summerAmount=summer?blend:autumn?1-blend:0,autumnAmount=autumn?blend:winter?1-blend:0;
    if(this.litter)this.litter.visible=autumnAmount+winterGlow>.01;
    const backgrounds=['#8fa9a6','#5f8187','#bba990','#586b81'],lights=['#ffdfb4','#ffdfb4','#ffdbac','#bdcddd'];
    this.scene.background.set(backgrounds[previous]).lerp(new THREE.Color(backgrounds[index]),blend);if(drought)this.scene.background.lerp(new THREE.Color('#d9b480'),drought*.8);this.scene.fog.color.copy(this.scene.background);this.floor.material.color.copy(this.scene.background);this.scene.fog.near=winter?29:42;this.scene.fog.far=winter?60:105;
    this.sun.color.set(lights[previous]).lerp(new THREE.Color(lights[index]),blend);this.sun.intensity=THREE.MathUtils.lerp(THREE.MathUtils.lerp(5.2,3.0,wetness),1.15,winterGlow);
    this.ambient.intensity=THREE.MathUtils.lerp(.82,.72,winterGlow);
    if(this.wetRoad){this.wetRoad.visible=wetness>.01;this.wetRoad.material.uniforms.strength.value=wetness*.9;}
    this.rain.visible=wetness>0;this.rain.material.opacity=.18*wetness;
    for(const {m,color,roughness}of this.materials.values()){
      const target=color.clone();if(m.name.startsWith('Foliage')||m.name==='Meadow ground'){target.lerp(new THREE.Color('#938b3b'),.25*summerAmount);target.lerp(new THREE.Color('#9a702e'),.38*autumnAmount);target.multiplyScalar(1-.31*winterGlow);}
      if(m.name.includes('terracotta')||m.name.includes('Limestone')||m.name==='Cultivated earth'||m.name==='Meadow ground')target.multiplyScalar(1-.28*wetness);
      if(drought&&(m.name.startsWith('Foliage')||m.name==='Meadow ground'||m.name.startsWith('Petal')))target.lerp(new THREE.Color('#bc995a'),drought*.88);
      if(m.name.startsWith('Vine')){target.lerp(new THREE.Color('#d47d23'),autumnAmount*.9);target.lerp(new THREE.Color('#655035'),winterGlow*.65);if(drought)target.lerp(new THREE.Color('#af8647'),drought*.9);}
      if(m.name.startsWith('Shrub')){const warm=Number(m.name.slice(-1))%3===0;target.lerp(new THREE.Color(warm?'#ba6425':'#97843c'),autumnAmount*(warm?.85:.50));target.lerp(new THREE.Color('#636247'),winterGlow*.50);if(drought)target.lerp(new THREE.Color('#bc995a'),drought*.88);}
      if(m.name.startsWith('Fallen')){m.transparent=true;m.opacity=Math.min(1,autumnAmount+winterGlow);}
      m.color.copy(target);if(m.name.includes('limestone')||m.name.includes('Limestone')||m.name.includes('terracotta'))m.roughness=THREE.MathUtils.lerp(roughness,.29,wetness);
      if(m.name==='Window glow')m.emissiveIntensity=.06+2.4*winterGlow;
    }
    }
    this.pondReflection.material.uniforms.time.value=visualTick*.06;if(this.wetRoad)this.wetRoad.material.uniforms.time.value=visualTick*.09;
    for(const normal of this.waterNormals)normal.offset.set(visualTick*.00012,visualTick*.00009);
    if(this.rain.visible){const pos=this.rain.geometry.attributes.position;for(let i=0;i<800;i++){const y=((i*.317-visualTick*.13)%8+8)%8;pos.array[i*6+1]=y;pos.array[i*6+4]=y+.25;}pos.needsUpdate=true;}
  }
  render(){const now=performance.now();if(this.ready){this.applyState();if(this.followPerson){const r=this.personMap.get(this.followPerson);if(r?.g.visible){const target=r.g.position.clone().add(new THREE.Vector3(0,.42,0)),delta=target.clone().sub(this.controls.target);this.camera.position.add(delta);this.controls.target.copy(target);}else this.followPerson=null;}this.controls.update();detailResidents(this);this.lens.uniforms.focus.value=this.camera.position.distanceTo(this.controls.target);this.lens.uniforms.texel.value.set(1/(innerWidth*this.renderer.getPixelRatio()),1/(innerHeight*this.renderer.getPixelRatio()));this.renderer.info.reset();this.composer.render();}this.frames.push(now-this.lastFrame);if(this.frames.length>300)this.frames.shift();this.lastFrame=now;}
  thumbnails(){const r=new THREE.WebGLRenderer({antialias:true,alpha:true});r.setSize(152,116);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1.25;const result={};for(const name of ['Road','Home','Field','Well']){const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff6da','#7c694c',3));const sun=new THREE.DirectionalLight('#fff1d2',3);sun.position.set(-3,5,4);sc.add(sun);const object=this.asset(name);sc.add(object);if(name==='Field'){const crops=this.asset('Crops');crops.position.y=.07;sc.add(crops);}const box=new THREE.Box3().setFromObject(object),c=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z)*.88;const cam=new THREE.OrthographicCamera(-span*1.31,span*1.31,span,-span,.1,30);cam.position.copy(c).add(new THREE.Vector3(3,2.6,4));cam.lookAt(c);r.render(sc,cam);result[name.toLowerCase()]=r.domElement.toDataURL('image/png');}r.dispose();return result;}
  rotate(delta){const off=this.camera.position.clone().sub(this.controls.target);off.applyAxisAngle(new THREE.Vector3(0,1,0),delta);this.camera.position.copy(this.controls.target).add(off);this.controls.update();}
  focusResident(id){
    const r=this.personMap.get(id);if(!r)return;this.followPerson=id;this.controls.target.copy(r.g.position).add(new THREE.Vector3(0,.42,0));
    this.scene.updateMatrixWorld(true);let best=null;const ray=new THREE.Raycaster();ray.camera=this.camera;
    const otherPeople=[...this.personMap.values()].filter(other=>other!==r&&other.g.visible).map(other=>new THREE.Box3().setFromCenterAndSize(other.g.position.clone().add(new THREE.Vector3(0,.5,0)),new THREE.Vector3(.36,.9,.36)));
    const person=this.state?.people.find(p=>p.id===id),field=r.pose==='harvest'?this.state.buildings.find(b=>b.id===person.job.target):null;
    let preferred=0;if(field&&!this.buildingMap.get(field.id).vegetables){const c=center(field),d=door(field),angle=Math.atan2(d.x-c.x,d.z-c.z)-r.g.rotation.y;preferred=Math.atan2(Math.sin(angle),Math.cos(angle));}
    const head=r.bones.Head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.085,.065).applyQuaternion(r.g.quaternion));
    const targets=[...[-.05,0,.05].map(x=>({point:head.clone().add(new THREE.Vector3(x,.015,0).applyQuaternion(r.g.quaternion)),weight:6})),{point:r.g.position.clone().add(new THREE.Vector3(0,.64,0)),weight:3},{point:r.g.position.clone().add(new THREE.Vector3(0,.22,0)),weight:1}];
    for(const point of Object.values(r.gripTargets))targets.push({point:r.g.localToWorld(point.clone()),weight:5});
    for(const angle of [...(preferred?[preferred,preferred+.2,preferred-.2]:[]),.35,-.6,.95,-1.25,1.65,-1.65,2.25,-2.25,Math.PI])for(const elevation of [1.22,1.7]){const heading=r.g.rotation.y+angle,distance=preferred?2.7:3.45,position=this.controls.target.clone().add(new THREE.Vector3(Math.sin(heading)*distance,elevation,Math.cos(heading)*distance));let blocked=0;
      for(const {point,weight}of targets){const direction=point.clone().sub(position);ray.set(position,direction.clone().normalize());ray.far=direction.length()-.015;const hits=ray.intersectObjects(this.buildings.children,true).filter(h=>{let o=h.object;while(o){if(!o.visible)return false;o=o.parent;}return true;});const crowd=otherPeople.some(box=>{const hit=ray.ray.intersectBox(box,new THREE.Vector3());return hit&&hit.distanceTo(position)<ray.far;});if(hits.length||crowd)blocked+=weight;}
      const score=blocked*10+Math.abs(Math.atan2(Math.sin(angle-preferred),Math.cos(angle-preferred)))+(elevation-1.22)*2;if(!best||score<best.score)best={position,score};
    }
    this.camera.position.copy(best.position);this.controls.update();
  }
  resetCamera(){this.followPerson=null;this.camera.position.set(-9.6,11.0,13.5);this.controls.target.set(0,.3,0);this.controls.update();}
  projectTile(x,z){const p=this.world({x,z});p.y=.1;p.project(this.camera);return {x:(p.x+1)*innerWidth/2,y:(1-p.y)*innerHeight/2};}
  metrics(){const a=this.frames.slice(-120).sort((a,b)=>a-b);return {medianMs:a[Math.floor(a.length/2)],p95Ms:a[Math.floor(a.length*.95)],drawCalls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles};}
}
