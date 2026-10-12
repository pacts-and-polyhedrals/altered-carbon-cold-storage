#!/usr/bin/env python3
"""One-time, idempotent Cold Storage continuity migration of authoring data.

Safe for repetition; retains the 40 supplied historical records and all 160 links.
Original records for two fifth-sleeve PCs are *contested archives*, not worn bodies.
"""
from pathlib import Path
import json

ROOT=Path(__file__).resolve().parents[1]
C=ROOT/'content-src'
load=lambda name:json.loads((C/name).read_text())
put=lambda name,data:(C/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
ordinals={'PC01':5,'PC02':6,'PC03':7,'PC04':8,'PC05':5,'PC06':6,'PC07':7,'PC08':8}
fray={5:2,6:3,7:4,8:5}
pregens=load('pregens.json')
for p in pregens:
    p['currentSleeveOrdinal']=ordinals[p['id']]
    p['startingFray']=fray[p['currentSleeveOrdinal']]
    p['continuityVersion']='1.2.0'
    if p['id']=='PC03':
        p['currentSleeve']['type']='organic'
        p['currentSleeve']['concept']='Non-clone organic municipal labour sleeve, independently sourced; Sabine retains a Meth history but no clone exemption or linked clone bank'
    assert p['currentSleeve']['type']!='clone'
put('pregens.json',pregens)

past=load('previous-sleeves.json')
original={x['id']:x for x in past}
for p in ('PC01','PC05'):
    source=original[f'{p}-S5']
    source['continuityStatus']='disputed'
    source['continuityNote']='Palimpsest-authored archive claims a separate body. Not verified as a worn sleeve; its witnesses and records remain evidence, not proof of a sixth body.'
    if source['history'].startswith('Palimpsest disputes') and 'Contacts remain evidence' in source['history']:
        source['history']=source['history'].replace('Palimpsest disputes whether this dossier describes another body. Contacts remain evidence, not proof of that extra sleeving. ', '', 1)
    if source['history'].startswith('An uncorroborated Palimpsest file'):
        source['history']=source['history'].split('record. ',1)[-1]
    source['history']=source['history'].replace('External verification is lacking. ', '', 1)
    if not source['history'].startswith('Palimpsest disputes'):
        source['history']='Palimpsest disputes whether this dossier describes another body. Unverified. '+source['history']
    prior=original[f'{p}-S4']
    prior['years'][1]=2274
    prior['continuityStatus']='confirmed'
    prior['continuityNote']='Extended to the 2274 cold-storage event; the overlapping S5 archive is not a confirmed additional body.'
for p in past:
    p.setdefault('continuityStatus','confirmed')

# Additional pre-2274, non-clone early bodies. No new source contact IDs or relationship links.
preludes=[
 ('PC03-PREL1','PC03','Sabine Kade',2098,2124,'Elian Morrow','Natal-born corporate arbitration clerk; a labour-restitution report went unfiled before Sabine first encountered the family holdings.','She watched a clinic operator manually correct a beneficiary field, and realised the database was not merely wrong but obedient.','A witnessed hardcopy duplicate of the restitution ledger remained outside company custody.'),
 ('PC04-PREL1','PC04','Imani Voss',2096,2116,'Mara Tress','Volunteer evacuee-coordination aide in the earliest district clearance campaigns; learned to prefer named people over abstract casualty tables.','She refused an evacuation order that would have left a triage team in a sealed tunnel.','An authorised dispatch register records that the refusal saved lives despite an official reprimand.'),
 ('PC04-PREL2','PC04','Imani Voss',2116,2140,'Kavi Serr','Port security medic who later carried evidence of clandestine forced transfers across municipal jurisdictions.','A stack arrived in a sealed cargo vessel with a manifest bearing two incompatible origins.','A second witness kept the physical seal, but neither knew which organisation issued the false document.'),
 ('PC07-PREL1','PC07','Anik Rao',2122,2150,'Nalin Rao','Neural-interface calibration inspector assigned to question why apparently consented software updates left clients reporting memories that were not theirs.','One patient could reproduce a security phrase from a room they had never entered.','The inspector preserved a checksum and a refused consent form; neither identifies the eventual perpetrator.'),
 ('PC08-PREL1','PC08','Solenne Pryce',2110,2128,'Ada Keene','Amateur civic-radio witness collecting missing-person testimonies from transit-station families after violent sweeps.','A carrier signal repeated a voice identical to her own across two independently recorded transmissions.','A reel-to-reel copy of the transmission may still sit in an obsolete public archive.'),
 ('PC08-PREL2','PC08','Solenne Pryce',2128,2148,'Rene Vask','Municipal complaints liaison who learned that custody forms could list a body without ever naming its inhabitant.','A mother asked whether her childs stack was alive; the official reply described only an allocated sleeve.','The family retained a receipt whose signature predates its supposed issuing office.')
]
stories=load('prelude-narratives.json')
for sid,pcid,pcname,start,end,name,background,memory,consequence in preludes:
    if sid in original:
        original[sid]['history']=stories[sid]
        continue
    past.append({'id':sid,'pcId':pcid,'pcName':pcname,'index':0,'years':[start,end],'name':name,
                 'history':stories.get(sid, background),
                 'lossOrTransfer':'Transferred into the next recorded non-clone body; circumstances and any past clinical costs were settled before this adventure.',
                 'importantMemory':memory,'unresolvedConsequence':consequence,
                 'continuityStatus':'confirmed','continuityNote':'Additional verified early-life prelude for the 5th-8th sleeve edition. No additional mandatory relationship links.'})
put('previous-sleeves.json',past)

# Preserve the original 160 links, but label links anchored to disputed dossiers.
relationships=load('relationships.json')
for link in relationships:
    if link['pcSleeveId'] in ('PC01-S5','PC05-S5'):
        link['continuityUnverified']=True
        link['continuityNote']='Historical contact is useful but the claimed separate sleeve is not independently verified.'
put('relationships.json',relationships)

plans=[]
for p in pregens:
    own=sorted((s for s in past if s['pcId']==p['id']),key=lambda s:(s['years'][0],s['years'][1]))
    verified=[s for s in own if s['continuityStatus']=='confirmed']
    assert len(verified)+1==p['currentSleeveOrdinal'],(p['id'],len(verified))
    assert verified[-1]['years'][1]==2274,p['id']
    plans.append({'pcId':p['id'],'name':p['name'],'ordinal':p['currentSleeveOrdinal'],
                  'startingFray':p['startingFray'],'activeSleeveId':p['currentSleeve']['id'],
                  'activeSleeveType':p['currentSleeve']['type'],
                  'confirmedSleeves':[s['id'] for s in verified],
                  'disputedArchives':[s['id'] for s in own if s['continuityStatus']=='disputed'],
                  'countRationale':'Core does not impose a fixed penalty or check based on sleeve ordinal. The Fray start is optional Cold Storage house-rule difficulty.'})
put('continuity-plans.json',{'version':'1.2.0','rules':'Core 2020 pp. 73-76, 146-147, 249; house-rule G04','plans':plans})

adventure=load('adventure.json')
adventure['version']='1.2.0'
adventure['fray']['startsBySleeveOrdinal']={'5':2,'6':3,'7':4,'8':5}
adventure['fray']['start']='character-specific (2-5)'
put('adventure.json',adventure)
print('Continuity data prepared: 8 non-clone pregens; 40 original dossiers, 6 extra preludes, 160 links retained.')
