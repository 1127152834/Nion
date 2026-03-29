# OpenSpace Capability Research

## Goal

Explain how `OpenSpace` implements its advertised capabilities in code, then derive what `nion` can realistically borrow as a LangGraph-driven agent runtime.

## Method

- Treat README claims as hypotheses, not conclusions.
- Prefer runtime entrypoints, storage models, prompts, and benchmark code over marketing copy.
- Use a variable number of related questions per iteration rather than a fixed quota.
- Every question block must end with a concrete implication for `nion`.

## Question Block Contract

A question block counts toward the run metric only when it contains all three sections:

- `#### Answer`
- `#### Evidence`
- `#### Nion Implication`

## Iteration 1: Capability Model and First-Class Object

### Q1. What is OpenSpace's true first-class unit of accumulation?

#### Answer

OpenSpace's first-class accumulated object is the `skill`, not the live agent, thread, or task. Tasks are the triggering context; skills are the durable asset that selection, analysis, evolution, lineage, dashboarding, and cloud sharing all revolve around.

#### Evidence

- `README.md` frames the system around skills that "select, apply, monitor, analyze, and evolve themselves".
- `openspace/skill_engine/types.py` defines `SkillRecord`, `SkillLineage`, `EvolutionSuggestion`, and `ExecutionAnalysis`, which together model skill quality and version history.
- `openspace/skill_engine/store.py` persists `skill_records`, `skill_lineage_parents`, `execution_analyses`, `skill_judgments`, and tool dependencies in `.openspace/openspace.db`.
- `openspace/dashboard_server.py` exposes overview, skill stats, lineage, source, and workflow endpoints, again centering the system around skill records and lineage.

#### Nion Implication

`nion` should decide explicitly what its reusable unit is. Today its center of gravity is the thread and delegated task runtime, not a durable evolving skill object. If `nion` wants OpenSpace-like accumulation, it likely needs a first-class reusable artifact model separate from thread memory and task telemetry.

### Q2. Where are the advertised capabilities actually wired into the runtime?

#### Answer

The advertised capabilities are wired into a staged execution pipeline: skill selection, skill-guided execution, fallback execution, post-run analysis, and evolution triggers. OpenSpace is not merely a skill library; it is a pipeline that keeps routing execution back through skill-state updates.

#### Evidence

- `openspace/dashboard_server.py` defines pipeline stages: `initialize`, `select-skills`, `phase-1-skill`, `phase-2-fallback`, `analysis`, and `evolution`.
- `openspace/mcp_server.py` documents `execute_task` as: register skills, search skills, execute with skills, fallback to pure tools, then auto-analyze and auto-evolve.
- `openspace/tool_layer.py` implements `_maybe_analyze_execution()` and `_maybe_evolve_quality()`, connecting the main runtime to analysis and background evolution triggers.

#### Nion Implication

If `nion` wants similar capabilities, it should not bolt them onto prompts alone. It needs a clear post-run lifecycle hook after thread completion and delegated task completion, where analysis and reusable-artifact updates happen as part of the runtime contract.

### Q3. Does OpenSpace's "collective agent intelligence" mean live multi-agent coordination?

#### Answer

Not primarily. In the code currently visible, "collective intelligence" mostly means asynchronous sharing of evolved skills through a cloud/local registry, not live coordination among many agents inside one shared task graph.

#### Evidence

- `openspace/host_skills/delegate-task/SKILL.md` teaches host agents to delegate a task to OpenSpace MCP, then optionally upload evolved skills back to the cloud.
- `openspace/host_skills/skill-discovery/SKILL.md` describes discovery of reusable skills across local and cloud libraries, with optional auto-import.
- `openspace/cloud/search.py` implements hybrid search over skill candidates using BM25, embeddings, and lexical boost, which is artifact retrieval rather than runtime co-reasoning.
- `README.md` claims "One agent learns, all agents benefit", and the concrete mechanism shown in code is shared skill search, import, upload, and lineage, not a live collective execution fabric.

#### Nion Implication

`nion` should distinguish two concepts that are easy to blur:

1. parallel subagent execution inside one thread
2. cross-run artifact sharing across many agents

OpenSpace is much closer to the second. `nion` should avoid calling its existing subagent runtime "collective intelligence" unless it also adds durable cross-agent reuse surfaces.

### Q4. Where does OpenSpace's token efficiency story come from?

#### Answer

The token-efficiency story is grounded less in prompt compression and more in warm-start reuse: tasks are re-run with an accumulated skill library, and the benchmark measures how much work gets cheaper after that library exists.

#### Evidence

- `gdpval_bench/README.md` describes a two-phase benchmark: Phase 1 cold start accumulates skills; Phase 2 warm start reruns tasks with the full Phase 1 skill library.
- `gdpval_bench/token_tracker.py` tracks prompt, completion, total, and agent-only tokens across task runs.
- `gdpval_bench/run_benchmark.py` compares Phase 1 and Phase 2 token usage and explicitly separates total tokens from agent-only tokens.
- `README.md` ties token savings to "reuse successful solutions instead of starting from zero each time", which matches the benchmark design.

#### Nion Implication

If `nion` wants to claim token efficiency, it should measure warm-start reuse against a cold-start baseline, not only shorter prompts or better summarization. The right KPI is likely "same task family after accumulated reusable artifacts" rather than generic per-thread token count.

### Q5. What is the clearest architectural difference between OpenSpace and nion at the system center?

#### Answer

OpenSpace is skill-lifecycle-centric; `nion` is thread-runtime-centric. OpenSpace accumulates reusable artifacts across tasks, while `nion` currently optimizes execution, delegation, memory policy, and control-plane observability around threads and subagents.

#### Evidence

- `openspace/skill_engine/store.py` and `openspace/dashboard_server.py` center on skill lineage, skill quality, and workflow recordings.
- `backend/packages/harness/nion/tools/builtins/task_tool.py` centers on delegated task execution, diagnostics snapshots, and telemetry for subagent runs.
- `backend/packages/harness/nion/agents/middlewares/todo_middleware.py` centers on preserving planning state within a thread context window.
- `README.md` for `nion` emphasizes multi-agent orchestration, thread/runtime policies, notebooks, control-plane diagnostics, and thread-level execution surfaces.

#### Nion Implication

The most transferable OpenSpace idea is not "replace nion with a skill system". It is "add a second durable layer beside the thread runtime": a reusable artifact/evolution layer that can analyze completed work and feed better patterns back into future runs.

## Iteration 2: Self-Evolution Triggers, Safety, and Guardrails

### Q6. What concrete triggers actually launch OpenSpace's self-evolution loop?

#### Answer

OpenSpace has three concrete trigger families for self-evolution:

1. post-execution analysis after a task finishes
2. tool degradation when tool quality drops
3. periodic metric checks over skill health

This is broader than "fix broken skills when a task fails"; it is a runtime-connected monitoring system for the skill layer.

#### Evidence

- `openspace/skill_engine/evolver.py` documents three trigger sources: `ANALYSIS`, `TOOL_DEGRADATION`, and `METRIC_MONITOR`.
- `openspace/tool_layer.py` calls `_maybe_analyze_execution()` after execution and `_maybe_evolve_quality()` on the quality path.
- `openspace/tool_layer.py` launches `process_tool_degradation(problematic)` and `process_metric_check()` in background tasks when the relevant conditions are met.
- `openspace/skill_engine/evolver.py` implements `process_analysis()`, `process_tool_degradation()`, and `process_metric_check()` as separate entrypoints.

#### Nion Implication

If `nion` wants artifact evolution, it should model multiple trigger families explicitly. A useful split would be:

1. post-run analysis on thread or task completion
2. tool regression triggers from telemetry / diagnostics
3. periodic artifact-health scans over reuse outcomes

### Q7. How does OpenSpace avoid runaway or noisy auto-evolution?

#### Answer

OpenSpace does not blindly evolve on every heuristic hit. It combines rule-based screening with LLM confirmation, tracks already-addressed degradation cases, and requires fresh usage data before metric-triggered re-evaluation. Its anti-loop design is therefore partly stateful and partly data-driven.

#### Evidence

- `openspace/skill_engine/evolver.py` says tool degradation and metric checks use a "two-phase: rule-based candidate screening -> LLM confirmation" flow.
- `process_tool_degradation()` keeps `_addressed_degradations` and clears it only when a degraded tool recovers, which prevents repeated re-fixing of the same skill for the same live issue.
- `process_metric_check(min_selections=5)` skips skills with too few fresh selections, so new skills are not immediately re-evolved.
- `tool_layer.py` schedules background evolution instead of blocking the main task flow, which reduces direct disruption but also means evolution is separated from user-visible execution success.

#### Nion Implication

`nion` should not wire evolution directly from a single failed run to a mutation path. It needs at least:

1. a candidate-generation layer
2. a confirmation layer
3. a cooldown or fresh-data rule
4. a per-cause memory so the same regression does not trigger endless retries

### Q8. What does "diff-based and safe evolution" mean in actual code paths?

#### Answer

In code, "safe evolution" means bounded LLM tool-calling rounds, bounded apply retries, and structural validation of the resulting skill directory. The system is not formally proven safe, but it is not an unrestricted rewrite loop either.

#### Evidence

- `openspace/skill_engine/evolver.py` sets `_MAX_EVOLUTION_ITERATIONS = 5` and `_MAX_EVOLUTION_ATTEMPTS = 3`.
- The same file's `_apply_with_retry()` feeds failed patch/application errors back into the LLM, retries up to three times, and cleans up partially created directories for derive/create failures.
- After a successful apply, `_apply_with_retry()` calls `_validate_skill_dir(skill_dir)` before accepting the result.
- `openspace/skill_engine/skill_utils.py` validates that `SKILL.md` exists, is non-empty, has YAML frontmatter, and includes a required `name` field.

#### Nion Implication

If `nion` adds any automatic artifact mutation, it should define a bounded mutation protocol, not an open-ended agent loop. Minimum requirements are:

- max agent rounds
- max apply retries
- structural validation before activation
- cleanup of partially created artifacts

### Q9. What safety gates exist before skills are reused or shared?

#### Answer

OpenSpace applies safety filtering at discovery and search time using regex-based moderation. The current safety model is simple and conservative only for explicitly blocked patterns; many suspicious patterns are surfaced as flags but not automatically rejected.

#### Evidence

- `openspace/skill_engine/skill_utils.py` defines `check_skill_safety()` and `is_skill_safe()`, with regexes for malware, secrets, crypto, webhooks, and shell-pipe patterns.
- `_BLOCKING_FLAGS` currently contains only `blocked.malware`; `suspicious.*` matches are informational rather than blocking.
- `openspace/skill_engine/registry.py` blocks skills from discovery when `is_skill_safe(safety_flags)` returns false.
- `openspace/cloud/search.py` applies the same safety check when building local and cloud search candidates, filtering blocked entries and attaching `safety_flags` to surviving results.

#### Nion Implication

For `nion`, reusable artifact safety probably needs stronger tiers than OpenSpace currently uses. A LangGraph-native reuse layer should distinguish:

- block outright
- quarantine for review
- allow with warnings

That is especially important if artifacts can later influence tool calls, file writes, or automation behavior.

### Q10. What comparable guardrail surfaces does nion already have, and what does it still lack?

#### Answer

`nion` already has runtime guardrails for live execution concurrency and diagnostics, but it does not yet have an equivalent artifact-evolution guardrail layer. Its existing controls are about subagent behavior inside a run, not about post-run mutation of reusable instructions.

#### Evidence

- `backend/packages/harness/nion/agents/middlewares/subagent_limit_middleware.py` truncates excess `task` tool calls to cap concurrent subagent execution per model response.
- `backend/packages/harness/nion/tools/builtins/task_tool.py` records task telemetry and diagnostic snapshots for delegated tasks.
- `backend/packages/harness/nion/agents/middlewares/todo_middleware.py` preserves planning-state continuity when context is truncated.
- None of the scanned `nion` files define a store, lineage model, or safety pipeline for automatically mutating reusable artifacts after a run.

#### Nion Implication

`nion` can borrow OpenSpace's evolution ideas only by adding a new guardrail surface, not by stretching its current subagent controls. Concurrency limits and task diagnostics are necessary but orthogonal; they do not answer whether a generated artifact is safe, valid, and worth reusing later.

## Iteration 3: Storage, Lineage, and Quality Model

### Q11. How does OpenSpace represent a skill version?

#### Answer

OpenSpace represents each skill version as a `SkillRecord` plus `SkillLineage`, not merely as a mutable directory on disk. The on-disk `SKILL.md` is only one projection of a richer version record that includes origin, parents, generation, snapshots, and counters.

#### Evidence

- `openspace/skill_engine/types.py` defines `SkillRecord` with identity, tags, visibility, lineage, tool dependencies, execution counters, and recent analyses.
- The same file defines `SkillLineage` with `origin`, `generation`, `parent_skill_ids`, `change_summary`, `content_diff`, and `content_snapshot`.
- `openspace/skill_engine/store.py` persists these fields into `skill_records` and `skill_lineage_parents`, including `lineage_content_diff` and `lineage_content_snapshot`.

#### Nion Implication

If `nion` wants reusable evolving artifacts, it should not persist only the latest prompt file. It needs a version record that captures provenance, generation, change summary, and a recoverable snapshot of each artifact state.

### Q12. Is OpenSpace's lineage model a simple version chain or a real DAG?

#### Answer

It is a real DAG model, not just a linear history. FIX creates a same-name successor with one parent, DERIVED can have one or more parents, and CAPTURED / IMPORTED are roots.

#### Evidence

- `openspace/skill_engine/types.py` explicitly documents lineage rules for `IMPORTED`, `CAPTURED`, `DERIVED`, and `FIXED`, including multi-parent derived skills.
- The same file states that `DERIVED` generation is `max(parent generations) + 1`, which only makes sense for a DAG rather than a flat chain.
- `openspace/dashboard_server.py` builds lineage payloads with both ancestor and child traversal, then emits `nodes` and `edges` for visualization.

#### Nion Implication

For `nion`, a reusable-artifact store should assume composition, not only revision. A good design target is probably "artifact DAG with explicit parent semantics", because useful future patterns may come from combining multiple successful task artifacts rather than only fixing one artifact in place.

### Q13. What quality metrics does OpenSpace actually rank skills by?

#### Answer

OpenSpace's quality model is operational and ratio-based. It tracks how often a skill is selected, actually applied, associated with successful completion, and associated with fallback. The core ranking primitive is not "semantic beauty"; it is execution performance.

#### Evidence

- `openspace/skill_engine/types.py` defines `applied_rate`, `completion_rate`, `effective_rate`, and `fallback_rate` from stored counters.
- `openspace/skill_engine/store.py` offers `get_top_skills()` with metrics like `effective_rate`, `applied_rate`, `completion_rate`, and `total_selections`.
- `openspace/dashboard_server.py` serializes these rates and uses effective rate as a top-skill ranking surface.

#### Nion Implication

`nion` should avoid starting with vague artifact scores. It should define a small set of execution-derived rates, such as:

- selected to used
- used to succeeded
- selected to succeeded
- selected to bypassed or abandoned

This gives the control plane a mechanical basis for ranking reusable artifacts.

### Q14. How are task analyses tied back into the skill ledger?

#### Answer

Each completed task can produce an `ExecutionAnalysis`, which stores task-level judgments, per-skill judgments, tool issues, and evolution suggestions. The skill store then updates counters and retains recent analyses so future evolution decisions are conditioned on execution history rather than only current file contents.

#### Evidence

- `openspace/skill_engine/types.py` defines `ExecutionAnalysis` as task-level analysis containing skill judgments and evolution suggestions.
- `openspace/skill_engine/store.py` includes an `execution_analyses` table and a `skill_judgments` table keyed back to analyses.
- `SkillRecord` in `types.py` carries `recent_analyses`, and its counters are documented as being updated atomically in the store.

#### Nion Implication

The right analog for `nion` is likely a post-run artifact analysis record attached to thread runs and delegated task runs. Without that historical analysis layer, future artifact evolution has no memory beyond raw files and coarse telemetry.

### Q15. What observability surface sits on top of the store?

#### Answer

OpenSpace exposes a specialized dashboard that turns the store into a human-inspectable control plane: pipeline health, top skills, lineage graphs, workflow recordings, and skill source inspection. The dashboard is not an afterthought; it is part of how the evolving skill system becomes operable.

#### Evidence

- `openspace/dashboard_server.py` serves overview, health, skill list, skill detail, lineage, source, workflow list, and workflow detail endpoints.
- The dashboard overview includes pipeline stages, skill summaries, average scores, and workflow success rates.
- Skill detail endpoints expose recent analyses and source content, while workflow endpoints expose metadata, trajectory, plans, decisions, and artifacts.

#### Nion Implication

If `nion` adds artifact evolution, it also needs an operator-facing surface for:

- artifact lineage
- artifact quality metrics
- analysis history
- run-to-artifact links

Otherwise the system will mutate things users cannot inspect or trust.

## Iteration 4: Collective Intelligence as Skill Distribution

### Q16. What is actually shared across agents in OpenSpace?

#### Answer

What gets shared is the evolved `skill` artifact plus its metadata: origin, parents, visibility, tags, diff, and record identity. The system's cross-agent intelligence therefore lives in portable reusable instructions, not in a shared live execution graph.

#### Evidence

- `openspace/cloud/client.py` uploads a skill directory as a staged artifact, then creates a cloud record containing `origin`, `visibility`, `parent_skill_ids`, `tags`, and optional `content_diff`.
- The same client imports a cloud skill by fetching metadata, downloading the artifact zip, extracting files locally, and writing a `.skill_id` sidecar.
- `openspace/mcp_server.py` positions `upload_skill` as the step that returns evolved local skills to the cloud community.

#### Nion Implication

If `nion` wants cross-agent reuse, its sharable unit should probably be a portable artifact bundle plus provenance metadata, not raw thread memory or opaque run snapshots.

### Q17. How does OpenSpace decide which shared skills to retrieve?

#### Answer

OpenSpace uses a hybrid retrieval stack: BM25 rough ranking, optional embedding similarity, lexical boost, deduplication, and safety filtering. Retrieval is thus a search problem over skill metadata and content, not a symbolic planner over agent capabilities.

#### Evidence

- `openspace/cloud/search.py` documents a four-phase pipeline: BM25, vector scoring, hybrid score, deduplication.
- The same file enriches local candidates with quality metadata and filters blocked skills with safety checks.
- `openspace/mcp_server.py` exposes `search_skills` with cloud+local results and auto-import of top public hits.

#### Nion Implication

`nion` should not start with manual artifact lookup tables. A viable reuse layer likely needs:

- lexical search
- semantic search
- ranking with execution quality signals
- safety-aware filtering

### Q18. How are lineage and visibility preserved when a skill is shared?

#### Answer

OpenSpace preserves lineage and visibility through upload-time record metadata. Origin and parent constraints are enforced before record creation, visibility is converted into cloud visibility classes, and public uploads may include content diffs against ancestors.

#### Evidence

- `openspace/cloud/client.py` validates origin/parent combinations such as `derived` needing parents and `fixed` requiring exactly one parent.
- The same file maps local `private` to cloud `group_only` and keeps `public` as `public`.
- `_compute_content_diff()` in `cloud/client.py` includes ancestor diffs for public uploads, but skips diffs for multiple parents or private records.

#### Nion Implication

For `nion`, any future artifact exchange should preserve:

- visibility scope
- ancestry
- change summary
- optional diff payload

Without these, imported artifacts become hard to trust or merge.

### Q19. After integration, what remains host-agent owned and what becomes OpenSpace-owned?

#### Answer

The host agent keeps the user conversation, final user messaging, and the decision to follow or delegate. OpenSpace takes over as a delegated worker and artifact engine through MCP. This is augmentation, not full runtime replacement.

#### Evidence

- `openspace/host_skills/README.md` describes a host agent that connects to `openspace-mcp` and learns when to call four MCP tools.
- `host_skills/delegate-task/SKILL.md` instructs the host agent to delegate hard tasks to OpenSpace, then tell the user what happened and whether evolved skills were uploaded.
- `host_skills/skill-discovery/SKILL.md` keeps the host agent in the loop for deciding whether to follow a found skill directly or delegate execution.

#### Nion Implication

`nion` can adopt an OpenSpace-like reuse backend without surrendering its own thread UX or control plane. A clean architecture would keep `nion` as the user-facing orchestrator and make reusable-artifact evolution a subsystem, not a second competing runtime shell.

### Q20. Why is OpenSpace's "collective intelligence" best understood as asynchronous network effects?

#### Answer

Because the core loop is:

1. one agent executes a task
2. the task yields improved artifacts
3. those artifacts are published, searched, imported, and reused by other agents later

This is a network effect around reusable artifacts, not a synchronized multi-agent cognition layer.

#### Evidence

- `README.md` repeatedly ties collective benefit to sharing evolved skills.
- `openspace/mcp_server.py` limits host integration to task execution, skill search, fixing, and uploading, not to live inter-agent messaging.
- `cloud/client.py`, `cloud/cli/upload_skill.py`, and `cloud/cli/download_skill.py` implement asynchronous publish/download flows rather than shared runtime sessions.

#### Nion Implication

When borrowing the idea, `nion` should label it precisely: "cross-run artifact sharing" or "shared execution learnings" is more accurate than "collective intelligence" unless a true multi-agent shared-state coordination layer also exists.

## Iteration 5: Host-Agent Integration and Ownership Boundaries

### Q21. Does OpenSpace require deep host changes, or does it integrate through a narrow surface?

#### Answer

OpenSpace integrates through a narrow surface: host skills plus an MCP server with four tools. That means the host agent does not need to adopt OpenSpace's entire runtime model; it only needs to learn when to search, delegate, fix, and upload.

#### Evidence

- `openspace/host_skills/README.md` describes integration by copying two host skills and registering one MCP server.
- `openspace/mcp_server.py` exposes only four MCP tools: `execute_task`, `search_skills`, `fix_skill`, and `upload_skill`.
- `host_skills/delegate-task/SKILL.md` and `host_skills/skill-discovery/SKILL.md` frame OpenSpace as a delegated capability provider rather than as a replacement chat shell.

#### Nion Implication

For `nion`, the cleanest adoption path is likely a narrow subsystem interface rather than a sweeping runtime rewrite. That could be:

- internal service APIs
- MCP-like tool surfaces
- reusable artifact services behind existing thread UX

### Q22. How does OpenSpace reduce host-specific setup burden?

#### Answer

OpenSpace reduces setup burden by auto-detecting host credentials and config from known host-agent config files, while still allowing explicit override via environment variables. This makes it feel native inside multiple hosts without hard-forking for each one.

#### Evidence

- `openspace/host_detection/resolver.py` resolves LLM kwargs from `OPENSPACE_LLM_*`, host config files, and inherited provider env vars.
- `openspace/host_detection/nanobot.py` reads `~/.nanobot/config.json` for provider credentials, default model, and MCP env.
- `openspace/host_detection/openclaw.py` reads OpenClaw config files and skill-level env blocks.
- `mcp_server.py` uses these helpers during lazy initialization of the OpenSpace engine.

#### Nion Implication

If `nion` ever externalizes an artifact-evolution subsystem, it should preserve low-friction config inheritance. Otherwise every integration becomes a separate operational project instead of a reusable capability layer.

### Q23. What are the two main operating modes of OpenSpace, and why do they matter?

#### Answer

OpenSpace has two clear operating modes:

1. direct coworker mode through its own CLI
2. host-agent augmentation mode through MCP and host skills

This matters because it shows OpenSpace is both a standalone worker and a reusable backend for other agents.

#### Evidence

- `openspace/__main__.py` provides interactive and single-query CLI execution over `OpenSpace.execute()`.
- `README.md` explicitly distinguishes "Path A: For Your Agent" from "Path B: As Your Co-Worker".
- `mcp_server.py` provides the delegation-oriented mode used by host agents.

#### Nion Implication

For `nion`, this suggests a useful architectural split: a core artifact-analysis subsystem can exist independently, while the primary product surface remains `nion`'s thread-centric UI and daemon control plane.

### Q24. Once delegated, what does OpenSpace fully own?

#### Answer

Once a task is delegated, OpenSpace owns the grounding loop, skill selection, fallback handling, analysis, and possible evolution. The host only regains control at the interface boundary when it receives results and decides how to present or share them.

#### Evidence

- `mcp_server.py` lazy-initializes a full `OpenSpace` engine and passes delegation requests into `OpenSpace.execute()`.
- `__main__.py` and `tool_layer.py` show that task execution, UI integration, recording, and skill-evolution hooks happen inside the OpenSpace runtime, not in the host.
- `delegate-task/SKILL.md` explicitly tells the host agent to report the result and decide upload visibility after the delegated call returns.

#### Nion Implication

If `nion` adopts a similar subsystem, it must define a crisp ownership boundary: which layer owns execution, which layer owns artifact mutation, and which layer owns user-facing explanation. Blurring these responsibilities will make debugging and trust much harder.

### Q25. What is the best integration lesson for nion from this host/subsystem split?

#### Answer

The best lesson is architectural containment. OpenSpace shows that a reusable evolution backend can be inserted behind a narrow contract without forcing every host to abandon its own UX, planning style, or runtime identity.

#### Evidence

- `host_skills/README.md` keeps the host-specific instructions thin and focused on MCP setup.
- `resolver.py` and host detection readers absorb environment differences instead of pushing them onto the end user.
- `mcp_server.py` centralizes the reusable backend behavior in one server boundary.

#### Nion Implication

For `nion`, the practical move is not "become OpenSpace". It is to isolate an artifact-evolution capability behind a clean boundary so the existing thread runtime, notebook, diagnostics, and control plane remain first-class.

## Iteration 6: Token Efficiency Benchmark and Measurement Semantics

### Q26. What experimental design actually supports OpenSpace's token-efficiency claim?

#### Answer

The core design is a two-phase benchmark:

1. Phase 1 runs tasks in cold-start mode so skills accumulate
2. Phase 2 reruns the same tasks with the full Phase 1 skill library

Token savings are therefore framed as warm-start gains from accumulated reusable artifacts.

#### Evidence

- `gdpval_bench/README.md` explicitly describes Phase 1 as cold start and Phase 2 as warm start with the full Phase 1 skill library.
- `gdpval_bench/run_benchmark.py` executes each task per phase and records skill counts before and after execution.
- The same script emits per-task and aggregate phase comparisons into `comparison.jsonl` and `summary.json`.

#### Nion Implication

`nion` should benchmark artifact reuse with a cold-start versus warm-start protocol, not only with isolated single-run token counts.

### Q27. Does the benchmark separate agent work from OpenSpace overhead?

#### Answer

Yes. The benchmark tracks both total tokens across all LLM calls and agent-only tokens that exclude parts of the OpenSpace skill engine overhead such as analysis and evolution calls.

#### Evidence

- `gdpval_bench/token_tracker.py` tags calls by source: `agent`, `skill_select`, `analyzer`, `evolver`, and `summarizer`.
- `TokenStats` stores both total tokens and agent-only token counters.
- `gdpval_bench/run_benchmark.py` computes `token_savings` and separate `agent_token_savings`, then prints both in the final summary.

#### Nion Implication

For `nion`, token-efficiency measurement should separate:

- user-visible execution tokens
- artifact system overhead
- evaluation-only or analytics overhead

Otherwise "saved tokens" can hide a shift of cost into invisible subsystems.

### Q28. Does OpenSpace measure only cheaper execution, or also task quality and economics?

#### Answer

It measures more than token counts. The benchmark also records LLM calls, cost, execution time, skills used, and evaluator-derived quality or payment outcomes aligned with ClawWork's framework.

#### Evidence

- `run_benchmark.py` stores execution iterations, tool calls, elapsed time, skills before/after, and evolved skills per task.
- The same file evaluates outputs and records score, actual payment, and cliff behavior when evaluation is enabled.
- The aggregate summary includes token savings, agent token savings, LLM call counts, cost savings, evaluation summary, and skill counts by origin.

#### Nion Implication

`nion` should avoid optimizing for tokens alone. A realistic benchmark should jointly track:

- quality or task success
- execution cost
- artifact overhead
- reuse-driven speedup

### Q29. What does this benchmark *not* prove?

#### Answer

It does not prove that OpenSpace is universally more efficient in every deployment or that every savings number comes purely from smarter prompting. It mainly proves that on the chosen task set, under this two-phase reuse setup, accumulated skills can lower later-run token usage and sometimes improve outcome metrics.

#### Evidence

- The benchmark compares Phase 1 to Phase 2 within OpenSpace's own reuse loop, not against every possible architecture.
- `token_tracker.py` shows that OpenSpace explicitly incurs non-agent overhead for analysis, selection, evolution, and summarization, which must be interpreted separately.
- `run_benchmark.py` uses task re-execution after accumulation, so the measured win is fundamentally a reuse effect rather than a single-pass raw model efficiency effect.

#### Nion Implication

When `nion` later benchmarks itself, it should state clearly whether it is measuring:

- first-run efficiency
- repeated-task-family efficiency
- end-to-end cost including artifact maintenance

Mixing these claims will make the result hard to trust.

### Q30. What is the right token-efficiency lesson for nion from OpenSpace?

#### Answer

The transferable lesson is methodological, not numerical: if reusable artifacts are the mechanism, then the benchmark must isolate the value of accumulated artifacts over repeated tasks and separately report subsystem overhead.

#### Evidence

- `gdpval_bench/token_tracker.py` gives the machinery for separating sources of token usage.
- `run_benchmark.py` compares two phases, aggregates both total and agent-only savings, and preserves per-task deltas.
- `README.md` connects the token claim to reuse of successful solutions, which matches the benchmark design instead of contradicting it.

#### Nion Implication

`nion` should build a benchmark that asks:

- after N related tasks, did reusable artifacts reduce later-run cost?
- did success or output quality improve, stay flat, or degrade?
- what overhead did the artifact system itself introduce?

## Iteration 7: Boundaries, Overclaims, and Weak Spots

### Q31. Where does OpenSpace's marketing language overreach the actual implementation?

#### Answer

The main overreach is the phrase "collective agent intelligence". The implementation shown in the repo supports collaborative artifact discovery and reuse, but not a true shared live cognition or multi-agent coordination substrate.

#### Evidence

- `README.md` describes "collective intelligence at scale" and "one agent learns, all agents benefit".
- The code path we traced for that claim is cloud/local skill search, import, upload, lineage, and delegation through MCP.
- No scanned module exposes a shared multi-agent session graph, agent-to-agent live protocol, or cross-agent synchronized planning layer.

#### Nion Implication

`nion` should market any future equivalent conservatively: reusable artifact exchange is valuable, but it is not the same thing as a native collective multi-agent runtime.

### Q32. Where is OpenSpace's current safety posture relatively shallow?

#### Answer

Its safety posture is useful but lightweight. The main blocker set is narrow, many suspicious patterns are informational only, and automatic retrieval can still surface questionable artifacts to the host layer.

#### Evidence

- `openspace/skill_engine/skill_utils.py` blocks only `blocked.malware`, while many patterns like secrets, webhook strings, or `curl | bash` are non-blocking warnings.
- `openspace/cloud/search.py` carries `safety_flags` forward, but safe/unsafe remains a small rule set rather than a richer trust policy.
- `mcp_server.py` can auto-import the top public cloud hits in `search_skills`, limited by `_AUTO_IMPORT_MAX = 3`.

#### Nion Implication

`nion` should not adopt artifact auto-import or auto-activation without stronger trust tiers, provenance review, and possibly workspace or team policy gates.

### Q33. Where is host support partial rather than fully generalized?

#### Answer

Host support is practical but uneven. OpenSpace clearly supports nanobot and partially supports OpenClaw, but its host-detection layer is not a universal abstraction for every agent it names in the README.

#### Evidence

- `openspace/host_detection/nanobot.py` contains concrete provider and MCP-env detection logic.
- `openspace/host_detection/openclaw.py` explicitly says auth-profile-based LLM credential detection is "not yet implemented".
- The README names many host agents, but the repo-level host-specific setup documentation is concentrated around nanobot and OpenClaw plus a generic path.

#### Nion Implication

If `nion` exposes a reusable subsystem externally, it should be explicit about which hosts are first-class integrations and which are merely theoretically compatible.

### Q34. Which parts of self-evolution are still heuristic rather than robustly grounded?

#### Answer

Several parts are intentionally heuristic:

- relaxed metric thresholds for candidate screening
- LLM confirmation for whether a rule-based candidate should evolve
- regex-based safety moderation

These choices are pragmatic, but they are not formal guarantees of correctness.

#### Evidence

- `openspace/skill_engine/evolver.py` marks its screening thresholds as "relaxed" and relies on LLM confirmation to reduce false positives.
- The same file uses bounded retry and structural validation, but not semantic validation of skill quality beyond the task-analysis loop.
- `skill_utils.py` validates frontmatter and blocking patterns, which is structural/moderation coverage rather than deep behavioral verification.

#### Nion Implication

`nion` can borrow this approach only if it clearly treats it as heuristic optimization, not as a trusted compiler for reusable artifacts. High-impact artifact mutations will still need review surfaces and rollback stories.

### Q35. What should nion explicitly avoid copying from OpenSpace without stronger foundations?

#### Answer

`nion` should avoid copying three things naively:

1. broad intelligence claims without matching runtime semantics
2. shallow safety gating for imported reusable artifacts
3. heuristic auto-mutation without explicit trust and rollback workflows

#### Evidence

- The collective-intelligence claim outstrips the live coordination model visible in code.
- Safety blocking is narrow and auto-import exists for top public hits.
- Evolution uses relaxed thresholds plus LLM confirmation, which is useful but still heuristic.

#### Nion Implication

The right strategy is not "copy the whole pattern". It is "copy the useful mechanism, then strengthen trust, governance, and naming before productizing it in nion".

## Iteration 8: Concrete Landing Zones in Nion

### Q36. Where could nion inject OpenSpace-like artifact retrieval without breaking its current model?

#### Answer

The cleanest insertion point is before or during prompt assembly for the lead agent, where `nion` already loads enabled skills and builds a skill section for the system prompt. That is the natural place to add ranked reusable artifacts later.

#### Evidence

- `backend/packages/harness/nion/agents/lead_agent/prompt.py` loads enabled skills with `load_skills()` and generates a `<skill_system>` prompt section.
- The same file already distinguishes skills as optional structured guidance rather than hard-coded agent behavior.
- This means `nion` already has a prompt-side "artifact injection" seam, even if it currently only serves static enabled skills.

#### Nion Implication

Phase 1 for `nion` should likely be retrieval + prompt injection of ranked reusable artifacts, not automatic mutation. That lets the system benefit from reuse earlier while keeping the mutation problem separate.

### Q37. Where could nion hook a post-run analysis layer?

#### Answer

The best hook points are the thread stream completion path and delegated task completion path. These are the places where execution results, messages, telemetry, and artifacts already converge.

#### Evidence

- `backend/packages/harness/nion/threads/service.py` streams model output and then persists latest thread values after completion.
- `backend/packages/harness/nion/tools/builtins/task_tool.py` and `backend/packages/harness/nion/subagents/executor.py` already emit delegated-task and subagent telemetry, snapshots, and completion states.
- These surfaces already define run boundaries, which is exactly what a post-run artifact analysis layer would need.

#### Nion Implication

`nion` should place artifact analysis after run completion events, not in the middle of prompt construction. A good first slice is:

- analyze completed delegated tasks
- analyze completed thread runs
- record candidate reusable artifacts plus evidence

### Q38. Which existing nion control-plane surfaces could host artifact diagnostics?

#### Answer

`nion` already has a structured diagnostics and control-plane vocabulary around runtime status, incident diagnosis, snapshots, and logs. That existing observability layer can be extended to artifact quality rather than inventing a separate hidden subsystem.

#### Evidence

- `backend/packages/harness/nion/tools/builtins/control_plane_tools.py` exposes runtime status, incidents, logs, thread diagnostics, and channel diagnostics.
- `task_tool.py` and `subagents/executor.py` already write telemetry events and snapshots into the telemetry store.
- The project README positions the daemon control plane as a shared structured state and diagnostics plane.

#### Nion Implication

`nion` should surface artifact lineage and artifact-quality diagnostics through the existing control plane, not as an opaque sidecar database no one can inspect.

### Q39. Which OpenSpace ideas map naturally onto nion, and which are orthogonal?

#### Answer

Natural mappings:

- post-run analysis
- reusable artifact ranking
- lineage-aware persistence
- artifact diagnostics

Orthogonal concerns:

- thread memory and notebook storage
- live subagent orchestration limits
- channel and daemon incident workflows

#### Evidence

- `prompt.py` shows that `nion` already has a skill injection concept.
- `task_tool.py`, `subagents/executor.py`, and `control_plane_tools.py` show mature runtime observability and task diagnostics.
- The README and notebook sections clearly separate notebook assets, agent memory, and runtime execution concerns.

#### Nion Implication

`nion` should add an artifact-evolution layer as a sibling to memory and control-plane systems, not by overloading notebook storage or existing subagent telemetry tables to mean something new.

### Q40. What architectural conflation should nion avoid when borrowing from OpenSpace?

#### Answer

`nion` should avoid conflating four separate concepts:

1. thread memory
2. user notebook knowledge
3. runtime diagnostics
4. reusable execution artifacts

OpenSpace gets leverage by centering reusable artifacts. `nion` will lose clarity if it tries to hide that layer inside one of the other three.

#### Evidence

- `README.md` explicitly distinguishes notebook assets from agent memory.
- `control_plane_tools.py` and telemetry-backed task diagnostics are already scoped to runtime health, not reusable instructions.
- `lead_agent/prompt.py` and skill loading already imply a separate guidance layer.

#### Nion Implication

If `nion` adopts OpenSpace-like mechanisms, it should create a dedicated artifact domain model with its own storage, lifecycle, ranking, and diagnostics, while preserving the existing boundaries among memory, notebook, and runtime telemetry.

## Iteration 9: Phased Architecture for Nion

### Q41. What is the minimum valuable OpenSpace-inspired feature nion should build first?

#### Answer

The minimum valuable first feature is retrieval-only reusable artifact injection: analyze completed runs, store candidate artifacts with metadata, rank them later, and inject the top matches into the lead-agent prompt or task context. This captures reuse value without immediately taking on automatic mutation risk.

#### Evidence

- `lead_agent/prompt.py` already has a dynamic skill injection section that can host ranked reusable artifacts.
- `threads/service.py`, `task_tool.py`, and `subagents/executor.py` already define stable completion boundaries and telemetry for generating post-run candidates.
- Current `nion` skill loading and validation (`skills/loader.py`, `skills/validation.py`) show that a validated prompt-guidance layer already exists.

#### Nion Implication

Phase 1 for `nion` should be:

1. candidate extraction after completed runs
2. artifact store plus ranking fields
3. retrieval into prompt context
4. no auto-mutation yet

### Q42. What should phase 2 add after retrieval proves useful?

#### Answer

Phase 2 should add operator-reviewed evolution and lineage, not fully automatic mutation. Once reuse is measurably helpful, `nion` can add generation of improved artifacts, review queues, and lineage graphs on top of the artifact store.

#### Evidence

- OpenSpace's strongest differentiator is not just retrieval but the lineage-aware evolution loop around reusable artifacts.
- `nion` already has a control-plane and diagnostics vocabulary that can host review and approval flows more safely than silent mutation.
- The current `nion` architecture already favors suggestion-first diagnostics in other domains, which is a good precedent for artifact mutation review.

#### Nion Implication

Phase 2 should likely be:

- suggestion-first artifact evolution
- human or policy approval for activation
- lineage graph and diff inspection
- rollback to prior artifact version

### Q43. Which current nion components can be reused directly, and what must be new?

#### Answer

Reusable directly:

- prompt-side skill or artifact injection
- telemetry event logging and snapshots
- control-plane diagnostics surfaces
- existing skill frontmatter validation as a starting point

Must be new:

- artifact store with lineage and quality counters
- post-run artifact analyzer
- artifact ranking and retrieval service
- artifact trust and activation policy

#### Evidence

- `lead_agent/prompt.py`, `skills/loader.py`, and `skills/validation.py` already form a prompt-guidance subsystem.
- `telemetry/store.py` already persists event logs and snapshots for runtime health.
- No scanned `nion` file currently provides lineage-aware reusable artifact persistence or cross-run reuse ranking.

#### Nion Implication

`nion` should reuse the shells it already has, but create a genuinely new artifact domain model rather than stretching telemetry or static skill config beyond their design intent.

### Q44. What governance model should nion use for artifact trust and activation?

#### Answer

`nion` should use a staged governance model:

1. record candidate artifacts
2. rank and inspect them
3. allow explicit enablement per workspace or policy scope
4. only later consider guarded auto-activation for well-proven artifact classes

#### Evidence

- OpenSpace's safety model is too lightweight for direct blind adoption into a thread-runtime product.
- `nion` already uses suggestion-first and confirmation-oriented patterns in its diagnostics/control-plane design, which is a stronger fit for mutation governance.
- `skills/validation.py` shows that `nion` already values schema validation, but not yet trust governance for evolved artifacts.

#### Nion Implication

The first trustworthy design for `nion` is "rank + inspect + opt in", not "generate and silently activate".

### Q45. What user value would this phased architecture add to nion beyond current capabilities?

#### Answer

It would let `nion` turn successful task execution into reusable operational leverage. Today `nion` is strong at completing and diagnosing runs; this architecture would make it stronger at getting better over repeated families of work.

#### Evidence

- Current `nion` strengths in README and runtime code center on thread execution, delegation, diagnostics, and memory boundaries.
- OpenSpace's reusable-artifact loop shows how repeated work can get cheaper and more reliable once successful patterns are persisted and ranked.
- The gap is not execution competence; it is cross-run accumulation of reusable execution patterns.

#### Nion Implication

The strategic payoff for `nion` is not a new slogan. It is a second engine beside the thread runtime that compounds prior wins into future execution speed, quality, and cost improvements.

## Iteration 10: Final Synthesis and Verdict

### Q46. Can nion realistically implement OpenSpace-style self-evolution?

#### Answer

Yes, but not by copying OpenSpace's exact skill engine wholesale. `nion` can implement a versioned reusable-artifact evolution loop if it adds a dedicated artifact store, post-run analysis, lineage, and governance on top of its existing thread runtime.

#### Evidence

- `nion` already has stable run boundaries, delegated task telemetry, and a control plane (`threads/service.py`, `task_tool.py`, `subagents/executor.py`, `control_plane_tools.py`).
- `lead_agent/prompt.py` already supports dynamic guidance injection.
- OpenSpace demonstrates the needed additional pieces: post-run analysis, lineage-aware store, and artifact ranking/evolution (`skill_engine/*`, `dashboard_server.py`).

#### Nion Implication

`nion` can get the benefit, but only by adding a second durable layer beside the thread runtime. Treating self-evolution as "the model rewrites prompts sometimes" would be too weak.

### Q47. Can nion implement something worth calling collective intelligence?

#### Answer

Yes, but only if the term is narrowed to cross-run reusable-artifact sharing. `nion` already has multi-agent execution inside a thread, but that is different from collective learning across agents or workspaces.

#### Evidence

- `nion` currently emphasizes subagent orchestration and thread/task diagnostics, not a cross-run artifact exchange layer.
- OpenSpace's actual collective mechanism is artifact discovery, import, upload, and lineage, not shared live cognition.
- The two systems therefore already cover different halves of the phrase.

#### Nion Implication

If `nion` adds workspace-scoped or team-scoped reusable-artifact sharing, it can honestly claim a practical form of collective execution learning. It should avoid implying a stronger coordination model unless it actually builds one.

### Q48. Can nion reproduce OpenSpace-style token efficiency gains?

#### Answer

Potentially yes, but only if the gains come from reusable artifacts that reduce later-run work across a task family. `nion` already tracks runtime behavior, so the missing piece is the artifact reuse loop plus a benchmark that isolates reuse effects from overhead.

#### Evidence

- OpenSpace's benchmark design measures warm-start reuse rather than one-off prompt shrinkage.
- `nion` already has thread and task telemetry plus control-plane reporting surfaces that can host benchmark instrumentation.
- Without a reusable artifact layer, `nion` can measure token usage but cannot yet test "artifact accumulation reduces future task cost" as a distinct mechanism.

#### Nion Implication

For `nion`, token efficiency should be treated as a downstream result of artifact reuse, not a standalone prompt-tuning objective.

### Q49. What success metrics should nion use if it builds this?

#### Answer

The right success metrics are a small balanced set:

- artifact retrieval usefulness rate
- artifact-assisted completion or success rate
- warm-start versus cold-start token delta
- artifact-system overhead
- approval-to-activation conversion rate for reviewed evolutions

#### Evidence

- OpenSpace's strength is combining execution metrics with lineage and benchmark deltas rather than relying on one vanity number.
- `nion` already has telemetry and diagnostics infrastructure that can host several of these metrics.
- The earlier iterations showed that trust and governance matter as much as raw generation quality.

#### Nion Implication

`nion` should define these metrics before building phase 2 mutation features, otherwise it will have no trustworthy signal about whether artifact evolution is helping.

### Q50. What is the final adopt / adapt / reject verdict on OpenSpace for nion?

#### Answer

Final verdict:

- **Adopt** the lifecycle idea: post-run analysis, reusable artifact ranking, lineage, and warm-start benchmarking
- **Adapt** the substrate: use `nion`'s thread/runtime/control-plane architecture instead of copying OpenSpace's exact SKILL engine
- **Reject** the sloppy parts: broad intelligence claims, shallow trust gating, and heuristic auto-mutation without stronger governance

#### Evidence

- OpenSpace's strongest code-backed ideas are around artifact accumulation and observability.
- `nion`'s strongest existing assets are its runtime orchestration, diagnostics, and prompt-injection seams.
- The mismatch is productive: it suggests complementarity, not wholesale replacement.

#### Nion Implication

The best path is to make `nion` better at accumulating reusable execution artifacts while keeping its current strengths in thread UX, control plane, and runtime governance.
