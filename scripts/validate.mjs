import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'module.json'),'utf8'));
const failures=[];
const requireFile=p=>{if(!fs.existsSync(path.join(ROOT,p))) failures.push(`Missing manifest-referenced file: ${p}`);};

for(const p of manifest.esmodules||[]) requireFile(p);
for(const p of manifest.styles||[]) requireFile(p);
for(const l of manifest.languages||[]) requireFile(l.path);

function walk(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) walk(p);
    else if(entry.name.endsWith('.json')){
      try{JSON.parse(fs.readFileSync(p,'utf8'));}
      catch(err){failures.push(`Invalid JSON ${path.relative(ROOT,p)}: ${err.message}`);}
    } else if(entry.name.endsWith('.mjs')){
      try{execFileSync(process.execPath,['--check',p],{stdio:'pipe'});}
      catch(err){failures.push(`Invalid JavaScript ${path.relative(ROOT,p)}`);}
    }
  }
}
walk(ROOT);

const forbidden=[];
function findForbidden(dir){
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(['node_modules','dist','.git'].includes(entry.name)) continue;
    const p=path.join(dir,entry.name);
    if(entry.isDirectory()) findForbidden(p);
    else if(/\.pdf$/i.test(entry.name)) forbidden.push(path.relative(ROOT,p));
  }
}
findForbidden(ROOT);
if(forbidden.length) failures.push(`Rulebook/source PDFs must not be distributed: ${forbidden.join(', ')}`);

if(manifest.id!=='cold-storage') failures.push('module id must remain cold-storage because runtime asset paths depend on it.');
if(manifest.version!=='1.9.0') failures.push('release manifest must be version 1.9.0.');
const dep=manifest.relationships?.systems?.find(x=>x.id==='altered-carbon-rpg');
if(dep?.compatibility?.minimum!=='2.4.0') failures.push('Altered Carbon system dependency must require 2.4.0.');
if(manifest.download&&!manifest.download.endsWith(`/v${manifest.version}/cold-storage-v${manifest.version}.zip`)) failures.push('download URL must name this version\'s release asset.');
if(manifest.manifest&&!manifest.manifest.endsWith('/releases/latest/download/module.json')) failures.push('manifest URL must use releases/latest/download/module.json.');
if(!manifest.relationships?.systems?.some(x=>x.id==='altered-carbon-rpg'&&x.manifest)) failures.push('Altered Carbon system dependency must include an explicit manifest URL.');

if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('Cold Storage validation passed.');
