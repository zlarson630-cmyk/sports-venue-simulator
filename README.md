# Sports Venue Simulator

An isometric browser game about designing and operating a professional sports venue.

**Design → Build → Unfold → Review.** Version 0.38 lets triangular concourses fill unused parts of diagonal seating cells as independent pieces. Shared physical edges and matching heights connect concourses and stairs, open railings, and support another seating band beyond the concourse. Fallback bridges stop at deck boundaries. Fans use solid-face depth clipping so walls and elevated structures hide only the portions actually behind them. Existing layouts, game settings, green/brick finishes and the yellow wall stripe remain compatible.

## Play and develop

Requires Node.js 22 or later. No package installation or build step is needed.

```sh
npm run dev
```

Open http://localhost:4173. Run `npm run check` before committing changes.

## Controls

| Control | Action |
| --- | --- |
| Choose a tool, then click a tile | Build |
| Drag the map | Pan |
| Mouse wheel or Zoom buttons | Zoom |
| R / Item button | Rotate the next item by 45°; walls cycle tile edges |
| Q / Camera button | Rotate the camera by 90° |
| I / Inspect access | Explain a disconnected section and preview a suggested repair |
| W / G | Walkway / remove tool |
| Z / Undo | Undo construction or removal |
| Escape / Remove tool | Select removal |
| Center | Return to the baseball field |
| Export park / Import park | Back up or transfer a layout |

Rotation affects the **next item placed**. Remove and rebuild an existing item to change its orientation. Walkways have no directional orientation. Each tile holds one primary object, plus walls on its boundaries. A triangular concourse may share the unused half of a diagonal seating cell; it has its own cost, height and removal. Remove in a shared cell deletes the triangle first, preserving seating. With Wall selected, R cycles the four edges and two corner-to-corner diagonals; the preview shows the selected edge. Shared edges cannot be purchased twice. Paths and seats can occupy tiles beside walls. Diagonal walls cross the cell and block other objects there. The fixed field fence follows edges and corner-to-corner diagonals, with 3-foot foul-side and 8-foot outfield panels. Click each tile individually; dragging pans.

## What is preserved

- 60 × 60 world, 10 × 10 feet per tile.
- Fixed baseball playing surface, protected from construction: 90-foot basepaths, rounded infield dirt, a 15-foot warning track, a diagonal backstop, 300-foot foul lines and about 304 feet to center. Earlier saves receive full refunds for construction overlapped by the expanded field.
- Walkways, bleachers (24 seats), walls, gates, concessions, restrooms, removal.
- $500,000 starting budget for new/reset parks; 70% removal refunds; undo.
- Existing `svs01` browser saves remain compatible.

Saves belong to the current browser and website address. Export a backup before changing addresses or devices; an old file preview's save will not automatically transfer to a hosted site.

## Project files

| Path | Purpose |
| --- | --- |
| `public/index.html` | Game interface |
| `public/styles.css` | Desktop and mobile layouts |
| `public/game.js` | Projection, rendering, construction, saves and input |
| `tests/construction.test.cjs` | Regression tests against the actual game code |
| `.github/workflows/pages.yml` | Check and publish `public/` to GitHub Pages |
| `.github/workflows/check.yml` | Run checks on pushes and pull requests |
| `docs/DEVELOPMENT.md` | Architecture, release workflow and next milestones |

## GitHub Pages setup

1. Create a public GitHub repository named `sports-venue-simulator` and push this project's `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment → Source**, then select **GitHub Actions**.
3. Open **Actions → Publish game → Run workflow** for the first release if the initial push ran before Pages was enabled.
4. Wait for the workflow to finish, then use the live URL shown under **Settings → Pages**. Bookmark that link.

Every push to `main` runs the checks, packages only `public/`, and publishes to the same URL. A failed check stops publication. Pull requests run checks without publishing. No Netlify account or download is needed to play.

## Your everyday routine

- Open the bookmarked game link to play.
- Ask for a change in ChatGPT Work.
- Review the change, then refresh the game link after publication completes.
- Use **Export park** occasionally to back up your layout. Saves stay in the browser and website address where you play.

## Plain-language glossary

- **Repository:** the game's code folder on GitHub, with its history.
- **Commit:** a saved checkpoint describing what changed.
- **Main:** the version intended for players.
- **Workflow:** automatic instructions that check and publish a release.
- **GitHub Pages:** the service that turns the game files into a playable website.

No credentials belong in the repository. This game is a static website with no backend or API keys. The code and published game will be public.

## First fan test

Use **Build demo route** (up to $2,000) then **Open gates** to watch 24 fans arrive from parking and sit. The demo preserves existing objects and reports any conflicts. **End test** clears the fans so you can build again. You can also connect your own walkways from the marked entrance tile (14,10) to bleachers. Walkways can connect diagonally when both adjoining orthogonal corridors are clear; walls block crossings. Games use up to 100 fans, limited by reachable seats, and charge $5 when each fan crosses the main gate. Arrivals have groups and gaps; fans prefer walkways/concourses over long seating-row crossings and queue with personal spacing. After the four-minute game, staggered departures return to the parking-lot spawn point. Let everyone leave before opening gates again. End game remains a manual early stop. Existing save balances are preserved.

See [the design backlog](docs/DESIGN-BACKLOG.md) and [Chunk 2.5 gameplay checks](docs/CHUNK-2.5-TESTING.md).

See [the overnight gameplay checklist](docs/OVERNIGHT-TESTING.md) for all completed local batches and known limits. The mascot, accompanied children, stretch and wave remain future ideas.

## v0.30 construction tools

The baseline sides of the stadium block have 30 ft more building depth. Standalone stairs have no seats and connect ground paths to elevated concourses. Use the dedicated Backstop seating / Backstop stair seats for a field-facing front bank against the angled fence; regular diagonals are preserved. Build backstop demo shows a connected example. These deeper front-bank pieces do not stack uphill; connect their stair tops to a rear concourse. Backstop layouts use paths from the main-gate landing at 11,7. W selects Walkway; G selects Remove. See docs/CHUNK-3.0-TESTING.md.

## v0.32 layout and access polish

The entrance sidewalk now reaches the relocated inner curb; parking crossing marks align across the approach. Neighborhood buildings have opaque roofs, visible wall windows and doors. Scoreboard displays follow the board plane, stay inside its frame and appear only on the front. The gold ground arrow marks the direction spectators see the display from.

Ramp ($3,600): six cells / 60 ft long, 10 ft wide, +5 ft rise (1:12). R rotates 90°. Join its low end to a path or matching-height concourse and its high end to a concourse. Place the ramp first, then its landing to snap the height. Remove can select any occupied ramp cell. Corner landing ($700) is triangular, rotates 90°, and opens its two full sides at the adjoining deck height. Use stairs and landings to connect separate seating banks; this release does not create continuous wedge seating rows. End-stair entry labels and help distinguish the 5 ft side landing from the walkway that must lead back to the gate.

See docs/CHUNK-3.2-TESTING.md for the player checklist.

## v0.33 continuous corners and partial concourses

- **Corner seating L/R ($2,200):** mirrored 45° transitions between a cardinal stand and a diagonal stand. R rotates 90°. Four rows (22 seats) meet both banks at the same base height. Access comes through stairs in either bank; corner pieces add no stairs.
- **Fence corner 1B/3B ($3,000):** deeper, fixed-facing transitions for the home-plate front bank. First-base corner at 17,9 joins straight seating/stairs at 18,9 to Backstop seating at 15,10. Third-base corner at 13,13 joins straight seating/stairs at 13,14 to Backstop seating at 14,11. Their front edges lie on the actual angled fence; each holds 38 seats in four widening rows.
- **Half concourse ($450):** 5 × 10 ft, level, R rotates 90°. **Triangular concourse ($700)** extends the existing corner landing. Both snap to matching stair/ramp/deck heights. Only shared walking surfaces connect; unconnected portions retain rails. Add the opposite half/triangle or select full Concourse to complete the tile for the remaining $450/$200, preserving its height and colors.
- **Build corner bowl demo ($25,800):** a connected 132-seat front bowl with both fence corners, stair entrances, half-width rear concourses and a triangular turn. Open gates for up to 100 fans. Use an empty area; the demo preserves occupied parks and is undoable.

Corners connect rows laterally at matching heights. They do not provide an uphill route or automatically stack behind one another. Use matching stairs and concourses between elevations. Older parks, balances and the save format remain unchanged. See docs/CHUNK-3.3-TESTING.md and the visual review in docs/review-v0.33.jpg.
