# Automation Advanced Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the automation module from a simple reminder/task form into a unified automation creator with richer schedule modeling, clearer default vs advanced boundaries, and more actionable job management.

**Architecture:** Keep the existing automation backend and query invalidation model, but add a structured schedule-definition layer that can represent single-run, recurring, custom cron, and interval jobs without exposing raw cron to normal users. Replace the split reminder/task creation forms with one shared creator shell, reuse the current jobs/runs/status APIs where possible, and add narrowly-scoped backend contract extensions only where the current API cannot express the designed behaviors.

**Tech Stack:** FastAPI, Pydantic, croniter, SQLite repository layer, React 19, Next.js App Router, TypeScript, TanStack Query, existing Nion i18n locale system, node:test contract tests, pytest

---

## Preflight Constraints

- Current branch is not clean. There are unrelated in-progress automation changes in both `frontend` and `backend`. Implementation must stage only the files for the task being executed and must not revert unrelated work.
- The existing automation domain already supports `schedule_kind` values `once`, `interval`, `cron`, and `event`. The plan should build on that instead of creating a second scheduling system.
- The current frontend creation path is hardcoded around `ReminderForm` and `ScheduledTaskForm`. The new creator must replace that split instead of layering more fields into both forms.
- Do not expose raw cron expressions in the default user flow.
- Keep existing `jobs`, `runs`, and `status` query invalidation behavior unless a task explicitly changes that contract.

## File Structure And Ownership

### Frontend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-creator.tsx`
  - Shared creation shell for reminder, scheduled task, and later event-task entry points.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/schedule-builder.tsx`
  - UI for single-run, daily, weekdays, weekly, interval, and custom schedule inputs.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-preview-card.tsx`
  - Natural-language summary for trigger, action, and delivery configuration.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/schedule-definition.ts`
  - Frontend schedule model and conversion helpers.
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/schedule-definition.test.ts`
  - Unit coverage for schedule model conversion and preview text input shaping.

### Frontend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-page.tsx`
  - Replace split reminder/task forms with the unified creator and simplify page structure.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-kind-tabs.tsx`
  - Reduce tab emphasis if the page shell changes from type-first to task-first.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-job-section.tsx`
  - Reorder card information and add room for richer next-run / quick actions.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-overview-cards.tsx`
  - Shift overview emphasis toward “what is coming next” and creator entry support.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-history-section.tsx`
  - Add filter-ready structure and clearer failure detail affordances.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/draft-builder.ts`
  - Stop hardcoding all non-event jobs to a three-option cadence model.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/draft-builder.test.ts`
  - Replace simple-form-only coverage with schedule-definition-driven coverage.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/presentation.ts`
  - Generate richer schedule labels from structured metadata.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/types.ts`
  - Add structured request types needed by the creator shell and quick-action overrides.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`
  - Add copy for unified creator, schedule builder, preview, and quick actions.

### Backend files to create

- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_schedule_presets.py`
  - Tests for richer schedule preset derivation and metadata normalization.

### Backend files to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/automation.py`
  - Accept richer schedule metadata and optional quick-action endpoints if needed.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py`
  - Add typed metadata fields or policy fields introduced by advanced features.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/service.py`
  - Normalize new schedule metadata and preserve structured meaning on create/update.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/schedule_presets.py`
  - Support richer presets including single-run, interval, custom cron, and future monthly-style structures.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/scheduler.py`
  - Compute next runs correctly for the new preset set and any override model added in this plan.
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_router.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_scheduler.py`
  - Lock the richer schedule contract at the gateway and scheduler layers.

### Docs to modify

- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/07-automation/README.md`
  - Refresh test guidance for the unified creator and richer schedule coverage.

## Scope Boundary

This plan intentionally excludes:

- workflow builder redesign
- template library redesign
- open-platform/webhook productization
- full governance control-plane rebuild

Only the advanced features that directly improve reminder/task creation and management are included here.

## Task 1: Lock The New Schedule Contract In Tests

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_schedule_presets.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/draft-builder.test.ts`

- [ ] **Step 1: Write the failing backend preset test for single-run schedules**

```python
from nion.automation.schedule_presets import build_schedule_fields


def test_build_schedule_fields_supports_once_preset_with_run_at():
    fields = build_schedule_fields(
        preset="once",
        timezone="Asia/Shanghai",
        run_at="2026-04-03T12:00:00Z",
    )

    assert fields.schedule_kind == "once"
    assert fields.schedule_value == "2026-04-03T12:00:00Z"
    assert fields.schedule_metadata == {"run_at": "2026-04-03T12:00:00Z"}
```

- [ ] **Step 2: Add the failing backend preset test for custom cron passthrough**

```python
def test_build_schedule_fields_supports_custom_cron_expression():
    fields = build_schedule_fields(
        preset="cron",
        timezone="UTC",
        cron_expression="0 9 1 * *",
    )

    assert fields.schedule_kind == "cron"
    assert fields.schedule_value == "0 9 1 * *"
    assert fields.schedule_metadata == {"cron_expression": "0 9 1 * *"}
```

- [ ] **Step 3: Add the failing frontend builder test for one-time reminders**

```ts
void test("builds a one-time reminder request from schedule definition", () => {
  const draft = buildAutomationDraftRequest({
    kind: "reminder",
    name: "报销截止提醒",
    prompt: "提醒我今天下班前提交报销",
    schedule: {
      preset: "once",
      timezone: "Asia/Shanghai",
      runAt: "2026-04-03T12:00:00Z",
    },
  });

  assert.equal(draft.schedule_kind, "once");
  assert.equal(draft.schedule_value, "2026-04-03T12:00:00Z");
  assert.deepEqual(draft.schedule_metadata, {
    run_at: "2026-04-03T12:00:00Z",
  });
});
```

- [ ] **Step 4: Run the targeted failing tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_automation_schedule_presets.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/automation/draft-builder.test.ts
```

Expected:
- backend test file fails because it does not exist yet
- frontend test fails because `buildAutomationDraftRequest` does not accept `schedule`

- [ ] **Step 5: Commit the failing-test checkpoint**

```bash
git add backend/tests/test_automation_schedule_presets.py frontend/src/core/automation/draft-builder.test.ts
git commit -m "test: lock richer automation schedule contract"
```

## Task 2: Introduce A Shared Frontend Schedule Definition Layer

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/schedule-definition.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/schedule-definition.test.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/draft-builder.ts`

- [ ] **Step 1: Create the schedule-definition type module**

```ts
export type AutomationScheduleDefinition =
  | {
      preset: "once";
      timezone: string;
      runAt: string;
    }
  | {
      preset: "daily" | "weekdays";
      timezone: string;
      timeOfDay: string;
    }
  | {
      preset: "weekly";
      timezone: string;
      timeOfDay: string;
      weekdays: number[];
    }
  | {
      preset: "interval";
      timezone: string;
      intervalMinutes: number;
    }
  | {
      preset: "cron";
      timezone: string;
      cronExpression: string;
    };
```

- [ ] **Step 2: Add a conversion helper that returns the existing request shape**

```ts
export function buildScheduleRequestFields(
  input: AutomationScheduleDefinition,
): Pick<
  AutomationJobCreateInput,
  "schedule_preset" | "schedule_kind" | "schedule_value" | "schedule_timezone" | "schedule_metadata"
> {
  // branch on preset and produce the existing backend shape
}
```

- [ ] **Step 3: Replace the legacy `cadence/timeOfDay` draft-builder input**

Update `draft-builder.ts` so the new input shape is:

```ts
export type AutomationDraftInput = {
  kind: AutomationJobKind;
  name: string;
  prompt: string;
  schedule: AutomationScheduleDefinition;
  deliveryMode?: AutomationDeliveryMode;
  deliveryTargets?: Array<Record<string, unknown>>;
  skills?: string[];
};
```

- [ ] **Step 4: Add focused schedule-definition tests**

```ts
void test("converts weekly schedule definition into cron request fields", () => {
  const result = buildScheduleRequestFields({
    preset: "weekly",
    timezone: "Asia/Shanghai",
    timeOfDay: "09:30",
    weekdays: [1, 3, 5],
  });

  assert.equal(result.schedule_kind, "cron");
  assert.equal(result.schedule_value, "30 9 * * 1,3,5");
});
```

- [ ] **Step 5: Run the frontend unit tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/automation/schedule-definition.test.ts src/core/automation/draft-builder.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/core/automation/schedule-definition.ts \
  frontend/src/core/automation/schedule-definition.test.ts \
  frontend/src/core/automation/types.ts \
  frontend/src/core/automation/draft-builder.ts \
  frontend/src/core/automation/draft-builder.test.ts
git commit -m "Add shared automation schedule definition layer"
```

## Task 3: Extend Backend Schedule Normalization To Match The New Definition Layer

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/schedule_presets.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_schedule_presets.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_router.py`

- [ ] **Step 1: Add the failing router test for one-time reminders**

```python
def test_create_automation_job_accepts_once_preset_with_run_at():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs",
            json={
                "name": "报销提醒",
                "prompt": "提醒我提交报销",
                "job_kind": "reminder",
                "schedule_preset": "once",
                "schedule_timezone": "Asia/Shanghai",
                "schedule_metadata": {"run_at": "2026-04-03T12:00:00Z"},
                "delivery_mode": "local",
                "delivery_targets": [],
                "skills": [],
            },
        )

    assert response.status_code == 201
```

- [ ] **Step 2: Update `build_schedule_fields` to cover the full shared schedule-definition set**

The function must support:
- `once`
- `daily`
- `weekdays`
- `weekly` with multiple weekdays
- `interval`
- `cron`

and must preserve structured metadata instead of inferring only from `schedule_kind`.

- [ ] **Step 3: Update `AutomationService.create_job()` so preset-first creation remains the product path**

Keep the current low-level compatibility path, but ensure:

- preset-first payloads are normalized through `build_schedule_fields`
- low-level `schedule_kind/schedule_value` payloads still work
- `schedule_metadata` keeps rich fields like `run_at`, `weekdays`, and `cron_expression`

- [ ] **Step 4: Run backend tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_automation_schedule_presets.py tests/test_automation_router.py -q
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/automation/schedule_presets.py \
  backend/packages/harness/nion/automation/service.py \
  backend/tests/test_automation_schedule_presets.py \
  backend/tests/test_automation_router.py
git commit -m "Normalize richer automation schedule presets"
```

## Task 4: Replace Split Reminder/Task Forms With A Unified Creator

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-creator.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/schedule-builder.tsx`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-preview-card.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/reminder-form.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/scheduled-task-form.tsx`

- [ ] **Step 1: Add a failing contract test that the page imports the unified creator**

```ts
void test("automation page uses the shared automation creator", async () => {
  const source = await readFile(
    new URL("./automation-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /AutomationCreator/);
  assert.doesNotMatch(source, /<ReminderForm/);
  assert.doesNotMatch(source, /<ScheduledTaskForm/);
});
```

- [ ] **Step 2: Build `schedule-builder.tsx` around the shared schedule definition**

The component should expose:

```ts
type ScheduleBuilderProps = {
  value: AutomationScheduleDefinition;
  onChange: (next: AutomationScheduleDefinition) => void;
};
```

and support:
- single date/time
- daily
- weekdays
- weekly with weekday chips
- interval minutes
- custom cron in advanced mode only

- [ ] **Step 3: Build `automation-preview-card.tsx`**

Render natural-language summary lines like:

```ts
"将在 2026 年 4 月 3 日 20:00 提醒你"
"将在每个工作日 09:00 运行提示词"
"结果会发送到当前线程"
```

- [ ] **Step 4: Build `automation-creator.tsx`**

The creator should own:
- task type selection
- name/prompt inputs
- schedule builder
- action selection
- delivery surface
- advanced section toggles
- preview card
- submit button

It should call `onSubmit()` with the existing `AutomationJobCreateInput`.

- [ ] **Step 5: Replace `ReminderForm` and `ScheduledTaskForm` usage in `automation-page.tsx`**

Use one creator shell in the primary create area instead of one form per tab. Keep the existing job lists for now.

- [ ] **Step 6: Run frontend contract tests and lint for touched files**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/automation/*.contract.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm eslint src/components/workspace/automation/automation-page.tsx src/components/workspace/automation/automation-creator.tsx src/components/workspace/automation/schedule-builder.tsx src/components/workspace/automation/automation-preview-card.tsx src/core/automation/draft-builder.ts src/core/automation/schedule-definition.ts
```

Expected: touched-file checks pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/workspace/automation/automation-creator.tsx \
  frontend/src/components/workspace/automation/schedule-builder.tsx \
  frontend/src/components/workspace/automation/automation-preview-card.tsx \
  frontend/src/components/workspace/automation/automation-page.tsx \
  frontend/src/components/workspace/automation/reminder-form.tsx \
  frontend/src/components/workspace/automation/scheduled-task-form.tsx
git commit -m "Build unified automation creator"
```

## Task 5: Reframe Job Cards Around User-Relevant Information

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-job-section.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/presentation.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/en-US.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/i18n/locales/types.ts`

- [ ] **Step 1: Add a failing contract test that technical badges are not shown inline by default**

```ts
void test("job cards do not expose owner or visibility badges in the primary header", async () => {
  const source = await readFile(
    new URL("./automation-job-section.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /owner_id:/);
  assert.doesNotMatch(source, /visibility:/);
  assert.doesNotMatch(source, /approval_policy:/);
});
```

- [ ] **Step 2: Reorder the job card content**

Make the visible hierarchy:
- job name
- state badge
- next run
- prompt summary
- last result

Move technical metadata to a collapsed secondary row or detail link.

- [ ] **Step 3: Add quick-action placeholders for future skip/snooze**

Do not implement new API calls in this task. Add non-interactive affordance slots or disabled buttons behind feature flags so the layout can absorb future quick actions cleanly.

- [ ] **Step 4: Improve schedule label formatting**

Update `formatScheduleLabel()` so:
- one-time schedules read as a concrete date/time
- weekly schedules with multiple weekdays are readable
- custom cron without friendly metadata falls back cleanly

- [ ] **Step 5: Run touched frontend tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/automation/*.contract.test.ts src/core/automation/draft-builder.test.ts src/core/automation/schedule-definition.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/workspace/automation/automation-job-section.tsx \
  frontend/src/core/automation/presentation.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/en-US.ts \
  frontend/src/core/i18n/locales/types.ts
git commit -m "Refocus automation job cards on user-facing state"
```

## Task 6: Add Retry And Guardrail Policy Plumbing For Advanced Mode

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/automation/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/automation.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/types.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-creator.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_router.py`

- [ ] **Step 1: Add the failing router test for retry policy passthrough**

```python
def test_create_automation_job_accepts_retry_policy():
    service = FakeAutomationService()
    with _client(service) as client:
        response = client.post(
            "/api/automation/jobs",
            json={
                "name": "Digest job",
                "prompt": "Summarize updates",
                "schedule_preset": "daily",
                "schedule_timezone": "UTC",
                "schedule_metadata": {"time_of_day": "09:00"},
                "delivery_mode": "local",
                "delivery_targets": [],
                "skills": [],
                "retry_policy": {"max_attempts": 2, "backoff_minutes": 10},
            },
        )

    assert response.status_code == 201
    assert service.calls[0][1]["retry_policy"]["max_attempts"] == 2
```

- [ ] **Step 2: Add policy fields to the domain model**

Extend `AutomationJob` and request schemas with:

```python
retry_policy: dict[str, Any] = Field(default_factory=dict)
guardrail_policy: dict[str, Any] = Field(default_factory=dict)
```

- [ ] **Step 3: Preserve the new policy fields in service create/update paths**

Normalize them the same way `approval_policy` is handled today.

- [ ] **Step 4: Add advanced creator controls for retry and fail-pause**

Expose only two controls in advanced mode:
- retry count
- pause after consecutive failures

Avoid building a full governance UI in this task.

- [ ] **Step 5: Run backend and touched frontend tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_automation_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm eslint src/components/workspace/automation/automation-creator.tsx src/core/automation/types.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/automation/models.py \
  backend/packages/harness/nion/automation/service.py \
  backend/app/gateway/routers/automation.py \
  backend/tests/test_automation_router.py \
  frontend/src/core/automation/types.ts \
  frontend/src/components/workspace/automation/automation-creator.tsx
git commit -m "Add advanced retry and guardrail policy controls"
```

## Task 7: Refresh Overview And History For The New Creator Flow

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-overview-cards.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-history-section.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/07-automation/README.md`

- [ ] **Step 1: Add a new overview focus line for the next upcoming run**

Use the current jobs list to derive the nearest `next_run_at` and show it alongside the existing status cards.

- [ ] **Step 2: Add status filtering structure to history**

Add a simple local filter for:
- all
- failed
- succeeded

Keep it client-side for now.

- [ ] **Step 3: Update the automation test guide**

Refresh the doc so it explicitly covers:
- one-time reminders
- unified creator flow
- custom schedule validation
- richer job-card hierarchy

- [ ] **Step 4: Run frontend checks for touched files**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm eslint src/components/workspace/automation/automation-overview-cards.tsx src/components/workspace/automation/automation-history-section.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/automation/automation-overview-cards.tsx \
  frontend/src/components/workspace/automation/automation-history-section.tsx \
  docs/test/07-automation/README.md
git commit -m "Refresh automation overview and history for advanced creator"
```

## Task 8: Full Verification Pass

**Files:**
- Verify only

- [ ] **Step 1: Run backend automation regression checks**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest \
  tests/test_automation_schedule_presets.py \
  tests/test_automation_router.py \
  tests/test_automation_scheduler.py -q
```

Expected: PASS.

- [ ] **Step 2: Run frontend automation unit and contract checks**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test \
  src/core/automation/draft-builder.test.ts \
  src/core/automation/schedule-definition.test.ts \
  src/components/workspace/automation/*.contract.test.ts
```

Expected: PASS.

- [ ] **Step 3: Run touched-file lint/type verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm eslint \
  src/components/workspace/automation \
  src/core/automation \
  src/core/i18n/locales/zh-CN.ts \
  src/core/i18n/locales/en-US.ts \
  src/core/i18n/locales/types.ts
```

Expected: PASS for touched files.

- [ ] **Step 4: Manually verify the creator flow with agent-browser**

Run:
```bash
agent-browser open http://localhost:2026/workspace/automation
agent-browser snapshot -i
```

Verify:
- one-time reminder can be configured
- daily / weekdays / weekly / interval / custom schedule options are visible in the creator
- preview card updates when schedule changes
- created job appears with improved next-run labeling

- [ ] **Step 5: Commit the verification checkpoint**

```bash
git add -A
git commit -m "Verify automation advanced features rollout"
```

## Self-Review

### Spec coverage

This plan covers the approved advanced-features spec items that affect shipped behavior now:

- richer schedule modeling
- unified creator
- natural-language preview
- default vs advanced grouping
- job-card hierarchy cleanup
- retry / fail-pause governance basics
- overview/history updates

Gaps intentionally left out because they are outside the approved scope:

- template library redesign
- workflow redesign
- full governance center
- multi-team permissions model

### Placeholder scan

No `TODO`, `TBD`, or “implement later” markers are left in the plan. Each task names exact files, commands, and validation points.

### Type consistency

The plan consistently uses:

- `AutomationScheduleDefinition` as the shared frontend model
- existing backend `schedule_preset / schedule_kind / schedule_value / schedule_metadata` as the transport layer
- `retry_policy` and `guardrail_policy` as the two new advanced-mode policy surfaces

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-03-30-automation-advanced-features-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration

2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
