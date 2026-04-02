# Notebook Redefinition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Notebook 从“普通 Markdown 笔记页”升级成“收件箱驱动的个人知识与工作材料库”，并围绕 `InboxItem + Note + Asset + Directory + Tag` 建立新的信息架构与用户流程。

**Architecture:** 先重构 Notebook 的产品心智与对象边界，再逐步把首页切到收件箱视角，并补充聊天沉淀与工作产物归档的显式入口。后端维持本地优先的 notebook store，但新增 `Asset` 和 `InboxItem` 的最小 contract；前端围绕 Inbox、Note、Asset 做最小可用工作台。整个阶段坚持：Notebook 是用户资产库，不承担项目管理、长期记忆提炼、对象桥接治理。

**Tech Stack:** Python backend, FastAPI router, local filesystem notebook store, Pydantic, Next.js frontend, TanStack Query, pytest, node:test

---

## Scope Lock

本计划只覆盖 Notebook 模块的重新定义落地，不在本轮内实现：

- 项目管理模块
- object bridge / candidate center
- 长期记忆自动提炼
- completion lane
- plugin / MCP 的 Notebook 专项扩展
- 向量数据库级检索系统
- 复杂多模态解析流水线

本轮只做：

- Notebook 首页重构为收件箱视角
- `Note + Asset + InboxItem` 最小对象模型
- 显式聊天沉淀入口
- 显式工作产物归档入口
- Notebook assistant 的内容加工边界
- 相关文档与最小回归

## Source Spec

本计划严格基于：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-02-notebook-redefinition-design.md`

## Architecture Invariants

- Notebook 是用户拥有的资产库，不是 agent memory
- Notebook 不承担项目管理、状态机和 completion 流程
- 只有用户明确指定保存的工作产物，才进入 Notebook
- 进入 Notebook 的工作产物保存为副本，而不是外部引用
- Notebook assistant 只做内容加工，不做对象治理
- 首页默认采用收件箱视角，而不是目录树优先
- 任何重要写入都应让用户清楚知道会写到哪里

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_inbox_contract.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_asset_contract.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/inbox.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/assets.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-asset-view.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-redefinition.contract.test.ts`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/history.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/assistant_service.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/notebook.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/types.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/api.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/hooks.ts`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-context-panel.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/save-to-notebook-trigger.tsx`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/06-notebook/README.md`

---

## Task 1: 建立 Notebook 新对象模型 contract

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/models.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/types.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_asset_contract.py`

- [ ] **Step 1: 写失败测试，锁定 `Note + Asset + InboxItem` 的最小 contract**

测试至少覆盖：
- `NotebookNote` 仍然存在
- 新增 `NotebookAsset`
- 新增 `NotebookInboxItem`
- `InboxItem` 能指向 `note` 或 `asset`
- `Asset` 明确是副本语义，不包含外链字段

```python
def test_notebook_asset_has_copy_semantics() -> None:
    asset = NotebookAsset(
        asset_id="asset_1",
        title="report.html",
        relative_path="收件箱/report.html",
        source_kind="workspace_copy",
        mime_type="text/html",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
    )

    assert asset.source_kind == "workspace_copy"
    assert asset.relative_path == "收件箱/report.html"
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_asset_contract.py -q
```

Expected:
- FAIL with missing `NotebookAsset` / `NotebookInboxItem`

- [ ] **Step 3: 扩展 backend / frontend 类型**

要求：
- backend notebook models 和 frontend notebook types 对齐
- `InboxItem`、`Note`、`Asset` 的最小字段统一
- 不引入项目/桥接/记忆治理字段

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_asset_contract.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/notebook/models.py \
  frontend/src/core/notebook/types.ts \
  backend/tests/test_notebook_asset_contract.py
git commit -m "feat(notebook): add note asset inbox contracts"
```

## Task 2: 建立 Notebook Inbox contract

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_inbox_contract.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/notebook.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/api.ts`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/hooks.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/inbox.ts`

- [ ] **Step 1: 写失败测试，锁定 Inbox 行为**

测试至少覆盖：
- 新建 note 默认可进入收件箱
- 聊天沉淀默认进入收件箱
- 用户指定目录时不进入默认收件箱
- inbox list 能同时返回 note 和 asset

```python
def test_save_chat_summary_defaults_to_inbox(tmp_path) -> None:
    service = NotebookHistoryService(base_dir=tmp_path / "nion-home")
    note = service.create_note(
        directory="",
        title="聊天总结",
        body="总结内容",
        actor_type="user",
    )

    assert note.relative_path.startswith("收件箱/")
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_inbox_contract.py -q
```

Expected:
- FAIL with missing inbox-aware behavior

- [ ] **Step 3: 实现 Inbox contract**

要求：
- 明确 Inbox 是默认入口
- 不把 Inbox 做成特殊隐式状态机，只作为默认组织层
- backend router 至少要有可供首页读取的 inbox list 能力

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_inbox_contract.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/tests/test_notebook_inbox_contract.py \
  backend/packages/harness/nion/notebook/service.py \
  backend/app/gateway/routers/notebook.py \
  frontend/src/core/notebook/api.ts \
  frontend/src/core/notebook/hooks.ts \
  frontend/src/core/notebook/inbox.ts
git commit -m "feat(notebook): add inbox contract"
```

## Task 3: 加入显式聊天沉淀入口

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/save-to-notebook-trigger.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-page.tsx`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定“聊天沉淀为笔记”主入口**

测试至少覆盖：
- 存在显式“保存到笔记”入口
- 支持带标题/目录/正文 seed 进入 notebook
- 不要求项目对象或长期记忆概念

```ts
void test("SaveToNotebookTrigger stays notebook-only", async () => {
  const source = await readFile(
    new URL("../save-to-notebook-trigger.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /saveFromChat/);
  assert.doesNotMatch(source, /project|memory/i);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-dialogs.contract.test.ts
```

Expected:
- FAIL if入口或 seed 语义不满足

- [ ] **Step 3: 强化聊天沉淀入口**

要求：
- 快捷入口语义明确
- 默认保存到 Inbox
- 允许用户指定目录
- 不引入项目/桥接/长期记忆选项

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-dialogs.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/save-to-notebook-trigger.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-dialogs.contract.test.ts
git commit -m "feat(notebook): strengthen chat-to-note flow"
```

## Task 4: 加入用户指定的工作产物归档入口

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/notebook/assets.ts`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-asset-view.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/service.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/notebook.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_service.py`

- [ ] **Step 1: 写失败测试，锁定“用户指定保存工作产物副本到 Notebook”**

测试至少覆盖：
- 指定 source artifact 时创建副本
- 保存结果进入 Inbox 或指定目录
- `Asset` 保存为副本，不是外链

```python
def test_archive_workspace_asset_creates_notebook_copy(tmp_path) -> None:
    source = tmp_path / "workspace" / "report.html"
    source.parent.mkdir(parents=True)
    source.write_text("<h1>Report</h1>")

    service = NotebookHistoryService(base_dir=tmp_path / "nion-home")
    asset = service.archive_asset(
        source_path=str(source),
        directory="",
        actor_type="user",
    )

    assert asset.relative_path.startswith("收件箱/")
    assert asset.source_kind == "workspace_copy"
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_service.py -q
```

Expected:
- FAIL with missing archive asset behavior

- [ ] **Step 3: 实现 Asset 归档入口**

要求：
- 只支持显式保存
- 副本语义清晰
- 不做自动同步
- frontend 最小只需要预览/展示 asset，不做复杂编辑器

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_service.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/core/notebook/assets.ts \
  frontend/src/components/workspace/notebook/notebook-asset-view.tsx \
  backend/packages/harness/nion/notebook/service.py \
  backend/app/gateway/routers/notebook.py \
  backend/tests/test_notebook_service.py
git commit -m "feat(notebook): add explicit asset archive flow"
```

## Task 5: 首页切到收件箱视角

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-page.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-sidebar.tsx`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定“收件箱优先”首页结构**

测试至少覆盖：
- 首页存在 Inbox / Recent / Search 主区
- 目录树不再是唯一视觉中心
- Note 与 Asset 可在 Inbox 中共同出现

```ts
void test("NotebookPage prioritizes inbox over tree-only navigation", async () => {
  const source = await readFile(new URL("./notebook-page.tsx", import.meta.url), "utf8");
  assert.match(source, /Inbox|收件箱/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-shell.contract.test.ts \
  src/components/workspace/notebook/notebook-sidebar.contract.test.ts
```

Expected:
- FAIL if仍是目录树唯一中心

- [ ] **Step 3: 实现收件箱优先首页**

要求：
- 首页默认展示 Inbox / Recent / Search
- 目录树仍存在，但退居组织层
- 不引入项目/桥接/长期记忆概念

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-shell.contract.test.ts \
  src/components/workspace/notebook/notebook-sidebar.contract.test.ts
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-inbox-panel.tsx \
  frontend/src/components/workspace/notebook/notebook-page.tsx \
  frontend/src/components/workspace/notebook/notebook-sidebar.tsx \
  frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts \
  frontend/src/components/workspace/notebook/notebook-sidebar.contract.test.ts
git commit -m "feat(notebook): switch notebook home to inbox-first"
```

## Task 6: 收口 Notebook assistant 的边界

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/notebook/assistant_service.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_api.py`

- [ ] **Step 1: 写失败测试，锁定 assistant 是“内容加工助手”而不是流程控制器**

测试至少覆盖：
- note-centric
- chat-to-note summarize
- asset-to-note summarize
- 不出现 project / memory 提炼语义

```ts
void test("NotebookAssistantPanel stays note-centric and notebook-only", async () => {
  const source = await readFile(new URL("./notebook-assistant-panel.tsx", import.meta.url), "utf8");
  assert.match(source, /笔记助手/);
  assert.doesNotMatch(source, /project|memory/i);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
```

Expected:
- FAIL if assistant 仍有越界语义

- [ ] **Step 3: 收口 assistant 边界**

要求：
- assistant 只做内容加工
- 不引入项目管理、长期记忆提炼或对象治理
- 允许：
  - 总结 note
  - 总结 chat -> note
  - 总结 asset -> note

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_notebook_assistant_api.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/workspace/notebook/notebook-assistant-panel.tsx \
  backend/packages/harness/nion/notebook/assistant_service.py \
  frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  backend/tests/test_notebook_assistant_api.py
git commit -m "refactor(notebook): keep assistant content-focused"
```

## Task 7: 文档同步与 Notebook-only 回归

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/README.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/06-notebook/README.md`

- [ ] **Step 1: 同步文档**

要求：
- README 说明 Notebook 是知识与材料库
- backend/CLAUDE 说明 Notebook 不承担项目管理和长期记忆提炼
- docs/test/06-notebook 对齐 `Inbox + Note + Asset`

- [ ] **Step 2: 跑后端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_notebook_api.py \
  tests/test_notebook_history.py \
  tests/test_notebook_service.py \
  tests/test_notebook_assistant_api.py \
  tests/test_notebook_inbox_contract.py \
  tests/test_notebook_asset_contract.py -q
```

Expected:
- PASS

- [ ] **Step 3: 跑前端回归**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/notebook/notebook-context-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-shell.contract.test.ts \
  src/components/workspace/notebook/notebook-sidebar.contract.test.ts \
  src/components/workspace/notebook/notebook-dialogs.contract.test.ts \
  src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts
pnpm exec tsc --noEmit
```

Expected:
- PASS

- [ ] **Step 4: 做补丁式实现自检**

检查点：
- Notebook 是否再次偷偷长出项目管理逻辑
- 是否把 Asset 强行退化成附件
- 是否把聊天沉淀做成隐藏自动写入
- 是否把 Notebook assistant 再次拉成 chat clone

- [ ] **Step 5: Commit**

```bash
git add README.md backend/CLAUDE.md docs/test/06-notebook/README.md
git commit -m "docs(notebook): align notebook redefinition"
```

## 测试方案总览

### Backend

- `tests/test_notebook_asset_contract.py`
- `tests/test_notebook_inbox_contract.py`
- `tests/test_notebook_api.py`
- `tests/test_notebook_service.py`
- `tests/test_notebook_history.py`
- `tests/test_notebook_assistant_api.py`

重点验证：
- `Note + Asset + InboxItem` contract
- Inbox 默认入口
- 聊天沉淀
- Asset 副本归档
- assistant 内容加工边界

### Frontend

- `src/components/workspace/notebook/notebook-shell.contract.test.ts`
- `src/components/workspace/notebook/notebook-sidebar.contract.test.ts`
- `src/components/workspace/notebook/notebook-dialogs.contract.test.ts`
- `src/components/workspace/notebook/notebook-context-panel.contract.test.ts`
- `src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
- `pnpm exec tsc --noEmit`

重点验证：
- 首页收件箱视角
- Notebook-only 心智
- 聊天沉淀入口
- 资产归档入口
- assistant 不越界

## 验收标准

### A. 定位验收

1. Notebook 不再承担项目管理或长期记忆提炼
2. Notebook 正式成为知识与材料库

### B. 对象验收

3. 存在 `Note + Asset + InboxItem` 最小模型
4. Asset 明确是副本，不是 workspace 外链

### C. 流程验收

5. 首页默认采用收件箱视角
6. 聊天沉淀与工作产物归档都能进入 Notebook

### D. assistant 验收

7. assistant 只做内容加工
8. assistant 不重新长成流程控制器

### E. 产品边界验收

9. Notebook 保持用户拥有的资产心智
10. Notebook 不再被 project/object bridge/long-term memory 绑架

## 提交节奏

建议固定为 7 个原子提交：

1. `feat(notebook): add note asset inbox contracts`
2. `feat(notebook): add inbox contract`
3. `feat(notebook): strengthen chat-to-note flow`
4. `feat(notebook): add explicit asset archive flow`
5. `feat(notebook): switch notebook home to inbox-first`
6. `refactor(notebook): keep assistant content-focused`
7. `docs(notebook): align notebook redefinition`

## 风险提醒

- 不要把 Notebook 再拉回 object bridge / project thinking
- 不要把 Asset 简化成 note 附件
- 不要做自动同步 workspace
- 不要做隐藏自动写入
- 不要把 assistant 再次拉成全能 chat clone
