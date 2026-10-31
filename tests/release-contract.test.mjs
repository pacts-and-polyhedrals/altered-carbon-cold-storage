import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const root=new URL('../',import.meta.url);
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const json=p=>JSON.parse(read(p));
test('module declares Foundry 14 + Altered Carbon 2.4 without asserting live certification',()=>{
 const m=json('module.json');assert.equal(m.id,'cold-storage');assert.equal(m.version,'1.10.0');
 assert.equal(m.compatibility.minimum,'14');assert.equal(m.compatibility.verified,undefined);
 assert.equal(m.relationships.systems.find(s=>s.id==='altered-carbon-rpg').compatibility.minimum,'2.4.0');
 assert.ok(m.manifest&&m.download);
 for(const file of [...m.esmodules,...m.styles,...m.languages.map(l=>l.path)])assert.ok(fs.existsSync(new URL('../'+file,import.meta.url)),file);
});
test('every module window uses the Altered Carbon system window class and look',()=>{
 for(const f of ['cold-storage.mjs','book.mjs','continuity.mjs'])for(const m of read(f).matchAll(/static DEFAULT_OPTIONS=\{id:'([^']+)'[^\n]*?classes:\[([^\]]*)\]/g))assert.match(m[2],/'altered-carbon'/,m[1]);
 assert.equal([...['cold-storage.mjs','book.mjs','continuity.mjs'].map(read).join('\n').matchAll(/static DEFAULT_OPTIONS=\{id:'cold-storage-/g)].length,4);
 assert.match(read('styles/cold-storage.css'),/\.altered-carbon\.cold-storage\{[^}]*--ac-/);
});
test('book handoff never loops back into the system legacy book',()=>{
 const book=read('book.mjs');assert.doesNotMatch(book,/game\.alteredCarbon\?\.Book\?\.(importBook|openBook)/);
});
test('UI actions have matching AppV2 action handlers and accessible labels',()=>{
 const source=read('continuity.mjs');const hbs=read('templates/continuity.hbs');
 for(const action of [...new Set([...hbs.matchAll(/data-action="([a-zA-Z0-9]+)"/g)].map(x=>x[1]))]){
  assert.ok(source.includes(`${action}:this._`),`action ${action} not registered in Continuity class`);
 }
 assert.match(hbs,/aria-labelledby=/);assert.match(hbs,/role="alert"/);
 assert.match(read('styles/cold-storage.css'),/:focus-visible|focus-visible/);
});
test('compiled story and offline books reflect the same numbered release and 5-8 sleeve edition',()=>{
 assert.equal(json('content-src/adventure.json').version,'1.2.0');assert.equal(json('content-src/book-index.json').version,'1.2.0');
 assert.equal(json('content-src/continuity-plans.json').version,'1.2.0');
 const gm=read('book/Cold-Storage-GM-Book.md');assert.match(gm,/Core-rule separation/);assert.match(gm,/non-clone/);
 assert.match(read('book/Cold-Storage-Player-Briefing.html'),/four through seven|fifth|sleeves five through eight/i);
});
test('install builder includes all local runtime modules and does not include licensed Core PDF',()=>{
 const build=read('scripts/build.sh');for(const n of ['continuity.mjs','continuity-rules.mjs','system-bridge.mjs','emblems.mjs','checks.mjs','journal-theme.mjs','scenes.mjs','templates','content-src','assets'])assert.ok(build.includes(n),n);
 assert.doesNotMatch(build,/\.pdf.*zip|pdfcoffee.*zip/);
 assert.match(read('cold-storage.mjs'),/Full Import is for fresh worlds only/);
});
