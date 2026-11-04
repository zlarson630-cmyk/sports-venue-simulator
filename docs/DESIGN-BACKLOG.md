# Sports Venue Simulator — design backlog

Current baseline: v0.42. Historical decisions and release checkpoints follow below. Keep it simple, make it work, then expand.

## Chunk 2.5 verification pass

The requested backlog and intelligent movement were already published before this pass. Retain the current implementation and later fixes rather than reintroducing v0.27 code. The live arrival planner is `partySeatPlan`; `arrivalSchedule` alone is not evidence that gameplay arrivals work. Regression checks must exercise `startFanTest` and complete crowd cycles.

Current behavior: selectable 1/2/5/10-minute games (five minutes by default), 100/250/500/1,000 requested fans limited by reachable seats, persistent social parties, traffic-weighted concourse routes, personal spacing, gate/stair queues and staggered exits to the parking spawn. Preserve later bathrooms, food service, decorations, rendering cache and saved parks.

Priorities: (1) keep crowd completion, spacing and save/economy regressions passing; (2) complete hands-on gameplay acceptance using CHUNK-2.5-TESTING.md; (3) pursue the queued construction, visibility and fan-experience work recorded below. Historical “local” and “pending” entries describe their release checkpoint, not a rollback request. Current release limitations are summarized in RELEASE-STATUS.md.
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

## Published foundation — Chunk 2.5: intelligent fan movement

- Random arrival intervals, small groups, singles and quiet gaps; vary the pattern each game.
- Personal spacing and queues on arrival and departure, including gates and stair bottlenecks.
- Prefer practical low-resistance routes: concourses/walkways over long trips across seating rows; consider stairs and expected route traffic.
- At the end of the selected game duration, stagger departures, return through valid stairs/paths/gate to the original spawn point, then allow the next game.
- Preserve ticket accounting, saves and construction undo. Never charge again on departure.
- Verify 100-fan completion and performance, mirrored end stairs, raised concourses, diagonal routes, camera rotation and repeated games.
- Status: published in v0.27; 62 regression checks passed before publication. Subsequent local v0.29 checks cover all agreed batches.

## New player observations and priorities — October 31 follow-up

- **Next construction priority: diagonal seating options.** Add 45-degree seating choices while preserving existing cardinal modular stands, standalone bleachers, snapping, stair access and saved parks. Design/test diagonal footprints and connections before expanding other customization. Implemented locally in v0.28/v0.29; awaiting publication and player acceptance.
- **High-priority visual bug: invisible concourse.** Player reports the concourse exists and fans can use it, but its surface is invisible / visually poor. Fixed locally with deck/rail depth ordering; browser preview checked. Player acceptance remains pending.
- **Seating parties (local v0.29):** natural parties of 2, 3 or 4, with solo attendance possible. Party members should sit together, prefer proximity to the action, and prefer a gap from strangers where capacity permits. These are preferences with competing tradeoffs, not a guarantee of isolated front-row seats. Persistent per-game seated parties are now implemented locally in v0.29; player acceptance pending.
- **Future attractions/destinations:** placeable statues, trophies or similar points of interest along routes. Some fans stop to view them; others head straight to seats, a restroom or concessions. Add these when amenity visits and fan needs are implemented, rather than inserting random unsupported detours now.
- **Future fan meters (RCT-style):** hunger, thirst, restroom and fun. Define fun and its effects later. Use needs to drive destination choices once the basic movement systems are reliable.

## Agreed batches (implemented locally in v0.29; not yet published)

Diagonal seating/access, parties, and the batches below are implemented locally. Public upload and publication were explicitly approved on November 1, 2026; release checks and deployment verification are required.

| Priority / batch | Scope | Acceptance |
| --- | --- | --- |
| Chunk 3 — team identity | Three colors (primary, secondary, accent); global changes; follow-team-color setting plus individual overrides; section seat colors; chain-link and customizable padded walls | Linked items update; custom overrides survive palette changes and save/reload |
| Chunk 4 — amenities | General concessions, drinks, ice cream and souvenir shop; automatic staffing initially | Place, rotate, save and reload all types without breaking existing objects; full transactions deferred |
| Chunk 4 — scoreboards | Basic electronic, deluxe inning-by-inning, large LED video, vintage manual; freestanding initially, rotation and colors | Four distinct placeable models; live game displays and wall mounting deferred |
| Chunk 5 — surroundings | Functional parking-lot fan spawn/approach; decorative houses across one street; gas station, sports bar and apartment building across another; street lamps with team-color banners | Safe walking route from parking; lightweight repeated models outside editable core |

Neighborhood buildings initially have no interiors, traffic, residents, customers or economy. Decorative surroundings may wait if core gameplay needs more time. Team colors should ultimately drive banners, plastic seats, padded walls, scoreboard trim, concession awnings and entrance/shop signs, with object overrides.

## Investigations and later work

- **Access clarity — implemented locally.** NO SEAT ROUTE and stair-hover explanations distinguish missing paths, blocked walls and mismatched heights. Highlighted entrance tiles guide both stair mirrors without requiring front pavement.
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

Chunk 2.5: published; subsequent player reports identified side-entry clarity, concourse visuals and social seating improvements now addressed in local v0.29.


## v0.28 — Seating and access release

Implemented: 45° modular seating, central stairs and both mirrored end stairs; matching-facing height snapping; diagonal footprint previews and overlap protection; diagonal stair endpoints connected to rear concourses; a 128-seat diagonal demo supporting the 100-fan limit. Cardinal pieces and existing save balances stay unchanged. Diagonal pieces use a grid-aligned 14.14 × 14.14 ft footprint (two grid cells of area), four rows and the same 5 ft rise. They connect to matching-facing sections, not directly around bends into cardinal sections; use the path/concourse network for separate sections.

Implemented access clarity: highlighted stair entrance tiles and directional arrows; red for an unconnected stair, green for a gate-connected stair; hover a stair for a missing-walkway, wall, height or disconnected-main-gate explanation. Seating labels now read NO SEAT ROUTE. Rear access remains supported. Raised concourse surfaces and rails now share the painter ordering with seating and pedestrians.

Awaiting player acceptance: place diagonal stands, test both end-stair mirrors, observe the concourse from all camera angles, and reload a saved park. See CHUNK-2.8-TESTING.md.

Open crowd issue found during additional layout testing: a path that doubles back across the fixed gate approach can cause opposing arrival streams to stall. Keep the clear entry approach in the acceptance layouts; investigate shared entrance routing separately. This release does not claim to solve every self-crossing crowd route.

### New agreed future features

- **Roaming mascot:** walks around public fan areas and increases nearby fans' fun. Implement when fun meters and amenity/destination visits exist; define effect radius, cooldown and amount then. No mascot simulation in v0.28.
- **Children/family parties:** child-sized fan models alongside adult fans. Every child belongs to a party with at least one adult and stays with that party during arrival, seating, visits and departure. Build on persistent social parties and adjacent-seat assignment; children must never arrive or navigate independently as an unaccompanied party.
- **Next fan batch:** persistent parties of 2–4 with occasional solo adults; choose adjacent seats near the action and prefer space from strangers when capacity allows. Arrival waves alone do not provide this behavior.

- **Future shared crowd moments:** seventh-inning stretch (crowd stands and sings together) and a wave that travels around connected seating. Define timing, sound/mute controls and interaction with fun later. Not part of the overnight foundation batches.


## Overnight agreed batches — v0.29, local implementation

- **Party seating:** implemented persistent per-game party IDs, groups usually 2–4 with occasional solo fans, contiguous seats in the same section/row, preference for front rows/near-action sections and a gap from strangers when available. Capacity constraints can reduce a party size; children are not generated yet. Parties share shirt colors and arrival waves. Central stair seats across an aisle count as separate solo blocks.
- **Team identity:** three global colors with live updates on linked seats, shop awnings, scoreboard trim, padded walls and street banners; per-item custom primary colors and Follow team colors control; undo/save/reload preserve the palette and overrides.
- **Fence materials:** original chain-link outfield remains default, optional team-colored padding on the 8 ft outfield; built walls may be chain link, padded or wood. Existing wood walls retain their look and collision rules.
- **Concessions/scoreboards:** general food, drinks, ice cream and souvenir shops with automatic decorative staffing. Basic electronic, deluxe line-score, LED/video-style and vintage manual board models. All place/rotate/save; shop transactions and live score/video feeds remain deferred.
- **Neighborhood:** functional parking-lot spawn and return route; static parked cars; four houses, gas station, sports bar and apartment block; street lamps with team-colored banners. No building interiors, road traffic or neighborhood economy. Decoration adds no construction charges.
- **Publication:** the initial public-upload blocker was resolved by explicit user approval on November 1, 2026. Publish to zlarson630-cmyk/sports-venue-simulator after successful GitHub checks and verify deployment.

Future: mascot fun boosts; accompanied child fans; seventh-inning stretch and a traveling wave. All remain design backlog items until needs/family-party systems are designed.

## Player playtest notes — November 1, 2026 (design only)

Player is continuing to test v0.29. Record these changes without implementing or publishing a gameplay patch yet.

- **Home-plate building space:** the fixed main approach walkway sits too close to the backstop and leaves insufficient depth for bleachers. Explore rerouting the approach toward a rear concourse or increasing the gate-to-backstop space. Preserve existing parks; do not silently move or delete placed objects.
- **Neighborhood building rendering:** screenshot shows windows from hidden walls painted across the roof, creating an open-roof appearance. Investigate face visibility and painter ordering; only visible wall faces should receive windows. Add recognizable doors. Verify all camera angles, including tall apartments and houses.
- **Scoreboard facing and text:** the line-score content is a keeper. Its current screen-aligned text spills outside the narrow projected board. Render all text within the physical board plane, fitting its actual surface; the display must face spectators in the stands, independent of the viewer/camera. Add an obvious placement-facing indicator and a physical back side. Check every item rotation and camera angle.
- **Street banners — positive acceptance:** player says flag banners look great. Preserve their appearance and team-color linkage.
- **Backstop corner seating:** diagonal sections do not fit cleanly with cardinal sections behind home plate, particularly directly against the angled fence. Explore wedge/transition seating and corner fillers with a shared front alignment; simply rotating the larger diamond footprint does not solve the join. Investigate footprints and row/aisle transitions before choosing a design. Do not promise existing cardinal/diagonal sections already connect.
- **Side-stair footprint clarity:** player observes two adjacent walkway pieces seem necessary. Record as observed behavior to reproduce, not a confirmed universal access requirement. Determine whether the second tile serves the landing/turning clearance or connects the first to the path network. Show the full required clear approach/landing area in the model and placement preview; highlight all required tiles rather than implying a single tile always suffices.
- **Independent elevated access — high priority:** add dedicated stairs and/or ramps without seats, so fans can reach higher concourses without seating facing awkward directions. Explore straight runs and landings with explicit bottom/top heights, direction indicators and connections to paths/platforms. Ramp length should reflect its rise rather than making an implausibly steep one-tile slope. Support access to both cardinal and diagonal seating via concourses.

Suggested next design batch: home-plate spacing + corner seating transitions + independent elevated access; accompany it with scoreboard/building rendering corrections. Await the remainder of the player's testing before consolidating implementation scope.

### Keyboard shortcut request — November 1

- W selects the regular Walkway tool.
- G selects Remove/Trash (same tool as the current Remove button; selection alone deletes nothing).
- Keep existing R rotation, Q camera rotation, Z undo and Escape removal behavior.
- Display shortcut letters on their tool buttons/tooltips. Ignore shortcuts while typing in inputs, textareas or selects and when Ctrl/Command/Alt is held.
- Design request recorded during ongoing playtesting; no shortcut implementation yet.

### Stair rendering bug — November 1, 7:47 screenshot (corrected player clarification)

The player clarified that NOT every stair is visible correctly: vertical front faces/risers cover horizontal treads that should remain visible. The earlier positive interpretation was incorrect and is withdrawn. Investigate stair solid geometry, face visibility and painter ordering; the oversized/full-depth vertical faces must not hide exposed step tops. Check central stairs, both end-stair mirrors, stacked sections and independent stairs at all camera rotations. This is a rendering issue separate from access/pathfinding. Screenshot reference: Screenshot 2026-11-01 at 7.47.25 AM.png.

### Stadium block expansion — November 1

Player clarified the requested three additional cells apply down BOTH the first- and third-base lines: add 30 ft of usable stadium-block depth outside each foul-line seating side, creating room for bleachers, independent stairs/ramps and rear concourses. This is extra space behind the baseline stands, not longer foul lines or a blanket expansion on every side. Preserve the playing field dimensions and existing placed park objects; design the outer boundary/street/approach adjustment accordingly. Record for the next construction batch; no geometry changes during the current feedback session.

### Restroom behavior and seating preferences — workshopping November 1

- Restroom needs may trigger a visit before first sitting down, as well as a trip from an occupied seat during the game.
- Reserve each fan's assigned seat throughout the visit; afterward the fan sits with their original party. Do not reassign or sell the temporarily empty seat.
- One or more members of the same party may visit concurrently, according to individual needs; others may proceed to or remain in their seats. Do not restrict a party to one restroom visitor at a time or require the whole party to accompany a visitor.
- Concurrent visitors still respect facility capacity, queues, collision spacing and reachable routes. Different bathroom choices may be useful later; no forced party-wide synchronization.
- Seating preference under discussion: keep parties together; favor an empty row in the lowest seating level and spread parties over these rows before higher levels. Leave a seat between unrelated parties when sharing is necessary and capacity permits. Own-row seating is a preference, not a guarantee.
- These remain design notes during the feedback/workshopping session; no restroom simulation or seating algorithm change implemented yet.


## v0.30 construction implementation

Implemented the requested 30 ft baseline-side expansion, standalone stairs, dedicated deeper backstop seating/stair-seat pieces, and W/G shortcuts. Dedicated backstop front edges meet x+y=28 without modifying older diagonal geometry. Rear edges retain concourse endpoint compatibility; dedicated sections are one bank deep and cannot stack uphill. Paths for backstop layouts start at the inner main-gate landing 11,7; existing layouts continue using 14,10. Stair riser geometry reduced to actual step height to address tread occlusion; visual acceptance remains part of player testing. Bathroom simulation, ramps, general cardinal/diagonal wedge transitions, building roof/window repair and scoreboard orientation remain separate backlog items.

## Main entrance sidewalk follow-up — November 1 (ideas only)

Player clarified that the main paved approach sidewalk needs updating after the block/road expansion. Inspection confirms the automatic paving still begins at x8/y4 and crossing markings/arrival-intersection metadata still refer to the old road corner, although the roads moved outward three cells. Explore extending the main sidewalk to the new inner curb and realigning the crossing/parking approach, while preserving room for backstop seats and existing constructed paths. Do not change the game yet: the player explicitly requested collecting ideas before implementing further changes. Inspection only; no sidewalk/game code edits were made.


## v0.32: layout cleanup, then access polish

Player authorized priorities 1 and 2 after the ideas-only hold. Implemented the curb-reaching main sidewalk and transverse parking crossing, opaque roofs with visible wall details and doors, and physically oriented/clipped scoreboard displays. Back-facing boards show their solid back, preserving the line-score format on the front.

Added a six-cell, 60 ft ramp with 5 ft rise, endpoint height snapping, full-footprint collision/import validation, accessible fan routes, depth-sorted slope rendering, save/reload, undo and removal from any covered cell. Added triangular corner landings with two full walking sides and matching-height deck/stair connections. Improved side-entry guidance and stair tread order for every view. Standalone stairs and fence-aligned backstop seats continue from v0.30.

The triangular landing is an access transition, not continuous angled seating rows. Custom wedge seating remains future work. Restroom visits/rejoining parties, mascot fun boosts, accompanied children, seventh-inning stretch and the wave remain queued separately. Existing park coordinates, balances, capacities and legacy routes are preserved.


## v0.33: continuous corner seating and partial concourses

Authorized together by the player. Implemented mirrored regular corner seats joining cardinal and 45° banks, plus dedicated first/third-base fence corners joining the deeper backstop pieces to straight stands. Their row boundary points match adjacent banks at every tier; corner aisle ports carry fans across the transition. No new stair entrance is implied. Matching neighboring banks determine base height; mismatches disconnect and placement rejects conflicting elevations. The dedicated fence corners fit directly on x+y=28 without modifying older pieces.

Added half-width concourses and promoted the triangular corner landing as Triangular concourse. Shape-aware shared ports, exposed-edge rail segments, depth-sorted clipped surfaces, snapping, full-tile completion, collision checks, import validation, undo and reload are included. The new corner bowl demo contains 132 reachable seats and costs $25,800 from empty. Browser playtest seated all 100 fans; automated full-game runs cover several arrival patterns.

This resolves the continuous single-bank corner transition deferred by v0.32. Automatic stacking of widening corners behind one another remains outside this batch; elevations connect with stair/concourse routes. Restrooms/party reunions, mascot fun, accompanied children, stretch and wave remain queued separately.

## Next pass — player corrections and reproduced crowd stall (November 1)

- Move main gate onto the outer fence. Greatly reduce automatic entrance paving; every remaining visible paved walking surface must participate in the access network. Existing entrance roots differ between ordinary/backstop parks and must be reconciled without stranding saved layouts.
- Preserve straight stands and backstop stands. Replace the curved/fanned corner seating presentation with straight, angular sections.
- Increase maximum zoom (currently 3); retain four camera angles for this pass.
- Make disconnected access explicit: show the broken connection, height mismatch, wall, missing path/stairs, or missing gate route. Offer a validated suggested piece/orientation with a ghost preview, particularly for rear access into backstop stands.
- PRIORITY: reproduce/fix crowd deadlock using tests/fixtures/rear-concourse-stall.json (player upload). All 212 seats are reachable. With LCG seed 1 (1664525, 1013904223, unsigned 32-bit / 2^32), 100 fans start, 93 seat by 120 seconds, and the same seven remain stalled at 240 and 360 seconds in finishing-arrivals phase. The jam involves the 10 ft rear concourse/stair junction at 11,17 / 12,17. Fans 73 and 98 approach the junction from competing routes; arrivals use traffic-weighted per-party trees. Investigate opposing routes and movement reservations/physical blocking, rather than changing the player's valid construction. The game waits indefinitely for arrivals before allowing departures. The export contains layout, not the original random arrival state; this is an independently reproducible occurrence on the same park.

No gameplay changes made in this notes checkpoint. Use this exact park as a regression case in the crowd fix, along with existing crowd-spacing and arrival/exit tests.

## v0.34: authorized next pass implemented

Completed the five corrections above: opposing keep-right walking lanes and saved-park stall repair; actionable access inspection with validated ghosts; gate on outer fence with nine functional automatic paving cells and free one-time legacy connectors; straight parallel corner seats; 6× cursor-anchored zoom. Narrow seating rows retain single-entry arrival flow. Corner capacity now reflects the straight layout (7 regular / 13 fence); the revised corner demo has 102 seats. Browser review confirmed the player's full 100-fan game and exits. See CHUNK-3.4-TESTING.md. Future crowd needs/party reunions, mascot, accompanied children, stretch and wave remain queued.

## v0.35 infrastructure pass

Implemented the requested attendance dropdown (100/200/400, saved, seat-capped, next-game changes). Corrected the backstop's raked depth to ten feet while retaining a five-foot rise and adding a level rear landing inside the original reserved footprint. New fence corners use a shared front apex and empty narrow rows; legacy connectors preserve old bank ports. Solid stair/full/partial-concourse foundations, top/rear guards and diagonal connection aprons address the reported floating construction and railing gaps. The new bowl demo has 122 reachable seats for $31,200. A legal two-tier, 416-seat park completed a 400-fan run; the browser rear-access test completed 28 capped admissions and exits. Automatic widening upper-bowl wedge variants and other sports remain deferred; current fence wedges serve one bank depth at a time. Fan needs remain deferred to protect scope.
