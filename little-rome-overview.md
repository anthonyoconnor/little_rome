# Little Rome — Game Overview

**Game title:** Little Rome  
**Target platform:** Browser  
**Document:** Design overview, version 0.1  
**Status:** Proposed design for the build-and-watch version

See [Gameplay Instructions and Rules](little-rome-gameplay.md) for player controls, simulation behaviour, and validation criteria.

## The game in one sentence

Build a small Roman-inspired town on the top of a cube of landscape, press **Go**, and watch its people live through the seasons as your layout leads to a thriving community or a gradual collapse.

## The experience

The pleasure comes from arranging a miniature world and seeing it come alive. A resident leaves home with an empty jug, walks to a well, draws water, and carries it back. Another tends a field. Paths become busy, crops grow, rain darkens the stone, and homes glow at dusk.

These details explain the simulation. Long journeys leave less time for work. A badly supplied field wilts. A household running out of food becomes quieter before its residents eventually leave. A successful town feels busy, cared for, and prepared for winter.

The player's main decisions happen before the simulation starts. During a run, the player observes, inspects, pauses, changes playback speed, and rewinds. A disappointing outcome should create a clear idea for the next layout.

## Confirmed direction

The following comes directly from the agreed game concept:

- The whole town occupies the **top face of one cube-shaped landscape**. The camera can rotate around it.
- Each level provides a **fixed starting budget** that limits construction.
- The player lays out roads and a small selection of buildings, then presses **Go**.
- People act autonomously: fetching water, working fields, and carrying out other everyday activities.
- Watching the simulation is the main experience.
- Playback includes **pause, fast-forward, and rewind**.
- Weather and seasons affect the town.
- Placement decisions can produce success or collapse, including crop failure and abandoned homes.
- The finished game aims for the **high visual fidelity of the approved concept art**.
- Construction has a small tool palette; the running simulation has minimal UI.

The rules below develop that direction into a coherent first playable. Building prices, level length, capacities, and precise win conditions are proposals to test, rather than established balance.

## Core loop

1. **Read the landscape.** Inspect the terrain, starting budget, seasonal outlook, and level objective.
2. **Arrange the town.** Place roads, homes, fields, and wells. Check access and walking distances.
3. **Press Go.** Residents arrive and the autonomous simulation begins.
4. **Watch a year unfold.** Follow daily routines, weather changes, harvests, and household needs.
5. **Investigate the outcome.** Pause or rewind to understand when the town began to flourish or struggle.
6. **Revise and retry.** Return to the starting layout, change the plan, and run it again under the same conditions.

Proposed session target: a complete year takes roughly **8–12 minutes at normal speed**, with faster playback for repeat attempts. Planning and inspection are untimed.

## The playable space

Each level is one self-contained diorama. The town, paths, fields, and natural features remain visible together at the default camera distance. The exposed earth and rock on the cube's sides establish its physical character; those sides contain no buildings or gameplay.

A discreet grid helps construction. It disappears when the simulation starts. Players rotate the view and can move closer to inspect activity, but the default view always makes the whole town easy to read.

Terrain creates small planning problems: a pond occupies useful space, a dry patch makes farming less forgiving, or an outcrop lengthens a route. The initial level should provide enough open space to learn without requiring one exact solution.

## A deliberately small construction set

| Placeable | Purpose | Main planning decision |
| --- | --- | --- |
| Road | Gives residents a connected walking route. | How directly can people reach homes, water, and work? |
| Home | Houses a small household whose adults perform work. | Are there enough workers, and can each household be supplied? |
| Field | Produces food through visible growing and harvesting. | Is it close enough to workers and a dependable water source? |
| Well | Provides water that residents physically collect and carry. | Can its supply and location support nearby demand? |

Field shelters, baskets, tools, and household storage are part of these placeables. They do not require additional building types in the first version.

The budget is spent on the initial layout. There is no ongoing tax income or construction economy during a run. Unspent money is allowed; spending every coin is not an objective.

## What makes the strategy interesting

**Distance has a cost.** A well may contain plenty of water while a distant field still suffers because workers cannot move enough of it in time.

**More homes create both labour and demand.** Additional residents can work, but also require food and water. Filling every space with housing should not be the winning strategy.

**Seasons reward preparation.** A town that consumes every harvest immediately may look healthy in summer and struggle in winter. Storage and timely deliveries matter.

**Resilience competes with efficiency.** A compact town can use its budget well. A second well or shorter alternate route may protect it during a difficult season, but consumes money that could fund homes or crops.

**Failure is visible and recoverable through learning.** The player should see the chain from a long route to missed watering, from missed watering to a poor harvest, and from low food to departures.

## The living simulation

Residents choose work automatically. Their needs, available supplies, travel time, and seasonal jobs determine their activity. There is no manual assignment of every worker.

Food and water are physical resources with visible collection and delivery. Connection to a road alone does not make a home supplied. The town also needs enough production, carrying capacity, and time.

Shortages progress gradually. Fields show stress before dying. Homes show strain before abandonment. Rain can help a struggling crop, and a timely delivery can rescue a household before its residents decide to leave.

Quiet moments matter too: neighbours greet each other, workers rest after urgent tasks, and people shelter from rain. These activities add life without hiding or arbitrarily interrupting essential work.

## Seasons and fair outcomes

Spring establishes growth, summer increases pressure on water, autumn brings final harvests and storage, and winter tests the town's reserves. Weather changes soil moisture, well replenishment, and the atmosphere of the scene.

The proposed first version uses a fixed weather sequence for each level. Retrying the same layout produces the same outcome, and the level briefing describes the expected seasonal challenge. Later levels can introduce more demanding conditions.

A successful introductory town should keep its target households occupied through winter with enough reserves to remain credible as a living settlement. A failed attempt may finish with too few occupied homes or end earlier if everyone leaves. Exact targets belong in each level's brief.

## Two UI states

| Phase | Always-visible interface | Available on request |
| --- | --- | --- |
| Planning | Budget, four construction tools, undo, and Go. | Level brief, costs, access warnings, and building details. |
| Simulation | A small season/weather indicator and playback controls. | A resident's current task, a building's supplies, and recorded event markers. |

The proposed rule is that pressing Go commits the layout for that run. Pause and rewind are observation tools. To change the town, return to planning and begin a fresh simulation from the start.

## Visual and audio direction

Use the approved concept art as the quality target: detailed terracotta roofs, pale plaster, stone wells, textured earth, planted rows, Mediterranean vegetation, and small readable people. Lighting, material detail, shadows, water, and weather should make the diorama feel tangible.

Preserve the important visual sequences: the clean planning layout; spring water collection; busy summer farming; a stocked autumn town; drought and departing households; and a wet, quiet winter with warm windows.

Animation must communicate actual simulation state. Buckets fill when water is collected, baskets move with harvested food, and abandoned homes lose their signs of occupation. Decorative motion should support that cause and effect.

Sound should reward observation: footsteps, well ropes, splashing water, field work, conversation, rain, wind, and evening ambience. Essential information must also remain understandable with audio muted.

## Scope of the first version

Include one readable landscape, the four construction tools, a fixed budget, autonomous residents, food and water, seasonal growth, household decline, a full-year objective, and trustworthy playback including rewind. One forgiving level and a few focused challenge variants are sufficient to test the concept.

Defer combat, trade, politics, technology trees, large populations, multiple playable cube faces, manual job management, and a growing construction catalogue. Production hardening is outside this design task. High visual fidelity remains the finished-game goal.

## How we will judge it

- Watching a resident for a short time reveals a recognisable purpose.
- The scene usually explains a shortage before the player opens an inspector.
- Moving a well, shortening a path, or changing the balance of homes and fields produces understandable consequences.
- Several layouts can succeed; one memorised arrangement is not required.
- A failed attempt suggests a specific improvement, and retrying is quick.
- Seasons visibly change both the town's appearance and its needs.
- The player wants to keep watching even when the town is doing well.

These are design and playtest goals. This document does not claim that the revised simulation has been implemented, balanced, or tested for enjoyment.

## Relationship to earlier work

This overview and its companion gameplay document describe the current **build-and-watch** direction. Where they conflict with earlier monthly-turn mechanics or development notes, use these documents for the revised game. Results from an earlier prototype do not validate this new simulation.
