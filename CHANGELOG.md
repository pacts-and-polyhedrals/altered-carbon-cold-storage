# Cold Storage — release history

## 1.3.0 — Altered Carbon RPG 2.4.0 alignment

- **Requires Altered Carbon RPG 2.4.0+.** Manifest dependency, setup screen and a ready-time GM warning enforce it; system manifest now uses `releases/latest/download/system.json`.
- **Fixed: Book Only, Full Import and Open GM Book on 2.4.0.** The module handed book work to the system's bundled legacy book, which 2.4.0 blocks while this module is active (imports failed) and which calls back into the module (Open Book looped). The module now always runs its own book. Full Import installs the book before any Actor, so a failure can no longer leave half-built pregens.
- **Fixed: Baggage could be charged twice.** Trauma / Personality Frag / Compromised DHF choices now run through the system Baggage workflow, sharing the Item's `resolved` record with the character sheet. Either place blocks a repeat. The EP option applies the printed EP2d6, as the system does.
- **Fixed: adversaries could not attack.** Threats are now built from the printed Chapter 7 baselines with the system's adversary builder (32 Skill records with printed bonuses), keeping the adventure's names, tactics, stats and attacks. Weapon skills and damage types use system vocabulary; the Dipper's Viral Strike is a software record resolved in the Clinical Console instead of an invalid "2d6 EP" damage formula.
- **Pregens now match the system Character Creator:** archetype Wealth (was the default 2), package +IP (PC08 was missing +1 IP), Starting Packages compiled into Credits, Networks and canonical Core Items with open choices listed for the GM, Trait rule elements for 2.4 automation, Life Event Baggage records, synthetic sleeve Tech Capacity, and the Civilian Citizenship branch at Common.
- **System look:** every Cold Storage window uses the Altered Carbon window class, palette, hero header, panels, buttons, inputs and tables.
- Tests can run against the real system code and catalogs with `AC_SYSTEM_PATH`; the build checks every local import is packaged and also outputs `dist/module.json` for the release.
- Removed the duplicate `START-HERE-v1.2.md`; `START-HERE.md` is current. Adventure text, journals, relationships and continuity rules are unchanged.

## 1.2.0 — Continuity, Personality Frag and Psychosurgery

- Upgraded the 2384 adventure for unofficial Altered Carbon RPG 2.0.0 / Foundry v14 (local build; runtime validation pending).
- Kept the 74-journal, 96-managed-book investigation and original 160 relationships, evidence pillars, GM disclosure safeguards, eight illustrative scenes, and all prior encounter content.
- Reconciled pregens to non-clone current 5th–8th sleeves, with two of each. Two previous dossiers became clearly disputed Palimpsest archival claims; added six early verified narrative sleeve preludes without inventing historical contacts.
- Added opt-in GM Continuity & Psychosurgery Console: five scheduled continuity pulses, once-only anchors, Fray 6 choices, optional risky recall, consent/opt-outs, treatment notes and critical Ego warnings. Fray remains explicitly distinct from published Core Personality Frag.
- Added carefully gated application of published Trauma / Personality Frag / Compromised DHF Baggage alternatives: two appropriate Skill downgrades or EP2d6, each only once and never automatically.
- Added a preview-first, GM-confirmed, additive old-world continuity migration that skips PCs who have changed current sleeves. Full Import is now blocked once pregens are already present; Book Only remains the safe existing-world update.
- Recompiled standalone GM and player books, clarified nonclone references, added regression and adverse-path tests, and updated installation and live QA instructions.
- No GitHub connection; no licensed Foundry/Forge runtime certification.

## 1.1.1 — Integrated system edition

- Uses the system book console when available, sharing journal source IDs and disclosures.
- Book Only import no longer changes Actors or creates Benefactor reference NPCs.
- Fixed several bare chapter links.

## 1.1.0 — Full adventure-book revision

- Expanded to a roughly 35,000-word journal-driven 4–6 hour mystery with multiple proof routes, six outcomes and an optional Fray overlay.
- Preserved 8 pregens, the original 40 sleeve dossiers, 20 contacts and 160 relationship links, with 8 illustrative scenes and a separate player briefing.

## 1.0.0 — Original clean-start edition

See the retained source records.
