/** Fresh-world importer contract with mocked Foundry 14 document API. Not live system validation. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {installSystemImporter,gmContent,rulesEngine,systemData,usingRealSystem} from './helpers/system-harness.mjs';
installSystemImporter();
const GMContent=await gmContent(),Rules=await rulesEngine();
const copy=x=>structuredClone(x);
let serial=0;
class Collection extends Array{get contents(){return this;}get(id){return this.find(x=>x.id===id);}}
function set(doc,key,val){const parts=key.split('.');let o=doc;for(const s of parts.slice(0,-1))o=o[s]??={};o[parts.at(-1)]=copy(val);}
class Document{
 constructor(d){Object.assign(this,copy(d));this.id=d._id??String(++serial);this.flags??={};this.ownership??={default:0};}
 getFlag(m,k){return this.flags?.[m]?.[k];}
 async setFlag(m,k,v){return this.update({[`flags.${m}.${k}`]:v});}
 async update(updates){for(const [k,v] of Object.entries(updates))set(this,k,v);return this;}
 toObject(){return copy({...this,_id:this.id});}
}
class Embedded extends Document{}
class ActorMock extends Document{
 constructor(data){super(data);this.items=new Collection(...(data.items||[]).map(x=>new Embedded(x)));}
 async createEmbeddedDocuments(type,items){assert.equal(type,'Item');const entries=items.map(x=>new Embedded(x));this.items.push(...entries);return entries;}
 static async create(data){const d=new ActorMock(data);game.actors.push(d);return d;}
 static async deleteDocuments(ids){game.actors=new Collection(...game.actors.filter(a=>!ids.includes(a.id)));}
}
class JournalMock extends Document{
 constructor(d){super(d);this.pages=new Collection(...(d.pages||[]).map(x=>new Embedded(x)));this.sheet={render:()=>{}};}
 async createEmbeddedDocuments(type,pages){assert.equal(type,'JournalEntryPage');const entries=pages.map(x=>new Embedded(x));this.pages.push(...entries);return entries;}
 static async create(data){const j=new JournalMock(data);game.journal.push(j);return j;}
 static async deleteDocuments(ids){game.journal=new Collection(...game.journal.filter(a=>!ids.includes(a.id)));}
}
class FolderMock extends Document{static async create(data){const d=new FolderMock(data);game.folders.push(d);return d;}
 get contents(){return [...game.actors,...game.journal,...game.scenes].filter(d=>d.folder===this.id);} get children(){return game.folders.filter(f=>f.folder===this.id);}
 async delete(){game.folders=new Collection(...game.folders.filter(f=>f!==this));}}
class SceneMock extends Document{
 constructor(d){super(d);this.walls=new Collection();this.tokens=new Collection();this.notes=new Collection();}
 async createEmbeddedDocuments(type,list){const key={Wall:'walls',Token:'tokens',Note:'notes',Level:'levelsList'}[type];assert.ok(key,type);this[key]??=new Collection();const out=list.map(x=>new Embedded(x));this[key].push(...out);return out;}
 async deleteEmbeddedDocuments(type,ids){const key={Wall:'walls',Token:'tokens',Note:'notes'}[type];this[key]=new Collection(...this[key].filter(x=>!ids.includes(x.id)));}
 async updateEmbeddedDocuments(type,ups){for(const u of ups)Object.assign(this.tokens.get(u._id),u);}
 static async create(data){const d=new SceneMock(data);game.scenes.push(d);return d;}
 static async deleteDocuments(ids){game.scenes=new Collection(...game.scenes.filter(a=>!ids.includes(a.id)));}}
class App{async _prepareContext(){return {};}render(){return this;}}
globalThis.Actor=ActorMock;globalThis.Folder=FolderMock;globalThis.Scene=SceneMock;globalThis.JournalEntry=JournalMock;
globalThis.foundry={utils:{deepClone:copy,escapeHTML:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))},applications:{api:{ApplicationV2:App,HandlebarsApplicationMixin:B=>B,DialogV2:{confirm:async()=>true}}}};
globalThis.Roll=class{constructor(formula){this.formula=formula;this.total=formula.startsWith('1d')?4:7;}async evaluate(){return this;}};
globalThis.Hooks={once:()=>{}};
globalThis.ui={notifications:{warn:()=>{},info:()=>{},error:()=>{}}};
const pregens=JSON.parse(await fs.readFile(new URL('../content-src/pregens.json',import.meta.url),'utf8'));
const loadouts=JSON.parse(await fs.readFile(new URL('../content-src/pregen-loadouts.json',import.meta.url),'utf8'));
const skillIds=Array.from({length:32},(_,i)=>({id:`SK${String(i+1).padStart(2,'0')}`,name:(['Composure','Discipline','Firearms','Directed Energy Weapons','Melee Combat','Data Engineering'][i]??`Skill ${i+1}`),attribute:i%3===0?'willpower':i%3===1?'acuity':'intelligence',rulesRef:'Core 2020 Chapter 3'}));
const systemFile=systemData;
const fixtureData={
 'core-skills.json':skillIds,
 'archetype-skills.json':{archetypes:Object.fromEntries([...new Set(pregens.map(p=>p.archetype))].map(a=>[a,skillIds.map(s=>({id:s.id,level:2}))]))},
 'archetype-reference.json':{archetypes:Object.fromEntries([...new Set(pregens.map(p=>p.archetype))].map(a=>[a,{packages:Object.fromEntries(loadouts.filter(p=>p.archetype===a).map(l=>[l.package,{gear:'Starting test equipment, faithful to structure',traits:[]}]))}]))},
 'trait-catalog.json':{traits:[]},
 'baggage-catalog.json':{entries:[...new Set(loadouts.flatMap(l=>l.baggage))].map((id,i)=>({id,name:id,min:i+1,max:i+3,effect:'Published Baggage item',rulesRef:'Core 2020 p.76'}))},
 'item-catalog.json':{items:[]},
 'adversary-catalog.json':{records:['ADV-DIPPER','ADV-HITMAN','ADV-BCPD','ADV-CTAC'].map(id=>({id,name:id,category:'Criminal',speedDice:3}))}
};
globalThis.fetch=async path=>({ok:true,json:async()=>path.startsWith('systems/')?((await systemFile(path.split('/').at(-1)))??copy(fixtureData[path.split('/').at(-1)])):JSON.parse(await fs.readFile(new URL(path.startsWith('modules/cold-storage/assets/')?`../${path.replace('modules/cold-storage/','')}`:`../content-src/${path.split('/').at(-1)}`,import.meta.url),'utf8'))});
const mod=await import('../cold-storage.mjs');
let settings;
function setup(){serial=0;settings=new Map([['installed',false],['activePregens',[]],['bookState',{heat:1,fray:{}}],['continuityState',{pcs:{}}]]);globalThis.game={user:{id:'GM',isGM:true},system:{id:'altered-carbon-rpg'},actors:new Collection(),journal:new Collection(),scenes:new Collection(),folders:new Collection(),users:new Collection({id:'GM',isGM:true},{id:'P01',isGM:false}),settings:{register:(m,k,d)=>{if(!settings.has(k))settings.set(k,copy(d.default));},registerMenu:()=>{},get:(m,k)=>settings.get(k),set:async(m,k,value)=>{settings.set(k,copy(value));return value;}},alteredCarbon:{version:'2.4.0',Rules,GMContent,Book:legacyBook}};game.system.version='2.4.0';}
// System 2.4.0 ships a legacy v1.1 book that refuses to run while this module is active.
const legacyBook={importBook:async()=>{throw new Error('The separate Cold Storage adventure module is active. Use its Book Only update instead');},openBook:()=>game.coldStorage.openBook()};
const sid=d=>d.getFlag('cold-storage','sourceId');
test('fresh-world full import produces the complete playable data model on Altered Carbon 2.4.0',async()=>{
 setup();await mod.importColdStorage();
 assert.equal(settings.get('installed'),true);
 assert.equal(game.actors.filter(a=>a.type==='character').length,8);
 assert.equal(game.actors.filter(a=>a.type==='npc').length,23);
 assert.equal(game.actors.filter(a=>a.type==='threat').length,4);
 assert.equal(game.scenes.length,16,'14 zoned maps + landing and epilogue backdrops');
 assert.equal(game.journal.filter(j=>!['PLAYER-RELATIONSHIP-BOARD','CASE-FILE'].includes(sid(j))).length,96);
 const caseFile=game.journal.find(j=>sid(j)==='CASE-FILE');assert.ok(caseFile,'players\' Case File created');assert.equal(caseFile.ownership.default,2,'players can read the Case File');
 // every map scene is walled and set up with its cast and journal pins
 const breach=game.scenes.find(s=>sid(s)==='SCENE-BREACH');assert.ok(breach.walls.length>10,'walls');assert.ok(breach.walls.some(w=>w.door===1),'doors');
 assert.ok(breach.tokens.some(t=>t.name==='Jalen Cross'),'Breach cast placed');assert.ok(breach.notes.length>=2,'journal pins');
 const council=game.scenes.find(s=>sid(s)==='SCENE-COUNCIL');assert.equal(council.tokens.length,4,'three Benefactors and Elias North');
 const pcs=game.actors.filter(a=>a.type==='character');
 assert.equal(pcs.flatMap(a=>a.items.filter(i=>i.type==='relationship')).length,160);
 assert.equal(pcs.flatMap(a=>a.items.filter(i=>i.type==='archivedSleeve')).length,46);
 assert.equal(pcs.flatMap(a=>a.items.filter(i=>i.type==='archivedSleeve'&&i.system.status==='candidate')).length,2);
 for(const p of pcs){
  assert.equal(p.items.filter(i=>i.type==='skill').length,32);
  assert.equal(p.items.filter(i=>i.type==='baggage').length,3);
  assert.ok(p.items.find(i=>i.type==='sleeve'&&i.system.status==='active'));
  assert.ok(p.system.resources.ego.value>0);
  assert.equal(p.getFlag('cold-storage','baggageResolutions'),undefined,'Full import must not auto-charge published Baggage');
 }
 assert.deepEqual(Array.from(pcs,p=>p.getFlag('cold-storage','currentOrdinal')),[5,6,7,8,5,6,7,8]);
 assert.equal(pcs.find(a=>sid(a)==='PC03').items.find(i=>i.type==='sleeve').system.sleeveType,'organic');
 assert.deepEqual(Array.from(pcs,p=>settings.get('bookState').fray[sid(p)]),[2,3,4,5,2,3,4,5]);
});
test('repeated full import stops before any modification to a played Actor',async()=>{
 // This test starts with an existing source-controlled character (simulating pre-1.2 imported actors).
 setup();const pc=await ActorMock.create({name:'Already played',type:'character',system:{resources:{ego:{value:3,max:20}}},flags:{'cold-storage':{sourceId:'PC01'}},ownership:{default:0,P01:3}});
 const before=JSON.stringify(pc);
 await assert.rejects(mod.importColdStorage(),/Full Import is for fresh worlds only/);
 assert.equal(JSON.stringify(pc),before);
 assert.equal(game.actors.length,1);assert.equal(game.journal.length,0);
});
test('2.4.0 integration: system legacy book is not used, threats are ready to roll, pregens match creator output',async()=>{
 setup();await mod.importColdStorage();
 assert.equal(game.journal.filter(j=>!['PLAYER-RELATIONSHIP-BOARD','CASE-FILE'].includes(sid(j))).length,96,'module book must import even though the system legacy book refuses');
 const reference=(await systemFile('archetype-reference.json'))??fixtureData['archetype-reference.json'];
 for(const threat of game.actors.filter(a=>a.type==='threat')){
  assert.equal(threat.items.filter(i=>i.type==='skill').length,32,`${threat.name} needs the 32 Core Skill records`);
  for(const w of threat.items.filter(i=>['weapon','software'].includes(i.type)&&i.getFlag('cold-storage','sourceId')?.includes('-weapon-'))){
   const id=String(w.system.skill).toLowerCase().replace(/[^a-z0-9]+/g,'-');
   assert.ok(threat.items.some(i=>i.type==='skill'&&i.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')===id),`${threat.name}: ${w.name} skill ${w.system.skill} not owned`);
   if(w.type==='weapon')assert.match(w.system.damage,/^(?:\d*d\d+|\d+)(?:\s*[+-]\s*(?:\d*d\d+|\d+))*$/,`${w.name} damage must be a valid formula`);
  }
 }
 for(const pc of game.actors.filter(a=>a.type==='character')){
  if(reference.archetypes[pc.system.identity.archetype]?.wealth!==undefined)assert.equal(pc.system.wealth,reference.archetypes[pc.system.identity.archetype].wealth,`${pc.name} wealth`);
  for(const t of pc.items.filter(i=>i.type==='trait'))assert.equal(typeof t.system.ruleElements,'string');
  for(const b of pc.items.filter(i=>i.type==='baggage'))assert.match(b.name,/^Life Event \d — /);
  assert.ok(pc.items.find(i=>i.getFlag('cold-storage','sourceId')===`${sid(pc)}-package`));
 }
});
test('real 2.4.0 catalogs: exact package, IP, commonality and synthetic tech capacity',{skip:!usingRealSystem&&'set AC_SYSTEM_PATH to a 2.4.0 system checkout'},async()=>{
 setup();await mod.importColdStorage();
 const pc=id=>game.actors.find(a=>sid(a)===id);
 // PC08 Civilian Entertainer: package +1 IP and Citizenship is a Common tree for Civilians.
 assert.equal(pc('PC08').system.resources.influence.max-pc('PC08').getFlag('cold-storage','startingResources').influencePoints,1);
 assert.equal(pc('PC08').items.find(i=>i.type==='trait'&&i.system.branch==='Citizenship').system.commonality,'common');
 assert.equal(pc('PC03').system.wealth,2);assert.equal(pc('PC01').system.wealth,1);
 assert.equal(pc('PC02').items.find(i=>i.type==='sleeve'&&i.system.status==='active').system.techCapacity,4);
 assert.ok(pc('PC01').items.filter(i=>i.type==='creditSet').length===2,'Investigator gets 2x Credits Lv.2');
 assert.ok(pc('PC04').items.some(i=>i.type==='armour'&&i.name==='Flak Coat'),'Infiltrator gets the canonical Flak Coat');
 assert.ok(pc('PC05').items.some(i=>i.type==='network'),'Fixer gets the criminal organization Network');
});

test('every opponent, Network and gear Item from Full Import resolves to a noir emblem',async()=>{
 setup();await mod.importColdStorage();
 const emblems=await import('../emblems.mjs');
 emblems.setEmblemIndex(JSON.parse(await fs.readFile(new URL('../assets/emblems/emblems.json',import.meta.url),'utf8')));
 const missing=[];
 for(const a of game.actors){
  if(a.type==='threat'||String(sid(a)).startsWith('GOD'))if(!emblems.emblemFor('Actor',a))missing.push(a.name);
  for(const i of a.items)if(['weapon','ammunition','armour','equipment','software','drug','augmentation','network','creditSet'].includes(i.type)||i.type==='memory')if(!emblems.emblemFor('Item',i))missing.push(`${a.name}: ${i.type} ${i.name}`);
 }
 assert.deepEqual(missing,[]);
});
test('every pregen gets its own portrait and linked, friendly token art',async()=>{
 setup();await mod.importColdStorage();
 const pcs=game.actors.filter(a=>a.type==='character'),imgs=new Set(),tokens=new Set();
 for(const pc of pcs){
  assert.match(pc.img,new RegExp(`assets/portraits/${sid(pc).toLowerCase()}-.+-portrait\\.svg$`),pc.name);
  assert.match(pc.prototypeToken.texture.src,new RegExp(`assets/portraits/${sid(pc).toLowerCase()}-.+-token\\.svg$`),pc.name);
  assert.equal(pc.prototypeToken.actorLink,true);assert.equal(pc.prototypeToken.disposition,1);
  assert.ok((await fs.stat(new URL('../'+pc.img.replace('modules/cold-storage/',''),import.meta.url))).size>3000);
  imgs.add(pc.img);tokens.add(pc.prototypeToken.texture.src);
 }
 assert.equal(imgs.size,8,'eight unique portraits');assert.equal(tokens.size,8,'eight unique tokens');
});
test('Full Reinstall wipes Cold Storage content, keeps the GM own documents, and rebuilds with no duplicates',async()=>{
 setup();await mod.importColdStorage();
 const before={actors:game.actors.length,journals:game.journal.length,scenes:game.scenes.length,folders:game.folders.length};
 // Played state plus the GM's own content.
 const pc=game.actors.find(a=>sid(a)==='PC01');await pc.update({'system.resources.ego.value':1});
 const mine=await ActorMock.create({name:'My own NPC',type:'npc'});const myJournal=await JournalMock.create({name:'My notes',pages:[]});
 const myScene=await SceneMock.create({name:'My scene'});
 settings.set('bookState',{heat:5,fray:{PC01:6}});
 await assert.rejects(mod.importColdStorage(),/Full Reinstall/,'plain Full Import still refuses and points to Full Reinstall');
 const r=await mod.fullReinstall();
 assert.equal(r.removed.actors,before.actors);assert.equal(r.removed.scenes,before.scenes);
 assert.equal(game.actors.filter(a=>sid(a)).length,before.actors,'rebuilt exactly once');
 assert.equal(game.scenes.filter(s=>sid(s)).length,before.scenes);assert.equal(game.journal.filter(j=>sid(j)).length,before.journals-1+1);
 assert.equal(game.folders.length,before.folders,'no duplicate folders');
 assert.ok(game.actors.includes(mine));assert.ok(game.journal.includes(myJournal));assert.ok(game.scenes.includes(myScene));
 const fresh=game.actors.find(a=>sid(a)==='PC01');assert.notEqual(fresh,pc);assert.ok(fresh.system.resources.ego.value>1,'fresh pregen');
 assert.match(fresh.prototypeToken.texture.src,/pc01-nia-calder-token/);
 assert.equal(settings.get('bookState').heat,1);assert.equal(settings.get('installed'),true);
 assert.ok(game.scenes.filter(s=>sid(s)).every(s=>s.folder&&s.levels?.[0]?.background?.src&&!s.background),'v14 scenes: Level image, in a folder');
});

