# Sports Venue Simulator

An isometric browser game about designing and operating a professional sports venue.

**Design → Build → Unfold → Review.** Version 0.8 implements the construction sandbox. Fans, game-day simulation, and review reports are future milestones.

## Play and develop

Requires Node.js 22 or later. No package installation or build step is needed.

```sh
npm run dev
```

Open http://localhost:4173. Run `npm run check` before committing changes.

## Controls

| Control | Action |
| --- | --- |
| Choose a tool, then click a tile | Build |
| Drag the map | Pan |
| Mouse wheel or Zoom buttons | Zoom |
| R / Item button | Rotate the next item by 45°; walls cycle tile edges |
| Q / Camera button | Rotate the camera by 90° |
| Z / Undo | Undo construction or removal |
| Escape / Remove tool | Select removal |
| Center | Return to the baseball field |
| Export park / Import park | Back up or transfer a layout |

Rotation affects the **next item placed**. Remove and rebuild an existing item to change its orientation. Walkways have no directional orientation. Each tile holds one object, plus walls on its boundaries. With Wall selected, R cycles the four edges and two corner-to-corner diagonals; the preview shows the selected edge. Shared edges cannot be purchased twice. Paths and seats can occupy tiles beside walls. Diagonal walls cross the cell and block other objects there. The fixed field fence follows edges and corner-to-corner diagonals, with 3-foot foul-side and 8-foot outfield panels. Click each tile individually; dragging pans.

## What is preserved

- 60 × 60 world, 10 × 10 feet per tile.
- Fixed baseball playing surface, protected from construction: 90-foot basepaths, rounded infield dirt, a 15-foot warning track, a diagonal backstop, 300-foot foul lines and about 304 feet to center. Earlier saves receive full refunds for construction overlapped by the expanded field.
- Walkways, bleachers (24 seats), walls, gates, concessions, restrooms, removal.
- $100,000 starting budget; 70% removal refunds; undo.
- Existing `svs01` browser saves remain compatible.

Saves belong to the current browser and website address. Export a backup before changing addresses or devices; an old file preview's save will not automatically transfer to a hosted site.

## Project files

| Path | Purpose |
| --- | --- |
| `public/index.html` | Game interface |
| `public/styles.css` | Desktop and mobile layouts |
| `public/game.js` | Projection, rendering, construction, saves and input |
| `tests/construction.test.cjs` | Regression tests against the actual game code |
| `.github/workflows/pages.yml` | Check and publish `public/` to GitHub Pages |
| `.github/workflows/check.yml` | Run checks on pushes and pull requests |
| `docs/DEVELOPMENT.md` | Architecture, release workflow and next milestones |

## GitHub Pages setup

1. Create a public GitHub repository named `sports-venue-simulator` and push this project's `main` branch.
2. In the repository, open **Settings → Pages → Build and deployment → Source**, then select **GitHub Actions**.
3. Open **Actions → Publish game → Run workflow** for the first release if the initial push ran before Pages was enabled.
4. Wait for the workflow to finish, then use the live URL shown under **Settings → Pages**. Bookmark that link.

Every push to `main` runs the checks, packages only `public/`, and publishes to the same URL. A failed check stops publication. Pull requests run checks without publishing. No Netlify account or download is needed to play.

## Your everyday routine

- Open the bookmarked game link to play.
- Ask for a change in ChatGPT Work.
- Review the change, then refresh the game link after publication completes.
- Use **Export park** occasionally to back up your layout. Saves stay in the browser and website address where you play.

## Plain-language glossary

- **Repository:** the game's code folder on GitHub, with its history.
- **Commit:** a saved checkpoint describing what changed.
- **Main:** the version intended for players.
- **Workflow:** automatic instructions that check and publish a release.
- **GitHub Pages:** the service that turns the game files into a playable website.

No credentials belong in the repository. This game is a static website with no backend or API keys. The code and published game will be public.
