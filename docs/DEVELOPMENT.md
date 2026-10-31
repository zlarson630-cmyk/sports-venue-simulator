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
