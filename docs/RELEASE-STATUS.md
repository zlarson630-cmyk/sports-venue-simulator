# Release status — v0.33

Continuous seating corners and partial concourses are implemented. Regular mirrored corners join straight and 45° banks; dedicated fence corners align the deeper backstop pieces with the first/third-base straight banks. Half-width and triangular concourses use shared walking surfaces and partial rail openings. Tile completion preserves height and palette and checks the completed footprint.

The new $25,800 corner bowl demo has 132 reachable seats. Browser review confirmed the physical seating joins and a complete browser game: all 100 fans seated, then returned to parking, with exactly $500 admission revenue; docs/review-v0.33.jpg records that view. Regression coverage includes all regular rotations/mirrors, raised placement, refund/undo/reload, fence alignment, cross-bank access, partial ports/rails, completion/collision/import guards and full 100-fan cycles under multiple seeds.

Publication remains authorized for zlarson630-cmyk/sports-venue-simulator. Merge only after GitHub CI succeeds; verify the Publish game workflow and live version afterward. Corners do not automatically stack uphill. Needs/amenity visits, mascots, accompanied children, stretch and wave remain in DESIGN-BACKLOG.md.

The full local suite passed 95 tests before the final partial-edge snapping guard; focused snapping/access checks pass afterward. GitHub CI runs the final 96-test suite before merge.
