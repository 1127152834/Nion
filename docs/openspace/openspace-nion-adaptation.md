# OpenSpace to Nion Adaptation Notes

## Current Thesis

OpenSpace is strongest where it treats reusable `skills` as a monitored, versioned, shareable asset. `nion` is strongest where it treats thread execution, delegated tasks, memory policy, and control-plane diagnostics as first-class runtime concerns.

## Proposed Landing Zones in Nion

- Retrieval injection: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Post-run artifact analysis: thread completion path and delegated task completion path
- Artifact diagnostics and observability: existing telemetry/control-plane surfaces
- Artifact store: a new domain beside notebook, memory, and runtime telemetry

## Phased Recommendation

### Phase 1

- Add post-run candidate extraction for reusable artifacts
- Persist artifacts with metadata and quality counters
- Retrieve ranked artifacts into lead-agent prompt context
- Keep activation explicit and inspectable

### Phase 2

- Add suggestion-first artifact evolution
- Add lineage graph, diff view, and rollback
- Add workspace-scoped trust and activation policy

### Phase 3

- Add guarded policy-based auto-activation for well-proven artifact classes
- Benchmark cold-start versus warm-start reuse across task families

## Can Nion Do This?

- Self-evolution: `Yes`, if implemented as reviewed reusable-artifact evolution rather than silent prompt mutation
- Collective intelligence: `Yes`, if defined as cross-run artifact sharing rather than live shared cognition
- Token efficiency: `Yes`, if measured as warm-start reuse gains and reported separately from subsystem overhead

## Final Verdict

- Adopt OpenSpace's reusable-artifact lifecycle
- Adapt it to nion's thread/runtime/control-plane architecture
- Reject shallow trust and inflated terminology

## Early Signals

### Adopt

- Post-run analysis hooks that examine successful and failed executions for reusable patterns
- Lineage-aware persistence for reusable artifacts
- Warm-start versus cold-start evaluation for token-efficiency claims
- Candidate confirmation before auto-mutating a reusable artifact
- Bounded mutation loops with validation and cleanup
- An operator-facing artifact dashboard with lineage and quality history
- Search + ranking over reusable artifacts using both semantic and lexical signals
- Low-friction config inheritance if the subsystem is exposed beyond the core runtime
- Separate user-visible execution tokens from artifact-system overhead in benchmarks

### Adapt

- Skill evolution should likely become `nion` artifact evolution, not a direct copy of OpenSpace's `SKILL.md` lifecycle
- Cloud sharing should map to `nion`'s workspace / channel / notebook boundaries rather than a generic global skill feed
- Safety should use stronger tiers than OpenSpace's current blocking-versus-informational regex split
- Artifact lineage should be modeled as a DAG because useful future patterns may come from composition, not just fixes
- Any sharing layer should keep `nion` as the user-facing orchestrator rather than replacing the thread runtime
- A future artifact subsystem should sit behind a narrow boundary, not leak implementation assumptions into every `nion` feature
- Benchmark repeated task families, not only one-off thread cost, if the claim is about reuse

### Reject

- Calling subagent parallelism "collective intelligence" without a real cross-run sharing mechanism
- Claiming token savings without isolating reusable-artifact effects from other runtime changes
- Artifact auto-import or auto-activation without stronger trust, provenance, and review policy
- Broad intelligence marketing that exceeds the actual coordination semantics of the system
