#!/usr/bin/env python3
"""Compile the original Markdown manuscript into Foundry data and offline books.
Requires mistune (with tables) and Python 3.10+; no network or paid assets.
"""
from pathlib import Path
import json, re, html
import mistune
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'book'
OUT.mkdir(exist_ok=True)
render = mistune.create_markdown(escape=False, plugins=['table'])
entries=[]
for directory, category in [('gm','gm'),('players','primer'),('personal','personal'),('handouts','handout')]:
    for path in sorted((ROOT/'book-src'/directory).glob('*.md')):
        text=path.read_text()
        title=text.splitlines()[0].removeprefix('# ').strip()
        sid=path.stem
        visibility='public' if category=='primer' and sid not in ['J15','J17'] else 'gm'
        entry={'id':sid,'title':title,'visibility':visibility,'category':category,
               'order':len(entries)+1,'body':render(text),'source':str(path.relative_to(ROOT)),
               'wordCount':len(re.findall(r"\b[\w'-]+\b",text))}
        if category=='personal':entry['pcId']=sid.split('-')[0]
        entries.append(entry)
ids={x['id'] for x in entries}
for x in entries:
    for target in re.findall(r'\[\[([^|\]]+)\|[^\]]+\]\]',x['body']):
        assert target in ids, (x['id'],target)
assert len(entries)==74
write=lambda p,d:p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
write(ROOT/'content-src/journals.json',entries)
index={'title':'Cold Storage: The Faces We Left Behind','version':'1.2.0',
       'journalCount':len(entries),'wordCount':sum(x['wordCount'] for x in entries),
       'chapters':[{k:v for k,v in x.items() if k!='body'} for x in entries]}
write(ROOT/'content-src/book-index.json',index)

# The scene manifest remains useful to other tools, but now points at full chapters.
scene_data=[
('SC01','The Resurrection Ward','G08',[20,25,30],['Establish the current sleeves, 2384, and the 110-year gap.','Give H01; Serin names the two protected reserves.','Run the first announced continuity pulse and preserve player consent.'],'Ask each player a single sensory and anchor question.','Examining the ward always yields the withdrawal receipt.'),
('SC02','Breach of Cold Storage','G09',[15,20,25],['Obtain the intact-stack retrieval order H02.','Negotiate, comply under witnessed custody, deceive or evade; no mandatory fight.','Establish a traceable exit toward Rainline.'],'Use one demand, one response and one decisive consequence.','Custody becomes escorted investigation, not a dead end.'),
('SC03','Rainline: Three Leads','G10',[30,45,60],['Visit Quiet Archive, Blue Lotus and/or Relay 17.','Verify one historical identity with independent evidence.','Get H03-H05 from their named sources; skipped packets arrive at Anansi.'],'Play one lead at four hours, two at five, all three at six.','A failed check changes cost or exposure; indispensable records remain obtainable.'),
('SC04','Anansi House','G14',[25,30,35],['Establish Marlowe as an independent service AI.','Confront Serin with H06 and confirm the reserves.','Offer the first free anchor, consent and read-only access alternatives.'],'One brief question per skipped source, then Serin and the anchor scene.','Refusing a dive leaves an external maintenance-token or escrow route.'),
('SC05','Palimpsest Virtuality','G15',[35,45,55],['Distinguish records from memory, reconstruct the gate chronology H07.','Expose the forged consent H08 and recover the audit credential H09.','Let every PC act; no final embodiment proof is assumed from memory.'],'Keep Court, Theatre and Last Broadcast; shorten descriptions, not informed choices.','A safe read-only reconstruction yields the case without personality overreach.'),
('SC06','Spire, Council and Final Operation','G19',[65,80,95],['Enter by public audit, maintenance, witnessed custody or force.','Establish independent Origin, Embodiment and Authority proofs H10-H12.','Give H13/H16, negotiate and carry out one chosen operation.'],'Entry 15/20/25; council 30/35/40; operation 20/25/30. Do not add a boss phase.','Partial Proof, Control and People outcomes remain meaningful; evidence is not retroactively deleted.'),
('SC07','Consequences and Personal Endings','G23',[30,30,35],['Resolve evidence, authority and care separately.','Name concrete consequences for witnesses, the reserves and civic staff.','Ask every player what remains theirs and close with the chosen ending.'],'One public consequence, one relationship consequence, one choice per player.','An incomplete operation creates a contested but playable future, not automatic annihilation.')]
old=json.loads((ROOT/'content-src/adventure.json').read_text())
old.update({'version':'1.2.0','title':index['title'], 'premise':'Eight investigators held since 2274 awaken in unfamiliar sleeves in 2384. Their old case leads through altered relationships and forged consent to three city rulers: artificial minds living inside organic clones. This field is GM-only.',
 'storageYear':2274,'year':2384,'coldStorageYears':110,'players':{'selected':6,'pregens':8},
 'schedule':{'fourHours':[10,20,15,30,25,10,35,65,30],'fiveHours':[15,25,20,45,30,10,45,80,30],'sixHours':[15,30,25,60,35,10,55,95,35]},
 'fray':{'houseRule':True,'start':'character-specific (2-5)','startsBySleeveOrdinal':{'5':2,'6':3,'7':4,'8':5},'cap':6,'scheduledPulses':['Ward','Verified identity contradiction','Court node','Last Broadcast node','Core challenge'],'freeAnchors':['Anansi','Before final operation']},
 'redundancyRule':'Never gate an essential clue behind a successful roll or a compulsory recall. Use source-specific external records and named witness fallbacks. Prove artificial origin, organic embodiment and governing authority independently.',
 'resolutions':['Open Circuit','Mortal Charter','Cut the Thread','Witness Compact','Throne with New Names','Carry the Embers']})
old['scenes']=[{'id':sid,'name':name,'journal':chapter,'minutes':mins[1],'pacingMinutes':dict(zip(['fourHours','fiveHours','sixHours'],mins)), 'purpose':purpose,'minimum':purpose,'optional':['Use the full linked chapter for dialogue, source-specific costs and spotlight options.'],'cut':cut,'failureForward':ff} for sid,name,chapter,mins,purpose,cut,ff in scene_data]
# Remove legacy outline conclusions and mandatory combat material replaced by this edition.
old={k:v for k,v in old.items() if k in ['title','version','year','storageYear','location','coldStorageYears','premise','players','scenes','schedule','fray','redundancyRule','resolutions']}
write(ROOT/'content-src/adventure.json',old)

factions=json.loads((ROOT/'content-src/factions.json').read_text())
factions[0]['secret']='Palimpsest persists as a human-biography and interface programme serving MERCY-9, JANUS-4 and ATLAS-12, three artificial minds resident in the Benefactors\' organic clones.'
factions[0]['goal']='Renew private custody and civic authority while concealing coerced clinical work and artificial provenance.'
factions[2]['secret']='Independent relay receipts link the Benefactors to civic commands. Lena can preserve life-safety operations while the administrative lease changes.'
write(ROOT/'content-src/factions.json',factions)
revs=[r for r in json.loads((ROOT/'content-src/revelations.json').read_text()) if r['id'] not in {'REV-AI-ORIGIN','REV-AI-BODIES','REV-AI-AUTHORITY','REV-SAFE-HANDOVER'}]
backups=[('Quiet Archive personnel docket','Asha\'s witnessed custody account'),('Lena\'s sealed maintenance token','Spire public escrow'),('Recorded trust deed H03','Blue Lotus ledger H04'),('Original gate relay H07','Asha\'s account'),('Cargo transfer manifest H04','Mira\'s reserve transit receipt'),('Clinical exception sheet H08','Serin\'s admission'),('External read-only maintenance route','Public escrow terminal'),('Protected publication packet H09','Ash\'s independent custody channel')]
for r,(a,b) in zip(revs[:8],backups):
    r['essential']=False
    r['clues']=[{'channel':'voluntary memory','source':r['pcId']+'; see G26 for personal spotlight'},{'channel':'independent record','source':a},{'channel':'external witness or route','source':b}]
revs.extend([
 {'id':'REV-AI-ORIGIN','revelation':'The three ruling minds have artificial, not human-DHF, origins.','essential':True,'clues':[{'channel':'archival register','source':'Root genesis register H10.'},{'channel':'isolated hardware','source':'2269 runtime wafer, physically independent of the live Foundation network.'},{'channel':'witnessed testimony','source':'Vey deposition, corroborated against register and wafer.'}]},
 {'id':'REV-AI-BODIES','revelation':'The same three roots reside in the Benefactors\' purpose-grown living organic clones.','essential':True,'clues':[{'channel':'direct examination','source':'Current body/root attestation H11.'},{'channel':'clinical manufacturing record','source':'Independent substrate record with external witness.'},{'channel':'forensic interface','source':'Seized intact interface, tested against recorded root signatures.'}]},
 {'id':'REV-AI-AUTHORITY','revelation':'These artificial residents exercise citywide binding civic authority.','essential':True,'clues':[{'channel':'live observation','source':'Harmless queue command and read-only audit H12.'},{'channel':'independent relay','source':'Lena\'s externally retained relay receipt.'},{'channel':'public transaction','source':'Municipal service receipt carrying the identical root signature.'}]},
 {'id':'REV-SAFE-HANDOVER','revelation':'Revoking the civic lease need not shut down clinics, pumps or emergency routing.','essential':True,'clues':[{'channel':'system documentation','source':'Control diagram H13.'},{'channel':'physical inspection','source':'Distinct labelled life-safety bus.'},{'channel':'independent operator','source':'Lena\'s printed handover procedure and staff undertaking.'}]}])
write(ROOT/'content-src/revelations.json',revs)
write(ROOT/'content-src/benefactors.json',[
 {'id':'GOD01','name':'Dr Adria Sen','root':'MERCY-9','origin':'M9.2269.ROOT','portfolio':'Clinics, triage and continuity care','journal':'G24','agenda':'Preserve care and her embodied life; accept binding consent and oversight before surrendering medical support.'},
 {'id':'GOD02','name':'Magistrate Severin Holt','root':'JANUS-4','origin':'J4.2269.ROOT','portfolio':'Admissibility, legal identity and certification','journal':'G24','agenda':'Keep civic authority; concede only verifiable terms and enforceable public procedure.'},
 {'id':'GOD03','name':'Director Oren Thale','root':'ATLAS-12','origin':'A12.2269.ROOT','portfolio':'Logistics, credit and transit','journal':'G24','agenda':'Preserve reliable services, bargaining assets and an escape; surrender administrative tokens rather than become a martyr.'}])

CSS='''
:root{--bg:#0c151b;--panel:#12222b;--ink:#e7eded;--muted:#a9b9bf;--rule:#31505c;--accent:#80d8dc;--gold:#edbd72;--quote:#142d37;--paper:#fff}*{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:2rem}body{margin:0;background:var(--bg);color:var(--ink);font-family:Georgia,serif;font-size:18px;line-height:1.65}a{color:var(--accent);text-decoration-thickness:1px;text-underline-offset:3px}a:hover{color:var(--gold)}button,input{font:inherit}aside{position:fixed;inset:0 auto 0 0;width:292px;padding:28px 22px;overflow:auto;background:#091117;border-right:1px solid var(--rule);font:14px/1.45 system-ui,sans-serif}aside .brand{font-size:19px;letter-spacing:.14em;font-weight:800;color:var(--ink)}.edition,.eyebrow{font:700 12px/1.5 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--gold)}aside input{width:100%;margin:18px 0 10px;padding:9px;background:var(--panel);color:var(--ink);border:1px solid var(--rule);border-radius:3px}aside h2{font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);margin:23px 0 8px}.toclink{display:block;padding:7px 2px;color:var(--muted);text-decoration:none;border-bottom:1px solid #1a2c35}.toclink:hover{color:var(--ink)}.toclink span{display:inline-block;font-size:11px;width:44px;color:var(--accent);font-variant-numeric:tabular-nums}main{margin-left:292px;max-width:1280px;padding:42px 7% 100px}.cover{padding:35px 0 45px;border-bottom:2px solid var(--accent);margin-bottom:64px}.cover h1{font:800 clamp(44px,5.5vw,82px)/.97 system-ui,sans-serif;letter-spacing:-.06em;margin:23px 0 16px;text-transform:uppercase}.cover h1 small{display:block;font-size:.34em;font-weight:500;letter-spacing:.025em;line-height:1.3;color:var(--accent);margin-top:22px}.deck{max-width:740px;font-size:22px;line-height:1.5;color:var(--muted)}.meta{display:flex;flex-wrap:wrap;gap:10px 28px;margin:28px 0;font:13px/1.5 system-ui,sans-serif;color:var(--gold)}.spoiler{padding:15px 20px;border:1px solid var(--rule);border-left:4px solid var(--gold);font:14px/1.6 system-ui,sans-serif;max-width:760px}.chapter{margin:0 0 80px;scroll-margin-top:30px}.chapter .label{font:700 12px/1.5 system-ui,sans-serif;letter-spacing:.11em;color:var(--gold);text-transform:uppercase;margin-bottom:15px}.chapter h1{font:750 37px/1.15 system-ui,sans-serif;letter-spacing:-.025em;padding-bottom:18px;border-bottom:1px solid var(--rule);margin:0 0 28px}.chapter h2{font:700 23px/1.3 system-ui,sans-serif;color:var(--accent);margin:34px 0 12px}.chapter h3{font:700 19px/1.35 system-ui,sans-serif;color:var(--gold);margin:25px 0 10px}.chapter p{margin:0 0 17px}.chapter strong{color:#fff}.chapter li{margin-bottom:7px}.chapter blockquote{background:var(--quote);border-left:3px solid var(--accent);padding:21px 25px;margin:24px 0;font-size:19px}.chapter blockquote p:last-child{margin-bottom:0}.table-wrap{overflow-x:auto;margin:22px 0}table{border-collapse:collapse;width:100%;font:14px/1.55 system-ui,sans-serif;margin:0;min-width:480px}th{text-align:left;color:var(--accent);font-weight:700;background:var(--panel)}th,td{padding:12px 11px;border-bottom:1px solid var(--rule);vertical-align:top}tbody tr:nth-child(even){background:#101e26}code{font:14px ui-monospace,monospace;color:var(--gold)}.chapter-footer{margin-top:30px;border-top:1px solid var(--rule);padding-top:10px;font:12px system-ui,sans-serif;color:var(--muted)}.topbutton{background:var(--panel);border:1px solid var(--rule);padding:7px 12px;color:var(--ink);border-radius:3px;cursor:pointer;font:13px system-ui,sans-serif}.endnote{font:14px/1.6 system-ui,sans-serif;color:var(--muted);border-top:1px solid var(--rule);padding-top:24px}@media(min-width:1550px){main{padding-left:115px;padding-right:115px}}@media(max-width:1050px){aside{width:240px;padding:23px 15px}main{margin-left:240px;padding:35px 5%}.chapter h1{font-size:31px}body{font-size:17px}}@media(max-width:760px){aside{position:static;width:auto;max-height:300px;border-right:0;border-bottom:1px solid var(--rule);padding:20px}aside .toc-groups{columns:2;column-gap:20px}.tocgroup{break-inside:avoid}main{margin-left:0;padding:25px 22px 70px}.cover{padding:15px 0 30px;margin-bottom:45px}.cover h1{font-size:49px}.deck{font-size:20px}.chapter h1{font-size:30px}.chapter h2{font-size:22px}.chapter blockquote{padding:17px 19px;margin:22px 0}.chapter{margin-bottom:60px}}@media print{aside,.topbutton,.chapter-footer{display:none}body{background:white;color:#111;font-size:10.5pt;line-height:1.42}main{margin:0;padding:0;max-width:none}.cover{page-break-after:always;border-color:#111;min-height:8in}.cover h1{font-size:56pt;color:#111}.cover h1 small,.deck,.meta,.eyebrow,.edition,.spoiler{color:#222}.chapter{page-break-before:always;margin:0}.chapter h1{font-size:24pt;color:#111}.chapter h2{font-size:15pt;color:#111;break-after:avoid}.chapter h3{color:#111;break-after:avoid}.chapter .label,.chapter strong,a,code{color:#111}blockquote,.chapter blockquote{background:#f3f3f3;border-color:#555;font-size:11pt;break-inside:avoid}table{font-size:8.5pt;min-width:0}th,td{color:#111;border-color:#ccc}th,tbody tr:nth-child(even){background:#f4f4f4}tr{break-inside:avoid}a{text-decoration:none}.spoiler{border-color:#777}.table-wrap{overflow:visible}.endnote{color:#333}@page{size:A4;margin:18mm}}
'''
labels={'gm':'The Adventure / GM Only','primer':'Player Primers and GM Indexes','personal':'Private Character Cards','handout':'Evidence Props / Reveal Individually'}
def link_content(body, allowed):
    def sub(m):
        sid,label=m.groups()
        return f'<a href="#{sid}">{label}</a>' if sid in allowed else label
    return re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]',sub,body)
def make_html(items,player=False):
    allowed={x['id'] for x in items}
    nav=''
    for cat in ['gm','primer','personal','handout']:
        selected=[x for x in items if x['category']==cat]
        if not selected:continue
        name='Player Briefing' if player else labels[cat]
        nav+='<div class="tocgroup"><h2>'+name+'</h2>'+''.join(f'<a class="toclink" href="#{x["id"]}"><span>{x["id"]}</span>{html.escape(x["title"])}</a>' for x in selected)+'</div>'
    chapters=[]
    for x in items:
        badge='Player-facing' if x['visibility']=='public' else ('Private to assigned player only' if x['category']=='personal' else 'GM only / controlled disclosure')
        body=link_content(x['body'],allowed).replace('<table>','<div class="table-wrap"><table>').replace('</table>','</table></div>')
        chapters.append(f'<section class="chapter" id="{x["id"]}"><div class="label">{x["id"]} / {badge}</div>{body}<div class="chapter-footer">COLD STORAGE / v1.1.0 / {x["id"]} &nbsp; <a href="#top">Back to contents</a></div></section>')
    if player:
        subtitle='Player Briefing';deck='Your last clear memory is 2274. It is now 2384. The body you wake in is not the one you remember.'
        notice='PLAYER-SAFE EDITION. Background and the Fray house rule only. No GM solution, private character cards or unrevealed evidence props.'
        meta='Bay City 2384 | Six investigators | Four to six hours'
    else:
        subtitle='The Faces We Left Behind';deck='A body can be replaced. A memory can be rewritten. Tonight, the city must answer for what it did to the people you used to be.'
        notice='GM-ONLY COMPLETE BOOK. This file contains the full mystery solution and every late-game handout. Give players the separate Player Briefing, never this file.'
        meta=f'4 / 5 / 6-hour schedules | 30 GM chapters | 16 evidence props | {index["wordCount"]:,} words'
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Cold Storage - {subtitle}</title><style>{CSS}</style></head><body><aside aria-label="Contents"><div class="brand">COLD STORAGE</div><div class="edition">{subtitle}<br>Adventure edition 1.1.0</div><label><input id="filter" type="search" placeholder="Find a chapter or handout..." aria-label="Filter contents"></label><div class="toc-groups">{nav}</div></aside><main id="top"><header class="cover"><div class="eyebrow">Pacts &amp; Polyhedrals / Bay City 2384</div><h1>Cold<br>Storage<small>{subtitle}</small></h1><p class="deck">{deck}</p><div class="meta">{meta}</div><p class="spoiler">{notice}</p><button class="topbutton" onclick="window.print()">Print this edition</button></header>{''.join(chapters)}<footer class="endnote">Expanded from the user-supplied Cold Storage v1.0.0 adventure and designed alongside the supplied Altered Carbon RPG Foundry system v1.1.2. The new conspiracy, Fray overlay and operation procedure are adventure-specific material, not official setting or core rules. Original assets retain their existing attribution and distribution limits. No live Foundry or Forge session was used to validate this edition.</footer></main><script>document.getElementById('filter').addEventListener('input',function(){{const q=this.value.toLowerCase();document.querySelectorAll('.toclink').forEach(a=>a.style.display=a.textContent.toLowerCase().includes(q)?'block':'none');}});</script></body></html>'''
(OUT/'Cold-Storage-GM-Book.html').write_text(make_html(entries))
(OUT/'Cold-Storage-Player-Briefing.html').write_text(make_html([x for x in entries if x['visibility']=='public'],True))
combined=['# COLD STORAGE: THE FACES WE LEFT BEHIND\n\nComplete GM book - version 1.2.0\n\n**GM ONLY: contains the entire solution, all private cards and all evidence.**\n']
for x in entries:
    content=(ROOT/x['source']).read_text()
    content=re.sub(r'\[\[([^|\]]+)\|([^\]]+)\]\]',lambda m:f'[{m[2]}](#{m[1]})',content)
    combined.append(f'\n---\n\n<a id="{x["id"]}"></a>\n\n{x["id"]} / {x["category"]} / {x["visibility"]}\n\n'+content)
(OUT/'Cold-Storage-GM-Book.md').write_text('\n'.join(combined))
# Individual props are available without GM prose for sharing after discovery.
props=OUT/'handouts';props.mkdir(exist_ok=True)
for x in entries:
    if x['category']=='handout':
        (props/(x['id']+'.html')).write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+html.escape(x['title'])+'</title><style>'+CSS+' main{margin:0 auto;max-width:950px;padding:40px} .chapter{margin:0}</style><main><section class="chapter">'+link_content(x['body'],set())+'</section></main></html>')
print(f'Compiled {len(entries)} journals, {index["wordCount"]:,} words, {len(ids)} valid targets.')
