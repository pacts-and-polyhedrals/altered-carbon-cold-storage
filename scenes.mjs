/** Cold Storage 1.9.0: zoned scene maps for every playable location (Foundry v14 Levels).
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
/** Adventure order used for the scene folder and navigation. */
export const SCENE_ORDER=['SCENE-LANDING','SCENE-WARD','SCENE-BREACH','SCENE-RAINLINE','SCENE-ARCHIVE','SCENE-LOTUS','SCENE-RELAY','SCENE-SAFEHOUSE','SCENE-VIRTUAL','SCENE-COURT','SCENE-THEATRE','SCENE-BROADCAST','SCENE-SPIRE','SCENE-COUNCIL','SCENE-CORE','SCENE-EPILOGUE'];
export const SCENE_FOLDER='Cold Storage';
const sortFor=id=>(SCENE_ORDER.indexOf(id)+1)*100000;

export async function loadMaps(){const r=await fetch(`modules/${MOD}/content-src/maps.json`);if(!r.ok)throw new Error(`Cannot load Cold Storage maps: ${r.status}`);return (await r.json()).maps;}
export function zoneGraph(map){return {zones:map.zones.map(z=>({id:z.id,name:z.name,adjacent:[...z.adjacent]}))};}
/** Foundry v14: a Scene's image lives on its Levels. The deprecated top-level Scene#background is never written,
 * because a v14 scene created that way has an empty initial Level and renders black. */
export function sceneData(map,{folder=null}={}){
 const src=`${MAP_BASE}${map.file}`;
 return {name:map.name,navigation:true,width:map.width,height:map.height,padding:0,folder,sort:sortFor(map.id),
  grid:{type:0,size:map.gridSize,distance:1,units:'zone'},levels:[{name:map.name,background:{src}}],
  flags:{[MOD]:{sourceId:map.id,zoneShapes:map.zones.map(z=>({id:z.id,rect:z.rect})),coverSpots:(map.cover||[]).map(c=>({...c})),mapVersion:'1.9.0',journal:map.journal,mapSrc:src},[SYS]:{zoneGraph:zoneGraph(map)}}};
}
export function backdropData([id,name,file,journal],{folder=null}={}){
 const src=`${PLACEHOLDER_BASE}${file}`;
 return {name,navigation:true,width:1600,height:900,padding:0,folder,sort:sortFor(id),grid:{type:0,size:100,distance:1,units:'zone'},
  levels:[{name,background:{src}}],flags:{[MOD]:{sourceId:id,placeholder:true,journal,mapSrc:src}}};
}
/** The image actually shown: the initial (or first) Level's background; falls back to legacy data for pre-v14 scenes. */
export function sceneImage(scene){
 const levels=scene?.levels?.contents??(Array.isArray(scene?.levels)?scene.levels:[]);
 const level=scene?.initialLevel??levels[0];
 return level?.background?.src||scene?._source?.background?.src||'';
}
function isOurArt(src){const s=String(src||'');return !s||s.startsWith(PLACEHOLDER_BASE)||s.startsWith(MAP_BASE);}
async function setSceneImage(scene,src,name){
 const levels=scene?.levels?.contents??(Array.isArray(scene?.levels)?scene.levels:[]);
 const level=scene?.initialLevel??levels[0];
 if(level?.update)await level.update({'background.src':src});
 else await scene.createEmbeddedDocuments('Level',[{name,background:{src}}]);
}
async function thumbnail(scene){try{if(typeof scene.createThumbnail!=='function')return;const t=await scene.createThumbnail();if(t?.thumb)await scene.update({thumb:t.thumb});}catch(error){console.warn('Cold Storage | scene thumbnail skipped',error);}}
export async function sceneFolder(){
 let f=game.folders.find(x=>x.type==='Scene'&&x.name===SCENE_FOLDER&&!(x.folder?.id??x.folder));
 if(!f)f=await Folder.create({name:SCENE_FOLDER,type:'Scene',sorting:'m',color:'#32c7d6',flags:{[MOD]:{sourceId:'FOLDER-SCENES'}}});
 return f;
}

/** Create missing scenes and repair/upgrade scenes that still use the module's own art. Returns counts. */
export async function installMaps({thumbnails=true}={}){
 if(!game.user?.isGM)throw new Error('Only a GM may install scenes.');
 const maps=await loadMaps(),folder=await sceneFolder();let created=0,upgraded=0,skipped=0;
 const entries=[...BACKDROPS.map(b=>({id:b[0],data:backdropData(b,{folder:folder.id})})),...maps.map(m=>({id:m.id,data:sceneData(m,{folder:folder.id})}))];
 for(const {id,data} of entries){
  let scene=game.scenes.find(s=>sid(s)===id);
  if(!scene){scene=await Scene.create(data);created++;if(thumbnails)await thumbnail(scene);continue;}
  const src=sceneImage(scene),{levels,...top}=data,img=levels[0].background.src;
  if(isOurArt(src)){
   // Our placeholder, an older map, or a black v14 scene from 1.6–1.8: set the Level image, size, zones and folder.
   // Tokens, walls, notes and the journal link are kept.
   const keep={name:String(src||'').startsWith(PLACEHOLDER_BASE)&&!id.match(/LANDING|EPILOGUE/)?data.name:scene.name,navigation:scene.navigation};
   await scene.update({...top,...keep,folder:scene.folder?.id??scene.folder??folder.id,[`flags.${MOD}.placeholder`]:Boolean(data.flags[MOD].placeholder)});
   if(src!==img)await setSceneImage(scene,img,data.name);
   upgraded++;if(thumbnails)await thumbnail(scene);
  }else{
   // GM replaced the art: keep it; add a zone graph if missing and file it with the others.
   const changes={};if(data.flags[SYS]&&!scene.getFlag?.(SYS,'zoneGraph')?.zones?.length)changes[`flags.${SYS}.zoneGraph`]=data.flags[SYS].zoneGraph;
   if(!(scene.folder?.id??scene.folder))changes.folder=folder.id;
   if(Object.keys(changes).length)await scene.update(changes);
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
