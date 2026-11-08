# Release status — current build

## v0.49 integration audit (November 8, 2026)

- Restores the My Ballparks launch menu from the previously unmerged `feature/multi-park-main-menu` work by porting its functionality onto current `main`; the original branch is diverged and must not be merged wholesale.
- The guest manager (Actions, Thoughts, Needs, Spending), game-day innings, and fan movement remain on the mainline.
- Aligns visible version, HTML title, CSS/JS cache keys, and package version to v0.49.
- Validates legacy save migration and separate park slots without discarding `svs01`.
- GitHub Pages deploys the `public/` artifact from `main` through `.github/workflows/pages.yml`, gated by `npm run check`. Browser-level proof of live deployment must still be obtained from the public site.
- The separate visible stadium-overlay game-day HUD and slowed fan walking in `feature/visible-game-day-flow-v2` are not part of the verified mainline; do not claim them as published.

---

Latest pass: **building beneath the stands**. Work underneath now ghosts elevated pieces instead of hiding them. Available/required ground clearance is visible on placement previews. Steel framing/posts are refined, and shop names are painted onto clipped wall planes below the roof. Existing collision rules, saved park data, revenue and fan routing are retained. Automatic support posts are visual and stay off ground walkways. See [the player checklist](UNDER-STAND-BUILDING-TESTING.md).

The v0.43 release checkpoint below is historical; later published passes added visible concession queues, first-time guidance, fan happiness, individual needs trips at 75%, fan centering/following and local aisle reservations.

## v0.43 foundation checkpoint

Open undersides and ground facilities beneath elevated construction are the latest published pass. Food concessions, floating fan inspection, trees and bronze baseball-player statues remain available. Hunger grows independently of bathroom need. Hungry seated fans visit connected ground-level concessions after arrivals finish, queue inside, buy a $5 meal after six seconds, and return to the same seat. One server per stand, at most four visitors in flight. Admission and food revenue are separate; both persist and survive construction undo. Food and bathroom trips share ground-route preparation, corridor reservations and bounded return batches. No new need or routing calculations are added to canvas drawing.

At clock zero, stop starting food service. A current purchase finishes before exit flow begins; queued and travelling customers leave without buying. End Game remains an immediate manual stop. Inspect Fan (F), canvas clicks during play or the picker open the floating inspector; X/Escape close it. Reports hunger, bathroom need, party, seat, activity and completed visits, including missing reachable food or restrooms.

Existing limitations: amenities require adjoining connected ground walkway; shops on upper decks, configurable prices, drinks, stock and staffing are not implemented. The static stadium is now cached as one viewport-sized bitmap with its matching occlusion bins. Layout/color changes invalidate it; camera/zoom/pan/resize and game/build mode changes refresh it. Deck seams and sorted scene geometry are reused across view changes. Income skips layout/access refresh. Fan traffic retains its spatial index across integration steps and frames; only ready movers are sorted. Exact spacing, movement speed, needs and exit rules are retained. Pointer/zoom redraws are coalesced into the game animation loop. Broad traffic/jitter and larger-crowd scaling still need future profiling. Solid concrete gaps, stair/concourse cosmetic joins, player-assigned level visibility, eight camera angles, bulk paths and whole-piece red delete previews remain queued.

Decorations: one ground tile each, trees $250 and statues $1,500. R chooses one of three tree silhouettes or rotates statues 45°. Both use existing placement bounds, field protection, save/import/export validation, 70% removal refunds and Undo. They reserve their ground cell for pedestrian routing. Placed tree crowns and statue solid faces participate in fan occlusion and the static render cache. These are visual assets; they do not add a happiness or attraction mechanic.


## Open undersides and build layers

New elevated seating, stairs and concourses default to open underneath. Ground-level sections remain solid; existing saved sections keep their old solid foundations until explicitly changed. **Build layers** offers automatic or explicit base height, solid/open undersides for new pieces, **Change underside** for existing pieces, and **Work underneath** to hide upper pieces while editing the ground.

A separate ground layer permits connected paths, concessions, bathrooms and decorations below an elevated section when there is enough clearance. With the current five-foot height increments, use at least a 10 ft base over paths, 15 ft over shops/statues or 25 ft over trees. Clearance uses the lowest underside conservatively, not the highest rear seating row. A foundation cannot become solid while a lower item occupies its footprint.

Lower pieces save, export/import, paint, remove/refund and undo independently of upper pieces. Ground and upper walking nodes remain separate. Food and bathroom trips still require connected ground paths. Hiding upper pieces is an editing/view choice and does not remove routes or stop the game.

This is a ground layer beneath the existing elevated construction layer, not unrestricted stacking of independent elevated floors on the same cell. Support columns, named level groups, per-level visibility/transparency and shops on upper concourses remain future work. Existing stepped multi-tier seating remains supported.

Validation: the merged code passed both GitHub checks. The original 135 tests plus six under-stand tests passed locally; the two additional movement regressions from main passed with the six new tests. In browser QA, a 48-seat raised park completed with all fans returning to spawn, four food purchases and eight restroom round trips. Automated coverage also includes clearance, solid-save compatibility, separate layer removal/undo, save reload and diagonal footprints. Player acceptance in the user's own park is pending; use [the v0.43 checklist](HOLLOW-UNDERSIDES-TESTING.md).
