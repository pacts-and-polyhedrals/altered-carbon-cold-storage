# Cold Storage: The Faces We Left Behind

**Foundry VTT v14 adventure module 1.3.0 — for the unofficial Altered Carbon RPG system 2.4.0 or newer.**

A fully authored 4–6-hour cyber-noir investigation for **six selected players from eight pregenerated characters**, with a 2384 Bay City story built around the hidden records of Project Palimpsest. This is an unofficial fan production. **It is not a standalone game system** and does not contain a copy of the copyrighted Core Rulebook.

## What this release actually ships

- **74 authored journal entries** (~35,800 source words): 30 GM chapters, player primers, 16 initially hidden evidence pieces and eight private character cards, plus **22 generated GM references** (96 managed entries total). The original four-, five- and six-hour running schedules and independent evidence solutions remain.
- **Eight full pregens**, occupying non-clone **fifth, sixth, seventh and eighth sleeves** (two of each); archival dossier consistency checks, 44 confirmed former sleeves plus two *disputed Palimpsest claims* (46 original/added files). The original **160 historical relationship links** and 20 original contacts remain, with the links associated with disputed dossier entries identified as unverified rather than destroyed.
- **Four ready-to-roll adversaries** built on the printed Chapter 7 baselines through the system's own adversary builder (all 32 Skill records with printed bonuses, plus the adventure's authored attacks), three social-reference Benefactor NPCs, six factions, and **eight original illustrative Scene placeholders**. Those placeholders are not newly completed tactical battlemaps. No new soundtrack, complete portrait pack or licensed graphics set is claimed.
- The existing Book Console, relationship dashboard, player-access controls and GM-only recovery copies for edited source journal pages.
- **NEW: Continuity & Psychosurgery Console**, reachable through Game Settings and Cold Storage Setup. It records five scheduled Fray pulses per character, both optional grounding opportunities, player-directed fracture decisions, optional deep recall, opt-outs, treatment notes, and a preview/review-only migration path for existing characters.
- **Official Personality Frag / Trauma / Compromised DHF Baggage resolution** runs through the Altered Carbon 2.4 Baggage workflow, so the console and the character sheet share one record: once resolved in either place it cannot be charged again. The GM and player elect two valid Skill-level downgrades in the correct Attribute or the printed EP2d6 loss. Nothing is applied automatically.
- **Pregens match the system Character Creator (1.3.0):** archetype Wealth, package Influence, Starting Packages compiled into Credits, Networks and canonical Core Items (open choices listed for the GM), automated Trait rule elements, Life Event Baggage records and synthetic sleeve Tech Capacity.
- **System look (1.3.0):** every Cold Storage window uses the Altered Carbon window chrome, palette, panels and controls.
- **Core versus adventure boundary:** Fray is an *optional house-rule track*, distinct from Ego and from the Core's Personality Frag crisis. Core psychosurgery, healing, and permanent Ego loss are handled by the parent system's Clinical Console, opened from Cold Storage; recording a treatment note cannot magically restore EP.

## Installation (local)

1. Install or update the unofficial **Altered Carbon RPG system to v2.4.0 or newer** (manifest: `https://github.com/pacts-and-polyhedrals/altered-carbon-rpg-foundry/releases/latest/download/system.json`).
2. Back up the world. Install the module from its manifest URL — `https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/latest/download/module.json` — or extract `cold-storage-v1.3.0.zip` into `Data/modules/cold-storage/` so `module.json` is directly in that folder.
3. Start a world using **altered-carbon-rpg**, enable Cold Storage under Manage Modules, then open **Game Settings → Configure Settings → Module Settings → Cold Storage Setup**.
4. In a **new empty world only**, choose **Full Import**. It installs the pregens, their history and gear, NPCs, scenes and journals. Assign six of eight pregens to players.
5. In an **existing or played world**, choose **Book Only**. It updates source-managed journals without overwriting character sheets, equipment, recovered clues, ownership, scene art or custom journal links. Backed-up old source pages are available in the GM Recovery Copies folder. Then open **Continuity & Psychosurgery → Review World** to inspect any necessary *optional* non-destructive continuity updates; apply only after backup and review.
6. From the Continuity Console, verify each character's printed starting Baggage cost. **Do not apply the same penalty twice.** Review the Fray opt-in separately with players before the first scene.

**Full Import is now blocked if source-controlled Cold Storage pregens already exist or a successful full import is recorded.** It is not an update or recovery procedure for an ongoing campaign.

## Rules boundaries

The 2020 Core does **not** demand a Personality Frag roll for merely arriving at the fifth through eighth sleeve. Event-specific penalties for forced cross-sleeving, synth downgrades, traumatic deaths and Virtual exposure still apply under the Core. Previously settled deaths are never retroactively charged again at adventure start.

For this story, optional starting **Fray = 2, 3, 4, or 5** for sleeves #5–#8. Five scheduled pulse opportunities use **Composure (realspace)** or **Discipline (Virtual)**. A normal Stay Present check holds Fray on success and adds +1 on failure; veiling/declining costs nothing. At Fray 6, the player consents to a narrated Integration, Partition, or one-time Shelter outcome; no result automatically takes away player character control. The short digital reconstruction is not counted as decades of subjective incarceration, and 110 years of inert stack storage are not an Ego-damage timer.

See `docs/CONTINUITY-PSYCHOSURGERY-v1.2.md` for exact assumptions, Core references, Baggage choice restrictions and known GM-assisted cases.

## Local build

Requires Node.js 22+, Python 3 for compiling the editable book (`mistune` with the table plugin), and normal `zip` utilities. Install ZIPs contain compiled journals and do not require Python.

```sh
npm run release:check
```

The command runs the automated tests, validates all scripts/manifests/data and builds `dist/cold-storage-v1.3.0.zip`, `dist/module.json` and `dist/altered-carbon-cold-storage-repo-v1.3.0.zip`. To test against the real system code and catalogs, run `AC_SYSTEM_PATH=/path/to/altered-carbon-rpg-foundry npm test`. To regenerate the edited manuscript first, run `python3 scripts/compile_book.py` followed by the release check.

## Verification status

**Locally validated, not live certified.** Tests use pure Node logic and a mocked Foundry document/settings API, **not a running Foundry v14 server**. Real app rendering, chat mechanics, importing with strict system data models, player-versus-GM journal permissions, migrated real-world ownership, and Forge hosting must be checked using `docs/live-qa.md`. The manifest points at the GitHub release `v1.3.0`; attach `cold-storage-v1.3.0.zip` and `module.json` to that release and mark it Latest so the URLs resolve.

Original 2020 game terms belong to their respective rights holders; this module is an unofficial third-party adaptation, not an official Altered Carbon publication. Source-managed adventure data can be read by sufficiently curious clients who directly request served module assets: visibility settings prevent ordinary in-app disclosures, not determined filesystem access. Do not rely on module JSON for cryptographic secrecy.
