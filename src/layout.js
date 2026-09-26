export const SIZE = 12;
export const COST = {road: 1, home: 10, field: 14, well: 8};
export const FOOTPRINT = {road: 1, home: 2, field: 3, well: 1};
export const ENTRANCE = {x: 6, z: 11};
export const LEVELS = {
  settlement: {name: 'First settlement', budget: 80, target: 3, water: 1, outlook: 'Gentle spring showers, a warm dry summer, and a wet winter. Store food before the cold arrives.'},
  dry: {name: 'Dry summer', budget: 88, target: 3, water: 0.12, outlook: 'A long summer drought slows the wells. Short water routes and a second well reward preparation.'},
  terrain: {name: 'The stony way', budget: 88, target: 3, water: 1, outlook: 'A limestone outcrop divides the village. Find a short route around it; expect a mild year.'},
  budget: {name: 'A modest beginning', budget: 74, target: 3, water: 1, outlook: 'Every coin matters. Share a short road and leave enough room for two productive fields.'}
};
export const key = (x,z) => `${x},${z}`;
export const clone = v => structuredClone(v);
export function blocked(x,z,level='settlement') {
  return (x < 3 && z < 3) || (x > 9 && z < 2) || (level === 'terrain' && x===8 && z>=4 && z<=7);
}
export function cells(b) {const a=[]; for(let x=0;x<FOOTPRINT[b.type];x++)for(let z=0;z<FOOTPRINT[b.type];z++)a.push({x:b.x+x,z:b.z+z});return a;}
export function door(b) {
  const n=FOOTPRINT[b.type], m=Math.floor(n/2);
  return [{x:b.x+m,z:b.z+n},{x:b.x-1,z:b.z+m},{x:b.x+m,z:b.z-1},{x:b.x+n,z:b.z+m}][b.rotation||0];
}
export function center(b) {const n=FOOTPRINT[b.type];return {x:b.x+(n-1)/2,z:b.z+(n-1)/2};}
export function roadNetwork(layout) {
  const roads=new Set(layout.objects.filter(b=>b.type==='road').map(b=>key(b.x,b.z)));
  const seen=new Set(), queue=[ENTRANCE];
  for(let i=0;i<queue.length;i++){const p=queue[i],k=key(p.x,p.z); if(seen.has(k)||!roads.has(k))continue;seen.add(k);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])queue.push({x:p.x+dx,z:p.z+dz});}
  return seen;
}
export function connected(layout,b,network=roadNetwork(layout)) {const p=b.type==='road'?b:door(b);return network.has(key(p.x,p.z));}
export function route(layout,from,to) {
  const roads=roadNetwork(layout),start=key(from.x,from.z),end=key(to.x,to.z);
  if(!roads.has(start)||!roads.has(end))return null;
  const queue=[from],prev=new Map([[start,null]]);
  for(let i=0;i<queue.length;i++) {const p=queue[i],k=key(p.x,p.z);if(k===end){const result=[];let c=k;while(c){const [x,z]=c.split(',').map(Number);result.unshift({x,z});c=prev.get(c);}return result;}
    for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const q={x:p.x+dx,z:p.z+dz},qk=key(q.x,q.z);if(roads.has(qk)&&!prev.has(qk)){prev.set(qk,k);queue.push(q);}}
  }return null;
}
export function spent(layout) {return layout.objects.reduce((sum,b)=>sum+(b.free?0:COST[b.type]),0);}
export function balance(layout) {return LEVELS[layout.level].budget-spent(layout);}
export function canPlace(layout,b,ignoreId=null) {
  if(!FOOTPRINT[b.type])return {ok:false,reason:'Choose a construction tool.'};
  const footprint=cells(b),occupied=new Set(layout.objects.filter(o=>o.id!==ignoreId).flatMap(cells).map(p=>key(p.x,p.z)));
  if(footprint.some(p=>p.x<0||p.z<0||p.x>=SIZE||p.z>=SIZE))return {ok:false,reason:'Keep the whole building on the landscape.'};
  if(footprint.some(p=>blocked(p.x,p.z,layout.level)))return {ok:false,reason:'Pond or limestone outcrop — choose open ground.'};
  if(footprint.some(p=>occupied.has(key(p.x,p.z))))return {ok:false,reason:'This space is already occupied.'};
  if(!ignoreId&&balance(layout)<COST[b.type])return {ok:false,reason:'Not enough coins. Remove something or undo.'};
  const preview={...layout,objects:[...layout.objects.filter(o=>o.id!==ignoreId),b]};
  return {ok:true,reason:connected(preview,b)?'Entrance connected':'Entrance needs a road',access:connected(preview,b)};
}
export function emptyLayout(level='settlement') {return {level,nextId:1,objects:[8,9,10,11].map(z=>({id:`gate${z}`,type:'road',x:6,z,rotation:0,free:true}))};}
export function starterLayout(level='settlement') {
  const l=emptyLayout(level);
  const add=(type,x,z,rotation=0)=>l.objects.push({id:`b${l.nextId++}`,type,x,z,rotation});
  for(let x=2;x<=9;x++)add('road',x,5);
  for(let z=6;z<=7;z++)add('road',6,z);
  add('home',3,3);add('home',6,3);add('home',8,3);
  add('field',2,6,2);add('field',7,6,2);add('well',5,7,3);
  if(level==='dry')add('well',5,4);
  if(level==='budget'||level==='terrain'){
    const homes=l.objects.filter(b=>b.type==='home');homes.forEach((h,i)=>h.x=2+i*2);
    l.objects=l.objects.filter(b=>!(b.type==='road'&&b.z===5&&(b.x===2||b.x===9)));
    const well=l.objects.find(b=>b.type==='well');Object.assign(well,{x:8,z:4,rotation:0});
    if(level==='terrain'){
      l.objects=l.objects.filter(b=>!(b.type==='road'&&b.x===8&&b.z===5));
      Object.assign(well,{x:5,z:6,rotation:2});Object.assign(l.objects.filter(b=>b.type==='field')[1],{x:7,z:8,rotation:1});
    }
  }
  if(level==='settlement'||level==='dry'){
    // Turn one household toward the shared road; the short northern spur leaves
    // room for alternative wells. The example spends 76 coins (84 when dry).
    Object.assign(l.objects.find(b=>b.id==='b13'),{x:9,z:4,rotation:1});
    Object.assign(l.objects.find(b=>b.id==='b1'),{x:8,z:4});
    Object.assign(l.objects.find(b=>b.id==='b8'),{x:8,z:3});
  }
  return l;
}
export function warnings(layout) {const net=roadNetwork(layout),out=[]; for(const b of layout.objects.filter(b=>b.type!=='road'))if(!connected(layout,b,net))out.push(`${b.type[0].toUpperCase()+b.type.slice(1)} has no road from its entrance to the village gate.`);
  for(const type of ['field','well'])if(!layout.objects.some(b=>b.type===type&&connected(layout,b,net)))out.push(`No reachable ${type}. Residents will run out of ${type==='field'?'food':'water'}.`);
  return [...new Set(out)];}
export function validLayout(layout){const occupied=new Set();for(const b of layout.objects){if(!FOOTPRINT[b.type])return false;for(const p of cells(b)){const k=key(p.x,p.z);if(p.x<0||p.z<0||p.x>=SIZE||p.z>=SIZE||blocked(p.x,p.z,layout.level)||occupied.has(k))return false;occupied.add(k);}}return balance(layout)>=0;}
export function canStart(layout) {return validLayout(layout)&&layout.objects.some(b=>b.type==='home'&&connected(layout,b));}
export class Planner {
  constructor(layout=starterLayout()){this.layout=clone(layout);this.undoStack=[];}
  save(){this.undoStack.push(clone(this.layout));}
  place(type,x,z,rotation=0){const b={id:`b${this.layout.nextId}`,type,x,z,rotation},check=canPlace(this.layout,b);if(!check.ok)return check;this.save();this.layout.nextId++;this.layout.objects.push(b);return check;}
  move(id,x,z,rotation){const old=this.layout.objects.find(b=>b.id===id);if(!old||old.free)return {ok:false,reason:'The village gate is fixed.'};const b={...old,x,z,rotation:rotation??old.rotation},check=canPlace(this.layout,b,id);if(!check.ok)return check;this.save();Object.assign(old,b);return check;}
  remove(id){const b=this.layout.objects.find(b=>b.id===id);if(!b||b.free)return false;this.save();this.layout.objects=this.layout.objects.filter(b=>b.id!==id);return true;}
  undo(){if(this.undoStack.length)this.layout=this.undoStack.pop();}
  reset(){this.save();this.layout=emptyLayout(this.layout.level);}
  example(){this.save();this.layout=starterLayout(this.layout.level);}
}
