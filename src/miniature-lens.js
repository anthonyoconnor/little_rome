import {Vector2} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// A restrained macro-lens falloff softens distant foliage and the exposed base.
// Reuse the occlusion depth buffer; the town stays sharp and no scene pass is added.
export function miniatureLens(depth,near,far){
  const pass=new ShaderPass({
    uniforms:{tDiffuse:{value:null},tDepth:{value:depth},near:{value:near},far:{value:far},focus:{value:22},texel:{value:new Vector2(1/innerWidth,1/innerHeight)}},
    vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:`uniform sampler2D tDiffuse;uniform sampler2D tDepth;uniform float near;uniform float far;uniform float focus;uniform vec2 texel;varying vec2 vUv;
    void main(){float d=texture2D(tDepth,vUv).x;float z=near*far/(far-(far-near)*d);float blur=smoothstep(3.5,11.0,abs(z-focus))*.65;
      vec4 c=texture2D(tDiffuse,vUv)*.40;
      c+=texture2D(tDiffuse,vUv+texel*vec2(1,0)*blur)*.15;c+=texture2D(tDiffuse,vUv-texel*vec2(1,0)*blur)*.15;
      c+=texture2D(tDiffuse,vUv+texel*vec2(0,1)*blur)*.15;c+=texture2D(tDiffuse,vUv-texel*vec2(0,1)*blur)*.15;
      float vignette=1.0-.075*smoothstep(.34,.78,length((vUv-.5)*vec2(1.05,1.0)));gl_FragColor=vec4(c.rgb*vignette,c.a);
    }`
  });
  pass.uniforms.tDepth.value=depth;
  return pass;
}
