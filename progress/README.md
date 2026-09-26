# Little Rome progress

Keep one screenshot per major change or major milestone iteration, following
[the development rules](../development-rules.md#progress-screenshots).

The first screenshot will be `0001.png`. Continue sequentially across milestones
without overwriting or renumbering earlier screenshots. Add a row when a capture
exists, linking its filename and recording enough scenario or command detail to
reproduce the view.

| Iteration | Screenshot | Milestone or major change | Capture scenario or command |
| --- | --- | --- | --- |
| 0001 | [0001.png](0001.png) | M1: Blender diorama and budgeted planning | `npm.cmd run capture`; default example, 1440×900, planning, default camera. |
| 0002 | [0002.png](0002.png) | M2: autonomous year, seasonal stores, and recorded playback | `node scripts/scenarios.mjs`; example town, winter day 4, paused, 1440×900. |
| 0003 | [0003.png](0003.png) | M3 first visual pass: textured terrain, planting, tiled roofs, animation, and drought | `npm.cmd run test:visual`; example town, summer day 4, paused, 1440×900. Fresh critic: 6.6/10 against concept art; surface reflections, variation, and poses need refinement. |
| 0004 | [0004.png](0004.png) | M3 second visual pass: mixed planting, house details, visible stores, work poses, and reflections | Same summer capture command and scenario. Review: 7.0/10; wet surface integration, roof relief, and foliage shading remain. Live winter median 30.8 ms; p95 41.1 ms. |
| 0005 | [0005.png](0005.png) | M3 third visual pass: irregular paving, clay roof courses, pale plaster, columned porch, larger supplies, contact shading, closer framing, and timeline clarity | `npm.cmd run test:visual`; summer day 4, paused, 1440×900, revised default camera. Review: 7.3/10. Winter medians: 30.7 ms at 1×, 27.7 ms at 4×. Remaining gaps: composition, coarse foliage, grain silhouettes, and surface relief. |
| 0006 | [0006.png](0006.png) | M3 fourth visual pass: staggered homes, clustered planting, layered tree crowns, finer cliff rock, pond banks/reflections, clearer placement and resident feedback, winter stubble and warm light | `npm.cmd run test:visual`; default example at day 17.35, 1440×900, paused. All six states, motion, pause, close/alternate views and compact controls pass. Winter medians: 32.0 ms at 1×, 31.5 ms at 4×. |
| 0007 | [0007.png](0007.png) | M3 complete: branching herbs and garden clusters, dense golden grain, fine grass, fractured stone, plaster wear, seasonal foliage, outlined placement preview and corrected pond/road reflections | `npm.cmd run test:visual`; the same summer day 4 view at day 17.35. All seasonal, camera, animation, pause and preview checks pass. Final review: 8.0/10. Winter medians: 31.7 ms at 1×, 32.0 ms at 4×. |
