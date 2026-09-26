import {Matrix4,NoBlending} from 'three';
import {GTAOPass} from 'three/addons/postprocessing/GTAOPass.js';

// The static town does not need a new depth/occlusion calculation every display
// frame. Recompute when the simulation, layout, projection, or camera changes.
export class TownOcclusion extends GTAOPass {
  constructor(world,width,height){
    super(world.scene,world.camera,width,height,{}, {radius:.60,thickness:.5,samples:16,scale:1,distanceFallOff:1},{samples:12,radius:5});
    this.world=world;this.blendIntensity=1.20;this.dirty=true;this.previousCamera=new Matrix4();this.previousProjection=new Matrix4();this.previousTick=-1;
  }
  setSize(width,height){super.setSize(width,height);this.dirty=true;}
  render(renderer,writeBuffer,readBuffer,...rest){
    const tick=this.world.effectsRevision,camera=this.world.camera;
    if(this.dirty||tick!==this.previousTick||!this.previousCamera.equals(camera.matrixWorld)||!this.previousProjection.equals(camera.projectionMatrix)){
      const distance=camera.position.distanceTo(this.world.controls.target);
      this.updateGtaoMaterial({radius:.20+.40*Math.min(1,Math.max(0,(distance-3)/9))});
      this.dirty=false;this.previousTick=tick;this.previousCamera.copy(camera.matrixWorld);this.previousProjection.copy(camera.projectionMatrix);
      const ghost=this.world.ghost,visible=ghost?.visible,sprites=[];if(ghost)ghost.visible=false;
      this.scene.traverse(o=>{if(o.isSprite&&o.visible){sprites.push(o);o.visible=false;}});
      super.render(renderer,writeBuffer,readBuffer,...rest);if(ghost)ghost.visible=visible;for(const sprite of sprites)sprite.visible=true;
      return;
    }
    this.copyMaterial.uniforms.tDiffuse.value=readBuffer.texture;this.copyMaterial.blending=NoBlending;
    this._renderPass(renderer,this.copyMaterial,this.renderToScreen?null:writeBuffer);
    this.blendMaterial.uniforms.intensity.value=this.blendIntensity;this.blendMaterial.uniforms.tDiffuse.value=this.pdRenderTarget.texture;
    this._renderPass(renderer,this.blendMaterial,this.renderToScreen?null:writeBuffer);
  }
}
