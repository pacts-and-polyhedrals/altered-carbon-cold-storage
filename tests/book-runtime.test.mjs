/** A document-API simulation, not a substitute for licensed Foundry live QA. */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const copy=v=>structuredClone(v);
class Collection extends Array{get contents(){return this;}get(id){return this.find(x=>x.id===id);}}
let serial=0;
function set(obj,key,value){const parts=key.split('.');let t=obj;for(const p of parts.slice(0,-1))t=t[p]??={};t[parts.at(-1)]=copy(value);}
class Doc{
 constructor(data){Object.assign(this,copy(data));this.id=data._id??String(++serial).padStart(16,'0');this.flags??={};this.ownership??={default:0};}
 getFlag(scope,key){return this.flags?.[scope]?.[key];}
 async update(data){for(const [k,v] of Object.entries(data))set(this,k,v);return this;}
 async setFlag(scope,key,value){return this.update({[`flags.${scope}.${key}`]:value});}
 toObject(){const out={};for(const [k,v] of Object.entries(this))if(!['pages','sheet'].includes(k))out[k]=copy(v);out._id=this.id;delete out.id;return out;}
}
class Page extends Doc{}
class Journal extends Doc{
 constructor(data){super(data);this.pages=new Collection(...(data.pages??[]).map(p=>new Page(p)));this.sheet={render:()=>{}};}
 async createEmbeddedDocuments(type,data){assert.equal(type,'JournalEntryPage');const pages=data.map(p=>new Page(p));this.pages.push(...pages);return pages;}
 static async create(data){const j=new Journal(data);game.journal.push(j);return j;}
}
class Application{async _prepareContext(){return {};}render(){return this;}}
globalThis.foundry={utils:{deepClone:copy,escapeHTML:s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))},applications:{api:{ApplicationV2:Application,HandlebarsApplicationMixin:Base=>Base,DialogV2:{confirm:async()=>true}}}};
globalThis.JournalEntry=Journal;
globalThis.Folder={create:async data=>{const d=new Doc(data);game.folders.push(d);return d;}};
globalThis.Actor={create:async data=>{const d=new Doc(data);game.actors.push(d);return d;}};
globalThis.ui={notifications:{info:()=>{},warn:()=>{},error:()=>{}}};
globalThis.fetch=async path=>({ok:true,json:async()=>JSON.parse(await fs.readFile(new URL('../content-src/'+path.split('/').at(-1),import.meta.url),'utf8'))});
function setup(){const settings=new Map([['activePregens',['PC01']]]);globalThis.game={user:{id:'GM',isGM:true},system:{id:'altered-carbon-rpg'},folders:new Collection(),journal:new Collection(),actors:new Collection(),scenes:new Collection(),users:new Collection({id:'GM',isGM:true,name:'GM'},{id:'P1',isGM:false,name:'Player One'},{id:'P2',isGM:false,name:'Player Two'}),settings:{register:(m,k,def)=>{if(!settings.has(k))settings.set(k,copy(def.default));},registerMenu:()=>{},get:(m,k)=>settings.get(k),set:async(m,k,v)=>{settings.set(k,copy(v));return v;}}};}
const module=await import('../book.mjs');
test('book import, migration, privacy, backups and re-import preserve played data',async()=>{
 setup();module.registerBook();
 const pc=new Doc({name:'Played PC',type:'character',ownership:{default:0,P1:3},flags:{'cold-storage':{sourceId:'PC01',selectionState:'active'}},system:{resources:{ego:{value:1,max:30}}},items:[{id:'REL1',system:{revealState:'reconciled'}},{id:'GUN',system:{ammo:2}}]});game.actors.push(pc);
 const pcBefore=JSON.stringify(pc);
 const legacy=await Journal.create({name:'Old GM secret',ownership:{default:2,P1:3},flags:{'cold-storage':{sourceId:'J15'}},pages:[{name:'Old text',type:'text',ownership:{default:2,P1:3},text:{content:'OLD SECRET - PRESERVE ME',format:1}},{name:'GM campaign notes',type:'text',ownership:{default:2,P2:3},text:{content:'CUSTOM PAGE MUST REMAIN',format:1}}]});
 const customScene=new Doc({name:'Ward',journal:'my-existing-custom-journal',background:{src:'my-art.webp'},flags:{'cold-storage':{sourceId:'SCENE-WARD'}}});
 const emptyScene=new Doc({name:'Core',journal:null,flags:{'cold-storage':{sourceId:'SCENE-CORE'}}});game.scenes.push(customScene,emptyScene);
 const result=await module.importAdventureBook({notify:false});
 assert.equal(result.bookJournals,74);assert.equal(result.journals,96);
 assert.equal(JSON.stringify(pc),pcBefore,'PC resources, gear, ownership, relationship states changed');
 assert.equal(game.actors.length,1,'book-only update must NOT touch Actors, including adding Benefactors');
 assert.equal(customScene.journal,'my-existing-custom-journal');assert.equal(customScene.background.src,'my-art.webp');assert.equal(emptyScene.journal,game.journal.find(x=>x.getFlag('cold-storage','sourceId')==='G21').id,'Core scene now opens the Final Operation chapter');
 assert.equal(legacy.ownership.default,0);assert.equal(legacy.ownership.P1,0);assert.ok(legacy.pages.some(p=>p.text.content==='CUSTOM PAGE MUST REMAIN'));
 for(const p of legacy.pages){assert.equal(p.ownership.default,-1);assert.equal(p.ownership.P1,-1);assert.equal(p.ownership.P2,-1);}
 const recoveries=game.journal.filter(j=>j.getFlag('cold-storage','bookCategory')==='recovery');assert.equal(recoveries.length,1);assert.equal(recoveries[0].ownership.default,0);assert.equal(recoveries[0].pages[0].text.content,'OLD SECRET - PRESERVE ME');
 for(const j of game.journal)for(const p of j.pages)assert.doesNotMatch(p.text.content,/\[\[G\d\d\|/);
 const publicPrimer=game.journal.find(j=>j.getFlag('cold-storage','sourceId')==='J00');assert.equal(publicPrimer.ownership.default,2);
 const late=game.journal.find(j=>j.getFlag('cold-storage','sourceId')==='H11');assert.equal(late.ownership.default,0);assert.equal(late.ownership.P1,0);
 const before={journals:game.journal.length,folders:game.folders.length,actors:game.actors.length};
 await module.importAdventureBook({notify:false});assert.deepEqual({journals:game.journal.length,folders:game.folders.length,actors:game.actors.length},before,'re-import duplicated content');assert.equal(JSON.stringify(pc),pcBefore);
 await module.revealBookEntry('H11',['P1']);assert.equal(late.ownership.P1,2);assert.equal(late.ownership.P2,0);
 await module.importAdventureBook({notify:false});assert.equal(late.ownership.P1,2,'deliberate disclosure lost');
 await assert.rejects(module.revealBookEntry('PC01-CARD','everyone'),/explicit individual/);
 await assert.rejects(module.revealBookEntry('G01','everyone'),/Only evidence/);
 await module.revealBookEntry('PC01-CARD',['P1']);
 const card=game.journal.find(j=>j.getFlag('cold-storage','sourceId')==='PC01-CARD');assert.equal(card.ownership.P1,2);assert.equal(card.ownership.P2,0);
 const g08=game.journal.find(j=>j.getFlag('cold-storage','sourceId')==='G08');await g08.pages[0].update({'text.content':'GM CUSTOM EDIT'});
 await module.importAdventureBook({notify:false});assert.ok(game.journal.some(j=>j.getFlag('cold-storage','recoveredFrom')==='G08'&&j.pages[0].text.content==='GM CUSTOM EDIT'));
 const count=game.journal.length;await module.importAdventureBook({notify:false});assert.equal(game.journal.length,count,'unchanged re-import created another recovery');
 const state=await module.changeBookCounter('fray',6,'PC01');assert.equal(state.fray.PC01,6);assert.equal(JSON.stringify(pc),pcBefore,'manual Fray mutated Ego');
 assert.equal((await module.changeBookCounter('fray',1,'PC01')).fray.PC01,6);
 assert.equal((await module.changeBookCounter('heat',-6)).heat,0);
 await assert.rejects(module.changeBookCounter('notReal',1),/Unknown counter/);
 game.user.isGM=false;assert.throws(()=>module.bookAPI().openBook(),/Only a GM/);await assert.rejects(module.importAdventureBook(),/Only a GM/);await assert.rejects(module.revealBookEntry('H01','everyone'),/Only a GM/);await assert.rejects(module.changeBookCounter('fray',1,'PC01'),/Only a GM/);
});
test('imported pages carry the case-file header and check chips; an untouched re-import makes no recovery copies',async()=>{
 setup();module.registerBook();await module.importAdventureBook({notify:false});
 const page=id=>game.journal.find(j=>j.getFlag('cold-storage','sourceId')===id).pages[0].text.content;
 assert.match(page('G09'),/^<article class="cs-book-journal cs-cat-gm"><p class="cs-page-kicker">COLD STORAGE \/\/ GM ONLY \/\/ ADVENTURE BOOK \/\/ G09<\/p>/);
 assert.match(page('G09'),/@CSCheck\[Bureaucracy;Diplomacy\|0\|G09\]/);
 assert.match(page('H01'),/cs-cat-handout/);
 const before=game.journal.length;await module.importAdventureBook({notify:false});
 assert.equal(game.journal.length,before,'re-import of unedited pages must not create recovery copies');
 const g09=game.journal.find(j=>j.getFlag('cold-storage','sourceId')==='G09').pages[0];await g09.update({'text.content':'<p>GM notes typed into the page</p>'});
 await module.importAdventureBook({notify:false});
 assert.equal(game.journal.length,before+1,'a GM-edited page is backed up once');
});

