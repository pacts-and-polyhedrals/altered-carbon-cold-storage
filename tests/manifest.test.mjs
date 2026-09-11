import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest=JSON.parse(fs.readFileSync(new URL('../module.json',import.meta.url),'utf8'));

test('manifest identity and version are release-safe',()=>{
  assert.equal(manifest.id,'cold-storage');
  assert.equal(manifest.version,'1.0.0');
  assert.equal(manifest.compatibility.minimum,'14');
  assert.equal(manifest.compatibility.verified,'14');
});

test('manifest uses stable raw GitHub URL and versioned download URL',()=>{
  assert.equal(manifest.manifest,'https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-cold-storage/main/module.json');
  assert.equal(manifest.download,'https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/download/v1.0.0/cold-storage-v1.0.0.zip');
});

test('system dependency points at the clean Altered Carbon system manifest',()=>{
  const dep=manifest.relationships?.systems?.find(x=>x.id==='altered-carbon-rpg');
  assert.ok(dep);
  assert.equal(dep.type,'system');
  assert.equal(dep.compatibility.minimum,'1.0.0');
  assert.equal(dep.manifest,'https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/main/system.json');
});
