# Cold Storage — release history

## 1.7.0 — Mechanical cover on the zoned maps

- Every cover marker on the maps is now a cover position: a dashed ring with its material and partial/full printed on the map (e.g. the Breach's ward partition is full wood cover; the movable trolley is partial metal; the Spire lift lobby has full ferrocrete heavy cover).
- When a token's centre enters a ring, its actor receives that cover through the system's own cover state, so Defense and material Protection apply to incoming attacks; leaving the ring clears it, moving between rings switches it. Cover set by hand on a sheet is never overwritten. Toggle: Module Settings → Apply map cover automatically.
- Range was already mechanical from 1.6.0 (automatic zone assignment feeds the system attack dialog); Engaged remains a declaration, as in the Core rules.
- Existing worlds: run **Install / Update Zoned Maps** once to add the cover positions to scenes that use the module's maps.

## 1.6.0 — Zoned maps for every location

- 14 new scene maps (2800 × 1800 WebP, noir schematic style matching the emblems: ink ground, blind-slat light, film grain, bone furniture silhouettes, one accent colour per location): Resurrection Ward, Breach of Cold Storage, the Rainline, the Quiet Archive, Blue Lotus, Relay Seventeen, Anansi House, Palimpsest Virtuality, the Court, the Operating Theatre, the Last Broadcast, Entering the Spire, the Council and the Final Operation. Zones follow the chapter text (e.g. the Breach uses G09's ward entrance, viewing corridor and service stair; the Final Operation separates the life-safety bus as written).
- Each map carries numbered zone plaques, door markers between adjacent zones, dashed routes for connected non-touching zones, cover/heavy-cover markers, labelled exits and a title cartouche with a legend.
- Scenes are created gridless with Altered Carbon zone units and the system's zone graph already filled in, so the Zone Assistant and zone-range rules work straight away. A token dropped or moved into a zone is assigned to it automatically (Module Settings → Assign tokens to map zones automatically).
- Each scene opens its chapter journal; the Core scene now opens the Final Operation (G21) and the Spire entry has its own scene (G19).
- Full Import creates all 14 maps plus the landing and epilogue backdrops. In existing worlds use **Cold Storage Setup → Install / Update Zoned Maps**: missing scenes are created, scenes still using the module's placeholder art are upgraded (tokens, walls, notes and journal links kept), and scenes whose art you replaced are left alone apart from receiving a zone graph if they had none.
- Generator source in `scripts/maps/`; tests check every location has a map, zones sit inside the art without overlapping, adjacency is symmetric and every zone is reachable.

## 1.5.0 — Story journals in the Altered Carbon look, checks into GM Control

- Cold Storage journal windows use the Altered Carbon palette and chrome (dark window, sidebar and contents, system buttons). Other journals in the world are untouched.
- Each page is a case file: category kicker (GM ONLY / PLAYER BRIEFING / PRIVATE / EVIDENCE / REFERENCE) with its own accent, system-style headings and tables, READ ALOUD boxes for boxed text, chip-style journal links, and evidence handouts as typed amber documents with an EVIDENCE stamp.
- All 31 check call-outs in the GM chapters (and the Fray Composure/Discipline checks) become check chips. For the GM, each Skill in a chip is a link that opens the system's GM Control with a custom request filled in — Skill, Difficulty, a player-facing prompt that reveals nothing from the GM text, and the six active pregens selected — scrolled into view and highlighted, ready to Send. Players see the same chip as plain text. Also `game.coldStorage.openCheck({skill, difficulty})`.
- Book Only now backs up a page only when a GM actually edited it since the last managed import, so restyling does not flood GM Recovery Copies.
- Run **Import / Update Book Only** once in an existing world to restyle its pages and add the check chips. Played actors, reveals and handout permissions are preserved as before.

## 1.4.0 — Noir emblems

- 140 original noir emblems (venetian-blind key light, film grain, bone-on-ink silhouettes, engraved plaques) in `assets/emblems/`: all 95 Core items, 12 weapon upgrades, 7 Networks, 8 Core adversaries, 4 Cold Storage threats, 3 Benefactors and the adventure's attacks, starting package, credits and Palimpsest fragment. Each family has its own frame and accent: Armory, Munitions, Apparel, Field Kit, Decks/Virtual, Pharma, Sleeve Mod, Weapon Mod, Network seal and Wanted/Classified badges.
- New Items, Networks and opponent Actors in an Altered Carbon world (including gear dragged from the system compendiums, Character Creator packages and GM Operations adversaries) get their emblem — and opponents their token art — whenever they would otherwise use a generic Foundry icon. Custom art is never replaced. Toggle: Module Settings → Noir emblems.
- Cold Storage Setup → **Apply Noir Emblems** dresses an existing world, including Items inside Actors; also `game.coldStorage.applyEmblems()`.
- Source generator in `scripts/emblems/` (run with `AC_SYSTEM_PATH` pointing at the system) and tests that every Core catalog record and every Cold Storage opponent and attack has an emblem.

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
