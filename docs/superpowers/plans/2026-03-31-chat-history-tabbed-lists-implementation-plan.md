# Chat History Tabbed Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把最近对话和对话模块历史列表改成 3 个固定 Tab 的联动分类视图，并为项目对话提供更清晰的信息卡片。

**Architecture:** 用 URL 查询参数统一驱动 `general / project / bridge` 分类状态，抽出共享线程分类 helper 与 Tab 展示单元，再分别重构侧边栏与主列表页。项目对话使用专门卡片，普通和桥接对话保持轻量列表，避免再次在两个页面里复制条件分支。

**Tech Stack:** Next.js App Router, React 19, TypeScript, node:test contract tests, Tailwind CSS, Radix Tabs

---

### Task 1: 锁定新行为的合同测试

**Files:**
- Modify: `frontend/src/components/workspace/recent-chat-list.contract.test.ts`
- Modify: `frontend/src/app/workspace/chats/page.contract.test.ts`
- Modify: `frontend/src/core/navigation/desktop-routes.test.ts`
- Create: `frontend/src/core/threads/history-tabs.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定 3 个固定 Tab 与 URL type 参数**

测试应覆盖：
- 不存在 `全部` Tab
- `TabsTrigger value="general|project|bridge"`
- `searchParams.get("type")`
- `pathOfThread(..., { type })` 或等价写法
- 共享 helper 暴露 `WorkspaceThreadType`

- [ ] **Step 2: 运行相关测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/components/workspace/recent-chat-list.contract.test.ts \
  src/app/workspace/chats/page.contract.test.ts \
  src/core/navigation/desktop-routes.test.ts \
  src/core/threads/history-tabs.contract.test.ts
```

Expected:
- 至少有断言因 `type` / `TabsTrigger` / 新 helper 尚不存在而失败

- [ ] **Step 3: 提交测试-only 变更**

```bash
git add frontend/src/components/workspace/recent-chat-list.contract.test.ts \
  frontend/src/app/workspace/chats/page.contract.test.ts \
  frontend/src/core/navigation/desktop-routes.test.ts \
  frontend/src/core/threads/history-tabs.contract.test.ts
git commit -m "test: lock chat history tabbed list behavior"
```

### Task 2: 实现共享线程分类与路由状态

**Files:**
- Create: `frontend/src/core/threads/history-tabs.ts`
- Modify: `frontend/src/core/threads/utils.ts`
- Modify: `frontend/src/core/navigation/desktop-routes.ts`

- [ ] **Step 1: 在新 helper 中定义线程类型、查询参数解析和分组函数**

需要包含：
- `WorkspaceThreadType`
- `DEFAULT_WORKSPACE_THREAD_TYPE`
- `parseWorkspaceThreadType`
- `groupThreadsByWorkspaceType`
- `filterThreadsByWorkspaceType`

- [ ] **Step 2: 更新路由 helper 支持保留或传入 type**

要求：
- `pathOfThread` 继续兼容现有调用
- 可通过 `extra.type` 透传分类

- [ ] **Step 3: 运行 Task 1 的测试，确认共享状态相关断言转绿**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/core/threads/history-tabs.contract.test.ts \
  src/core/navigation/desktop-routes.test.ts
```

- [ ] **Step 4: 提交共享状态实现**

```bash
git add frontend/src/core/threads/history-tabs.ts \
  frontend/src/core/threads/utils.ts \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/core/navigation/desktop-routes.test.ts \
  frontend/src/core/threads/history-tabs.contract.test.ts
git commit -m "feat: add shared chat history tab state"
```

### Task 3: 重构侧边栏最近对话

**Files:**
- Create: `frontend/src/components/workspace/thread-type-tabs.tsx`
- Create: `frontend/src/components/workspace/thread-list-items.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.tsx`
- Modify: `frontend/src/components/workspace/recent-chat-list.contract.test.ts`

- [ ] **Step 1: 用共享 Tab 组件替换分组标题堆叠结构**

要求：
- 标题下只有一个 Tab 行
- 当前只渲染活跃分类
- 切换 Tab 清空当前选择

- [ ] **Step 2: 引入侧边栏项目对话卡片与轻量普通/桥接项**

要求：
- 项目对话拥有独立信息卡片结构
- 普通/桥接保持轻量项
- 保留待回复 badge、桥接 badge、项目 badge

- [ ] **Step 3: 删除跳转保留当前 type**

要求：
- 删除当前线程后跳到同分类下一条或列表空状态
- 生成分享链接时保留当前 `type`

- [ ] **Step 4: 运行侧边栏合同测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/recent-chat-list.contract.test.ts
```

- [ ] **Step 5: 提交侧边栏重构**

```bash
git add frontend/src/components/workspace/thread-type-tabs.tsx \
  frontend/src/components/workspace/thread-list-items.tsx \
  frontend/src/components/workspace/recent-chat-list.tsx \
  frontend/src/components/workspace/recent-chat-list.contract.test.ts
git commit -m "feat: redesign recent chat sidebar with tabs"
```

### Task 4: 重构 chats 列表页

**Files:**
- Modify: `frontend/src/app/workspace/chats/page.tsx`
- Modify: `frontend/src/app/workspace/chats/page.contract.test.ts`

- [ ] **Step 1: 在列表页接入同一个 type 查询参数**

要求：
- 搜索框上方显示 Tab
- 搜索只作用于当前分类
- 切换 Tab 清空当前选择

- [ ] **Step 2: 为项目对话接入完整信息卡片**

要求：
- 使用共享展示单元
- 普通/桥接维持轻量列表
- 项目对话结构明显不同于普通项

- [ ] **Step 3: 按当前分类修正全选与删除后跳转**

要求：
- `全选` 只选当前分类与当前搜索结果
- 删除当前线程后仅在当前分类内找下一条

- [ ] **Step 4: 运行列表页合同测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/app/workspace/chats/page.contract.test.ts
```

- [ ] **Step 5: 提交列表页重构**

```bash
git add frontend/src/app/workspace/chats/page.tsx \
  frontend/src/app/workspace/chats/page.contract.test.ts
git commit -m "feat: add tabbed chat history page"
```

### Task 5: 完整验证与补丁式实现自检

**Files:**
- Review only: `frontend/src/core/threads/history-tabs.ts`
- Review only: `frontend/src/components/workspace/thread-type-tabs.tsx`
- Review only: `frontend/src/components/workspace/thread-list-items.tsx`
- Review only: `frontend/src/components/workspace/recent-chat-list.tsx`
- Review only: `frontend/src/app/workspace/chats/page.tsx`

- [ ] **Step 1: 运行本次相关 node:test**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test \
  src/core/threads/history-tabs.contract.test.ts \
  src/core/navigation/desktop-routes.test.ts \
  src/components/workspace/recent-chat-list.contract.test.ts \
  src/app/workspace/chats/page.contract.test.ts
```

- [ ] **Step 2: 运行前端静态校验**

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
pnpm frontend:check
```

- [ ] **Step 3: 做补丁式修改自检**

检查项：
- 是否仍在两个页面里复制线程分类判断
- 是否仍把项目项/普通项/桥接项样式条件堆在一个超长 JSX 块里
- 如果存在，继续收敛到共享 helper 或共享展示单元后再进入最终提交

- [ ] **Step 4: 提交最终实现**

```bash
git add frontend/src/core/threads/history-tabs.ts \
  frontend/src/components/workspace/thread-type-tabs.tsx \
  frontend/src/components/workspace/thread-list-items.tsx \
  frontend/src/components/workspace/recent-chat-list.tsx \
  frontend/src/components/workspace/recent-chat-list.contract.test.ts \
  frontend/src/app/workspace/chats/page.tsx \
  frontend/src/app/workspace/chats/page.contract.test.ts \
  frontend/src/core/navigation/desktop-routes.ts \
  frontend/src/core/navigation/desktop-routes.test.ts \
  frontend/src/core/threads/utils.ts \
  frontend/src/core/threads/history-tabs.contract.test.ts \
  docs/superpowers/plans/2026-03-31-chat-history-tabbed-lists-implementation-plan.md
git commit -m "feat: redesign chat history with linked type tabs"
```
