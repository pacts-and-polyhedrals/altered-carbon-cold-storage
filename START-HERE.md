# Cold Storage module v1.10.0 — START HERE

This is a **Foundry v14 adventure module**, not a rules system. It requires **altered-carbon-rpg v2.4.0 or newer** — update the system first.

## Your first installation

- Back up your world. Unzip the install archive into `FoundryVTT/Data/modules/cold-storage/` with `module.json` at that directory root.
- Enable **Cold Storage: The Faces We Left Behind** in the world's Module Management screen.
- Open Game Settings → Module Settings → **Cold Storage Setup**.
- **Fresh, empty world:** Full Import installs eight pregens, 46 historic sleeve/archival records, 160 relationship records, 20 human contacts, four adversaries, three special-reference Benefactor actors, 14 walled, zoned scenes with their casts placed, two backdrops, 96 managed journal entries and the players' Case File. Select exactly **six** pregens and assign player accounts.
- Open **Investigation Tracker** (Setup or Book Console). Every scene is already set up with its cast and journal pins; activate the Resurrection Ward to begin. Tick objectives in the tracker or straight from the panel at the top of each chapter journal; give players the **Cold Storage — Case File** journal (they can already read it).
- **Existing world:** Setup → **Install / Update Zoned Maps** (adds walls, doors and windows), then **Set Up All Scenes**.
- **Start over completely:** Setup → **Full Reinstall — Wipe & Rebuild** (back up first).
- **Existing played world:** choose **Book Only**; then **Continuity & Psychosurgery → Review World** for a separate, opt-in migration preview. Full Import refuses to overwrite already imported pregens.
- Ask players whether to opt into the optional **Fray** track. 5th/6th/7th/8th non-clone sleeves start at Fray **2/3/4/5**; these are **not** automatic Core Personality Frag or Ego penalties.
- On actors with **Trauma, Personality Frag or Compromised DHF Baggage**, inspect starting resources and previous choices before applying the Core penalty. The dashboard offers either two correct-Attribute Skill downgrades or EP2d6, once.
- For actual Ego repair, open the **Core Clinical Console** and adjudicate Psychosurgery there. Fray reductions are a separate adventure mechanic. Changes to permanent Ego integrity cannot be restored by merely writing treatment notes.

**GM starting chapters:** G00 → G01 → G04 → G06 → G07. The full offline book is supplied in the source ZIP as `book/Cold-Storage-GM-Book.html`; player-safe primers are in `book/Cold-Storage-Player-Briefing.html`.

**Important limitations:** no new audio or contact portrait set, never tested in a running Foundry v14/Forge environment. Follow `docs/live-qa.md` before a paid session. Publish by attaching the install ZIP and `module.json` to GitHub release `v1.10.0` and marking it Latest.
