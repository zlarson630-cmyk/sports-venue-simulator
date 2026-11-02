# v0.36 seating infrastructure validation

Run `npm run check` (syntax plus regression suite).

Checks cover physical seat bays at all eight facings; 6 ft stair aisles; reusable fence rotation and snapping at home plate/center field; saved +5 ft outfield placement; three stacked backstop stair bands; three widening fence-wedge bands at both corners with exact shared row endpoints, footprint validation and reload; existing partial-concourse/guard/access checks; complete 400-fan multi-tier and 800-fan exported-park cycles. Tests retain crowd references after completion so exited assertions cannot pass on an emptied list.

The exported park contains 976 reachable seats after the seat-bay update. With seed 36 and 800 selected, all fans complete arrival/departure within the 420-second simulation allowance. A separate delayed-arrival check exercises fans scheduled after the four-minute game clock. Spatial buckets retain physical collision and priority checks while avoiding scans of the entire crowd for each movement.

Browser checks: grouped tools, selected-tool label, 800 option, corner demo, zoomed chairs/concrete, live crowd and camera views. Existing saved coordinates, money and elevations remain intact. Previously placed outfield stands need rebuilding for the new +5 ft automatic fence base. To stack behind a backstop bank, erase any separately built rear concourse occupying that anchor first. Fence corners keep their dedicated first-/third-base facing; reusable fence seating rotates with R.

Player checks: build an upper backstop band and matching wedge, connect stairs through the bands, join a separate concourse at the intended height; place fence seating at center field and connect its 5 ft base with stairs/ramp; select 800 in a park with enough reachable seats. Devices may differ in frame rate at that attendance.
