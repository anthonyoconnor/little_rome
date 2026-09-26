import {clone,LEVELS,ENTRANCE,connected,route,door,center,canStart} from './layout.js';

// All gameplay uses fixed steps. Rendering speed never enters these calculations.
export const TICKS_PER_DAY=80;
export const DT=1/TICKS_PER_DAY;
export const YEAR_TICKS=56*TICKS_PER_DAY;
export const CAPS={homeFood:32,homeWater:10,fieldFood:80,wellWater:60};
export const NAMES=['Livia','Titus','Aelia','Marcus','Flavia','Lucius','Claudia','Felix','Julia','Gaius','Sabina','Cato'];
export function climate(day,level='settlement'){
  const season=['Spring','Summer','Autumn','Winter'][Math.min(3,Math.floor(day/14))];
  const d=Math.floor(day),rain=season==='Winter'?(d%4!==2):season==='Spring'?[2,3,7,11,12].includes(d):season==='Autumn'?[29,32,33,38,40].includes(d):false;
  return {season,weather:rain?'Rain':season==='Summer'?'Dry spell':season==='Winter'?'Overcast':'Fair',rain,evaporation:season==='Summer'?12:season==='Winter'?3:7,recharge:LEVELS[level].water*(season==='Summer'?5.5:10)+(rain?6:0)};
}
function event(s,type,text,building=null){if(s.events.some(e=>e.type===type&&e.building===building&&s.tick-e.tick<TICKS_PER_DAY*.5))return;s.events.push({tick:s.tick,day:s.day,type,text,building});}
function nearestRoad(layout,site){return site==='gate'?ENTRANCE:door(layout.objects.find(b=>b.id===site));}
function makePath(s,p,dest){
  const a=nearestRoad(s.layout,p.site),b=nearestRoad(s.layout,dest),roads=route(s.layout,a,b);if(!roads)return null;
  const end=dest==='gate'?ENTRANCE:center(s.buildings.find(b=>b.id===dest));
  return [{...a},...roads.slice(1),end];
}
function distance(s,p,dest){const path=makePath(s,p,dest);if(!path)return Infinity;let x=p.x,z=p.z,sum=0;for(const n of path){sum+=Math.hypot(n.x-x,n.z-z);x=n.x;z=n.z;}return sum;}
function travel(s,p,dest){const path=makePath(s,p,dest);if(!path)return false;p.path=path;p.pathIndex=0;p.destination=dest;p.work=0;return true;}
function building(s,id){return s.buildings.find(b=>b.id===id);}
function reserved(s,type,target){return s.people.some(p=>!p.departed&&p.job?.type===type&&p.job.target===target);}
function reservedLoad(s,type,source){return s.people.reduce((sum,p)=>sum+(p.job?.source===source&&p.job.phase==='collect'&&p.job.resource===type?p.job.amount:0),0);}

export function createState(layout,seed=17){
  if(!canStart(layout))throw new Error('A reachable home is required.');
  const s={layout:clone(layout),seed,tick:0,day:0,...climate(0,layout.level),buildings:[],people:[],events:[],result:null,metrics:{walked:0,waterDelivered:0,foodDelivered:0,harvested:0,cropsLost:0,foodConsumed:0,waterConsumed:0,firstShortage:null}};
  for(const b of layout.objects.filter(b=>b.type!=='road')){
    const o={...clone(b),connected:connected(layout,b)};
    if(b.type==='home')Object.assign(o,{food:0,water:0,status:o.connected?'arriving':'vacant',foodShortage:0,waterShortage:0,arrived:false});
    if(b.type==='field')Object.assign(o,{food:0,moisture:65,growth:0,care:1.4,dead:false,dryDays:0,harvests:0,totalYield:0});
    if(b.type==='well')Object.assign(o,{water:CAPS.wellWater});s.buildings.push(o);
  }
  let i=0;for(const home of s.buildings.filter(b=>b.type==='home'&&b.connected))for(let adult=0;adult<2;adult++){
    const p={id:`p${i}`,name:NAMES[i%NAMES.length],home:home.id,x:ENTRANCE.x,z:ENTRANCE.z+adult*.08,site:'gate',heading:Math.PI,carry:{type:null,amount:0},job:{type:'arrive',target:home.id,phase:'travel'},path:[],pathIndex:0,work:0,rest:0,departed:false};i++;travel(s,p,home.id);s.people.push(p);
  }
  event(s,'arrival','New neighbours are arriving with seeds and provisions.');return s;
}

function assign(s,p){
  if(p.departed)return;const home=building(s,p.home);
  if(home.status==='leaving'||home.status==='abandoned'){p.carry={type:null,amount:0};p.job={type:'depart',target:'gate',phase:'travel'};travel(s,p,'gate');return;}
  if(p.rest>0){p.rest-=DT;return;}
  const activeHomes=s.buildings.filter(b=>b.type==='home'&&b.arrived&&!['leaving','abandoned','vacant'].includes(b.status));
  const wells=s.buildings.filter(b=>b.type==='well'&&b.connected&&b.water-reservedLoad(s,'water',b.id)>.5);
  const fields=s.buildings.filter(b=>b.type==='field'&&b.connected);
  const choices=[];
  function addDelivery(type,target,resource,amount,priority,sources){
    if(reserved(s,type,target.id))return;
    for(const source of sources){const d1=distance(s,p,source.id),probe={...p,...center(source),site:source.id},d2=distance(s,probe,target.id);if(!Number.isFinite(d1+d2))continue;
      choices.push({type,target:target.id,source:source.id,resource,amount,score:priority-(d1+d2)*1.15});}
  }
  for(const h of activeHomes){
    if(h.water<7)addDelivery('homeWater',h,'water',Math.min(6,CAPS.homeWater-h.water),h.water<2?110+(2-h.water)*25:61-h.water*4,wells);
    if(h.food<26)addDelivery('food',h,'food',Math.min(8,CAPS.homeFood-h.food),h.food<2?115+(2-h.food)*22:h.food<7?78-h.food*2:39-h.food*.6,fields.filter(f=>f.food-reservedLoad(s,'food',f.id)>.5));
  }
  for(const f of fields){
    if(s.season==='Winter')continue;
    if(f.moisture<68)addDelivery('cropWater',f,'water',Math.min(6,(100-f.moisture)/5),f.moisture<20?98:66-f.moisture*.42,wells);
    const d=distance(s,p,f.id);
    if(f.growth>=1&&!f.dead&&f.food<CAPS.fieldFood-1&&!reserved(s,'harvest',f.id))choices.push({type:'harvest',target:f.id,score:100-d*1.3});
    if((f.care<1.25||f.dead)&&!reserved(s,'tend',f.id))choices.push({type:'tend',target:f.id,score:(f.dead?49:f.care<.25?87:59-f.care*13)-d*1.2});
  }
  choices.sort((a,b)=>b.score-a.score||String(a.target).localeCompare(String(b.target))||String(a.source).localeCompare(String(b.source)));
  if(!choices.length){p.job={type:'rest',target:p.home,phase:'travel'};travel(s,p,p.home);return;}
  const c=choices[0];p.job={...c,phase:c.source?'collect':'work'};travel(s,p,c.source||c.target);
}

function finishJob(s,p){
  const j=p.job;if(!j)return;
  if(j.type==='arrive'){
    const h=building(s,p.home);if(!h.arrived){h.arrived=true;h.food=10;h.water=2;h.status='settled';event(s,'settled',`${p.name}'s household has settled in.`,h.id);}p.job=null;return;
  }
  if(j.type==='depart'){
    p.departed=true;p.carry={type:null,amount:0};const h=building(s,p.home);
    if(s.people.filter(q=>q.home===h.id).every(q=>q.departed)){h.status='abandoned';event(s,'abandoned','An empty home. A shorter supply route may help next year.',h.id);}p.job=null;return;
  }
  if(j.type==='rest'){p.job=null;p.rest=.18;return;}
  if(j.phase==='collect'){
    const src=building(s,j.source),dst=building(s,j.target);if(!src?.connected||!dst||['leaving','abandoned'].includes(dst.status)){p.job=null;return;}
    const available=j.resource==='water'?src.water:src.food;
    const amount=Math.max(0,Math.min(j.amount,available));
    if(j.resource==='water')src.water-=amount;else src.food-=amount;
    p.carry={type:j.resource,amount};j.phase='deliver';if(amount<.001){p.job=null;p.carry={type:null,amount:0};return;}
    travel(s,p,j.target);return;
  }
  if(j.phase==='deliver'){
    const dst=building(s,j.target),n=p.carry.amount;
    if(dst&&!['leaving','abandoned'].includes(dst.status)){
      if(j.type==='cropWater')dst.moisture=Math.min(100,dst.moisture+n*5);
      else if(j.resource==='water')dst.water=Math.min(CAPS.homeWater,dst.water+n);
      else dst.food=Math.min(CAPS.homeFood,dst.food+n);
      if(j.resource==='water')s.metrics.waterDelivered+=n;else s.metrics.foodDelivered+=n;
      if(dst.type==='home'&&dst.status==='preparing'&&dst.food>0&&dst.water>0)event(s,'recovery','A delivery has reached a struggling household.',dst.id);
    }
    p.carry={type:null,amount:0};p.job=null;return;
  }
  const f=building(s,j.target);
  if(j.type==='tend'){
    if(f.dead&&f.moisture>22&&s.season!=='Winter'){f.dead=false;f.growth=0;f.dryDays=0;event(s,'replant','New shoots after the damaged crop was cleared.',f.id);}
    f.care=Math.min(2.5,f.care+1.6);
  }
  if(j.type==='harvest'&&!f.dead&&f.growth>=1&&s.season!=='Winter'){
    const yieldAmount=Math.min(15,CAPS.fieldFood-f.food);f.food+=yieldAmount;f.totalYield+=yieldAmount;f.harvests++;f.growth=0;f.care=Math.max(0,f.care-.3);s.metrics.harvested+=yieldAmount;
    event(s,'harvest',f.harvests===1?'The first harvest is in. Food is waiting in the field shelter.':'A harvest is ready for the household pantries.',f.id);
  }
  p.job=null;
}

function stepPerson(s,p){
  if(p.departed)return;
  const home=building(s,p.home);
  if(home.status==='leaving'&&p.job?.type!=='depart'){p.job=null;p.carry={type:null,amount:0};p.site=p.destination||p.site;assign(s,p);}
  if(!p.job){assign(s,p);return;}
  let remaining=10*DT;
  while(p.pathIndex<p.path.length&&remaining>0){
    const next=p.path[p.pathIndex],dx=next.x-p.x,dz=next.z-p.z,len=Math.hypot(dx,dz),d=Math.min(len,remaining);
    if(len>.0001){p.x+=dx/len*d;p.z+=dz/len*d;p.heading=Math.atan2(dx,dz);s.metrics.walked+=d;}remaining-=d;
    if(len<=d+.00001)p.pathIndex++;else break;
  }
  if(p.pathIndex<p.path.length)return;
  p.site=p.destination;
  const duration=p.job.type==='tend'?.20:p.job.type==='harvest'?.30:p.job.phase==='collect'?.10:p.job.phase==='deliver'?.06:0;
  p.work+=DT;if(p.work>=duration)finishJob(s,p);
}

export function step(s){
  if(s.result)return s;
  s.tick++;s.day=s.tick/TICKS_PER_DAY;const oldSeason=s.season;Object.assign(s,climate(Math.min(s.day,55.999),s.layout.level));
  if(oldSeason!==s.season)event(s,'season',s.season==='Winter'?'Winter has arrived. The town now lives on its stored harvest.':`${s.season} arrives in the Alban hills.`);
  for(const b of s.buildings){
    if(b.type==='well')b.water=Math.min(CAPS.wellWater,b.water+s.recharge*DT);
    if(b.type==='field'){
      b.moisture=Math.max(0,Math.min(100,b.moisture+((s.rain?14:0)-s.evaporation)*DT));
      if(s.season==='Winter')continue;
      b.care=Math.max(0,b.care-DT*.8);
      if(b.moisture<6)b.dryDays+=DT;else b.dryDays=Math.max(0,b.dryDays-DT*.5);
      if(b.dryDays>2.5&&!b.dead){b.dead=true;b.growth=0;s.metrics.cropsLost++;event(s,'cropLoss','A crop has withered after sustained dryness.',b.id);}
      if(!b.dead&&b.connected)b.growth=Math.min(1,b.growth+DT/4.6*Math.min(1,b.moisture/25)*Math.min(1,b.care/.7));
    }
    if(b.type==='home'&&b.arrived&&!['leaving','abandoned'].includes(b.status)){
      s.metrics.foodConsumed+=Math.min(b.food,DT);s.metrics.waterConsumed+=Math.min(b.water,DT);
      b.food=Math.max(0,b.food-DT);b.water=Math.max(0,b.water-DT);
      b.foodShortage=b.food<.001?b.foodShortage+DT:Math.max(0,b.foodShortage-DT*3);
      b.waterShortage=b.water<.001?b.waterShortage+DT:Math.max(0,b.waterShortage-DT*3);
      const prior=b.status;
      b.status=b.waterShortage>1||b.foodShortage>2?'preparing':b.water<1.5||b.food<2?'strained':'settled';
      if((b.waterShortage>.2||b.foodShortage>.2)&&s.metrics.firstShortage===null){s.metrics.firstShortage={day:s.day,resource:b.waterShortage>.2?'water':'food',home:b.id};event(s,'shortage',`A household is short of ${s.metrics.firstShortage.resource}. Inspect its supply route.`,b.id);}
      if(b.status==='preparing'&&prior!=='preparing')event(s,'preparing',`Packing belongings: ${b.waterShortage>1?'water':'food'} has not arrived. A delivery can still help.`,b.id);
      if(b.waterShortage>3||b.foodShortage>5){b.status='leaving';event(s,'departure',`Household leaving: ${b.waterShortage>3?'water':'food'} unavailable.`,b.id);}
      if(prior==='preparing'&&b.status==='settled')event(s,'recovered','Supplies restored. This household is staying.',b.id);
    }
  }
  for(const p of s.people)stepPerson(s,p);
  if(s.people.every(p=>p.departed)){s.result={kind:'collapse',title:'The streets fall quiet',explanation:'Every household has left. Inspect the first shortage, then revise the roads and supplies.',occupied:0};event(s,'result',s.result.title);}
  else if(s.tick>=YEAR_TICKS){
    const homes=s.buildings.filter(b=>b.type==='home'&&b.arrived&&!['leaving','abandoned'].includes(b.status)),success=homes.length>=LEVELS[s.layout.level].target&&homes.every(h=>h.food>=3&&h.water>=3);
    s.result={kind:success?'success':'unmet',title:success?'A little Rome endures':'A year, with lessons',explanation:success?'Your neighbours made it through winter, with food and water put aside for the days ahead.':'Some neighbours remain, but the winter reserve goal was not met. Follow the first shortage back to its source.',occupied:homes.length,minFood:homes.length?Math.min(...homes.map(h=>h.food)):0,minWater:homes.length?Math.min(...homes.map(h=>h.water)):0};event(s,'result',s.result.title);
  }
  return s;
}

export function advance(s,days){const n=Math.round(days*TICKS_PER_DAY);for(let i=0;i<n&&!s.result;i++)step(s);return s;}
export function jobDescription(p,s){
  const j=p.job;if(!j)return s.weather==='Rain'?'Sheltering from the rain':'Resting between errands';
  const label=id=>{const b=building(s,id);return b?`${b.type} ${s.buildings.filter(x=>x.type===b.type).findIndex(x=>x.id===id)+1}`:'village gate';};
  if(j.type==='arrive')return 'Arriving with household provisions';if(j.type==='depart')return 'Leaving the village with their belongings';if(j.type==='rest')return s.weather==='Rain'?'Heading home to shelter':'Heading home for a quiet moment';
  if(j.phase==='collect')return `Collecting ${j.resource} at ${label(j.source)}`;if(j.phase==='deliver')return `Taking ${j.resource} to ${label(j.target)}`;
  if(j.type==='harvest')return `Gathering a harvest in ${label(j.target)}`;return `Tending the rows in ${label(j.target)}`;
}
export function homeProblem(h,s){
  if(!h.connected)return 'Its entrance has no road to the village gate.';
  if(h.status==='arriving')return 'The household is walking in from the village gate.';
  if(h.status==='abandoned')return 'This household has departed. It returns only when you start a new year.';
  if(h.water<2){const wells=s.buildings.filter(b=>b.type==='well'&&b.connected);return !wells.length?'No reachable well. Connect its entrance to the village road.':wells.every(w=>w.water<1)?'The wells are low. Replenishment cannot keep up with demand.':'Water remains at the well, but collection and travel have not kept up.';}
  if(h.food<3){const fields=s.buildings.filter(b=>b.type==='field'&&b.connected);return !fields.length?'No reachable field. The arrival provisions will not last.':fields.some(f=>f.food>1)?'Food waits at a field shelter. A delivery is still needed.':'The field shelters are empty. Check crop care and winter preparation.';}
  return 'The pantry and water jars are supplied.';
}

export class Playback {
  constructor(layout,seed=17){this.initialLayout=clone(layout);this.live=createState(layout,seed);this.history=[clone(this.live)];this.cursor=0;this.fraction=0;}
  get state(){return this.history[this.cursor];}
  get latest(){return this.history.length-1;}
  tick(count=1){for(let i=0;i<count;i++){if(this.cursor<this.latest){this.cursor++;continue;}if(this.live.result)break;step(this.live);this.history.push(clone(this.live));this.cursor++;}return this.state;}
  update(seconds,speed=1,paused=false){if(paused)return this.state;this.fraction+=Math.max(0,seconds)*8*speed;const ticks=Math.floor(this.fraction);this.fraction-=ticks;return this.tick(ticks);}
  seek(tick){this.cursor=Math.max(0,Math.min(this.latest,Math.round(tick)));this.fraction=0;return this.state;}
  advanceDays(days){return this.tick(Math.round(days*TICKS_PER_DAY));}
}
