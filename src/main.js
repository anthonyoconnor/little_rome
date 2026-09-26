import './style.css';
import {Planner,LEVELS,COST,FOOTPRINT,balance,warnings,canStart,canPlace,connected,cells,starterLayout} from './layout.js';
import {Diorama} from './scene.js';
import {Playback,TICKS_PER_DAY,YEAR_TICKS,jobDescription,homeProblem,CAPS} from './simulation.js';

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
let planner=new Planner(),tool=null,rotation=0,moveId=null,selection=null,phase='planning',run=null,speed=1,paused=false,toastTimer,lastUiTick=-1,sound=null,lastHover=null;
const laurel=`<svg viewBox="0 0 48 52" aria-hidden="true"><path d="M22 47C5 37 5 16 17 5M26 47C43 37 43 16 31 5"/>${[[12,12,-35],[8,20,-50],[8,29,-65],[12,37,-75],[18,43,-85]].map(([x,y,a])=>`<ellipse cx="${x}" cy="${y}" rx="2.5" ry="5.3" transform="rotate(${a} ${x} ${y})"/><ellipse cx="${48-x}" cy="${y}" rx="2.5" ry="5.3" transform="rotate(${-a} ${48-x} ${y})"/>`).join('')}</svg>`;
document.querySelector('#app').innerHTML=`
<div id="world"></div>
<div class="overlay">
  <header class="brand planning"><div class="wreath">${laurel}</div><div><h1>LITTLE ROME</h1><small>A year in a little world</small></div></header>
  <div class="budget paper planning"><div><span>Starting purse</span><strong id="budgetTotal">80</strong></div><div class="divider"></div><div><span>Coins remaining</span><strong class="remaining" id="balance">4</strong></div></div>
  <aside class="brief paper planning" id="brief"><button class="brief-close" id="closeBrief" aria-label="Close level brief">×</button><div class="eyebrow">I · The Alban hills</div><h2 id="levelName">First settlement</h2><p id="outlook"></p><p class="objective">Keep <b>3 homes occupied</b> through winter, with <b>3 days of food and water</b> in every occupied home.</p><select id="level" aria-label="Choose level">${Object.entries(LEVELS).map(([id,l])=>`<option value="${id}">${l.name}</option>`).join('')}</select><div class="brief-actions"><button class="text-button" id="example">Example town</button><button class="text-button" id="resetLayout">Clear layout</button></div><div id="warnings" class="warning-note"></div></aside>
  <button id="openBrief" class="info-button round paper planning hidden" aria-label="Open level brief">i</button>
  <div class="toolbar-wrap planning"><button id="undo" class="round undo paper" aria-label="Undo construction" title="Undo · Ctrl Z">${icon('undo')}</button><nav class="toolbar paper" aria-label="Construction tools">${['road','home','field','well'].map((t,i)=>`<button class="tool" data-tool="${t}" title="${t} · ${i+1}"><span class="tool-art">${icon(t)}</span><span class="label">${t[0].toUpperCase()+t.slice(1)}</span><span class="cost">${COST[t]} ${COST[t]===1?'COIN':'COINS'}</span></button>`).join('')}</nav><button class="go" id="go">Go ${icon('play')}</button></div>
  <div id="toolHint" class="tool-hint paper hidden"></div>
  <div id="toast" class="toast paper hidden" role="status"></div>
  <aside id="inspector" class="inspector paper hidden"></aside>
  <div class="season paper running hidden"><span class="symbol" id="seasonSymbol">❧</span><div><strong id="seasonText">Spring · Day 1</strong><small id="weatherText">Soft light · Year one</small></div></div>
  <button class="revise paper running hidden" id="revise">↶ &nbsp; Return to planning</button>
  <div class="playback paper running hidden"><button id="rewind" aria-label="Rewind three days" title="Rewind three days">${icon('rewind')}</button><button id="pause" aria-label="Pause">${icon('pause')}</button><div class="separator"></div><button class="speed active" data-speed="1">1×</button><button class="speed" data-speed="4">4×</button><div class="separator"></div><div class="timeline"><div class="timeline-track"><input id="timeline" type="range" min="0" max="0" step="1" value="0" aria-label="Recorded timeline"></div><div class="timeline-events" id="eventMarkers"></div><div class="timeline-labels"><span>Spring</span><span>Summer</span><span>Autumn</span><span>Winter</span></div></div></div>
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
function hover(hit){lastHover=hit;if(!tool||phase!=='planning')return;const b={type:tool,x:hit.x,z:hit.z,rotation};const check=canPlace(planner.layout,b,moveId);scene.preview(b,check);$('toolHint').textContent=`${moveId?'Move':tool[0].toUpperCase()+tool.slice(1)} · ${check.reason} · R to turn`;}
function pick(hit){
  if(phase==='planning'&&tool){const result=moveId?planner.move(moveId,hit.x,hit.z,rotation):planner.place(tool,hit.x,hit.z,rotation);if(!result.ok)return toast(result.reason);if(moveId)setTool(null);updatePlanning();return;}
  if(phase==='planning'){const b=findBuilding(hit);selection=b?{id:b.id,kind:'building'}:null;}else selection=hit.id?{id:hit.id,kind:hit.kind}:null;
  inspect();
}
function inspect(){
  if(!selection){$('inspector').classList.add('hidden');return;}
  if(phase!=='planning'){inspectRunning();return;}
  const b=planner.layout.objects.find(b=>b.id===selection.id);if(!b){$('inspector').classList.add('hidden');return;}
  const descriptions={home:'Two adults, a pantry, and a place to come back to. Keep water and food within an easy walk.',field:'A mixed crop garden. Water, tending, and timely harvests make the difference through winter.',well:'A finite water source. Residents must collect every jug and carry it along the roads.',road:'Pale limestone paving. Roads join at their edges and lead to the village entrance.'};
  $('inspector').innerHTML=`<button class="inspector-close" aria-label="Close inspector">×</button><div class="eyebrow">${b.free?'Village entrance':'Your settlement'}</div><h2>${b.type[0].toUpperCase()+b.type.slice(1)}</h2><p>${descriptions[b.type]}</p><div class="stat"><span>Access</span><b>${connected(planner.layout,b)?'Connected':'No road access'}</b></div><div class="stat"><span>Construction</span><b>${b.free?'Supplied by level':COST[b.type]+' coins'}</b></div>${b.free?'':`<div class="actions"><button id="moveBuilding">Move · free</button><button id="removeBuilding">Remove · refund ${COST[b.type]}</button></div>`}`;
  $('inspector').classList.remove('hidden');$('inspector').querySelector('.inspector-close').onclick=()=>{selection=null;inspect();};
  if(!b.free){$('moveBuilding').onclick=()=>{setTool(b.type);moveId=b.id;rotation=b.rotation;toast('Choose a new position. R turns the entrance.');};$('removeBuilding').onclick=()=>{planner.remove(b.id);selection=null;updatePlanning();inspect();};}
}

const stat=(label,n,max,unit='days')=>`<div class="stat"><span>${label}</span><b>${n.toFixed(1)} ${unit}</b></div><div class="meter"><i style="width:${Math.min(100,n/max*100)}%"></i></div>`;
function inspectRunning(){
  const s=run.state;let html='';
  if(selection.kind==='person'){
    const p=s.people.find(p=>p.id===selection.id);if(!p||p.departed){selection=null;inspect();return;}
    html=`<div class="eyebrow">A neighbour</div><h2>${p.name}</h2><p>${jobDescription(p,s)}.</p>${p.carry.amount?stat('Carrying',p.carry.amount,8,p.carry.type):'<p>Hands free for the next errand.</p>'}`;
    scene.showRoute(p);
  }else{
    const b=s.buildings.find(b=>b.id===selection.id);if(!b){selection=null;inspect();return;}
    const num=s.buildings.filter(x=>x.type===b.type).findIndex(x=>x.id===b.id)+1;
    html=`<div class="eyebrow">${b.connected?'Connected to the village':'No road access'}</div><h2>${b.type[0].toUpperCase()+b.type.slice(1)} ${num}</h2>`;
    if(b.type==='home')html+=`<p>${homeProblem(b,s)}</p>${stat('Food reserve',b.food,CAPS.homeFood)}${stat('Water reserve',b.water,CAPS.homeWater)}<div class="stat"><span>Household</span><b>${b.status==='preparing'?'Preparing to leave':b.status}</b></div>`;
    if(b.type==='well')html+=`<p>${b.connected?b.water<5?'The well is low. Rain will help it recover.':'Water is collected here and carried along the roads.':'Its entrance needs a road to the village.'}</p>${stat('Water available',b.water,CAPS.wellWater,'jugs')}<p>Replenishment: ${s.recharge.toFixed(1)} jugs a day.</p>`;
    if(b.type==='field')html+=`<p>${!b.connected?'The field is isolated. Workers cannot reach it.':b.dead?'The crop has withered. Water and tending can prepare it for replanting.':s.season==='Winter'?'The rows are dormant. Growth and new planting wait for spring.':b.moisture<20?'The soil is dry. Water needs to arrive soon.':b.care<.3?'The crops need a worker to tend them.':'Mixed crops grow with moisture and regular tending.'}</p>${stat('Crop growth',b.growth*100,100,'%')}${stat('Soil moisture',b.moisture,100,'%')}${stat('Stored food',b.food,CAPS.fieldFood,'days')}<p>${b.harvests} harvests gathered this year.</p>`;
    const e=[...s.events].reverse().find(e=>e.building===b.id);if(e)html+=`<p class="recent-event">Day ${Math.floor(e.day)+1} · ${e.text}</p>`;
    scene.showRoute(null);
  }
  $('inspector').innerHTML=`<button class="inspector-close" aria-label="Close inspector">×</button>${html}`;$('inspector').classList.remove('hidden');$('inspector').querySelector('button').onclick=()=>{selection=null;scene.showRoute(null);inspect();};
}
function updateRunUI(){
  const s=run.state;scene.setState(s);
  $('seasonSymbol').textContent={Spring:'❧',Summer:'☀',Autumn:'❦',Winter:'☂'}[s.season];$('seasonText').textContent=`${s.season} · Day ${Math.floor(Math.min(55.999,s.day)%14)+1}`;
  $('weatherText').textContent=`${s.weather==='Rain'?'Passing rain':s.weather==='Dry spell'?'Dry spell':s.weather==='Overcast'?'Cold, quiet skies':'Gentle weather'} · ${paused?'Paused':run.cursor<run.latest?'Replaying recorded days':'Year one'}`;
  $('pause').innerHTML=icon(paused?'play':'pause');$('pause').setAttribute('aria-label',paused?'Play':'Pause');document.querySelectorAll('.speed').forEach(b=>b.classList.toggle('active',+b.dataset.speed===speed));
  $('timeline').max=run.latest;$('timeline').value=run.cursor;$('timeline').style.width=`${Math.max(5,run.latest/YEAR_TICKS*100)}%`;
  $('eventMarkers').innerHTML=s.events.filter(e=>['harvest','departure','cropLoss','shortage'].includes(e.type)).map(e=>`<i style="left:${e.tick/YEAR_TICKS*100}%" title="${e.text}"></i>`).join('');
  const last=s.events.at(-1),recent=last&&s.tick-last.tick<TICKS_PER_DAY*.65;
  $('eventToast').classList.toggle('hidden',!recent||!!s.result);if(recent)$('eventToast').textContent=last.text;
  $('outcome').classList.toggle('hidden',!s.result);
  if(s.result){const r=s.result;$('outcome').innerHTML=`<div class="eyebrow">${r.kind==='success'?'The first year · complete':r.kind==='collapse'?'Your settlement · abandoned':'The first year · goal unmet'}</div><h2>${r.title}</h2><p>${r.explanation}</p><div class="stat"><span>Occupied homes</span><b>${r.occupied} / 3</b></div>${r.occupied?`<div class="stat"><span>Lowest food reserve</span><b>${r.minFood.toFixed(1)} days</b></div><div class="stat"><span>Lowest water reserve</span><b>${r.minWater.toFixed(1)} days</b></div>`:''}${s.metrics.firstShortage?`<p>First shortage: ${s.metrics.firstShortage.resource}, day ${Math.floor(s.metrics.firstShortage.day)+1}. Rewind to understand why.</p>`:''}<button id="reviseResult">Revise layout</button>`;$('reviseResult').onclick=revise;}
  if(selection)inspectRunning();lastUiTick=s.tick;
}
function start(){
  if(phase!=='planning'||!canStart(planner.layout))return;
  setTool(null);selection=null;run=new Playback(planner.layout);phase='running';speed=1;paused=false;lastUiTick=-1;
  document.querySelectorAll('.planning').forEach(e=>e.classList.add('hidden'));document.querySelectorAll('.running').forEach(e=>e.classList.remove('hidden'));$('inspector').classList.add('hidden');$('toolHint').classList.add('hidden');$('keysHint').textContent='SPACE pause · Click a resident to follow';
  scene.setLayout(planner.layout,false);updateRunUI();
}
function revise(){
  if(!run)return;planner=new Planner(run.initialLayout);run=null;phase='planning';paused=false;selection=null;scene.state=null;scene.showRoute(null);scene.resetSeason();
  document.querySelectorAll('.planning').forEach(e=>e.classList.remove('hidden'));$('openBrief').classList.add('hidden');document.querySelectorAll('.running').forEach(e=>e.classList.add('hidden'));for(const id of ['outcome','inspector','eventToast'])$(id).classList.add('hidden');$('keysHint').textContent='1–4 build · R rotate · Esc inspect';updatePlanning();
}
function togglePause(){if(!run)return;paused=!paused;updateRunUI();}
function seek(tick){if(!run)return;paused=true;run.seek(tick);scene.snapPeople=true;updateRunUI();}

document.querySelectorAll('[data-tool]').forEach(b=>b.onclick=()=>setTool(tool===b.dataset.tool?null:b.dataset.tool));
$('undo').onclick=()=>{planner.undo();selection=null;updatePlanning();inspect();};
$('example').onclick=()=>{planner.example();setTool(null);updatePlanning();};$('resetLayout').onclick=()=>{planner.reset();setTool(null);updatePlanning();};
$('level').onchange=e=>{planner=new Planner(starterLayout(e.target.value));setTool(null);updatePlanning();};
$('closeBrief').onclick=()=>{$('brief').classList.add('hidden');$('openBrief').classList.remove('hidden');};$('openBrief').onclick=()=>{$('brief').classList.remove('hidden');$('openBrief').classList.add('hidden');};
$('cameraLeft').onclick=()=>scene.rotate(-Math.PI/6);$('cameraRight').onclick=()=>scene.rotate(Math.PI/6);$('cameraReset').onclick=()=>scene.resetCamera();
$('go').onclick=start;$('revise').onclick=revise;$('pause').onclick=togglePause;
$('rewind').onclick=()=>seek(run.cursor-3*TICKS_PER_DAY);$('timeline').oninput=e=>seek(+e.target.value);
document.querySelectorAll('.speed').forEach(b=>b.onclick=()=>{speed=+b.dataset.speed;updateRunUI();});
$('sound').onclick=async()=>{if(!sound){const {Ambience}=await import('./sound.js');sound=new Ambience();}sound.toggle();$('sound').classList.toggle('sound-on',sound.enabled);$('sound').setAttribute('aria-label',sound.enabled?'Mute sound':'Enable sound');$('sound').title=sound.enabled?'Sound on':'Sound off';};
addEventListener('keydown',e=>{if(['INPUT','SELECT'].includes(e.target.tagName))return;
  if(e.code==='Escape'){setTool(null);selection=null;inspect();}
  if(e.code==='KeyQ')scene.rotate(-Math.PI/6);if(e.code==='KeyE')scene.rotate(Math.PI/6);
  if(e.code==='Space'&&phase==='running'){e.preventDefault();togglePause();}
  if(phase==='planning'){if(['1','2','3','4'].includes(e.key))setTool(['road','home','field','well'][+e.key-1]);if(e.code==='KeyR'){rotation=(rotation+1)%4;if(lastHover)hover(lastHover);}if((e.ctrlKey||e.metaKey)&&e.code==='KeyZ'){e.preventDefault();$('undo').click();}}
});

try {await scene.load();const thumbs=scene.thumbnails();document.querySelectorAll('[data-tool]').forEach(b=>b.querySelector('.tool-art').innerHTML=`<img src="${thumbs[b.dataset.tool]}" alt="">`);updatePlanning();$('loading').remove();window.__rome={ready:true,scene,get planner(){return planner;},get phase(){return phase;},get run(){return run;},get paused(){return paused;},getState:()=>run?.state,projectTile:(x,z)=>scene.projectTile(x,z),selectTool:setTool,metrics:()=>scene.metrics(),advance:days=>{if(!run)start();paused=true;run.advanceDays(days);scene.snapPeople=true;updateRunUI();return run.state;},seek,revise,start,loadLayout:layout=>{if(run)revise();planner=new Planner(layout);setTool(null);updatePlanning();},select:(id,kind='building')=>{selection={id,kind};inspect();}};}
catch(error){$('loading').innerHTML=`<h1>Little Rome</h1><p>The landscape could not load.</p><p>${error.message}</p>`;console.error(error);}
let lastFrame=performance.now();function frame(){const now=performance.now(),dt=Math.min((now-lastFrame)/1000,.2);lastFrame=now;if(run){run.update(dt,speed,paused);scene.fraction=paused?1:run.fraction;if(run.state.result)paused=true;if(run.state.tick!==lastUiTick)updateRunUI();sound?.update(run.state,paused);}scene.render();requestAnimationFrame(frame);}requestAnimationFrame(frame);
