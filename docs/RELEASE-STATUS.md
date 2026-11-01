# Release status — v0.29

Local implementation is complete. `npm run check` passes 76 tests. A real browser check confirmed the complete cycle: 100 admissions, all 100 fans seated, all 100 returned to parking after the game, and exactly $500 gate revenue. Existing park state/balance survived preview reload. Three-color updates and padded outfield rendering were checked visually. Node coverage includes full arrival/exit cycles, both diagonal end-stair mirrors, 100-fan spacing, parties, financial accounting, legacy saves, new models, materials, customization metadata, undo and scenery protection.

The user explicitly approved uploading and publishing v0.29 to the public repository zlarson630-cmyk/sports-venue-simulator on November 1, 2026. The earlier public-upload approval blocker is resolved. Publication must pass GitHub CI before merging; the Publish game workflow provides deployment status.

Branches/checkpoints:
- seating-access-diagonal: v0.28 seating/access checkpoint; 69 tests passed.
- remaining-agreed-batches: complete v0.29 local source and documented player checklist.

A standalone HTML preview was generated for downloadable testing without GitHub publication. It uses browser-local saves; transfer an existing hosted park with Export/Import. The source repository remains the canonical multi-file development project.

See OVERNIGHT-TESTING.md for the player checklist and DESIGN-BACKLOG.md for the remaining mascot, accompanied children, attractions/needs, stretch and wave designs. Shop transactions and live scoreboard feeds are deliberately deferred. The self-crossing gate-approach crowd issue and square-concourse/diagonal-stair corner geometry remain documented limitations.
