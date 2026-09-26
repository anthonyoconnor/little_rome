# Little Rome development rules

These rules apply to all development in this repository. Use
[the overview](little-rome-overview.md) and [the gameplay specification](little-rome-gameplay.md)
for game design. The workflow below supersedes conflicting process guidance in
design documents or project skills, including required human playtesting or
manual validation.

## Milestones

- Create and update `development-plan.md` as needed to keep meaningful progress
  moving. Plan the next useful milestones without requiring a complete roadmap.
- Give each milestone an ID, a concrete playable or technical outcome, a status,
  and a short set of completion criteria that can be checked automatically.
- Keep milestones small enough to implement and verify quickly. Split or revise
  them when new information makes a smaller next step more useful.
- Mark a milestone complete only when its outcome works, the relevant automated
  checks pass, and any required progress screenshot has been recorded.

## Git checkpoints

- Commit changes in logical groups of progress and at the end of each milestone.
  Do not leave completed milestones bundled into one large future commit.
- Include the related implementation, documentation, targeted tests, and progress
  screenshot in the same checkpoint when applicable.
- Use descriptive commit messages that explain the resulting change. Stage only
  files belonging to that checkpoint and preserve unrelated work.

## Development speed

- Prioritize development speed and a working game over production hardening.
- Choose the simplest implementation that supports the current milestone. Defer
  speculative abstractions, exhaustive edge cases, infrastructure, and unrelated
  refactoring until they solve a demonstrated development or gameplay problem.
- Fix faults that block play, automation, or the current milestone. Keep deferred
  work in brief notes rather than letting it expand the current task.

## Automated testing is required

- No human testing will be carried out. Do not depend on the user to launch the
  game, click through a flow, assess a screenshot, or approve a manual test result.
- Establish a scriptable test path with the first runnable game and maintain it
  as features are added. Document commands for starting the game, running focused
  checks, and capturing screenshots.
- Keep simulation logic runnable without rendering where practical. Support
  repeatable scenarios, controlled randomness, state inspection, reset, and fast
  simulation advancement so checks need no real-time gameplay waits.
- Use automated browser interactions for relevant player flows and rendering
  checks. Capture the actual running game and inspect the results as part of the
  development work; screenshots complement assertions about game behavior.
- Report failures and unverified behavior honestly. Resolve checks needed for the
  current outcome before calling it complete.

## Keep validation fast and targeted

- Run the smallest set of checks that can verify the change. Prefer focused
  simulation tests for rules and a short browser smoke test for affected UI flows.
- Tests must help development move faster. Avoid redundant assertions, broad
  coverage targets, and tests that merely repeat implementation details.
- Do not run long or exhaustive suites on every edit or commit. Broaden checks
  only when the affected systems, a failure, or an unresolved concern justify it.
- Aim for checks that finish in seconds. Use bounded timeouts, deterministic
  state advancement, and readiness signals instead of arbitrary sleeps. Split or
  optimize slow checks so development never routinely waits on a large test suite.

## Progress screenshots

- Record progress whenever a major game change occurs or a major milestone is
  completed. Save exactly one representative screenshot for each such iteration
  in `./progress`. If both triggers occur together, they share one screenshot.
- Name screenshots `0001.png`, `0002.png`, `0003.png`, and so on. Use the next
  unused number after the highest existing number across the whole project;
  never restart numbering, renumber history, or overwrite an earlier iteration.
- Capture the actual rendered game through automation after the scene is ready.
  Choose a view that demonstrates the change, keeping the scenario, camera, and
  viewport consistent between iterations when useful for comparison.
- Keep only the selected screenshot for that iteration in `./progress`. Store
  temporary captures elsewhere. Concept art and generated mockups are not progress
  screenshots.
- Add one entry to [the progress index](progress/README.md) with the screenshot
  number, milestone or major change, and the scenario or command used to capture
  it. Commit the screenshot and index with the corresponding progress checkpoint.
- Documentation-only changes do not require a game screenshot. Begin screenshot
  history with the first runnable visual milestone; never fabricate a capture
  when there is no running game.
