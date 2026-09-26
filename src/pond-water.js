import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// The pond has no worker route. Its reflected shore can be cached between camera,
// layout and weather changes; surface ripples still follow the simulation clock.
export function pondWater(world){
  world.pond.updateMatrixWorld(true);let geometry;
  world.pond.traverse(o=>{if(o.isMesh&&o.material.name==='Water'){
    geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
    geometry.translate(0,-.029,0).rotateX(Math.PI/2);
    o.material=o.material.clone();o.material.color.set('#155c74');o.material.roughness=.13;o.material.normalScale.set(.65,.65);
    o.material.onBeforeCompile=shader=>{
      shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 pondPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\npondPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 pondPosition;').replace('#include <color_fragment>',`#include <color_fragment>
        float shore=smoothstep(.2,1.4,length(pondPosition.xz-vec2(-4.65,-4.65)));
        diffuseColor.rgb*=mix(vec3(.30,.55,.62),vec3(.86,1.05,.83),shore);
      `);
    };
  }});
  const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0}},fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('uniform vec3 color;','uniform vec3 color; uniform float time;').replace('vec4 base = texture2DProj( tDiffuse, vUv );',`vec4 uv=vUv;
      uv.xy+=vec2(sin(vUv.y*85.0+time),cos(vUv.x*73.0+time*.8))*.0012*vUv.w;
      vec4 base=texture2DProj(tDiffuse,uv);
    `).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4(base.rgb, .55)')};
  // A positive projection-space bias admitted the water just below the mirror,
  // occluding its own reflected shore. The plane already sits above the surface.
  const mesh=new Reflector(geometry,{textureWidth:512,textureHeight:384,multisample:0,clipBias:0,shader});
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.032;mesh.material.transparent=true;mesh.material.depthWrite=false;
  const update=mesh.onBeforeRender,previousCamera=new THREE.Matrix4(),previousProjection=new THREE.Matrix4();let previousDay=-1,previousLayout;
  mesh.onBeforeRender=function(renderer,scene,camera){
    if(scene.overrideMaterial||camera!==world.camera)return;
    const day=Math.floor((world.state?.day||0)*4);
    if(day===previousDay&&world.layoutRevision===previousLayout&&previousCamera.equals(camera.matrixWorld)&&previousProjection.equals(camera.projectionMatrix))return;
    previousDay=day;previousLayout=world.layoutRevision;previousCamera.copy(camera.matrixWorld);previousProjection.copy(camera.projectionMatrix);update.call(this,renderer,scene,camera);
  };
  world.scene.add(mesh);return mesh;
}
