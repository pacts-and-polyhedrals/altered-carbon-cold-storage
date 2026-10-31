/** Cold Storage 1.10.0: Investigation Tracker, one-click scene setup and the players' Case File.
 * One source (content-src/missions.json) feeds the tracker, the live mission panels inside the GM journals,
 * the token/pin setup of every scene and the player-facing Case File journal.
 * Objectives with an `auto` rule tick themselves from the world (handouts revealed, continuity pulses and anchors,
 * clocks, scenes visited); the GM can tick or untick any objective by hand, which always wins.
 */
import {changeBookCounter,DEFAULT_STATE} from './book.mjs';
const MOD='cold-storage';
const SYS='altered-carbon-rpg';
export const TRACKER_VERSION='1.10.0';
export const DEFAULT_MISSION_STATE=Object.freeze({started:{},done:{},objectives:{},evidence:{},visited:{},ending:'',announced:{},initialized:false,log:[]});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=v=>JSON.parse(JSON.stringify(v??null));
const sid=d=>d?.getFlag?.(MOD,'sourceId')??d?.flags?.[MOD]?.sourceId;
const values=c=>c?.contents??Array.from(c??[]);

let DATA=null;
export function setMissionData(data){DATA=data;return DATA;}
export function missionData(){return DATA;}
export async function loadMissionData(){
 if(DATA)return DATA;
 const r=await fetch(`modules/${MOD}/content-src/missions.json`);if(!r.ok)throw new Error(`Cannot load Cold Storage missions: ${r.status}`);
 return setMissionData(await r.json());
}
export function normaliseState(raw){const s={...clone(DEFAULT_MISSION_STATE),...clone(raw||{})};for(const k of ['started','done','objectives','evidence','visited','announced'])if(!s[k]||typeof s[k]!=='object')s[k]={};if(!Array.isArray(s.log))s.log=[];return s;}

// ------------------------------------------------------------------ pure board computation
/** Pure: does an auto rule hold for this world? */
export function evaluateRule(rule,world,state={},started=new Set()){
 if(!rule)return false;
 if(rule.any)return rule.any.some(r=>evaluateRule(r,world,state,started));
 if(rule.handout)return world.handouts.has(rule.handout);
 if(rule.handouts)return rule.handouts.filter(h=>world.handouts.has(h)).length>=(rule.min??rule.handouts.length);
 if(rule.pulse)return world.pulses.has(rule.pulse);
 if(rule.anchor)return world.anchors.has(rule.anchor);
 if(rule.visited)return Boolean(state.visited?.[rule.visited]);
 if(rule.started)return rule.started.some(id=>started.has(id));
 if(rule.relationship)return world.relationships.has(rule.relationship);
 if(rule.counter)return Number(world.counters?.[rule.counter]??0)>=Number(rule.min??1);
 if(rule.ending)return Boolean(state.ending);
 return false;
}
/** Pure: an objective or evidence entry is done when the GM ticked it, or its auto rule holds and the GM did not untick it. */
function resolved(manual,auto){return manual===true||(manual!==false&&auto);}
export function emptyWorld(){return {handouts:new Set(),pulses:new Set(),anchors:new Set(),relationships:new Set(),counters:{...clone(DEFAULT_STATE)}};}
/** Pure: the whole tracker as data. */
export function computeBoard(data,rawState,world=emptyWorld()){
 const state=normaliseState(rawState);
 // A mission counts as started from GM action, its scene being activated, or any ticked objective — never from auto rules (no cycles).
 const started=new Set(data.missions.filter(m=>state.started[m.id]||state.done[m.id]||state.visited[m.scene]||m.objectives.some(o=>state.objectives[o.id]===true)).map(m=>m.id));
 const byId=new Map();
 const missions=data.missions.map(m=>{
  const objectives=m.objectives.map(o=>{const auto=evaluateRule(o.auto,world,state,started);const done=resolved(state.objectives[o.id],auto);return {...o,auto:Boolean(o.auto),autoMet:auto,done,manual:state.objectives[o.id]};});
  const required=objectives.filter(o=>!o.optional);
  const complete=Boolean(state.done[m.id])||(required.length>0&&required.every(o=>o.done));
  const isStarted=complete||started.has(m.id)||objectives.some(o=>o.done);
  const ready=(m.after||[]).every(id=>byId.get(id)?.complete);
  const status=complete?'complete':isStarted?'active':ready?'available':'upcoming';
  const out={...m,objectives,complete,started:isStarted,status,doneCount:objectives.filter(o=>o.done).length,requiredDone:required.filter(o=>o.done).length,requiredCount:required.length};
  byId.set(m.id,out);return out;
 });
 const evidence=data.evidence.map(e=>{const auto=(e.handouts||[]).some(h=>world.handouts.has(h));return {...e,autoMet:auto,acquired:resolved(state.evidence[e.id],auto),manual:state.evidence[e.id],found:(e.handouts||[]).filter(h=>world.handouts.has(h))};});
 const pillars=(data.pillars||[]).map(p=>({name:p,obtained:evidence.some(e=>e.pillar===p&&e.acquired)}));
 const core=missions.filter(m=>!m.optional);
 const percent=Math.round(100*core.reduce((n,m)=>n+(m.complete?1:m.requiredCount?m.requiredDone/m.requiredCount:0),0)/Math.max(1,core.length));
 const counters={...clone(DEFAULT_STATE),...clone(world.counters||{})};
 return {missions,evidence,pillars,percent,counters,ending:state.ending,endings:data.endings||[],
  heat:{value:counters.heat,text:data.heat?.[counters.heat]??'',player:data.heatPlayer?.[counters.heat]??''},
  renewal:{value:counters.renewal,text:data.renewal?.[counters.renewal]??''},log:state.log.slice(-12).reverse(),current:missions.filter(m=>m.status==='active')};
}
/** Pure: toggle semantics — store only a disagreement with the auto rule. */
export function toggled(manual,autoMet){const done=resolved(manual,autoMet);const next=!done;return next===Boolean(autoMet)?undefined:next;}

// ------------------------------------------------------------------ pure HTML
const STATUS={complete:'Closed',active:'Active',available:'Open',upcoming:'Later'};
const ROLE={ally:'Ally',contact:'Contact',rival:'Rival',adversary:'Threat',benefactor:'Benefactor',voice:'Off-map'};
function objectiveRow(o,{isGM}){
  const tag=o.auto?`<span class="cs-obj-auto" data-tooltip="Ticks itself from the world${o.manual!==undefined?' (GM override set)':''}"><i class="fa-solid fa-bolt" aria-hidden="true"></i> auto</span>`:'';
 const opt=o.optional?'<span class="cs-obj-opt">optional</span>':'';
 const box=isGM?`<button type="button" class="cs-obj-box" data-cs-act="objective" data-cs-id="${esc(o.id)}" aria-pressed="${o.done}" aria-label="${o.done?'Untick':'Tick'}: ${esc(o.text)}"><span class="cs-tick" aria-hidden="true"></span></button>`:`<span class="cs-tick" aria-hidden="true"></span>`;
 return `<li class="cs-obj${o.done?' is-done':''}${o.optional?' is-optional':''}">${box}<span class="cs-obj-text">${esc(o.text)}</span>${tag}${opt}</li>`;
}
function castRow(c,m,i){
 if(c.offmap)return `<li class="cs-cast cs-role-voice"><span class="cs-cast-role">${ROLE.voice}</span><strong>${esc(c.offmap)}</strong><span class="cs-cast-note">${esc(c.note)}</span></li>`;
 const name=c.name||c.label||c.actor;
 const flags=[c.hidden?'hidden':'',c.standby?'standby':'',c.count>1?`×${c.count}`:'',c.cover?'in cover':''].filter(Boolean).map(t=>`<span class="cs-cast-flag">${t}</span>`).join('');
 const drop=c.standby?`<button type="button" class="cs-mini" data-cs-act="drop" data-cs-mission="${m.id}" data-cs-index="${i}" data-tooltip="Drop this token (hidden) into ${esc(c.zoneName||c.zone)}"><i class="fa-solid fa-person-arrow-down-to-line" aria-hidden="true"></i> Drop</button>`:'';
 return `<li class="cs-cast cs-role-${esc(c.role)}"><span class="cs-cast-role">${ROLE[c.role]??esc(c.role)}</span><a class="cs-cast-name" data-cs-act="actor" data-cs-id="${esc(c.record||c.actor)}">${esc(name)}</a><span class="cs-cast-zone"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(c.zoneName||c.zone)}</span>${flags}${drop}<span class="cs-cast-note">${esc(c.note)}</span></li>`;
}
export function missionPanelHTML(m,{isGM=true,compact=false}={}){
 const pct=m.objectives.length?Math.round(100*m.doneCount/m.objectives.length):0;
 const actions=isGM?`<div class="cs-mission-actions">
  <button type="button" class="cs-primary" data-cs-act="setup" data-cs-scene="${esc(m.scene)}" data-tooltip="Place this scene's NPCs, rivals and threats in their zones (hidden where marked) and pin the journals"><i class="fa-solid fa-people-group" aria-hidden="true"></i> Set Up Scene</button>
  <button type="button" data-cs-act="view" data-cs-scene="${esc(m.scene)}"><i class="fa-solid fa-eye" aria-hidden="true"></i> View</button>
  <button type="button" data-cs-act="activate" data-cs-scene="${esc(m.scene)}"><i class="fa-solid fa-bullseye" aria-hidden="true"></i> Activate</button>
  <button type="button" data-cs-act="reveal" data-cs-scene="${esc(m.scene)}" data-tooltip="Show every hidden token this setup placed"><i class="fa-solid fa-user-secret" aria-hidden="true"></i> Reveal hidden</button>
  ${m.complete?`<button type="button" data-cs-act="reopen" data-cs-mission="${m.id}"><i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Reopen</button>`:`<button type="button" data-cs-act="complete" data-cs-mission="${m.id}"><i class="fa-solid fa-flag-checkered" aria-hidden="true"></i> Mark Complete</button>`}
  ${compact?'':`<button type="button" data-cs-act="journal" data-cs-id="${esc(m.journal)}"><i class="fa-solid fa-book-open" aria-hidden="true"></i> ${esc(m.journal)}</button>`}
  ${compact?`<button type="button" data-cs-act="tracker"><i class="fa-solid fa-list-check" aria-hidden="true"></i> Tracker</button>`:''}</div>`:'';
 const cast=isGM&&(m.cast||[]).length?`<ul class="cs-cast-list">${m.cast.map((c,i)=>castRow(c,m,i)).join('')}</ul>`:'';
 return `<section class="cs-mission cs-status-${m.status}" data-cs-mission-id="${m.id}">
 <header><span class="cs-mission-code">${esc(m.code)}</span><h3>${esc(m.title)}</h3><span class="cs-mission-status">${STATUS[m.status]}</span></header>
 <div class="cs-mission-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
 <p class="cs-mission-gm">${esc(m.gm)}</p>
 <ul class="cs-obj-list">${m.objectives.map(o=>objectiveRow(o,{isGM})).join('')}</ul>
 ${cast?`<h4>Cast &amp; threats</h4>${cast}`:''}
 ${actions}</section>`;
}
export function clocksHTML(board,{isGM=true}={}){
 const btn=(key,d,label)=>isGM?`<button type="button" class="cs-mini" data-cs-act="count" data-cs-key="${key}" data-cs-delta="${d}" aria-label="${label}">${d>0?'+':'−'}</button>`:'';
 const track=(key,label,value,max,text='')=>`<div class="cs-clock cs-clock-${key}"><div class="cs-clock-head"><strong>${label}</strong>${btn(key,-1,`Decrease ${label}`)}<b>${value} / ${max}</b>${btn(key,1,`Increase ${label}`)}</div><div class="cs-clock-pips">${Array.from({length:max},(_,i)=>`<span class="${i<value?'on':''}"></span>`).join('')}</div>${text?`<p>${esc(text)}</p>`:''}</div>`;
 const c=board.counters;
 return `<section class="cs-clocks">${track('heat','Heat',c.heat,6,board.heat.text)}${track('renewal','Renewal',c.renewal,4,c.renewal?board.renewal.text:'Starts only in the core (G21).')}${track('proof','Proof',c.proof,2)}${track('control','Control',c.control,2)}${track('people','People',c.people,2)}</section>`;
}
export function evidenceHTML(board,{isGM=true}={}){
 const chip=e=>`<li class="cs-ev${e.acquired?' is-acquired':''}">${isGM?`<button type="button" class="cs-obj-box" data-cs-act="evidence" data-cs-id="${e.id}" aria-pressed="${e.acquired}" aria-label="${e.acquired?'Unmark':'Mark'} ${e.id}"><span class="cs-tick" aria-hidden="true"></span></button>`:''}<b>${e.id}</b><span>${esc(e.claim)}</span><em>${(e.handouts||[]).join(' · ')}${e.pillar?` · ${e.pillar}`:''}${e.autoMet?' · auto':''}</em></li>`;
 return `<section class="cs-evidence"><div class="cs-pillars">${board.pillars.map(p=>`<span class="cs-pillar${p.obtained?' on':''}">${esc(p.name)}</span>`).join('')}<small>${board.pillars.filter(p=>p.obtained).length}/3 proof pillars — one is an allegation, two an investigation, three a robust case.</small></div><ul>${board.evidence.map(chip).join('')}</ul></section>`;
}
/** Pure: the players' Case File. Only `player`, `brief` and evidence `player` text — never GM text. */
export function caseFileHTML(board){
 const shown=board.missions.filter(m=>m.started||m.complete);
 const mission=m=>`<section class="cs-case-mission${m.complete?' is-closed':''}"><h2>${esc(m.player||m.title)}${m.complete?' <span class="cs-case-stamp">CLOSED</span>':''}</h2><p><em>${esc(m.brief)}</em></p><ul>${m.objectives.filter(o=>!o.optional||o.done).map(o=>`<li>${o.done?'☑':'☐'} ${esc(o.player)}</li>`).join('')}</ul></section>`;
 const ev=board.evidence.filter(e=>e.acquired);
 const pillars=board.pillars.filter(p=>p.obtained);
 return `<article class="cs-book-journal cs-case-file"><p class="cs-page-kicker">COLD STORAGE // CASE FILE // BAY CITY 2384</p><h1>The Case</h1>
 <p class="cs-case-heat"><strong>Heat ${board.counters.heat}/6.</strong> ${esc(board.heat.player)}</p>
 ${board.counters.renewal?`<p class="cs-case-renewal"><strong>Renewal ${board.counters.renewal}/4.</strong> The city lease is renewing.</p>`:''}
 ${shown.length?shown.map(mission).join(''):'<p>Nothing on file yet. You have only just opened your eyes.</p>'}
 <h2>Evidence secured</h2>${ev.length?`<ul>${ev.map(e=>`<li><strong>${esc(e.player)}</strong> ${e.found?.length?`<span class="cs-case-ref">${e.found.join(' / ')}</span>`:''}</li>`).join('')}</ul>`:'<p>None yet.</p>'}
 ${pillars.length?`<p><strong>Proof:</strong> ${pillars.map(p=>esc(p.name)).join(', ')} (${pillars.length} of 3).</p>`:''}
 ${board.ending?`<h2>Ending</h2><p>${esc(board.ending)}</p>`:''}</article>`;
}

// ------------------------------------------------------------------ pure layout
/** Pure: top-left token positions for n tokens centred in a zone rect, below the zone plaque. */
export function layoutTokens(rect,n,{size=100,gap=24,offsetX=0,offsetY=0}={}){
 const [rx,ry,rw,rh]=rect,top=ry+100,usableH=Math.max(size,rh-130),cols=Math.max(1,Math.min(n,Math.floor((rw-60+gap)/(size+gap))));
 const rows=Math.ceil(n/cols),gridW=cols*size+(cols-1)*gap,gridH=rows*size+(rows-1)*gap;
 const x0=rx+(rw-gridW)/2,y0=top+Math.max(0,(usableH-gridH)/2);
 return Array.from({length:n},(_,i)=>({x:Math.round(offsetX+x0+(i%cols)*(size+gap)),y:Math.round(offsetY+y0+Math.floor(i/cols)*(size+gap))}));
}
/** Pure: every token a scene's setup places, with a stable key and position. */
export function setupPlan(missions,map,{includeStandby=false,only=null}={}){
 const zones=new Map((map?.zones||[]).map(z=>[z.id,z]));const covers=[...(map?.cover||[])];
 const slots=[];
 for(const m of missions)(m.cast||[]).forEach((c,i)=>{
  if(c.offmap)return;
  const want=only?only.mission===m.id&&only.index===i:(!c.standby||includeStandby);
  for(let k=0;k<(c.count||1);k++)slots.push({key:`${m.id}:${i}:${k}`,mission:m.id,index:i,entry:c,place:want});
 });
 // Positions are computed over the whole cast (placed or not) so re-running setup or dropping standby tokens never reshuffles.
 const byZone=new Map();for(const s of slots){if(!byZone.has(s.entry.zone))byZone.set(s.entry.zone,[]);byZone.get(s.entry.zone).push(s);}
 for(const [zoneId,list] of byZone){
  const zone=zones.get(zoneId);if(!zone){for(const s of list)s.error=`Unknown zone ${zoneId}`;continue;}
  const inCover=list.filter(s=>s.entry.cover),free=list.filter(s=>!s.entry.cover);
  for(const s of inCover){const i=covers.findIndex(c=>c.zone===zoneId);if(i<0){free.push(s);continue;}const c=covers.splice(i,1)[0];s.x=Math.round(c.x-50);s.y=Math.round(c.y-50);}
  layoutTokens(zone.rect,free.length).forEach((p,i)=>{free[i].x=p.x;free[i].y=p.y;});
 }
 return slots.filter(s=>s.place);
}
export function pinPosition(map,zoneId,n=0){const z=(map?.zones||[]).find(x=>x.id===zoneId);if(!z)return null;const [x,y,w]=z.rect;return {x:Math.round(x+w-70-n*80),y:Math.round(y+60)};}

// ------------------------------------------------------------------ world access
const setting=(k,f)=>{try{return game.settings.get(MOD,k)??f;}catch{return f;}};
export function getState(){return normaliseState(setting('missionState',{}));}
export function gatherWorld(){
 const w=emptyWorld();
 for(const j of values(game.journal))if(j.getFlag?.(MOD,'bookCategory')==='handout'&&j.getFlag?.(MOD,'bookRevealed'))w.handouts.add(sid(j));
 const cont=setting('continuityState',{pcs:{}});
 for(const ch of Object.values(cont?.pcs||{})){for(const [k,v] of Object.entries(ch?.pulses||{}))if(v)w.pulses.add(k);for(const [k,v] of Object.entries(ch?.anchors||{}))if(v)w.anchors.add(k);}
 w.counters={...clone(DEFAULT_STATE),...clone(setting('bookState',{}))};
 const active=new Set(setting('activePregens',[]));
 for(const a of values(game.actors))if(active.has(sid(a)))for(const i of values(a.items))if(i.type==='relationship'&&i.system?.revealState)w.relationships.add(i.system.revealState);
 return w;
}
export function currentBoard(){return DATA?computeBoard(DATA,getState(),gatherWorld()):null;}
const gm=()=>{if(!game.user?.isGM)throw new Error('Only the GM can change the Cold Storage tracker.');};
async function save(state,line){if(line)state.log=[...state.log,{at:new Date().toISOString(),text:line}].slice(-60);await game.settings.set(MOD,'missionState',state);return state;}
function mission(id){const m=DATA?.missions.find(x=>x.id===id);if(!m)throw new Error(`Unknown mission ${id}`);return m;}

export async function toggleObjective(id){
 gm();await loadMissionData();const board=currentBoard(),state=getState();
 const o=board.missions.flatMap(m=>m.objectives).find(x=>x.id===id);if(!o)throw new Error(`Unknown objective ${id}`);
 const next=toggled(state.objectives[id],o.autoMet);if(next===undefined)delete state.objectives[id];else state.objectives[id]=next;
 return save(state,`${o.done?'Unticked':'Ticked'}: ${o.text}`);
}
export async function toggleEvidence(id){
 gm();await loadMissionData();const e=currentBoard().evidence.find(x=>x.id===id),state=getState();if(!e)throw new Error(`Unknown evidence ${id}`);
 const next=toggled(state.evidence[id],e.autoMet);if(next===undefined)delete state.evidence[id];else state.evidence[id]=next;
 return save(state,`${e.acquired?'Unmarked':'Secured'} ${id}: ${e.claim}`);
}
export async function setMissionComplete(id,complete=true){
 gm();await loadMissionData();const m=mission(id),state=getState();
 if(complete){state.done[id]=true;state.started[id]=true;}else{delete state.done[id];}
 return save(state,`${complete?'Closed':'Reopened'}: ${m.title}`);
}
export async function startMission(id){gm();await loadMissionData();const m=mission(id),state=getState();if(state.started[id])return state;state.started[id]=true;return save(state,`Started: ${m.title}`);}
export async function markVisited(sceneSourceId){
 gm();await loadMissionData();const state=getState();if(state.visited[sceneSourceId])return state;state.visited[sceneSourceId]=true;
 const names=DATA.missions.filter(m=>m.scene===sceneSourceId).map(m=>m.title);return save(state,names.length?`Scene opened: ${names.join(', ')}`:null);
}
export async function setEnding(name){gm();await loadMissionData();if(name&&!DATA.endings.includes(name))throw new Error('Unknown ending.');const state=getState();state.ending=name||'';return save(state,name?`Ending chosen: ${name}`:'Ending cleared');}
export async function resetTracker({clocks=false}={}){gm();const state=normaliseState({});if(clocks)await game.settings.set(MOD,'bookState',{...clone(DEFAULT_STATE),fray:clone(setting('bookState',{})?.fray||{})});
 // Everything already true in the world stays announced, so a reset never floods the chat.
 state.initialized=true;await game.settings.set(MOD,'missionState',state);await silenceCurrent();return getState();}

// ------------------------------------------------------------------ scene setup
async function mapFor(sceneSourceId){
 const r=await fetch(`modules/${MOD}/content-src/maps.json`);if(!r.ok)throw new Error(`Cannot load Cold Storage maps: ${r.status}`);
 return (await r.json()).maps.find(m=>m.id===sceneSourceId)||null;
}
/** Foundry v14: placeables belong to a Level; use the scene's initial (or first) one. */
export function levelOf(scene){if(scene?.levels===undefined)return null;const lv=scene.initialLevel;if(typeof lv==='string'&&lv)return lv;if(lv?.id)return lv.id;const first=(scene.levels?.contents??(Array.isArray(scene.levels)?scene.levels:[]))[0];return typeof first==='string'?first:first?.id??null;}
function sceneBySource(id){return values(game.scenes).find(s=>sid(s)===id)||null;}
function actorBySource(id){return values(game.actors).find(a=>sid(a)===id)||null;}
async function tokenData(actor,slot,scene){
 const c=slot.entry,threat=actor.type==='threat',level=levelOf(scene);
 const over={...(level?{level}:{}),x:slot.x,y:slot.y,hidden:Boolean(c.hidden),actorLink:!threat,...(c.name?{name:c.count>1?`${c.name} ${slot.key.split(':')[2]*1+1}`:c.name}:{}),
  disposition:c.role==='adversary'||c.role==='rival'?-1:c.role==='benefactor'?0:1,
  flags:{[MOD]:{setupKey:slot.key,setupScene:sid(scene),role:c.role,record:c.record||null},[SYS]:{zone:c.zone}}};
 if(typeof actor.getTokenDocument==='function'){const td=await actor.getTokenDocument(over,{parent:scene});const data=td.toObject?td.toObject():td;delete data._id;return foundry.utils?.mergeObject?foundry.utils.mergeObject(data,over,{inplace:false}):{...data,...over};}
 const proto=actor.prototypeToken?.toObject?.()??clone(actor.prototypeToken??{});return {...proto,...over,actorId:actor.id,flags:{...(proto.flags||{}),...over.flags}};
}
/** Place every NPC, rival and threat a scene needs (hidden where the book says so) and pin its journals. Idempotent. */
export async function setupScene(sceneSourceId,{includeStandby=false,only=null}={}){
 gm();await loadMissionData();
 const scene=sceneBySource(sceneSourceId);if(!scene)throw new Error(`Scene ${sceneSourceId} is not installed. Run Install / Update Zoned Maps first.`);
 const missions=DATA.missions.filter(m=>m.scene===sceneSourceId),map=await mapFor(sceneSourceId);
 const existing=new Set(values(scene.tokens).map(t=>t.getFlag?.(MOD,'setupKey')??t.flags?.[MOD]?.setupKey).filter(Boolean));
 const missing=[],tokens=[];
 for(const slot of setupPlan(missions,map,{includeStandby,only})){
  if(existing.has(slot.key)||slot.error)continue;
  const actor=actorBySource(slot.entry.actor);if(!actor){missing.push(slot.entry.actor);continue;}
  tokens.push(await tokenData(actor,slot,scene));
 }
 if(tokens.length)await scene.createEmbeddedDocuments('Token',tokens);
 let notes=0;
 if(!only){
  const pinned=new Set(values(scene.notes).map(n=>n.getFlag?.(MOD,'pinKey')??n.flags?.[MOD]?.pinKey).filter(Boolean));const perZone={};const create=[];
  for(const m of missions)for(const p of m.pins||[]){
   const key=`${m.id}:${p.journal}`;if(pinned.has(key))continue;const j=values(game.journal).find(x=>sid(x)===p.journal);if(!j)continue;
   const pos=pinPosition(map,p.zone,perZone[p.zone]=(perZone[p.zone]??-1)+1)??{x:150+create.length*90,y:150};
   const handout=/^H\d\d$/.test(p.journal);
   const level=levelOf(scene);
   create.push({...(level?{level}:{}),entryId:j.id,x:pos.x,y:pos.y,text:p.label||p.journal,iconSize:handout?44:56,fontSize:22,texture:{src:handout?'icons/svg/clue.svg':'icons/svg/book.svg',tint:handout?'#ffc467':'#78ecf3'},flags:{[MOD]:{pinKey:key}}});
  }
  if(create.length){await scene.createEmbeddedDocuments('Note',create);notes=create.length;}
 }
 const state=getState();if(!state.setup)state.setup={};state.setup[sceneSourceId]=true;await game.settings.set(MOD,'missionState',state);
 return {tokens:tokens.length,notes,missing:[...new Set(missing)]};
}
export async function setupAllScenes(){gm();await loadMissionData();const out={tokens:0,notes:0,scenes:0,missing:new Set()};
 for(const id of [...new Set(DATA.missions.map(m=>m.scene))]){if(!sceneBySource(id))continue;const r=await setupScene(id);out.tokens+=r.tokens;out.notes+=r.notes;out.scenes++;r.missing.forEach(x=>out.missing.add(x));}
 return {...out,missing:[...out.missing]};}
export async function dropCast(missionId,index){gm();await loadMissionData();const m=mission(missionId);return setupScene(m.scene,{only:{mission:missionId,index:Number(index)}});}
export async function revealScene(sceneSourceId){gm();const scene=sceneBySource(sceneSourceId);if(!scene)throw new Error('Scene not installed.');
 const updates=values(scene.tokens).filter(t=>(t.getFlag?.(MOD,'setupKey')??t.flags?.[MOD]?.setupKey)&&t.hidden).map(t=>({_id:t.id,hidden:false}));
 if(updates.length)await scene.updateEmbeddedDocuments('Token',updates);return updates.length;}
export async function clearSceneSetup(sceneSourceId){gm();const scene=sceneBySource(sceneSourceId);if(!scene)return 0;
 const tk=values(scene.tokens).filter(t=>t.getFlag?.(MOD,'setupKey')??t.flags?.[MOD]?.setupKey).map(t=>t.id);
 const nt=values(scene.notes).filter(n=>n.getFlag?.(MOD,'pinKey')??n.flags?.[MOD]?.pinKey).map(n=>n.id);
 if(tk.length)await scene.deleteEmbeddedDocuments('Token',tk);if(nt.length)await scene.deleteEmbeddedDocuments('Note',nt);return tk.length+nt.length;}

// ------------------------------------------------------------------ Case File + announcements
async function caseFolder(){return values(game.folders).find(f=>f.type==='JournalEntry'&&f.name==='Cold Storage'&&!(f.folder?.id??f.folder))||null;}
export async function writeCaseFile(){
 if(!game.user?.isGM)return null;
 // Only once the adventure book is in the world: enabling the module alone never creates journals.
 if(!values(game.journal).some(j=>(j.getFlag?.(MOD,'bookCategory')??j.flags?.[MOD]?.bookCategory)==='gm'))return null;
 await loadMissionData();
 const html=caseFileHTML(currentBoard());
 let j=values(game.journal).find(x=>sid(x)==='CASE-FILE');
 if(!j){const folder=await caseFolder();j=await JournalEntry.create({name:'Cold Storage — Case File',folder:folder?.id??null,ownership:{default:2},pages:[{name:'The Case',type:'text',text:{format:1,content:html}}],flags:{[MOD]:{sourceId:'CASE-FILE',bookCategory:'casefile'}}});return j;}
 const page=values(j.pages)[0];
 if(page){if(page.text?.content!==html)await page.update({'text.content':html});}else await j.createEmbeddedDocuments('JournalEntryPage',[{name:'The Case',type:'text',text:{format:1,content:html}}]);
 return j;
}
function primaryGM(){const a=game.users?.activeGM;return a?a.id===game.user?.id:Boolean(game.user?.isGM);}
/** Mark everything currently true as announced without posting (first run on an existing world, or after a reset). */
async function silenceCurrent(){const board=currentBoard();if(!board)return;const state=getState();for(const m of board.missions)if(m.complete)state.announced[m.id]=true;for(const e of board.evidence)if(e.acquired)state.announced[e.id]=true;state.initialized=true;await game.settings.set(MOD,'missionState',state);}
export async function announceProgress(){
 if(!primaryGM()||!DATA)return;
 const state=getState();if(!state.initialized)return silenceCurrent();
 const board=currentBoard(),cards=[];let changed=false;
 for(const m of board.missions)if(m.complete&&!state.announced[m.id]){state.announced[m.id]=true;changed=true;cards.push(`<p class="cs-chat-kicker">CASE UPDATE // ${esc(m.code)}</p><h3>${esc(m.player||m.title)} — closed</h3><ul>${m.objectives.filter(o=>o.done).map(o=>`<li>${esc(o.player)}</li>`).join('')}</ul>`);}
 for(const e of board.evidence)if(e.acquired&&!state.announced[e.id]){state.announced[e.id]=true;changed=true;cards.push(`<p class="cs-chat-kicker">EVIDENCE SECURED</p><h3>${esc(e.player)}</h3>`);}
 if(!changed)return;await game.settings.set(MOD,'missionState',state);
 if(setting('announceProgress',true)&&globalThis.ChatMessage)for(const c of cards)await ChatMessage.create({speaker:{alias:'Cold Storage'},content:`<div class="cold-storage cs-chat-card">${c}<p class="cs-chat-foot">Case File updated.</p></div>`});
}

// ------------------------------------------------------------------ views, enrichers and clicks
export function refreshViews(){
 const apps=foundry.applications?.instances;if(!apps)return;
 for(const app of apps.values?.()??[]){
  const doc=app.document,entry=doc?.documentName==='JournalEntryPage'?doc.parent:doc;
  if(app.id==='cold-storage-tracker'||app.id==='cold-storage-book'||(entry?.documentName==='JournalEntry'&&entry.flags?.[MOD]?.bookCategory==='gm'))app.render?.();
 }
}
let timer=null;
export function onWorldChange(){clearTimeout(timer);timer=setTimeout(async()=>{try{refreshViews();if(game.user?.isGM&&primaryGM()){await announceProgress();await writeCaseFile();}}catch(e){console.warn('Cold Storage | tracker refresh failed',e);}},250);}

const PANEL_RE=/@CS(Mission|Clocks|Evidence)\[([A-Za-z0-9-]+)\]/g;
export function panelHTML(kind,arg,{isGM=Boolean(game.user?.isGM)}={}){
 const board=currentBoard();if(!board)return '<p class="cs-hint">Cold Storage tracker loading…</p>';
 if(kind==='Mission'){const m=board.missions.find(x=>x.id===arg);return m?missionPanelHTML(m,{isGM,compact:true}):'';}
 if(kind==='Clocks')return clocksHTML(board,{isGM});
 if(kind==='Evidence')return evidenceHTML(board,{isGM});
 return '';
}
function enricher(match){const div=document.createElement('div');div.className='cold-storage cs-live-panel';div.innerHTML=panelHTML(match[1],match[2]);return div;}
async function run(fn){try{await fn();onWorldChange();}catch(e){console.error(e);ui.notifications?.error?.(e.message);}}
function onClick(event){
 const el=event.target?.closest?.('[data-cs-act]');if(!el||!game.user?.isGM)return;
 event.preventDefault();event.stopPropagation();const d=el.dataset;
 const act=d.csAct;
 if(act==='objective')return run(()=>toggleObjective(d.csId));
 if(act==='evidence')return run(()=>toggleEvidence(d.csId));
 if(act==='complete')return run(()=>setMissionComplete(d.csMission,true));
 if(act==='reopen')return run(()=>setMissionComplete(d.csMission,false));
 if(act==='start')return run(()=>startMission(d.csMission));
 if(act==='count')return run(()=>changeBookCounter(d.csKey,Number(d.csDelta)));
 if(act==='setup')return run(async()=>{const r=await setupScene(d.csScene);ui.notifications.info(`Scene set up: ${r.tokens} tokens placed, ${r.notes} journal pins.${r.missing.length?` Missing actors: ${r.missing.join(', ')} — run Full Import.`:''}`);});
 if(act==='drop')return run(async()=>{const r=await dropCast(d.csMission,d.csIndex);ui.notifications.info(r.tokens?'Token dropped (hidden).':'Already on the scene.');});
 if(act==='reveal')return run(async()=>{const n=await revealScene(d.csScene);ui.notifications.info(`${n} hidden tokens revealed.`);});
 if(act==='clear')return run(async()=>{const n=await clearSceneSetup(d.csScene);ui.notifications.info(`${n} setup tokens and pins removed.`);});
 if(act==='view'||act==='activate')return run(async()=>{const s=sceneBySource(d.csScene);if(!s)throw new Error('Scene not installed. Run Install / Update Zoned Maps.');if(act==='view')await s.view();else await s.activate();});
 if(act==='journal')return run(async()=>{const j=values(game.journal).find(x=>sid(x)===d.csId);if(!j)throw new Error('Import the book first.');j.sheet.render({force:true});});
 if(act==='actor')return run(async()=>{const a=actorBySource(d.csId);if(!a)throw new Error(`${d.csId} is not in this world. Run Full Import.`);a.sheet.render({force:true});});
 if(act==='tracker')return run(()=>openTracker());
 if(act==='casefile')return run(async()=>{const j=await writeCaseFile();j?.sheet?.render({force:true});});
 if(act==='ending')return run(()=>setEnding(el.value??d.csValue));
}

export class ColdStorageTracker extends foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2){
 static DEFAULT_OPTIONS={id:'cold-storage-tracker',classes:['altered-carbon','cold-storage','cs-app','cs-tracker-app'],window:{title:'Cold Storage — Investigation Tracker',icon:'fa-solid fa-list-check',resizable:true},position:{width:1080,height:860},actions:{setupAll:this._setupAll,reset:this._reset,ending:this._ending}};
 static PARTS={main:{template:'modules/cold-storage/templates/tracker.hbs'}};
 async _prepareContext(options){
  const context=await super._prepareContext(options);await loadMissionData();const board=currentBoard();
  const acts=[['1','Act I — Awakening'],['2','Act II — The Street'],['3','Act III — The Archive Inside'],['4','Act IV — The Spire'],['5','Epilogue']].map(([n,label])=>({label,html:board.missions.filter(m=>String(m.act)===n).map(m=>missionPanelHTML(m,{isGM:true})).join('')}));
  return {...context,percent:board.percent,clocks:clocksHTML(board),evidence:evidenceHTML(board),acts,current:board.current.map(m=>m.title).join(' · ')||'Nothing active — activate the Resurrection Ward to begin.',
   endings:board.endings.map(e=>({name:e,selected:e===board.ending})),log:board.log.map(l=>({when:new Date(l.at).toLocaleTimeString(),text:l.text}))};
 }
 static async _setupAll(){const ok=await foundry.applications.api.DialogV2.confirm({window:{title:'Set up every scene'},content:'<p>Place every scene\'s NPCs, rivals and threats in their zones (threats and surprises hidden) and pin the chapter and evidence journals. Tokens already placed by a previous setup are kept; standby contacts are dropped from the tracker when you need them.</p>',rejectClose:false});if(!ok)return;
  try{const r=await setupAllScenes();ui.notifications.info(`${r.scenes} scenes set up: ${r.tokens} tokens, ${r.notes} journal pins.${r.missing.length?` Missing actors: ${r.missing.join(', ')}.`:''}`);}catch(e){console.error(e);ui.notifications.error(e.message);}}
 static async _reset(){const form=await foundry.applications.api.DialogV2.input({window:{title:'Reset the Investigation Tracker'},content:'<p>Clear every ticked objective, secured-evidence mark, scene visit and the chosen ending. Revealed handouts and continuity pulses still count automatically.</p><label><input type="checkbox" name="clocks"> Also reset Heat, Renewal, Proof, Control and People (Fray is kept)</label>',rejectClose:false});if(!form)return;
  const clocks=Boolean(form instanceof FormData?form.get('clocks'):form?.clocks);await resetTracker({clocks});onWorldChange();}
 static async _ending(event,target){await run(()=>setEnding(target.value));}
 _onRender(context,options){super._onRender?.(context,options);this.element.querySelector('[name="cs-ending"]')?.addEventListener('change',e=>run(()=>setEnding(e.target.value)));}
}
export function openTracker(){gm();return new ColdStorageTracker().render({force:true});}

export function registerMissions(){
 game.settings.register(MOD,'missionState',{scope:'world',config:false,type:Object,default:clone(DEFAULT_MISSION_STATE),onChange:()=>{clearTimeout(timer);timer=setTimeout(()=>{refreshViews();if(game.user?.isGM&&primaryGM())writeCaseFile().catch(e=>console.warn(e));},150);}});
 game.settings.register(MOD,'announceProgress',{name:'Announce case progress in chat',hint:'When a mission closes or evidence is secured, post a short player-safe Case Update card to chat. The players\' Case File journal is updated either way.',scope:'world',config:true,type:Boolean,default:true});
 game.settings.registerMenu(MOD,'tracker',{name:'Cold Storage Investigation Tracker',label:'Open Tracker',hint:'Missions, objectives, evidence, clocks and one-click scene setup.',icon:'fa-solid fa-list-check',type:ColdStorageTracker,restricted:true});
 const enrichers=CONFIG.TextEditor?.enrichers;
 if(Array.isArray(enrichers)&&!enrichers.some(e=>e.id==='coldStoragePanel'))enrichers.push({id:'coldStoragePanel',pattern:new RegExp(PANEL_RE.source,'g'),enricher});
 document.body?.addEventListener?.('click',onClick,true);
 Hooks.on('updateScene',(scene,changes,options,userId)=>{if(changes?.active===true&&userId===game.user?.id&&game.user?.isGM&&sid(scene))markVisited(sid(scene)).then(onWorldChange).catch(e=>console.warn(e));});
 Hooks.on('updateJournalEntry',(doc,changes)=>{if(foundry.utils?.hasProperty?.(changes,`flags.${MOD}.bookRevealed`)||changes?.flags?.[MOD]?.bookRevealed!==undefined)onWorldChange();});
 for(const h of ['updateSetting','createSetting'])Hooks.on(h,s=>{const k=String(s?.key??'');if(k.startsWith(`${MOD}.`)&&k!==`${MOD}.missionState`)onWorldChange();});
 Hooks.on('updateItem',item=>{if(item?.type==='relationship')onWorldChange();});
}
export async function readyMissions(){try{await loadMissionData();if(game.user?.isGM&&primaryGM()){const s=getState();if(!s.initialized)await silenceCurrent();}}catch(e){console.warn('Cold Storage | tracker unavailable',e);}}
export function missionsAPI(){return {openTracker,setupScene,setupAllScenes,dropCast,revealScene,clearSceneSetup,toggleObjective,toggleEvidence,setMissionComplete,setEnding,resetTracker,writeCaseFile,board:currentBoard};}
