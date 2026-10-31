# Changelog

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
