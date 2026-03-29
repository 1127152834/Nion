# OpenSpace-Inspired Upgrade Impact Matrix

## Purpose

This matrix is the scheduling companion to the product-line blueprint.

It is optimized for one decision:

**which upgrades should `nion` do first, given impact range, refactor cost, and product value?**

Use it to plan rollout rhythm, not to define implementation details.

## Reading Guide

- `Impact Scope`: which parts of the current system are touched
- `Refactor Needed`: whether this is additive or requires structural rework
- `Implementation Goal`: what the upgrade is supposed to create
- `Current State -> Upgraded State`: what changes in user or operator experience
- `Why It Matters`: what problem it solves
- `Unlocks Next`: what it enables later

## Upgrade Matrix

| Upgrade Plan | Impact Scope | Refactor Needed | Implementation Goal | Current State -> Upgraded State | Why It Matters | Unlocks Next | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Source-tagged token tracker | `backend/packages/harness/nion/models/*`, selected model call sites, optional telemetry writes; no frontend required for v1 | `No` - additive | Distinguish lead-agent, subagent, retrieval, analysis, evolver token cost | Today we only have thread-level total token display -> after upgrade we can attribute cost by subsystem | Lets us know whether reuse features save cost or just move cost elsewhere | credible benchmark, artifact ROI analysis, subsystem cost dashboards | P0 |
| Cold-start / warm-start benchmark harness | benchmark scripts, optional telemetry export, no runtime behavior change | `No` - additive | Measure whether reusable artifacts lower later-run cost and/or improve success | Today we can show token totals per thread -> after upgrade we can prove reuse value across task families | Prevents building a reuse system with no measurable payoff | go/no-go for artifact product line, regression gates | P0 |
| Post-run artifact candidate extraction | thread completion path, delegated task completion path, analysis module, new persistence layer | `Low` | Turn completed runs into candidate reusable artifacts with evidence | Today successful runs end as transcript + artifacts -> after upgrade they can yield reusable execution patterns | Stops useful patterns from dying in chat history | artifact store, retrieval, later evolution | P1 |
| Artifact store schema | new domain store and types, likely backend-only initially | `Moderate` - new subsystem, not broad refactor | Persist artifact record, source runs, quality counters, trust state, lineage placeholders | Today reusable patterns are implicit -> after upgrade they become queryable objects | Gives the system a durable memory for execution patterns | ranking, control-plane views, lineage | P1 |
| Retrieval injection into lead-agent prompt | `backend/packages/harness/nion/agents/lead_agent/prompt.py` plus retrieval service | `Low` | Retrieve top-ranked artifacts and inject them into future runs | Today prompt guidance comes from static enabled skills -> after upgrade it also includes dynamic reusable artifacts | First user-visible reuse benefit with relatively low risk | measurable warm-start gains, artifact usefulness metrics | P1 |
| Artifact quality counters | new store logic, run-analysis aggregation, possibly telemetry integration | `Low` | Track selected/used/succeeded/fallback style metrics for artifacts | Today we do not know if a reusable pattern actually helps -> after upgrade artifacts can be ranked mechanically | Prevents arbitrary artifact reuse and supports governance | review queue, automatic suggestions, dashboards | P1 |
| Artifact diagnostics in control plane | backend control-plane APIs, telemetry read paths, maybe desktop/web diagnostics surface | `Low` to `Moderate` | Make artifact health visible to operators | Today diagnostics explain runtime incidents only -> after upgrade they also explain reusable-artifact quality and provenance | Builds trust and debuggability | review UX, lineage UI, rollout safety | P2 |
| Artifact inspection UI | frontend workspace/diagnostics surface | `No` backend refactor; `Low` frontend addition | Let users inspect artifact details, evidence, counters, activation state | Today reusable logic is invisible -> after upgrade users can inspect what is being reused | Required for trust before any mutation or sharing | review flow, approval UX, artifact management | P2 |
| Reviewed artifact evolution engine | new backend subsystem for fix/derive/capture suggestions, diff generation, validation | `Moderate` | Suggest improved artifacts from past runs without blind activation | Today patterns can be captured but not improved systematically -> after upgrade artifacts can evolve with review | Creates real compounding improvement rather than just static reuse | lineage, rollback, governance, policy automation | P2 |
| Lineage graph + diff + rollback | new lineage model + UI/API serialization | `Moderate` | Make artifact history inspectable and reversible | Today no durable ancestry exists -> after upgrade every evolved artifact can be traced and reverted | Essential if artifacts can change over time | safe evolution, approval, auditability | P2 |
| Tool-regression and metric-health triggers | telemetry/quality manager + evolver integration | `Moderate` | Detect decaying artifacts and suggest fixes proactively | Today decay is discovered ad hoc -> after upgrade the system notices regressions | Increases long-term reliability of reuse | autonomous maintenance with guardrails | P3 |
| Workspace-scoped artifact sharing | new sharing API, policy model, UI, import/export flows | `High` | Share validated artifacts within workspace/team scope | Today reuse is single-system or manual -> after upgrade successful patterns become organizational leverage | Converts local wins into team productivity gains | team knowledge flywheel, cross-agent leverage | P3 |
| Public/community artifact exchange | packaging, provenance, trust, review, possibly external service | `High` | Exchange artifacts beyond a single workspace | Today there is no external artifact ecosystem -> after upgrade we could have one | Large upside, large trust/governance burden | ecosystem effects, partner integrations | P4 |
| Guarded auto-activation | policy engine, confidence thresholds, rollback triggers | `High` | Allow limited automatic activation for highly trusted artifact classes | Today all activation would be manual -> after upgrade proven artifact classes can self-apply | Lowers ongoing curation cost after trust is earned | mature adaptive system behavior | P4 |

## Refactor Interpretation

### `No`

Mostly additive:

- new module
- wrappers
- telemetry writes
- benchmark scripts

Should not require changing `nion`'s core runtime model.

### `Low`

Touches live execution surfaces, but as an extension:

- completion hooks
- prompt injection
- additional control-plane reads

Should not force redesign of thread runtime, notebook, or memory.

### `Moderate`

Introduces a real subsystem:

- new storage model
- lineage model
- review/evolution flows

Still compatible with current architecture, but needs careful boundaries.

### `High`

Changes trust model, governance model, or org-level workflow:

- sharing
- import/export
- automatic activation

These should be deferred until earlier metrics are positive.

## Recommended Upgrade Rhythm

### Wave 0: Prove The Economics

Do first:

- Source-tagged token tracker
- Cold/warm benchmark harness

Why:

- no product line should ship before we can measure whether it helps

### Wave 1: Get Reuse Without Mutation

Do second:

- Post-run artifact candidate extraction
- Artifact store schema
- Retrieval injection
- Artifact quality counters

Why:

- this is the highest-value, lowest-trust-risk slice
- it gives users visible benefit without changing artifacts automatically

### Wave 2: Make It Inspectable And Governable

Do third:

- Artifact diagnostics in control plane
- Artifact inspection UI
- Reviewed artifact evolution
- Lineage + diff + rollback

Why:

- once artifacts matter, they must become inspectable and reversible

### Wave 3: Expand Beyond The Single User

Do fourth:

- Tool/metric-based health triggers
- Workspace-scoped sharing

Why:

- only after local reuse and reviewed evolution are working should we let patterns spread

### Wave 4: Automate Carefully

Do last:

- Community exchange
- Guarded auto-activation

Why:

- these have the biggest blast radius
- they should only exist after trust, metrics, and rollback are proven

## Most Important Call

If you only pick **one** upgrade now, pick:

**Source-tagged token tracker + cold/warm benchmark harness**

If you pick **one product feature** after that, pick:

**Post-run artifact capture + retrieval injection**

That pairing gives the fastest path to answering:

1. does reuse help?
2. how much does it help?
3. is it worth deeper investment?

## Practical Notes For Scheduling

### Safe To Start Immediately

- Source-tagged token tracker
- Cold/warm benchmark harness

Reason:

- additive
- low regression risk
- no user trust exposure

### Safe After One Validation Cycle

- Artifact capture
- Artifact store
- Retrieval injection
- Quality counters

Reason:

- visible value
- still no automatic mutation

### Should Wait For Proven Metrics

- Reviewed evolution
- Sharing
- Auto-activation

Reason:

- these only make sense once retrieval reuse is shown to work

## One-Line Scheduling Advice

**Measure first, reuse second, inspect third, evolve fourth, share fifth, automate last.**
