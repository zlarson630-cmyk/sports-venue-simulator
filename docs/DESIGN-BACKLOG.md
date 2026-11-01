# Sports Venue Simulator — design backlog

Agreed scope as of October 31, 2026. Keep it simple, make it work, then expand.
This file distinguishes accepted player tests from ideas and implementation work.

## Release rules

- Extend the existing game; do not rewrite it. Preserve construction, snapping, camera controls, economy, 100-fan support and existing saves.
- Work on a separate branch. Complete regression checks before merging to main and verify the existing publishing workflow. No additional hosting setup is needed.
- Save working checkpoints after each batch. Document blockers and continue independent work when possible.
- End each batch with a playable build, validation summary and player checklist. Automated tests do not replace visual gameplay testing.

## Completed and accepted

| Batch | Decision / behavior | Evidence |
| --- | --- | --- |
| Construction foundation | 10-foot grid, half-tile paving, standalone three-row bleachers, modular four-row stands (+5 ft per section), central stairs, mirrored side-entry stairs, elevated concourses | Existing game and regression suite |
| Chunk 1 | Smooth 45-degree fan navigation, reduced zigzags, blocked-corner protection; preserve camera and stair behavior | All six player tests passed |
| Chunk 2 | Up to 100 fans limited by accessible seats; $500,000 for new/reset parks; existing save balances preserved; existing prices and $5 admission retained | All six player tests passed |
| Side-stair investigation | A connected walkway must touch the outer entrance marked by the green arrow. Nearby pavement alone is insufficient. Support side stairs and rear-concourse access. | Player confirmed the walkway resolved the reported NO STAIRS issue |

## Current priority — Chunk 2.5: intelligent fan movement

- Random arrival intervals, small groups, singles and quiet gaps; vary the pattern each game.
- Personal spacing and queues on arrival and departure, including gates and stair bottlenecks.
- Prefer practical low-resistance routes: concourses/walkways over long trips across seating rows; consider stairs and expected route traffic.
- At the end of the two-minute game, stagger departures, return through valid stairs/paths/gate to the original spawn point, then allow the next game.
- Preserve ticket accounting, saves and construction undo. Never charge again on departure.
- Verify 100-fan completion and performance, mirrored end stairs, raised concourses, diagonal routes, camera rotation and repeated games.
- Status: implemented in v0.27 on a development branch; regression and release checks required before publication; player acceptance pending.

## New player observations and priorities — October 31 follow-up

- **Next construction priority: diagonal seating options.** Add 45-degree seating choices while preserving existing cardinal modular stands, standalone bleachers, snapping, stair access and saved parks. Design/test diagonal footprints and connections before expanding other customization. This is queued work, not part of the current movement patch.
- **High-priority visual bug: invisible concourse.** Player reports the concourse exists and fans can use it, but its surface is invisible / visually poor. Investigate rendering and depth ordering separately from successful connectivity. Do not mark resolved based only on access tests.
- **Future seating parties:** natural parties of 2, 3 or 4, with solo attendance possible. Party members should sit together, prefer proximity to the action, and prefer a gap from strangers where capacity permits. These are preferences with competing tradeoffs, not a guarantee of isolated front-row seats. Current randomized arrival waves are not persistent social parties; current seat allocation still distributes fans among reachable sections.
- **Future attractions/destinations:** placeable statues, trophies or similar points of interest along routes. Some fans stop to view them; others head straight to seats, a restroom or concessions. Add these when amenity visits and fan needs are implemented, rather than inserting random unsupported detours now.
- **Future fan meters (RCT-style):** hunger, thirst, restroom and fun. Define fun and its effects later. Use needs to drive destination choices once the basic movement systems are reliable.

## Next approved design batches (not yet implemented)

Diagonal seating takes priority before the previously numbered customization batches below.

| Priority / batch | Scope | Acceptance |
| --- | --- | --- |
| Chunk 3 — team identity | Three colors (primary, secondary, accent); global changes; follow-team-color setting plus individual overrides; section seat colors; chain-link and customizable padded walls | Linked items update; custom overrides survive palette changes and save/reload |
| Chunk 4 — amenities | General concessions, drinks, ice cream and souvenir shop; automatic staffing initially | Place, rotate, save and reload all types without breaking existing objects; full transactions deferred |
| Chunk 4 — scoreboards | Basic electronic, deluxe inning-by-inning, large LED video, vintage manual; freestanding initially, rotation and colors | Four distinct placeable models; live game displays and wall mounting deferred |
| Chunk 5 — surroundings | Functional parking-lot fan spawn/approach; decorative houses across one street; gas station, sports bar and apartment building across another; street lamps with team-color banners | Safe walking route from parking; lightweight repeated models outside editable core |

Neighborhood buildings initially have no interiors, traffic, residents, customers or economy. Decorative surroundings may wait if core gameplay needs more time. Team colors should ultimately drive banners, plastic seats, padded walls, scoreboard trim, concession awnings and entrance/shop signs, with object overrides.

## Investigations and later work

- **High: access clarity.** NO STAIRS currently signals an incomplete gate-to-seat route. Add actionable connection messages, a highlighted entrance arrow and ghost connecting walkway tile. Both mirrored side stairs must remain valid without front pavement.
- **Hands-on investigation: dugout-adjacent seats.** Test placement, collision boundaries, fan access, height and stair/concourse connections. Do not remove dugout collision checks as a shortcut. The side-walkway resolution does not settle every dugout seating case.
- **Separate larger project: multi-level grandstands.** Under-stand construction and more advanced elevated access require deliberate design/testing.
- **Later: tutorial.** Keep immediate placement guidance lightweight.
- **Later: fan feedback.** Simple occasional bubbles and postgame comments tied to actual conditions; satisfaction/attendance consequences deferred.
- **Later: trash/cleanliness.** Standard cans, recycling stations and dumpster; eventual concession litter and automatic custodial service. Excluded from current batches.
- **Later: full fan economy.** Needs, concession transactions, merchandise and advanced management; no individual staff management initially.
- **Later: sightlines.** Use seat/eye height, roof and fence geometry rather than row number alone.

## Player acceptance record

Chunk 1: entrance, diagonals, zigzags, rotated cameras, obstacles, stairs — PASS.

Chunk 2: saved balance, new budget, 100 accessible seats, 100 admissions/seats, crowd/camera/stairs, spending/revenue — PASS.

Chunk 2.5: pending gameplay test; see docs/CHUNK-2.5-TESTING.md when implemented.
