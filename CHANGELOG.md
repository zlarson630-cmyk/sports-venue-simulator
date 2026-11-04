# v0.43

- New elevated seating, stairs and concourses default to open underneath; ground sections stay solid. Existing saved foundations remain solid until changed.
- Build layers controls choose automatic or explicit base height, solid/open undersides, and a hide-upper mode for editing ground pieces below.
- Ground paths and amenities occupy a separate saved layer. Clearance checks reject low/solid ceilings; 10 ft bases clear paths and 15 ft bases clear shops.
- Food/restroom trips use the lower ground routes independently of the raised seating routes. Removing, painting and undoing either layer preserves the other.
- First pass supports a ground layer beneath the existing upper construction layer, not arbitrary stacks of multiple upper pieces on one cell. Support columns remain future decorative assets.

# v0.42

- Add placeable one-tile decorative trees ($250) and bronze baseball-player statues ($1,500).
- New collapsible Decorations group; R changes tree shape or turns statues 45°.
- Decorations persist in saves/exports, support removal/refunds/undo, and block pedestrian routes.

# v0.41

- Cache the stadium bitmap and matching fan occlusion surfaces between view/layout changes.
- Reuse deck geometry and render ordering across zoom/pan, and combine repeated pointer redraw requests.
- Keep a persistent fan collision grid, skip sorting stationary/future fans and avoid temporary neighbor arrays.
- Admission/food income updates the cash display without rebuilding the stadium or access graph.
- Reusable headless benchmark and shared test harness; cache invalidation and frame scheduling coverage.

# v0.40

- Functional concessions: hunger, six-second single-server queues, $5 meals and separate food revenue.
- Shared amenity routing preserves party seats, bounds visitor batches and handles closing-time purchases.
- Inspect Fan tool and floating popup with hunger, bathroom needs, activity, party and reserved seat; X/Escape close.
- Ground walkway access required; missing food stands explained in inspection.

# v0.39

- Bathroom meters and fan inspection, reachable restroom trips, two-stall interior queues and return to reserved seats.
- Preserve upper wedge metadata when routing fans; fixes six invalid seats that prevented the reported park from starting departures.
- Center field at 400 ft, expanded outer diagonal fence, and 10 ft foul territory for the last 100 ft approaching unchanged 300 ft foul poles.
- Revision 7 save migration refunds construction swallowed by the expanded field; the current two-level test park remains unchanged.
- Triangle infill preview accepts the same valid placements as construction.
- Relocate the diagonal demo beyond the expanded outfield.

## v0.38 — Diagonal concourse surfaces and fan visibility

- Triangular concourses can occupy the unused part of a diagonal seating cell independently of the seating host. Separate cost, refund, Undo and export/import; invalid overlapping triangles are rejected.
- A common shared-segment calculation joins level walking surfaces to each other and to real stair ends. Matching-height triangles snap concourses and upper stairs, and open only the usable portion of railings.
- Player-built triangles replace fallback bridges where they meet a stair top. Remaining bridges stop at the concourse boundary; internal end walls are omitted and bridges render at their own location.
- Fan sprites are clipped against opaque projected faces nearer to the camera, using retained world depth. This addresses fans drawing through padded walls and being overpainted by entire elevated pieces during entry. Screen-space buckets limit visibility checks to nearby faces.
- Added regression coverage for lower/concourse/upper arrivals and exits, independent triangle save/undo/removal, and wall occlusion from every camera angle.
- Later: full-piece red deletion preview, per-level visibility, eight camera views, CF/boundary and foul-territory changes, bulk paths, fan needs and ad revenue.

## v0.37 — Pregame choices and field wall finishes

- Saved game length choices: 1, 2, 5 or 10 minutes (default 5); active games retain the duration they started with. Attendance choices: 100, 250, 500 or 1,000, capped by reachable seats. Older 200/400/800 choices migrate to 250/500/1,000.
- Field walls default to dark green padding in foul territory and outfield, with short brick behind home plate between the dugouts. Heights, field boundaries and access openings stay unchanged. Existing parks receive the new default finish without moving construction or changing money; team-padding and chain-link options remain available.
- Wall ads, larger outfield, eight camera angles, bulk paths, and diagonal concourse work remain queued.

## v0.36 — Reusable seating and larger crowds

- Consistent physical chair dimensions and 2 ft seat bays: 20 seats per straight section, 28 per diagonal; central stairs retain a physical 6 ft aisle (8 / 16 seats).
- Fence seating rotates in 45° steps, snaps its front edge to parallel field fences, and defaults to a +5 ft base at the outfield wall. Existing saved elevations remain unchanged.
- Backstop rows share the diagonal grid depth and stack uphill in 5 ft bands. Removed the compulsory rear landing; concourses are separate construction. Continuing a fence wedge uphill widens it to meet both seating banks.
- Unified concrete surfaces/foundations across seating, stairs and concourses. Collapsible tool groups keep Inspect/Remove available and show the selected tool.
- Extended the default game clock to four minutes. Added saved 800-fan attendance. Nearby-fan spatial indexing reduces collision work, and a separate arrival timer lets late scheduled fans enter after the four-minute game clock stops. The supplied park completes 800 arrivals/exits in regression simulation.
- Saved the player's layout as a regression fixture; retained legacy construction, balances, undo and park imports.

## v0.30 — More building space and field-facing backstop seating

- Expanded the first-/third-base sides of the stadium block by three cells (30 ft); moved bordering roads/landscaping outward. Existing objects, field dimensions and money are not migrated or reset.
- Added full-width standalone stairs: no seats, 5 ft rise, eight-way rotation, stackable and connected to same-height concourses.
- Added deeper, field-facing Backstop seating and Backstop stair seats whose front edge meets the actual angled backstop fence. Legacy diagonals remain unchanged. These dedicated front sections connect laterally and to rear concourses; they do not stack uphill.
- Backstop layouts use the main gate's 11,7 landing for routes and stop the automatic paving before the seating bank, freeing the old approach strip. Legacy parks keep their original 14,10 entrance routing.
- Stair tread faces now use actual 7.5-inch riser heights instead of solid faces extending to ground level. Added W walkway/G remove shortcuts and button labels.
- Build backstop demo creates a connected 28-seat layout with independent stairs and a 5 ft rear concourse, with occupied-layout safeguards and undo.

## v0.29 — Remaining agreed batches (approved release)

- Parties reserve adjacent seats, prefer proximity to the action and leave room from strangers when possible.
- Stadium-wide three-color identity, per-object overrides, color undo/save/reload, chain-link and padded fences.
- Staffed food/drinks/ice-cream/souvenir models and four distinct placeable scoreboard designs.
- Functional parking spawn/exit route, decorative neighborhood and team-banner street lamps.
- Future mascot, accompanied children, seventh-inning stretch and wave preserved in backlog.

## v0.28 — Diagonal seating and clearer access

- Modular stands and both types of stairs rotate in 45° steps, with grid-aligned diamond footprints, matching height snapping and collision protection. Cardinal saves remain unchanged.
- Added a 128-seat diagonal demo for 100-fan arrival and exit testing.
- Marked stair entrance tiles show connectivity; hovering explains missing paths, blocked walls and height mismatches. NO STAIRS becomes NO SEAT ROUTE.
- Elevated concourse deck patches and perimeter rails now interleave with seating and fans in depth order.
- Recorded future mascot fun boosts and children accompanied by adults, plus the separate gate-approach crossing issue.

# Changelog

## 0.27.0 — Chunk 2.5: intelligent fan movement

- Save the agreed design backlog and distinguish completed player tests from future features.
- Randomize arrivals into singles, small groups and gaps. Hold fans off-map until spawn space is free.
- Use distance-weighted navigation with higher seating-row/stair costs and an arrival-group traffic estimate; keep all existing access/wall rules.
- Separate modular row aisles from seats, avoid overshooting near seats, maintain personal space and reserve turning room to form natural queues.
- After two minutes, stagger departures along a shared low-resistance exit tree through stairs, concourses and the main gate to the original street spawn point. Finish queued arrivals before reversing narrow-aisle flow.
- Preserve $5 gate accounting, construction undo income, $500,000 new parks, the 100-fan cap and saved geometry/balances. Exit travel adds no second ticket charge.
- Add deterministic crowd, weighted-routing, spacing, full-cycle and persistence regression coverage. Gameplay checklist: docs/CHUNK-2.5-TESTING.md.

## 0.26.0

- Rebuilt the main entrance walkway from grid-aligned square pavers matching regular walkways.
- Added $50 triangular half walkways with four corner rotations; complementary halves complete a $100 square.
- Route fans through the paved edges of half tiles, using interior points and shared-edge waypoints.
- Keep entrance arrivals on its paving while routing around structures, and preserve half tiles through saves and undo.


## 0.25.0

- Expanded the buildable area behind home plate by moving the diagonal stadium perimeter and main gate about 28 feet outward.
- Kept the baseball field, backstop, roads, existing construction and saves unchanged.
- Updated fan routing and admission collection to use the relocated gate.


## 0.24.0

- Added flat 10 × 10 ft concourse platforms that snap to stair landing heights and adjacent concourses.
- Connect only matching elevations, allowing fans to enter seating aisles from the rear and descend to their row.
- Added exposed-edge railings, supports and openings at valid connections; platforms remain separate from ground buildings.
- Preserve concourse heights through save/import/undo, with an optional 48-seat rear-concourse demo.


## 0.23.0

- Added mirrored end stairs with five-foot stairs and a five-foot level side landing, no seats.
- Fans enter from the marked outer side, turn at the stair foot, and climb into connected seating without front-row pavement.
- Ground walkways cannot enter elevated landings; walls, incorrect mirrors and mismatched stair runs block access.
- Added an optional 80-seat side-entry demo without a front sidewalk; existing parks remain unchanged.


## 0.22.0

- Kept standalone three-row bleachers and added two modular grandstand pieces.
- Seating sections have four rows of five seats; stair sections have a six-foot aisle with one seat on either side of each row. Each 10 × 10 ft section rises five feet.
- Snap matching sections at the same height beside each other and five feet higher behind; align tiers and suppress shared end rails.
- Route fans up connected stair treads and sideways through rows, including raised sections; reject access through mismatched heights, walls or missing stairs.
- Preserve section elevations through save, import and undo, and add an optional 96-seat stand demo.


## 0.21.0

- Added four-minute games with a live countdown and automatic return to construction.
- Collect $5 once per fan crossing the main gate, with admissions and revenue shown live.
- Persist earned revenue above the starting budget and retain it through construction undo.

## 0.20.0

- Routed arriving fans around buildings on the street-to-gate sidewalk instead of following an unchecked straight line.
- Blocked concession/restroom cells with pedestrian clearance and rejected obstructed gate landings.
- Reported blocked entrances when no clear approach exists.

## 0.19.0

- Added nine stationary defensive players: pitcher, catcher, four infielders and three outfielders.
- Players wear matching uniforms with position labels and rotate with the field camera.

## 0.18.0

- Matched buildable walkways and the entrance landing to the main entry sidewalk material.
- Rendered all walkway tiles in the ground pass so fans cannot be hidden by pavement at different camera angles.

## 0.17.0

- Spread arriving fans across reachable sections and spaced seat positions before filling gaps.
- Separated fan attendance, empty reachable seats, and disconnected section counts in the arrival report.
- Marked disconnected bleachers red with NO PATH during the fan test.

## 0.16.0

- Added a first fan arrival test: up to 25 fans walk from the street through the main gate to reachable bleachers, then occupy individual seats.
- Added connected-walkway route finding, wall barriers, unreachable-seat reporting, and an End test control.
- Added an optional demo route and 24-seat section, priced at up to $2,000, without overwriting existing construction.
- Concessions, restrooms, congestion, event finances, detailed stairs, and departures remain future work.

## 0.15.0

- Corrected dugouts to 30 feet wide along the fence and 10 feet deep, as clarified. Roofs include a stair opening; dugouts stay outside the playing-field fence.

## 0.14.0

- Widened dugouts outward by one 10-foot cell to 30 × 25 feet.
- Added supported roofs while retaining sunken floors and exposed field-side stairs.

## 0.13.0

- Added roadside trees outside the stadium fence, with varied crowns, trunks, and shadows.
- Preserved the main gate approach and intersection sightlines; trees depth-sort with the stadium in every camera view.

## 0.12.0

- Replaced the road loop with four straight roads forming a hashtag, with four intersections and fading extensions.
- Kept the outer fence and linked the main gate plaza to the intersection behind home plate.
- Defined the Small Stadium road template separately from ballpark construction for future site layouts.

## 0.11.0

- Added a surrounding street loop, sidewalks, and a street intersection behind home plate.
- Added a 6-foot outer stadium fence and a main gate with a sidewalk forecourt and crosswalk. Fan arrivals remain a future simulation feature.

## 0.10.0

- Moved both dugouts outside the playing-field fence. Added aligned 10-foot fence openings and landings from the sunken steps onto the field.
- Reserved external dugout footprints and refunded any overlapping saved construction.

## 0.9.0

- Added fixed 30-foot dugouts on the first- and third-base sides, with recessed floors, retaining walls, benches, rails, and field-side steps. Player animation remains a future feature.

## 0.8.0

- Added a 15-foot dirt warning track inside the outfield fence, including the diagonal sections.
- Expanded foul territory and added a 45-degree backstop behind home plate.
- Preserved 90-foot basepaths and 300-foot foul lines; adjusted camera fit and overlap refunds for the new perimeter.

## 0.7.0

- Set all four base paths to exactly nine 10-foot cells.
- Added rounded infield dirt, home-plate dirt and a properly positioned mound.
- Expanded the playing field to 300-foot foul lines and roughly 304-foot center field, with distance labels and a camera that fits the expanded field.
- Refund old construction that overlaps the expanded protected playing field when loading v0.6 saves.

## 0.6.0

- Added both corner-to-corner wall diagonals alongside four tile edges.
- Restored straight diagonal outfield fencing while keeping endpoints on grid corners.
- Added diagonal save/load, removal, and checks to prevent placing buildings or paths through a diagonal wall.

## 0.5.0

- Walls now occupy shared tile edges; R cycles four boundaries, and previews highlight the precise edge.
- Paths and seats can share tiles with boundary walls. Added edge-aware removal, undo, save/export, duplicate detection, and migration of existing wall layouts.
- Fixed field fence now traces exposed tile edges, including the stepped outfield.

## 0.4.0

- Rebuilt bleachers with stepped silver seating rows, rear rails, and gold facing arrows. Saved orientations are preserved.
- Added a fixed, closed playing-field fence with 3-foot foul-side panels and 8-foot outfield panels.
- Depth-sort fence panels with buildings so camera rotation preserves foreground and background ordering.

## 0.3.0

- Recovered the existing v0.2 prototype and split interface, styles, and simulation into editable files.
- Fixed tile geometry to align rendering and click placement at all four camera angles.
- Joined wall endpoints exactly; preserved all eight world directions.
- Rotated actual bleacher, gate, concession and restroom geometry, with previews.
- Recomputed hover after camera changes and guarded canceled pointer actions.
- Preserved existing browser saves; added validated park export/import and storage error feedback.
- Added a local server, regression tests, GitHub checks and Netlify publish settings.

## 0.2.0

Original single-file browser prototype: isometric grid, baseball field, construction tools, budget, undo, save, item rotation and camera rotation controls.
