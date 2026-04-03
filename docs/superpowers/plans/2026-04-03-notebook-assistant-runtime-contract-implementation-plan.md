# Notebook Assistant Runtime Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Notebook Assistant 从通用聊天壳升级成真正围绕当前笔记内容工作的 note-grounded assistant。

**Architecture:** 先补 Notebook runtime input contract，再补 `notebook-chat` 的专属 soul / prompt overlay，最后补 notebook-specific failure semantics 与行为回归。当前 note 正文不持久化进 thread values，而是在每次 notebook assistant 请求时动态读取并注入 prompt section。

**Tech Stack:** Python backend, FastAPI, local notebook store, LangGraph embedded client, prompt runtime, Next.js frontend, TanStack Query, pytest, node:test

---

## Scope Lock

本计划只覆盖：

- notebook-chat 的 runtime contract
- notebook-chat 的专属 prompt overlay / soul
- current note prompt section 注入
- notebook-specific failure semantics
- contract / behavior tests

本轮不做：

- Notebook Assistant 全新 UI 重做
- 多 note / 多 asset 联合上下文
- MCP / plugin 扩展
- 新的 specialist tool surface
- 长期记忆提炼
- 项目管理 / workflow 编排

## Source Spec

本计划严格基于：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-03-notebook-assistant-runtime-contract-design.md`

## Architecture Invariants

- Notebook Assistant 必须优先基于当前 note 回答
- notebook-chat 不能退化成通用 `Nion 2.0` 自我介绍助手
- note body 必须动态注入 runtime，不写进持久化 thread values
- note context 缺失时必须返回 notebook-specific error semantics
- 当前修复不应扩展项目管理、memory 或 open-domain 助手能力

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_prompt_contract.py`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/builtin_agents.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_api.py`

## Task 1: 锁定 notebook assistant prompt/runtime contract

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_prompt_contract.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/builtin_agents.py`

- [ ] **Step 1: 写失败测试，锁定 notebook-chat 的专属 soul / prompt overlay**

测试至少覆盖：
- `notebook-chat` 不再是空 soul
- prompt 中包含 notebook-specific identity
- prompt 中包含 current note section 约束
- prompt 中禁止退化成通用助手

```python
def test_notebook_chat_prompt_includes_notebook_specific_rules() -> None:
    prompt = apply_prompt_template(agent_name="notebook-chat")

    assert "笔记助手" in prompt
    assert "当前笔记" in prompt
    assert "不能退化成通用助手" in prompt
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_assistant_prompt_contract.py -q
```

Expected:
- FAIL because notebook-chat soul / overlay is still missing

- [ ] **Step 3: 最小实现 notebook-chat soul / overlay**

要求：
- built-in config 里为 notebook-chat 提供专属 soul
- prompt 里增加 notebook-chat 专属 overlay
- 不影响其他 agent

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_assistant_prompt_contract.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_notebook_assistant_prompt_contract.py \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/nion/config/builtin_agents.py
git commit -m "feat(notebook): add notebook assistant prompt contract"
```

## Task 2: 补 current note runtime injection

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/threads/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_api.py`

- [ ] **Step 1: 写失败测试，锁定 notebook note body 动态注入**

测试至少覆盖：
- notebook assistant thread stream 能读取当前 note body
- note body 不写入 persisted thread values
- notebook runtime context 与普通 thread stream 区分

```python
def test_notebook_assistant_runtime_reads_note_body_without_persisting_it(monkeypatch, tmp_path):
    ...
    assert restored_payload["values"]["note_id"] == "note-1"
    assert "note_body" not in restored_payload["values"]
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_assistant_api.py -q
```

Expected:
- FAIL because notebook note body is not injected through runtime

- [ ] **Step 3: 最小实现 notebook runtime injection**

要求：
- `ThreadService.stream(...)` 识别 notebook assistant context
- 动态读取当前 note 正文
- 把 note context 注入 `NionClient.stream(...)`
- 不把 note body 持久化到 thread values

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_assistant_api.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/client.py \
  backend/packages/harness/nion/threads/service.py \
  backend/tests/test_notebook_assistant_api.py
git commit -m "feat(notebook): inject current note into assistant runtime"
```

## Task 3: 收口 notebook-specific failure semantics

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定 notebook-specific failure / identity semantics**

测试至少覆盖：
- “你叫什么”不应走通用助手心智
- panel / composer 不再暗示 open-domain chat
- note context 缺失时使用 notebook-specific 错误文案

```ts
void test("NotebookAssistantPanel uses notebook-specific identity and failure copy", async () => {
  const source = await readFile(new URL("./notebook-assistant-panel.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /Nion 2\.0/);
  assert.match(source, /当前笔记|笔记上下文/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
```

Expected:
- FAIL if copy / semantics are still generic

- [ ] **Step 3: 最小实现 notebook-specific failure semantics**

要求：
- notebook assistant 的错误提示指向 current note context
- composer placeholder 与 panel copy 继续保持 note-centric
- 不引入新的 open-domain assistant 文案

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-assistant-composer.tsx \
  frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
git commit -m "refactor(notebook): tighten assistant notebook-specific semantics"
```

## Task 4: 跑完整回归并收口

**Files:**
- Modify: none unless verification forces a fix

- [ ] **Step 1: 跑后端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_notebook_api.py \
  tests/test_notebook_history.py \
  tests/test_notebook_service.py \
  tests/test_notebook_assistant_api.py \
  tests/test_notebook_inbox_contract.py \
  tests/test_notebook_asset_contract.py \
  tests/test_notebook_assistant_prompt_contract.py -q
```

Expected:
- PASS

- [ ] **Step 2: 跑前端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-shell.contract.test.ts \
  src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-inbox-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-asset-view.contract.test.ts \
  src/components/workspace/artifacts/artifact-file-detail.contract.test.ts \
  src/core/notebook/api.test.ts \
  src/core/navigation/desktop-routes.test.ts \
  src/components/workspace/workspace-container.contract.test.ts
pnpm exec tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 3: 做反补丁式自检**

检查点：
- notebook-chat 是否真的不再依赖通用助手身份
- current note 是否真的进入 runtime，而不是只改了前端文案
- thread values 是否仍然保持轻量，没有把 note body 持久化进去

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(notebook): ground assistant on current note context"
```
