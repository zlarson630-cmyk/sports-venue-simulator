# Chunk 2.5 — gameplay acceptance checklist

Refresh the normal game page and confirm v0.27 in the sidebar. Export your park before experimenting with construction. An existing park should retain its balance and layout; no reset is required.

1. **Natural arrivals:** Open gates with at least 100 accessible seats. Watch for small groups, singles and gaps rather than a continuous fixed-interval line. Run another game and check that the pattern varies.
2. **Queues:** Watch the gate, a narrow walkway and stairs. Fans should leave room for each other, wait behind a leader and merge without passing through another walking fan. Fans can wait off-map when the spawn point is occupied.
3. **Seat access:** Test both mirrored side-entry stairs with a walkway touching the green entrance arrow. Also test the rear-concourse demo. Fans should climb/descend to all reachable rows. Inaccessible seats should remain inaccessible.
4. **Practical routes:** Give a long seating block more than one connected aisle and a rear concourse. Fans should use the concourse to approach a nearby aisle rather than traverse many intervening seat sections. Watch near seats for unnecessary overshooting and doubling back.
5. **Postgame:** Let the full two-minute clock finish without pressing End game. The status should change to Postgame. Fans should stand at staggered times, queue down stairs and through the gate, then disappear at the street spawn point. Wait for the all-fans-returned message.
6. **Complete crowd:** Confirm 100 admissions when 100 reachable seats are available, every fan can get seated, and the whole crowd eventually leaves. Very long or bottlenecked routes may need extra postgame time.
7. **Money:** Each arrival earns $5 once. Departures earn nothing. A 100-admission game adds $500. A second game can earn another $500. Save/reload and construction undo should preserve earned income.
8. **Controls and saves:** Pan, zoom and rotate the camera 90°/180° while fans are moving. After everyone leaves, build/remove/undo, export and reload. Check that the layout and balance remain correct. New/reset parks still start at $500,000.

Automated regression coverage is separate from this player checklist; no player PASS is assumed. If anything stalls, report the piece/route, whether the fan is arriving or exiting, and a screenshot with the camera turned enough to see the walkway entrance.

For this release, route resistance uses distance, row/stair effort and estimated assigned arrival traffic. Fans do not continuously switch routes based on live queues. Decorative parking-lot scenery is still a later batch, so the return destination remains the existing street spawn point.
