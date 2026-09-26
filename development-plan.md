# Development plan

## M1 — A town you can arrange · complete
Outcome: a browser-rendered Roman diorama, with Blender source assets and an editable, budgeted town.
- Automatically verify placement, entrances, obstacles, move/refund/undo, and budget bounds.
- Browser smoke checks exercise construction, camera, inspection, and an 80-coin level brief.
- Inspect the running scene and record `progress/0001.png` before the milestone checkpoint.
- Evidence: 5 layout tests, production build, and automated Chrome placement/undo/camera smoke passed. Initial render median 16.6 ms. Fresh visual review: 6/10; framing and roof geometry corrected, vegetation/material gaps assigned to M3.

## M2 — A year of village life · complete
Outcome: residents physically carry water and food, tend and harvest crops, survive or depart, with seasons and trustworthy playback.
- Deterministic headless scenarios cover sensible alternatives, shortages, distance, recovery, winter, retry, speed, and rewind.
- Browser checks exercise Go, pause, speed, scrub, inspect, outcome, and revise.
- Record one representative progress screenshot with the milestone checkpoint.
- Evidence: 21 tests pass in about one second; full Chrome year, reserve outcome, pause, speeds, selection, rewind, exact retry, and collapse pass. `0002.png` records winter. Normal year duration is 9 minutes 20 seconds. Three challenge variants also have verified successful example plans.

## M3 — A tangible, readable little world · in progress
Outcome: refine lighting, assets, animation, seasonal feedback, and restrained controls against all six concept images.
- Fresh read-only visual critique of actual game captures; fix major discrepancies and inspect a second angle and close view.
- Automate all six visual states and the full year/retry loop; record measured performance (target: median frame below 33 ms at 1440×900 on this machine).
- Record one selected screenshot per major visual iteration and commit logical checkpoints.

## Current next action
The first M3 visual checkpoint adds textured Blender surfaces, smooth roof tiles, denser planting, irregular cliff stones, seasonal lighting, animated residents, and drought feedback. The six-state browser check passes, including pause, imported animation, a second camera angle, close inspection, and a compact viewport. Winter median frame: 30.1 ms at 1440×900; p95 34.1 ms. Record this iteration as `0003.png`.

The second pass (`0004.png`) adds grain/vegetable variety, sacks and jars, home details, stronger work poses, physical clay roof shells, and cached reflections. All six visual states, alternate/close views, pause, and small-window controls pass. Live winter median 30.8 ms; p95 41.1 ms. Fresh review: 7.0/10, with visible improvement and regressions in puddle repetition and roof relief.

Next: integrate wet paving, restore curved roof highlights, and improve foliage shading. All validation is automated; enjoyment is not claimed as tested by automation.
