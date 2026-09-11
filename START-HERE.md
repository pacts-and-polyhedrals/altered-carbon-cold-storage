# START HERE — Cold Storage v1.0.0

## Repository name

Create this repository exactly:

`pacts-and-polyhedrals/altered-carbon-cold-storage`

Make it **Public** if you want Forge/Foundry to install directly from the manifest URL.

## Repository root

Upload the contents of the repository ZIP so GitHub shows `module.json` directly at the root:

```
module.json
cold-storage.mjs
assets/
content-src/
lang/
styles/
templates/
docs/
scripts/
tests/
.github/
README.md
START-HERE.md
CHANGELOG.md
package.json
```

Do not place all of those files inside another `cold-storage/` wrapper folder.

## Release

Create a normal GitHub release (not draft, not prerelease):

- Tag: `v1.0.0`
- Title: `Cold Storage: The Faces We Left Behind v1.0.0`
- Asset: `cold-storage-v1.0.0.zip`

## Foundry/Forge manifest

Use:

`https://raw.githubusercontent.com/pacts-and-polyhedrals/altered-carbon-cold-storage/main/module.json`

The module manifest declares the Altered Carbon system dependency and points Foundry at the system's stable manifest.

## First use

1. Install and enable `altered-carbon-rpg` v1.0.0 or newer.
2. Install this module.
3. Create/open an Altered Carbon world.
4. Enable **Cold Storage: The Faces We Left Behind** in Manage Modules.
5. As GM open **Game Settings → Configure Settings → Module Settings → Cold Storage Setup**.
6. Click **Import / Update Cold Storage**.
7. Select exactly six of the eight pregens.
8. Assign pregens to players.
9. Use **Cold Storage GM Dashboard** to reveal relationship states during play.

## Live QA

Before a paid session, run the checklist in `docs/live-qa.md` on the actual Forge/Foundry v14 world.
