# OpenSpace Progress

## Current Focus

- Active wave: `Wave 0`
- Active milestone: `Measurement Foundation`
- Current lane: `Source-tagged token tracker`

## Planned Sequence

| Wave | Goal | Status | Notes |
| --- | --- | --- | --- |
| Wave 0 | Prove economics: source-tagged token tracker + cold/warm benchmark | planned | Start here |
| Wave 1 | Reuse without mutation: capture, store, retrieval, quality counters | planned | Only after Wave 0 evidence |
| Wave 2 | Inspectability and governance: diagnostics, UI, reviewed evolution, lineage | planned | Depends on Wave 1 usefulness |
| Wave 3 | Workspace sharing and health triggers | planned | Depends on Wave 2 stability |
| Wave 4 | Guarded automation and broader exchange | planned | Last |

## Next Actions

- Decide the first stable source vocabulary for `nion`
- Persist or expose attribution results in a benchmark-friendly form
- Design the next Wave 0 slice: cold/warm benchmark harness

## Blockers

- None recorded yet

## Success Criteria For Current Lane

- We can record token usage by source category, not only per thread total
- At minimum, the first implementation distinguishes `lead_agent`, `subagent`, and `background/helper` style calls
- Existing `usage_metadata` passthrough and thread-level token UI remain intact

## Latest Evidence

- Added a minimal source-tagged token callback module
- Injected the callback into `create_chat_model()`
- Verified isolated backend tests pass for callback aggregation and factory injection
- Added token source contexts for title generation, memory update, CLI tool description, lead-agent runs, and subagent runs
- Verified the current Wave 0 slice with focused backend tests

## Update Rule

- Update this file whenever scope, wave, milestone, or blocker changes.
