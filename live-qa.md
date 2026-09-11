# Cold Storage Live QA — Foundry/Forge v14

Perform this in a disposable world before the first paid game.

1. Install the current `altered-carbon-rpg` system from its stable manifest.
2. Install Cold Storage from its stable `module.json` manifest.
3. Confirm Foundry reports module version 1.0.0 and the dependency is satisfied.
4. Create a world using `altered-carbon-rpg` and enable `cold-storage`.
5. Open Cold Storage Setup and run **Import / Update Cold Storage**.
6. Confirm the importer reports 8 pregens, 40 archived sleeves, 20 contacts, 4 adversaries, 160 relationships and 19 core journals.
7. Run the importer a second time and confirm it updates without duplicating source-controlled documents.
8. Select exactly six pregens; verify the other two become reserve/missing stacks.
9. Assign at least one pregen to a non-GM test user and verify ownership.
10. Verify the player cannot see GM-only identity/secrets data that is represented as Foundry Documents.
11. Open the GM Relationship Dashboard and change a relationship through Familiar → Suspected → Confirmed.
12. Verify the player relationship board refreshes and only reveals the intended state.
13. Open every placeholder Scene and confirm its background path resolves.
14. Open the Project Palimpsest branding asset and confirm it resolves.
15. Roll a pregen Skill through the Altered Carbon system and verify no module errors are logged.
16. Test one combat using Speed Dice and one damage application.
17. Test a resleeving state change if it will be used in the session.
18. Connect a second browser/client and repeat player visibility checks.

A clean static validation does not replace this live runtime test.
