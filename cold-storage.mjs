const MOD='cold-storage';
const SYS='altered-carbon-rpg';
const CURRENT_YEAR=2384;
const STORAGE_YEAR=2274;

async function loadModuleJSON(path){const r=await fetch(`modules/${MOD}/content-src/${path}`);if(!r.ok)throw new Error(`Failed to load ${path}`);return r.json();}
async function loadSystemJSON(path){const r=await fetch(`systems/${SYS}/data/${path}`);if(!r.ok)throw new Error(`Failed to load system data ${path}`);return r.json();}
async function ensureFolder(name,type,parent=null){let f=game.folders.find(x=>x.name===name&&x.type===type&&x.folder?.id===(parent?.id??null));if(!f)f=await Folder.create({name,type,folder:parent?.id??null});return f;}
function sourceId(doc){return doc.getFlag(MOD,'sourceId');}
function firstHistoricalYear(pcId,past){return Math.min(...past.filter(s=>s.pcId===pcId).map(s=>Number(s.years?.[0]||STORAGE_YEAR)));}
const norm=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
function commonalityFor(archetype,tree,age){const common={Criminal:'Crime',Official:'Law and Government',Socialite:'Business and Society',Soldier:'Combat',Technician:'Technology'};const anomaly={Criminal:'Law and Government',Official:'Crime',Socialite:'Survival',Soldier:'Business and Society',Technician:'Combat'};if(tree==='Praxis'&&Number(age)>100)return'common';if(common[archetype]===tree)return'common';if(anomaly[archetype]===tree)return'anomaly';return'uncommon';}
function findTrait(catalog,[branch,name]){const b=norm(branch),n=norm(name);return catalog.find(t=>norm(t.branch)===b&&norm(t.name)===n)||catalog.find(t=>norm(t.name)===n&&(norm(t.branch).includes(b)||b.includes(norm(t.branch))));}
async function archetypeResourceBonus(archetype){let ep=0,ip=0;const f={Civilian:'1d6',Criminal:'1d8',Soldier:'1d10'}[archetype];if(f)ep=Number((await new Roll(f).evaluate()).total||0);if(archetype==='Official')ip=1;if(archetype==='Socialite')ip=2;return{ep,ip};}

async function createPregenActors({pregens,past,coreSkills,archetypeSkills,root}){
 const actors=[];
 for(const p of pregens){
   const ageAtStorage=STORAGE_YEAR-firstHistoricalYear(p.id,past),currentAge=ageAtStorage+p.storageYears;
   const starting=game.alteredCarbon.Rules.ageResources(ageAtStorage,p.stackAttributes),threshold=Number(p.currentSleeve.strength);
   let actor=game.actors.find(a=>sourceId(a)===p.id);
   if(!actor){
     const extra=await archetypeResourceBonus(p.archetype),isMeth=p.id==='PC03',ep=starting.egoPoints+extra.ep,ip=starting.influencePoints+extra.ip+(isMeth?2:0);
     actor=await Actor.create({name:p.name,type:'character',folder:root.id,
       system:{identity:{trueName:p.name,publicName:p.name,dhfAge:currentAge,storageYears:p.storageYears,archetype:p.archetype,variant:p.id==='PC03'?'meth':'standard',currentObjective:`Recover the ${p.fragment}.`},attributes:{strength:p.currentSleeve.strength,perception:p.currentSleeve.perception,...p.stackAttributes},resources:{health:{value:p.currentSleeve.healthMax,max:p.currentSleeve.healthMax},ego:{value:ep,max:ep},wounds:{value:0,max:threshold},stackPoints:{value:starting.stackPoints,max:starting.stackPoints},influence:{value:ip,max:ip}},...(isMeth?{backup:{enabled:true,priceLevel:4,routine:false,notes:'Meth starting backup — Core 2020'}}:{}),stackState:'intact',sleeveState:'healthy'},
       ownership:{default:0},flags:{[MOD]:{sourceId:p.id,fragment:p.fragment,role:p.role,ageAtStorage,startingResources:starting,archetypeResourceApplied:true,rulesV1Migrated:true,methVariantApplied:isMeth}}});
   } else {
     const updates={'system.identity.dhfAge':currentAge,'system.identity.storageYears':p.storageYears,'system.identity.archetype':p.archetype,'system.identity.variant':p.id==='PC03'?'meth':'standard','system.attributes.empathy':p.stackAttributes.empathy,'system.attributes.willpower':p.stackAttributes.willpower,'system.attributes.acuity':p.stackAttributes.acuity,'system.attributes.intelligence':p.stackAttributes.intelligence,'system.resources.health.max':p.currentSleeve.healthMax,'system.resources.wounds.max':threshold,'system.resources.stackPoints.max':starting.stackPoints};
     if(!actor.getFlag(MOD,'rulesV1Migrated')){updates['system.resources.health.value']=p.currentSleeve.healthMax;updates['system.resources.wounds.value']=0;updates['system.resources.stackPoints.value']=starting.stackPoints;updates[`flags.${MOD}.rulesV1Migrated`]=true;}
     if(!actor.getFlag(MOD,'archetypeResourceApplied')){const extra=await archetypeResourceBonus(p.archetype);updates['system.resources.ego.max']=Number(actor.system.resources.ego.max||starting.egoPoints)+extra.ep;updates['system.resources.ego.value']=updates['system.resources.ego.max'];updates['system.resources.influence.max']=Number(actor.system.resources.influence.max||starting.influencePoints)+extra.ip;updates['system.resources.influence.value']=updates['system.resources.influence.max'];updates[`flags.${MOD}.archetypeResourceApplied`]=true;}
     if(p.id==='PC03'&&!actor.getFlag(MOD,'methVariantApplied')){updates['system.resources.influence.max']=Number(updates['system.resources.influence.max']??actor.system.resources.influence.max??starting.influencePoints)+2;updates['system.resources.influence.value']=Number(updates['system.resources.influence.value']??actor.system.resources.influence.value??starting.influencePoints)+2;updates['system.backup.enabled']=true;updates['system.backup.priceLevel']=4;updates['system.backup.routine']=false;updates['system.backup.notes']='Meth starting backup — Core 2020';updates[`flags.${MOD}.methVariantApplied`]=true;}
     await actor.update(updates);
   }
   let sleeve=actor.items.find(i=>sourceId(i)===p.currentSleeve.id);
   if(!sleeve){[sleeve]=await actor.createEmbeddedDocuments('Item',[{name:p.currentSleeve.name,type:'sleeve',system:{status:'active',sleeveType:p.currentSleeve.type,strength:p.currentSleeve.strength,perception:p.currentSleeve.perception,healthMax:p.currentSleeve.healthMax,damageThreshold:threshold,appearance:p.currentSleeve.concept,rulesRef:'Core Rulebook 2020, Chapter 2: Sleeves'},flags:{[MOD]:{sourceId:p.currentSleeve.id}}}]);}
   else await sleeve.update({'system.strength':p.currentSleeve.strength,'system.perception':p.currentSleeve.perception,'system.healthMax':p.currentSleeve.healthMax,'system.damageThreshold':threshold,'system.sleeveType':p.currentSleeve.type,'system.appearance':p.currentSleeve.concept});
   const preset=archetypeSkills.archetypes[p.archetype]||archetypeSkills.archetypes.Civilian,levelById=new Map(preset.map(x=>[x.id,x.level]));
   for(const sk of coreSkills){let item=actor.items.find(i=>i.type==='skill'&&i.getFlag(MOD,'coreSkillId')===sk.id);if(!item){[item]=await actor.createEmbeddedDocuments('Item',[{name:sk.name,type:'skill',system:{catalogId:sk.id,attribute:sk.attribute,level:levelById.get(sk.id)||1,rulesRef:sk.rulesRef,rulesText:sk.rulesText||''},flags:{[MOD]:{coreSkillId:sk.id,sourceId:`${p.id}-${sk.id}`}}}]);}else await item.update({'system.level':levelById.get(sk.id)||1,'system.rulesText':sk.rulesText||'','system.catalogId':sk.id});}
   if(!actor.items.find(i=>sourceId(i)===`${p.id}-fragment`))await actor.createEmbeddedDocuments('Item',[{name:'Encrypted Palimpsest Fragment',type:'memory',system:{description:'A protected experiential fragment hidden inside this DHF. Its complete significance is revealed during play.',secret:p.fragment,year:2274,recovered:false,rulesRef:'Cold Storage original content'},flags:{[MOD]:{sourceId:`${p.id}-fragment`,private:true}}}]);
   actors.push(actor);
 }
 return actors;
}

async function createPregenLoadouts({actors,loadouts,archetypeReference,traitCatalog,baggageCatalog}){
 const pcMap=new Map(actors.map(a=>[sourceId(a),a]));
 for(const l of loadouts){const actor=pcMap.get(l.pcId);if(!actor)continue;const ref=archetypeReference.archetypes[l.archetype]?.packages?.[l.package];if(!ref)continue;
   if(!actor.items.find(i=>sourceId(i)===`${l.pcId}-package`))await actor.createEmbeddedDocuments('Item',[{name:`Starting Package — ${l.package}`,type:'equipment',system:{description:`<p>${ref.gear}</p><p>${l.notes||''}</p>`,rulesRef:'Core Rulebook 2020, Chapter 2: Archetype Starting Packages'},flags:{[MOD]:{sourceId:`${l.pcId}-package`}}}]);
   for(const spec of ref.traits||[]){const t=findTrait(traitCatalog.traits,spec);if(!t)continue;const sid=`${l.pcId}-trait-${t.id}`;if(actor.items.find(i=>sourceId(i)===sid))continue;const commonality=commonalityFor(l.archetype,t.tree,actor.system.identity.dhfAge);await actor.createEmbeddedDocuments('Item',[{name:t.name,type:'trait',system:{catalogId:t.id,tree:t.tree,branch:t.branch,tier:t.tier,commonality,spCost:0,effect:t.effect,description:t.effect,rulesRef:t.rulesRef},flags:{[MOD]:{sourceId:sid,startingTrait:true}}}]);}
   for(const bid of l.baggage||[]){const b=baggageCatalog.entries.find(x=>x.id===bid);if(!b)continue;const sid=`${l.pcId}-${bid}`;if(actor.items.find(i=>sourceId(i)===sid))continue;await actor.createEmbeddedDocuments('Item',[{name:b.name,type:'baggage',system:{catalogId:b.id,rollMin:b.min,rollMax:Number.isFinite(b.max)?b.max:999,appliesTo:b.sleeveOrStack?'Sleeve or Stack':'Narrative',description:b.effect,rulesRef:b.rulesRef},flags:{[MOD]:{sourceId:sid,authoredBaggage:true}}}]);}
 }
}

async function createAdversaries(adversaries,root){
 const out=[];for(const a of adversaries){let actor=game.actors.find(x=>sourceId(x)===a.id);const data={identity:{trueName:a.name,publicName:a.name,archetype:a.template,variant:'standard'},attributes:{strength:a.strength,perception:a.perception,empathy:a.empathy,willpower:a.willpower,acuity:a.acuity,intelligence:a.intelligence},resources:{health:{value:a.health,max:a.health},ego:{value:a.ego,max:a.ego},wounds:{value:0,max:a.strength},stackPoints:{value:0,max:0},influence:{value:0,max:0}},defense:a.defense||0,speedModifier:Number(a.speedDice||1)-Math.floor(Number(a.perception||0)/10),morale:7,minionBonus:a.minionBonus||0,nemesis:Boolean(a.nemesis),tactics:a.tactics,stackState:'intact',sleeveState:'healthy'};
   if(!actor)actor=await Actor.create({name:a.name,type:'threat',folder:root.id,ownership:{default:0},system:data,flags:{[MOD]:{sourceId:a.id,template:a.template,role:a.role}}});else await actor.update({system:data});
   if(!actor.items.find(i=>sourceId(i)===`${a.id}-sleeve`))await actor.createEmbeddedDocuments('Item',[{name:`${a.name} — Sleeve`,type:'sleeve',system:{status:'active',sleeveType:'other',strength:a.strength,perception:a.perception,healthMax:a.health,damageThreshold:a.strength,rulesRef:'Core Rulebook 2020, Chapter 7 adversary template'},flags:{[MOD]:{sourceId:`${a.id}-sleeve`}}}]);
   const attacks={
     ADV01:[['Virtual Derringer','directed-energy-weapons','1d6+4','Thermal','Hit, Ranged: +; Accuracy 1.'],['Class B Viral Strike','data-engineering','2d6 EP','Ego','Viral Strike: +; Accuracy 1; Class B viral rules.']],
     ADV02:[['Sidearm','firearms','1d8+4','Thermal','Hit, Ranged: +; Accuracy 1.'],['Close Weapon','melee-combat','1d6+5','Bludgeon/Slashing','Hit, Melee: +; Accuracy 1.']],
     ADV03:[['BCPD Sidearm','firearms','1d8+4','Thermal','Hit, Ranged: +; Accuracy 1.'],['Stun Baton','melee-combat','1d6+4','Bludgeon/Slashing','Hit, Melee: +; Stun available.']],
     ADV04:[['Praetorian Railgun','firearms','1d10+5','Bludgeon/Piercing/Slashing','Hit, Ranged: +; Armor Piercing; Accuracy 1.'],['Praetorian Sidearm','firearms','1d6+4','Bludgeon/Slashing','Hit, Ranged: +; Accuracy 1.']]
   }[a.id]||[];
   for(let i=0;i<attacks.length;i++){const [name,skill,damage,damageType,triggeredEffects]=attacks[i],sid=`${a.id}-weapon-${i}`;if(actor.items.find(x=>sourceId(x)===sid))continue;await actor.createEmbeddedDocuments('Item',[{name,type:'weapon',system:{skill,damage,damageType,triggeredEffects,rulesRef:'Core Rulebook 2020, Chapter 7 adversary template',armorPiercing:name.includes('Railgun'),accuracy:1},flags:{[MOD]:{sourceId:sid}}}]);}
   out.push(actor);
 }return out;
}

async function createArchivedSleeves(past,pcMap){
 for(const s of past){
   const a=pcMap.get(s.pcId);if(!a)continue;
   if(!a.items.find(i=>sourceId(i)===s.id))await a.createEmbeddedDocuments('Item',[{name:s.name,type:'archivedSleeve',system:{status:'archived',sleeveType:'other',acquired:String(s.years[0]),lost:String(s.years[1]),lossCause:s.lossOrTransfer,description:`<p>${s.history}</p><p><strong>Important memory:</strong> ${s.importantMemory}</p><p><strong>Unresolved consequence:</strong> ${s.unresolvedConsequence}</p>`,rulesRef:'Cold Storage original content'},flags:{[MOD]:{sourceId:s.id,pcId:s.pcId}}}]);
 }
}

async function createRelationships(rels,pcMap){
 for(const r of rels){
   const a=pcMap.get(r.pcId);if(!a)continue;
   if(!a.items.find(i=>sourceId(i)===r.id))await a.createEmbeddedDocuments('Item',[{name:`${r.category}: ${r.contactHistoricalIdentity}`,type:'relationship',system:{pcId:r.pcId,pcSleeveId:r.pcSleeveId,contactId:r.contactId,contactHistoricalIdentity:r.contactHistoricalIdentity,category:r.category,historicalIncident:r.historicalIncident,recognitionClues:r.recognitionClues.join('; '),revealState:r.revealState,plotCritical:r.plotCritical,rulesRef:'Cold Storage relationship archive'},flags:{[MOD]:{sourceId:r.id}}}]);
 }
}

async function createContacts(contacts,root){
 const out=[];
 for(const c of contacts){
   let actor=game.actors.find(a=>sourceId(a)===c.id);
   if(!actor){actor=await Actor.create({name:c.currentIdentity,type:'npc',folder:root.id,ownership:{default:0},system:{identity:{trueName:c.currentIdentity,publicName:c.currentIdentity,dhfAge:0,storageYears:0,archetype:'NPC'},attributes:{strength:30,perception:30,empathy:30,willpower:30,acuity:30,intelligence:30},resources:{health:{value:10,max:10},ego:{value:20,max:20},wounds:{value:0,max:30},stackPoints:{value:0,max:0},influence:{value:0,max:0}},stackState:'intact',secrets:{trueIdentity:c.historicalIdentity,actualAllegiance:c.alignment,presentedAllegiance:c.faction||'',agenda:c.agenda,recognitionState:'unknown'},notes:c.presentFunction},flags:{[MOD]:{sourceId:c.id,alignment:c.alignment,presentFunction:c.presentFunction,revealPath:c.revealPath}}});}
   else await actor.update({'system.attributes.strength':30,'system.attributes.perception':30,'system.resources.health.max':10,'system.resources.wounds.max':30,'system.secrets.trueIdentity':c.historicalIdentity,'system.secrets.actualAllegiance':c.alignment,'system.secrets.presentedAllegiance':c.faction||'','system.secrets.agenda':c.agenda});
   if(!actor.items.find(i=>sourceId(i)===`${c.id}-S0`))await actor.createEmbeddedDocuments('Item',[{name:c.currentSleeve.name,type:'sleeve',system:{status:'active',sleeveType:'other',strength:30,perception:30,healthMax:10,damageThreshold:30,appearance:c.currentSleeve.appearance,rulesRef:'Cold Storage current identity'},flags:{[MOD]:{sourceId:`${c.id}-S0`}}}]);
   out.push(actor);
 }
 return out;
}

async function createJournals({journals,factions,revelations,adventure}){
 const jf=await ensureFolder('Cold Storage','JournalEntry');
 for(const x of journals){
   if(game.journal.find(j=>sourceId(j)===x.id))continue;
   await JournalEntry.create({name:x.title,folder:jf.id,pages:[{name:x.title,type:'text',text:{content:`<article><h1>${x.title}</h1>${x.body.startsWith('<')?x.body:`<p>${x.body}</p>`}</article>`,format:1}}],ownership:{default:x.visibility==='gm'?0:2},flags:{[MOD]:{sourceId:x.id,visibility:x.visibility}}});
 }
 const ff=await ensureFolder('Cold Storage — Factions','JournalEntry');
 for(const f of factions){if(game.journal.find(j=>sourceId(j)===f.id))continue;await JournalEntry.create({name:f.name,folder:ff.id,ownership:{default:0},pages:[{name:'Dossier',type:'text',text:{format:1,content:`<article><h1>${f.name}</h1><h2>Public face</h2><p>${f.public}</p><h2>Objective</h2><p>${f.goal}</p><h2>GM secret</h2><p>${f.secret}</p></article>`}}],flags:{[MOD]:{sourceId:f.id}}});}
 const rf=await ensureFolder('Cold Storage — Revelations','JournalEntry');
 for(const r of revelations){if(game.journal.find(j=>sourceId(j)===r.id))continue;const clues=r.clues.map(c=>`<li><strong>${c.channel}:</strong> ${c.source}</li>`).join('');await JournalEntry.create({name:`Revelation — ${r.revelation}`,folder:rf.id,ownership:{default:0},pages:[{name:'Clue paths',type:'text',text:{format:1,content:`<article><h1>${r.revelation}</h1><p>Essential: ${r.essential?'Yes':'No'}</p><ul>${clues}</ul></article>`}}],flags:{[MOD]:{sourceId:r.id,pcId:r.pcId||null}}});}
 if(!game.journal.find(j=>sourceId(j)==='ADVENTURE-GUIDE')){const rows=adventure.scenes.map(s=>`<tr><td>${s.minutes} min</td><td><strong>${s.name}</strong></td><td>${s.purpose.join('; ')}</td></tr>`).join('');await JournalEntry.create({name:adventure.title,folder:jf.id,ownership:{default:0},pages:[{name:'Four-hour running guide',type:'text',text:{format:1,content:`<article><h1>${adventure.title}</h1><p>${adventure.premise}</p><table><tbody>${rows}</tbody></table><p><strong>Redundancy:</strong> ${adventure.redundancyRule}</p></article>`}}],flags:{[MOD]:{sourceId:'ADVENTURE-GUIDE'}}});}
}


async function configureActivePregens(ids){
 if(!game.user.isGM)throw new Error('GM only.');
 ids=[...new Set(ids)];if(ids.length!==6)throw new Error('Exactly six pregens must be active.');
 const actors=game.actors.filter(a=>String(sourceId(a)||'').startsWith('PC'));
 for(const a of actors){const id=sourceId(a);await a.setFlag(MOD,'selectionState',ids.includes(id)?'active':'reserve');}
 await game.settings.set(MOD,'activePregens',ids);
 await refreshPlayerBoard();
 return ids;
}

async function assignPregen(pcId,userId){
 if(!game.user.isGM)throw new Error('GM only.');
 const actor=game.actors.find(a=>sourceId(a)===pcId);if(!actor)throw new Error(`Pregen ${pcId} not found.`);
 const ownership={default:0};if(userId)ownership[userId]=3;await actor.update({ownership});return actor;
}

function activePregenActors(){const ids=new Set(game.settings.get(MOD,'activePregens')||[]);return game.actors.filter(a=>ids.has(sourceId(a)));}
function contactById(id){return game.actors.find(a=>sourceId(a)===id);}

async function refreshPlayerBoard(){
 if(!game.user.isGM)return;
 const active=activePregenActors();const rows=[];
 for(const pc of active){for(const rel of pc.items.filter(i=>i.type==='relationship'&&['familiar','suspected','confirmed','hostile','reconciled'].includes(i.system.revealState))){const contact=contactById(rel.system.contactId);const identity=rel.system.revealState==='confirmed'?(contact?.system?.secrets?.trueIdentity||rel.system.contactHistoricalIdentity):'Unverified identity';rows.push({pc:pc.name,category:rel.system.category,state:rel.system.revealState,current:contact?.name||'Unknown current sleeve',historical:identity});}}
 rows.sort((a,b)=>a.pc.localeCompare(b.pc)||a.category.localeCompare(b.category));
 const body=rows.length?`<table><thead><tr><th>PC</th><th>Relationship</th><th>Current face</th><th>Identity</th><th>Status</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${foundry.utils.escapeHTML(r.pc)}</td><td>${foundry.utils.escapeHTML(r.category)}</td><td>${foundry.utils.escapeHTML(r.current)}</td><td>${foundry.utils.escapeHTML(r.historical)}</td><td>${foundry.utils.escapeHTML(r.state)}</td></tr>`).join('')}</tbody></table>`:'<p>No relationships have been revealed yet.</p>';
 let j=game.journal.find(x=>sourceId(x)==='PLAYER-RELATIONSHIP-BOARD');
 if(!j)j=await JournalEntry.create({name:'Cold Storage — Player Relationship Board',ownership:{default:2},pages:[{name:'Known relationships',type:'text',text:{format:1,content:body}}],flags:{[MOD]:{sourceId:'PLAYER-RELATIONSHIP-BOARD'}}});
 else {const page=j.pages.contents[0];if(page)await page.update({'text.content':body});}
 return j;
}


async function createScenes(){
 const defs=[
  ['SCENE-LANDING','Cold Storage — Landing Page','landing.svg'],
  ['SCENE-WARD','The Resurrection Ward','resurrection-ward.svg'],
  ['SCENE-BREACH','Breach of Cold Storage','cold-storage-breach.svg'],
  ['SCENE-RAINLINE','The Dead City They Remember — Rainline','rainline.svg'],
  ['SCENE-SAFEHOUSE','Anansi House Safehouse','anansi-house.svg'],
  ['SCENE-VIRTUAL','Palimpsest Virtuality','palimpsest-virtuality.svg'],
  ['SCENE-CORE','Needlecast Spire / Palimpsest Core','palimpsest-core.svg'],
  ['SCENE-EPILOGUE','Epilogues','epilogues.svg']
 ];
 for(const [id,name,file] of defs){if(game.scenes.find(sc=>sourceId(sc)===id))continue;await Scene.create({name,navigation:true,background:{src:`modules/${MOD}/assets/placeholders/${file}`},grid:{type:0,distance:1,units:'zone'},flags:{[MOD]:{sourceId:id,placeholder:true}}});}
}

export async function importColdStorage(){
 if(!game.user.isGM)return ui.notifications.warn('GM only.');
 if(game.system.id!==SYS)throw new Error('Cold Storage requires the Altered Carbon RPG system.');
 const [pregens,past,contacts,rels,factions,journals,adventure,revelations,loadouts,adversaries,coreSkills,archetypeSkills,archetypeReference,traitCatalog,baggageCatalog]=await Promise.all([
  'pregens.json','previous-sleeves.json','contacts.json','relationships.json','factions.json','journals.json','adventure.json','revelations.json','pregen-loadouts.json','adversaries.json'].map(loadModuleJSON).concat([loadSystemJSON('core-skills.json'),loadSystemJSON('archetype-skills.json'),loadSystemJSON('archetype-reference.json'),loadSystemJSON('trait-catalog.json'),loadSystemJSON('baggage-catalog.json')])
 );
 const pcFolder=await ensureFolder('Cold Storage — Pregens','Actor');
 const contactFolder=await ensureFolder('Cold Storage — Contacts','Actor');
 const adversaryFolder=await ensureFolder('Cold Storage — Adversaries','Actor');
 const actors=await createPregenActors({pregens,past,coreSkills,archetypeSkills,root:pcFolder});
 await createPregenLoadouts({actors,loadouts,archetypeReference,traitCatalog,baggageCatalog});
 const pcMap=new Map(actors.map(a=>[sourceId(a),a]));
 await createArchivedSleeves(past,pcMap);
 await createRelationships(rels,pcMap);
 await createContacts(contacts,contactFolder);
 await createAdversaries(adversaries,adversaryFolder);
 await createJournals({journals,factions,revelations,adventure});
 await createScenes();
 await game.settings.set(MOD,'installed',true);
 ui.notifications.info(`Cold Storage imported: ${pregens.length} pregens with canonical loadouts, ${past.length} archived sleeves, ${contacts.length} contacts, ${adversaries.length} adversaries, ${rels.length} relationship links and ${journals.length} core journals.`);
}

class ColdStorageSetup extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'cold-storage-setup',window:{title:'Cold Storage Setup'},position:{width:620,height:620},actions:{import:this._import,applySelection:this._applySelection,assign:this._assign}};
 static PARTS={main:{template:'modules/cold-storage/templates/setup.hbs'}};
 async _prepareContext(options){const context=await super._prepareContext(options);const active=new Set(game.settings.get(MOD,'activePregens')||[]);const pregens=game.actors.filter(a=>String(sourceId(a)||'').startsWith('PC')).sort((a,b)=>sourceId(a).localeCompare(sourceId(b))).map(a=>({id:sourceId(a),name:a.name,checked:active.has(sourceId(a)),userId:Object.entries(a.ownership||{}).find(([id,lvl])=>id!=='default'&&lvl===3)?.[0]||''}));return {...context,pregens,users:game.users.filter(u=>!u.isGM).map(u=>({id:u.id,name:u.name}))};}
 static async _import(){await importColdStorage();await this.render({force:true});}
 static async _applySelection(){const ids=[...this.element.querySelectorAll('[name="activePregen"]:checked')].map(x=>x.value);try{await configureActivePregens(ids);ui.notifications.info('Six active pregens configured.');await this.render({force:true});}catch(err){ui.notifications.error(err.message);}}
 static async _assign(event,target){const pcId=target.dataset.pcId;const select=this.element.querySelector(`[data-user-for="${pcId}"]`);await assignPregen(pcId,select?.value||null);ui.notifications.info('Pregen ownership updated.');await this.render({force:true});}
}

class ColdStorageDashboard extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'cold-storage-dashboard',window:{title:'Cold Storage GM Relationship Dashboard'},position:{width:900,height:760},actions:{setReveal:this._setReveal,refreshBoard:this._refreshBoard}};
 static PARTS={main:{template:'modules/cold-storage/templates/dashboard.hbs'}};
 async _prepareContext(options){const context=await super._prepareContext(options);const ids=new Set(game.settings.get(MOD,'activePregens')||[]);const pcs=game.actors.filter(a=>ids.has(sourceId(a))).map(pc=>({id:sourceId(pc),name:pc.name,relationships:pc.items.filter(i=>i.type==='relationship').map(rel=>{const c=contactById(rel.system.contactId);return{uuid:rel.uuid,name:rel.system.contactHistoricalIdentity,category:rel.system.category,state:rel.system.revealState,current:c?.name||'Unknown',plotCritical:rel.system.plotCritical};})}));return {...context,pcs};}
 static async _setReveal(event,target){const item=await fromUuid(target.dataset.uuid);if(!item)return;await item.update({'system.revealState':target.dataset.state});await refreshPlayerBoard();await this.render({force:true});}
 static async _refreshBoard(){await refreshPlayerBoard();ui.notifications.info('Player relationship board refreshed.');}
}

Hooks.once('init',()=>{
 game.settings.register(MOD,'installed',{scope:'world',config:false,type:Boolean,default:false});
 game.settings.register(MOD,'activePregens',{scope:'world',config:false,type:Array,default:[]});
 game.settings.registerMenu(MOD,'setup',{name:'Cold Storage Setup',label:'Open Setup',hint:'Import/update source-controlled Cold Storage content.',icon:'fa-solid fa-database',type:ColdStorageSetup,restricted:true});
 game.settings.registerMenu(MOD,'dashboard',{name:'Cold Storage GM Dashboard',label:'Open Dashboard',hint:'Manage historical relationship reveals and the player relationship board.',icon:'fa-solid fa-diagram-project',type:ColdStorageDashboard,restricted:true});
});
Hooks.once('ready',()=>{game.coldStorage={import:importColdStorage,configureActivePregens,assignPregen,refreshPlayerBoard,openDashboard:()=>new ColdStorageDashboard().render({force:true})};});
