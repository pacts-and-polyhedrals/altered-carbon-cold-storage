/** Altered Carbon RPG 2.4.0 test harness.
 * By default the module is tested against small stubs that follow the 2.4.0 helper contracts.
 * Set AC_SYSTEM_PATH to a checkout of altered-carbon-rpg-foundry v2.4.0 to run the same tests
 * against the real system helper modules and data catalogs (recommended before every release):
 *   AC_SYSTEM_PATH=../altered-carbon-rpg-foundry npm test
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {setSystemImporter} from '../../system-bridge.mjs';

export const SYSTEM_PATH=process.env.AC_SYSTEM_PATH?path.resolve(process.env.AC_SYSTEM_PATH):null;
export const usingRealSystem=Boolean(SYSTEM_PATH);

const BAGGAGE_CHOICES={'baggage-10':{name:'Trauma',attribute:'willpower',formula:'2d6'},'baggage-11':{name:'Personality Frag',attribute:'acuity',formula:'2d6'},'baggage-12':{name:'Compromised DHF',attribute:'intelligence',formula:'2d6'}};
const stubs={
 'baggage-workflow.mjs':{
  BAGGAGE_CHOICES,
  async resolveBaggage(actor,baggage,{choice='skills',skillIds=[]}={}){
   if(!game.user?.isGM)throw new Error('Only the GM can confirm a published Baggage consequence.');
   const rule=BAGGAGE_CHOICES[baggage.system.catalogId];if(!rule)throw new Error('No deterministic Baggage choice is authored for this entry.');
   if(baggage.system.resolved)throw new Error('This Baggage has already been resolved; do not apply the consequence again.');
   let damage=0;
   if(choice==='ego'){damage=Number((await new Roll(rule.formula).evaluate()).total||0);await actor.applyEgoDamage(damage);}
   else await actor.updateEmbeddedDocuments('Item',skillIds.map(id=>({_id:id,'system.level':actor.items.find(i=>i.id===id).system.level-1})));
   await baggage.update({'system.resolved':true,'system.resolutionChoice':choice,'system.resolutionSkillIds':JSON.stringify(skillIds),'system.resolutionEgoLoss':damage});
   return {choice,damage,resolved:true};
  }
 },
 'creator-build.mjs':{
  creatorCommonality(archetype,tree,age,variant='standard'){
   const common={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};
   const anomaly={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};
   if(archetype==='Civilian'&&tree==='Citizenship')return'common';if(tree==='Praxis'&&Number(age)>100)return'common';
   if(common[archetype]===tree)return'common';if(anomaly[archetype]===tree)return'anomaly';return'uncommon';
  },
  packageEntitlements(archetype,packageName,reference){
   const gear=String(reference?.archetypes?.[archetype]?.packages?.[packageName]?.gear||'');
   return gear.split(';').map(s=>s.trim()).filter(Boolean).map((source,i)=>{
    const ip=source.match(/^\+(\d+)\s+IP$/i);if(ip)return{id:`ent-${i}`,source,kind:'influence',quantity:Number(ip[1]),label:source};
    const cr=source.match(/^(?:(\d+)x\s+)?Credits?\s+Lv\.?\s*(\d+)$/i);if(cr)return{id:`ent-${i}`,source,kind:'credits',quantity:Number(cr[1]||1),level:Number(cr[2]),label:source};
    if(/Network/i.test(source))return{id:`ent-${i}`,source,kind:'network',quantity:1,organisation:source.replace(/\s*Network\s*/i,''),label:source};
    return{id:`ent-${i}`,source,kind:'manual-choice',quantity:1,label:source};
   });
  },
  compileStartingPackage(entitlements){
   const items=[];let influenceBonus=0;
   for(const e of entitlements){
    if(e.kind==='influence'){influenceBonus+=e.quantity;continue;}
    if(e.kind==='credits')for(let i=0;i<e.quantity;i++)items.push({name:`Credits Lv.${e.level} — Package ${e.id} #${i+1}`,type:'creditSet',system:{value:e.level},flags:{'altered-carbon-rpg':{packageEntitlement:true}}});
    if(e.kind==='network')items.push({name:`${e.organisation} Network`,type:'network',system:{organization:e.organisation,level:1},flags:{'altered-carbon-rpg':{packageEntitlement:true}}});
   }
   return{items,influenceBonus,requiresReview:0};
  }
 },
 'core-trait-effects.mjs':{serializedCoreTraitRules:id=>JSON.stringify(id==='trait-001'?[{key:'stub'}]:[])},
 'rolls.mjs':{async rollSkill(){return {blocked:false,success:true};}}
};

export function installSystemImporter(){
 setSystemImporter(async file=>{
  if(SYSTEM_PATH)return import(pathToFileURL(path.join(SYSTEM_PATH,'module',file)).href);
  if(!stubs[file])throw new Error(`No stub for ${file}`);return stubs[file];
 });
}
/** gm-content adversaryDocuments: real module when available, otherwise a contract stub. */
export async function gmContent(){
 if(SYSTEM_PATH)return import(pathToFileURL(path.join(SYSTEM_PATH,'module','gm-content.mjs')).href);
 return {adversaryDocuments(entry,skills){
  if(skills.length!==32)throw new Error('The complete 32-Skill Core catalogue is required.');
  return {actor:{name:entry.name,type:'threat',system:{identity:{publicName:entry.name,archetype:entry.category},morale:5},flags:{'altered-carbon-rpg':{adversarySourceId:entry.id}}},
   items:skills.map(s=>({name:s.name,type:'skill',system:{attribute:s.attribute,level:2,catalogId:`${entry.id}:${s.id}`}}))};
 }};
}
export async function rulesEngine(){
 if(SYSTEM_PATH)return import(pathToFileURL(path.join(SYSTEM_PATH,'module','rules-engine.mjs')).href);
 return {ageResources:()=>({egoPoints:20,influencePoints:2,stackPoints:11}),SLEEVE_LIMITS:{organic:{techCapacity:0},'synthetic-mid':{techCapacity:4},other:{techCapacity:0}}};
}
/** System data catalog reader: real JSON when available, otherwise null so tests supply fixtures. */
export async function systemData(file){
 if(!SYSTEM_PATH)return null;
 return JSON.parse(await fs.readFile(path.join(SYSTEM_PATH,'data',file),'utf8'));
}
