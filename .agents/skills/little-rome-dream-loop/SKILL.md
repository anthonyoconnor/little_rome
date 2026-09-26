---
name: little-rome-dream-loop
description: Build and refine Little Rome against its supplied concept art using Blender, live browser screenshots, and repeated visual critique. Use for the Little Rome dream loop; preparation-only requests must not start game development.
---

# Little Rome dream loop

Create the browser game described by [little-rome-overview.md](../../../little-rome-overview.md) and [little-rome-gameplay.md](../../../little-rome-gameplay.md), as close to the existing concept art as possible.

Read those documents and [development-rules.md](../../../development-rules.md) before implementation. The development rules govern milestones, targeted automated tests, Git checkpoints, and progress screenshots. No human testing is required.

**If the request is preparation only, edit the skill and references without starting the game or producing its assets.** A later request to build or continue the game authorizes the implementation loop.

## Targets

Inspect the six original images in [concept_art](../../../concept_art). Use them directly as the visual targets:

| Filename ending | Target |
| --- | --- |
| 09_45_52 PM.png | Planning, placement preview, construction palette |
| 09_46_03 PM.png | Summer farming and busy residents |
| 09_46_16 PM.png | Autumn harvest and stored supplies |
| 09_46_28 PM.png | Drought, failing crops, departing households |
| 09_46_40 PM.png | Wet winter, warm windows, rewind timeline |
| 09_47_42 PM.png | Spring settlement and water collection |

Preserve the detailed terracotta roofs, pale plaster and stone, textured cube sides, Mediterranean planting, purposeful residents, and restrained UI. The written design controls mechanics: use the title Little Rome; the pictured temple does not add a construction tool; snow is not required; crops must reflect their actual growth rather than an illustrative Day 1 label.

## Workflow

Follow [references/workflow.md](references/workflow.md) for implementation and review. Follow [references/assets-3d.md](references/assets-3d.md) whenever creating or modifying 3D assets.

Use the original targets throughout. Optional image generation may clarify a missing view or material, but must not replace the art with an easier target. Never present a generated image or Blender render as a screenshot of the running game.

This is an independently written local adaptation of the approach in [Dream Loop](https://github.com/achimala/dream-loop), tailored to Little Rome and Blender.
