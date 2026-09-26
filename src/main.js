import './style.css';
import {Planner,LEVELS,COST,FOOTPRINT,balance,warnings,canStart,canPlace,connected,cells,starterLayout} from './layout.js';
import {Diorama} from './scene.js';

const icon=(name)=>`<svg viewBox="0 0 24 24" aria-hidden="true">${{
  road:'<path d="m3 15 9-7 9 7-9 7Z M3 10l9-7 9 7-9 7Z M8 7l10 7 M14 5l-9 8 M15 11l-9 7"/>',
  home:'<path d="m2 10 10-7 10 7 M5 9v12h14V9 M10 21v-8h4v8 M17 6V2h3v6"/>',
  field:'<path d="M5 21V5 M12 21V3 M19 21V5 M2 7l3 3 3-3 M2 12l3 3 3-3 M9 5l3 3 3-3 M9 11l3 3 3-3 M16 7l3 3 3-3 M16 12l3 3 3-3 M2 21h20"/>',
  well:'<path d="m3 7 9-5 9 5Z M6 7v10 M18 7v10 M4 17c0-3 16-3 16 0v4H4Z M12 7v8 M10 12h4"/>',
  undo:'<path d="M9 5 3 10l6 5 M3 10h11a6 6 0 1 1 0 12" transform="translate(0 -2)"/>',
  play:'<path d="m8 4 12 8-12 8Z"/>',pause:'<path d="M8 5v14 M16 5v14" stroke-width="4"/>',
  rewind:'<path d="m11 6-8 6 8 6V6Zm10 0-8 6 8 6V6Z" fill="currentColor" stroke="none"/>',
  left:'<path d="m14 6-6 6 6 6"/>',right:'<path d="m10 6 6 6-6 6"/>',
  reset:'<path d="M4 11a8 8 0 1 1 2 6 M4 4v7h7"/>',sound:'<path d="m3 9 5 0 5-5v16l-5-5H3Z M17 8a7 7 0 0 1 0 8 M20 5a12 12 0 0 1 0 14"/>',help:'<path d="M9 8a3 3 0 1 1 4 3c-1 0-1 2-1 3 M12 18h.01"/><circle cx="12" cy="12" r="10"/>'
}[name]||''}</svg>`;
const $=id=>document.getElementById(id);
let planner=new Planner(),tool=null,rotation=0,moveId=null,selection=null,phase='planning',run=null,speed=1,paused=false,toastTimer;
document.querySelector('#app').innerHTML=`
<div id="world"></div>
<div class="overlay">
  <header class="brand planning"><div class="wreath">❧</div><div><h1>LITTLE ROME</h1><small>A year in a little world</small></div></header>
  <div class="budget paper planning"><div><span>Starting purse</span><strong id="budgetTotal">80</strong></div><div class="divider"></div><div><span>Coins remaining</span><strong class="remaining" id="balance">4</strong></div></div>
  <aside class="brief paper planning" id="brief"><button class="brief-close" id="closeBrief" aria-label="Close level brief">×</button><div class="eyebrow">I · The Alban hills</div><h2 id="levelName">First settlement</h2><p id="outlook"></p><p class="objective">Keep <b>3 homes occupied</b> through winter, with <b>3 days of food and water</b> in every occupied home.</p><select id="level" aria-label="Choose level">${Object.entries(LEVELS).map(([id,l])=>`<option value="${id}">${l.name}</option>`).join('')}</select><div class="brief-actions"><button class="text-button" id="example">Example town</button><button class="text-button" id="resetLayout">Clear layout</button></div><div id="warnings" class="warning-note"></div></aside>
  <button id="openBrief" class="info-button round paper planning hidden" aria-label="Open level brief">i</button>
  <div class="toolbar-wrap planning"><button id="undo" class="round undo paper" aria-label="Undo construction" title="Undo · Ctrl Z">${icon('undo')}</button><nav class="toolbar paper" aria-label="Construction tools">${['road','home','field','well'].map((t,i)=>`<button class="tool" data-tool="${t}" title="${t} · ${i+1}"><span class="tool-art">${icon(t)}</span><span class="label">${t[0].toUpperCase()+t.slice(1)}</span><span class="cost">${COST[t]} ${COST[t]===1?'COIN':'COINS'}</span></button>`).join('')}</nav><button class="go" id="go">Go ${icon('play')}</button></div>
  <div id="toolHint" class="tool-hint paper hidden"></div>
  <div id="toast" class="toast paper hidden" role="status"></div>
  <aside id="inspector" class="inspector paper hidden"></aside>
  <div class="season paper running hidden"><span class="symbol" id="seasonSymbol">❧</span><div><strong id="seasonText">Spring · Day 1</strong><small id="weatherText">Soft light · Year one</small></div></div>
  <button class="revise paper running hidden" id="revise">↶ &nbsp; Return to planning</button>
  <div class="playback paper running hidden"><button id="rewind" aria-label="Rewind three days" title="Rewind three days">${icon('rewind')}</button><button id="pause" aria-label="Pause">${icon('pause')}</button><div class="separator"></div><button class="speed active" data-speed="1">1×</button><button class="speed" data-speed="4">4×</button><div class="separator"></div><div class="timeline"><input id="timeline" type="range" min="0" max="0" step="1" value="0" aria-label="Recorded timeline"><div class="timeline-events" id="eventMarkers"></div><div class="timeline-labels"><span>Spring</span><span>Summer</span><span>Autumn</span><span>Winter</span></div></div></div>
  <div id="eventToast" class="event-toast hidden"></div><aside id="outcome" class="outcome paper hidden"></aside>
  <div class="utility"><button id="cameraLeft" class="round" aria-label="Rotate camera left" title="Rotate left · Q">${icon('left')}</button><button id="cameraReset" class="round" aria-label="Reset camera" title="Reset camera">${icon('reset')}</button><button id="cameraRight" class="round" aria-label="Rotate camera right" title="Rotate right · E">${icon('right')}</button><button id="sound" class="round" aria-label="Enable sound" title="Sound off">${icon('sound')}</button></div>
  <div class="camera-hint"><span>DRAG TO ORBIT &nbsp; · &nbsp; SCROLL TO EXPLORE</span><span id="keysHint">1–4 build &nbsp; · &nbsp; R rotate &nbsp; · &nbsp; Esc inspect</span></div>
</div><div id="loading" class="loading"><h1>LITTLE ROME</h1><p>PREPARING YOUR LITTLE WORLD</p><div class="loading-line"></div></div>`;

const scene=new Diorama($('world'),pick,hover);
function toast(message){$('toast').textContent=message;$('toast').classList.remove('hidden');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.add('hidden'),3500);}
function setTool(t){if(phase!=='planning')return;tool=t;moveId=null;rotation=0;selection=null;scene.setTool(t);$('inspector').classList.add('hidden');document.querySelectorAll('.tool').forEach(b=>b.classList.toggle('selected',b.dataset.tool===t));$('toolHint').classList.toggle('hidden',!t);if(t)$('toolHint').textContent=`${t[0].toUpperCase()+t.slice(1)} · ${COST[t]} coins · click to place · R to turn · Esc to inspect`;}
function updatePlanning(){
  const l=planner.layout,lev=LEVELS[l.level];$('balance').textContent=balance(l);$('budgetTotal').textContent=lev.budget;$('outlook').textContent=lev.outlook;$('levelName').textContent=lev.name;$('level').value=l.level;
  $('warnings').textContent=warnings(l).join(' ');$('go').disabled=!canStart(l);$('undo').disabled=!planner.undoStack.length;
  scene.markers.visible=true;scene.setLayout(l,true);if(tool)scene.setTool(tool);
}
function findBuilding(hit){return planner.layout.objects.find(b=>b.id===hit.id)||planner.layout.objects.find(b=>cells(b).some(p=>p.x===hit.x&&p.z===hit.z));}
function hover(hit){if(!tool||phase!=='planning')return;const b={type:tool,x:hit.x,z:hit.z,rotation};const check=canPlace(planner.layout,b,moveId);scene.preview(b,check);$('toolHint').textContent=`${moveId?'Move':tool[0].toUpperCase()+tool.slice(1)} · ${check.reason} · R to turn`;}
function pick(hit){
  if(phase==='planning'&&tool){const result=moveId?planner.move(moveId,hit.x,hit.z,rotation):planner.place(tool,hit.x,hit.z,rotation);if(!result.ok)return toast(result.reason);if(moveId)setTool(null);updatePlanning();return;}
  if(phase==='planning'){const b=findBuilding(hit);selection=b?{id:b.id,kind:'building'}:null;}else selection=hit.id?{id:hit.id,kind:hit.kind}:null;
  inspect();
}
function inspect(){
  if(!selection){$('inspector').classList.add('hidden');return;}
  const b=planner.layout.objects.find(b=>b.id===selection.id);if(!b){$('inspector').classList.add('hidden');return;}
  const descriptions={home:'Two adults, a pantry, and a place to come back to. Keep water and food within an easy walk.',field:'A mixed crop garden. Water, tending, and timely harvests make the difference through winter.',well:'A finite water source. Residents must collect every jug and carry it along the roads.',road:'Pale limestone paving. Roads join at their edges and lead to the village entrance.'};
  $('inspector').innerHTML=`<button class="inspector-close" aria-label="Close inspector">×</button><div class="eyebrow">${b.free?'Village entrance':'Your settlement'}</div><h2>${b.type[0].toUpperCase()+b.type.slice(1)}</h2><p>${descriptions[b.type]}</p><div class="stat"><span>Access</span><b>${connected(planner.layout,b)?'Connected':'No road access'}</b></div><div class="stat"><span>Construction</span><b>${b.free?'Supplied by level':COST[b.type]+' coins'}</b></div>${b.free?'':`<div class="actions"><button id="moveBuilding">Move · free</button><button id="removeBuilding">Remove · refund ${COST[b.type]}</button></div>`}`;
  $('inspector').classList.remove('hidden');$('inspector').querySelector('.inspector-close').onclick=()=>{selection=null;inspect();};
  if(!b.free){$('moveBuilding').onclick=()=>{setTool(b.type);moveId=b.id;rotation=b.rotation;toast('Choose a new position. R turns the entrance.');};$('removeBuilding').onclick=()=>{planner.remove(b.id);selection=null;updatePlanning();inspect();};}
}

document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(tool===b.dataset.tool?null:b.dataset.tool));
$('undo').onclick=()=>{planner.undo();selection=null;updatePlanning();inspect();};
$('example').onclick=()=>{planner.example();setTool(null);updatePlanning();};$('resetLayout').onclick=()=>{planner.reset();setTool(null);updatePlanning();};
$('level').onchange=e=>{planner=new Planner(starterLayout(e.target.value));setTool(null);updatePlanning();};
$('closeBrief').onclick=()=>{$('brief').classList.add('hidden');$('openBrief').classList.remove('hidden');};$('openBrief').onclick=()=>{$('brief').classList.remove('hidden');$('openBrief').classList.add('hidden');};
$('cameraLeft').onclick=()=>scene.rotate(-Math.PI/6);$('cameraRight').onclick=()=>scene.rotate(Math.PI/6);$('cameraReset').onclick=()=>scene.resetCamera();
$('go').onclick=()=>toast('The autonomous year is the next development milestone.');
$('sound').onclick=()=>toast('Ambient sound is being prepared with the living simulation.');
addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;
  if(e.code==='Escape'){setTool(null);selection=null;inspect();}
  if(e.code==='KeyQ')scene.rotate(-Math.PI/6);if(e.code==='KeyE')scene.rotate(Math.PI/6);
  if(phase==='planning'){if(['1','2','3','4'].includes(e.key))setTool(['road','home','field','well'][+e.key-1]);if(e.code==='KeyR')rotation=(rotation+1)%4;if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();$('undo').click();}}
});

try {await scene.load();updatePlanning();$('loading').remove();window.__rome={ready:true,scene,get planner(){return planner;},get phase(){return phase;},getState:()=>null,projectTile:(x,z)=>scene.projectTile(x,z),selectTool:setTool,metrics:()=>scene.metrics()};}
catch(error){$('loading').innerHTML=`<h1>Little Rome</h1><p>The landscape could not load.</p><p>${error.message}</p>`;console.error(error);}
function frame(){scene.render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
