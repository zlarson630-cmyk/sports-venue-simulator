# Release status — v0.36

Authorized seating-system pass: reusable fence-aligned seating with eight facings, physical 2 ft seat bays, stackable 5 ft seating bands, widening continuation wedges, +5 ft bases for newly placed outfield sections, separate concourses, matched concrete and collapsible construction groups. Attendance now offers 100 / 200 / 400 / 800, saved per park and capped by reachable seats.

The supplied v0.35 park is preserved in tests/fixtures/backstop-jam-v035.json. It imports with its balance and elevations intact; its 976 reachable seats can support 800 fans. A deterministic 800-fan arrival/exit simulation completes without stranded fans. The larger test exposed late arrivals being frozen at the four-minute clock limit; arrival scheduling now uses a separate elapsed timer. Collision detection uses nearby spatial buckets while preserving the existing separation rules.

New diagonals have 7 seats per row instead of 5; straight rows retain 5. Central 6 ft stairs leave 2 seats per straight row and 4 per diagonal row. Each band rises 5 ft; diagonal band depth is 14.1 ft, matching its grid geometry and upper neighbors. Fence wedges auto-widen when placed one cell uphill from the same lower wedge. Existing rear concourses occupy their original cells; remove those pieces before stacking there. Existing outfield elevations are preserved; rebuild to use automatic +5 ft fence placement.

See CHUNK-3.6-TESTING.md for checks. Publish to the existing GitHub Pages game after CI. Fan needs, purchases, mascots, accompanied children and crowd performances remain future work.
