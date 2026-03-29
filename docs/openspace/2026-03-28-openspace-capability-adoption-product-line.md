# OpenSpace Capability Adoption Product Line

## Purpose

Define how `nion` should absorb the best ideas from `OpenSpace` without copying the wrong abstractions.

This document answers:

- what we should learn from OpenSpace
- what we should copy directly
- what we should only reference at the logic level
- what conflicts with `nion`'s architecture
- why each capability matters
- what user problems it solves
- what new capabilities it unlocks
- what milestones should sequence the work

This is a product-line document, not an implementation spec.

## Executive Summary

OpenSpace's real contribution is not "another agent shell". Its real contribution is a **reusable execution artifact lifecycle**:

- retrieve prior successful patterns
- apply them during execution
- analyze completed work
- evolve the reusable artifact
- track lineage and quality
- share the artifact to other agents later

`nion` should absorb this as a **new product line** that sits beside the existing thread runtime, not inside notebook, memory, or generic skill CRUD.

The right direction is:

1. **start with retrieval-first reuse**
2. **then add reviewed artifact evolution**
3. **later add guarded sharing and activation**

The wrong direction is:

- rewriting `nion` into an OpenSpace clone
- calling subagent orchestration "collective intelligence"
- enabling artifact auto-import or auto-activation without stronger trust controls

## Product Thesis

`nion` today is strong at:

- thread execution
- multi-agent delegation
- diagnostics and control plane
- memory and notebook boundary discipline

What `nion` lacks is a durable layer that turns repeated work into reusable leverage.

The new product line should make users feel:

- "Nion remembers how we solved this class of problem"
- "The system is getting better from prior work, not just remembering chat history"
- "I can inspect and trust what it is reusing"
- "Shared patterns help future runs without polluting notebook or long-term memory"

## Product Line Name

Recommended internal product line:

**Adaptive Execution Intelligence**

Recommended product framing:

- **Execution Reuse**
- **Artifact Evolution**
- **Shared Learnings**

Avoid using `collective intelligence` as the primary external label unless we later build stronger multi-agent shared-state semantics.

## User Problems We Are Solving

### 1. Repeated Work Stays Expensive

Today a user can solve the same class of task multiple times and still pay most of the reasoning cost again.

Desired change:

- later runs become cheaper and more reliable because prior execution patterns are reusable

### 2. Good Execution Patterns Disappear

Today a successful thread may end with no durable reusable output other than a transcript, an artifact file, or a memory side effect.

Desired change:

- successful execution patterns become inspectable reusable assets

### 3. Agent Improvement Is Not Operationalized

Today `nion` can run, diagnose, and explain, but it has limited machinery to systematically improve future runs from past success and failure.

Desired change:

- post-run analysis generates reusable candidates, quality signals, and later evolution paths

### 4. Teams Cannot Reliably Share "What Worked"

Today cross-run and cross-user learning is mostly social or manual.

Desired change:

- successful reusable artifacts can later be ranked, inspected, and optionally shared at workspace or team scope

## Product Boundaries

This product line must stay separate from:

### 1. Notebook

Notebook is user-owned knowledge space.

This product line is not notebook authoring.

### 2. User / Agent Memory

Memory stores facts, preferences, and continuity.

This product line stores reusable execution patterns and their quality history.

### 3. Runtime Diagnostics

Diagnostics explain what happened during one run.

This product line decides what reusable pattern deserves to live beyond the run.

## Core Objects

### Reusable Artifact

A reusable execution pattern extracted from prior successful or instructive work.

Possible forms:

- prompt guidance fragment
- tool-sequencing recipe
- task decomposition pattern
- recovery pattern
- output-shaping template

### Artifact Record

Persistent record containing:

- artifact id
- title / summary
- scope
- source runs
- lineage
- quality counters
- trust status
- activation status

### Artifact Analysis

Post-run judgment connecting one thread or delegated task to:

- candidate artifacts
- observed wins/failures
- supporting evidence
- suggested improvement action

### Artifact Lineage

Graph of:

- imported
- captured
- derived
- fixed

### Artifact Activation Policy

Policy that determines whether an artifact:

- is only stored
- can be retrieved
- can be suggested
- can be enabled automatically

## Product Line Surfaces

### Surface A: Reuse Layer

Use prior artifacts in future runs.

Primary user value:

- lower cost
- faster completion
- more consistent execution

### Surface B: Evolution Layer

Analyze runs and improve artifacts over time.

Primary user value:

- reduced repetition of known failures
- improved quality of reused patterns

### Surface C: Sharing Layer

Share validated artifacts across workspace/team scopes.

Primary user value:

- one person's win becomes future team leverage

## Capability Adoption Matrix

| OpenSpace Capability | What It Really Is | User Value For Nion | Need Level | Adoption Type | Recommendation | Why |
| --- | --- | --- | --- | --- | --- | --- |
| Skill retrieval before execution | Search + rank reusable instructions | Reduces repeated reasoning and tool drift | High | Reference logic + partial direct port | Adopt in Phase 1 | Highest ROI, lowest trust risk |
| Post-execution analysis | Analyze completed runs for reusable patterns | Turns runs into durable leverage | High | Reference logic | Adopt in Phase 1 | Needed for any real improvement loop |
| Skill lineage DAG | Versioned artifact ancestry | Trust, inspection, rollback, explainability | High | Reference logic + partial API pattern port | Adopt in Phase 2 | Essential before mutation |
| Execution-derived quality counters | Applied/completion/effective/fallback rates | Mechanical ranking and governance | High | Direct concept port | Adopt in Phase 1 | Needed for ranking and review |
| Dashboard lineage/workflow views | Operator surface over evolving artifacts | Makes system inspectable and operable | Medium | UI/API pattern reference | Adopt in Phase 2 | Important once artifacts exist |
| Tool degradation trigger | Detect tool regressions and evolve dependent artifacts | Hardens long-term reliability | Medium | Reference logic | Adopt in Phase 2 | Useful after artifact store exists |
| Metric monitor trigger | Periodic health scan of artifacts | Avoids silent decay | Medium | Reference logic | Adopt in Phase 2 | Useful after enough data exists |
| Cloud skill upload/download | Artifact distribution network | Workspace/team leverage | Medium | Reference logic, not direct port initially | Adopt in Phase 3 | Valuable later, high governance cost |
| Auto-import top public skills | Pull remote artifacts automatically | Convenience | Low | Reject as-is | Reject | Too risky for `nion` trust model |
| "Collective intelligence" framing | Shared artifact network effects | Marketing value only if precise | Medium | Product framing adaptation | Adapt wording | Avoid overclaiming |
| Automatic artifact mutation | Generate updated reusable assets | Long-term compounding improvement | Medium | Reference logic, not direct port | Adopt later with review | Too risky for phase 1 |

## What We Can Copy Directly

These are the pieces that are close enough to our system shape that we can largely port the implementation pattern, and in some cases lift code with adaptation.

### 1. Token Tracking By Call Source

Source:

- `gdpval_bench/token_tracker.py`

Why it is copyable:

- This is infrastructure logic, not a product-shape dependency
- It cleanly separates agent work from artifact-system overhead

What it gives us:

- believable token-efficiency measurement
- per-subsystem cost attribution
- better benchmark quality

Use in `nion`:

- tag calls as `lead_agent`, `subagent`, `artifact_retrieval`, `artifact_analysis`, `artifact_evolver`

### 2. Lineage Graph API Pattern

Source:

- `openspace/dashboard_server.py::_build_lineage_payload`

Why it is copyable:

- It is a straightforward graph serialization pattern
- It does not force OpenSpace's runtime model onto us

What it gives us:

- inspectable artifact ancestry
- future UI for diff/rollback/review

Use in `nion`:

- expose artifact graph nodes/edges through existing control-plane APIs

### 3. Validation Scaffolding Pattern

Source:

- `openspace/skill_engine/skill_utils.py::validate_skill_dir`
- `nion/skills/validation.py`

Why it is copyable:

- We already have compatible validation conventions

What it gives us:

- bounded structural validation before activation

Use in `nion`:

- validate artifact schema, metadata, trust state, and any generated payload before retrieval/activation

### 4. Two-Phase Benchmark Pattern

Source:

- `gdpval_bench/README.md`
- `gdpval_bench/run_benchmark.py`

Why it is copyable:

- It is experimental design, not UI or agent identity

What it gives us:

- credible proof of reuse value

Use in `nion`:

- benchmark related task families in cold-start vs warm-start conditions

## What We Should Only Reference At The Logic Level

These ideas are useful, but the code should not be copied directly because the abstraction layer is mismatched.

### 1. Skill Engine Core

Source:

- `openspace/skill_engine/evolver.py`
- `openspace/skill_engine/store.py`
- `openspace/skill_engine/types.py`

Why not direct-copy:

- OpenSpace centers the product on `SKILL.md`
- `nion` should center this line on a broader `reusable artifact` model

What to borrow:

- trigger taxonomy
- lineage semantics
- quality counters
- reviewed evolution loop

### 2. MCP Host-Skill Integration

Source:

- `openspace/mcp_server.py`
- `openspace/host_skills/*`

Why not direct-copy:

- `nion` is not trying to be a backend for Claude/Codex/OpenClaw first
- our primary product is still our own thread/runtime shell

What to borrow:

- narrow subsystem boundary
- clear ownership split between orchestrator and artifact engine

### 3. Cloud Sharing Workflow

Source:

- `openspace/cloud/client.py`

Why not direct-copy:

- our governance model must be tighter
- our scopes should likely be workspace/team/channel aware

What to borrow:

- staged artifact packaging
- lineage-aware metadata
- import/export abstraction

## What Conflicts With Nion

### 1. OpenSpace's System Center

Conflict:

- OpenSpace is skill-centric
- `nion` is thread-runtime-centric

Why this matters:

- if we directly import the OpenSpace mental model, we will destabilize the clarity of `nion`'s core product

Decision:

- keep `nion` thread-centric
- add artifact evolution as a sibling subsystem

### 2. Shallow Trust Model

Conflict:

- OpenSpace's safety blocking is relatively narrow
- `nion` already has stronger expectations around control plane, diagnostics, and user trust

Decision:

- no auto-import of public artifacts
- no blind activation
- review and policy gates first

### 3. Inflated Terminology

Conflict:

- OpenSpace uses language that implies stronger shared cognition than the code supports

Decision:

- do not market reuse/network effects as collective cognition unless we build real semantics for that

### 4. Mixing Artifact Reuse With Memory Or Notebook

Conflict:

- `nion` already has carefully separated notebook, memory, and runtime spaces

Decision:

- reusable artifacts must become a separate domain model

## Why This Product Line Is Necessary

Without it, `nion` has three structural limits:

- it executes well but compounds weakly across repeated work
- successful task patterns remain trapped in transcripts and operator memory
- token/cost efficiency has no durable mechanism besides prompt/runtime tuning

With it, `nion` gains:

- cross-run leverage
- reusable task intelligence
- inspectable improvement loops
- a believable story for long-term efficiency improvement

## What New Capability This Unlocks

### Near-Term

- retrieval of proven execution patterns into future runs
- lower cost on repeated task families
- more consistent task decomposition and recovery

### Mid-Term

- reviewed evolution of reusable artifacts
- artifact quality ranking
- workspace-level shared best practices

### Long-Term

- team-level execution intelligence network
- adaptive orchestration policies
- artifact-aware benchmark suite
- safer semi-automatic activation for mature artifact classes

## Proposed Product Architecture

### Phase 1: Execution Reuse

Product goal:

- make prior successful work reusable in later runs

User-facing change:

- `nion` begins surfacing and applying ranked reusable execution artifacts during task execution

Scope:

- post-run candidate extraction
- artifact store
- quality counters
- retrieval into lead-agent prompt/context
- inspectable artifact list

Do not include:

- auto-mutation
- team sharing
- cloud sync

Success criteria:

- measurable reuse rate
- measurable warm-start improvement on repeated task sets
- no trust regressions

### Phase 2: Reviewed Artifact Evolution

Product goal:

- let the system improve reusable artifacts without losing operator trust

User-facing change:

- `nion` can suggest fixed/derived/captured artifact updates and show diffs, lineage, and evidence

Scope:

- suggestion-first evolution
- review queue
- lineage graph
- activation toggle
- rollback
- tool-regression and metric-health triggers

Do not include:

- blind auto-activation
- public sharing

Success criteria:

- approved artifact changes improve later-run success/cost
- rollback remains simple
- low false-positive suggestion rate

### Phase 3: Shared Learnings

Product goal:

- move from single-user reuse to workspace/team execution leverage

User-facing change:

- validated reusable artifacts can be shared across bounded scopes

Scope:

- workspace/team scoped exchange
- provenance and trust policy
- artifact import/export
- ranking with local override

Do not include:

- uncontrolled global public ingestion by default

Success criteria:

- shared artifacts are reused across users or agents
- trust policy prevents contamination
- imported artifacts outperform cold-start baselines

## Milestones

### Milestone 0: Measurement Foundation

Timeline:

- 1 sprint

Deliverables:

- source-tagged token tracker
- repeated-task benchmark harness
- baseline dashboard metrics for reuse experiments

Why it matters:

- without this, later wins cannot be proven

### Milestone 1: Artifact Capture MVP

Timeline:

- 1-2 sprints

Deliverables:

- post-run candidate extraction
- artifact store schema
- artifact list view
- prompt injection for top-ranked artifacts

Solved problems:

- repeated work no longer always starts from zero
- useful patterns stop disappearing

### Milestone 2: Artifact Quality and Control Plane

Timeline:

- 1 sprint

Deliverables:

- applied/effective/fallback counters
- control-plane endpoints for artifact diagnostics
- artifact inspection panel

Solved problems:

- operators can trust and inspect what is being reused

### Milestone 3: Reviewed Evolution

Timeline:

- 2 sprints

Deliverables:

- fix/derive/capture suggestion engine
- review queue
- lineage and diff views
- rollback

Solved problems:

- `nion` can improve reusable patterns instead of only storing them

### Milestone 4: Workspace-Scoped Sharing

Timeline:

- 2 sprints

Deliverables:

- artifact export/import
- workspace/team visibility rules
- trust policy and approval flows

Solved problems:

- good execution patterns become team leverage

### Milestone 5: Guarded Auto-Activation

Timeline:

- after sufficient quality data

Deliverables:

- policy-based automatic enablement for a narrow, proven subset of artifacts
- confidence thresholds
- automatic rollback triggers

Solved problems:

- repeated operational work becomes cheaper without heavy manual curation

## Success Metrics

### Product Metrics

- artifact retrieval usefulness rate
- artifact-assisted completion rate
- warm-start vs cold-start token delta
- warm-start vs cold-start success delta
- artifact review approval rate
- artifact rollback rate

### Trust Metrics

- imported artifact rejection rate
- false-positive evolution suggestion rate
- activation reversals
- user/operator confidence feedback

### Ecosystem Metrics

- cross-workspace reuse count
- average time-to-value for new artifacts
- number of validated artifact families with positive ROI

## Final Recommendation

### Adopt

- reusable artifact lifecycle
- post-run analysis
- quality-based ranking
- lineage-aware persistence
- warm-start reuse benchmarking

### Adapt

- skill engine into artifact engine
- collective intelligence into shared learnings
- OpenSpace dashboard ideas into `nion` control-plane surfaces
- cloud sharing into workspace/team-scoped exchange

### Reject

- blind auto-import
- shallow trust gating
- inflated terminology
- forcing `nion` to become skill-centric at the expense of its thread/runtime identity

## One-Line Verdict

`nion` should not become OpenSpace, but it should absolutely grow an OpenSpace-inspired **adaptive execution artifact layer** on top of its existing runtime. That is the shortest path to making repeated work cheaper, more reliable, and more shareable without breaking the product's current center of gravity.
