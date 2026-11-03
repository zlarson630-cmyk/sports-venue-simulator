# Performance cleanup — v0.41

## Changes

- The static stadium becomes a single viewport-sized canvas bitmap, with its original opaque face bins retained alongside it. Moving fans, fan inspection, access guidance and build previews remain live. Only one bitmap is retained.
- Layout/finish changes invalidate the image. Camera, pan, zoom, viewport/DPR changes and game/build mode refresh it. Income updates only the balance display, leaving the image and access graph intact.
- Surface footprints/seams and sorted scene pieces are retained across pan/zoom; camera rotation re-sorts the scene.
- Pointer/zoom bursts use one requested animation frame, or the existing game loop while fans are active.
- Traffic keeps its cell index across steps/frames, updates only changing cells, deletes empty cells, skips sorting seated/future fans, and searches neighboring cells without temporary arrays. Flags still exclude interior/exited fans. The index is released at game end.
- Shared VM harness supports render-cache tests and a reproducible benchmark without duplicating game rules.

## Measurements

The same saved two-level park (202 pieces including infills, 1,488 reachable seats) was measured in the cloud Chrome browser with 100 seated fans. A temporary local-only wrapper timed 30 draw calls; it and the park preload were removed before release.

| Draw call timing | v0.40 | v0.41 |
| --- | ---: | ---: |
| Median | 388.9 ms | 19.1 ms |
| 95th percentile | 541.3 ms | 383.6 ms |

Median draw cost was about 95% lower in this check. The optimized sample includes first-render and manual zoom/camera refreshes, which still cost substantially more than reusing a stable view. This is a draw-call measurement, not end-to-end FPS or a device-independent guarantee. Simulation, compositing, browser throttling and hardware also affect play.

`npm run benchmark` measures headless JavaScript work using the same 100-fan fixture, deterministic parties, warm repeated draws and short moving/seated simulation batches. Native canvas rasterization is excluded; do not translate these numbers into browser FPS. Compare another release with `node scripts/benchmark.cjs /absolute/path/to/game.js`. Run benchmarks without simultaneous tests for less noisy timing.

## Validation and remaining work

Cache tests cover reuse across fan movement/income, preserved face clipping, camera rotation, colors, construction/undo, viewport resizing, fallback when an offscreen canvas is unavailable, and coalesced pointer events. Existing food, restroom, shared-lane and full exit regressions remain required.

This pass does not claim all crowd jitter is fixed or establish support for 80,000 independently simulated fans. Large active crowds, seat/fan detail reduction when zoomed out, chunked rendering during camera movement, and additional traffic profiling remain possible next steps.
