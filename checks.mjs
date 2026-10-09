/** Cold Storage 1.5.0: story-journal check call-outs → Altered Carbon GM Control.
 * At import, phrases such as "Bureaucracy or Diplomacy D0" become @CSCheck[...] enrichers.
 * For a GM each named Skill is a link that opens GM Control with the custom request filled in
 * (Skill, Difficulty, a player-safe prompt, active pregens selected). Players see a plain chip.
 */
import {systemModule} from './system-bridge.mjs';
const MOD='cold-storage';
export const CORE_SKILLS=Object.freeze(['Athletics','Brawl','Endurance','Melee Combat','Toughness','Detection','Directed Energy Weapons','Firearms','Search','Stealth','Throw','Diplomacy','Expression','Read Person','Composure','Discipline','Intimidation','Data Analysis','Data Engineering','Digital Networking','Investigation','Mechanics','Navigation','Pilot','Survival','Bureaucracy','Cultures','Engineering','Geography','History','Science','Medicine']);
const SK=[...CORE_SKILLS].sort((a,b)=>b.length-a.length).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
const LIST=`(?:${SK})(?:(?:,\\s*|,?\\s+or\\s+)(?:${SK}))*`;
const CHECK_RE=new RegExp(`\\b(${LIST})((?:,?\\s+or another justified skill)?\\s+(?:at\\s+)?D([0-5]))\\b`,'g');
const FRAY_RE=/\b(Composure) in realspace or (Discipline) in Virtuality(?:,? D0 at Fray 0-3 or D1 at Fray 4-5)?/g;
const ENRICH_RE=/@CSCheck\[([^\]|]+)\|(\d)\|([A-Za-z0-9-]*)\]\{([^}]+)\}/g;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const skillsIn=text=>[...new Set(String(text).match(new RegExp(SK,'g'))||[])];

/** Pure: wrap check call-outs in authored text (never inside tags or [[journal links]]). */
export function markChecks(body,sourceId=''){
 return String(body).split(/(<[^>]+>|\[\[[^\]]+\]\])/).map((part,i)=>{
  if(i%2===1)return part;
  return part.replace(FRAY_RE,(m,a,b)=>`@CSCheck[${a};${b}|0|${sourceId}]{${m}}`)
   .replace(CHECK_RE,(m,list,_tail,d,offset,whole)=>{
    if(whole.slice(Math.max(0,offset-9),offset).includes('@CSCheck['))return m;
    return `@CSCheck[${skillsIn(list).join(';')}|${d}|${sourceId}]{${m}}`;
   });
 }).join('');
}
/** Pure: the enriched chip. GMs get one link per Skill; players get text only. */
export function checkChipHTML({skills,difficulty,source,label},{isGM=false}={}){
 const list=String(skills).split(';').filter(Boolean);
 let text=esc(label);
 if(isGM)for(const skill of list)text=text.replace(new RegExp(`\\b${esc(skill).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`),
  `<a class="cs-check-skill" data-cs-skill="${esc(skill)}" data-cs-difficulty="${Number(difficulty)}" data-cs-source="${esc(source)}" data-tooltip="Open GM Control: ${esc(skill)}, Difficulty ${Number(difficulty)}">${esc(skill)}</a>`);
 const icon=isGM?`<a class="cs-check-open" data-cs-skill="${esc(list[0])}" data-cs-difficulty="${Number(difficulty)}" data-cs-source="${esc(source)}" data-tooltip="Open GM Control" aria-label="Open GM Control for this check"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i></a>`:'<i class="fa-solid fa-dice-d20" aria-hidden="true"></i>';
 return `<span class="cs-check${isGM?' cs-check-gm':''}" data-cs-skills="${esc(list.join(';'))}" data-cs-difficulty="${Number(difficulty)}">${icon}<span class="cs-check-label">${text}</span></span>`;
}
function enricher(match){
 const span=document.createElement('span');
 span.innerHTML=checkChipHTML({skills:match[1],difficulty:match[2],source:match[3],label:match[4]},{isGM:Boolean(game.user?.isGM)});
 return span.firstElementChild;
}
function activePregenActorIds(){
 let ids=[];try{ids=game.settings.get(MOD,'activePregens')||[];}catch{}
 return game.actors.filter(a=>a.type==='character'&&ids.includes(a.getFlag?.(MOD,'sourceId'))).map(a=>a.id);
}
/** Player-facing fields only: GM chapter text never leaves the journal. */
export function checkRequestFields({skill,difficulty=0}){
 const d=Math.max(0,Math.min(5,Number(difficulty)||0));
 return {customTitle:`${skill} Check`,customSkill:skill,customDifficulty:String(d),customBonus:'0',customBaseTR:'',customDiceCount:'0',customDie:'skill',
  customPrompt:`Make a ${skill} check${d?` (Difficulty ${d})`:''}.`,customNote:''};
}
export async function openCheckInGMControl({skill,difficulty=0,source=''}={}){
 if(!game.user?.isGM)throw new Error('Only the GM can open GM Control.');
 if(!CORE_SKILLS.includes(skill))throw new Error(`Unknown Skill: ${skill}`);
 let Panel=null;
 try{({ACGMPanel:Panel}=await systemModule('gm-tools.mjs'));}catch(error){console.warn('Cold Storage | GM Control class unavailable; opening without pre-fill',error);}
 let app=foundry.applications.instances?.get?.('ac-gm-panel');
 if(!app&&!Panel){game.alteredCarbon?.openGMControl?.();return null;}
 if(app)app._rememberState?.();else app=new Panel();
 app._fieldState={...(app._fieldState||{}),...checkRequestFields({skill,difficulty})};
 if(!app._selectedIds?.length)app._selectedIds=activePregenActorIds();
 app._csCheckSource=source;
 await app.render({force:true});
 const focus=()=>{const panel=app.element?.querySelector?.('.ac-gm-custom');if(!panel)return;panel.scrollIntoView?.({block:'center',behavior:'smooth'});panel.classList.add('cs-check-incoming');setTimeout(()=>panel.classList.remove('cs-check-incoming'),1600);};
 (globalThis.requestAnimationFrame??(f=>setTimeout(f,0)))(focus);
 return app;
}
function onClick(event){
 const link=event.target?.closest?.('.cs-check-skill,.cs-check-open');if(!link)return;
 event.preventDefault();event.stopPropagation();
 openCheckInGMControl({skill:link.dataset.csSkill,difficulty:Number(link.dataset.csDifficulty||0),source:link.dataset.csSource||''}).catch(error=>{console.error(error);ui.notifications.error(error.message);});
}
export function registerChecks(){
 const enrichers=CONFIG.TextEditor?.enrichers;
 if(Array.isArray(enrichers)&&!enrichers.some(e=>e.id==='coldStorageCheck'))enrichers.push({id:'coldStorageCheck',pattern:new RegExp(ENRICH_RE.source,'g'),enricher});
 document.body?.addEventListener?.('click',onClick,true);
}
