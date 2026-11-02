# Release status — v0.38

Authorized pass covers diagonal concourse fillers, connector cleanup and fan rendering. Triangular concourses now share unused space in a diagonal seating anchor through a separate infillDecks save map. All movement links and railing cuts for these surfaces derive from common shared edges and matching heights. Existing layouts keep legacy corner connections where no real shared edge exists. Fallback bridges stop at the deck boundary and omit internal end walls.

Fan rendering retains camera depth on projected opaque faces. Fans render with face-specific clipping, preserving visible heads above walls while covering legs behind padding. Spatial buckets bound the visibility work to faces near each fan. Existing crowd movement and personal-space rules remain unchanged.

Run npm run check. The suite includes independent filler construction/rotation/save/refund/Undo, overlap rejection, complete lower-concourse-upper arrival/exit, and real wall visibility checks from four camera orientations. The existing 976-reachable-seat exported park still completes the 1,000-fan request and caps admission correctly. Browser review uses that park and the new diagonal test layout.

How to use: choose Triangular concourse, rotate with R into the unused half of a diagonal fence-seating cell, and click. It snaps to the matching stair-top height. Continue with normal/triangular concourses, then upper stair sections. Only shared edges at matching heights connect; point contacts are insufficient. In a shared cell, Remove deletes the triangle before the host seating. Undo restores it.

Queued, not in this release: whole-piece red delete previews; level transparency/hiding; eight camera angles; CF at 400 ft and outer expansion; foul-fence stretch one cell from the foul line for 10 cells before angling out (confirm the starting end when implementing); bulk path placement; fan needs and wall ads.
