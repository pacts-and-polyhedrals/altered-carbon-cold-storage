/** Cold Storage 1.6.0: zoned scene maps for every playable location.
 * Each map ships the Altered Carbon zone graph (scene flag altered-carbon-rpg.zoneGraph) used by the
 * system Zone Assistant and range rules, plus zone rectangles so tokens are assigned to the zone they
 * stand in automatically. GM-customised scenes are never overwritten.
 */
const MOD='cold-storage';
const SYS='altered-carbon-rpg';
export const MAP_BASE=`modules/${MOD}/assets/maps/`;
const PLACEHOLDER_BASE=`modules/${MOD}/assets/placeholders/`;
const sid=doc=>doc?.getFlag?.(MOD,'sourceId')??doc?.flags?.[MOD]?.sourceId;
/** The two narrative backdrops that stay illustrative (no tactical play). */
export const BACKDROPS=[['SCENE-LANDING','Cold Storage — Landing Page','landing.svg','G00'],['SCENE-EPILOGUE','Epilogues','epilogues.svg','G23']];

export async function loadMaps(){const r=await fetch(`modules/${MOD}/content-src/maps.json`);if(!r.ok)throw new Error(`Cannot load Cold Storage maps: ${r.status}`);return (await r.json()).maps;}
export function zoneGraph(map){return {zones:map.zones.map(z=>({id:z.id,name:z.name,adjacent:[...z.adjacent]}))};}
export function sceneData(map){
 return {name:map.name,navigation:true,navName:`${map.code} · ${map.name}`,width:map.width,height:map.height,padding:0,backgroundColor:'#05080b',
  background:{src:`${MAP_BASE}${map.file}`},grid:{type:0,size:map.gridSize,distance:1,units:'zone'},tokenVision:false,
  flags:{[MOD]:{sourceId:map.id,zoneShapes:map.zones.map(z=>({id:z.id,rect:z.rect})),coverSpots:(map.cover||[]).map(c=>({...c})),mapVersion:'1.7.0',journal:map.journal},[SYS]:{zoneGraph:zoneGraph(map)}}};
}
function isOurArt(src){const s=String(src||'');return !s||s.startsWith(PLACEHOLDER_BASE)||s.startsWith(MAP_BASE);}
async function thumbnail(scene){try{if(typeof scene.createThumbnail!=='function')return;const t=await scene.createThumbnail();if(t?.thumb)await scene.update({thumb:t.thumb});}catch(error){console.warn('Cold Storage | scene thumbnail skipped',error);}}

/** Create missing scenes and upgrade untouched placeholder scenes. Returns counts. */
export async function installMaps({thumbnails=true}={}){
 if(!game.user?.isGM)throw new Error('Only a GM may install scenes.');
 const maps=await loadMaps();let created=0,upgraded=0,skipped=0;
 for(const [id,name,file] of BACKDROPS)if(!game.scenes.find(s=>sid(s)===id)){await Scene.create({name,navigation:true,background:{src:`${PLACEHOLDER_BASE}${file}`},grid:{type:0,distance:1,units:'zone'},flags:{[MOD]:{sourceId:id,placeholder:true}}});created++;}
 for(const map of maps){
  const data=sceneData(map);let scene=game.scenes.find(s=>sid(s)===map.id);
  if(!scene){scene=await Scene.create(data);created++;if(thumbnails)await thumbnail(scene);continue;}
  const src=scene.background?.src??scene.img;
  if(isOurArt(src)){
   // Untouched placeholder or an older version of our map: upgrade art, size and zones; keep tokens, notes, walls, journal link.
   const keep={name:String(src||'').startsWith(PLACEHOLDER_BASE)?data.name:scene.name,navigation:scene.navigation};
   await scene.update({...data,...keep,[`flags.${MOD}.placeholder`]:false});upgraded++;if(thumbnails)await thumbnail(scene);
  }else{
   // GM replaced the art: only add a zone graph if the scene has none.
   if(!scene.getFlag?.(SYS,'zoneGraph')?.zones?.length)await scene.update({[`flags.${SYS}.zoneGraph`]:data.flags[SYS].zoneGraph});
   skipped++;
  }
 }
 return {created,upgraded,skipped,maps:maps.length};
}

/** Pure: which zone contains this canvas point? */
export function zoneAt(shapes,x,y,{offsetX=0,offsetY=0}={}){
 const px=x-offsetX,py=y-offsetY;
 for(const s of shapes||[]){const [rx,ry,rw,rh]=s.rect;if(px>=rx&&px<=rx+rw&&py>=ry&&py<=ry+rh)return s.id;}
 return '';
}
function tokenCenter(scene,data){
 const size=Number(scene?.grid?.size??scene?.dimensions?.size??100);
 return {x:Number(data.x??0)+Number(data.width??1)*size/2,y:Number(data.y??0)+Number(data.height??1)*size/2};
}
function enabled(){try{return game.settings.get(MOD,'autoZones')!==false;}catch{return true;}}
/** Pure: the zone flag a token should carry after this create/update, or undefined when unchanged/not applicable. */
export function zoneForToken(scene,current,changes={}){
 const shapes=scene?.flags?.[MOD]?.zoneShapes;if(!Array.isArray(shapes)||!shapes.length)return undefined;
 if(changes&&!('x' in changes)&&!('y' in changes)&&!('width' in changes)&&!('height' in changes))return undefined;
 const merged={...current,...changes},c=tokenCenter(scene,merged);
 const d=scene.dimensions??{};
 const zone=zoneAt(shapes,c.x,c.y,{offsetX:Number(d.sceneX??0),offsetY:Number(d.sceneY??0)});
 return zone===(current?.flags?.[SYS]?.zone??'')?undefined:zone;
}
/** Pure: the cover spot under this canvas point (nearest wins), or null. */
export function coverAt(spots,x,y,{offsetX=0,offsetY=0}={}){
 let best=null,bestD=Infinity;const px=x-offsetX,py=y-offsetY;
 for(const s of spots||[]){const d=Math.hypot(px-s.x,py-s.y);if(d<=s.radius&&d<bestD){best=s;bestD=d;}}
 return best;
}
/** Pure: what the actor's Altered Carbon cover flag should become, or undefined for "leave it alone".
 * Map cover is applied when a token enters a cover ring and cleared when it leaves, but cover a GM or
 * player set by hand (no autoCover marker) is never overwritten. */
export function coverChange(spot,currentCover,autoCoverId){
 const manual=currentCover&&currentCover.kind&&currentCover.kind!=='none'&&!autoCoverId;
 if(manual)return undefined;
 if(spot){if(autoCoverId===spot.id&&currentCover?.kind===spot.kind)return undefined;return {cover:{kind:spot.kind,partial:Boolean(spot.partial)},autoCover:spot.id};}
 if(autoCoverId)return {cover:{kind:'none',partial:false},autoCover:null};
 return undefined;
}
async function applyMapCover(token){
 const scene=token?.parent,spots=scene?.flags?.[MOD]?.coverSpots,actor=token?.actor;
 if(!Array.isArray(spots)||!actor)return;
 const size=Number(scene?.grid?.size??100),d=scene.dimensions??{};
 const spot=coverAt(spots,Number(token.x)+Number(token.width??1)*size/2,Number(token.y)+Number(token.height??1)*size/2,{offsetX:Number(d.sceneX??0),offsetY:Number(d.sceneY??0)});
 const change=coverChange(spot,actor.getFlag?.(SYS,'cover'),actor.getFlag?.(MOD,'autoCover'));
 if(!change)return;
 await actor.update({[`flags.${SYS}.cover`]:change.cover,[`flags.${MOD}.autoCover`]:change.autoCover});
}
function coverEnabled(){try{return game.settings.get(MOD,'autoCover')!==false;}catch{return true;}}
export function registerScenes(){
 game.settings.register(MOD,'autoCover',{name:'Apply map cover automatically',hint:'On Cold Storage maps, a token whose centre is inside a cover ring gets that cover (material and partial/full) on its Altered Carbon sheet, and loses it when it leaves. Cover set by hand is never overwritten.',scope:'world',config:true,type:Boolean,default:true});
 const onMove=(doc,changes,options,userId)=>{if(userId!==game.user?.id||!coverEnabled())return;if(changes&&!('x' in changes)&&!('y' in changes))return;applyMapCover(doc).catch(e=>console.warn('Cold Storage | map cover not applied',e));};
 Hooks.on('createToken',(doc,options,userId)=>onMove(doc,null,options,userId));
 Hooks.on('updateToken',onMove);
 game.settings.register(MOD,'autoZones',{name:'Assign tokens to map zones automatically',hint:'On Cold Storage maps, a token dropped or moved into a zone is assigned to that Altered Carbon zone (used by the Zone Assistant and range rules).',scope:'world',config:true,type:Boolean,default:true});
 Hooks.on('preCreateToken',(doc,data,options,userId)=>{if(userId!==game.user?.id||!enabled())return;const zone=zoneForToken(doc.parent,{...doc.toObject?.()??data,flags:{}},null);if(zone)doc.updateSource({[`flags.${SYS}.zone`]:zone});});
 Hooks.on('preUpdateToken',(doc,changes,options,userId)=>{if(userId!==game.user?.id||!enabled())return;const zone=zoneForToken(doc.parent,doc.toObject?.()??doc,changes);if(zone!==undefined)foundry.utils.setProperty(changes,`flags.${SYS}.zone`,zone);});
}
