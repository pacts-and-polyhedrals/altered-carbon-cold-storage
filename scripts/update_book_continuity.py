#!/usr/bin/env python3
"""Idempotently update authored manuscript for variable historical sleeve counts.
Do not run the compiler before the changes appear in book-src.
"""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'book-src'
def rewrite(relative, replacements, append=''):
    p=ROOT/relative
    original=p.read_text()
    s=original
    for before,after in replacements:
        s=s.replace(before,after)
    if append and append.splitlines()[0] not in s:s+='\n\n'+append+'\n'
    if s!=original:p.write_text(s)

rewrite('gm/G04.md',[
  ('Each pregen has lived through five archived sleeves and now occupies a sixth.',
   'The eight investigators occupy their fifth through eighth sleeves, all non-clone. Their verified earlier lives number four through seven, respectively. A few records are contested because Palimpsest fabricated claims of additional bodies.'),
  ('**Each active PC starts at Fray 3 on a 0-6 track.**',
   '**The optional starting Fray depends on current sleeve ordinal: fifth = 2, sixth = 3, seventh = 4, eighth = 5 (0-6 track). The GM must obtain consent for this deliberately intense house rule, especially at seventh or eighth sleeve.**'),
],append='''## Core-rule separation: when to roll, and what can be healed

A **sleeve count is not a Core-triggered Personality Frag check**. At the start of play, do not retroactively charge four through seven lifetimes of Ego loss. Core resleeving loss depends on the actual death, forced cross-sleeving, real downgrade, synthetic dissociation and other applicable event rules (printed pp.73-74, 146). Dormant 2274-2384 storage is not subjective Virtual imprisonment.

Personality Frag Baggage (printed p.76) is different from the adventure's Fray track. For each named Baggage, the player and GM resolve **either** two one-step Skill downgrades in that Baggage's Attribute **or** a separate EP2d6 loss. Trauma affects Willpower Skills, Personality Frag affects Acuity Skills, and Compromised DHF affects Intelligence Skills. Resolve each exactly once, confirm whether pre-existing stats already account for it, and record the decision in the Continuity Console.

Ego zero, permanent Ego damage greater than the remaining intact Ego, and the +++++ Interrogation Personality Frag effect (or +++ with Sharya Protocols) are separate Core crises, never automatic outcomes of one Fray pulse. At an Ego crisis, consult Core p.147 and agree how a changed continuity or protected treatment remains playable.

**Psychosurgery and treatment (Core pp.147, 249):** the patient must enter Virtual; the operator needs appropriate Psychosurgery software, a Skill Check and actual triggered-effect degrees. Medium-resolution Virtual grants +1 bonus die, high +2. Each + assigned to ordinary Psychosurgery restores 1d4 Ego (improvable by protocols); +++++ can be assigned to Ego Reconstruction to restore 2d4 and potentially gain a Specialisation. Negative Feedback converts 1d6 lost Ego into permanent loss; a Trauma Loop can add heavy Ego damage. Do not spend the same degree twice. The book's Chapter 4 and Chapter 6 print different Psychosurgery target results; settle the discrepancy before rolling. The system Clinical/Virtual Console handles published treatment, not Fray reduction.

**Fray and medical Ego are distinct.** The only free grounding reductions are Anansi and pre-finale, each once per PC. A willing patient may seek further licensed treatment later. Medical care never automatically erases the facts of a memory or a character's right to choose their present identity.''')

rewrite('players/P-FRAY.md',[
  ('Your character has five archived sleeves and now a sixth body.',
   'Your character has four through seven verified previous sleeves and now a fifth, sixth, seventh or eighth non-clone body. Some legacy archival records are disputed.'),
  ('Start at **Fray 3**, on a 0-6 track.',
   'With your agreement, start at **Fray 2 on sleeve #5, 3 on #6, 4 on #7, or 5 on #8**, on a 0-6 track. You may instead use the same Fray 3 baseline for everyone, or opt out entirely.'),
],append='''**Important:** Fray is a scenario-specific house rule, not a medical diagnosis or an automatic official penalty for changing bodies. Permanent Ego damage, Trauma/Personality Frag Baggage, and Psychosurgery are separate Core mechanics. The GM will explain any actual starting Baggage penalty and whether earlier Ego consequences were already included before requesting your choice. Treatment is available but never compulsory.''')

for rel,repls in {
 'players/J00.md':[('Five earlier sleeves lie behind you','Four to seven earlier sleeves lie behind you')],
 'players/J02.md':[('Your current sleeve and five archived sleeves are on your character sheet.','Your current sleeve and four to seven verified earlier sleeves are on your character sheet; a few disputed files may be listed separately as unverified records.')],
 'players/J14.md':[('Your five archived sleeves remain part of your history.','Your verified earlier sleeves remain part of your history.')],
 'gm/G01.md':[('over five previous sleeves each','over four to seven previous sleeves each')],
 'gm/G25.md':[('fifth-sleeve ally and loved one','2274 archive ally and loved one')],
 'gm/G26.md':[('**Fifth-sleeve links:**','**2274 archive links:**'),('**Five echoes:**','**Archive echoes:**'),('a municipal labour clone is routinely denied','a non-clone organic municipal labour body is routinely denied')],
}.items():rewrite(rel,repls)
for id in range(1,9):
    rel=f'personal/PC{id:02d}-CARD.md'
    rewrite(rel,[('Your fifth-sleeve relationship record','Your 2274 archive relationship record')])

rewrite('gm/G00.md',[],append='''## Continuity Console: important preparation for this edition

The eight pregens now span **sleeves five through eight**, none of the currently inhabited PC sleeves is a clone. See the GM-only Continuity Console (Settings > Module Settings) before play. Review disputed Palimpsest records, resolve Trauma / Personality Frag / Compromised DHF Baggage once for the affected characters, ask players whether they wish to use Fray, and choose a consistent Core Psychosurgery target result before treatment. Do not rerun historical Ego losses or treat the 110-year inert storage as Virtual incarceration. The Fray console shares its live counter with the book console; clinical Ego changes use the core system.''')
rewrite('gm/G26.md',[],append='''## Extra verified early-life preludes and disputed records

Sabine, Imani, Anik and Solenne have one or two additional verified prelude bodies to establish their seventh or eighth current sleeve. Those stories are found in the archived Sleeve Items; they are earlier than the five original recorded lives and do not replace the documented relationships.

For Nia and Cass, their earliest four verified historical bodies span 2274. The fifth original archived dossier is a **contested Palimpsest ledger claim**, not a confirmed additional body, and its four relationship leads remain usable as evidence. Play the personal memories as real possibilities and allow outside corroboration; do not pronounce every cherished relationship a lie. The final archive's disputed extra body should not be imposed as a sixth current sleeve.

No character can be excluded from the central case because a prelude has no four named relationships. The original 160 contact links, eight evidence shares and four-of-eight redundancy remain unchanged.''')
print('Manuscript continuity edition applied.')
