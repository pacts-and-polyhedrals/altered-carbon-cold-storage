/** GM-only continuity operations for Cold Storage 1.3.0 + Altered Carbon RPG 2.4.0.
 * Never resolves medical treatment by inventing Core results. All Fray effects are
 * optional player-agreed Cold Storage house rules, distinct from actual Ego loss.
 */
import {
 ANCHORS,BAGGAGE,PULSES,PULSE_IDS,SCENARIO_VERSION,initialFray,newCharacterState,
 normaliseContinuityState,recordPulse,useAnchor,resolveFracture,
 recordOverreach,validateBaggageChoice,eligibleSkills,inspectEgo,verifyHistory
} from './continuity-rules.mjs';
import {baggageWorkflow,rolls,REQUIRED_SYSTEM} from './system-bridge.mjs';
const MOD='cold-storage';
const api=()=>foundry.applications.api;
const esc=x=>foundry.utils.escapeHTML(String(x??''));
const clone=x=>foundry.utils.deepClone(x);
const get=(form,key)=>form instanceof FormData?form.get(key):form?.[key];
const checked=(form,key)=>form instanceof FormData?form.has(key):Boolean(form?.[key]);
const values=coll=>coll?.contents||[...(coll||[])];
const sourceId=doc=>doc?.getFlag?.(MOD,'sourceId')||doc?.flags?.[MOD]?.sourceId;
const assertGM=()=>{if(!game.user?.isGM)throw new Error('Only a GM may manage Cold Storage continuity.');};
const safeInteger=(v,max=100)=>{const n=Number(v);if(!Number.isInteger(n)||n<0||n>max)throw new Error('Invalid numeric input.');return n;};
let busy=false;
async function guarded(action){if(busy)throw new Error('Another continuity update is in progress.');busy=true;try{return await action();}finally{busy=false;}}
async function read(name){const r=await fetch(`modules/${MOD}/content-src/${name}`);if(!r.ok)throw new Error(`Could not read continuity ${name}`);return r.json();}
const byId=id=>game.actors.find(a=>sourceId(a)===id);
const settings=()=>normaliseContinuityState(game.settings.get(MOD,'continuityState'));
const bookState=()=>clone(game.settings.get(MOD,'bookState'));
const pcState=(state,id,ordinal)=>clone(state.pcs[id]??newCharacterState(ordinal));
async function saveCharacter(id,character,fray=null,heatDelta=0){
 const oldState=settings(),oldBook=bookState(),newState=clone(oldState),newBook=clone(oldBook);
 newState.pcs[id]=character;
 if(fray!==null){newBook.fray??={};newBook.fray[id]=fray;}
 if(heatDelta)newBook.heat=Math.min(6,Math.max(0,Number(newBook.heat||0)+heatDelta));
 await game.settings.set(MOD,'continuityState',newState);
 try{if(fray!==null||heatDelta)await game.settings.set(MOD,'bookState',newBook);}
 catch(error){await game.settings.set(MOD,'continuityState',oldState);throw error;}
 return{character,fray,heat:newBook.heat};
}
function activeIds(){const ids=game.settings.get(MOD,'activePregens')||[];return Array.isArray(ids)?ids:[];}
function clinical(){if(game.system.id!=='altered-carbon-rpg'||!game.alteredCarbon?.ClinicalRules)throw new Error(`Requires Altered Carbon RPG ${REQUIRED_SYSTEM} with Clinical Rules.`);return game.alteredCarbon.ClinicalRules;}
async function clinicalLoss(actor,formula,context){
 if(!actor?.applyEgoDamage)throw new Error('Selected Actor cannot apply Core Ego damage.');
 const roll=await new Roll(formula).evaluate();const raw=Math.max(0,Number(roll.total||0));
 const amount=clinical().egoDamageAfterReduction(raw,{willpowerBonus:Number(actor.ac?.bonuses?.willpower??Math.floor(Number(actor.system.attributes.willpower||0)/10)),disciplineDegrees:0});
 await actor.applyEgoDamage(amount);
 return {raw,amount,context,formula};
}
async function clinicalMessage(actor,title,detail){
 const fn=game.alteredCarbon?.ClinicalWorkflow?.clinicalMessage;
 if(fn)return fn(actor,title,detail,{kind:'COLD STORAGE / HOUSE RULE'});
 if(ChatMessage?.implementation?.create)return ChatMessage.implementation.create({speaker:ChatMessage.getSpeaker({actor}),content:`<p><strong>${esc(title)}</strong></p><p>${esc(detail)}</p>`});
}
// Messages are secondary to saved state; a chat failure must not appear as a failed transaction.
async function bestEffortClinicalMessage(actor,title,detail){
 try{await clinicalMessage(actor,title,detail);}catch(error){console.warn('Cold Storage: status was saved but the chat summary failed',error);}
}
async function egoImpactAndSave(actor,formula,context,commit){
 const before=Number(actor.system.resources.ego.value),beforeState=actor.system.egoState;
 const loss=await clinicalLoss(actor,formula,context);
 try{await commit();}
 catch(error){
  try{await actor.update({'system.resources.ego.value':before,'system.egoState':beforeState});}
  catch(rollback){console.error('Cold Storage: Ego rollback failed; GM must check the actor before retrying',rollback);}
  throw error;
 }
 return loss;
}
export function registerContinuity(){
 game.settings.register(MOD,'continuityState',{scope:'world',config:false,type:Object,default:{pcs:{}}});
 game.settings.registerMenu(MOD,'continuity',{name:'Cold Storage - Continuity & Psychosurgery',label:'Open Continuity Console',hint:'GM-only Fray checks, published Baggage choices, sleeve history and treatment links. Never applies starting penalties automatically.',icon:'fa-solid fa-brain',type:ColdStorageContinuityConsole,restricted:true});
}
/** Fresh game initialization: initializes *only* adventure house-rule state.
 * Existing Fray and clinical/Actor data remain untouched. No Baggage is charged.
 */
export async function initializeContinuity({freshWorld=false}={}){
 assertGM();const {plans}=await read('continuity-plans.json');const state=settings(),book=bookState();let newState=clone(state),newBook=clone(book),changed=false;
 for(const plan of plans){if(!newState.pcs[plan.pcId]){newState.pcs[plan.pcId]=newCharacterState(plan.ordinal);changed=true;}
  newBook.fray??={};if(newBook.fray[plan.pcId]==null){newBook.fray[plan.pcId]=initialFray(plan.ordinal);changed=true;}}
 if(changed){await game.settings.set(MOD,'continuityState',newState);await game.settings.set(MOD,'bookState',newBook);}
 return {initialised:changed,characters:plans.length,freshWorld};
}
export async function performPulse(pcId,{pulse,response,success=null}={}){
 assertGM();return guarded(async()=>{const actor=byId(pcId);if(!actor)throw new Error('Import this PC before running continuity checks.');
  const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId);if(!plan)throw new Error('Unrecognised character.');
  const state=settings(),character=pcState(state,pcId,plan.ordinal),fray=Number(bookState().fray?.[pcId]??plan.startingFray);
  const result=recordPulse(character,fray,{id:pulse,response,success});await saveCharacter(pcId,result.character,result.fray);
  await bestEffortClinicalMessage(actor,'Continuity pulse',`${PULSES[pulse]}: ${response}; Fray ${fray} -> ${result.fray}. Fray is an optional adventure track and does not change Ego.`);
  return result;
 });
}
export async function performAnchor(pcId,id){assertGM();return guarded(async()=>{const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId),actor=byId(pcId);if(!plan||!actor)throw new Error('Import the PC first.');
 const character=pcState(settings(),pcId,plan.ordinal),fray=Number(bookState().fray?.[pcId]??plan.startingFray),result=useAnchor(character,fray,id);
 await saveCharacter(pcId,result.character,result.fray);await bestEffortClinicalMessage(actor,'Grounding',`${ANCHORS[id]}; Fray ${fray} -> ${result.fray}. Ego unchanged.`);return result;});}
export async function performFracture(pcId,{choice,notes,agreed=false}={}){
 assertGM();return guarded(async()=>{const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId),actor=byId(pcId);if(!plan||!actor)throw new Error('Import the PC first.');
 const char=pcState(settings(),pcId,plan.ordinal),book=bookState(),fray=Number(book.fray?.[pcId]??plan.startingFray);
 const result=resolveFracture(char,fray,{choice,notes,agreed,heat:book.heat});
 // Apply the Core Ego impact first; if it fails the Fray transition is not committed.
 let loss=null;if(result.egoFormula)loss=await egoImpactAndSave(actor,result.egoFormula,'Partition after player-agreed fracture',()=>saveCharacter(pcId,result.character,result.fray,result.heatDelta));
 else await saveCharacter(pcId,result.character,result.fray,result.heatDelta);
 await bestEffortClinicalMessage(actor,'Fray fracture',`${choice}: Fray 6 -> ${result.fray}. ${result.requiresGMConcession?'Heat was capped; record a custody/evacuation concession.':''} ${loss?`Ego -${loss.amount}.`:''} Player statement: ${notes}`);
 return {...result,loss};
 });
}
export async function performOverreach(pcId,{scene,benefit,agreed=false}={}){
 assertGM();return guarded(async()=>{const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId),actor=byId(pcId);if(!plan||!actor)throw new Error('Import the PC first.');
 const ch=pcState(settings(),pcId,plan.ordinal),fray=Number(bookState().fray?.[pcId]??plan.startingFray),result=recordOverreach(ch,fray,{scene,benefit,agreed});
 const loss=await egoImpactAndSave(actor,result.egoFormula,'Voluntary deep recall',()=>saveCharacter(pcId,result.character,result.fray));
 await bestEffortClinicalMessage(actor,'Voluntary recall',`${scene}: +2 Fray; Ego -${loss.amount}. Benefit: ${benefit}.`);return {...result,loss};});
}
export async function optOut(pcId,optOut=true){assertGM();return guarded(async()=>{const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId);if(!plan)throw new Error('Unknown pregen.');const ch=pcState(settings(),pcId,plan.ordinal);ch.optOut=Boolean(optOut);await saveCharacter(pcId,ch);return ch;});}
/** Official Baggage decision, delegated to the Altered Carbon 2.4 Baggage workflow so the
 * character sheet and this console share one resolution record (Item system.resolved).
 * Never run without GM authorization and an explicit acknowledgement of existing data.
 */
const bagResolved=(actor,bag,bagId)=>Boolean(bag?.system?.resolved||actor?.getFlag?.(MOD,'baggageResolutions')?.[bagId]);
export async function resolveCoreBaggage(pcId,bagId,{mode,skillIds=[],acknowledged=false}={}){
 assertGM();return guarded(async()=>{
 if(!acknowledged)throw new Error('Confirm this Baggage has not already been resolved in the starting statistics.');
 const actor=byId(pcId);if(!actor)throw new Error('Import the PC first.');
 const bag=values(actor.items).find(i=>i.type==='baggage'&&i.system?.catalogId===bagId);if(!bag)throw new Error('This character does not have that published Baggage Item.');
 const prior=clone(actor.getFlag(MOD,'baggageResolutions')||{});
 if(bagResolved(actor,bag,bagId))throw new Error('This Baggage has already been resolved; do not apply the consequence again.');
 const skills=skillIds.map(id=>values(actor.items).find(i=>i.type==='skill'&&i.id===id));
 validateBaggageChoice({bagId,mode,skills,resolved:prior});
 const {resolveBaggage}=await baggageWorkflow();
 const result=await resolveBaggage(actor,bag,{choice:mode==='ep'?'ego':'skills',skillIds:mode==='skills'?skillIds:[]});
 // Audit marker for v1.2 worlds; the authoritative record is the Baggage Item itself.
 const marker=mode==='skills'?{mode:'skills',skillIds,source:'Core 2020 p.76'}:{mode:'ep',raw:result.damage,damage:result.damage,source:'Core 2020 p.76',permanent:false};
 try{await actor.update({[`flags.${MOD}.baggageResolutions`]:{...prior,[bagId]:marker}});}catch(error){console.warn('Cold Storage: Baggage resolved on the sheet; legacy audit flag not written',error);}
 return mode==='skills'?{mode:'skills',skills:skillIds}:{mode:'ep',raw:result.damage,damage:result.damage,remaining:Number(actor.system.resources.ego.value)};
 });
}
export async function recordTreatment(pcId,{note,kind='follow-up',frayChange=0}={}){
 assertGM();return guarded(async()=>{if(!String(note||'').trim())throw new Error('Provide the outcome and consent status.');if(frayChange!==0)throw new Error('Clinical treatment does not automatically modify Fray; use a published grounding or player-approved fracture instead.');
 const {plans}=await read('continuity-plans.json'),plan=plans.find(p=>p.pcId===pcId);if(!plan)throw new Error('Unknown pregen.');const actor=byId(pcId);if(!actor)throw new Error('Import the PC first.');
 const ch=pcState(settings(),pcId,plan.ordinal);ch.treatmentHistory??=[];ch.treatmentHistory.push({kind,note:String(note),egoAtRecord:inspectEgo(actor)});await saveCharacter(pcId,ch);return ch;});
}

/** Explicit old-world reconciliation. Does not rewrite actor resources or old links.
 * Review first, back up, then confirm; never run implicitly on book-only upgrade.
 */
export async function previewContinuityMigration(){
 assertGM();const [pregens,past,{plans}]=await Promise.all(['pregens.json','previous-sleeves.json','continuity-plans.json'].map(read));
 const errors=verifyHistory(pregens,past,plans);if(errors.length)throw new Error(errors.join('; '));
 const actions=[];
 for(const plan of plans){const actor=byId(plan.pcId);if(!actor){actions.push({pcId:plan.pcId,operation:'no-actor',description:'Import PC in a fresh world to install.'});continue;}
 const active=values(actor.items).find(i=>sourceId(i)===plan.activeSleeveId);
 if(!active||active.system?.status!=='active'){actions.push({pcId:plan.pcId,operation:'skip-active',description:'Different current sleeve: this Actor is played or has changed bodies. No actor edits or archived Item additions will be applied.'});continue;}
 if(active.system.sleeveType!==plan.activeSleeveType)actions.push({pcId:plan.pcId,operation:'update-source-sleeve',itemId:active.id,description:`Source-controlled active sleeve: ${active.system.sleeveType} -> ${plan.activeSleeveType}; do not change Strength, Perception, HP, Ego or inventory.`});
 for(const sid of plan.confirmedSleeves){if(!values(actor.items).some(i=>sourceId(i)===sid)){actions.push({pcId:plan.pcId,operation:'add-history',sourceId:sid,description:'Add a missing source historical Sleeve Item without touching existing Items.'});}}
 for(const sid of plan.disputedArchives){const it=values(actor.items).find(i=>sourceId(i)===sid);if(it&&!it.getFlag(MOD,'unverifiedArchive'))actions.push({pcId:plan.pcId,operation:'mark-disputed',itemId:it.id,sourceId:sid,description:'Mark a contested archive; retain text, relationships and item ID.'});}
 }
 return {actions,plans,sourceSleeves:past,requiresBackup:true};
}
export async function applyContinuityMigration({confirmed=false}={}){
 assertGM();return guarded(async()=>{if(!confirmed)throw new Error('Back up your world and explicitly confirm migration.');const preview=await previewContinuityMigration();
 const all=new Map(preview.sourceSleeves.map(s=>[s.id,s]));const plans=new Map(preview.plans.map(p=>[p.pcId,p]));let changed=0,skipped=0,errors=[];
 for(const action of preview.actions){const actor=byId(action.pcId);if(!actor){skipped++;continue;}
  try{
   if(action.operation==='update-source-sleeve'){const p=plans.get(action.pcId),it=values(actor.items).find(i=>i.id===action.itemId);if(!it||it.system.status!=='active'){skipped++;continue;}
    const orig=(await read('pregens.json')).find(pc=>pc.id===action.pcId);
    await it.update({'system.sleeveType':p.activeSleeveType,'system.appearance':orig.currentSleeve.concept,[`flags.${MOD}.sourceContinuityVersion`]:SCENARIO_VERSION});changed++;
   }else if(action.operation==='add-history'){
    const s=all.get(action.sourceId);if(!s||values(actor.items).some(i=>sourceId(i)===s.id)){skipped++;continue;}
    await actor.createEmbeddedDocuments('Item',[archivedRecord(s)]);changed++;
   }else if(action.operation==='mark-disputed'){
    const it=values(actor.items).find(i=>i.id===action.itemId);if(!it){skipped++;continue;}
    await it.update({'system.complications':all.get(action.sourceId)?.continuityNote||'Unverified archival claim.',[`flags.${MOD}.unverifiedArchive`]:true});changed++;
   }else skipped++;
  }catch(error){errors.push(`${action.pcId} ${action.operation}: ${error.message}`);}
 }
 await initializeContinuity();
 if(errors.length)ui.notifications.warn(`${errors.length} continuity records need review. Existing records were preserved. Check console and log.`);
 return {changed,skipped,errors,previewed:preview.actions.length};
 });
}
export function archivedRecord(s){return{name:s.name,type:'archivedSleeve',system:{status:s.continuityStatus==='disputed'?'candidate':'archived',sleeveType:'other',acquired:String(s.years[0]),lost:String(s.years[1]),lossCause:s.lossOrTransfer,complications:s.continuityNote||'',description:`<p>${esc(s.history)}</p><p><strong>Memory:</strong> ${esc(s.importantMemory)}</p><p><strong>Unresolved:</strong> ${esc(s.unresolvedConsequence)}</p>`,rulesRef:'Cold Storage 1.2: verified prelude / contested Palimpsest archive'},flags:{[MOD]:{sourceId:s.id,pcId:s.pcId,unverifiedArchive:s.continuityStatus==='disputed'}}};}

export class ColdStorageContinuityConsole extends (globalThis.foundry?.applications?.api?.HandlebarsApplicationMixin??(x=>x))(globalThis.foundry?.applications?.api?.ApplicationV2??class{}){
 static DEFAULT_OPTIONS={id:'cold-storage-continuity',classes:['altered-carbon','cold-storage','cs-app','cs-continuity-app'],window:{title:'Cold Storage — Continuity & Psychosurgery',icon:'fa-solid fa-brain'},position:{width:1050,height:800},actions:{pulse:this._pulse,anchor:this._anchor,fracture:this._fracture,overreach:this._overreach,optOut:this._optOut,baggage:this._baggage,clinical:this._clinical,migrate:this._migrate,review:this._review,recordTreatment:this._recordTreatment,openBook:this._openBook}};
 static PARTS={main:{template:'modules/cold-storage/templates/continuity.hbs'}};
 async _prepareContext(options){assertGM();const ctx=await super._prepareContext(options),{plans}=await read('continuity-plans.json'),active=new Set(activeIds()),state=settings(),book=bookState(),migration=await previewContinuityMigration();
 return {...ctx,version:SCENARIO_VERSION,hasMigration:migration.actions.some(a=>!['no-actor','skip-active'].includes(a.operation)),migrationCount:migration.actions.length,
  pcs:plans.map(p=>{const actor=byId(p.pcId),ch=pcState(state,p.pcId,p.ordinal),fray=Number(book.fray?.[p.pcId]??p.startingFray),ego=inspectEgo(actor),baggage=actor?values(actor.items).filter(i=>i.type==='baggage'&&BAGGAGE[i.system?.catalogId]).map(i=>({id:i.system.catalogId,name:i.name,choice:BAGGAGE[i.system.catalogId].choice,resolved:bagResolved(actor,i,i.system.catalogId)})):[];
   return{...p,hasActor:Boolean(actor),active:active.has(p.pcId),fray,optOut:ch.optOut,atFracture:fray===6,ego,egoState:actor?.system?.egoState||'',baggage,anchors:Object.entries(ANCHORS).map(([id,label])=>({id,label,used:Boolean(ch.anchors?.[id])})),pulses:PULSE_IDS.map(id=>({id,label:PULSES[id],resolved:Boolean(ch.pulses?.[id])})),fractures:ch.fractureHistory?.length||0,treatments:ch.treatmentHistory?.length||0};})};
 }
 async _do(fn){try{await fn();await this.render({force:true});}catch(error){console.error(error);ui.notifications.error(error.message||String(error));}}
 static async _pulse(event,target){return this._do(async()=>{const id=target.dataset.pc,pulse=target.dataset.pulse,actor=byId(id);if(!actor)throw new Error('Import PC first.');const fray=Number(bookState().fray?.[id]??3);
  const form=await api().DialogV2.input({window:{title:`Continuity pulse - ${actor.name}`},content:`<p>Player chooses how to respond. <strong>${esc(PULSES[pulse])}</strong>. Fray ${fray}. This is a HOUSE RULE, never an automatic Core Personality Frag check.</p><label>Player response</label><select name="response"><option value="stay">Stay Present - roll Composure / Discipline</option><option value="echo">Accept Echo - +1 Fray, truthful detail or concession</option><option value="veil">Veil / decline - no penalty</option></select><label><input type="checkbox" name="consent"> Player has agreed to this content and outcome</label>`});if(!form)return;
  if(!checked(form,'consent'))throw new Error('Player agreement required. Declining content never costs resources.');const response=get(form,'response');let success=null;
  if(response==='stay'){const skillName=actor.system.virtualSession?.active?'Discipline':'Composure',skill=values(actor.items).find(i=>i.type==='skill'&&i.name.toLowerCase()===skillName.toLowerCase());if(!skill)throw new Error(`Character needs ${skillName}.`);
   const {rollSkill}=await rolls();const r=await rollSkill(actor,skill,{chat:true,difficulty:fray>=4?1:0,contextLabel:`Cold Storage: ${PULSES[pulse]}`});if(r.blocked)throw new Error(r.reason||'Roll blocked.');success=Boolean(r.success);
  }
  const out=await performPulse(id,{pulse,response,success});if(out.atFracture)ui.notifications.warn(`${actor.name} reached Fray 6. Ask the player to choose an outcome before another memory pulse.`);
 });}
 static async _anchor(event,target){return this._do(async()=>{const id=target.dataset.pc,key=target.dataset.anchor;const confirmed=await api().DialogV2.confirm({window:{title:'Use one grounding opportunity?'},content:`<p>Only once: ${esc(ANCHORS[key])}. Did the PC choose a present-tense anchor and have another character witness it?</p>`});if(confirmed)await performAnchor(id,key);});}
 static async _fracture(event,target){return this._do(async()=>{const actor=byId(target.dataset.pc),form=await api().DialogV2.input({window:{title:`Fray 6 - ${esc(actor?.name)}`},content:`<p>Explain alternatives to the PLAYER. Integration resets Fray to 3; Partition resets to 4 with raw EP1d6 loss; Shelter resets to 4 and adds Heat or GM concession. No one loses ownership of their character automatically.</p><label>Chosen by player</label><select name="choice"><option value="integration">Integration</option><option value="partition">Partition</option><option value="shelter">Shelter (once)</option></select><label>Player-authored identity consequence / agreed note</label><textarea name="notes" required rows="3"></textarea><label><input type="checkbox" name="agreed"> Player explicitly agreed</label>`});if(form)await performFracture(target.dataset.pc,{choice:get(form,'choice'),notes:get(form,'notes'),agreed:checked(form,'agreed')});});}
 static async _overreach(event,target){return this._do(async()=>{const id=target.dataset.pc,form=await api().DialogV2.input({window:{title:'Voluntary Deep Recall - High Risk'},content:`<p>HOUSE RULE: +2 Fray and raw EP1d6 loss. Must supply a concrete optional advantage and never an essential clue.</p><label>Scene key</label><input name="scene" value="current-scene" required><label>Specific optional benefit</label><textarea name="benefit" required></textarea><label><input type="checkbox" name="agreed"> Player consents after warning</label>`});if(form)await performOverreach(id,{scene:get(form,'scene'),benefit:get(form,'benefit'),agreed:checked(form,'agreed')});});}
 static async _optOut(event,target){return this._do(async()=>{const id=target.dataset.pc;await optOut(id,target.dataset.enabled!=='true');});}
 static async _baggage(event,target){return this._do(async()=>{const id=target.dataset.pc,actor=byId(id),bagId=target.dataset.bag,eligible=eligibleSkills(values(actor.items),bagId);const form=await api().DialogV2.input({window:{title:`Official Baggage: ${esc(BAGGAGE[bagId].name)}`},content:`<p>${esc(BAGGAGE[bagId].choice)}. The published Core effect is separate from Fray. Do not apply again if starting statistics already reflect it.</p><label>Choice</label><select name="mode"><option value="ep">Lose EP2d6 (printed Core loss)</option><option value="skills">Downgrade two different eligible Skills</option></select><label>Skill 1</label><select name="skill1"><option value="">Choose...</option>${eligible.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (Lv.${s.system.level})</option>`).join('')}</select><label>Skill 2</label><select name="skill2"><option value="">Choose...</option>${eligible.map(s=>`<option value="${esc(s.id)}">${esc(s.name)} (Lv.${s.system.level})</option>`).join('')}</select><label><input type="checkbox" name="agreed"> GM and player checked that this Baggage was not charged already</label>`});if(!form)return;const mode=get(form,'mode'),skillIds=mode==='skills'?[get(form,'skill1'),get(form,'skill2')]:[];await resolveCoreBaggage(id,bagId,{mode,skillIds,acknowledged:checked(form,'agreed')});});}
 static async _clinical(event,target){return this._do(async()=>{const actor=byId(target.dataset.pc);if(!actor)throw new Error('Import this Actor first.');if(!game.alteredCarbon?.openClinical)throw new Error(`Install Altered Carbon RPG ${REQUIRED_SYSTEM} before opening the clinical workflow.`);game.alteredCarbon.openClinical(actor);});}
 static async _review(){return this._do(async()=>{const preview=await previewContinuityMigration(),detail=preview.actions.map(a=>`<li>${esc(a.pcId)}: ${esc(a.description)}</li>`).join('');await api().DialogV2.confirm({window:{title:'Continuity migration preview'},content:`<p>No data has been modified. Back up before using Apply.</p><ul>${detail||'<li>Nothing pending.</li>'}</ul>`});});}
 static async _migrate(){return this._do(async()=>{const preview=await previewContinuityMigration();const count=preview.actions.filter(a=>!['no-actor','skip-active'].includes(a.operation)).length;const ok=await api().DialogV2.confirm({window:{title:'Apply reviewed continuity records?'},content:`<p><strong>Back up the world first.</strong> Apply up to ${count} additive or source-controlled continuity edits? Existing player EP, SP, Skills, inventory, relationships, GM notes and journal disclosures are not reset. Current sleeves not matching the original source ID are skipped.</p>`,rejectClose:false});if(ok){const result=await applyContinuityMigration({confirmed:true});ui.notifications.info(`Continuity migration: ${result.changed} updated, ${result.skipped} skipped, ${result.errors.length} errors.`);}});}
 static async _recordTreatment(event,target){return this._do(async()=>{const id=target.dataset.pc,form=await api().DialogV2.input({window:{title:'Record treatment / clinical decision'},content:`<p>Use Altered Carbon Clinical Console to roll and apply official Psychosurgery, then record the agreed consequences here. Notes alone do not restore Ego.</p><label>Procedure type</label><select name="kind"><option value="psychosurgery">Psychosurgery</option><option value="follow-up">Deferred treatment</option><option value="none">Declined treatment</option><option value="stabilised">Stabilisation</option></select><label>Actual result and consent status</label><textarea name="note" required></textarea>`});if(form)await recordTreatment(id,{kind:get(form,'kind'),note:get(form,'note')});});}
 static async _openBook(){return this._do(async()=>game.coldStorage?.openBook?.());}
}
export const continuityAPI=()=>({openContinuity:()=>{assertGM();return new ColdStorageContinuityConsole().render({force:true});},initializeContinuity,previewContinuityMigration,applyContinuityMigration,performPulse,performAnchor,performFracture,performOverreach,optOut,resolveCoreBaggage,recordTreatment});
