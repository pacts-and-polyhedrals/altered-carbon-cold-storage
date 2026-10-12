/** Zoned maps: data integrity, Altered Carbon zone graph, installer safety, automatic zone assignment. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const scenes=await import('../scenes.mjs');
const maps=JSON.parse(fs.readFileSync(new URL('../content-src/maps.json',import.meta.url),'utf8')).maps;
const journals=JSON.parse(fs.readFileSync(new URL('../content-src/journals.json',import.meta.url),'utf8'));

test('every playable location in the adventure has a zoned map',()=>{
 const chapters=['G08','G09','G10','G11','G12','G13','G14','G15','G16','G17','G18','G19','G20','G21'];
 assert.deepEqual(maps.map(m=>m.journal).sort(),chapters.sort());
 for(const m of maps)assert.ok(journals.some(j=>j.id===m.journal),m.journal);
});
test('map art exists, zones are inside the image, non-overlapping, and adjacency is symmetric',()=>{
 for(const m of maps){
  assert.ok(fs.statSync(new URL(`../assets/maps/${m.file}`,import.meta.url)).size>20000,m.file);
  assert.ok(m.zones.length>=4,`${m.id} zones`);
  const ids=new Set(m.zones.map(z=>z.id));assert.equal(ids.size,m.zones.length);
  for(const z of m.zones){
   const [x,y,w,h]=z.rect;assert.ok(x>=0&&y>=0&&x+w<=m.width&&y+h<=m.height,`${m.id}/${z.id} inside`);
   assert.ok(z.adjacent.length>0,`${m.id}/${z.id} reachable`);
   for(const a of z.adjacent){assert.ok(ids.has(a));assert.ok(m.zones.find(o=>o.id===a).adjacent.includes(z.id),`${m.id}: ${z.id}<->${a}`);}
   for(const o of m.zones)if(o!==z){const [ox,oy,ow,oh]=o.rect;assert.ok(x>=ox+ow-0.01||ox>=x+w-0.01||y>=oy+oh-0.01||oy>=y+h-0.01,`${m.id}: ${z.id} overlaps ${o.id}`);}
  }
  // Every zone is reachable from every other.
  const seen=new Set([m.zones[0].id]),queue=[m.zones[0].id];while(queue.length){const cur=queue.shift();for(const a of m.zones.find(z=>z.id===cur).adjacent)if(!seen.has(a)){seen.add(a);queue.push(a);}}
  assert.equal(seen.size,m.zones.length,`${m.id} connected`);
 }
});
test('the Breach map uses the three zones named in G09 plus the ward',()=>{
 const breach=maps.find(m=>m.id==='SCENE-BREACH');
 assert.deepEqual(breach.zones.map(z=>z.name),['The Ward','Ward Entrance','Viewing Corridor','Service Stair']);
});
test('scene data carries the system zone graph and gridless zone units',()=>{
 const d=scenes.sceneData(maps[0]);
 assert.equal(d.grid.type,0);assert.equal(d.grid.units,'zone');assert.equal(d.padding,0);
 assert.deepEqual(d.flags['altered-carbon-rpg'].zoneGraph.zones.map(z=>z.id),maps[0].zones.map(z=>z.id));
 assert.match(d.levels[0].background.src,/^modules\/cold-storage\/assets\/maps\/.+\.webp$/);
});
test('tokens are assigned to the zone under their centre; unchanged moves add no flag',()=>{
 const m=maps.find(x=>x.id==='SCENE-BREACH'),scene={grid:{size:100},dimensions:{sceneX:0,sceneY:0},flags:{'cold-storage':{zoneShapes:m.zones.map(z=>({id:z.id,rect:z.rect}))}}};
 assert.equal(scenes.zoneForToken(scene,{x:300,y:300,width:1,height:1,flags:{}},null),'ward');
 assert.equal(scenes.zoneForToken(scene,{x:300,y:300,width:1,height:1,flags:{'altered-carbon-rpg':{zone:'ward'}}},{x:1500,y:1100}),'service-stair');
 assert.equal(scenes.zoneForToken(scene,{x:300,y:300,flags:{'altered-carbon-rpg':{zone:'ward'}}},{x:320}),undefined,'same zone: no write');
 assert.equal(scenes.zoneForToken(scene,{x:300,y:300,flags:{}},{name:'renamed'}),undefined,'non-movement update ignored');
 assert.equal(scenes.zoneForToken(scene,{x:300,y:300,flags:{'altered-carbon-rpg':{zone:'ward'}}},{x:2700,y:1700}),'','outside every zone clears it');
 assert.equal(scenes.zoneForToken({flags:{}},{x:1,y:1},{x:5}),undefined,'scenes without Cold Storage zones are untouched');
});
test('v14: scenes carry their map on an embedded Level, never the deprecated Scene background',()=>{
 const d=scenes.sceneData(maps[0],{folder:'F1'});
 assert.equal(d.background,undefined,'no top-level background (renders black in v14)');
 assert.equal(d.levels.length,1);assert.match(d.levels[0].background.src,/assets\/maps\/sc01-resurrection-ward\.webp$/);
 assert.equal(d.folder,'F1');assert.ok(d.sort>0);
 const b=scenes.backdropData(scenes.BACKDROPS[0]);assert.equal(b.background,undefined);assert.match(b.levels[0].background.src,/placeholders\/landing\.svg$/);
});
test('installer files scenes in a Cold Storage folder, repairs black v14 scenes and never touches replaced art',async()=>{
 class Level{constructor(d){Object.assign(this,structuredClone(d));}async update(c){for(const [k,v] of Object.entries(c)){const parts=k.split('.');let o=this;for(const p of parts.slice(0,-1))o=o[p]??={};o[parts.at(-1)]=v;}return this;}}
 class Doc{constructor(d){const {levels,...rest}=structuredClone(d);Object.assign(this,rest);this.levels={contents:(levels||[]).map(l=>new Level(l))};}
  getFlag(m,k){return this.flags?.[m]?.[k];}
  async update(c){for(const [k,v] of Object.entries(c)){const parts=k.split('.');let o=this;for(const p of parts.slice(0,-1))o=o[p]??={};o[parts.at(-1)]=v;}return this;}
  async createEmbeddedDocuments(t,arr){assert.equal(t,'Level');this.levels.contents.push(...arr.map(l=>new Level(l)));}}
 globalThis.Scene={create:async d=>{const s=new Doc(d);game.scenes.push(s);return s;}};
 globalThis.Folder={create:async d=>{const f={id:'SCENEFOLDER',...d};game.folders.push(f);return f;}};
 globalThis.fetch=async()=>({ok:true,json:async()=>({maps})});
 // A 1.6–1.8 scene: created with the deprecated field, so its v14 initial Level has no image (black).
 const black=new Doc({name:'The Resurrection Ward',levels:[{name:'Level 1',background:{src:''}}],flags:{'cold-storage':{sourceId:'SCENE-WARD'}}});
 const custom=new Doc({name:'My Spire',folder:'MINE',levels:[{background:{src:'worlds/x/spire.webp'}}],flags:{'cold-storage':{sourceId:'SCENE-SPIRE'}}});
 globalThis.game={user:{isGM:true},scenes:[black,custom],folders:[]};
 const r=await scenes.installMaps({thumbnails:false});
 assert.deepEqual(r,{created:14,upgraded:1,skipped:1,maps:14});
 assert.match(black.levels.contents[0].background.src,/sc01-resurrection-ward\.webp$/,'black scene repaired on its existing Level');assert.equal(black.folder,'SCENEFOLDER');
 assert.ok(black.flags['altered-carbon-rpg'].zoneGraph.zones.length>=4);
 assert.equal(custom.levels.contents[0].background.src,'worlds/x/spire.webp');assert.equal(custom.name,'My Spire');assert.equal(custom.folder,'MINE');
 assert.ok(game.scenes.every(s=>s.folder),'every scene is in a folder');assert.equal(game.folders.filter(f=>f.type==='Scene').length,1);
 const names=game.scenes.filter(s=>s.folder==='SCENEFOLDER').sort((a,b)=>a.sort-b.sort).map(s=>s.flags['cold-storage'].sourceId);
 assert.equal(names[0],'SCENE-LANDING');assert.equal(names.at(-1),'SCENE-EPILOGUE','adventure order');
 const again=await scenes.installMaps({thumbnails:false});assert.equal(again.created,0,'idempotent');
 game.user.isGM=false;await assert.rejects(scenes.installMaps(),/Only a GM/);
});
test('every cover marker is a real cover position with a system material inside its zone',()=>{
 const kinds=['brush','wood','concrete','metal','steel','ferrocrete'];let n=0;
 for(const m of maps)for(const c of m.cover){n++;assert.ok(kinds.includes(c.kind),c.id);assert.ok(c.zone&&m.zones.some(z=>z.id===c.zone),`${c.id} zone`);assert.ok(c.radius>0);}
 assert.ok(n>=9,`${n} cover positions`);
 const breach=maps.find(m=>m.id==='SCENE-BREACH').cover;assert.deepEqual(breach.map(c=>[c.kind,c.partial]),[['wood',false],['metal',true]],'partition and movable trolley');
 assert.ok(scenes.sceneData(maps.find(m=>m.id==='SCENE-BREACH')).flags['cold-storage'].coverSpots.length===2);
});
test('map cover applies on entering a ring, clears on leaving, and never overrides hand-set cover',()=>{
 const spots=[{id:'s1',x:500,y:500,radius:140,kind:'wood',partial:false},{id:'s2',x:700,y:500,radius:140,kind:'metal',partial:true}];
 assert.equal(scenes.coverAt(spots,520,510).id,'s1');assert.equal(scenes.coverAt(spots,690,500).id,'s2','nearest ring wins');assert.equal(scenes.coverAt(spots,100,100),null);
 assert.deepEqual(scenes.coverChange(spots[0],{kind:'none'},null),{cover:{kind:'wood',partial:false},autoCover:'s1'});
 assert.equal(scenes.coverChange(spots[0],{kind:'wood',partial:false},'s1'),undefined,'already in that cover: no write');
 assert.deepEqual(scenes.coverChange(spots[1],{kind:'wood'},'s1'),{cover:{kind:'metal',partial:true},autoCover:'s2'},'moving between rings');
 assert.deepEqual(scenes.coverChange(null,{kind:'wood'},'s1'),{cover:{kind:'none',partial:false},autoCover:null},'leaving clears map cover');
 assert.equal(scenes.coverChange(spots[0],{kind:'concrete'},null),undefined,'hand-set cover is kept');
 assert.equal(scenes.coverChange(null,{kind:'concrete'},null),undefined);
 assert.equal(scenes.coverChange(null,undefined,null),undefined);
});
