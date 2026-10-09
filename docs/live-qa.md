# Cold Storage 1.3.0 — live Foundry v14 / Forge QA checklist

**Not yet performed in a running licensed Foundry/Forge environment.** Automated tests and a mocked document/settings API do not substitute for these checks.

## Compatibility and startup

1. Make a full backup of the original v1.1.1 game world. Test first in a **disposable duplicate**, never an active paid table.
2. Verify Foundry v14 and the unofficial Altered Carbon RPG **v2.4.0** install. Enable Cold Storage v1.3.0. Confirm every Cold Storage window uses the Altered Carbon window look, and that the system's "Legacy Cold Storage Book" menu does not interfere (Book Only and Open GM Book must work). Check browser and Foundry console for module startup, data-model and deprecation errors.
3. Open Game Settings → Cold Storage Setup, Adventure Book, GM Relationships Dashboard and Continuity & Psychosurgery. Verify correct rendering, keyboard navigation and readable scrolling at desktop and mobile width.

## Fresh-world import (separate test world)

4. Full Import: assert eight pregens, two each in non-clone sleeves 5–8, 46 earlier records of which 2 marked disputed (44 confirmed), 20 human contacts, 160 relationships, 4 adversaries, 3 reference Benefactors, 8 illustrative Scenes (not completed tactical maps), 96 source journals.
5. Choose exactly six of eight PCs; assign player ownership; verify character Skills, Baggage, Wealth, Credits/Networks/canonical package gear, Trait automation, Ego and Stack resources, prior sleeve descriptions, timelines and starting Fray 2–5. Roll an attack from each adversary's weapon and confirm the skill resolves.
6. Full Import again must be **blocked** in this world; reopening it should never reset played Stats, Skill/Baggage choices, ownership or changes.

## Existing-world upgrade and permissions

7. Record representative v1.1.1 PC's HP/EP/SP, applied Baggage, current sleeve, custom equipment, ownership, a revealed relationship, manually increased Fray and handwritten GM notes. Run **Book Only** and verify all are unchanged.
8. Edit one source-managed journal page before Book Only: verify its pre-update copy remains GM-only in Recovery Copies; all authored links resolve; unrelated player notes/custom journal pages, scene art and explicit handout grants remain intact.
9. Open Continuity → **Review World**; verify no changes from preview. Back up. Apply; check Sabine's original active nonclone classification if unchanged by the player, missing preludes, two disputed records; reapply and confirm zero additions or overwritten fields.
10. Change a test PC to a *new active sleeve*, rerun reviewed migration, and verify that PC is wholly skipped, including missing historical Items.
11. Test from a **non-GM player account**: cannot open Continuity/GM Book consoles or run change functions. Public primers are visible; private cards, H-series unrevealed clues, GM chapters, treatment history and NPC secrets are not visible. Reveal one evidence card to one player only and confirm isolation persists after re-import. Note: asset files served by Foundry are not cryptographically sealed against direct URL access.

## Official Baggage and Ego

12. Locate PCs who have Trauma, Personality Frag, Compromised DHF. Verify their actual default Skill levels and EP. On **a disposable PC copy**, acknowledge not already applied, apply the 2 correct-Attribute Skill downgrades. Check that the marker prevents a second application.
13. On another disposable PC choose EP2d6, verify the printed loss is applied by the system Baggage workflow, Ego cap, GM chat audit and no permanent loss. The Baggage Item on the character sheet must now show as resolved; repeating from the sheet or the console must fail without another Ego charge.
14. Simulate write failure or cancelled dialog and verify no partial Baggage updates or duplicate penalties occur. See the logged rollback if external automation interferes.
15. Set EP=0 and set irreversible loss > remaining EP on test actors, confirm separate critical warnings. Open the **Core Clinical Console** and actually perform virtual entry, Psychosurgery, recovery, Negative Feedback and Trauma Loop in a test world, verifying no replacement of player memory choices by module automation.

## Optional Fray (consent-based)

16. Accept Fray for one 5th-sleeve and one 8th-sleeve PC. Check initial Fray **2 vs 5**. Opt another PC out entirely and verify no difficulty, Heat penalty or missed necessary clue.
17. Run Ward **Stay Present** Composure Skill roll in realspace; another PC in Virtual should roll Discipline. Verify D0 for Fray 0–3, D1 for 4–5, correct Core bonuses, proper chat output, and success/failure changes. Re-running the same event must fail.
18. Run Accept Echo (+1 with useful optional fact), Veil (no penalty or roll), Anansi and pre-finale anchors (once only), and optional deep recall (+2 Fray, raw EP1d6 mitigated by Core). Deep recall cannot be repeated in the same scene.
19. Reach Fray 6, review player options, pick Integration, Partition and Shelter on separate disposable PCs; check Fray targets, raw Ego loss where applicable, one-use Shelter and capped Heat concession. Consent refusal must not change any resource.
20. Close/reopen consoles and restart Foundry server. Ensure all settings/Actor markers, Fray numbers, Baggage choices, archived Item IDs and treatment notes persist without duplicating on ready/init.

## Adventure and hosting

21. Run the complete G00–G23 investigation with six players; verify the initial evacuation, Rainline, Anansi, Virtual archive, Spire, resolution council and all six ending branches. Check at least two independent methods to obtain each proof pillar.
22. Confirm performance at each configured Scene with representative tokens, lighting and assets. Replacing source **illustrative placeholders with custom maps** remains the GM's separate work.
23. If hosting on Forge, manually verify file paths, module activation, permissions, player reload and the exact hosted manifest/download links only **after** publishing; no hosted installation has been tested or claimed here.
