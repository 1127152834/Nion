# OpenSpace Experiments

Use this file as the evidence ledger for implementation and benchmarking.

## E-001: Research Loop Completed

- Date: `2026-03-28`
- Scope: OpenSpace capability research
- Evidence:
  - `openspace-capability-research.md`
  - `openspace-nion-adaptation.md`
  - `2026-03-28-openspace-capability-adoption-product-line.md`
  - `2026-03-28-openspace-upgrade-impact-matrix.md`
- Result:
  - Confirmed the strongest reusable ideas are artifact lifecycle, post-run analysis, lineage, and warm-start benchmarking
  - Confirmed we should not copy shallow trust gating or inflated terminology

## E-002: OpenSpace rebuild workflow skill created

- Date: `2026-03-29`
- Scope: Process/tooling for OpenSpace-inspired capability work in `nion`
- Change or test:
  - Created `skills/custom/openspace-capability-rebuild/SKILL.md`
  - Validated frontmatter with the local `nion.skills.validation` utility
- Evidence:
  - Skill path: `skills/custom/openspace-capability-rebuild/SKILL.md`
  - Validation result: `Skill is valid!`
- Result:
  - We now have a dedicated workflow skill that forces use of `docs/openspace/` research, planning, progress, decision, and experiment files
  - The skill encodes lane-based progression, anti-drift rules, and evidence requirements
- Decision impact:
  - Future OpenSpace-inspired work should follow the skill instead of ad hoc process

## E-003: Wave 0 lane selected - source-tagged token tracker

- Date: `2026-03-29`
- Scope: Measurement Foundation
- Change or test:
  - Selected the first Wave 0 lane: additive source-tagged token tracking
  - Confirmed current `nion` state already supports thread-level `usage_metadata` passthrough, but not per-source attribution
- Evidence:
  - Existing usage passthrough in `backend/packages/harness/nion/client.py`
  - Existing thread token UI in `frontend/src/core/messages/usage.ts`
  - Existing OpenSpace planning docs in `docs/openspace/`
- Result:
  - Lane is small enough to start with TDD
  - Initial target is backend-only measurement, without changing current user-facing token display
- Decision impact:
  - Wave 0 begins with additive instrumentation rather than UI or subsystem redesign

## E-004: Source-tagged token tracker baseline implemented

- Date: `2026-03-29`
- Scope: Wave 0 / Measurement Foundation / source-tagged token tracker
- Change or test:
  - Added `backend/packages/harness/nion/telemetry/token_source.py`
  - Added isolated tests for source-based token aggregation and model-factory callback injection
  - Injected `TokenSourceCallbackHandler` in `backend/packages/harness/nion/models/factory.py`
- Evidence:
  - `backend/tests/test_token_source_tracker.py`
  - `backend/tests/test_model_factory_token_source.py`
  - Verification command: `cd backend && uv run pytest tests/test_token_source_tracker.py tests/test_model_factory_token_source.py -q`
- Result:
  - We can now aggregate token usage by source bucket in-process
  - The callback is attached automatically at model creation time
  - Existing thread-level `usage_metadata` behavior was not touched in this slice
- Decision impact:
  - The lane remains additive and low-risk
  - Next step should focus on real source taxonomy and benchmark consumption, not UI changes

## Template

### E-XXX: [Experiment name]

- Date: `YYYY-MM-DD`
- Scope:
- Change or test:
- Evidence:
- Result:
- Decision impact:
