import * as THREE from 'three';
import {Reflector} from 'three/addons/objects/Reflector.js';

// Blender supplies the bed, bank and outline. Transparent water reveals the
// shallow bed; reflection strength follows the viewing angle.
export function pondWater(world){
  world.pond.updateMatrixWorld(true);let geometry;
  world.pond.traverse(o=>{if(o.isMesh&&o.material.name==='Water'){
    geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
    geometry.translate(0,-.029,0).rotateX(Math.PI/2);o.visible=false;
  }});
  const shader={...Reflector.ReflectorShader,uniforms:{...Reflector.ReflectorShader.uniforms,time:{value:0},rain:{value:0},level:{value:.032},waterColor:{value:new THREE.Color('#247c83')}},
    vertexShader:Reflector.ReflectorShader.vertexShader.replace('varying vec4 vUv;','varying vec4 vUv; varying vec3 pondPosition;').replace('vUv = textureMatrix','pondPosition=(modelMatrix*vec4(position,1.0)).xyz; vUv = textureMatrix'),
    fragmentShader:Reflector.ReflectorShader.fragmentShader.replace('uniform vec3 color;',`uniform vec3 color; uniform float time; uniform float rain; uniform float level; uniform vec3 waterColor; varying vec3 pondPosition;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    `).replace('vec4 base = texture2DProj( tDiffuse, vUv );',`
      vec2 p=pondPosition.xz-vec2(-4.65);float a=atan(-p.y,p.x);
      float radius=1.38+.09*sin(a*3.0)+.045*sin(a*7.0),r=length(p)/radius;
      float bed=-.29*pow(max(0.0,1.0-r*r),1.2)+.030+.008*cos(a)*min(r,1.0);
      float depth=level-bed;if(depth<.001)discard;
      vec2 waves=vec2(sin(p.x*9.1+p.y*5.3+time*.9)+.45*sin(p.y*17.2-p.x*7.2-time*1.17),cos(p.y*8.7-p.x*4.7+time*.73)+.4*cos(p.x*19.1+p.y*6.2-time*.61));
      float impacts=0.0;vec2 cells=floor(p*3.2);
      if(rain>.01)for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){
        vec2 cell=cells+vec2(float(x),float(y));float seed=hash(cell);
        float age=fract(time*.55+seed*11.0);vec2 centre=(cell+vec2(.18+.64*seed,.18+.64*hash(cell+17.0)))/3.2;
        vec2 delta=p-centre;float d=length(delta),distanceToRing=d-age*.14;
        float width=.003+.003*seed;float broken=.35+.65*pow(.5+.5*sin(atan(delta.y,delta.x)*5.0+seed*37.0),2.0);
        float ring=(exp(-pow(distanceToRing/width,2.0))+.35*exp(-pow((distanceToRing+.024)/width,2.0)))*pow(1.0-age,1.6)*broken;
        impacts+=ring;waves+=rain*delta/max(d,.01)*sin(distanceToRing*380.0)*exp(-abs(distanceToRing)*70.0)*(.45-age*.35);
      }
      vec4 uv=vUv;uv.xy+=waves*.00075*vUv.w;
      vec4 base=texture2DProj(tDiffuse,uv)*.6;
      base+=texture2DProj(tDiffuse,uv+vec4(.0008*vUv.w,0,0,0))*.2;
      base+=texture2DProj(tDiffuse,uv-vec4(.0008*vUv.w,0,0,0))*.2;
      vec3 view=normalize(cameraPosition-pondPosition),normal=normalize(vec3(-waves.x*.045,1.0,-waves.y*.045));
      float fresnel=pow(1.0-max(0.0,dot(view,normal)),4.0),absorption=1.0-exp(-depth*10.0);
      vec3 tint=mix(waterColor*vec3(1.4,1.65,1.14),waterColor*vec3(.24,.48,.62),absorption);
      vec3 surface=mix(tint,base.rgb,.27+fresnel*.52);
      float glint=pow(max(0.0,dot(normal,normalize(view+normalize(vec3(10.0,14.0,12.0))))),180.0);
      float glitter=pow(max(0.0,sin(p.x*49.0+p.y*37.0+time*.9)*sin(p.x*31.0-p.y*53.0-time*.63)),20.0)*smoothstep(.45,.92,sin(p.x*3.4+p.y*2.3));
      surface+=vec3(1.0,.92,.72)*(glint*.18+glitter*.18)*(1.0-rain*.8)+vec3(.20,.29,.32)*impacts*rain*.35;
      float opacity=mix(.04,.91,absorption)+fresnel*.14;
    `).replace('vec4( blendOverlay( base.rgb, color ), 1.0 )','vec4(surface,clamp(opacity,.06,.94))')};
  const mesh=new Reflector(geometry,{textureWidth:768,textureHeight:512,multisample:0,clipBias:0,shader});
  mesh.rotation.x=-Math.PI/2;mesh.position.y=.032;mesh.material.transparent=true;mesh.material.depthWrite=false;
  world.pondClock=mesh.material.uniforms.time;
  for(const group of [world.pondBed,world.pondBank]){
    const cloned=new Map();group.traverse(o=>{if(!o.isMesh)return;let material=cloned.get(o.material.uuid);if(!material){material=o.material.clone();cloned.set(o.material.uuid,material);
      material.onBeforeCompile=s=>{s.uniforms.pondTime=world.pondClock;s.uniforms.pondLevel=mesh.material.uniforms.level;s.uniforms.pondRain=mesh.material.uniforms.rain;
        s.vertexShader=s.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 bankPosition;').replace('#include <begin_vertex>','#include <begin_vertex>\nbankPosition=(modelMatrix*vec4(position,1.0)).xyz;');
        s.fragmentShader=s.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 bankPosition;uniform float pondTime;uniform float pondLevel;uniform float pondRain;').replace('#include <color_fragment>',`#include <color_fragment>
          float submerged=1.0-smoothstep(pondLevel-.012,pondLevel+.05,bankPosition.y);
          diffuseColor.rgb*=1.0-max(submerged*.38,pondRain*.16);
          vec2 q=bankPosition.xz;float lines=abs(sin(q.x*21.0+q.y*16.0+sin(q.y*7.0+pondTime*.35))+sin(q.y*24.0-q.x*11.0-pondTime*.24));
          float caustic=pow(max(0.0,1.0-lines/.19),3.0)*.28;
          diffuseColor.rgb+=diffuseColor.rgb*caustic*submerged*(1.0-pondRain*.9);
        `).replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=mix(roughnessFactor,.45,pondRain*.7);');
      };material.customProgramCacheKey=()=> 'pond-bed-and-bank-v1';
    }o.material=material;if(material.name==='Pond reed blades')material.side=THREE.DoubleSide;});
  }
  const update=mesh.onBeforeRender,previousCamera=new THREE.Matrix4(),previousProjection=new THREE.Matrix4();let previousDay=-1,previousLayout;
  mesh.onBeforeRender=function(renderer,scene,camera){
    if(scene.overrideMaterial||camera!==world.camera)return;
    const day=Math.floor((world.state?.day||0)*4);
    if(day===previousDay&&world.layoutRevision===previousLayout&&previousCamera.equals(camera.matrixWorld)&&previousProjection.equals(camera.projectionMatrix))return;
    previousDay=day;previousLayout=world.layoutRevision;previousCamera.copy(camera.matrixWorld);previousProjection.copy(camera.projectionMatrix);update.call(this,renderer,scene,camera);
  };
  world.scene.add(mesh);return mesh;
}
