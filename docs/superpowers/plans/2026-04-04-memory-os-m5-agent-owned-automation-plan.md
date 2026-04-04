# Memory OS M5 Agent-Owned Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 agent-owned automation 真正接入现有 automation runtime，让 user-owned 和 agent-owned job 在后端和前端都可区分、可治理，并且执行层保持复用现有 scheduler/executor。

**Architecture:** 本阶段不重写 automation runtime。本质上是在现有 `AutomationJob` 和 automation UI 上增加 governance semantics：owner_type、mutability、provenance 和最小的 UI 行为约束。后端先提供分组读取和受限更新，前端再基于这些字段隐藏编辑入口、显式标记 agent-owned job。

**Tech Stack:** FastAPI, Pydantic, existing automation service/router, React, TypeScript, node:test contract tests, pytest

---

## File Structure

### Modified Backend Files

- `backend/packages/harness/nion/automation/service.py`
- `backend/app/gateway/routers/automation.py`
- `backend/tests/test_automation_router.py`

### Modified Frontend Files

- `frontend/src/core/automation/types.ts`
- `frontend/src/core/automation/api.ts`
- `frontend/src/components/workspace/automation/automation-job-section.tsx`
- `frontend/src/components/workspace/automation/automation-list-panel.tsx`
- `frontend/src/components/workspace/automation/automation-job-section.contract.test.ts`

## Task 1: Add Backend Owner-Aware Listing

**Files:**
- Modify: `backend/app/gateway/routers/automation.py`
- Modify: `backend/tests/test_automation_router.py`

- [ ] **Step 1: Write the failing router test**

```python
def test_list_jobs_supports_owner_type_filter(client: TestClient):
    first = client.post(
        "/api/automation/jobs",
        json={
            "name": "User reminder",
            "prompt": "remember",
            "schedule_kind": "interval",
            "schedule_value": "PT30M",
            "owner_type": "user",
        },
    )
    second = client.post(
        "/api/automation/jobs",
        json={
            "name": "Agent refresh",
            "prompt": "review memory",
            "schedule_kind": "interval",
            "schedule_value": "PT30M",
            "owner_type": "agent",
            "mutability": "pause_only",
        },
    )

    filtered = client.get("/api/automation/jobs?owner_type=agent")
    body = filtered.json()

    assert filtered.status_code == 200
    assert len(body["jobs"]) == 1
    assert body["jobs"][0]["owner_type"] == "agent"
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_automation_router.py -q
```

Expected: query filter unsupported

- [ ] **Step 3: Implement optional `owner_type` filter**

Add optional query parameter to `GET /api/automation/jobs`, filtering on `AutomationJob.owner_type`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_automation_router.py -q
```

Expected: PASS

## Task 2: Prevent Agent-Owned Jobs From General Editing

**Files:**
- Modify: `backend/packages/harness/nion/automation/service.py`
- Modify: `backend/tests/test_automation_router.py`

- [ ] **Step 1: Write the failing restricted-update test**

```python
def test_agent_owned_job_rejects_general_patch(client: TestClient):
    created = client.post(
        "/api/automation/jobs",
        json={
            "name": "Agent refresh",
            "prompt": "review memory",
            "schedule_kind": "interval",
            "schedule_value": "PT30M",
            "owner_type": "agent",
            "mutability": "pause_only",
        },
    )
    job_id = created.json()["job"]["id"]

    response = client.patch(
        f"/api/automation/jobs/{job_id}",
        json={"prompt": "changed by user"},
    )

    assert response.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_automation_router.py -q
```

Expected: PATCH still succeeds

- [ ] **Step 3: Enforce mutability in `AutomationService.update_job()`**

If `job.owner_type == "agent"` and `job.mutability == "pause_only"`, reject non-pause/resume updates with `PermissionError`.

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_automation_router.py -q
```

Expected: PASS

## Task 3: Expose Ownership Fields In Frontend Types

**Files:**
- Modify: `frontend/src/core/automation/types.ts`

- [ ] **Step 1: Add frontend type fields**

Extend `AutomationJob` with:

```ts
owner_type: "user" | "agent";
owner_id: string;
mutability: "editable" | "pause_only";
provenance_memory_id?: string | null;
provenance_learning_id?: string | null;
visible_in_ui: boolean;
policy_flags: Record<string, unknown>;
```

- [ ] **Step 2: Verify typecheck locally for this file’s dependents**

Run:

```bash
pnpm --dir frontend test automation-job-section.contract.test.ts
```

Expected: may fail before UI is updated, but types compile path should be ready after follow-up edits

## Task 4: Mark Agent-Owned Jobs In UI

**Files:**
- Modify: `frontend/src/components/workspace/automation/automation-job-section.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-job-section.contract.test.ts`

- [ ] **Step 1: Write or extend contract test**

Add assertion that agent-owned jobs show a visible label such as `Agent` / `智能体创建`.

- [ ] **Step 2: Run contract test to verify it fails**

Run:

```bash
pnpm --dir frontend test automation-job-section.contract.test.ts
```

Expected: label missing

- [ ] **Step 3: Implement minimal label and disable edit affordance**

In `automation-job-section.tsx`:

- render owner badge
- if `owner_type === "agent"` and `mutability === "pause_only"`, hide or disable edit entry
- keep pause/resume controls available

- [ ] **Step 4: Re-run contract test**

Run:

```bash
pnpm --dir frontend test automation-job-section.contract.test.ts
```

Expected: PASS

## Task 5: Verification Sweep

- [ ] **Step 1: Run backend automation tests**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest tests/test_automation_router.py -q
```

Expected: PASS

- [ ] **Step 2: Run focused frontend contract test**

Run:

```bash
pnpm --dir frontend test automation-job-section.contract.test.ts
```

Expected: PASS

- [ ] **Step 3: Run Memory OS regression subset**

Run:

```bash
cd backend && ./.venv/bin/python -m pytest \
  tests/test_memory_os_governance.py \
  tests/test_memory_growth_router.py \
  tests/test_memory_os_heartbeat.py \
  tests/test_memory_os_context_pack.py -q
```

Expected: PASS

## Execution Handoff

Plan complete and saved to `/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/superpowers/plans/2026-04-04-memory-os-m5-agent-owned-automation-plan.md`.
