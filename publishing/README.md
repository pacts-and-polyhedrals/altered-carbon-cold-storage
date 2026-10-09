# Publishing Cold Storage 1.7.0

The manifest follows the same GitHub release contract as the Altered Carbon RPG system:

- `manifest`: `https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/latest/download/module.json`
- `download`: `https://github.com/pacts-and-polyhedrals/altered-carbon-cold-storage/releases/download/v1.7.0/cold-storage-v1.7.0.zip`

Steps:

1. Run `npm run release:check` (optionally with `AC_SYSTEM_PATH` pointing at a 2.4.0 system checkout).
2. Create GitHub release `v1.7.0`, attach `dist/cold-storage-v1.7.0.zip` and `dist/module.json` with exactly those names, and mark it **Latest**.
3. Commit the same `module.json` to `main`.
4. The install ZIP has `module.json` at its root — no wrapper folder.

If the repository lives under a different GitHub owner, change the owner in `module.json` (`url`, `manifest`, `download`, author URL) before building. Run `docs/live-qa.md` in a disposable world before a paid session. Publish only source/assets you have rights to redistribute. Embedded story hints in module assets are protected against casual in-app disclosure by JournalEntry permissions, not by encryption.
