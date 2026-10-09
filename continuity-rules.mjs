/** Cold Storage 1.2: deterministic, platform-independent continuity and Baggage.
 * Fray is HOUSE RULE; all EP and Baggage categories use 2020 Core distinctions.
 */
export const PULSE_IDS=Object.freeze(['ward','contact','court','broadcast','core']);
export const PULSES=Object.freeze({ward:'First dislocation in the ward',contact:'Verified historical-contact contradiction',court:'Court memory node',broadcast:'Last Broadcast memory node',core:'Three-voice continuity challenge'});
export const ANCHORS=Object.freeze({anansi:'Anansi House',prefinale:'Before the final operation'});
export const BAGGAGE=Object.freeze({
 'baggage-11':{name:'Personality Frag',attribute:'acuity',choice:'Downgrade two Acuity Skills one level or lose EP2d6',core:'2020 Core p.76'},
 'baggage-12':{name:'Compromised DHF',attribute:'intelligence',choice:'Downgrade two Intelligence Skills one level or lose EP2d6',core:'2020 Core p.76'},
 'baggage-10':{name:'Trauma',attribute:'willpower',choice:'Downgrade two Willpower Skills one level or lose EP2d6',core:'2020 Core p.76'}
});
export const SCENARIO_VERSION='1.2.0';
const bounded=n=>Math.max(0,Math.min(6,Math.trunc(Number(n)||0)));
export function initialFray(ordinal){if(![5,6,7,8].includes(Number(ordinal)))throw new Error('Cold Storage sleeve ordinal must be 5-8.');return Number(ordinal)-3;}
export function normaliseContinuityState(state={}){const s=state&&typeof state==='object'?state:{};return {pcs:s.pcs&&typeof s.pcs==='object'?s.pcs:{}};}
export function newCharacterState(ordinal){return {pulses:{},anchors:{},shelterUsed:false,overreachScenes:[],fractureHistory:[],treatmentHistory:[],optOut:false,createdForOrdinal:Number(ordinal)};}
export function recordPulse(character,fray,{id,response,success=null}={}){
 if(!PULSE_IDS.includes(id))throw new Error('Unknown continuity pulse.');
 if(character.optOut)throw new Error('Character opted out of Fray; no pulse is allowed.');
 if(character.pulses?.[id])throw new Error('This scheduled pulse has already been resolved for this character.');
 if(bounded(fray)===6)throw new Error('Resolve Fray 6 before another risky memory check.');
 if(!['stay','echo','veil'].includes(response))throw new Error('Unknown memory response.');
 if(response==='stay'&&typeof success!=='boolean')throw new Error('A Composure / Discipline result is required for Stay Present.');
 const next=response==='echo'||(response==='stay'&&!success)?bounded(fray+1):bounded(fray);
 const check=response==='stay'?{skill:'Composure (realspace) or Discipline (Virtual)',difficulty:Number(fray)>=4?1:0}:null;
 return {fray:next,atFracture:next===6,character:{...character,pulses:{...(character.pulses||{}),[id]:{response,success:response==='stay'?success:null,frayBefore:fray,frayAfter:next}}},check};
}
export function useAnchor(character,fray,id){
 if(!(id in ANCHORS))throw new Error('Unknown grounding opportunity.');
 if(character.optOut)throw new Error('Character opted out of Fray.');
 if(character.anchors?.[id])throw new Error('This grounding opportunity was already used.');
 if(fray<1)throw new Error('Fray is already zero; the opportunity remains unused.');
 const next=bounded(fray-1);return {fray:next,character:{...character,anchors:{...(character.anchors||{}),[id]:true}}};
}
export function resolveFracture(character,fray,{choice,agreed=false,heat=1,notes=''}={}){
 if(character.optOut)throw new Error('Character opted out of Fray.');
 if(Number(fray)!==6)throw new Error('Resolve a fracture only at Fray 6.');
 if(!agreed)throw new Error('The player must agree to the proposed identity consequence.');
 if(!['integration','partition','shelter'].includes(choice))throw new Error('Unknown fracture choice.');
 if(choice==='shelter'&&character.shelterUsed)throw new Error('Shelter can only be used once.');
 if(!String(notes).trim())throw new Error('Record the player-authored choice in the continuity log.');
 const hasHeat=choice==='shelter'&&Number(heat)<6;
 return {fray:choice==='integration'?3:4,heatDelta:hasHeat?1:0,requiresGMConcession:choice==='shelter'&&!hasHeat,
   egoFormula:choice==='partition'?'1d6':null,
   character:{...character,shelterUsed:character.shelterUsed||choice==='shelter',overreachBlocked:character.overreachBlocked||choice==='partition',
    fractureHistory:[...(character.fractureHistory||[]),{choice,notes:String(notes),frayBefore:6,frayAfter:choice==='integration'?3:4}]}};
}
export function recordOverreach(character,fray,{scene,agreed=false,benefit=''}={}){
 if(character.optOut)throw new Error('Character opted out of Fray.');
 if(character.overreachBlocked)throw new Error('Partition prevents further overreach tonight.');
 if(Number(fray)>=6)throw new Error('Resolve the current fracture first.');
 if(!agreed||!String(benefit).trim())throw new Error('Explain the optional risk and concrete benefit before proceeding.');
 if(!scene||character.overreachScenes?.includes(scene))throw new Error('Only one voluntary overreach per character per scene.');
 return{fray:bounded(fray+2),atFracture:fray+2>=6,egoFormula:'1d6',character:{...character,overreachScenes:[...(character.overreachScenes||[]),scene]}};
}
export function availableBaggage(itemIds){return [...new Set(itemIds||[])].filter(id=>id in BAGGAGE);}
export function eligibleSkills(skills,bagId){const b=BAGGAGE[bagId];if(!b)throw new Error('Unrecognised Core Baggage.');return skills.filter(s=>s.type==='skill'&&s.system?.attribute===b.attribute&&Number(s.system?.level)>1);}
export function validateBaggageChoice({bagId,mode,skills=[],resolved={}}){
 if(!(bagId in BAGGAGE))throw new Error('Unknown Baggage.');
 if(resolved?.[bagId])throw new Error('This Baggage has already been resolved.');
 if(mode==='ep')return{mode,formula:'2d6',attribute:BAGGAGE[bagId].attribute};
 if(mode!=='skills')throw new Error('Choose two Skill downgrades or EP loss.');
 if(skills.length!==2||new Set(skills.map(x=>x.id)).size!==2)throw new Error('Choose two different Skills.');
 const attribute=BAGGAGE[bagId].attribute;
 for(const skill of skills)if(skill.type!=='skill'||skill.system?.attribute!==attribute||Number(skill.system.level)<=1)throw new Error(`Choose Skills of ${attribute} with level 2 or higher.`);
 return{mode,formula:null,attribute,updates:skills.map(i=>({id:i.id,level:Number(i.system.level)-1}))};
}
export function inspectEgo(actor){const r=actor?.system?.resources?.ego||{};const remaining=Math.max(0,Number(r.value)||0);const permanent=Math.max(0,Number(actor?.system?.egoPermanentLoss)||0);const total=Math.max(0,Number(r.max)||0);return{remaining,permanent,recoverableMax:Math.max(0,total-permanent),critical:remaining===0,fragRisk:permanent>remaining};}
export function verifyHistory(pregens,sleeves,plans){
 const errors=[];const planMap=new Map(plans.map(x=>[x.pcId,x]));
 for(const p of pregens){const plan=planMap.get(p.id);if(!plan){errors.push(`Missing plan: ${p.id}`);continue;}
 const all=sleeves.filter(s=>s.pcId===p.id),verified=all.filter(s=>s.continuityStatus!=='disputed');
 if(plan.ordinal!==verified.length+1||plan.ordinal!==p.currentSleeveOrdinal)errors.push(`${p.id}: sleeve ordinal inconsistent with confirmed history.`);
 if((p.currentSleeve.type||'').includes('clone'))errors.push(`${p.id}: clone violates non-clone requirement.`);
 if(!verified.length||verified.at(-1)?.years?.[1]!==2274&&Math.max(...verified.map(s=>s.years[1]))!==2274)errors.push(`${p.id}: 2274 continuity break.`);
 if(plan.disputedArchives.some(id=>!all.some(s=>s.id===id&&s.continuityStatus==='disputed')))errors.push(`${p.id}: missing contested archive.`);
 }
 return errors;
}
