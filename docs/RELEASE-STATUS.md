# Release status — v0.34

Implemented the authorized crowd/access/layout pass. Stairs, concourses and walkways use opposing keep-right lanes. Shared arrival routing avoids opposing entry into narrow seating rows. The exact player park now seats all 100 fans and completes departures; the browser run confirmed 100 admissions, $500 revenue and all fans returned to parking. Automated runs cover the saved park under three seeds and opposing pedestrian traffic.

Inspect access (I) identifies missing paths/stairs, blocked walls, height mismatches and disconnected gate routes. Suggested pieces are checked against placement and the walking graph; a green ghost shows the location and orientation before normal construction. Multi-piece repairs are labeled as next steps.

The main gate now occupies the opening in the outer fence. Nine automatic paved cells participate in routing. Older parks receive a free, removable one-cell-wide path connection to their former entrance once; existing construction and balance are preserved. Player-built paving is retained.

Corner seat rows are straight and parallel with consistent facing. Their footprints and joining ports remain compatible. Actual capacity is now 7 seats for a regular corner and 13 for a fence corner; the updated corner demo offers 102 reachable seats for $27,600. Straight/backstop sections retain their existing capacity. Maximum zoom is 6× with cursor anchoring; four camera angles remain.

Local npm run check passed 103 tests. Focused inspector, corner and zoom checks passed again after final interface polish. GitHub CI verifies the final tree before merge; Publish game and the live version must be verified afterward. Amenity visits, mascots, accompanied children, stretch and wave remain future work.
