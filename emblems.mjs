/** Cold Storage 1.4.0: noir emblems for every opponent, network and item.
 * Emblems replace only Foundry's generic placeholder icons — never art a GM or player chose.
 * Matching order: Cold Storage source ID → Core catalog ID → adversary baseline → network keyword → item name.
 */
const MOD='cold-storage';
const SYS='altered-carbon-rpg';
export const EMBLEM_BASE=`modules/${MOD}/assets/emblems/`;
const PLACEHOLDERS=new Set(['','icons/svg/item-bag.svg','icons/svg/mystery-man.svg','icons/svg/sword.svg','icons/svg/shield.svg','icons/svg/book.svg','icons/svg/aura.svg','icons/weapons/swords/sword-guard-steel.webp']);
const norm=s=>String(s??'').toLowerCase().replace(/\s+/g,' ').trim();
let INDEX=null;
const GEAR_TYPES=new Set(['weapon','ammunition','armour','equipment','software','drug','augmentation']);

export function setEmblemIndex(index){INDEX=index;return INDEX;}
export async function loadEmblemIndex(){
 if(INDEX)return INDEX;
 const response=await fetch(`${EMBLEM_BASE}emblems.json`);if(!response.ok)throw new Error(`Cannot load Cold Storage emblems: ${response.status}`);
 return setEmblemIndex(await response.json());
}
export function isPlaceholderImage(img){
 const src=String(img??'');
 if(PLACEHOLDERS.has(src))return true;
 for(const cls of [globalThis.Item,globalThis.Actor])if(cls?.DEFAULT_ICON&&src===cls.DEFAULT_ICON)return true;
 return false;
}
/** Pure lookup: returns a module-relative emblem path or null. */
export function emblemFor(documentName,data,index=INDEX){
 if(!index||!data)return null;
 const file=f=>f?`${index.base||EMBLEM_BASE}${f}`:null;
 const flags=data.flags||{},system=data.system||{},sid=flags[MOD]?.sourceId;
 if(sid){
  if(index.bySourceId?.[sid])return file(index.bySourceId[sid]);
  for(const [suffix,f] of Object.entries(index.bySourceSuffix||{}))if(String(sid).endsWith(suffix))return file(f);
 }
 if(documentName==='Actor'){
  if(!['threat','npc'].includes(data.type))return null;
  const adv=flags[SYS]?.adversarySourceId;
  if(adv&&index.byAdversaryId?.[adv])return file(index.byAdversaryId[adv]);
  const byName=index.byName?.[norm(data.name)];
  return byName&&Object.values(index.byAdversaryId||{}).includes(byName)?file(byName):null;
 }
 const catalogId=String(system.catalogId||flags[SYS]?.catalogId||'').toUpperCase();
 if(catalogId&&index.byCatalogId?.[catalogId])return file(index.byCatalogId[catalogId]);
 if(data.type==='network'){
  const text=norm(`${data.name} ${system.organization||''}`);
  for(const n of index.networks||[])if(n.keywords.some(k=>text.includes(k)))return file(n.file);
  return file(index.networks?.find(n=>n.catalogId==='NET-INDIVIDUAL')?.file);
 }
 if(index.byType?.[data.type])return file(index.byType[data.type]);
 // Name fallback only for gear, so a Trait or Skill that shares a name with gear keeps its own icon.
 if(!GEAR_TYPES.has(data.type))return null;
 return file(index.byName?.[norm(data.name)]);
}
function autoEnabled(){try{return game.settings.get(MOD,'autoEmblems')!==false;}catch{return true;}}

/** preCreate hooks: dress new Items/Actors whose image is still a placeholder. */
function onPreCreate(documentName){
 return (doc,data,options,userId)=>{
  if(game.system?.id!==SYS||userId!==game.user?.id||!INDEX||!autoEnabled())return;
  const source=typeof doc.toObject==='function'?doc.toObject():{...data};
  if(!isPlaceholderImage(source.img))return;
  const img=emblemFor(documentName,source);if(!img)return;
  const changes={img};
  if(documentName==='Actor'&&isPlaceholderImage(source.prototypeToken?.texture?.src))changes['prototypeToken.texture.src']=img;
  doc.updateSource(changes);
 };
}
export function registerEmblems(){
 game.settings.register(MOD,'autoEmblems',{name:'Noir emblems for Altered Carbon gear and opponents',hint:'Give new Items, Networks and opponent Actors a Cold Storage noir emblem when they would otherwise use a generic Foundry icon. Custom art is never replaced.',scope:'world',config:true,type:Boolean,default:true});
 Hooks.on('preCreateItem',onPreCreate('Item'));
 Hooks.on('preCreateActor',onPreCreate('Actor'));
}
export async function readyEmblems(){try{await loadEmblemIndex();}catch(error){console.warn('Cold Storage | Noir emblems unavailable',error);}}

/** GM tool: dress existing world Items, Actors (and their embedded Items) that still use placeholders. */
export async function applyEmblemsToWorld({includeTokens=true}={}){
 if(!game.user?.isGM)throw new Error('Only a GM may apply emblems to the world.');
 const index=await loadEmblemIndex();
 let items=0,actors=0;
 const itemUpdates=[];
 for(const item of game.items??[]){if(!isPlaceholderImage(item.img))continue;const img=emblemFor('Item',item.toObject?item.toObject():item,index);if(img)itemUpdates.push({_id:item.id,img});}
 if(itemUpdates.length){await Item.updateDocuments(itemUpdates);items+=itemUpdates.length;}
 for(const actor of game.actors??[]){
  const data=actor.toObject?actor.toObject():actor;
  if(isPlaceholderImage(actor.img)){const img=emblemFor('Actor',data,index);if(img){const changes={img};if(includeTokens&&isPlaceholderImage(actor.prototypeToken?.texture?.src))changes['prototypeToken.texture.src']=img;await actor.update(changes);actors++;}}
  const embedded=[];
  for(const item of actor.items??[]){if(!isPlaceholderImage(item.img))continue;const img=emblemFor('Item',item.toObject?item.toObject():item,index);if(img)embedded.push({_id:item.id,img});}
  if(embedded.length){await actor.updateEmbeddedDocuments('Item',embedded);items+=embedded.length;}
 }
 return {items,actors};
}
