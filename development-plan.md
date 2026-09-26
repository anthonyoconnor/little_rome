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

## M3 — A tangible, readable little world · complete
Outcome: refine lighting, assets, animation, seasonal feedback, and restrained controls against all six concept images.
- Fresh read-only visual critique of actual game captures; fix major discrepancies and inspect a second angle and close view.
- Automate all six visual states and the full year/retry loop; record measured performance (target: median frame below 33 ms at 1440×900 on this machine).
- Record one selected screenshot per major visual iteration and commit logical checkpoints.

## M4 — Neighbours with character and weight · in progress
Outcome: a supplementary close-up resident concept, implemented as more detailed Blender people with grounded, readable movement and prop handling.
- Save the generated resident reference and its prompt alongside the original concept art; retain the original town targets.
- Add distinct faces/hair, sculpted clothing and sandals, and articulated knees, hands and upper bodies.
- Verify walking, carrying, collecting, tending, harvesting and quiet activity in actual browser close-ups and a motion sequence.
- Preserve deterministic pause/rewind, actual carried-resource feedback and the full-year outcome; measure normal-view performance.
- Obtain a fresh read-only critique and save one actual in-game completion capture as the next progress image.

## Visual iteration record
The first M3 visual checkpoint adds textured Blender surfaces, smooth roof tiles, denser planting, irregular cliff stones, seasonal lighting, animated residents, and drought feedback. The six-state browser check passes, including pause, imported animation, a second camera angle, close inspection, and a compact viewport. Winter median frame: 30.1 ms at 1440×900; p95 34.1 ms. Record this iteration as `0003.png`.

The second pass (`0004.png`) adds grain/vegetable variety, sacks and jars, home details, stronger work poses, physical clay roof shells, and cached reflections. All six visual states, alternate/close views, pause, and small-window controls pass. Live winter median 30.8 ms; p95 41.1 ms. Fresh review: 7.0/10, with visible improvement and regressions in puddle repetition and roof relief.

The third pass (`0005.png`) adds irregular paving, cleaner plaster, separate clay roof courses, a columned home variant, larger stores, articulated work poses, contact shading, closer framing, and a full timeline track. The complete browser year/retry/challenge flows and six-state visual check pass. Median winter frame: 30.7 ms at 1× and 27.7 ms at 4× (p95 42.3 / 45.6 ms), with cached secondary views. Production build passes. Fresh review improved from 6.8 to 7.3/10 after corrections.

The fourth pass (`0006.png`) varies the example town's composition without changing its cost, adds layered olive/cypress crowns, clustered planting, finer cliff stone, contoured pond banks, a cached pond reflection, articulated forearms, winter stubble and stronger warm-window light. The selection ring and numbered household notices clarify departures; the placement ghost uses a consistent green/amber/red material. Roof overlaps, ground texture and direct sunlight were corrected through browser comparisons. A fresh review before the root-cause corrections scored summer 7.2/10; subsequent review and corrections are recorded below.

All 22 headless checks pass, including successful alternative plans and all four challenge examples. The six-state capture passes at 1440×900, with paused / 1× / 4× winter medians of 27.6 / 32.0 / 31.5 ms (p95 32.3 / 46.6 / 44.2 ms). SMAA supplies antialiasing; the redundant canvas MSAA and excess lens texture samples were removed after one measured 33.4 ms regression. Production compilation passes.

The complete browser check also passes for the revised example: placement, move, refund/undo, camera, sound toggle, full year, 1×/4×, pause, timeline keyboard scrubbing, exact rewind/retry, collapse, and all challenge variants.

The fifth pass (`0007.png`) addresses the remaining surface and readability problems. Fine grass is packed into the Blender terrain texture; branching herbs replace round shrub fillers; fractured cliff blocks replace smooth stones; fuller golden grain appears only after its growth stage develops. Plaster has localized wear, roads use warmer stone, and contact shading separates foundations and planting. Autumn color is concentrated in individual herbs and vines. Construction previews temporarily suppress plants in their footprint and restore them when canceled. A reflection clipping fault was diagnosed and fixed in both the pond and road film: the reflected view had been occluded by the underlying surface. The six-state capture now visibly reflects trees, shore and lit buildings. Layered garden clusters fill field corners and foreground pockets; restrained edges make the placement preview recognizable.

Fresh review of this pass progressed from 7.4 to 7.8 to 8.0/10 after corrections. The final review found no important visual delivery blocker in planning, summer, autumn, winter, the alternate angle or close view. Remaining polish concerns are richer material/light variation, the straight cliff rim and slab patterns, some angular small rocks, and the residents' relative scale in the default framing. A follow-up of the final spring, drought, departure and abandonment captures upheld that assessment and found no exposed cliff holes in the visible faces. Abandoned homes could have stronger visual neglect.

Final validation: 22 headless checks, the complete browser year/retry/rewind/collapse and challenge flows, the six-state visual check, and production build pass. Paused / 1× / 4× winter medians are 27.9 / 31.7 / 32.0 ms (p95 32.0 / 46.7 / 43.8 ms). A measured performance regression was fixed by removing fully buried cliff faces and avoiding repeated building/material updates between simulation ticks. Visible geometry remains intact; people and rain still interpolate every frame. The M3 completion capture is `0007.png`.

No required milestone work remains. See [validation.md](validation.md) for evidence and limits. All validation is automated; enjoyment is not claimed as tested by automation.
