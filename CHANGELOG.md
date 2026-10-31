# Changelog

## 0.9.0

- Added fixed 30-foot dugouts on the first- and third-base sides, with recessed floors, retaining walls, benches, rails, and field-side steps. Player animation remains a future feature.

## 0.8.0

- Added a 15-foot dirt warning track inside the outfield fence, including the diagonal sections.
- Expanded foul territory and added a 45-degree backstop behind home plate.
- Preserved 90-foot basepaths and 300-foot foul lines; adjusted camera fit and overlap refunds for the new perimeter.

## 0.7.0

- Set all four base paths to exactly nine 10-foot cells.
- Added rounded infield dirt, home-plate dirt and a properly positioned mound.
- Expanded the playing field to 300-foot foul lines and roughly 304-foot center field, with distance labels and a camera that fits the expanded field.
- Refund old construction that overlaps the expanded protected playing field when loading v0.6 saves.

## 0.6.0

- Added both corner-to-corner wall diagonals alongside four tile edges.
- Restored straight diagonal outfield fencing while keeping endpoints on grid corners.
- Added diagonal save/load, removal, and checks to prevent placing buildings or paths through a diagonal wall.

## 0.5.0

- Walls now occupy shared tile edges; R cycles four boundaries, and previews highlight the precise edge.
- Paths and seats can share tiles with boundary walls. Added edge-aware removal, undo, save/export, duplicate detection, and migration of existing wall layouts.
- Fixed field fence now traces exposed tile edges, including the stepped outfield.

## 0.4.0

- Rebuilt bleachers with stepped silver seating rows, rear rails, and gold facing arrows. Saved orientations are preserved.
- Added a fixed, closed playing-field fence with 3-foot foul-side panels and 8-foot outfield panels.
- Depth-sort fence panels with buildings so camera rotation preserves foreground and background ordering.

## 0.3.0

- Recovered the existing v0.2 prototype and split interface, styles, and simulation into editable files.
- Fixed tile geometry to align rendering and click placement at all four camera angles.
- Joined wall endpoints exactly; preserved all eight world directions.
- Rotated actual bleacher, gate, concession and restroom geometry, with previews.
- Recomputed hover after camera changes and guarded canceled pointer actions.
- Preserved existing browser saves; added validated park export/import and storage error feedback.
- Added a local server, regression tests, GitHub checks and Netlify publish settings.

## 0.2.0

Original single-file browser prototype: isometric grid, baseball field, construction tools, budget, undo, save, item rotation and camera rotation controls.
