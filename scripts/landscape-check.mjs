import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const all=process.argv.includes('--all'),perf=process.argv.includes('--performance');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const frames=n=>page.evaluate(n=>new Promise(resolve=>{let i=0;const f=()=>++i>=n?resolve():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const view=async(position,target)=>{await page.evaluate(({position,target})=>{const s=window.__rome.scene;s.followPerson=null;s.camera.position.fromArray(position);s.controls.target.fromArray(target);s.controls.update();},{position,target});await frames(4);};
const shot=async name=>{await frames(3);await page.screenshot({path:`artifacts/landscape-${name}.png`});};
const water=()=>page.evaluate(()=>{const s=window.__rome.scene,gl=s.renderer.getContext(),pixels=new Uint8Array(180*140*4);gl.readPixels(630,360,180,140,gl.RGBA,gl.UNSIGNED_BYTE,pixels);let hash=2166136261;for(const value of pixels)hash=Math.imul(hash^value,16777619);const u=s.pondReflection.material.uniforms;return {time:u.time.value,rain:u.rain.value,level:u.level.value,pixels:hash>>>0};});
const report={};
try{
 await fs.mkdir('artifacts',{recursive:true});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__rome?.ready,{timeout:30000});
 await page.evaluate(()=>window.__rome.advance(17.35));await view([-2.0,3.7,-1.8],[-4.65,.05,-4.65]);await shot('pond-summer');
 const before=await water();await frames(10);assert.deepEqual(await water(),before,'Pause freezes water pixels and clock');
 const tick=await page.evaluate(()=>window.__rome.getState().tick);await page.evaluate(()=>window.__rome.advance(.1));await frames(4);const moving=await water();assert.notEqual(moving.time,before.time);assert.notEqual(moving.pixels,before.pixels,'Water visibly changes with simulation time');
 await page.evaluate(t=>window.__rome.seek(t),tick);await frames(4);const restored=await water();assert.equal(restored.time,before.time,'Rewind restores the water clock');assert.equal(restored.pixels,before.pixels,'Rewind restores rendered water');report.water={before,moving,restored};
 await view([-2.6,2.7,-4.4],[-4.65,.04,-4.65]);await shot('pond-shore');
 await view([-6.1,5.3,-7.9],[-4.65,.04,-4.65]);await shot('pond-alternate');
 if(all){
  await view([-4.7,2.5,-2.8],[-6.1,.9,-4.9]);await shot('trees');
  await view([-.5,2.5,6.1],[-2.7,.22,4.6]);await shot('groundcover');
  await view([8.8,1.4,9.8],[6.2,-1.35,6.2]);await shot('cliff');
  await view([1.4,2.7,5.7],[.15,.10,2.65]);await shot('paths');
 }
 await page.evaluate(()=>window.__rome.advance(27.7));await view([-2.0,3.7,-1.8],[-4.65,.05,-4.65]);await shot('pond-winter');assert.ok((await water()).rain>.1,'Winter rain reaches the water material');
 await page.evaluate(()=>window.__rome.scene.resetCamera());await shot('town-winter');
 if(perf){report.performance={};for(const speed of ['paused','1','4']){if(speed==='1')await page.locator('#pause').click();if(speed==='4')await page.locator('[data-speed="4"]').click();await page.evaluate(()=>window.__rome.scene.frames=[]);await frames(125);report.performance[speed]=await page.evaluate(()=>window.__rome.metrics());assert.ok(report.performance[speed].medianMs<33,`${speed}: ${JSON.stringify(report.performance[speed])}`);}await page.locator('#pause').click();}
 await page.evaluate(async()=>{const {starterLayout}=await import('/src/layout.js');window.__rome.loadLayout(starterLayout('dry'));window.__rome.start();window.__rome.advance(27.65);});
 await view([-2.0,3.7,-1.8],[-4.65,.05,-4.65]);await shot('pond-drought');assert.ok((await water()).level<-.08,'Drought exposes the pond margins');
 await page.evaluate(()=>window.__rome.revise());await frames(4);const reset=await water();assert.equal(reset.time,0);assert.equal(reset.rain,0);assert.equal(reset.level,.032);report.droughtAndReset=true;
 assert.deepEqual(errors,[]);report.errors=errors;report.ok=true;await fs.writeFile('artifacts/landscape-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}catch(error){console.error(JSON.stringify({errors}));throw error;}finally{await browser.close();}
