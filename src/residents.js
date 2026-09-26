import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/addons/utils/SkeletonUtils.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {center,door} from './layout.js';

const profiles=[
  {head:0,female:true,cloth:'#f7e8cd',sash:'#a44d35',skin:'#cb9875',hair:'#382317'},
  {head:1,female:false,cloth:'#c89d53',sash:'#9b6240',skin:'#bc855e',hair:'#302016'},
  {head:3,female:true,cloth:'#f5e8cf',sash:'#61788a',skin:'#c99470',hair:'#653b22'},
  {head:2,female:false,cloth:'#a0a587',sash:'#706544',skin:'#b98361',hair:'#807e76'},
  {head:0,female:true,cloth:'#ded1ae',sash:'#ad713e',skin:'#a9704d',hair:'#30251e'},
  {head:1,female:false,cloth:'#b7c5bf',sash:'#746047',skin:'#d4a07c',hair:'#6b452d'},
];
const X=new THREE.Vector3(1,0,0),Y=new THREE.Vector3(0,1,0);
const smooth=t=>THREE.MathUtils.smoothstep(t,0,1);

// At town scale, stitch the exported material pieces into one draw per body
// and head. Close inspection retains the original textured material surfaces.
function distantMesh(group,skinned,source){
  const pieces=[],lowPieces=[];group.traverse(o=>{if(o.isMesh)pieces.push(o);});source.traverse(o=>{if(o.isMesh)lowPieces.push(o);});
  const geometries=lowPieces.map(mesh=>{const geometry=mesh.geometry.clone();geometry.clearGroups();const color=mesh.material.color,colors=new Float32Array(geometry.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=color.r;colors[i+1]=color.g;colors[i+2]=color.b;}geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));return geometry;});
  const attributes=Object.keys(geometries[0].attributes).filter(name=>geometries.every(g=>g.attributes[name]));for(const geometry of geometries)for(const name of Object.keys(geometry.attributes))if(!attributes.includes(name))geometry.deleteAttribute(name);
  const geometry=mergeGeometries(geometries,false);for(const g of geometries)g.dispose();
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,side:THREE.DoubleSide}),mesh=skinned?new THREE.SkinnedMesh(geometry,material):new THREE.Mesh(geometry,material);
  if(skinned){mesh.bind(pieces[0].skeleton,pieces[0].bindMatrix);mesh.bindMatrixInverse.copy(pieces[0].bindMatrixInverse);mesh.frustumCulled=false;}
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.visible=false;group.add(mesh);return {mesh,pieces};
}

export function createResident(world,p){
  const index=Number(p.id.slice(1)),profile=profiles[index%profiles.length],g=new THREE.Group();
  g.scale.setScalar(1.7*[1,.98,1.01,.98,.97,1.02][index%6]);g.userData={id:p.id,kind:'person'};
  const rig=cloneSkeleton(world.library.getObjectByName('ResidentRig'));g.add(rig);world.people.add(g);
  rig.getObjectByName('ResidentFemale').visible=profile.female;rig.getObjectByName('ResidentMale').visible=!profile.female;
  for(const sex of ['Male','Female'])rig.getObjectByName('Resident'+sex+'Town').visible=false;
  const bones={};const skeletons=new Set();rig.traverse(o=>{if(o.isBone)bones[o.name]=o;if(o.isSkinnedMesh){skeletons.add(o.skeleton);o.frustumCulled=false;}});for(const s of skeletons)s.pose();
  g.updateMatrixWorld(true);
  const rest={},rootQ=g.getWorldQuaternion(new THREE.Quaternion());
  for(const [name,b]of Object.entries(bones))rest[name]={position:b.position.clone(),quaternion:b.quaternion.clone(),rootQ:rootQ.clone().invert().multiply(b.getWorldQuaternion(new THREE.Quaternion()))};
  const head=world.asset('ResidentHead'+profile.head);g.add(head);head.position.copy(g.worldToLocal(bones.Head.getWorldPosition(new THREE.Vector3())));g.updateMatrixWorld(true);bones.Head.attach(head);
  const headTown=world.asset('ResidentHead'+profile.head+'Town');headTown.visible=false;g.add(headTown);
  const handMarkers={};for(const side of ['L','R']){const marker=new THREE.Object3D();g.add(marker);marker.position.copy(g.worldToLocal(bones['Hand'+side].getWorldPosition(new THREE.Vector3()))).add(new THREE.Vector3(0,-.015,.009));g.updateMatrixWorld(true);bones['Hand'+side].attach(marker);handMarkers[side]=marker;}
  const parts={};for(const name of ['WaterJug','FoodBasket','DeparturePack','Hoe','WaterStream']){parts[name]=world.asset(name);g.add(parts[name]);parts[name].visible=false;}
  const materials=new Map();g.traverse(o=>{if(!o.isMesh)return;const original=o.material;let m=materials.get(original.uuid);if(!m){m=original.clone();materials.set(original.uuid,m);if(m.name==='Resident linen')m.color.set(profile.cloth);if(m.name==='Madder sash')m.color.set(profile.sash);if(m.name==='Resident skin')m.color.set(profile.skin).multiplyScalar(.78);if(m.name.startsWith('Resident hair')){m.color.set(profile.hair);if(m.name.endsWith('highlights'))m.color.lerp(new THREE.Color('#bda38a'),.04);}if(m.name==='Madder sash')m.side=THREE.DoubleSide;}o.material=m;});
  const tracks=world.walkClip.tracks.map(track=>{const parsed=THREE.PropertyBinding.parseTrackName(track.name);return {bone:bones[parsed.nodeName],property:parsed.propertyName,sample:track.createInterpolant()};}).filter(t=>t.bone);
  const water=[];parts.WaterJug.traverse(o=>{if(o.isMesh&&o.material.name==='Water')water.push(o);});
  const food=[];parts.FoodBasket.traverse(o=>{if(o.isMesh&&(o.material.name==='Ripe wheat'||o.material.name==='Resident produce'||o.material.name.startsWith('Foliage')))food.push(o);});
  const eyes=[];head.traverse(o=>{if(o.isMesh&&['Resident eye whites','Resident eyes','Resident iris'].includes(o.material.name)){o.geometry.computeBoundingBox();const c=o.geometry.boundingBox.getCenter(new THREE.Vector3()),vertical=Y.clone().applyQuaternion(o.getWorldQuaternion(new THREE.Quaternion()).invert()),axis=['x','y','z'].sort((a,b)=>Math.abs(vertical[b])-Math.abs(vertical[a]))[0];eyes.push({mesh:o,axis,center:c[axis],position:o.position[axis]});}});
  const bodyName=profile.female?'ResidentFemale':'ResidentMale',lod=[distantMesh(rig.getObjectByName(bodyName),true,rig.getObjectByName(bodyName+'Town')),distantMesh(head,false,headTown)];g.remove(headTown);
  const r={g,rig,bones,rest,parts,tracks,handMarkers,water,food,eyes,lod,index,profile,gripTargets:{},pose:'idle',world};world.personMap.set(p.id,r);return r;
}

export function detailResidents(world){for(const r of world.personMap.values()){const distant=world.camera.position.distanceTo(r.g.position)>8;if(r.distant===distant)continue;r.distant=distant;for(const level of r.lod){level.mesh.visible=distant;for(const piece of level.pieces)piece.visible=!distant;}}}

function bonePoint(r,name){return r.g.worldToLocal(r.bones[name].getWorldPosition(new THREE.Vector3()));}
function setRootOffset(r,name,offset){
  const b=r.bones[name];b.position.copy(r.rest[name].position);b.parent.updateWorldMatrix(true,false);
  const rootPoint=r.g.localToWorld(offset.clone()),rootOrigin=r.g.getWorldPosition(new THREE.Vector3());
  const q=b.parent.getWorldQuaternion(new THREE.Quaternion()).invert();const scale=b.parent.getWorldScale(new THREE.Vector3());b.position.add(rootPoint.sub(rootOrigin).applyQuaternion(q).divide(scale));
}
function rotate(r,name,angle,axis=X){const b=r.bones[name],base=r.rest[name];const localAxis=axis.clone().applyQuaternion(base.rootQ.clone().invert());b.quaternion.copy(base.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(localAxis,angle));}
function aim(r,name,child,target){
  const b=r.bones[name];b.parent.updateWorldMatrix(true,false);const v=b.parent.worldToLocal(r.g.localToWorld(target.clone())).sub(b.position).normalize();
  const axis=r.rest[child].position.clone().normalize().applyQuaternion(r.rest[name].quaternion);
  b.quaternion.copy(new THREE.Quaternion().setFromUnitVectors(axis,v)).multiply(r.rest[name].quaternion);b.updateWorldMatrix(false,true);
}
function reach(r,upper,lower,end,target,bend){
  const a=bonePoint(r,upper),v=target.clone().sub(a),l1=r.rest[lower].position.length(),l2=r.rest[end].position.length();
  const distance=THREE.MathUtils.clamp(v.length(),Math.abs(l1-l2)+.001,l1+l2-.001),u=v.normalize(),along=(distance*distance+l1*l1-l2*l2)/(2*distance),height=Math.sqrt(Math.max(0,l1*l1-along*along));
  bend=bend.clone().addScaledVector(u,-bend.dot(u)).normalize();const joint=a.clone().addScaledVector(u,along).addScaledVector(bend,height);
  aim(r,upper,lower,joint);aim(r,lower,end,a.clone().addScaledVector(u,distance));
}
function rootRotation(r,bone,quaternion){const b=r.bones[bone];b.parent.updateWorldMatrix(true,false);b.quaternion.copy(b.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(r.g.getWorldQuaternion(new THREE.Quaternion())).multiply(quaternion);}
function hand(r,side,target,turn=0){
  const name='Hand'+side,orientation=new THREE.Quaternion().setFromAxisAngle(Y,turn).multiply(r.rest[name].rootQ);
  const offset=r.handMarkers[side].position.clone().applyQuaternion(orientation),wrist=target.clone().sub(offset);
  reach(r,'Arm'+side,'Forearm'+side,name,wrist,new THREE.Vector3(side==='L'?-.3:.3,-1,-.1));rootRotation(r,name,orientation);
  r.gripTargets[side]=target.clone();
}
function gripProp(r,prop,left,right,turn=.8){prop.updateMatrix();hand(r,'L',left.applyMatrix4(prop.matrix),turn);hand(r,'R',right.applyMatrix4(prop.matrix),-turn);}
function plantedFeet(r,crouch=0){for(const [side,sign]of [['L',-1],['R',1]]){reach(r,'Leg'+side,'Shin'+side,'Foot'+side,new THREE.Vector3(sign*(.044+crouch*.08),.028,.01),new THREE.Vector3(0,0,1));rootRotation(r,'Foot'+side,r.rest['Foot'+side].rootQ);}}

export function poseResident(world,r,p,state,visualTick,previous,fraction){
  const walking=p.path&&p.pathIndex<p.path.length,seconds=visualTick/8,walkPeriod=(.20/.60)*r.g.scale.x,phase=seconds*Math.PI*2/walkPeriod+r.index*.73;
  for(const [name,b]of Object.entries(r.bones)){b.position.copy(r.rest[name].position);b.quaternion.copy(r.rest[name].quaternion);}
  if(walking){const t=((seconds/walkPeriod+r.index*.116)%world.walkClip.duration);for(const track of r.tracks){const values=track.sample.evaluate(t);r.bones[track.bone.name][track.property].fromArray(values);}}
  let heading=p.heading||0;if(previous){let delta=heading-(previous.heading||0);delta=Math.atan2(Math.sin(delta),Math.cos(delta));heading=(previous.heading||0)+delta*smooth(fraction);}
  const logicalX=previous?THREE.MathUtils.lerp(previous.x,p.x,fraction):p.x,logicalZ=previous?THREE.MathUtils.lerp(previous.z,p.z,fraction):p.z;
  r.g.position.set(logicalX-5.5,.085,logicalZ-5.5);
  // A little road width prevents neighbours from occupying the same silhouette.
  const lane=(r.index%2?1:-1)*.15;r.g.position.x+=Math.cos(heading)*lane;r.g.position.z-=Math.sin(heading)*lane;
  // The route ends at a site's logical centre. Stop visually beside the well's
  // collection edge, with an eased approach, instead of standing inside its stone.
  for(const b of state.buildings)if(b.type==='well'||b.type==='home'){
    const c=center(b),dist=Math.hypot(logicalX-c.x,logicalZ-c.z),radius=b.type==='well'?1.15:1.25;
    if(dist<radius){const d=door(b),v=new THREE.Vector2(d.x-c.x,d.z-c.z).normalize().multiplyScalar((b.type==='well'?.83:1.24)*smooth(1-dist/radius));r.g.position.x+=v.x;r.g.position.z+=v.y;}
  }
  if(!walking&&(!p.job||p.job.type==='rest')&&p.site===p.home){const home=state.buildings.find(b=>b.id===p.home),c=center(home),d=door(home),out=Math.atan2(d.x-c.x,d.z-c.z),t=smooth((.18-(p.rest||0))/.10);heading+=Math.atan2(Math.sin(out-heading),Math.cos(out-heading))*t;}
  r.g.rotation.y=heading;r.gripTargets={};
  const work=previous&&previous.job?.type===p.job?.type?THREE.MathUtils.lerp(previous.work,p.work,fraction):p.work;
  const tending=!walking&&p.job?.type==='tend',harvesting=!walking&&p.job?.type==='harvest';
  const collecting=!walking&&p.job?.phase==='collect',pouring=!walking&&p.job?.phase==='deliver'&&p.carry.type==='water';
  if(harvesting&&!world.buildingMap.get(p.job.target)?.vegetables){const field=state.buildings.find(b=>b.id===p.job.target),across=-(field.rotation||0)*Math.PI/2+Math.PI/2;r.g.rotation.y=heading+Math.atan2(Math.sin(across-heading),Math.cos(across-heading))*smooth(work/.05);}
  if(pouring){const receiver=world.buildingMap.get(p.job.target)?.receiver;if(receiver){const target=receiver.getWorldPosition(new THREE.Vector3()).sub(r.g.position),toward=Math.atan2(target.x,target.z);r.g.rotation.y=heading+Math.atan2(Math.sin(toward-heading),Math.cos(toward-heading))*smooth(work/.025);}}
  const jug=r.parts.WaterJug,basket=r.parts.FoodBasket,hoe=r.parts.Hoe,pack=r.parts.DeparturePack;
  const stream=r.parts.WaterStream;stream.visible=false;
  jug.visible=p.carry.type==='water'||p.job?.resource==='water';basket.visible=p.carry.type==='food'||p.job?.resource==='food'||harvesting;hoe.visible=tending;pack.visible=['depart','arrive'].includes(p.job?.type);
  for(const water of r.water)water.visible=p.carry.type==='water'&&p.carry.amount>0;
  for(const food of r.food)food.visible=p.carry.type==='food'&&p.carry.amount>0;
  for(const prop of Object.values(r.parts)){prop.rotation.set(0,0,0);prop.scale.setScalar(1);}
  pack.position.set(0,.385,-.065);
  const bob=walking?.003*Math.cos(phase*2):.0015*Math.sin(seconds*2.4+r.index);
  if(!walking){setRootOffset(r,'Hips',new THREE.Vector3(0,bob,0));rotate(r,'Spine',.008*Math.sin(seconds*2.4+r.index));plantedFeet(r);}
  rotate(r,'Neck',.015*Math.sin(seconds*1.1+r.index));rotate(r,'Head',.025*Math.sin(seconds*.65+r.index),Y);
  const blinkTime=(seconds+r.index*.81)%(3.7+r.index*.13),blink=blinkTime<.15?Math.sin(blinkTime/.15*Math.PI):0;for(const eye of r.eyes){const scale=1-.95*blink;eye.mesh.scale[eye.axis]=scale;eye.mesh.position[eye.axis]=eye.position+eye.center*(1-scale);}
  r.pose=walking?'walk':'idle';
  if(tending){
    const beat=work/.20*Math.PI*3;setRootOffset(r,'Hips',new THREE.Vector3(0,-.04,0));rotate(r,'Spine',.68+.08*Math.sin(beat));rotate(r,'Neck',.03);plantedFeet(r,.5);
    hoe.position.set(.075,.26+.011*Math.cos(beat),.22);hoe.rotation.x=-.55+.13*Math.sin(beat);hoe.rotation.z=-.12;gripProp(r,hoe,new THREE.Vector3(0,.12,0),new THREE.Vector3(0,0,0),.30);r.pose='tend';
  }else if(harvesting){
    const progress=work/.30,grain=!world.buildingMap.get(p.job.target)?.vegetables,gather=smooth((progress-.27)/.27),deposit=smooth((progress-.56)/.25),recover=smooth((progress-.86)/.14),lower=deposit*(1-recover);
    setRootOffset(r,'Hips',new THREE.Vector3(0,grain?-.025-.075*lower:-.094,.018));rotate(r,'Spine',(grain?.34:.45)+(grain?.42:.15)*lower);rotate(r,'Neck',(grain?.05:-.14)+.10*lower);plantedFeet(r,grain?.25+.35*lower:.6);
    // Reach into the crop, draw the hands back, then bend to the basket. All
    // phases follow recorded job progress, so a paused or rewound gesture agrees.
    basket.position.set(.17,.005,.16);
    const left=new THREE.Vector3(-.045,grain?.30:.165,.22).lerp(new THREE.Vector3(-.045,grain?.29:.18,.16),gather);
    const right=new THREE.Vector3(.035,grain?.30:.145,.24).lerp(new THREE.Vector3(.025,grain?.29:.16,.16),gather).lerp(new THREE.Vector3(.14,.115,.16),deposit).lerp(new THREE.Vector3(.04,grain?.28:.17,.18),recover);
    hand(r,'L',left,.2);hand(r,'R',right,-.2);r.pose='harvest';
  }else if(jug.visible){
    let height=.215,forward=.14,pitch=0;
    if(collecting){const t=smooth(work/.10);height=.17+.045*t;forward=.17;setRootOffset(r,'Hips',new THREE.Vector3(0,-.024,0));rotate(r,'Spine',.25*(1-t));rotate(r,'Neck',.15);plantedFeet(r,.2);r.pose='collect-water';}
    else if(pouring){const t=Math.sin(Math.min(1,work/.06)*Math.PI);height=.215+.075*t;forward=.14-.085*t;pitch=t*1.35;rotate(r,'Spine',.15*t);rotate(r,'Neck',.09);r.pose='pour';}
    else{rotate(r,'Spine',-.04);r.pose=walking?'carry-water':'hold-water';}
    jug.position.set(0,height+bob,forward);jug.rotation.x=pitch;gripProp(r,jug,new THREE.Vector3(-.077,.107,0),new THREE.Vector3(.077,.107,0));
    if(pouring&&pitch>.22){r.receiver=world.buildingMap.get(p.job.target)?.receiver;stream.visible=!!r.receiver||state.buildings.some(b=>b.id===p.job.target&&b.type==='field');}
    // The upright fill plane would become a vertical blue lid when tipped.
    // During the pour, the stream shows the carried water through an open mouth.
    if(stream.visible)for(const water of r.water)water.visible=false;
  }else if(basket.visible){
    const lift=collecting?smooth(work/.10):1;basket.position.set(0,.21+.04*lift+bob,.14);if(collecting){rotate(r,'Spine',.16*(1-lift));rotate(r,'Neck',.08);}else rotate(r,'Spine',-.03);
    gripProp(r,basket,new THREE.Vector3(-.099,.075,0),new THREE.Vector3(.099,.075,0));r.pose=collecting?'collect-food':walking?'carry-food':'hold-food';
  }else if(!walking){
    // Quiet breathing, a small weight shift, and relaxed elbows; no task is
    // delayed to play a decorative gesture.
    rotate(r,'ArmL',-.04);rotate(r,'ArmR',-.08);rotate(r,'ForearmL',-.10);rotate(r,'ForearmR',-.13);
  }
  if(pack.visible){pack.rotation.z=.015*Math.sin(phase);r.pose=p.job.type;}
  r.g.updateMatrixWorld(true);
}

export function settleResident(r){
  r.g.updateMatrixWorld(true);const stream=r.parts.WaterStream;if(!stream.visible)return;
  const jug=r.parts.WaterJug;jug.updateMatrix();const start=new THREE.Vector3(0,.172,.024).applyMatrix4(jug.matrix),end=r.receiver?r.g.worldToLocal(r.receiver.localToWorld(new THREE.Vector3(0,.163,0))):new THREE.Vector3(0,.012,.32),direction=end.sub(start);
  stream.position.copy(start);stream.scale.y=direction.length();stream.quaternion.setFromUnitVectors(Y,direction.normalize());stream.updateMatrixWorld(true);
}
