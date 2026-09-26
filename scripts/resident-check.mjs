import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const captureOnly=process.argv.includes('--capture-only');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-gpu-sandbox']});
const context=await browser.newContext({viewport:{width:1440,height:900},...(captureOnly?{}:{recordVideo:{dir:'artifacts/resident-video',size:{width:1440,height:900}}})});
const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const frames=n=>page.evaluate(n=>new Promise(resolve=>{let i=0;const f=()=>++i>=n?resolve():requestAnimationFrame(f);requestAnimationFrame(f);}),n);
const snapshot=()=>page.evaluate(()=>{const w=window.__rome;return [...w.scene.personMap].map(([id,r])=>({id,pose:r.pose,root:r.g.matrixWorld.toArray(),bones:Object.fromEntries(Object.entries(r.bones).map(([n,b])=>[n,b.matrixWorld.toArray()])),eyes:r.eyes.map(e=>[e.mesh.position.toArray(),e.mesh.scale.toArray()]),props:Object.fromEntries(Object.entries(r.parts).map(([name,o])=>[name,[o.visible,o.matrixWorld.toArray()]])),water:r.water.map(o=>o.visible),food:r.food.map(o=>o.visible)}));});
try{
 await fs.mkdir('artifacts',{recursive:true});await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__rome?.ready,{timeout:30000});
 const scenarios=await page.evaluate(()=>{const w=window.__rome;w.advance(30);const finds={};for(const s of w.run.history)for(const p of s.people){const walking=p.pathIndex<p.path.length;
  if(!finds['carry-water']&&walking&&p.carry.type==='water'&&p.z>4.8&&p.work===0&&s.buildings.filter(b=>b.type==='well').every(b=>Math.hypot(p.x-b.x,p.z-b.z)>1.3))finds['carry-water']={tick:s.tick,id:p.id};
  if(!finds['carry-food']&&walking&&p.carry.type==='food')finds['carry-food']={tick:s.tick,id:p.id};
  if(!finds.tend&&!walking&&p.job?.type==='tend'&&p.work>.06)finds.tend={tick:s.tick,id:p.id};
  if(!finds.harvest&&!walking&&p.job?.type==='harvest'&&p.work>.12)finds.harvest={tick:s.tick,id:p.id};
  if(!finds.collect&&!walking&&p.job?.phase==='collect'&&p.job.resource==='water'&&p.work>.04)finds.collect={tick:s.tick,id:p.id};
  if(!finds.pour&&!walking&&p.job?.phase==='deliver'&&p.carry.type==='water'&&p.work>.02)finds.pour={tick:s.tick,id:p.id};
  if(!finds['water-crops']&&!walking&&p.job?.phase==='deliver'&&p.carry.type==='water'&&p.work>.02&&s.buildings.some(b=>b.id===p.job.target&&b.type==='field'))finds['water-crops']={tick:s.tick,id:p.id};
  if(!finds.rest&&!walking&&!p.job&&p.rest>.06)finds.rest={tick:s.tick,id:p.id};
 }return finds;});
 assert.equal(Object.keys(scenarios).length,8,JSON.stringify(scenarios));
 const report={scenarios,poses:{},tracks:await page.evaluate(()=>window.__rome.scene.walkClip.tracks.map(t=>t.name))};
 for(const [name,where]of Object.entries(scenarios)){
  await page.evaluate(({tick,id})=>{window.__rome.seek(tick);window.__rome.select(id,'person');},where);await frames(2);
  await page.locator('#lookCloser').click();await frames(3);
  report.poses[name]=await page.evaluate(id=>{const r=window.__rome.scene.personMap.get(id);return {pose:r.pose,grips:Object.fromEntries(Object.entries(r.gripTargets).map(([side,target])=>[side,r.g.worldToLocal(r.handMarkers[side].getWorldPosition(target.clone())).distanceTo(target)])),skinMeshes:(()=>{let n=0;r.rig.traverse(o=>{if(o.isSkinnedMesh)n++;});return n;})()};},where.id);
  assert.ok(await page.evaluate(()=>{const w=window.__rome;return w.getState().people.filter(p=>!p.departed).every(p=>{const r=w.scene.personMap.get(p.id),water=p.carry.type==='water'&&p.carry.amount>0;return r.water.every(o=>o.visible===(water&&!r.parts.WaterStream.visible))&&(!r.parts.WaterStream.visible||water)&&r.food.every(o=>o.visible===(p.carry.type==='food'&&p.carry.amount>0));});}),'Visible contents and pouring water match the actual carried resource');
  if(name==='pour')report.pouring=await page.evaluate(id=>{const r=window.__rome.scene.personMap.get(id),v=r.g.position.clone();const end=r.parts.WaterStream.localToWorld(v.set(0,1,0)),target=r.receiver.localToWorld(v.clone().set(0,.163,0));return {visible:r.parts.WaterStream.visible,receiverError:end.distanceTo(target)};},where.id);
  if(name==='water-crops')assert.ok(await page.evaluate(id=>{const r=window.__rome.scene.personMap.get(id),end=r.g.worldToLocal(r.parts.WaterStream.localToWorld(r.g.position.clone().set(0,1,0)));return r.parts.WaterStream.visible&&Math.abs(end.y-.012)<.001;},where.id),'Crop watering reaches the soil');
  await page.screenshot({path:`artifacts/residents-${name}.png`});
 }
 if(!captureOnly){
  assert.ok(report.tracks.length>=16,'The Blender walk includes articulated legs, ankles, arms and torso');
  for(const name of ['carry-water','carry-food','tend','collect','pour','water-crops','harvest'])for(const error of Object.values(report.poses[name].grips))assert.ok(error<.005,`${name}: a hand missed its target by ${error.toFixed(3)} model units`);
  assert.ok(report.pouring.visible&&report.pouring.receiverError<.001,'Pouring water lands inside the home receiving jar');
  const shot=scenarios['carry-water'];await page.evaluate(({tick,id})=>{window.__rome.seek(tick);window.__rome.select(id,'person');},shot);await frames(3);
  const frozen=await snapshot();await frames(12);assert.deepEqual(await snapshot(),frozen,'Pause freezes pose, limbs and visible loads');
  await page.evaluate(t=>window.__rome.seek(t+35),shot.tick);await frames(3);assert.notDeepEqual(await snapshot(),frozen,'Residents change their pose over recorded time');
  await page.evaluate(t=>window.__rome.seek(t),shot.tick);await frames(3);assert.deepEqual(await snapshot(),frozen,'Rewind restores exact joints and carried-resource visibility');
  await page.locator('#lookCloser').click();await page.locator('#pause').click();
  report.gait=await page.evaluate(id=>new Promise(resolve=>{const samples=[];let count=0;const f=()=>{const w=window.__rome,r=w.scene.personMap.get(id),p=w.getState().people.find(p=>p.id===id);if(p.pathIndex<p.path.length){const feet=['L','R'].map(side=>r.g.worldToLocal(r.bones['Foot'+side].getWorldPosition(r.g.position.clone())).toArray());samples.push({tick:w.getState().tick,feet,root:r.g.position.toArray()});}if(++count>=75)resolve(samples);else requestAnimationFrame(f);};requestAnimationFrame(f);}),shot.id);
  await page.locator('#pause').click();
  assert.ok(report.gait.length>=12,'Capture a moving walk cycle');
  const contacts=report.gait.map(s=>Math.min(...s.feet.map(p=>p[1])));report.maxContactError=Math.max(...contacts.map(y=>Math.abs(y-.028)));
  assert.ok(report.maxContactError<.006,`A stance foot floats or sinks: ${report.maxContactError}`);
  assert.ok(Math.max(...report.gait.flatMap(s=>s.feet.map(p=>p[1])))>.05,'Swing feet lift clear of the road');
  report.harvestHands=[];
  for(const name of ['carry-food','tend','collect','harvest'])for(const step of [0,1,2,3]){const where=scenarios[name];await page.evaluate(({tick,id})=>{window.__rome.seek(tick);window.__rome.select(id,'person');},{tick:where.tick+step*(name==='harvest'?3:1),id:where.id});await frames(2);if(step===0)await page.locator('#lookCloser').click();await frames(2);await page.screenshot({path:`artifacts/residents-${name}-motion-${step}.png`});if(name==='harvest')report.harvestHands.push(await page.evaluate(id=>{const r=window.__rome.scene.personMap.get(id);return r.g.worldToLocal(r.handMarkers.R.getWorldPosition(r.g.position.clone())).toArray();},where.id));}
  assert.ok(Math.hypot(...report.harvestHands[0].map((value,i)=>value-report.harvestHands[3][i]))>.1,'Harvest moves the hand from the crop toward the basket');
  await page.evaluate(()=>window.__rome.scene.resetCamera());await frames(3);await page.screenshot({path:'artifacts/residents-town.png'});
  assert.deepEqual(errors,[]);report.pause=true;report.rewind=true;report.motion=true;
 }
 report.errors=errors;await fs.writeFile('artifacts/resident-report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({...report,gait:report.gait?{samples:report.gait.length,maxContactError:report.maxContactError}:undefined}));
}catch(error){console.error(JSON.stringify({errors}));throw error;}finally{const video=page.video();await context.close();if(video)await video.saveAs('artifacts/residents-in-motion.webm');await browser.close();}
