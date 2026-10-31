import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const m=JSON.parse(fs.readFileSync(new URL('../module.json',import.meta.url),'utf8'));
test('manifest retains identity and targets Foundry 14 without a false live verification',()=>{assert.equal(m.id,'cold-storage');assert.equal(m.version,'1.10.0');assert.equal(m.compatibility.minimum,'14');assert.equal(m.compatibility.verified,undefined);});
test('manifest follows the GitHub release contract used by the Altered Carbon system',()=>{
 assert.equal(m.manifest,'https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/latest/download/module.json');
 assert.equal(m.download,`https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/download/v${m.version}/cold-storage-v${m.version}.zip`);
});
test('Altered Carbon RPG 2.4.0 is the declared dependency, installed from its latest release',()=>{const dep=m.relationships.systems.find(x=>x.id==='altered-carbon-rpg');assert.ok(dep);assert.equal(dep.type,'system');assert.equal(dep.compatibility.minimum,'2.4.0');assert.equal(dep.manifest,'https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json');});
