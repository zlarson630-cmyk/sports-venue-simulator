# Open undersides — five-minute player checklist (v0.43)

Use your current park. Export a backup first if you want a convenient comparison. This is a player acceptance checklist; the automated fixture is `tests/fixtures/hollow-stands-v043.json`.

1. Expand **Build layers**. Choose **Change underside** and click the ground footprint of an existing section with a base at least 15 ft above ground. Confirm its foundation opens. Ground-level sections should refuse this change.
2. Enable **Work underneath · hide upper pieces**. Raised sections and upper fans disappear from view; the game continues. Ground paths, shops and low stairs remain visible.
3. Extend a ground walkway from the main gate underneath the section. Place a concession or restroom beside that connected path, underneath the seating. A base of at least 15 ft is required for shops; paths fit beneath a 10 ft base.
4. Try a shop under a 5 or 10 ft section, or beneath a solid foundation. It should be rejected with an explanation and no charge. The preview and click should agree.
5. Turn Work underneath off. Confirm the upper seating is still there and the facility is visible below it where the view permits. Rotate the camera to look for shop signs poking through seats, solid walls reappearing or fans drawing through floors.
6. Run a short game with 100 requested fans, limited by reachable seats. Watch a hungry fan or a fan needing the restroom descend, visit the covered facility and return to the same seat. Use Inspect fan (F) for activity and needs. Confirm everyone exits after the game.
7. After the game, turn Work underneath on and remove the lower facility. Upper seating should remain. Undo should restore the facility. Turn the mode off to remove an upper section; the lower piece should remain, and Undo should restore the section.
8. Save and reload, or export/import. Both layers and foundation choices should survive. Try changing a section to solid while a facility remains below: it should refuse until the lower piece is removed.

Record the tile, tool, base height and camera angle if a preview disagrees with placement or a fan gets stuck. A screenshot plus an exported park is the most useful reproduction.

## Scope reminders

- Clearance follows actual height, not the name or number of a level. Several five-foot seating blocks may form one stadium tier.
- Existing parks keep their foundations; new raised pieces default open. Auto height matches neighbors; explicit height does not supply stairs or guarantee fan access.
- This pass provides a ground layer beneath the existing upper construction layer. Independent stacked upper floors on the same cell and shops on elevated concourses are not available yet.
- Named level groups, selective transparency and decorative support columns are later work. The current switch hides all pieces with a raised base.
