# Little Rome iteration workflow

Inspired by [Dream Loop's Pro workflow](https://github.com/achimala/dream-loop/blob/main/references/pro-mode/workflow.md). Use the existing concept images as targets and the two game documents as the gameplay specification.

## The loop

1. **Choose the next useful improvement.** Read the current milestone and previous review. Inspect the relevant target image and current game. Keep the comparison's layout, camera, viewport, season, and simulation time reproducible.
2. **Implement it.** Build the required gameplay or visual change. Use [Blender for 3D assets](assets-3d.md). Aim for the reference's actual detail, lighting, and material quality.
3. **Check the live game.** Run fast, targeted automated checks and exercise the affected controls in the browser. Capture the real rendered scene after it has loaded. For movement or resource delivery, inspect a short sequence as well as a still.
4. **Get a fresh visual critique.** Use a read-only subagent when available and permitted, with a fresh context containing the original target, latest screenshot, previous screenshot/review if available, and the critic brief below. Do not give it the builder's justifications. If delegation is unavailable, perform the same review yourself and label it as self-review.
5. **Fix the important gaps.** Address the critique, rerun the relevant checks, and capture again. Prioritize causes such as incorrect framing, weak asset silhouettes, flat materials, or poor light before polishing tiny details.
6. **Record progress and repeat.** Keep the milestone and a short next-action note current. For each major game change or completed major milestone, save exactly one chosen screenshot under progress with the next unused four-digit number and update its index, as development-rules.md requires. Keep temporary comparison images elsewhere. Commit logical progress with only the files belonging to that checkpoint.

## Critic brief

> Inspect the target and actual game images. Judge camera/framing and scale, lighting and color, materials and geometry, detail density, and readability of people and controls. Give an overall visual score out of 10 and a prioritized list of concrete discrepancies. For each important discrepancy, identify where it appears, what creates the mismatch, and a practical correction. Check whether the latest change improved or regressed the previous result. Do not reward a screenshot for features it does not show, or infer correct gameplay from a still. Respect intentional differences required by the written game rules.

Use a spring/summer view for everyday quality, then check planning, autumn, drought, and winter as those states become available. Inspect another camera angle and a close view when asset geometry changes. A single attractive angle is insufficient for a rotatable town.

## Keep gameplay honest

Visual refinement must preserve the fixed planning budget, four construction tools, autonomous physical deliveries, seasonal crop/household behavior, minimal running UI, and pause/fast-forward/rewind. Tests should verify identical outcomes at equal simulation times and consistent resources and people after scrubbing or retrying. Use the gameplay document's validation scenarios as they become relevant; avoid long exhaustive suites on every edit.

## When to continue or stop

- Continue until the requested milestone works, its automated checks pass, and the applicable views are close to the concept art. A visual score of at least 8/10 is a useful review threshold, not proof of a finished game.
- Before calling the game ready, verify the full documented loop through winter and retry, all six visual states, and acceptable measured browser performance. Choose and record a practical performance target on the available machine. Do not require the user to perform testing.
- If performance is poor, first reduce avoidable work, reuse meshes/materials, and optimize assets; capture and review again after optimization.
- If the same substantial gap persists across two rounds, diagnose its underlying cause and change the approach. Do not spend further rounds on ineffective cosmetic tweaks.
- Respect an explicit user time/scope limit. If a real blocker prevents progress, record the issue, current evidence, and next step. Missing evidence means unfinished work; do not weaken the target to declare success.
