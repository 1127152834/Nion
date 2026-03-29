# Automation OS Sequenced Milestone Execution Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Execute the Automation OS milestone plans in strict sequence inside one persistent worktree, with hard completion gates between milestones and no overlap.

**Architecture:** Treat each milestone pair as a child plan set: one milestone brief plus one implementation plan. Execution always happens in the same worktree and branch context so state, docs, and verification evidence accumulate in one continuous delivery lane. No later milestone may begin until the previous milestone is implemented, verified, and documented as complete.

**Tech Stack:** Git worktree workflow, FastAPI, SQLite, React 19, Next.js App Router, TypeScript, pytest, node:test, scoped static analysis, HTTP and browser acceptance verification

---

### Task 0: Lock the Execution Lane

**Files:**
- Use existing worktree: `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-event-task-automation-os`
- Reference docs only:
  - `docs/plans/2026-03-28-automation-os-m0-event-task-foundation-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m0-event-task-foundation-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m1-event-task-mvp-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m1-event-task-mvp-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m2-event-center-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m2-event-center-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m3-workflow-v1-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m3-workflow-v1-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m4-templates-packages-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m4-templates-packages-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m5-team-governance-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m5-team-governance-implementation-plan.md`
  - `docs/plans/2026-03-28-automation-os-m6-open-platform-milestone.md`
  - `docs/plans/2026-03-28-automation-os-m6-open-platform-implementation-plan.md`

**Step 1: Stay in one worktree for the full program**

Use only:

`/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-event-task-automation-os`

Do not create a new worktree for later milestones.

**Step 2: Use one milestone at a time**

For every milestone, read exactly two docs:

- the milestone brief
- the matching implementation plan

The implementation plan is executable. The milestone brief is the acceptance contract.

**Step 3: Enforce the no-overlap rule**

Do not start any task from the next milestone until:

- code for the current milestone is implemented
- milestone tests pass
- scoped static analysis passes
- milestone acceptance flow is verified
- completion is documented in the worktree

**Step 4: Commit after each milestone**

At the end of every milestone:

- stage only milestone-relevant files
- create one or more reviewable commits
- do not roll the next milestone into the same unfinished code state

### Task 1: Complete M0 Before Anything Else

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m0-event-task-foundation-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m0-event-task-foundation-implementation-plan.md`

**Step 1: Read the M0 brief**

Confirm the expected outputs:

- `event_task` job kind
- event trigger support
- package directory support
- package-backed script execution
- event dispatch
- event-task tab, create form, and basic detail route

**Step 2: Execute the M0 implementation plan task-by-task**

Follow the child implementation plan in order. Do not skip the red-green verification pattern.

**Step 3: Run the M0 gate**

Run:

- focused backend pytest suite for M0
- focused frontend contract tests for M0
- scoped backend static analysis
- scoped frontend static analysis
- HTTP acceptance: create -> trigger -> run history -> detail page

**Step 4: Record M0 completion**

Document in the worktree notes or commit message that M0 is complete and that M1 may begin.

### Task 2: Execute M1 Only After M0 Gate Passes

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m1-event-task-mvp-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m1-event-task-mvp-implementation-plan.md`

**Step 1: Re-read the M1 brief**

Confirm M1 adds:

- event-task editing
- package file upload
- script creation
- built-in actions
- explicit delete confirmation

**Step 2: Execute the M1 implementation plan task-by-task**

Keep M1 bounded. Do not pull in Event Center or workflow work prematurely.

**Step 3: Run the M1 gate**

Required proof:

- update API works
- package file upload works
- script creation works
- built-in action execution works
- delete confirmation exists
- delete removes the package directory

**Step 4: Freeze M1 and only then advance**

Do not start M2 until the M1 gate passes cleanly.

### Task 3: Execute M2 Event Center

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m2-event-center-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m2-event-center-implementation-plan.md`

**Step 1: Use M1 event vocabulary as the only source of truth**

Do not invent a second event naming system.

**Step 2: Implement Event Center task-by-task**

Must cover:

- event listing
- event detail
- replay for safe event types
- create-task-from-event flow

**Step 3: Run the M2 gate**

Required proof:

- event-center APIs pass
- route renders
- replay works
- event can be turned into a task draft or task creation flow

**Step 4: Lock M2 before M3**

No workflow work begins until M2 is complete.

### Task 4: Execute M3 Workflow V1

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m3-workflow-v1-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m3-workflow-v1-implementation-plan.md`

**Step 1: Keep workflow editing linear**

Do not switch to a graph editor in M3.

**Step 2: Implement workflow support task-by-task**

Must cover:

- workflow and step models
- sequential step execution
- retry
- delay
- wait-for-user

**Step 3: Run the M3 gate**

Required proof:

- workflow executor unit tests pass
- step failure state is visible
- human resume works
- trigger -> workflow -> completion E2E works

**Step 4: Freeze M3**

Only after that may templates/packages start.

### Task 5: Execute M4 Templates and Packages

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m4-templates-packages-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m4-templates-packages-implementation-plan.md`

**Step 1: Formalize the manifest**

Do this before import/export UI.

**Step 2: Implement package export/import task-by-task**

Must cover:

- manifest creation
- manifest validation
- package export
- package import
- template library

**Step 3: Run the M4 gate**

Required proof:

- round-trip package validation
- import/export tests
- install -> activate -> run -> inspect E2E

**Step 4: Freeze M4**

Only after package behavior is stable may team governance start.

### Task 6: Execute M5 Team Governance

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m5-team-governance-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m5-team-governance-implementation-plan.md`

**Step 1: Add ownership and visibility first**

Approval and audit depend on those fields.

**Step 2: Implement governance task-by-task**

Must cover:

- ownership
- visibility
- approval
- audit
- shared template publishing

**Step 3: Run the M5 gate**

Required proof:

- permission matrix tests
- approval flow tests
- audit record tests
- approval-required execution E2E

**Step 4: Freeze M5**

Only then may platform work begin.

### Task 7: Execute M6 Open Platform

**Files:**
- Milestone brief: `docs/plans/2026-03-28-automation-os-m6-open-platform-milestone.md`
- Implementation plan: `docs/plans/2026-03-28-automation-os-m6-open-platform-implementation-plan.md`

**Step 1: Lock the public contract before plugin breadth**

Public schema stability matters more than connector count.

**Step 2: Implement platform task-by-task**

Must cover:

- webhook ingestion
- external event schema
- plugin action contract
- validation and quotas
- connector management surface

**Step 3: Run the M6 gate**

Required proof:

- contract tests
- plugin sandbox tests
- external event -> run E2E

**Step 4: Close the program lane**

Record the final shipped state of the Automation OS rollout in the same worktree before branching or cleanup.

### Task 8: Cross-Milestone Control Rules

**Files:**
- No code changes required
- Applies to every milestone pair above

**Step 1: Never run milestones in parallel**

Only one milestone may be in active implementation at a time.

**Step 2: Never absorb the next milestone as “while I’m here” work**

If a change clearly belongs to the next milestone, stop and defer it.

**Step 3: Keep milestone verification isolated**

Each milestone must have its own proof bundle:

- tests
- static checks
- acceptance run
- notes on residual risk

**Step 4: Use the same worktree from start to finish**

No new worktree is allowed unless the entire program is intentionally restarted.

**Step 5: If a milestone gate fails, do not advance**

Fix the failing gate or explicitly record the blocker in the worktree before pausing.
