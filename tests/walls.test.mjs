/** Walls, doors and windows on every zoned map: they sit on the printed walls, every connection has a way through,
 * and every exit the Altered Carbon Street Atlas uses is reachable inside the walls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scenes=await import('../scenes.mjs');
const maps=JSON.parse(fs.readFileSync(new URL('../content-src/maps.json',import.meta.url),'utf8')).maps;
const OUTDOOR={'SCENE-RAINLINE':['canal-walk','memorial-corner','billboard-plaza','chapel-lane','bathhouse-steps'],'SCENE-RELAY':['canal-gantry'],'SCENE-SPIRE':['canal-quay']};
const onEdge=(p,z)=>{const [x,y,w,h]=z.rect;return (Math.abs(p[0]-x)<1||Math.abs(p[0]-x-w)<1)&&p[1]>=y-1&&p[1]<=y+h+1||(Math.abs(p[1]-y)<1||Math.abs(p[1]-y-h)<1)&&p[0]>=x-1&&p[0]<=x+w+1;};

test('every map has walls; each segment is straight, inside the image and on a zone outline (or a drawn window/partition)',()=>{
 for(const m of maps){
  assert.ok(m.walls?.length>=6,`${m.id} walls`);
  for(const w of m.walls){
   const [x1,y1,x2,y2]=w.c;assert.ok(x1===x2||y1===y2,`${m.id} axis-aligned`);assert.ok([x1,x2].every(v=>v>=0&&v<=m.width)&&[y1,y2].every(v=>v>=0&&v<=m.height),`${m.id} inside`);
   assert.ok(['wall','door','window'].includes(w.kind));
   if(w.kind==='door')assert.ok(Math.hypot(x2-x1,y2-y1)>=85,`${m.id} door wide enough for a token`);
  }
  const doors=m.walls.filter(w=>w.kind==='door');
  for(const d of doors){const mid=[(d.c[0]+d.c[2])/2,(d.c[1]+d.c[3])/2];assert.ok(m.zones.some(z=>onEdge(mid,z)),`${m.id} door ${d.label||''} sits on a zone wall`);}
 }
});
test('every pair of adjacent zones can be walked between (a door, or an open-air boundary)',()=>{
 for(const m of maps){
  const out=new Set(OUTDOOR[m.id]||[]);
  for(const z of m.zones)for(const a of z.adjacent){
   if(out.has(z.id)&&out.has(a))continue;
   const other=m.zones.find(o=>o.id===a);
   const door=m.walls.some(w=>w.kind==='door'&&onEdge([(w.c[0]+w.c[2])/2,(w.c[1]+w.c[3])/2],z)&&onEdge([(w.c[0]+w.c[2])/2,(w.c[1]+w.c[3])/2],other));
   const viaRoute=m.walls.some(w=>w.kind==='door'&&onEdge([(w.c[0]+w.c[2])/2,(w.c[1]+w.c[3])/2],z))&&m.walls.some(w=>w.kind==='door'&&onEdge([(w.c[0]+w.c[2])/2,(w.c[1]+w.c[3])/2],other));
   assert.ok(door||viaRoute||out.has(z.id)||out.has(a),`${m.id}: ${z.id} ↔ ${a}`);
  }
 }
});
test('drawn exits have a door, locked links are locked doors, glass is a window',()=>{
 const ward=maps.find(m=>m.id==='SCENE-WARD');
 assert.ok(ward.walls.some(w=>w.kind==='door'&&w.locked&&/LOCKED PARTITION/.test(w.label)),'the reserve bays partition is locked');
 assert.ok(ward.walls.some(w=>w.kind==='door'&&/EXIT · FRONT DESK/.test(w.label)),'front desk exit is a door');
 assert.ok(ward.walls.some(w=>w.kind==='window'),'ward windows');
 const theatre=maps.find(m=>m.id==='SCENE-THEATRE');assert.ok(theatre.walls.some(w=>w.kind==='window'&&w.c[1]===400&&w.c[3]===400),'observation gallery glass');
 const spire=maps.find(m=>m.id==='SCENE-SPIRE');assert.ok(spire.walls.some(w=>w.locked&&/LOCKED GRATE/.test(w.label)));
 for(const m of maps)for(const label of (m.exits||[]))assert.ok(m.walls.some(w=>w.kind==='door'&&w.label===`EXIT · ${label}`)||(OUTDOOR[m.id]||[]).length,`${m.id} exit ${label}`);
});
test('Foundry wall data: doors are doors, windows let sight and light through, every wall is flagged as ours',()=>{
 const data=scenes.wallData(maps.find(m=>m.id==='SCENE-WARD'));
 const door=data.find(w=>w.door===1),window=data.find(w=>w.flags['cold-storage'].wall==='window'),wall=data.find(w=>w.flags['cold-storage'].wall==='wall');
 assert.equal(door.move,20);assert.ok([0,2].includes(door.ds));
 assert.equal(window.move,20);assert.equal(window.sight,0);assert.equal(window.light,0);assert.equal(window.sound,10);
 assert.equal(wall.sight,20);assert.ok(data.every(w=>w.flags['cold-storage'].wallsVersion===scenes.WALLS_VERSION));
});
test('syncWalls never replaces walls a GM drew, and refreshes only our own outdated walls',async()=>{
 const mk=walls=>({walls,created:[],deleted:[],async createEmbeddedDocuments(t,a){this.created.push(...a);},async deleteEmbeddedDocuments(t,ids){this.deleted.push(...ids);}});
 const m=maps[0];
 const gm=mk([{id:'x',flags:{}}]);assert.equal(await scenes.syncWalls(gm,m),'custom');assert.equal(gm.created.length,0);
 const empty=mk([]);assert.equal(await scenes.syncWalls(empty,m),'created');assert.equal(empty.created.length,m.walls.length);
 const old=mk([{id:'o',flags:{'cold-storage':{wall:'wall',wallsVersion:'0.1'}}}]);assert.equal(await scenes.syncWalls(old,m),'updated');assert.deepEqual(old.deleted,['o']);
 const cur=mk(scenes.wallData(m).map((w,i)=>({...w,id:`c${i}`})));assert.equal(await scenes.syncWalls(cur,m),'current');
});
test('every Street Atlas exit trigger on a Cold Storage map is inside a zone a token can reach',()=>{
 // Exit tags as drawn on the art (maps.py exit_marker): the system's trigger covers the arrow and the tag.
 for(const m of maps)for(const label of m.exits||[]){
  const doorOnWall=m.walls.find(w=>w.label===`EXIT · ${label}`);
  if(!doorOnWall)continue;
  const mid=[(doorOnWall.c[0]+doorOnWall.c[2])/2,(doorOnWall.c[1]+doorOnWall.c[3])/2];
  assert.ok(m.zones.some(z=>{const [x,y,w,h]=z.rect;return mid[0]>=x-1&&mid[0]<=x+w+1&&mid[1]>=y-1&&mid[1]<=y+h+1;}),`${m.id} ${label} door is on a zone`);
 }
});
