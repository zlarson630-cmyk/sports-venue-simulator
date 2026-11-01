# Release status — v0.32

The two requested batches are implemented: entrance/building/scoreboard cleanup followed by seating access polish. See README.md and CHUNK-3.2-TESTING.md for behavior and player checks. `npm run check` passes all 87 tests. Browser review confirmed the updated approach, opaque roofs and the backstop layout. Automated coverage includes full crowd regressions and the new ramp routes, collision/save handling, triangular landing connections, physical scoreboard faces, roof detail order and stair riser geometry.

Public publication is authorized by the user for zlarson630-cmyk/sports-venue-simulator. Merge only after GitHub CI succeeds; verify the Publish game workflow and live version afterward.

Known scope: corner landings connect access routes; continuous wedge seating rows are future work. Restroom needs and party reunions, mascot fun, accompanied children, stretch and wave remain in DESIGN-BACKLOG.md. Scoreboards still use placeholder scores and shops remain decorative.
