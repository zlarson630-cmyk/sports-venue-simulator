# v0.35 infrastructure and attendance

- Choose 100, 200 or 400 in Fans per game. Open gates: actual attendance is capped by reachable seats. Change the dropdown while playing: the running crowd stays intact and the next game uses the new target. Reload/export/import preserve the setting.
- Backstop rows now cover ten feet of horizontal depth and rise five feet total. The fence-facing front remains fixed. The remaining footprint is a solid, level five-foot rear landing, preserving old rear concourse anchors.
- New fence wedges share a front apex with neighboring banks. Capacity follows the available two-foot seat bays: the narrow front rows are empty, then one and two seats fit. Joining rows share their elevations and exact endpoints. The revised bowl demo provides 122 seats for $31,200.
- Older fence connectors retain their original bank anchors and are marked internally as legacy connectors. Existing parks keep construction and money. Replace an older connector and reposition the adjoining diagonal bank to use the new tight wedge. Regular mirrored corners retain their original geometry.
- Stairs, full concourses and partial concourses have solid concrete to ground. Stair tops, rear landings and exposed deck edges receive guards. Matching diagonal stair connections have a physical apron and local openings in the incident deck rails; wrong-height connections stay closed.

Validation: the 106 pre-existing/new checks outside the initial 400 fixture passed together. The corrected legal 416-seat fixture passed a complete 400-fan arrival/exit run. Final attendance/wedge/landing/legacy checks passed after rendering polish. GitHub runs all 108 checks against the final tree before merge and again before publishing. A browser rear-access game admitted 28 fans ($140) and returned all of them to parking, with 400 selected and attendance correctly capped by seats.

This pass does not implement food/restroom trips, mascot interactions, children, new sports, or automatic expanding upper-bowl corner variants. Those remain separate work.
