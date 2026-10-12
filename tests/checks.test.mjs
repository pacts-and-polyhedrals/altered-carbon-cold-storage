/** Check call-outs → GM Control, and journal theming. Mocked Foundry; live QA still required. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setSystemImporter} from '../system-bridge.mjs';
const checks=await import('../checks.mjs');
const theme=await import('../journal-theme.mjs');
const journals=JSON.parse(fs.readFileSync(new URL('../content-src/journals.json',import.meta.url),'utf8'));

test('every "Skill or Skill Dn" call-out in the GM chapters becomes a check chip',()=>{
 let total=0;
 for(const e of journals){
  const out=checks.markChecks(e.body,e.id),found=[...out.matchAll(/@CSCheck\[([^\]|]+)\|(\d)\|([^\]]*)\]\{([^}]+)\}/g)];total+=found.length;
  for(const [,skills,d,src,label] of found){
   for(const s of skills.split(';'))assert.ok(checks.CORE_SKILLS.includes(s),`${e.id}: ${s}`);
   assert.equal(src,e.id);assert.ok(Number(d)<=5);assert.ok(e.body.includes(label),`${e.id}: label must be the authored text`);
  }
  // Nothing else changes: removing the markup restores the authored text exactly.
  assert.equal(out.replace(/@CSCheck\[[^\]]+\]\{([^}]+)\}/g,'$1'),e.body,e.id);
  assert.doesNotMatch(out,/<[^>]*@CSCheck/,`${e.id}: never inside a tag`);assert.doesNotMatch(out,/\[\[[^\]]*@CSCheck/,`${e.id}: never inside a journal link`);
 }
 assert.ok(total>=31,`${total} checks`);
});
test('specific chapters keep their exact difficulties and alternatives',()=>{
 const g=id=>checks.markChecks(journals.find(e=>e.id===id).body,id);
 assert.match(g('G09'),/@CSCheck\[Bureaucracy;Diplomacy\|0\|G09\]\{Bureaucracy or Diplomacy D0\}/);
 assert.match(g('G09'),/@CSCheck\[Expression\|1\|G09\]/);
 assert.match(g('G19'),/@CSCheck\[Mechanics;Engineering;Digital Networking\|0\|G19\]/);
 assert.match(g('G20'),/@CSCheck\[Diplomacy;Bureaucracy;Data Analysis\|1\|G20\]/);
 assert.match(g('G04'),/@CSCheck\[Composure;Discipline\|0\|G04\]/);
});
test('GM chip links each Skill; player chip is inert text',()=>{
 const data={skills:'Bureaucracy;Diplomacy',difficulty:1,source:'G09',label:'Bureaucracy or Diplomacy D1'};
 const gm=checks.checkChipHTML(data,{isGM:true}),pl=checks.checkChipHTML(data,{isGM:false});
 assert.equal((gm.match(/class="cs-check-skill"/g)||[]).length,2);assert.match(gm,/data-cs-skill="Diplomacy" data-cs-difficulty="1"/);assert.match(gm,/cs-check-open/);
 assert.doesNotMatch(pl,/cs-check-skill|cs-check-open|data-cs-skill=/);assert.match(pl,/Bureaucracy or Diplomacy D1/);
 assert.doesNotMatch(checks.checkChipHTML({...data,label:'<img src=x onerror=1>'},{isGM:true}),/<img/);
});
test('the GM Control request carries only player-safe text',()=>{
 const f=checks.checkRequestFields({skill:'Read Person',difficulty:1});
 assert.deepEqual(f,{customTitle:'Read Person Check',customSkill:'Read Person',customDifficulty:'1',customBonus:'0',customBaseTR:'',customDiceCount:'0',customDie:'skill',customPrompt:'Make a Read Person check (Difficulty 1).',customNote:''});
});
test('clicking a Skill opens GM Control pre-filled with the active pregens selected',async()=>{
 const rendered=[];
 class FakePanel{constructor(){this.element={querySelector:()=>({scrollIntoView(){},classList:{add(){},remove(){}}})};}_rememberState(){}async render(o){rendered.push({fields:this._fieldState,ids:this._selectedIds,o});return this;}}
 setSystemImporter(async f=>{assert.equal(f,'gm-tools.mjs');return {ACGMPanel:FakePanel};});
 globalThis.requestAnimationFrame=f=>f();
 globalThis.foundry={applications:{instances:new Map()}};
 const actor=(id,src,type='character')=>({id,type,getFlag:(m,k)=>k==='sourceId'?src:undefined});
 globalThis.game={user:{isGM:true},settings:{get:(m,k)=>k==='activePregens'?['PC01','PC02']:undefined},actors:[actor('a1','PC01'),actor('a2','PC02'),actor('a3','PC03'),actor('t1','ADV01','threat')]};
 const app=await checks.openCheckInGMControl({skill:'Diplomacy',difficulty:0,source:'G09'});
 assert.equal(rendered.length,1);assert.equal(rendered[0].fields.customSkill,'Diplomacy');assert.equal(rendered[0].fields.customDifficulty,'0');assert.deepEqual(rendered[0].ids,['a1','a2']);
 // An already-open panel is reused and keeps the GM's recipient choice.
 app._selectedIds=['a3'];globalThis.foundry.applications.instances.set('ac-gm-panel',app);
 await checks.openCheckInGMControl({skill:'Expression',difficulty:1});
 assert.equal(rendered[1].fields.customSkill,'Expression');assert.deepEqual(rendered[1].ids,['a3']);
 await assert.rejects(checks.openCheckInGMControl({skill:'Lockpicking'}),/Unknown Skill/);
 globalThis.game.user.isGM=false;await assert.rejects(checks.openCheckInGMControl({skill:'Diplomacy'}),/Only the GM/);
});
test('only Cold Storage journals receive the Altered Carbon journal theme',()=>{
 const cls=()=>{const s=new Set(['theme-light']);return {add:(...a)=>a.forEach(x=>s.add(x)),remove:x=>s.delete(x),has:x=>s.has(x)};};
 const entry={documentName:'JournalEntry',flags:{'cold-storage':{sourceId:'G09',bookCategory:'gm'}}};
 const el={classList:cls(),dataset:{}};assert.ok(theme.themeJournalElement({document:entry},el));
 assert.ok(el.classList.has('cs-journal-sheet'));assert.ok(el.classList.has('theme-dark'));assert.ok(!el.classList.has('theme-light'));assert.equal(el.dataset.csCategory,'gm');
 const page={documentName:'JournalEntryPage',parent:entry};assert.ok(theme.themeJournalElement({document:page},{classList:cls(),dataset:{}}));
 const other={classList:cls(),dataset:{}};assert.ok(!theme.themeJournalElement({document:{documentName:'JournalEntry',flags:{}}},other));assert.ok(other.classList.has('theme-light'));
 assert.ok(!theme.themeJournalElement({document:{documentName:'Actor',flags:{'cold-storage':{sourceId:'PC01'}}}},{classList:cls(),dataset:{}}));
});
