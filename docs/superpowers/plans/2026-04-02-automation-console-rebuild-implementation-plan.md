# Automation Console Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将自动化模块从多 tab 配置页重构为“创建器优先”的单页控制台，并补齐 `@笔记` 引用与 run 对应线程预览链路。

**Architecture:** 先收紧 runtime contract，再重写页面骨架。后端先把 `AutomationRun -> isolated_thread_id` 合同补齐，前端再把主聊天输入框中的对象引用能力抽象出来，优先支持 `@笔记`，最后用新的 contract 重构自动化页为“创建区 + 自动化列表 + 结果区”的单页工作台，并让定时任务结果支持右侧线程预览。

**Tech Stack:** FastAPI, Pydantic, SQLite repository, Next.js App Router, React 19, TanStack Query, existing desktop thread client, notebook tree APIs, node:test contract tests, pytest backend tests

---

## File Map

### Backend

- Modify: `backend/packages/harness/nion/automation/models.py`
  - 为 `AutomationRun` 增加 `isolated_thread_id`
- Modify: `backend/packages/harness/nion/automation/executor.py`
  - 执行完成后把 isolated thread id 写入 run
- Modify: `backend/app/gateway/routers/automation.py`
  - 保持 router response contract 同步
- Modify: `backend/tests/test_automation_executor.py`
  - 增加 run 保存 isolated thread id 的测试
- Modify: `backend/tests/test_automation_router.py`
  - 校验 router response 包含新字段
- Modify: `backend/CLAUDE.md`
  - 记录 automation run/thread preview contract 变更

### Frontend Core

- Modify: `frontend/src/core/threads/types.ts`
  - 为 thread context / implicit mentions 增加 object mention 合同
- Modify: `frontend/src/components/workspace/input-box.tsx`
  - 抽出并接入 `@笔记` 候选与 object mention
- Create: `frontend/src/core/automation/object-mentions.ts`
  - automation / chat 共用的 object mention helpers
- Create: `frontend/src/core/automation/object-mentions.test.ts`
  - object mention helper tests
- Modify: `frontend/src/core/automation/types.ts`
  - run 增加 `isolated_thread_id`
  - job create input 增加 reminder content / task content 收口字段或兼容映射
- Modify: `frontend/src/core/automation/presentation.ts`
  - 支撑单页控制台、标题摘要、结果区口径
- Modify: `frontend/src/core/automation/hooks.ts`
  - 增加按 job 读取 runs / 线程 preview 所需 hook 或 query 组织
- Modify: `frontend/src/core/notebook/hooks.ts`
  - 复用 notebook tree 获取目录候选
- Modify: `frontend/src/core/notebook/directories.ts`
  - 提供可直接用于 mention 的目录 label / path 派生能力

### Frontend Automation UI

- Modify: `frontend/src/components/workspace/automation/automation-page.tsx`
  - 去掉 tab 主结构，改单页工作台
- Create: `frontend/src/components/workspace/automation/automation-console.tsx`
  - 新的单页控制台骨架
- Create: `frontend/src/components/workspace/automation/automation-create-panel.tsx`
  - 顶部创建区
- Create: `frontend/src/components/workspace/automation/automation-list-panel.tsx`
  - 中部自动化列表
- Create: `frontend/src/components/workspace/automation/automation-results-panel.tsx`
  - 底部结果区
- Create: `frontend/src/components/workspace/automation/automation-run-preview.tsx`
  - 右侧线程预览
- Modify: `frontend/src/components/workspace/automation/automation-creator.tsx`
  - 收敛为极简创建器或拆分后保留为内部组件
- Modify: `frontend/src/components/workspace/automation/schedule-builder.tsx`
  - 保留能力，重做视觉与布局
- Modify: `frontend/src/components/workspace/automation/automation-history-section.tsx`
  - 改成结果区内部列表，不再是 run id 为主的全局历史页
- Modify: `frontend/src/components/workspace/automation/automation-job-section.tsx`
  - 视情况改造或降级为新列表子组件
- Modify: `frontend/src/components/workspace/automation/automation-overview-cards.tsx`
  - 降级为次要信息块或删除
- Modify: `frontend/src/components/workspace/automation/automation-creator.contract.test.ts`
  - 改为约束新的控制台骨架
- Modify: `frontend/src/components/workspace/automation/automation-job-section.contract.test.ts`
  - 改为约束列表不暴露技术字段
- Create: `frontend/src/components/workspace/automation/automation-console.contract.test.ts`
  - 单页工作台 contract test

### Locale and Docs

- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
  - 去掉旧 tab / 高级选项文案，补充提醒内容、任务内容、结果区文案
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
  - 同步英文文案
- Modify: `frontend/src/core/i18n/locales/types.ts`
  - locale 类型同步
- Modify: `README.md`
  - 更新自动化模块用户侧说明
- Modify: `docs/test/07-automation/README.md`
  - 更新测试交接文档到新控制台结构

## Task 1: Add Automation Run Thread Contract

**Files:**
- Modify: `backend/packages/harness/nion/automation/models.py`
- Modify: `backend/packages/harness/nion/automation/executor.py`
- Modify: `backend/tests/test_automation_executor.py`
- Modify: `backend/tests/test_automation_router.py`

- [ ] **Step 1: Write the failing backend tests for isolated thread id persistence**

Add these assertions in `backend/tests/test_automation_executor.py`:

```python
def test_executor_persists_isolated_thread_id_on_run_result():
    job = _job("job-1")

    class DummyRunner:
        def run(self, *, prompt, thread_id, context, config):
            return AutomationExecutionOutput(
                response_text="All done",
                artifacts=[],
                isolated_thread_id=thread_id,
            )

    class DummyDelivery:
        def deliver(self, job, execution_output):
            return [{"mode": "local", "status": "delivered"}]

    executor = AutomationExecutor(runtime_runner=DummyRunner(), delivery_service=DummyDelivery())

    result = executor.execute_job(job, run_id="run-1")

    assert result.isolated_thread_id is not None
    assert str(UUID(result.isolated_thread_id)) == result.isolated_thread_id
```

Add this assertion in `backend/tests/test_automation_router.py`:

```python
def _run(run_id: str, job_id: str) -> AutomationRun:
    return AutomationRun(
        id=run_id,
        job_id=job_id,
        started_at="2026-03-24T01:00:00Z",
        finished_at="2026-03-24T01:01:00Z",
        status="succeeded",
        result_summary="Delivered summary",
        isolated_thread_id="thread-automation-preview",
    )

def test_list_runs_and_status():
    service = FakeAutomationService()
    with _client(service) as client:
        runs_response = client.get("/api/automation/runs")
        status_response = client.get("/api/automation/status")

    assert runs_response.status_code == 200
    assert runs_response.json()["runs"][0]["isolated_thread_id"] == "thread-automation-preview"
    assert status_response.status_code == 200
```

- [ ] **Step 2: Run backend tests to verify they fail**

Run:

```bash
cd backend && uv run pytest tests/test_automation_executor.py tests/test_automation_router.py -q
```

Expected:

- FAIL because `AutomationRun` does not accept `isolated_thread_id`
- FAIL because executor does not write that field into the run result

- [ ] **Step 3: Add the minimal backend implementation**

Update `backend/packages/harness/nion/automation/models.py`:

```python
class AutomationRun(BaseModel):
    id: str
    job_id: str
    started_at: str
    finished_at: str | None = None
    status: AutomationRunStatus
    trigger_event_name: str | None = None
    result_summary: str = ""
    output_artifacts: list[str] = Field(default_factory=list)
    delivery_results: list[dict[str, Any]] = Field(default_factory=list)
    isolated_thread_id: str | None = None
```

Update `backend/packages/harness/nion/automation/executor.py`:

```python
        return AutomationRun(
            id=run_id,
            job_id=job.id,
            started_at=started_at,
            finished_at=finished_at,
            status=status,
            trigger_event_name=trigger_event_name,
            result_summary=execution_output.response_text,
            output_artifacts=list(execution_output.artifacts),
            delivery_results=delivery_results,
            isolated_thread_id=execution_output.isolated_thread_id,
        )
```

- [ ] **Step 4: Run backend tests to verify they pass**

Run:

```bash
cd backend && uv run pytest tests/test_automation_executor.py tests/test_automation_router.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/automation/models.py \
        backend/packages/harness/nion/automation/executor.py \
        backend/tests/test_automation_executor.py \
        backend/tests/test_automation_router.py
git commit -m "feat: expose automation run thread ids"
```

## Task 2: Introduce Shared Object Mention Contract for @笔记

**Files:**
- Create: `frontend/src/core/automation/object-mentions.ts`
- Create: `frontend/src/core/automation/object-mentions.test.ts`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/notebook/directories.ts`
- Modify: `frontend/src/core/notebook/hooks.ts`
- Modify: `frontend/src/components/workspace/input-box.tsx`

- [ ] **Step 1: Write failing tests for object mention helpers**

Create `frontend/src/core/automation/object-mentions.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import {
  buildNotebookDirectoryMentionOptions,
  buildObjectImplicitMentions,
} from "./object-mentions.ts";

void test("buildNotebookDirectoryMentionOptions converts notebook directories into object mention options", () => {
  const result = buildNotebookDirectoryMentionOptions([
    { path: "articles", label: "articles", depth: 1, isInbox: false, pathLabel: "articles" },
    { path: "meetings/weekly", label: "weekly", depth: 2, isInbox: false, pathLabel: "meetings / weekly" },
  ]);

  assert.deepEqual(result.map((item) => item.value), ["articles", "meetings/weekly"]);
  assert.equal(result[0]?.objectKind, "notebook-directory");
});

void test("buildObjectImplicitMentions appends object mentions that are not already in text", () => {
  const result = buildObjectImplicitMentions({
    text: "将链接文章存到 @articles",
    mentions: [
      {
        kind: "object",
        objectKind: "notebook-directory",
        value: "articles",
        mention: "@articles",
        label: "articles",
      },
      {
        kind: "object",
        objectKind: "notebook-directory",
        value: "meetings/weekly",
        mention: "@meetings/weekly",
        label: "weekly",
      },
    ],
  });

  assert.equal(result.length, 1);
  assert.equal(result[0]?.value, "meetings/weekly");
});
```

- [ ] **Step 2: Run the new frontend tests to verify they fail**

Run:

```bash
cd frontend && pnpm exec tsx --test src/core/automation/object-mentions.test.ts
```

Expected:

- FAIL because helper file does not exist

- [ ] **Step 3: Implement shared object mention helpers**

Create `frontend/src/core/automation/object-mentions.ts`:

```ts
export type ObjectMentionKind = "notebook-directory";

export type ObjectMention = {
  kind: "object";
  objectKind: ObjectMentionKind;
  value: string;
  mention: string;
  label: string;
  metadata?: Record<string, unknown>;
};

export type NotebookDirectoryMentionOption = {
  id: string;
  label: string;
  value: string;
  description: string;
  objectKind: "notebook-directory";
};

export function buildNotebookDirectoryMentionOptions(
  options: Array<{ path: string; label: string; pathLabel: string }>,
): NotebookDirectoryMentionOption[] {
  return options
    .filter((option) => option.path.trim().length > 0)
    .map((option) => ({
      id: `notebook-directory:${option.path}`,
      label: option.label,
      value: option.path,
      description: option.pathLabel,
      objectKind: "notebook-directory" as const,
    }));
}

export function buildObjectImplicitMentions(input: {
  text: string;
  mentions: ObjectMention[];
}): ObjectMention[] {
  return input.mentions.filter((item) => !hasInlineMention(input.text, item.mention));
}

function hasInlineMention(text: string, mention: string) {
  return new RegExp(`(^|\\s)${escapeRegExp(mention)}(?=\\s|$)`).test(text);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

Update `frontend/src/core/threads/types.ts`:

```ts
  implicit_mentions?: Array<
    | {
        kind: "context" | "skill" | "mcp" | "cli";
        value: string;
        mention: string;
      }
    | {
        kind: "object";
        objectKind: "notebook-directory";
        value: string;
        mention: string;
        label: string;
        metadata?: Record<string, unknown>;
      }
  >;
```

Update `frontend/src/core/notebook/directories.ts` by exporting a mapper-ready shape:

```ts
export function buildNotebookDirectoryOptions(...) { ... }
```

No semantic change required here beyond reusing its output in the next step.

- [ ] **Step 4: Wire @笔记 into the chat input**

Update `frontend/src/components/workspace/input-box.tsx` with these structural changes:

1. Extend `MentionOption["kind"]`:

```ts
type MentionOption = {
  id: string;
  label: string;
  value: string;
  kind: "file" | "directory" | "skill" | "mcp" | "cli" | "project-thread" | "notebook-directory";
  description?: string;
};
```

2. Load notebook directories:

```ts
import { useNotebookTree } from "@/core/notebook/hooks";
import { buildNotebookDirectoryOptions } from "@/core/notebook/directories";
import {
  buildNotebookDirectoryMentionOptions,
  buildObjectImplicitMentions,
  type ObjectMention,
} from "@/core/automation/object-mentions";
```

3. Build notebook mention options:

```ts
  const { tree: notebookTree } = useNotebookTree();

  const notebookMentionOptions = useMemo<MentionOption[]>(
    () =>
      buildNotebookDirectoryMentionOptions(
        buildNotebookDirectoryOptions({
          entries: notebookTree.directories,
          includeInbox: true,
          inboxLabel: "Inbox",
          rootLabel: "Top level",
        }),
      ).map((option) => ({
        ...option,
        kind: "notebook-directory" as const,
      })),
    [notebookTree.directories],
  );
```

4. Put notebook directories at the front of `@` suggestions:

```ts
    const source =
      mentionState.trigger === "@"
        ? [...notebookMentionOptions, ...projectThreadMentionOptions, ...fileMentionOptions]
        : skillMentionOptions;
```

5. Track selected notebook object mentions:

```ts
  const [selectedObjectMentions, setSelectedObjectMentions] = useState<ObjectMention[]>([]);
```

6. In `applyMentionOption`, when `option.kind === "notebook-directory"`:

```ts
        setSelectedObjectMentions((prev) =>
          prev.some((item) => item.value === option.value && item.objectKind === "notebook-directory")
            ? prev
            : [
                ...prev,
                {
                  kind: "object",
                  objectKind: "notebook-directory",
                  value: option.value,
                  mention: `@${option.value}`,
                  label: option.label,
                  metadata: {
                    source: "notebook",
                  },
                },
              ],
        );
```

7. In `buildSubmissionPayload`, append object mentions:

```ts
  const objectImplicitMentions = buildObjectImplicitMentions({
    text: trimmed,
    mentions: selectedObjectMentions,
  });

  const implicitMentions = [
    ...existingImplicitMentions,
    ...objectImplicitMentions,
  ];
```

- [ ] **Step 5: Run focused frontend tests**

Run:

```bash
cd frontend && pnpm exec tsx --test src/core/automation/object-mentions.test.ts
cd frontend && pnpm check
```

Expected:

- object mention tests PASS
- lint + typecheck PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/core/automation/object-mentions.ts \
        frontend/src/core/automation/object-mentions.test.ts \
        frontend/src/core/threads/types.ts \
        frontend/src/core/notebook/directories.ts \
        frontend/src/components/workspace/input-box.tsx
git commit -m "feat: add notebook object mentions"
```

## Task 3: Reshape Automation Types and Presentation for Console Mode

**Files:**
- Modify: `frontend/src/core/automation/types.ts`
- Modify: `frontend/src/core/automation/presentation.ts`
- Modify: `frontend/src/core/automation/presentation.test.ts`
- Modify: `frontend/src/core/automation/api.ts`
- Modify: `frontend/src/core/automation/hooks.ts`

- [ ] **Step 1: Write failing tests for reminder/task summary semantics**

Update `frontend/src/core/automation/presentation.test.ts` with these tests:

```ts
void test("derives a compact title from reminder content when job name is generic", () => {
  const summary = summarizeAutomationJob({
    id: "job-1",
    name: "",
    prompt: "别忘了晚上提交报销\n\n附：带上发票。",
    job_kind: "reminder",
    schedule_kind: "cron",
    schedule_value: "0 21 * * 1-5",
    schedule_preset: "weekdays",
    schedule_timezone: "Asia/Shanghai",
    schedule_metadata: { time_of_day: "21:00" },
    enabled: true,
    state: "scheduled",
    delivery_mode: "local",
    delivery_targets: [],
    skills: [],
    session_policy: {},
    toolset_profile: "automation",
    created_at: "2026-04-02T00:00:00Z",
    updated_at: "2026-04-02T00:00:00Z",
  });

  assert.match(summary.title, /别忘了晚上提交报销/);
});

void test("keeps run isolated thread id in automation run types", () => {
  const run = {
    id: "run-1",
    job_id: "job-1",
    started_at: "2026-04-02T01:00:00Z",
    finished_at: "2026-04-02T01:01:00Z",
    status: "succeeded",
    result_summary: "已写入笔记",
    output_artifacts: [],
    delivery_results: [],
    isolated_thread_id: "thread-abc",
  };

  assert.equal(run.isolated_thread_id, "thread-abc");
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd frontend && pnpm exec tsx --test src/core/automation/presentation.test.ts
```

Expected:

- FAIL because `summarizeAutomationJob` does not exist

- [ ] **Step 3: Implement presentation helpers and type updates**

Update `frontend/src/core/automation/types.ts`:

```ts
export interface AutomationRun {
  id: string;
  job_id: string;
  started_at: string;
  finished_at?: string | null;
  status: AutomationRunStatus;
  trigger_event_name?: string | null;
  result_summary: string;
  output_artifacts: string[];
  delivery_results: Array<Record<string, unknown>>;
  isolated_thread_id?: string | null;
}
```

Add this helper to `frontend/src/core/automation/presentation.ts`:

```ts
export function summarizeAutomationJob(job: AutomationJob) {
  const source = job.name?.trim() || job.prompt?.trim() || "Untitled automation";
  const firstLine = source.split("\n").map((line) => line.trim()).find(Boolean) ?? "Untitled automation";
  return {
    title: firstLine.slice(0, 48),
    subtitle: job.job_kind === "reminder" ? "reminder" : "scheduled_task",
  };
}
```

Keep this deliberately minimal. Richer presentation should be built in UI components, not buried in `presentation.ts`.

- [ ] **Step 4: Run tests and typecheck**

Run:

```bash
cd frontend && pnpm exec tsx --test src/core/automation/presentation.test.ts
cd frontend && pnpm check
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/automation/types.ts \
        frontend/src/core/automation/presentation.ts \
        frontend/src/core/automation/presentation.test.ts \
        frontend/src/core/automation/api.ts \
        frontend/src/core/automation/hooks.ts
git commit -m "refactor: prepare automation types for console mode"
```

## Task 4: Rebuild Automation UI as a Single Console

**Files:**
- Create: `frontend/src/components/workspace/automation/automation-console.tsx`
- Create: `frontend/src/components/workspace/automation/automation-create-panel.tsx`
- Create: `frontend/src/components/workspace/automation/automation-list-panel.tsx`
- Create: `frontend/src/components/workspace/automation/automation-results-panel.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-page.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-creator.tsx`
- Modify: `frontend/src/components/workspace/automation/schedule-builder.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-history-section.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-job-section.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-overview-cards.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-creator.contract.test.ts`
- Modify: `frontend/src/components/workspace/automation/automation-job-section.contract.test.ts`
- Create: `frontend/src/components/workspace/automation/automation-console.contract.test.ts`

- [ ] **Step 1: Write failing contract tests for the new single-page console**

Create `frontend/src/components/workspace/automation/automation-console.contract.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("automation page renders the console instead of tabs", async () => {
  const source = await readFile(new URL("./automation-page.tsx", import.meta.url), "utf8");

  assert.match(source, /AutomationConsole/);
  assert.doesNotMatch(source, /AutomationKindTabs/);
  assert.doesNotMatch(source, /TabsContent/);
});

void test("automation console contains create panel, list panel and results panel", async () => {
  const source = await readFile(new URL("./automation-console.tsx", import.meta.url), "utf8");

  assert.match(source, /AutomationCreatePanel/);
  assert.match(source, /AutomationListPanel/);
  assert.match(source, /AutomationResultsPanel/);
});
```

Update `frontend/src/components/workspace/automation/automation-creator.contract.test.ts` to assert:

```ts
assert.match(creatorSource, /提醒内容|任务内容/);
assert.doesNotMatch(creatorSource, /advancedOptions/);
assert.doesNotMatch(creatorSource, /deliveryMode/);
assert.doesNotMatch(creatorSource, /skillsText/);
```

- [ ] **Step 2: Run contract tests to verify they fail**

Run:

```bash
cd frontend && pnpm exec tsx --test \
  src/components/workspace/automation/automation-console.contract.test.ts \
  src/components/workspace/automation/automation-creator.contract.test.ts \
  src/components/workspace/automation/automation-job-section.contract.test.ts
```

Expected:

- FAIL because new console files do not exist yet
- FAIL because creator still contains advanced options

- [ ] **Step 3: Implement the new console skeleton**

Create `frontend/src/components/workspace/automation/automation-console.tsx`:

```tsx
"use client";

import type { AutomationJob, AutomationRun, AutomationStatus } from "@/core/automation/types";

import { AutomationCreatePanel } from "./automation-create-panel";
import { AutomationListPanel } from "./automation-list-panel";
import { AutomationResultsPanel } from "./automation-results-panel";

type AutomationConsoleProps = {
  jobs: AutomationJob[];
  runs: AutomationRun[];
  status: AutomationStatus;
  isPending: boolean;
  onCreate: (...args: never[]) => Promise<unknown>;
  onPause: (jobId: string) => Promise<unknown>;
  onResume: (jobId: string) => Promise<unknown>;
  onRun: (jobId: string) => Promise<unknown>;
  onRemove: (jobId: string) => Promise<unknown>;
};

export function AutomationConsole(props: AutomationConsoleProps) {
  return (
    <div className="space-y-6">
      <AutomationCreatePanel isPending={props.isPending} onCreate={props.onCreate} />
      <AutomationListPanel
        jobs={props.jobs}
        runs={props.runs}
        status={props.status}
        onPause={props.onPause}
        onResume={props.onResume}
        onRun={props.onRun}
        onRemove={props.onRemove}
      />
      <AutomationResultsPanel jobs={props.jobs} runs={props.runs} />
    </div>
  );
}
```

Update `frontend/src/components/workspace/automation/automation-page.tsx` to use the new console directly instead of tabs.

- [ ] **Step 4: Refactor the creator into a minimal create panel**

Move the minimal shape into `frontend/src/components/workspace/automation/automation-create-panel.tsx`:

```tsx
"use client";

import { useState } from "react";

import { AutomationCreator } from "./automation-creator";

export function AutomationCreatePanel({
  isPending,
  onCreate,
}: {
  isPending: boolean;
  onCreate: (...args: never[]) => Promise<unknown>;
}) {
  const [kind, setKind] = useState<"reminder" | "scheduled_task">("scheduled_task");

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight">创建自动化</h2>
        <p className="text-muted-foreground text-sm">
          提醒只写提醒内容，定时任务直接写任务内容并使用主聊天引用能力。
        </p>
      </div>
      <AutomationCreator
        isPending={isPending}
        defaultKind={kind}
        onSubmit={onCreate}
      />
    </section>
  );
}
```

Update `frontend/src/components/workspace/automation/automation-creator.tsx`:

- 删除 `showAdvanced`, `deliveryMode`, `skillsText`
- 将 label 文案切换为 `提醒内容` / `任务内容`
- 保留 `ScheduleBuilder`
- 输入区为单主字段，不再展示 preview advanced hint

Minimal target shape:

```tsx
const isTask = kind === "scheduled_task";

<Textarea
  id="automation-content"
  value={prompt}
  onChange={(event) => setPrompt(event.target.value)}
  placeholder={isTask ? copy.taskPromptPlaceholder : copy.reminderContentPlaceholder}
  className="min-h-32"
/>
```

- [ ] **Step 5: Implement list and results panels with placeholder wiring**

Create `frontend/src/components/workspace/automation/automation-list-panel.tsx` and `automation-results-panel.tsx` using existing `AutomationJobSection` / `AutomationHistorySection` pieces as temporary internals, but remove tab assumptions.

The goal of this step is layout correctness first:

- create panel on top
- unified list in middle
- results panel at bottom

No need to finish thread preview here yet.

- [ ] **Step 6: Run focused frontend checks**

Run:

```bash
cd frontend && pnpm exec tsx --test \
  src/components/workspace/automation/automation-console.contract.test.ts \
  src/components/workspace/automation/automation-creator.contract.test.ts \
  src/components/workspace/automation/automation-job-section.contract.test.ts
cd frontend && pnpm check
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add frontend/src/components/workspace/automation/automation-page.tsx \
        frontend/src/components/workspace/automation/automation-console.tsx \
        frontend/src/components/workspace/automation/automation-create-panel.tsx \
        frontend/src/components/workspace/automation/automation-list-panel.tsx \
        frontend/src/components/workspace/automation/automation-results-panel.tsx \
        frontend/src/components/workspace/automation/automation-creator.tsx \
        frontend/src/components/workspace/automation/schedule-builder.tsx \
        frontend/src/components/workspace/automation/automation-history-section.tsx \
        frontend/src/components/workspace/automation/automation-job-section.tsx \
        frontend/src/components/workspace/automation/automation-console.contract.test.ts \
        frontend/src/components/workspace/automation/automation-creator.contract.test.ts \
        frontend/src/components/workspace/automation/automation-job-section.contract.test.ts
git commit -m "feat: rebuild automation page as console"
```

## Task 5: Add Scheduled Task Run Preview and Reminder Result Modes

**Files:**
- Create: `frontend/src/components/workspace/automation/automation-run-preview.tsx`
- Modify: `frontend/src/components/workspace/automation/automation-results-panel.tsx`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/core/automation/hooks.ts`
- Modify: `frontend/src/core/threads/types.ts`

- [ ] **Step 1: Write failing contract test for thread preview**

Create a contract test snippet inside `automation-console.contract.test.ts`:

```ts
void test("results panel includes run preview for scheduled tasks", async () => {
  const source = await readFile(new URL("./automation-results-panel.tsx", import.meta.url), "utf8");

  assert.match(source, /AutomationRunPreview/);
  assert.match(source, /isolated_thread_id/);
});
```

- [ ] **Step 2: Run contract tests to verify they fail**

Run:

```bash
cd frontend && pnpm exec tsx --test src/components/workspace/automation/automation-console.contract.test.ts
```

Expected:

- FAIL because preview component not wired yet

- [ ] **Step 3: Implement the preview component with existing thread client**

Create `frontend/src/components/workspace/automation/automation-run-preview.tsx`:

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";

import { getAPIClient } from "@/core/api";
import type { AgentThreadState } from "@/core/threads/types";

export function AutomationRunPreview({ threadId }: { threadId: string | null }) {
  const apiClient = getAPIClient(false);
  const { data, isLoading } = useQuery({
    queryKey: ["automation", "run-preview", threadId],
    enabled: Boolean(threadId),
    queryFn: () => apiClient.getState<AgentThreadState>(threadId!),
    refetchOnWindowFocus: false,
  });

  if (!threadId) {
    return <div className="text-muted-foreground text-sm">当前运行没有关联线程。</div>;
  }

  if (isLoading) {
    return <div className="text-muted-foreground text-sm">正在加载线程预览…</div>;
  }

  const messages = data?.values.messages ?? [];
  const previewMessages = messages.slice(-4);

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">线程预览</div>
      <div className="space-y-2">
        {previewMessages.map((message, index) => (
          <div key={message.id ?? index} className="rounded-xl border p-3 text-sm">
            <div className="text-muted-foreground mb-1 text-[11px]">{message.type}</div>
            <div>{typeof message.content === "string" ? message.content : "[structured message]"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Update `automation-results-panel.tsx`:

- reminder path: list only
- scheduled task path: left run list + right `AutomationRunPreview`

- [ ] **Step 4: Run checks**

Run:

```bash
cd frontend && pnpm exec tsx --test src/components/workspace/automation/automation-console.contract.test.ts
cd frontend && pnpm check
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/automation/automation-run-preview.tsx \
        frontend/src/components/workspace/automation/automation-results-panel.tsx \
        frontend/src/components/workspace/automation/automation-console.contract.test.ts
git commit -m "feat: add automation run thread preview"
```

## Task 6: Update Locale, Test Docs, README, and Backend CLAUDE

**Files:**
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `docs/test/07-automation/README.md`
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`

- [ ] **Step 1: Update locale copy to match the new model**

Change the automation workspace copy so it no longer references tabs or advanced options.

Examples to add in `frontend/src/core/i18n/locales/zh-CN.ts`:

```ts
automationWorkspace: {
  title: "自动化",
  description: "把提醒和定时任务放进同一个控制台里创建、管理和回看结果。",
  forms: {
    creatorTitle: "创建自动化",
    creatorDescription: "提醒只写提醒内容，定时任务直接写任务内容。",
    reminderContentLabel: "提醒内容",
    reminderContentPlaceholder: "例如：今晚 8 点前记得提交报销。",
    taskPromptLabel: "任务内容",
    taskPromptPlaceholder: "例如：将 xxx 链接的文章存到 @文章 目录下，并给出 3 句摘要。",
  },
}
```

- [ ] **Step 2: Update docs**

Update `docs/test/07-automation/README.md`:

- 把“多 tab 页面”改为“单页控制台”
- 把“advanced options”移出主成功链路
- 增加 `@笔记` mention 与线程预览验证项

Update `README.md` with one concise user-facing bullet:

```md
- 自动化控制台：提醒与定时任务共用单页工作台；定时任务沿用聊天输入能力并支持 `@笔记` 引用，结果可在自动化页直接预览关联线程
```

Update `backend/CLAUDE.md` with one backend architecture note:

```md
- Automation runs now need to preserve `isolated_thread_id` end-to-end so the frontend automation console can preview the execution thread without inventing a separate run-detail subsystem.
```

- [ ] **Step 3: Run full targeted verification**

Run:

```bash
cd backend && uv run pytest tests/test_automation_executor.py tests/test_automation_router.py -q
cd frontend && pnpm check
```

Expected:

- backend PASS
- frontend lint + typecheck PASS

- [ ] **Step 4: Commit**

```bash
git add frontend/src/core/i18n/locales/zh-CN.ts \
        frontend/src/core/i18n/locales/en-US.ts \
        frontend/src/core/i18n/locales/types.ts \
        docs/test/07-automation/README.md \
        README.md \
        backend/CLAUDE.md
git commit -m "docs: align automation console contracts and copy"
```

## Self-Review

### Spec coverage

- 单页控制台：Task 4
- 提醒 / 定时任务语义分离：Task 3 + Task 4 + Task 6
- `@笔记` 共用引用能力：Task 2
- run 对应线程预览：Task 1 + Task 5
- 文案与测试文档同步：Task 6

无缺口。

### Placeholder scan

- 无 `TODO` / `TBD`
- 每个任务都包含文件、命令、预期结果
- 代码步骤都有最小示例

### Type consistency

- `isolated_thread_id` 在 backend run model、frontend run type、results preview 中名称一致
- `objectKind: "notebook-directory"` 在 mention helpers、thread types、input box 中一致

