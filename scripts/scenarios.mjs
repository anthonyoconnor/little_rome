import {chromium}from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__rome?.ready,{timeout:20000});await fs.mkdir('artifacts',{recursive:true});
  await page.locator('#go').click();await page.waitForFunction(()=>window.__rome.getState().tick>1);await page.locator('#pause').click();
  const t=await page.evaluate(()=>window.__rome.getState().tick);await page.evaluate(()=>window.__rome.run.update(5,4,true));assert.equal(await page.evaluate(()=>window.__rome.getState().tick),t);
  assert.equal(await page.locator('.toolbar').isVisible(),false);
  await page.locator('[data-speed="4"]').click();assert.ok(await page.locator('[data-speed="4"]').evaluate(e=>e.classList.contains('active')));
  const starting=await page.evaluate(()=>JSON.stringify(window.__rome.run.initialLayout));
  await page.evaluate(()=>window.__rome.advance(3));await page.screenshot({path:'artifacts/spring.png'});
  const p=await page.evaluate(()=>window.__rome.getState().people.find(p=>p.carry.amount>0)?.id||'p0');await page.evaluate(id=>window.__rome.select(id,'person'),p);assert.ok((await page.locator('#inspector').innerText()).length>30);await page.locator('.inspector-close').click();
  await page.evaluate(()=>window.__rome.advance(16));await page.screenshot({path:'artifacts/summer.png'});
  await page.evaluate(()=>window.__rome.advance(16));await page.screenshot({path:'artifacts/autumn.png'});
  await page.evaluate(()=>window.__rome.advance(10));await page.screenshot({path:'artifacts/winter.png'});
  await page.evaluate(()=>window.__rome.advance(20));assert.equal(await page.evaluate(()=>window.__rome.getState().result.kind),'success');await page.screenshot({path:'artifacts/result.png'});
  const final=await page.evaluate(()=>JSON.stringify(window.__rome.getState()));
  await page.locator('#timeline').focus();await page.keyboard.press('Home');assert.equal(await page.evaluate(()=>window.__rome.getState().tick),0);
  await page.keyboard.press('End');assert.equal(await page.evaluate(()=>JSON.stringify(window.__rome.getState())),final);
  await page.locator('#rewind').click();assert.equal(await page.locator('#outcome').isVisible(),false);assert.ok(await page.evaluate(()=>window.__rome.run.cursor<window.__rome.run.latest));
  await page.evaluate(()=>window.__rome.advance(3));assert.equal(await page.evaluate(()=>JSON.stringify(window.__rome.getState())),final);
  await page.locator('#reviseResult').click();assert.equal(await page.locator('#balance').textContent(),'4');assert.equal(await page.evaluate(()=>JSON.stringify(window.__rome.planner.layout)),starting);
  await page.locator('#go').click();await page.locator('#pause').click();await page.evaluate(()=>window.__rome.advance(56));assert.equal(await page.evaluate(()=>JSON.stringify(window.__rome.getState())),final);
  // A no-well failure: capture the grace period and verify departure is reversible in history.
  await page.evaluate(()=>{window.__rome.revise();const l=structuredClone(window.__rome.planner.layout);l.objects=l.objects.filter(b=>b.type!=='well');window.__rome.loadLayout(l);window.__rome.start();window.__rome.advance(4.5);});await page.screenshot({path:'artifacts/drought.png'});
  await page.evaluate(()=>window.__rome.advance(15));assert.equal(await page.evaluate(()=>window.__rome.getState().result.kind),'collapse');await page.locator('#rewind').click();assert.ok(await page.evaluate(()=>window.__rome.getState().people.some(p=>!p.departed)));
  await page.evaluate(()=>window.__rome.revise());
  for(const level of ['dry','terrain','budget']){
    await page.locator('#level').selectOption(level);await page.locator('#go').click();await page.evaluate(()=>window.__rome.advance(56));
    assert.equal(await page.evaluate(()=>window.__rome.getState().result.kind),'success',level);await page.locator('#reviseResult').click();
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,fullYear:true,retry:true,rewind:true,collapse:true,metrics:await page.evaluate(()=>window.__rome.metrics())}));
}finally{await browser.close();}
