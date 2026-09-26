# Little Rome — Gameplay Instructions and Rules

**Document:** Gameplay specification, version 0.1  
**Status:** Proposed rules for the build-and-watch version

Read [Game Overview](little-rome-overview.md) for the experience, visual direction, and scope.

The fixed budget, top-face landscape, autonomous simulation, seasons, minimal UI, and playback controls are confirmed design requirements. The detailed rules and example numbers below are proposed defaults for the first playable.

## 1. How to play

1. **Inspect the level.** Read its budget, household target, terrain, and seasonal outlook.
2. **Lay roads from the village entrance.** Keep routes between homes, fields, and wells short.
3. **Place homes.** Their residents provide the town's workforce and need food and water.
4. **Place fields and wells.** Make their entrances accessible. Plan for water delivery and enough harvests to cover winter.
5. **Review your layout.** Inspect warnings and remaining money. Move or remove anything while planning.
6. **Press Go.** Residents arrive and begin making their own decisions.
7. **Watch.** Follow people and deliveries. Pause to inspect a problem, fast-forward quiet periods, or rewind to see its cause.
8. **Review the result.** At the end of the year, see whether the town met the level objective.
9. **Try a revised plan.** Return to planning, adjust the starting layout, and press Go again.

You do not need to spend every coin. You do need to give your residents a practical way to meet their needs.

## 2. Level structure

Each level contains:

- One cube-shaped landscape with a playable top face and a fixed village entrance.
- A starting budget and a small construction palette.
- Terrain that identifies buildable ground, obstacles, and suitable field locations.
- A disclosed survival objective and a simple seasonal outlook.
- A repeatable weather sequence.

**Proposed introductory level:** start with 80 coins and finish the first winter with at least three occupied homes, with at least three days of food and water remaining in every occupied home. The exact goal must appear before construction begins.

A proposed calendar uses four 14-day seasons, making one year 56 simulation days. Tune normal playback so a year takes about 8–12 minutes. This is a compressed game calendar; animation, travel, consumption, and growth must be tuned together.

## 3. Planning and construction

### Placement

- Build only on the top face. Camera rotation changes the view, not the map or its rules.
- Show a placement grid while a tool is active. Hide it during simulation.
- Roads connect orthogonally. Each building has a clearly marked entrance that must touch a road.
- A usable building must connect through roads to the village entrance. Residents can walk within building grounds to perform jobs, but roads provide travel between sites.
- Obstacles and overlapping footprints prevent placement. Rotating a building changes its entrance position.
- Show a ghost preview, cost, and access feedback before confirming a placement.

### Budget

Every purchase immediately reduces the remaining budget. Moving an existing object is free during planning. Removing it refunds its full purchase price. Undo restores both placement and money. No purchase may make the balance negative.

| Tool | Illustrative cost | Included function |
| --- | ---: | --- |
| Road tile | 1 | A walkable connection. |
| Home | 10 | Space for one two-adult household, a pantry, and water storage. |
| Field | 14 | A mixed crop plot, tools, a small food shelter, and a watering buffer. |
| Well | 8 | A replenishing water source with a finite reserve and collection point. |

For example, three homes, two fields, one well, and fourteen purchased road tiles cost exactly 80 coins. This demonstrates the budget only; it is not a tested winning layout. Road tiles already supplied by the level are free.

These prices intentionally match the scale of the concept art and remain adjustable. Production, storage, and carrying rates must be balanced with them.

### Before Go

Warn about disconnected buildings, missing fields, and missing wells. Highlight the affected objects in the world. Allow an imperfect layout to run so the player can learn from its consequences.

Disable Go only when the layout is invalid or has no home reachable from the village entrance. A disconnected home remains empty; a disconnected field or well cannot be used.

The player may start with money remaining. There is no requirement to spend down to zero.

## 4. What happens when Go is pressed

Save the starting layout, level conditions, and simulation seed. Hide construction tools and the grid. Lock purchases, movement, and demolition for the duration of the run.

One household of two adults arrives for each connected home. Arrival is visible at the village entrance. A home's supplies and consumption begin when its household reaches it.

Each arriving household brings a modest starting food supply and a short water reserve. Proposed targets are ten days of food and two days of water. The first healthy harvest must occur before those food supplies expire. Starting supplies are a one-time arrival provision; they do not refill each season.

No new households arrive later in the first version. A home whose residents leave stays vacant until the player starts a new run.

Money stops being part of the active simulation. There are no taxes, wages, or automatic construction funds to manage during playback.

## 5. Autonomous residents and work

Every adult can carry out the basic jobs. The player does not assign individual workers.

| Activity | Visible behaviour | Actual effect |
| --- | --- | --- |
| Collect household water | Walk to a well, fill a vessel, carry it home. | Transfers water into the home's reserve. |
| Water crops | Collect water and take it to a field. | Replenishes the field's watering buffer. |
| Tend a field | Work among planted rows with tools. | Supplies the labour needed for healthy growth. |
| Harvest | Gather mature crops into baskets. | Moves grown food into that field's shelter. |
| Deliver food | Carry food from a field shelter to a home. | Replenishes the household pantry. |
| Rest and socialise | Sit, greet neighbours, or shelter from rain. | Adds daily life when necessary work permits. |

Workers choose reachable tasks using urgency and estimated travel time. Keeping households above emergency reserves takes priority, followed by urgent crop care or harvests, then routine stocking and tending. Low-priority work should begin early enough to avoid creating emergencies.

Workers reserve tasks when they accept them so the whole town does not chase one delivery. Assignment must also prevent one household from hoarding all available supplies while another goes without. Reconsider a job if its destination becomes unavailable; do not constantly interrupt a person who is already making a useful delivery.

Carried loads are finite. Residents spend real simulation time walking and working. Supplies change location at collection and delivery, including a carried state between them. Speeding up playback changes how quickly the player sees this happen, not how much a resident can accomplish per simulation day.

Daily routines should include quieter periods, with emergency collection still possible. Social animation must not be the hidden reason a viable town fails.

## 6. Water

Wells hold a finite volume of water and replenish according to the level's water conditions and weather. Dry weather reduces replenishment. A well is useful because people can collect from it; placing it within a decorative radius does not automatically supply anything.

Households use stored water regularly. Fields lose moisture through time and weather. Rain replenishes soil moisture and helps well reserves; it does not automatically fill every household's containers.

Workers carry water from wells into home storage or field buffers. Well capacity, collection time, carrying load, and travel distance limit delivery. A field can therefore suffer despite a well having water, if the journey is too long or too few workers are available.

Crop response is gradual:

1. Adequate moisture supports normal growth.
2. Low moisture slows growth and produces visible wilting.
3. Sustained severe dryness kills the current crop and removes its expected harvest.

A dead crop does not destroy the field. Residents can clear and replant it during a suitable growing season if water and labour recover. Basic seed and tool use is included in field work; it is not a separate resource system in the first version.

Use visible well levels, full or empty vessels, soil colour, and crop posture to communicate water conditions.

## 7. Food, fields, and winter reserves

Fields contain mixed crops with several growing cycles across spring, summer, and autumn. They are not limited to a single annual grain harvest. Growth requires suitable weather, adequate moisture, and periodic tending.

Mature crops must be harvested. Food first enters the field shelter and then travels to household pantries in carried loads. Food still in a field cannot feed a household until someone delivers it.

Both field shelters and household pantries have finite capacity. Show stored food through baskets, sacks, and stocked shelves. For the initial version, harvested food keeps for the length of the run; detailed spoilage is deferred.

Winter stops crop growth and prevents new planting. Residents continue collecting water and distributing stored food. Home pantry capacity must exceed a full winter's consumption plus the introductory goal's three-day reserve. Home water storage must also comfortably exceed the three-day goal, but can be smaller than food storage because wells continue to function through winter.

Tune harvest timing and yield so an efficiently supplied introductory town can build winter reserves with a reasonable margin. A layout with too many residents, too little field capacity, or excessive travel should fall short for a visible reason.

Food production rates, well replenishment, carrying capacity, and task durations are deliberately not fixed by this document. They must be tuned together using the validation scenarios below.

## 8. Households, shortages, and abandonment

Homes show a small sequence of understandable states:

| State | Cause | World feedback |
| --- | --- | --- |
| Settled | Basic needs are being met. | Normal routines, tended surroundings, and active windows. |
| Strained | Food or water reserves are low, or a shortage has begun. | Urgent collection trips, fewer leisure activities, and sparse stores. |
| Preparing to leave | A serious shortage has lasted beyond a grace period. | Packed belongings and worried activity around the home. |
| Abandoned | The household has left the village. | Closed shutters, no household activity, and gradual neglect. |

The grace period must be long enough to notice and inspect the problem. Water shortages should become urgent sooner than food shortages. A home with an empty buffer does not become abandoned in the same instant.

Delivering the missing resource before departure lets the household recover. Once residents depart, remove them from the workforce and stop that home's consumption. Their absence may increase pressure on the remaining residents.

Show a brief, restrained explanation at significant moments, such as “Household leaving: water unavailable.” Inspecting the home should distinguish an empty source from a source that nobody could reach or service in time.

Collapse is expressed through failed crops, empty stores, departures, and quiet streets. Character death is not required for the first version.

## 9. Weather and seasons

| Season | Simulation role | Visible character |
| --- | --- | --- |
| Spring | Establish crops and routines; rainfall supports recovery. | Fresh planting, wet soil, soft light, and showers. |
| Summer | Increase evaporation and pressure on water delivery. | Bright light, dry ground, busy work, and possible heat haze. |
| Autumn | Complete final harvests and prepare food reserves. | Harvest activity, stocked shelters, warmer colours, and more rain. |
| Winter | Stop crop growth and consume stored food. | Dormant fields, cold rain, quiet outdoor activity, and warm windows. |

The Mediterranean introductory level can have a wet winter without snow. Snow and freezing wells would introduce extra rules and are deferred.

The level brief describes the broad challenge, such as a dry summer. The introductory weather sequence must not make a sensible layout fail through an unavoidable event. Use the same sequence on retries so changing the plan produces a meaningful comparison.

Rain, lighting, and seasonal transitions should change gradually. Day/night lighting may support daily routines, but the whole scene must remain readable.

## 10. Playback and inspection

Keep a compact playback strip and a small season/weather display visible. Construction tools, persistent resource dashboards, and population management panels stay off the running screen.

| Control | Required behaviour |
| --- | --- |
| Pause / Play | Freeze or resume the entire simulation, including residents, weather progression, and resource use. |
| 1× / 4× | Change presentation speed while preserving identical simulated outcomes. Other speeds can be added later. |
| Rewind / scrub | Move backward through recorded history and restore the corresponding town state. |
| Camera rotation | Rotate around the vertical axis without flipping onto another playable face. |
| Inspect | Select a resident or building to see a small contextual detail card. |
| Return to planning | Restore the editable starting layout and original budget accounting for a new attempt. |

The timeline covers only time already simulated. At a rewound point, pressing Play replays recorded history until it reaches the latest simulated moment, then continues the live simulation. Rewinding does not change decisions or branch history.

Restored state includes positions, carried items, jobs, stores, crop growth, household conditions, weather, and event history. Repeated scrubbing must never duplicate supplies, people, or rewards.

Changes to the town happen only after returning to planning. Starting a new attempt resets to the beginning under the same level conditions; it does not preserve the previous run's harvest or remaining residents.

During planning, offer an explicit way to reset the layout. During a run, returning to planning should retain the player's arrangement for editing. Unchanged objects keep their original costs, so the budget remains correct.

### Inspection without clutter

Clicking a person reveals a simple description such as “Taking water to Field 2.” Clicking a building shows its access, supplies, current problem, and recent relevant event. A selected route may be highlighted temporarily.

Use optional timeline markers for important events: first harvest, first missed delivery, crop loss, or a departing household. Hide events that lie ahead of the selected playback time. Ordinary routines need no notification.

## 11. Success, incomplete goals, and collapse

At the end of the first winter, pause and evaluate the level's disclosed objective using the actual simulation state. For the proposed introductory level, at least three homes must be occupied and each occupied home must contain at least three days of food and water at current consumption rates.

If some residents survive but the objective is missed, finish with an unmet-goal result. Do not label every struggling town a total collapse. If all residents leave earlier, end the run as a collapse after showing their departure.

Keep the town, camera, inspection, and recorded timeline available on the result screen. Show a short outcome explanation and a few relevant facts, such as occupied homes, household reserves, and the first sustained shortage. Give the player a clear **Revise layout** action.

Do not declare failure because a temporary deficit is predicted while recovery is still possible. Do not declare success early merely because summer supplies look healthy.

## 12. Level progression

Introduce one main pressure at a time while retaining the same four tools:

1. **First settlement:** generous terrain and dependable water teach routines and winter storage.
2. **Dry summer:** reduced replenishment rewards short water routes and adequate supply.
3. **Awkward terrain:** an obstacle makes road placement and building entrances matter.
4. **Tight budget:** competing household and reserve targets require a more efficient plan.

Each level should support several successful arrangements. Exact prices, terrain dimensions, and weather severity remain tuning variables.

## 13. Required validation before calling the design playable

These are test scenarios to run against an implementation, not claims of completed testing.

| Scenario | Required result |
| --- | --- |
| Spend, undo, move, and remove during planning | The budget remains correct and never becomes negative. |
| Start with money left over | Go works when there is a reachable home and the layout is valid. |
| Isolate a field or well | It provides no supplies; access warnings explain why. |
| Run a compact, adequately supplied town | It can meet the introductory goal through winter. |
| Run several different sensible layouts | More than one arrangement succeeds. |
| Omit all wells | Initial reserves run down, crops and households show stress, then residents leave if the shortage persists. |
| Put a water source far from demand | Delivery delays and labour use worsen measurably; sufficient extra capacity can still compensate. |
| Add homes without enough food production | Initial activity increases, then a visible food shortage develops. |
| Interrupt adequate crop care | Growth slows or the crop dies; food output follows the actual crop state. |
| Restore supply before a household departs | The household recovers; abandonment is not instantaneous. |
| Enter winter with and without reserves | Preparation changes survival while winter crop growth remains stopped. |
| Compare 1×, 4×, and pause/resume | Identical layouts and seeds produce the same state at matching simulation times. |
| Rewind through collection, harvest, and departure | Positions, inventories, crops, population, and later replay remain consistent. |
| Return to planning and replay unchanged | The same weather and layout reproduce the same outcome without duplicated starting supplies. |

Use observation sessions to test enjoyment separately from mechanical correctness:

- Can a new player explain what a selected resident is doing?
- Can they recognise low water or food from the scene before needing a large dashboard?
- After a failure, can they identify a cause and suggest a useful change?
- Do they enjoy watching a healthy town, including ordinary work and quiet moments?
- Does fast-forward shorten waiting without making daily life unreadable?
- Does rewind help them understand events, and do they want another attempt?

Record where people become confused or disengaged. Adjust task timing, visual feedback, route costs, or scenario difficulty in response. Automated correctness checks cannot establish whether the game is enjoyable.

## 14. First playable boundary

Build one complete end-to-end level containing planning, a fixed budget, the four placeables, connected walking routes, visible resource carrying, crop growth, seasonal weather, household departure, outcome evaluation, and pause/fast-forward/rewind.

Simplified internal models are acceptable, but the visible world must accurately represent their state. The intended finished presentation remains the high-fidelity diorama established by the concept art.

Earlier monthly-turn mechanics are historical reference. This version has no Advance Month button, routine construction during a run, or automatic service delivery based solely on radius. These revised rules require their own implementation and validation.
