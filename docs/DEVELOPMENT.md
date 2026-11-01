# Development handoff

## Foundation

The world uses integer tile coordinates. The camera projects world vertices through a quarter-turn transform and an isometric transform (38 × 19 pixels per unzoomed tile). Picking uses the inverse transform, then floors the world position. Drawing tiles from all four world corners keeps picking and rendering aligned at every camera angle.

Each object has `type` and `rot` (0–7). The direction list advances through eight compass directions in world space. Walls are stored separately in `edges`, keyed by canonical `x,y:h` or `x,y:v` boundaries. R cycles four edges of the selected tile. Walls do not occupy the tile object slot. Save format v2 preserves both `tiles` and `edges`, and migrates old tile-based walls to boundaries. Buildings use a local rotated coordinate system. Camera rotation never mutates world objects.

Do not change these rules casually:

- One tile = 10 feet.
- Elements snap to world grid coordinates.
- Allowed world directions are multiples of 45°.
- The baseball field remains a no-build area.
- Save keys and formats need migrations if changed.

## Checks

`npm run check` performs syntax validation plus Node tests. Tests execute the real game code in a minimal DOM/canvas harness and simulate its pointer and button handlers. They cover inverse projection at all camera angles, tile corners, wall joining in all eight directions, item geometry, click construction, costs, refunds, field protection, undo, save reload, invalid imports and drag/right-click behavior.

These are geometry and interaction regression tests, not a substitute for a real browser playtest. Before release, confirm:

1. Field/grid appear at desktop and narrow widths.
2. Build connected walls, rotate the item, and rotate the camera four times.
3. Build each type and check directional geometry.
4. Drag and zoom, then place another object under the preview.
5. Refresh to reload a save. Export/import a park in the browser.

## Routine updates

1. Fetch `main`, create a focused branch, change the game.
2. Run `npm run check`, then playtest.
3. Commit and push; open a pull request.
4. Review the changes and passing GitHub check; playtest locally.
5. Merge to `main`; the Publish game workflow checks and deploys `public/` to GitHub Pages.
6. Check the live build. Revert the release commit and push to `main` if a release breaks.

## Next milestones

1. Confirm the construction sandbox feels good with mouse/keyboard.
2. Introduce path connectivity and a small number of simulated fans.
3. Add seating, amenities, queues and congestion based on actual fan needs.
4. Add Open Gates, ticket/concession revenue and a postgame review.

Avoid adding other sports or a surrounding village before the full design/build/unfold/review loop works for a small ballpark.

## Seating and sightline design direction

Fans should enter a row from an aisle, move sideways to their assigned seat, and face the field. Low rows can sit beside the dugouts; rising rows behind them must eventually clear the roof. Row numbers alone should not guarantee a clear view: future sightline calculations should use seat elevation, seated eye height, roof/fence height, and distance to the playing surface.

Outfield front-row platforms may start around 6 feet above field level to give seated fans a view over the 8-foot fence. Verify the actual downward view to the field, not just whether eye height exceeds the fence. These are planning notes; fan seating and sightline simulation are not yet implemented.


## Modular grandstands (v0.22)

Legacy `bleacher` tiles remain unchanged: three rows, 24 seats, existing eight-way rotations. New `stand` and `stairStand` tiles use cardinal rotations (0,2,4,6) to keep all edges aligned to 10-foot cells, and persist `baseFeet` in five-foot increments. Footprints stay 10 × 10 ft. The local a axis runs across a row; positive b points uphill, opposite the gold facing arrow.

A seating section has four 1.25-foot tiers with five 2-foot seat bays per row (20 seats). Stair sections have two 2-foot seat bays around a 6-foot central aisle (8 seats). Eight stair treads rise 0.625 ft each, aligning every second tread to a seating tier. The back boundary is exactly baseFeet + 5. Placement derives height from matching-facing neighbors: lateral = same base, uphill = +5. Conflicting or negative elevations are rejected rather than moving existing construction. Removing a neighbor preserves the remaining sections and their elevations.

Access is a graph of ground paths, stair treads and row centers. Paths join only a ground-level stair section's front. Consecutive stairs connect only with matching facing and five-foot elevation difference. Lateral rows connect only at matching elevations/facing, and walls block the shared edge. Seating sections do not provide a route uphill. Reachable capacity sums reachable seat slots, not a fixed number per tile. Fan waypoints carry feet; interpolation changes elevation continuously while climbing. Row painter entries interleave with people at their world positions.

Use Build stand demo for six pieces (96 seats) at 18–20,7–8 with entrance paths. It checks occupied cells and walls, charges only for additions and is undoable. This version does not implement concourses, overhangs, ramps, structural engineering or sightline validation.


## Side-entry end stairs (v0.23)

`endStairLeft` and `endStairRight` are cardinal, height-snapping stand pieces with no seating capacity. Local a = -1/+1 selects the outer side; the five-foot stairs occupy the inner half and a five-foot level landing occupies the outer half. The green arrow marks the outer entrance. The first rail leaves a turning opening at the stair foot.

Ground access joins only from the outer adjacent walkway at baseFeet = 0. Landing waypoints remain at baseFeet; fans turn at the front boundary before climbing the eight 7.5-inch risers. Row connections open only toward the inner half. Consecutive end stairs connect at matching facing, stair center, and +5 ft base. A raised landing does not gain access merely because a ground path sits beside it. Fans may move sideways through rows to existing central stairs.

Build side-entry demo creates four seating sections and two end stairs (80 seats, 0–10 ft) at x17–19/y7–8. Ground paths approach along the outside at x16; no path occupies the front strip at x17–19/y9. It refuses occupied or walled areas and is undoable. Existing demonstration layouts are not migrated or replaced.


## Concourse (v0.24)

Concourse tiles persist baseFeet on the same 5 ft scale, occupy one cell, and have zero seating capacity. Placement takes elevation from adjacent platforms or valid stair endpoints. Conflicting heights are rejected. Stairs placed in front of a concourse snap to concourse height minus 5, while stairs behind start at concourse height.

Concourse graph nodes connect through boundary ports to same-height decks, ground paths at 0 ft, stair top/bottom endpoints, and end-stair side landings. Ground paths never connect to raised platforms. Only stairs provide row access. Rails open only at a valid unobstructed connection. Surfaces render below pedestrians with perimeter rails in the depth pass. Buildings still occupy ground tiles only; concourses do not host amenities.

Build concourse demo creates a side stair at 17,8, five rear platforms at 17–21,7 (+5 ft), and seating at 19–21,8 (48 seats). The gap at 18,8 forces fans to cross the concourse before descending the central aisle. No front-row pavement is built.


## Half-tile paving (v0.26)

`halfPath` stores a triangular paver in one cell, with rotations 0/2/4/6. Each costs $50; adding the opposite triangle or using Walkway to complete a half costs the remaining $50 and changes it to `path`. Refunds use its actual type price. Entrance terrain is now drawn as the `entrancePaving` set of square cells; user path paving overrides a cell's terrain paving.

Ground graph nodes for triangles sit at their centroid and connect only along the two fully paved edges. Shared-edge midpoint waypoints keep segments within each convex triangle. Stair, end landing, concourse and standalone bleacher connections also check the paved edge. The entrance approach samples pavement coverage as well as building footprints.


## Intelligent fan movement (v0.27 / Chunk 2.5)

The existing access graph is unchanged. Dijkstra route costs use physical distance, with row links ×6 and stairs ×1.8. Each arrival group uses a cached tree informed by previously assigned route traffic (a lightweight expected-wait estimate, not live replanning). Exit routes use a common tree to keep narrow shared aisles flowing toward the gate. Individual seats have a short perpendicular connection to a row walking aisle; final row anchors are trimmed when they would overshoot a nearer seat.

Random schedules contain 1–5 people per group, short within-group intervals and larger gaps. A fan is not visible until the spawn point is clear. Movement integrates at no more than 1/60 second per step, maintaining 0.16-tile walking separation and reserving a 0.35-tile corridor ahead of leaders. Exact point-to-segment clearance prevents deadlocks at tight turns. Seated modular fans occupy seats beside the walking aisle (0.03-tile clearance), not standing-person queue space. Legacy standalone bleacher access stays compatible with its simpler geometry.

Phases are game → finishing arrivals (only if queues outlast the clock) → exiting → idle. Fans nearest an exit route release first with randomized 0.10–0.22-second gaps before seeking space to stand; exiting fans disappear only at the original spawn coordinate. No admission is collected during exit. Simulation state is transient; the existing browser save schema/key, construction geometry and economy remain unchanged. End game/import/reset retain explicit early-stop behavior.

The Node harness uses deterministic randomness and checks full cycles with varied seeds, 100-fan spacing, exact spawn return, access geometry, accounting and save reload. See CHUNK-2.5-TESTING.md for the remaining player acceptance checks. This is a lightweight reservation/queue model, not continuous crowd physics or live congestion rerouting.
