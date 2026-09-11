import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=n=>JSON.parse(fs.readFileSync(path.join(ROOT,'content-src',n),'utf8'));

test('required Cold Storage content counts are complete',()=>{
  const pregens=read('pregens.json');
  const sleeves=read('previous-sleeves.json');
  const contacts=read('contacts.json');
  const relationships=read('relationships.json');
  const factions=read('factions.json');
  const journals=read('journals.json');
  const loadouts=read('pregen-loadouts.json');
  const adversaries=read('adversaries.json');
  assert.equal(pregens.length,8);
  assert.equal(sleeves.length,40);
  assert.equal(contacts.length,20);
  assert.equal(relationships.length,160);
  assert.equal(factions.length,6);
  assert.equal(journals.length,19);
  assert.equal(loadouts.length,8);
  assert.equal(adversaries.length,4);
});

test('each pregen has five archived sleeves and each sleeve has four relationship categories',()=>{
  const pregens=read('pregens.json');
  const sleeves=read('previous-sleeves.json');
  const relationships=read('relationships.json');
  for(const pc of pregens){
    const own=sleeves.filter(x=>x.pcId===pc.id);
    assert.equal(own.length,5,pc.id);
    assert.equal(pc.currentSleeve.damageThreshold,pc.currentSleeve.strength,`${pc.id} damage threshold`);
    for(const sl of own){
      const links=relationships.filter(x=>x.pcSleeveId===sl.id);
      assert.equal(links.length,4,sl.id);
      assert.deepEqual(new Set(links.map(x=>x.category)),new Set(['enemy','rival','ally','loved-one']),sl.id);
    }
  }
});

test('all relationship contact references resolve',()=>{
  const contacts=new Set(read('contacts.json').map(x=>x.id));
  for(const rel of read('relationships.json')) assert.ok(contacts.has(rel.contactId),rel.id);
});

test('essential revelations have at least three independent clue channels',()=>{
  for(const revelation of read('revelations.json').filter(x=>x.essential)){
    assert.ok(revelation.clues.length>=3,revelation.id);
    assert.ok(new Set(revelation.clues.map(c=>c.channel)).size>=3,revelation.id);
  }
});

test('previous sleeve histories meet the 150-250 word target',()=>{
  for(const sleeve of read('previous-sleeves.json')){
    const words=(sleeve.history.match(/\b[\w’'-]+\b/g)||[]).length;
    assert.ok(words>=150&&words<=250,`${sleeve.id}: ${words} words`);
  }
});

test('every pregen has a canonical loadout and three baggage entries',()=>{
  const pregens=new Set(read('pregens.json').map(x=>x.id));
  const loadouts=read('pregen-loadouts.json');
  assert.deepEqual(new Set(loadouts.map(x=>x.pcId)),pregens);
  for(const loadout of loadouts) assert.equal(loadout.baggage.length,3,loadout.pcId);
});

test('adversaries have usable combat resources',()=>{
  for(const adversary of read('adversaries.json')){
    assert.ok(adversary.strength>=30,adversary.id);
    assert.ok(adversary.health>0,adversary.id);
    assert.ok(adversary.speedDice>=1,adversary.id);
    assert.ok(adversary.minionBonus>=0,adversary.id);
  }
});
