from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[1]
path=ROOT/'cold-storage.mjs'
s=path.read_text()
s="import {registerContinuity, continuityAPI, initializeContinuity, archivedRecord} from './continuity.mjs';\n"+s
s=s.replace("startingResources:starting,archetypeResourceApplied:true", "startingResources:starting,currentOrdinal:p.currentSleeveOrdinal,nonCloneCurrent:true,archetypeResourceApplied:true")
s=s.replace("if(!a.items.find(i=>sourceId(i)===s.id))await a.createEmbeddedDocuments('Item',[{name:s.name,type:'archivedSleeve',system:{status:'archived',sleeveType:'other',acquired:String(s.years[0]),lost:String(s.years[1]),lossCause:s.lossOrTransfer,description:`<p>${s.history}</p><p><strong>Important memory:</strong> ${s.importantMemory}</p><p><strong>Unresolved consequence:</strong> ${s.unresolvedConsequence}</p>`,rulesRef:'Cold Storage original content'},flags:{[MOD]:{sourceId:s.id,pcId:s.pcId}}}]);",
            "if(!a.items.find(i=>sourceId(i)===s.id))await a.createEmbeddedDocuments('Item',[archivedRecord(s)]);")
s=s.replace("flags:{[MOD]:{sourceId:r.id}}}]);", "flags:{[MOD]:{sourceId:r.id,unverifiedArchive:Boolean(r.continuityUnverified)}}}]);")
s=s.replace("await game.settings.set(MOD,'installed',true);", "await game.settings.set(MOD,'installed',true);\n await initializeContinuity({freshWorld:true});")
s=s.replace(" registerBook();", " registerBook();\n registerContinuity();")
s=s.replace("game.coldStorage={...bookAPI(),", "game.coldStorage={...bookAPI(),...continuityAPI(),")
path.write_text(s)

b=ROOT/'book.mjs'
s=b.read_text().replace("Cold Storage 1.1.1", "Cold Storage 1.2.0").replace("const VERSION='1.1.1'", "const VERSION='1.2.0'")
s=s.replace("actions:{importBook:this._importBook,open:this._open,reveal:this._reveal,count:this._count}","actions:{importBook:this._importBook,open:this._open,reveal:this._reveal,count:this._count,openContinuity:this._openContinuity}")
s=s.replace("  static async _importBook(){", "  static async _importBook(){")
s=s.replace(" static async _open(event,target){", " static async _openContinuity(){game.coldStorage?.openContinuity?.();}\n static async _open(event,target){")
s=s.replace("game.actors.filter(a=>active.has(sid(a))).map(a=>({id:sid(a),name:a.name,fray:state.fray?.[sid(a)]??3}))", "game.actors.filter(a=>active.has(sid(a))).map(a=>({id:sid(a),name:a.name,fray:state.fray?.[sid(a)]??(({PC01:2,PC02:3,PC03:4,PC04:5,PC05:2,PC06:3,PC07:4,PC08:5})[sid(a)]??3)}))")
s=s.replace("(state.fray[pcId]??3)+delta", "(state.fray[pcId]??(({PC01:2,PC02:3,PC03:4,PC04:5,PC05:2,PC06:3,PC07:4,PC08:5})[pcId]??3))+delta")
b.write_text(s)

manifest=ROOT/'module.json';m=json.loads(manifest.read_text());m['version']='1.2.0'
m['description']='Cold Storage cyber-noir adventure: 74 authored journals, 16 controlled evidence handouts, 8 pregens in non-clone 5th-8th sleeves, 46 source archived records (2 contested), 160 relationship links, GM Continuity & Psychosurgery Console, Core Baggage and optional Fray workflows. Foundry 14 live QA outstanding.'
m['relationships']['systems'][0]['compatibility']['minimum']='2.0.0'
manifest.write_text(json.dumps(m,indent=2)+'\n')

compiler=ROOT/'scripts/compile_book.py';s=compiler.read_text().replace("'version':'1.1.0'", "'version':'1.2.0'").replace("'version':'1.1.0'", "'version':'1.2.0'").replace("'start':3,'cap':6", "'start':'character-specific (2-5)','startsBySleeveOrdinal':{'5':2,'6':3,'7':4,'8':5},'cap':6").replace('Complete GM book - version 1.1.0', 'Complete GM book - version 1.2.0')
compiler.write_text(s)

validator=ROOT/'scripts/validate.mjs';s=validator.read_text().replace("manifest.version!=='1.1.0'", "manifest.version!=='1.2.0'").replace("release manifest must be version 1.1.0", "release manifest must be version 1.2.0");validator.write_text(s)

build=ROOT/'scripts/build.sh';s=build.read_text().replace('module.json cold-storage.mjs book.mjs content-src','module.json cold-storage.mjs book.mjs continuity.mjs continuity-rules.mjs content-src');build.write_text(s)

pkg=ROOT/'package.json';j=json.loads(pkg.read_text());j['version']='1.2.0';pkg.write_text(json.dumps(j,indent=2)+'\n')
print('Core module integration and manifest 1.2.0 updated')
