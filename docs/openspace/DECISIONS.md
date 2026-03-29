# OpenSpace Decision Log

Use this file to avoid repeating architecture debates.

## D-001: `docs/openspace/` is the canonical workspace

- Date: `2026-03-28`
- Decision: All OpenSpace-inspired research, planning, progress, and evidence live under `docs/openspace/`.
- Why: Prevents drift across `docs/research` and `docs/plans`.

## D-002: `nion` stays thread-runtime-centric

- Date: `2026-03-28`
- Decision: We will not turn `nion` into a skill-centric product. We will add a reusable-artifact layer beside the existing runtime.
- Why: Preserves current product center of gravity and boundaries.

## D-003: Measure before productizing

- Date: `2026-03-28`
- Decision: Source-tagged token tracker and cold/warm benchmark come before artifact evolution work.
- Why: We need evidence that reuse produces real gains before adding a larger subsystem.

## D-004: Use a dedicated OpenSpace rebuild skill to enforce process

- Date: `2026-03-29`
- Decision: OpenSpace-inspired work should use the `openspace-capability-rebuild` skill as the workflow guardrail for lane selection, evidence recording, and document usage.
- Why: Prevents drift, repeated research, and undocumented progress.

## Update Rule

- Add one short entry per meaningful product or architecture decision.
- Do not overwrite old decisions; append new ones when direction changes.
