import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All visible puddle geometry comes from the Blender library. One reflection
// serves the whole road network and updates only for camera or simulation changes.
export function wetRoads(world,roads){
  const source=world.asset('WetRoad'),pieces=[];source.updateMatrixWorld(true);
  source.traverse(o=>{if(o.isMesh)for(const road of roads){
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo.scale(.68+(road.x*7+road.z*3)%4*.1,1,.74+(road.x+road.z*7)%3*.12);geo.rotateY((road.x*7+road.z*3)%4*Math.PI/2);geo.translate(road.x-5.5,0,road.z-5.5);pieces.push(geo);
  }});
  if(!pieces.length)return null;
  const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());geometry.rotateX(Math.PI/2);
  const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,strength:{value:0}},fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('uniform vec3 color;','uniform vec3 color; uniform float strength;').replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( blendOverlay( base.rgb, color ), strength )')};
  const mesh=new Reflector(geometry,{textureWidth:768,textureHeight:512,multisample:0,clipBias:.002,color:new THREE.Color(.65,.70,.75),shader});
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.081;mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.visible=false;
  const update=mesh.onBeforeRender,previousCamera=new THREE.Matrix4();let previousTick=-1;
  mesh.onBeforeRender=function(renderer,scene,camera){
    if(scene.overrideMaterial||camera!==world.camera)return;
    if(previousTick===world.state?.tick&&previousCamera.equals(camera.matrixWorld))return;
    previousTick=world.state?.tick;previousCamera.copy(camera.matrixWorld);update.call(this,renderer,scene,camera);
  };
  world.scene.add(mesh);return mesh;
}
