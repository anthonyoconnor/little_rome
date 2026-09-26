import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=d3d11','--disable-gpu-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
  await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>window.__rome?.ready,{timeout:20000});
  assert.equal(await page.locator('#balance').textContent(),'4');assert.ok(await page.locator('#go').isEnabled());
  await page.locator('[data-tool=road]').click();
  const p=await page.evaluate(()=>window.__rome.projectTile(5,6));await page.mouse.click(p.x,p.y);
  assert.equal(await page.locator('#balance').textContent(),'3');await page.locator('#undo').click();assert.equal(await page.locator('#balance').textContent(),'4');
  await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__rome.select('b16'));await page.locator('#moveBuilding').click();
  const destination=await page.evaluate(()=>window.__rome.projectTile(5,8));await page.mouse.click(destination.x,destination.y);
  assert.equal(await page.evaluate(()=>window.__rome.planner.layout.objects.find(b=>b.id==='b16').z),8);assert.equal(await page.locator('#balance').textContent(),'4');await page.locator('#undo').click();
  await page.locator('#sound').click();assert.equal(await page.locator('#sound').getAttribute('aria-label'),'Mute sound');await page.locator('#sound').click();
  await page.locator('#cameraLeft').click();await page.locator('#cameraReset').click();
  await page.waitForFunction(()=>window.__rome.metrics().medianMs>0);await fs.mkdir('artifacts',{recursive:true});
  await page.screenshot({path:process.argv.includes('--capture')?'artifacts/planning.png':'artifacts/smoke.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({ok:true,metrics:await page.evaluate(()=>window.__rome.metrics())}));
}finally{await browser.close();}
