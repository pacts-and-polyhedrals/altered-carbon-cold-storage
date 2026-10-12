/** Noir emblem coverage and safety. Runs against real 2.4.0 catalogs when AC_SYSTEM_PATH is set. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {systemData,usingRealSystem} from './helpers/system-harness.mjs';
const index=JSON.parse(fs.readFileSync(new URL('../assets/emblems/emblems.json',import.meta.url),'utf8'));
const mod=await import('../emblems.mjs');
mod.setEmblemIndex(index);
const exists=p=>fs.existsSync(new URL('../'+p.replace('modules/cold-storage/',''),import.meta.url));
const json=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));

test('every indexed emblem is a real, well-formed SVG with a title',()=>{
 const files=new Set([...Object.values(index.byCatalogId),...Object.values(index.byName),...Object.values(index.byAdversaryId),...Object.values(index.bySourceId),...Object.values(index.bySourceSuffix),...Object.values(index.byType),...index.networks.map(n=>n.file)]);
 assert.ok(files.size>=140,`${files.size} emblems`);
 for(const f of files){const svg=fs.readFileSync(new URL('../assets/emblems/'+f,import.meta.url),'utf8');assert.match(svg,/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="512" height="512"/,f);assert.match(svg,/<title>/,f);assert.doesNotMatch(svg,/(fill|stroke)="[BAK]"/,`${f} has an unresolved colour placeholder`);}
});
test('every Cold Storage opponent, Benefactor and authored attack has an emblem',()=>{
 for(const a of json('content-src/adversaries.json'))assert.ok(exists(mod.emblemFor('Actor',{type:'threat',name:a.name,flags:{'cold-storage':{sourceId:a.id}}})),a.id);
 for(const b of json('content-src/benefactors.json'))assert.ok(exists(mod.emblemFor('Actor',{type:'npc',name:b.name,flags:{'cold-storage':{sourceId:b.id}}})),b.id);
 for(const id of ['ADV01-weapon-0','ADV01-weapon-1','ADV02-weapon-0','ADV02-weapon-1','ADV03-weapon-0','ADV03-weapon-1','ADV04-weapon-0','ADV04-weapon-1'])assert.ok(mod.emblemFor('Item',{type:'weapon',name:'x',flags:{'cold-storage':{sourceId:id}}}),id);
 assert.match(mod.emblemFor('Item',{type:'equipment',name:'Starting Package — Fixer',flags:{'cold-storage':{sourceId:'PC05-package'}}}),/starting-package/);
 assert.match(mod.emblemFor('Item',{type:'memory',name:'Encrypted Palimpsest Fragment',flags:{'cold-storage':{sourceId:'PC05-fragment'}}}),/fragment/);
 assert.match(mod.emblemFor('Item',{type:'creditSet',name:'Credits Lv.2 — Package ent-0 #1'}),/credits/);
});
test('contacts, player characters and non-gear records keep their own icons',()=>{
 assert.equal(mod.emblemFor('Actor',{type:'npc',name:'Dr Ilse Haro',flags:{'cold-storage':{sourceId:'C01'}}}),null);
 assert.equal(mod.emblemFor('Actor',{type:'character',name:'Hitman'}),null);
 assert.equal(mod.emblemFor('Item',{type:'trait',name:'Concealment',system:{catalogId:'trait-210'}}),null,'Trait sharing a gear name must not get gear art');
 assert.equal(mod.emblemFor('Item',{type:'skill',name:'Firearms',system:{catalogId:'SK08'}}),null);
});
test('Networks match by catalog ID or organization keywords',()=>{
 assert.match(mod.emblemFor('Item',{type:'network',name:'Entertainment venue/agency Network',system:{organization:'Entertainment venue/agency'}}),/network-union/);
 assert.match(mod.emblemFor('Item',{type:'network',name:'criminal organization Network',system:{organization:'criminal organization'}}),/network-syndicate/);
 assert.match(mod.emblemFor('Item',{type:'network',name:'Protectorate military Network'}),/network-protectorate/);
 assert.match(mod.emblemFor('Item',{type:'network',name:'Bancroft',system:{catalogId:'NET-INDIVIDUAL'}}),/network-individual/);
 assert.match(mod.emblemFor('Item',{type:'network',name:'Somebody'}),/network-individual/);
});
test('placeholder detection never treats custom art as replaceable',()=>{
 assert.ok(mod.isPlaceholderImage('icons/svg/item-bag.svg'));assert.ok(mod.isPlaceholderImage('icons/svg/mystery-man.svg'));assert.ok(mod.isPlaceholderImage(''));
 assert.ok(!mod.isPlaceholderImage('worlds/bay-city/art/my-gun.webp'));assert.ok(!mod.isPlaceholderImage('modules/cold-storage/assets/emblems/item-wpn008.svg'));
});
test('every Core item, Network and adversary in the 2.4.0 catalogs has an emblem',{skip:!usingRealSystem&&'set AC_SYSTEM_PATH to a 2.4.0 system checkout'},async()=>{
 for(const it of (await systemData('item-catalog.json')).items)assert.ok(exists(mod.emblemFor('Item',{type:it.type,name:it.name,system:{catalogId:it.id}})),it.id);
 for(const it of (await systemData('item-catalog.json')).items)assert.ok(mod.emblemFor('Item',{type:it.type,name:it.name,flags:{'altered-carbon-rpg':{catalogId:it.id}}}),`${it.id} via creator flags`);
 for(const n of (await systemData('network-catalog.json')).records)assert.match(mod.emblemFor('Item',{type:'network',name:n.name,system:{catalogId:n.id}}),new RegExp(n.id.slice(4).toLowerCase()));
 for(const a of (await systemData('adversary-catalog.json')).records){
  assert.ok(exists(mod.emblemFor('Actor',{type:'threat',name:'Renamed by GM',flags:{'altered-carbon-rpg':{adversarySourceId:a.id}}})),a.id);
  assert.ok(mod.emblemFor('Actor',{type:'threat',name:a.name}),`${a.id} from compendium by name`);
 }
});
test('weapon upgrades from the system compendium match by name',()=>{
 for(const n of ['Composite Construction','Enhanced Power Cell','Extended Barrel','Extended Magazine','Genemapped Security','Mag-Plating','Magazine','Scope','Scope, Longshot','Scope, Sniper','Sight, Laser','Stock, Folding'])
  assert.ok(exists(mod.emblemFor('Item',{type:'equipment',name:n})),n);
});
test('Apply Noir Emblems dresses placeholders only, including embedded Items and opponent tokens',async()=>{
 const updates=[];
 class Doc{constructor(d){Object.assign(this,structuredClone(d));}toObject(){const {items,updateEmbeddedDocuments,...rest}=this;return structuredClone(rest);}async update(c){updates.push([this.name,c]);for(const [k,v] of Object.entries(c)){const parts=k.split('.');let o=this;for(const p of parts.slice(0,-1))o=o[p]??={};o[parts.at(-1)]=v;}}}
 const gun=new Doc({id:'i1',name:'Steyr M9-A1',type:'weapon',img:'icons/svg/item-bag.svg',system:{catalogId:'WPN011'}});
 const custom=new Doc({id:'i2',name:'Steyr M9-A1',type:'weapon',img:'worlds/x/my-steyr.webp',system:{catalogId:'WPN011'}});
 const hitman=new Doc({id:'a1',name:'Hitman',type:'threat',img:'icons/svg/mystery-man.svg',prototypeToken:{texture:{src:'icons/svg/mystery-man.svg'}},flags:{'altered-carbon-rpg':{adversarySourceId:'ADV-HITMAN'}}});
 hitman.items=[gun,custom];const embedded=[];hitman.updateEmbeddedDocuments=async(t,u)=>embedded.push(...u);
 const pc=new Doc({id:'a2',name:'Nia',type:'character',img:'icons/svg/mystery-man.svg'});pc.items=[];pc.updateEmbeddedDocuments=async()=>{};
 const worldItems=[];
 globalThis.Item={updateDocuments:async u=>worldItems.push(...u)};
 globalThis.game={user:{isGM:true},items:[new Doc({id:'w1',name:'Flak Coat',type:'armour',img:'icons/svg/item-bag.svg'}),new Doc({id:'w2',name:'Notebook',type:'equipment',img:'icons/svg/item-bag.svg'})],actors:[hitman,pc]};
 const r=await mod.applyEmblemsToWorld();
 assert.deepEqual(worldItems.map(u=>u._id),['w1']);
 assert.deepEqual(embedded.map(u=>u._id),['i1'],'custom art kept');
 assert.equal(r.actors,1);assert.match(hitman.img,/opponent-hitman/);assert.match(hitman.prototypeToken.texture.src,/opponent-hitman/);
 assert.equal(pc.img,'icons/svg/mystery-man.svg');
 globalThis.game.user.isGM=false;await assert.rejects(mod.applyEmblemsToWorld(),/Only a GM/);
});
test('pregens get unique portrait + token; Apply Noir Emblems dresses existing pregens and their placed tokens',async()=>{
 for(const id of ['PC01','PC02','PC03','PC04','PC05','PC06','PC07','PC08']){const a=mod.actorArtFor({type:'character',flags:{'cold-storage':{sourceId:id}}});assert.match(a.img,/-portrait\.svg$/);assert.match(a.token,/-token\.svg$/);assert.ok(exists(a.img)&&exists(a.token),id);}
 assert.equal(mod.actorArtFor({type:'character',name:'Someone else'}),null,'other player characters are untouched');
 const updates=[];
 const placed={texture:{src:'icons/svg/mystery-man.svg'},update:async c=>updates.push(['token',c])};
 const custom={texture:{src:'worlds/x/me.webp'},update:async c=>updates.push(['custom',c])};
 const pc={name:'Nia',type:'character',img:'icons/svg/mystery-man.svg',prototypeToken:{texture:{src:'icons/svg/mystery-man.svg'}},flags:{'cold-storage':{sourceId:'PC01'}},items:[],
  toObject(){return {name:this.name,type:this.type,img:this.img,flags:this.flags};},update:async c=>updates.push(['actor',c]),updateEmbeddedDocuments:async()=>{},getActiveTokens:()=>[placed,custom]};
 globalThis.Item={updateDocuments:async()=>{}};globalThis.game={user:{isGM:true},items:[],actors:[pc]};
 const r=await mod.applyEmblemsToWorld();assert.equal(r.actors,1);
 assert.match(updates.find(u=>u[0]==='actor')[1].img,/pc01-nia-calder-portrait/);assert.match(updates.find(u=>u[0]==='actor')[1]['prototypeToken.texture.src'],/pc01-nia-calder-token/);
 assert.match(updates.find(u=>u[0]==='token')[1]['texture.src'],/pc01-nia-calder-token/);assert.ok(!updates.some(u=>u[0]==='custom'),'custom token art kept');
});

