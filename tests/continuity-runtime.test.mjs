/** Mocked Foundry document API contract; real Foundry/Forge acceptance still required. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {installSystemImporter} from './helpers/system-harness.mjs';
installSystemImporter();
const copy=v=>structuredClone(v);
let seq=0;
const patch=(o,k,v)=>{const parts=k.split('.');let current=o;for(const p of parts.slice(0,-1))current=current[p]??={};current[parts.at(-1)]=copy(v);};
class Item{
 constructor(d={}){Object.assign(this,copy(d));this.id=d.id??`ITEM${++seq}`;this.type??='skill';this.flags??={};this.system??={};}
 getFlag(m,k){return this.flags?.[m]?.[k];}
 async update(data){if(this.failNext){this.failNext=false;throw Error('Simulated Item update failure');}for(const [k,v] of Object.entries(data))patch(this,k,v);return this;}
}
class ActorDoc{
 constructor(data={}){Object.assign(this,copy(data));this.id=data.id??`ACTOR${++seq}`;this.items=Object.defineProperty((data.items||[]).map(i=>Object.defineProperty(new Item(i),'parent',{value:this,enumerable:false})),'get',{value(id){return this.find(i=>i.id===id);},enumerable:false});this.flags??={};this.system??={resources:{ego:{value:20,max:20}},egoPermanentLoss:0,attributes:{willpower:30}};this.ac={bonuses:{willpower:0}};this.updateCount=0;this.egoCalls=[];}
 getFlag(m,k){return this.flags?.[m]?.[k];}
 async update(data){if(this.failNext){this.failNext=false;throw Error('Simulated Actor update failure');}this.updateCount++;for(const [k,v] of Object.entries(data))patch(this,k,v);return this;}
 async createEmbeddedDocuments(type,objects){assert.equal(type,'Item');const made=objects.map(o=>Object.defineProperty(new Item(o),'parent',{value:this,enumerable:false}));this.items.push(...made);return made;}
 // Foundry applies an embedded batch atomically on the server.
 async updateEmbeddedDocuments(type,updates){assert.equal(type,'Item');const targets=updates.map(u=>this.items.find(i=>i.id===u._id));const failing=targets.find(i=>i?.failNext);if(failing){failing.failNext=false;throw Error('Simulated Item update failure');}for(const [n,u] of updates.entries()){const {_id,...rest}=u;for(const [k,v] of Object.entries(rest))patch(targets[n],k,v);}return targets;}
 async applyEgoDamage(amount){this.egoCalls.push(amount);const value=Math.max(0,this.system.resources.ego.value-amount);await this.update({'system.resources.ego.value':value});return{value};}
}
class BaseApp{async _prepareContext(){return {};}render(){return this;}}
globalThis.foundry={utils:{deepClone:copy,escapeHTML:x=>String(x).replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))},applications:{api:{ApplicationV2:BaseApp,HandlebarsApplicationMixin:B=>B}}};
const messages=[];
globalThis.ChatMessage={implementation:{create:async data=>messages.push(data)},getSpeaker:({actor})=>({alias:actor.name})};
globalThis.ui={notifications:{warn:()=>{},error:()=>{},info:()=>{}}};
globalThis.Roll=class{constructor(formula){this.formula=formula;this.total=formula==='2d6'?7:4;}async evaluate(){return this;}};
globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL(`../content-src/${url.split('/').at(-1)}`,import.meta.url),'utf8'))});
const runtime=await import('../continuity.mjs');
const plans=(await JSON.parse(await fs.readFile(new URL('../content-src/continuity-plans.json',import.meta.url),'utf8'))).plans;
let store,actors,failSettings=null;
function setup({isGM=true,createPCs=true,startingState={},ego=20}={}){
 seq=0;messages.length=0;
 store=new Map([['bookState',{fray:{},heat:0}],['continuityState',{pcs:{}}],['activePregens',['PC01','PC02','PC03','PC04','PC05','PC06']]]);
 for(const [k,v]of Object.entries(startingState))store.set(k,copy(v));
 actors=createPCs?plans.map((p)=>new ActorDoc({name:p.name,flags:{'cold-storage':{sourceId:p.pcId}},system:{resources:{ego:{value:ego,max:30},health:{value:10,max:10}},attributes:{willpower:35,acuity:45,intelligence:55},egoPermanentLoss:0,egoState:'stable'},items:[{id:`${p.pcId}-S0`,type:'sleeve',flags:{'cold-storage':{sourceId:p.activeSleeveId}},system:{status:'active',sleeveType:p.pcId==='PC03'?'clone':p.activeSleeveType,appearance:'Existing appearance'}},{id:`${p.pcId}-bag11`,type:'baggage',name:'Personality Frag',system:{catalogId:'baggage-11'}},{id:`${p.pcId}-bag12`,type:'baggage',name:'Compromised DHF',system:{catalogId:'baggage-12'}},{id:`${p.pcId}-bag10`,type:'baggage',name:'Trauma',system:{catalogId:'baggage-10'}},{id:`${p.pcId}-ac1`,type:'skill',name:'Skill A',system:{attribute:'acuity',level:4}},{id:`${p.pcId}-ac2`,type:'skill',name:'Skill B',system:{attribute:'acuity',level:3}},{id:`${p.pcId}-int1`,type:'skill',name:'Skill C',system:{attribute:'intelligence',level:3}},{id:`${p.pcId}-int2`,type:'skill',name:'Skill D',system:{attribute:'intelligence',level:3}},{id:`${p.pcId}-wil1`,type:'skill',name:'Skill E',system:{attribute:'willpower',level:3}},{id:`${p.pcId}-wil2`,type:'skill',name:'Skill F',system:{attribute:'willpower',level:3}}]})):[];
 globalThis.game={user:{isGM},system:{id:'altered-carbon-rpg'},actors,alteredCarbon:{ClinicalRules:{egoDamageAfterReduction:(raw,{willpowerBonus=0}={})=>Math.max(raw>0?1:0,raw-willpowerBonus),egoResourceChange:({current,maximum,permanentLoss=0,damage=0}={})=>{const value=Math.max(0,Math.min(maximum-permanentLoss,current-damage));return{value,egoState:value===0?'splintered':'stable'};}},ClinicalWorkflow:{clinicalMessage:async(actor,title,detail)=>messages.push({actor:actor.name,title,detail})},openClinical:()=>{}},settings:{register:(m,k,o)=>{if(!store.has(k))store.set(k,copy(o.default));},registerMenu:()=>{},get:(m,k)=>store.get(k),set:async(m,k,v)=>{if(failSettings===k){failSettings=null;throw Error('Simulated settings write failure');}store.set(k,copy(v));return v;}}};
 failSettings=null;return actors;
}
const actor=id=>actors.find(a=>a.getFlag('cold-storage','sourceId')===id);
const state=()=>store.get('continuityState');
const book=()=>store.get('bookState');
test('module registers GM-only hidden world continuity setting',()=>{setup();runtime.registerContinuity();assert.deepEqual(state(),{pcs:{}});});
test('fresh initialization applies variable Fray without touching any Actor resources',async()=>{
 setup();const before=JSON.stringify(actors);const res=await runtime.initializeContinuity({freshWorld:true});
 assert.equal(res.characters,8);assert.deepEqual(plans.map(p=>book().fray[p.pcId]),[2,3,4,5,2,3,4,5]);
 assert.equal(JSON.stringify(actors),before);assert.equal((await runtime.initializeContinuity()).initialised,false);
});
test('upgrade initialization preserves played Fray, treatment history and Ego',async()=>{
 setup({startingState:{bookState:{fray:{PC01:5},heat:3},continuityState:{pcs:{PC01:{pulses:{},treatmentHistory:[{kind:"prior"}]}}}}});
 const beforeEgo=actor('PC01').system.resources.ego.value;
 await runtime.initializeContinuity();assert.equal(book().fray.PC01,5);assert.equal(book().heat,3);assert.equal(actor('PC01').system.resources.ego.value,beforeEgo);
});
test('scheduled pulses persist their outcome without altering clinical Ego; duplicates rejected',async()=>{
 setup();await runtime.initializeContinuity();const first=await runtime.performPulse('PC01',{pulse:'ward',response:'echo'});
 assert.equal(first.fray,3);assert.equal(book().fray.PC01,3);assert.equal(actor('PC01').system.resources.ego.value,20);
 assert.deepEqual(state().pcs.PC01.pulses.ward.frayBefore,2);
 await assert.rejects(runtime.performPulse('PC01',{pulse:'ward',response:'stay',success:true}),/already/);
});
test('opt-out prevents punitive pulse; can explicitly restore Fray participation',async()=>{
 setup();await runtime.initializeContinuity();await runtime.optOut('PC05',true);
 await assert.rejects(runtime.performPulse('PC05',{pulse:'court',response:'echo'}),/opted out/);
 assert.equal(book().heat,0);assert.equal(book().fray.PC05,2);
 await runtime.optOut('PC05',false);await runtime.performPulse('PC05',{pulse:'court',response:'veil'});
 assert.equal(book().fray.PC05,2);
});
test('two anchors are once only and leave official Ego intact',async()=>{
 setup();await runtime.initializeContinuity();await runtime.performAnchor('PC04','anansi');assert.equal(book().fray.PC04,4);
 await runtime.performAnchor('PC04','prefinale');assert.equal(book().fray.PC04,3);
 await assert.rejects(runtime.performAnchor('PC04','anansi'),/already/);
 assert.equal(actor('PC04').system.resources.ego.value,20);
});
test('fracture integration is consented and only changes optional Fray',async()=>{
 setup();await runtime.initializeContinuity();await runtime.performPulse('PC04',{pulse:'ward',response:'echo'});
 assert.equal(book().fray.PC04,6);
 await assert.rejects(runtime.performFracture('PC04',{choice:'integration',notes:'Return to present',agreed:false}),/must agree/);
 const out=await runtime.performFracture('PC04',{choice:'integration',notes:'Keeps a former vow',agreed:true});
 assert.equal(out.fray,3);assert.equal(book().fray.PC04,3);assert.equal(actor('PC04').system.resources.ego.value,20);
});
test('fracture partition applies effective Ego once, respects consent and blocks overreach',async()=>{
 setup();await runtime.initializeContinuity();await runtime.performPulse('PC04',{pulse:'ward',response:'echo'});
 const out=await runtime.performFracture('PC04',{choice:'partition',notes:'Seal only an emotional association',agreed:true});
 assert.equal(out.loss.raw,4);assert.equal(book().fray.PC04,4);assert.equal(actor('PC04').system.resources.ego.value,16);
 await assert.rejects(runtime.performOverreach('PC04',{scene:'Core',benefit:'Access override',agreed:true}),/Partition prevents/);
});
test('fracture persistence failure rolls back both Fray and any Core Ego charge',async()=>{
 setup();await runtime.initializeContinuity();await runtime.performPulse('PC04',{pulse:'ward',response:'echo'});
 failSettings='bookState';await assert.rejects(runtime.performFracture('PC04',{choice:'partition',notes:'A defined memory boundary',agreed:true}),/settings write failure/);
 assert.equal(book().fray.PC04,6);assert.equal(actor('PC04').system.resources.ego.value,20);assert.equal(state().pcs.PC04.fractureHistory.length,0);
});
test('voluntary overreach is charged once, restoring nothing and not granting essential clues',async()=>{
 setup();await runtime.initializeContinuity();const out=await runtime.performOverreach('PC02',{scene:'G15',benefit:'Bypass elective security',agreed:true});
 assert.equal(out.loss.amount,4);assert.equal(book().fray.PC02,5);assert.equal(actor('PC02').system.resources.ego.value,16);
 await assert.rejects(runtime.performOverreach('PC02',{scene:'G15',benefit:'Again',agreed:true}),/Only one/);
});
test('core Baggage EP choice is atomic and cannot apply a second time',async()=>{
 setup();await runtime.initializeContinuity();const r=await runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'ep',acknowledged:true});
 assert.equal(r.raw,7);assert.equal(actor('PC02').system.resources.ego.value,13);
 assert.equal(actor('PC02').getFlag('cold-storage','baggageResolutions')['baggage-11'].mode,'ep');
 await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'ep',acknowledged:true}),/already/);
 assert.equal(actor('PC02').system.resources.ego.value,13);
});
test('core Baggage Skill choice downgrades two correct Skills exactly once',async()=>{
 setup();const pc=actor('PC02');
 const r=await runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'skills',skillIds:['PC02-ac1','PC02-ac2'],acknowledged:true});
 assert.equal(r.mode,'skills');assert.equal(pc.items.find(i=>i.id==='PC02-ac1').system.level,3);
 assert.equal(pc.items.find(i=>i.id==='PC02-ac2').system.level,2);
 assert.equal(pc.system.resources.ego.value,20);
 await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'skills',skillIds:['PC02-ac1','PC02-ac2'],acknowledged:true}),/already/);
});
test('a failed embedded Skill update triggers rollback, no Baggage marker saved',async()=>{
 setup();const pc=actor('PC02');pc.items.find(i=>i.id==='PC02-ac2').failNext=true;
 await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'skills',skillIds:['PC02-ac1','PC02-ac2'],acknowledged:true}),/Simulated Item/);
 assert.equal(pc.items.find(i=>i.id==='PC02-ac1').system.level,4);
 assert.equal(pc.getFlag('cold-storage','baggageResolutions'),undefined);
});
test('Baggage already resolved on the Altered Carbon sheet is never charged again from the console',async()=>{
 setup();const pc=actor('PC02');pc.items.find(i=>i.system.catalogId==='baggage-11').system.resolved=true;
 await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'ep',acknowledged:true}),/already/);
 assert.equal(pc.system.resources.ego.value,20);
});
test('console Baggage resolution writes the same record the system sheet reads',async()=>{
 setup();const pc=actor('PC02');await runtime.resolveCoreBaggage('PC02','baggage-12',{mode:'ep',acknowledged:true});
 const bag=pc.items.find(i=>i.system.catalogId==='baggage-12');assert.equal(bag.system.resolved,true);assert.equal(bag.system.resolutionChoice,'ego');
});
test('reject Baggage changes unless player and GM confirm the loss is not already applied',async()=>{
 setup();await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'ep'}),/Confirm this Baggage/);
});
test('treatment note never grants Ego or removes Fray',async()=>{
 setup();await runtime.initializeContinuity();const note=await runtime.recordTreatment('PC02',{kind:'psychosurgery',note:'Clinical Console outcome pending; consent obtained'});
 assert.equal(note.treatmentHistory.length,1);assert.equal(note.treatmentHistory[0].egoAtRecord.remaining,20);
 assert.equal(actor('PC02').system.resources.ego.value,20);assert.equal(book().fray.PC02,3);
 await assert.rejects(runtime.recordTreatment('PC02',{kind:'psychosurgery',note:'Not allowed',frayChange:-2}),/does not automatically/);
});
test('reviewed migration is additive and idempotent; no Actor resources are overwritten',async()=>{
 setup();await runtime.initializeContinuity();const before=JSON.stringify(actor('PC03').system.resources),preview=await runtime.previewContinuityMigration();
 assert.ok(preview.requiresBackup);assert.ok(preview.actions.some(a=>a.operation==='add-history'));
 await assert.rejects(runtime.applyContinuityMigration(),/explicitly confirm/);
 const result=await runtime.applyContinuityMigration({confirmed:true});assert.ok(result.changed>0);assert.equal(result.errors.length,0);
 assert.equal(JSON.stringify(actor('PC03').system.resources),before);
 const followup=await runtime.applyContinuityMigration({confirmed:true});assert.equal(followup.changed,0);
 const source=actor('PC03').items.find(i=>i.getFlag('cold-storage','sourceId')==='PC03-PREL1');assert.ok(source);
});
test('migration skips actors who switched their active sleeve; does not add archival Items',async()=>{
 setup();actor('PC04').items.find(i=>i.getFlag('cold-storage','sourceId')==='PC04-S0').system.status='archived';
 const prev=await runtime.previewContinuityMigration();assert.ok(prev.actions.some(a=>a.pcId==='PC04'&&a.operation==='skip-active'));
 assert.equal(prev.actions.filter(a=>a.pcId==='PC04'&&a.operation==='add-history').length,0);
 const itemCount=actor('PC04').items.length;await runtime.applyContinuityMigration({confirmed:true});assert.equal(actor('PC04').items.length,itemCount);
});
test('GM authorization is enforced for Fray, Core Baggage and migrations',async()=>{
 setup({isGM:false});await assert.rejects(runtime.initializeContinuity(),/Only a GM/);
 await assert.rejects(runtime.performPulse('PC01',{pulse:'ward',response:'echo'}),/Only a GM/);
 await assert.rejects(runtime.resolveCoreBaggage('PC02','baggage-11',{mode:'ep',acknowledged:true}),/Only a GM/);
 await assert.rejects(runtime.previewContinuityMigration(),/Only a GM/);
});
