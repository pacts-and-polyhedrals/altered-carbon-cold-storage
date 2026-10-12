import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const data=n=>JSON.parse(fs.readFileSync(new URL('../content-src/'+n,import.meta.url),'utf8'));
const entries=data('journals.json');
test('complete manuscript and original journal IDs survive',()=>{
 assert.equal(entries.length,74);assert.equal(entries.filter(x=>x.category==='gm').length,30);assert.equal(entries.filter(x=>x.category==='handout').length,16);assert.equal(entries.filter(x=>x.category==='personal').length,8);
 for(let n=0;n<19;n++)assert.ok(entries.some(x=>x.id===`J${String(n).padStart(2,'0')}`));
 assert.ok(entries.reduce((sum,x)=>sum+x.wordCount,0)>34000);
 assert.equal(new Set(entries.map(x=>x.id)).size,74);
});
test('every authored internal journal target resolves',()=>{const ids=new Set(entries.map(x=>x.id));for(const e of entries)for(const m of e.body.matchAll(/\[\[([^|\]]+)\|([^\]]+)\]\]/g))assert.ok(ids.has(m[1]),`${e.id} -> ${m[1]}`);});
test('all late evidence and personal cards are GM-only at import',()=>{
 for(const e of entries.filter(x=>['gm','personal','handout'].includes(x.category)))assert.equal(e.visibility,'gm',e.id);
 for(const id of ['J15','J17'])assert.equal(entries.find(x=>x.id===id).visibility,'gm');
 const publicText=entries.filter(x=>x.visibility==='public').map(x=>x.body).join('\n');
 assert.doesNotMatch(publicText,/MERCY-9|JANUS-4|ATLAS-12|M9\.2269|J4\.2269|A12\.2269/);
 assert.doesNotMatch(publicText,/\[\[(?:G\d\d|H\d\d)\|/);
});
test('all three running schedules total exactly 4, 5 and 6 hours',()=>{const a=data('adventure.json');for(const [name,total] of [['fourHours',240],['fiveHours',300],['sixHours',360]])assert.equal(a.schedule[name].reduce((x,y)=>x+y),total);for(const s of a.scenes)assert.ok(s.purpose.length&&s.journal);});
test('Fray is an explicit opt-in overlay with five pulses and two anchor opportunities',()=>{const f=data('adventure.json').fray;assert.equal(f.houseRule,true);assert.equal(f.start,"character-specific (2-5)");assert.deepEqual(f.startsBySleeveOrdinal,{"5":2,"6":3,"7":4,"8":5});assert.equal(f.cap,6);assert.equal(f.scheduledPulses.length,5);assert.equal(f.freeAnchors.length,2);});
test('new rulers are separate social NPCs, not rewrites of human contacts',()=>{const gods=data('benefactors.json');assert.equal(gods.length,3);const contacts=new Set(data('contacts.json').map(x=>x.id));assert.ok(gods.every(x=>!contacts.has(x.id)));});
