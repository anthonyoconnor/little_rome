# Little Rome

A browser diorama about building a small Roman town and watching one year unfold.

## Run and validate

```powershell
npm.cmd install --cache .cache/npm
npm.cmd run dev
npm.cmd test
npm.cmd run test:browser
npm.cmd run capture
npm.cmd run build
```

Open the local Vite address. Browser checks use installed Google Chrome, a 1440×900 viewport, and readiness signals. Temporary captures go in ignored `artifacts/`; selected milestone images go in `progress/`. No human testing is needed.

The four tools cost 1 / 10 / 14 / 8 coins. Click to place, press R to rotate an entrance, Escape to inspect, and Ctrl Z to undo. Drag to orbit; scroll to zoom; Q / E rotate. Clear layout restores the full budget; example town provides a connected starting arrangement. The village gate's four tiles are free.

Press Go to watch a 56-day year (9 minutes 20 seconds at 1×). Space pauses. Playback includes 1×, 4×, a three-day rewind, and a timeline limited to recorded time. Selecting a resident shows their current errand and route; selecting a building explains its stores and shortages. Return to planning retains your arrangement and restores the original construction accounting. Optional synthesized sound is muted by default.

`src/simulation.js` runs without graphics. It uses 80 fixed ticks per day, physical finite loads, road travel, reserved jobs, 14-day seasons, and fixed weather. `Playback` records complete state at every tick and replays existing history before extending it. The browser exposes `window.__rome` for deterministic reset, state inspection, fast advancement and captures. `scripts/scenarios.mjs` verifies the full loop and captures all seasons, failure, and the result in seconds.

The introductory objective is three occupied homes and at least three days of food and water in every occupied home after winter. Challenge variants change water, terrain, or budget. Automated tests establish mechanics; enjoyment has not been tested with people.

## Assets

Editable models and packed surface textures are in `assets/little-rome.blend`. Rebuild their browser export with:

```powershell
& 'C:/Program Files/Blender Foundation/Blender 5.2/blender.exe' --background --python scripts/create_assets.py
```

All asset geometry is created in Blender, including residents and their articulated parts. The browser instances the exported GLB meshes. See `development-plan.md` for verified milestones and current work.
