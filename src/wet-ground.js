import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// All visible puddle geometry comes from the Blender library. One reflection
// serves the whole road network and updates only for camera or simulation changes.
export function wetRoads(world,roads){
  const source=world.asset('WetRoad'),pieces=[];source.updateMatrixWorld(true);
  source.traverse(o=>{if(o.isMesh)for(const road of roads){
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld);
    geo.translate(road.x-5.5,0,road.z-5.5);pieces.push(geo);
  }});
  if(!pieces.length)return null;
  const geometry=mergeGeometries(pieces);pieces.forEach(g=>g.dispose());geometry.rotateX(Math.PI/2);
  const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,strength:{value:0},time:{value:0}},vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 wetPosition;').replace('vUv = textureMatrix','wetPosition = (modelMatrix * vec4(position, 1.0)).xyz; vUv = textureMatrix'),fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('uniform vec3 color;',`uniform vec3 color; uniform float strength; uniform float time; varying vec3 wetPosition;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
    `).replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 reflectedUv=vUv;
      reflectedUv.xy+=vec2(sin(wetPosition.x*33.0+time),cos(wetPosition.z*27.0+time))*.00045*vUv.w;
      vec4 base=texture2DProj(tDiffuse,reflectedUv)*.5;
      base+=texture2DProj(tDiffuse,reflectedUv+vec4(.0016*vUv.w,0,0,0))*.25;
      base+=texture2DProj(tDiffuse,reflectedUv-vec4(.0016*vUv.w,0,0,0))*.25;
      float damp=noise(wetPosition.xz*1.15)*.7+noise(wetPosition.xz*3.4)*.3;
      float film=.06+.89*smoothstep(.46,.65,damp);
    `).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4( base.rgb, strength * film )')};
  // The film is above the slabs. Exact clipping excludes those slabs from their
  // own reflection rather than reflecting an opaque copy of the road surface.
  const mesh=new Reflector(geometry,{textureWidth:768,textureHeight:512,multisample:0,clipBias:0,color:new THREE.Color(.65,.70,.75),shader});
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.081;mesh.material.transparent=true;mesh.material.depthWrite=false;mesh.visible=false;
  const update=mesh.onBeforeRender,previousCamera=new THREE.Matrix4(),previousProjection=new THREE.Matrix4();let previousTick=-1;
  mesh.onBeforeRender=function(renderer,scene,camera){
    if(scene.overrideMaterial||camera!==world.camera)return;
    if(previousTick===world.effectsRevision&&previousCamera.equals(camera.matrixWorld)&&previousProjection.equals(camera.projectionMatrix))return;
    previousTick=world.effectsRevision;previousCamera.copy(camera.matrixWorld);previousProjection.copy(camera.projectionMatrix);update.call(this,renderer,scene,camera);
  };
  world.scene.add(mesh);return mesh;
}
