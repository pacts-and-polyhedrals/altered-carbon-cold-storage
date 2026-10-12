import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
 ANCHORS,BAGGAGE,PULSE_IDS,initialFray,newCharacterState,recordPulse,useAnchor,
 resolveFracture,recordOverreach,validateBaggageChoice,eligibleSkills,inspectEgo,verifyHistory
} from '../continuity-rules.mjs';
const json=name=>JSON.parse(fs.readFileSync(new URL('../content-src/'+name,import.meta.url),'utf8'));
const c=(ordinal=6)=>newCharacterState(ordinal);
test('five through eight are supported with no extra Core sleeve-number tax',()=>{
 assert.deepEqual([5,6,7,8].map(initialFray),[2,3,4,5]);
 for(const n of [0,1,4,9,NaN,Infinity])assert.throws(()=>initialFray(n));
 assert.equal(newCharacterState(8).createdForOrdinal,8);
});
test('the complete non-clone timeline matches the locked pregen and link data',()=>{
 const pcs=json('pregens.json'),sleeves=json('previous-sleeves.json'),plans=json('continuity-plans.json').plans;
 assert.equal(verifyHistory(pcs,sleeves,plans).length,0);
 assert.equal(sleeves.length,46);assert.equal(sleeves.filter(s=>s.continuityStatus==='disputed').length,2);
 assert.equal(json('relationships.json').length,160);
 assert.deepEqual(plans.map(p=>p.ordinal),[5,6,7,8,5,6,7,8]);
 const corrupt=structuredClone(plans);corrupt[0].ordinal=6;assert.ok(verifyHistory(pcs,sleeves,corrupt).length);
});
test('five named continuity pulses have unique keys',()=>{assert.equal(PULSE_IDS.length,5);assert.equal(new Set(PULSE_IDS).size,5);assert.deepEqual(Object.keys(ANCHORS).sort(),['anansi','prefinale']);});
test('stay-present success holds Fray and records D0',()=>{
 const result=recordPulse(c(),3,{id:'ward',response:'stay',success:true});
 assert.equal(result.fray,3);assert.equal(result.check.difficulty,0);assert.equal(result.character.pulses.ward.response,'stay');
 assert.throws(()=>recordPulse(result.character,result.fray,{id:'ward',response:'stay',success:true}),/already/);
});
test('a failed high-Fray continuity check is D1 and can initiate a fracture',()=>{
 const result=recordPulse(c(8),5,{id:'contact',response:'stay',success:false});
 assert.equal(result.check.difficulty,1);assert.equal(result.fray,6);assert.equal(result.atFracture,true);
 assert.throws(()=>recordPulse(result.character,6,{id:'court',response:'echo'}),/Resolve Fray 6/);
});
test('accepting echo increases Fray, veiling does not charge resources',()=>{
 let r=recordPulse(c(),4,{id:'court',response:'echo'});assert.equal(r.fray,5);assert.equal(r.check,null);
 r=recordPulse(r.character,5,{id:'broadcast',response:'veil'});assert.equal(r.fray,5);assert.equal(r.character.pulses.broadcast.response,'veil');
});
test('opt-out and malformed pulse requests are rejected',()=>{
 const s=c();s.optOut=true;assert.throws(()=>recordPulse(s,3,{id:'ward',response:'echo'}),/opted out/);
 assert.throws(()=>recordPulse(c(),3,{id:'wrong',response:'echo'}),/Unknown/);
 assert.throws(()=>recordPulse(c(),3,{id:'ward',response:'stay'}),/result is required/);
 assert.throws(()=>recordPulse(c(),3,{id:'ward',response:'cheat'}),/Unknown/);
});
test('each safe grounding action is once only and never restores Ego',()=>{
 const first=useAnchor(c(),4,'anansi');assert.equal(first.fray,3);
 assert.throws(()=>useAnchor(first.character,3,'anansi'),/already/);
 const second=useAnchor(first.character,3,'prefinale');assert.equal(second.fray,2);
 assert.throws(()=>useAnchor(second.character,2,'prefinale'),/already/);
 assert.throws(()=>useAnchor(c(),0,'anansi'),/zero/);
 assert.throws(()=>useAnchor(c(),2,'fake'),/Unknown/);
});
test('player consent and authored consequences required for fracture',()=>{
 assert.throws(()=>resolveFracture(c(),5,{choice:'integration',agreed:true,notes:'yes'}),/only at Fray 6/);
 assert.throws(()=>resolveFracture(c(),6,{choice:'integration',agreed:false,notes:'yes'}),/must agree/);
 assert.throws(()=>resolveFracture(c(),6,{choice:'integration',agreed:true,notes:''}),/Record the player-authored/);
});
test('integration restores house-rule track only and keeps continuity narrative',()=>{
 const r=resolveFracture(c(7),6,{choice:'integration',agreed:true,notes:'Reclaims a former ethical commitment'});
 assert.equal(r.fray,3);assert.equal(r.egoFormula,null);assert.equal(r.heatDelta,0);
 assert.equal(r.character.fractureHistory.length,1);
});
test('partition costs raw Ego but never permanently removes it as a house rule',()=>{
 const r=resolveFracture(c(8),6,{choice:'partition',agreed:true,notes:'Seals emotional context; factual record remains'});
 assert.equal(r.fray,4);assert.equal(r.egoFormula,'1d6');assert.equal(r.character.overreachBlocked,true);
 assert.throws(()=>recordOverreach(r.character,4,{scene:'last',agreed:true,benefit:'Bypass firewall'}),/Partition prevents/);
});
test('one-time shelter adds Heat below cap; at cap GM concedes instead',()=>{
 let r=resolveFracture(c(),6,{choice:'shelter',agreed:true,notes:'Protected clinic respite',heat:3});
 assert.equal(r.heatDelta,1);assert.equal(r.fray,4);assert.equal(r.requiresGMConcession,false);
 assert.throws(()=>resolveFracture(r.character,6,{choice:'shelter',agreed:true,notes:'Again',heat:3}),/once/);
 r=resolveFracture(c(),6,{choice:'shelter',agreed:true,notes:'Negotiated evacuation',heat:6});
 assert.equal(r.heatDelta,0);assert.equal(r.requiresGMConcession,true);
});
test('optional overreach is once per scene, gives exact price and clamps Fray',()=>{
 const first=recordOverreach(c(),5,{scene:'Court',agreed:true,benefit:'Specific security override'});
 assert.equal(first.fray,6);assert.equal(first.egoFormula,'1d6');assert.equal(first.atFracture,true);
 assert.throws(()=>recordOverreach(first.character,6,{scene:'Court',agreed:true,benefit:'Again'}),/fracture/);
 assert.throws(()=>recordOverreach(first.character,3,{scene:'Court',agreed:true,benefit:'Again'}),/Only one/);
 assert.throws(()=>recordOverreach(c(),3,{scene:'Court',agreed:false,benefit:'Good'}),/Explain/);
});
test('all three Baggage entries use the printed attributes and alternative 2d6',()=>{
 const attr={'baggage-10':'willpower','baggage-11':'acuity','baggage-12':'intelligence'};
 for(const [id,a] of Object.entries(attr)){
  assert.equal(BAGGAGE[id].attribute,a);assert.equal(validateBaggageChoice({bagId:id,mode:'ep'}).formula,'2d6');
 }
 assert.throws(()=>validateBaggageChoice({bagId:'baggage-10',mode:'ep',resolved:{'baggage-10':{mode:'ep'}}}),/already/);
});
test('Baggage can downgrade only two different matching skills above level one',()=>{
 const samples=[{id:'a',type:'skill',system:{attribute:'acuity',level:3}},{id:'b',type:'skill',system:{attribute:'acuity',level:2}},{id:'c',type:'skill',system:{attribute:'willpower',level:5}},{id:'d',type:'skill',system:{attribute:'acuity',level:1}}];
 assert.deepEqual(eligibleSkills(samples,'baggage-11').map(x=>x.id),['a','b']);
 const r=validateBaggageChoice({bagId:'baggage-11',mode:'skills',skills:samples.slice(0,2)});
 assert.deepEqual(r.updates,[{id:'a',level:2},{id:'b',level:1}]);
 assert.throws(()=>validateBaggageChoice({bagId:'baggage-11',mode:'skills',skills:[samples[0],samples[0]]}),/different/);
 assert.throws(()=>validateBaggageChoice({bagId:'baggage-11',mode:'skills',skills:[samples[0],samples[2]]}),/acuity/);
 assert.throws(()=>validateBaggageChoice({bagId:'baggage-11',mode:'skills',skills:[samples[0],samples[3]]}),/level 2/);
});
test('permanent loss and Ego zero are separate clinically significant Core events',()=>{
 const base={system:{resources:{ego:{value:7,max:20}},egoPermanentLoss:5}};
 assert.deepEqual(inspectEgo(base),{remaining:7,permanent:5,recoverableMax:15,critical:false,fragRisk:false});
 base.system.egoPermanentLoss=8;assert.equal(inspectEgo(base).fragRisk,true);
 base.system.resources.ego.value=0;assert.equal(inspectEgo(base).critical,true);
});
