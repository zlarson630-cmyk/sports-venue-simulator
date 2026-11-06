# Building beneath the stands — player checks

Refresh the live game to load the update. Existing parks and balances should remain intact.

1. **Ghost view:** enable Build layers → Work underneath. Raised seating, stairs and concourses should remain faintly visible at their original height. Ground shops, paths and fans stay readable. Rotate the camera and zoom; switch the view off to restore opaque upper pieces.
2. **Shop fit:** preview a shop below an open stand with a 10 ft base. The guide should show 10.1 ft clear and 10 ft needed; placement should succeed. A flat concourse at a 10 ft base has only 9.5 ft beneath its slab and should reject the shop. Raise it to 15 ft for room.
3. **Solid foundations:** preview a shop under a solid raised section. The explanation should say to change it to Open underneath. A blocked preview must not charge money or place anything. Check a diagonal section overlapping the candidate tile too.
4. **Independent editing:** place/remove a ground shop, Undo, export/reload and turn the ghost view off. Its upper section and reserved seats should remain intact. Concrete remains a surface, not an access path through a shop.
5. **Steel and signs:** inspect open stands/concourse edges at each camera angle. Look for dark beams, braces, slim columns and base plates. No automatic post should sit on a connected walkway. Food/drinks/ice cream/souvenir/restroom names should stay on building walls, without rooftop mascots; the service window and artwork belong on the front.
6. **Crowd regression:** run a game with amenities beneath seating. Fans should still use their reserved seats, queue, visit amenities and exit. Ground fans should remain visible when upper pieces are ghosted.
7. **Phone:** open Build layers, toggle Work underneath, select a shop and tap a candidate tile. Check the placement explanation; also test rotate, zoom and Undo. Hover previews are available on desktop; rejected placement explanations are also shown after a tap.

Automated tests cover matching previews/placement, insufficient/solid clearance, save preservation, ghost occlusion and cache changes, unobstructed supports and every shop/camera rotation. Canvas render review supplements those checks; acceptance in a player's own layout remains valuable.
