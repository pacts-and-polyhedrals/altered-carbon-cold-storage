/** Investigation Tracker, scene setup and the players' Case File. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read=f=>JSON.parse(fs.readFileSync(new URL(`../content-src/${f}`,import.meta.url),'utf8'));
const data=read('missions.json'),maps=read('maps.json').maps,journals=read('journals.json'),contacts=read('contacts.json'),adversaries=read('adversaries.json'),benefactors=read('benefactors.json');
globalThis.foundry={utils:{deepClone:x=>structuredClone(x),mergeObject:(a,b)=>({...a,...b,flags:{...(a.flags||{}),...(b.flags||{})}})},applications:{api:{ApplicationV2:class{},HandlebarsApplicationMixin:B=>B}}};
const M=await import('../missions.mjs');
M.setMissionData(data);
const actorIds=new Set([...contacts.map(c=>c.id),...adversaries.map(a=>a.id),...benefactors.map(b=>b.id)]);
const world=(over={})=>({...M.emptyWorld(),...over});

test('missions data: every chapter, scene, zone, actor, handout and pulse it names exists',()=>{
 const ids=new Set(journals.map(j=>j.id));const handouts=journals.filter(j=>j.category==='handout').map(j=>j.id);
 const sceneIds=new Set([...maps.map(m=>m.id),'SCENE-EPILOGUE']);
 const objIds=new Set();
 for(const m of data.missions){
  assert.ok(ids.has(m.journal),`${m.id} journal ${m.journal}`);assert.ok(sceneIds.has(m.scene),`${m.id} scene`);
  for(const a of m.after||[])assert.ok(data.missions.some(x=>x.id===a),`${m.id} after ${a}`);
  const map=maps.find(x=>x.id===m.scene);
  for(const c of m.cast){if(c.offmap)continue;assert.ok(actorIds.has(c.actor),`${m.id} actor ${c.actor}`);if(c.record)assert.ok(actorIds.has(c.record));assert.ok(map.zones.some(z=>z.id===c.zone),`${m.id} zone ${c.zone}`);}
  for(const p of m.pins||[]){assert.ok(ids.has(p.journal),`${m.id} pin ${p.journal}`);assert.ok(map.zones.some(z=>z.id===p.zone));}
  for(const o of m.objectives){assert.ok(!objIds.has(o.id),o.id);objIds.add(o.id);assert.ok(o.text&&o.player,`${o.id} has GM and player text`);
   const walk=r=>{if(!r)return;if(r.any)return r.any.forEach(walk);if(r.handout)assert.ok(handouts.includes(r.handout),r.handout);for(const h of r.handouts||[])assert.ok(handouts.includes(h),h);
    if(r.pulse)assert.ok(['ward','contact','court','broadcast','core'].includes(r.pulse));if(r.anchor)assert.ok(['anansi','prefinale'].includes(r.anchor));if(r.visited)assert.ok(sceneIds.has(r.visited));
    if(r.counter)assert.ok(['heat','renewal','proof','control','people'].includes(r.counter));for(const s of r.started||[])assert.ok(data.missions.some(x=>x.id===s));};walk(o.auto);}
 }
 for(const e of data.evidence)for(const h of e.handouts)assert.ok(handouts.includes(h),`${e.id} ${h}`);
 assert.deepEqual(data.evidence.filter(e=>e.pillar).map(e=>e.pillar),['Origin','Embodiment','Authority']);
 // every handout is pinned somewhere or tied to an objective, so nothing in the box is forgotten
 const used=new Set(data.missions.flatMap(m=>[...(m.pins||[]).map(p=>p.journal),...m.objectives.flatMap(o=>[o.auto?.handout,...(o.auto?.handouts||[])])]));
 for(const h of handouts)assert.ok(used.has(h),`${h} used by the tracker`);
});
test('every adventure scene with a map has a mission, and the rivals and threats of G27 are placed',()=>{
 for(const m of maps)assert.ok(data.missions.some(x=>x.scene===m.id),`${m.id} has a mission`);
 const cast=id=>data.missions.find(m=>m.id===id).cast;
 assert.ok(cast('M02').some(c=>c.actor==='ADV02'&&c.name==='Jalen Cross'),'Breach: Jalen leads with the Hitman profile');
 assert.equal(cast('M02').filter(c=>c.actor==='ADV03').reduce((n,c)=>n+(c.count||1),0),2,'two recovery personnel');
 assert.ok(cast('M05').some(c=>c.name==='Ren Ko'&&c.hidden),'Blue Lotus rival waits hidden');
 assert.ok(cast('M12').some(c=>c.actor==='ADV04'&&c.cover),'Praetorian lead in cover at the lift lobby');
 assert.ok(['GOD01','GOD02','GOD03'].every(g=>cast('M13').some(c=>c.actor===g)),'all three Benefactors at the council');
});
test('board: auto rules tick from the world, GM overrides win, missions close and unlock the next',()=>{
 let b=M.computeBoard(data,{},world());
 assert.equal(b.missions[0].status,'available');assert.equal(b.missions[1].status,'upcoming');assert.equal(b.percent,0);
 b=M.computeBoard(data,{},world({handouts:new Set(['H01']),pulses:new Set(['ward'])}));
 const m1=b.missions[0];assert.ok(m1.objectives.find(o=>o.id==='M01-2').done);assert.ok(m1.objectives.find(o=>o.id==='M01-4').done);assert.equal(m1.status,'active');assert.ok(!m1.complete);
 b=M.computeBoard(data,{objectives:{'M01-1':true,'M01-3':true}},world({handouts:new Set(['H01']),pulses:new Set(['ward'])}));
 assert.ok(b.missions[0].complete);assert.equal(b.missions[1].status,'available');assert.ok(b.percent>0);
 // untick an auto objective
 b=M.computeBoard(data,{objectives:{'M01-2':false}},world({handouts:new Set(['H01'])}));assert.ok(!b.missions[0].objectives.find(o=>o.id==='M01-2').done);
 assert.equal(M.toggled(undefined,true),false);assert.equal(M.toggled(false,true),undefined);assert.equal(M.toggled(undefined,false),true);assert.equal(M.toggled(true,false),undefined);
 // scene activation starts the mission; started-rule sees it
 b=M.computeBoard(data,{visited:{'SCENE-LOTUS':true}},world());assert.equal(b.missions.find(m=>m.id==='M05').status,'active');assert.ok(b.missions.find(m=>m.id==='M03').objectives[0].done);
 // optional objectives never block
 b=M.computeBoard(data,{},world({handouts:new Set(['H13','H16']),counters:{heat:1,renewal:1,proof:0,control:0,people:0}}));assert.ok(!b.missions.find(m=>m.id==='M14').complete);
 b=M.computeBoard(data,{objectives:{'M14-7':true}},world({handouts:new Set(['H13','H16']),counters:{heat:1,renewal:1,proof:0,control:0,people:0}}));assert.ok(b.missions.find(m=>m.id==='M14').complete);
});
test('evidence and proof pillars follow revealed handouts',()=>{
 const b=M.computeBoard(data,{evidence:{E02:true}},world({handouts:new Set(['H10','H12'])}));
 assert.deepEqual(b.evidence.filter(e=>e.acquired).map(e=>e.id),['E02','E07','E09']);
 assert.deepEqual(b.pillars.filter(p=>p.obtained).map(p=>p.name),['Origin','Authority']);
});
test('players\' Case File shows only player text — no GM notes, no unrevealed evidence, no unstarted missions',()=>{
 const b=M.computeBoard(data,{objectives:{'M01-1':true}},world({handouts:new Set(['H01'])}));
 const html=M.caseFileHTML(b);
 assert.match(html,/Wake Up/);assert.match(html,/Learn what body you are wearing/);assert.match(html,/why you were held/);
 for(const m of data.missions){assert.ok(!html.includes(m.gm),`${m.id} GM brief leaked`);for(const o of m.objectives)assert.ok(!html.includes(o.text),`${o.id} GM text leaked`);for(const c of m.cast)assert.ok(!c.note||!html.includes(c.note));}
 for(const e of data.evidence)assert.ok(!html.includes(e.claim),`${e.id} claim leaked`);
 assert.ok(!html.includes('Root genesis register'),'unrevealed evidence hidden');assert.ok(!html.includes('H03'),'unrevealed handout codes hidden');assert.ok(!html.includes('The Council'),'unstarted mission hidden');
});
test('layout keeps tokens inside their zone, below its plaque, without overlap',()=>{
 for(const n of [1,2,3,5,8]){const rect=[100,100,1000,600];const ps=M.layoutTokens(rect,n);
  for(const p of ps){assert.ok(p.x>=100&&p.x+100<=1100&&p.y>=200&&p.y+100<=700,`${n}: ${p.x},${p.y}`);}
  for(let i=0;i<ps.length;i++)for(let j=i+1;j<ps.length;j++)assert.ok(Math.abs(ps[i].x-ps[j].x)>=100||Math.abs(ps[i].y-ps[j].y)>=100);}
 // every scene's full cast (standby included) fits in its zones
 for(const m of data.missions){const map=maps.find(x=>x.id===m.scene);if(!map)continue;
  for(const s of M.setupPlan([m],map,{includeStandby:true})){const z=map.zones.find(x=>x.id===s.entry.zone);const [x,y,w,h]=z.rect;
   assert.ok(s.x+50>=x&&s.x+50<=x+w&&s.y+50>=y&&s.y+50<=y+h,`${m.id} ${s.key} centre inside ${z.id}`);}}
 const plan=M.setupPlan([data.missions.find(m=>m.id==='M12')],maps.find(x=>x.id==='SCENE-SPIRE'));
 const lead=plan.find(s=>s.entry.actor==='ADV04'),cover=maps.find(x=>x.id==='SCENE-SPIRE').cover[0];assert.equal(lead.x+50,Math.round(cover.x));assert.equal(lead.y+50,Math.round(cover.y),'placed in the cover ring');
 assert.ok(!plan.some(s=>s.entry.standby),'standby contacts are not placed by default');
});

test('runtime: Set Up Scene places the cast hidden where marked, pins the journals, and is idempotent; Drop and Reveal work',async()=>{
 let n=0;const id=()=>`id${++n}`;
 const flagged=o=>Object.assign(o,{getFlag(m,k){return this.flags?.[m]?.[k];}});
 const actors=[...actorIds].map(a=>flagged({id:id(),type:a.startsWith('ADV')?'threat':'npc',name:a,flags:{'cold-storage':{sourceId:a}},prototypeToken:{name:a,texture:{src:'x.svg'}}}));
 const journalsW=journals.map(j=>flagged({id:id(),flags:{'cold-storage':{sourceId:j.id}},sheet:{render(){}}}));
 const scene=flagged({id:'S',flags:{'cold-storage':{sourceId:'SCENE-BREACH'}},tokens:[],notes:[],levels:{contents:[{id:'L1'}]},initialLevel:{id:'L1'},
  async createEmbeddedDocuments(t,arr){const list=t==='Token'?this.tokens:this.notes;for(const d of arr)list.push(flagged({...structuredClone(d),id:id()}));},
  async updateEmbeddedDocuments(t,arr){for(const u of arr)Object.assign(this.tokens.find(x=>x.id===u._id),u);},
  async deleteEmbeddedDocuments(t,ids){const k=t==='Token'?'tokens':'notes';this[k]=this[k].filter(x=>!ids.includes(x.id));}});
 const settings=new Map();
 globalThis.game={user:{id:'GM',isGM:true},users:{activeGM:{id:'GM'}},actors,journal:journalsW,scenes:[scene],folders:[],settings:{get:(m,k)=>settings.get(k),set:async(m,k,v)=>settings.set(k,structuredClone(v))}};
 globalThis.fetch=async()=>({ok:true,json:async()=>({maps})});
 const r=await M.setupScene('SCENE-BREACH');
 assert.equal(r.tokens,3,'Jalen + two recovery personnel');assert.equal(r.notes,2,'chapter + H02 pins');assert.deepEqual(r.missing,[]);
 const jalen=scene.tokens.find(t=>t.name==='Jalen Cross');assert.equal(jalen.hidden,false);assert.equal(jalen.actorLink,false,'threat tokens are unlinked');assert.equal(jalen.level,'L1');
 assert.equal(jalen.flags['altered-carbon-rpg'].zone,'ward-entrance');
 const crew=scene.tokens.filter(t=>/Recovery Personnel/.test(t.name));assert.equal(crew.length,2);assert.ok(crew.every(t=>t.hidden));assert.notEqual(crew[0].name,crew[1].name);
 assert.equal((await M.setupScene('SCENE-BREACH')).tokens,0,'idempotent');
 assert.equal(await M.revealScene('SCENE-BREACH'),2);assert.ok(scene.tokens.every(t=>!t.hidden));
 // standby drop on the Rainline
 scene.flags['cold-storage'].sourceId='SCENE-RAINLINE';
 const tom=data.missions.find(m=>m.id==='M03').cast.findIndex(c=>c.actor==='C14');
 const d=await M.dropCast('M03',tom);assert.equal(d.tokens,1);const placed=scene.tokens.at(-1);assert.equal(placed.hidden,false);assert.equal(placed.actorLink,true,'named NPCs are linked');
 assert.equal((await M.dropCast('M03',tom)).tokens,0,'dropping twice does nothing');
 assert.ok(await M.clearSceneSetup('SCENE-RAINLINE')>0);assert.equal(scene.tokens.length,0);assert.equal(scene.notes.length,0);
 game.user.isGM=false;await assert.rejects(M.setupScene('SCENE-BREACH'),/Only the GM/);
});
test('runtime: ticking, evidence, ending and reset persist through the world setting',async()=>{
 const settings=new Map([['continuityState',{pcs:{PC01:{pulses:{ward:{at:1}},anchors:{}}}}],['bookState',{heat:2,renewal:0,proof:0,control:0,people:0,fray:{}}]]);
 globalThis.game={user:{id:'GM',isGM:true},users:{activeGM:{id:'GM'}},actors:[],journal:[{getFlag:(m,k)=>({bookCategory:'handout',bookRevealed:true,sourceId:'H01'})[k],flags:{'cold-storage':{sourceId:'H01'}}}],scenes:[],folders:[],
  settings:{get:(m,k)=>settings.get(k),set:async(m,k,v)=>settings.set(k,structuredClone(v))}};
 let b=M.currentBoard();assert.ok(b.missions[0].objectives.find(o=>o.id==='M01-4').done,'ward pulse from continuity state');assert.ok(b.evidence.find(e=>e.id==='E01').acquired,'H01 revealed');assert.equal(b.heat.value,2);
 await M.toggleObjective('M01-1');await M.toggleObjective('M01-3');b=M.currentBoard();assert.ok(b.missions[0].complete);
 await M.toggleObjective('M01-2');assert.equal(settings.get('missionState').objectives['M01-2'],false,'auto objective unticked by hand');
 await M.setEnding('Witness Compact');assert.equal(M.currentBoard().ending,'Witness Compact');await assert.rejects(M.setEnding('Nope'),/Unknown ending/);
 await M.setMissionComplete('M02');assert.ok(M.currentBoard().missions[1].complete);
 assert.ok(settings.get('missionState').log.length>=4,'GM log');
 await M.resetTracker({clocks:true});assert.equal(settings.get('bookState').heat,1);b=M.currentBoard();assert.ok(!b.missions[1].complete);assert.equal(b.ending,'');
 assert.ok(settings.get('missionState').announced.E01,'reset never re-announces what is already true');
});
test('mission panels: GM gets buttons wired to the tracker, players get none',()=>{
 const b=M.computeBoard(data,{},world());const m=b.missions[1];
 const gm=M.missionPanelHTML(m,{isGM:true,compact:true});assert.match(gm,/data-cs-act="setup" data-cs-scene="SCENE-BREACH"/);assert.match(gm,/data-cs-act="objective"/);assert.match(gm,/data-cs-act="tracker"/);
 const pl=M.missionPanelHTML(m,{isGM:false});assert.ok(!/data-cs-act=/.test(pl));
 assert.match(M.clocksHTML(b),/data-cs-key="heat"/);assert.ok(!/data-cs-act/.test(M.evidenceHTML(b,{isGM:false})));
});
