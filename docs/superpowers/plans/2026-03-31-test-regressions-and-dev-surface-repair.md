# Test Regressions And Dev Surface Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 2026-03-31 全量测试暴露的 4 个失败项，并解除 workspace 页面在开发环境中的 500 阻塞，让 `docs/test` 对应的自动化与浏览器冒烟重新可执行。

**Architecture:** 把工作拆成 5 条独立交付线：后端消息构造修复、前端 CLI 回归修复、Bridge i18n 回归修复、Notebook 陈旧测试对齐、Next.js 开发面稳定化。每条线都先用现有红灯或新增最小回归测试锁定问题，再做最小实现，最后跑针对性验证并单独提交，避免补丁叠补丁。

**Tech Stack:** Python 3.12, FastAPI, LangChain Core, Next.js 16, React 19, TypeScript, Node test runner, Make, Nginx

---

## File Structure

- Modify: `backend/packages/harness/nion/client.py`
  - 责任：嵌入式 `NionClient.stream()` 构造 `HumanMessage` 的逻辑，确保 `additional_kwargs` 只在合法 `dict` 时传入。
- Modify: `backend/tests/test_thread_event_logging.py`
  - 责任：补一条更聚焦的回归测试，锁住 `human_message_payload` 缺省 `additional_kwargs` 时不能抛 `ValidationError`。
- Modify: `frontend/src/components/workspace/input-box.tsx`
  - 责任：CLI mention 选项生成，保证 `displayName.trim()` 为空字符串时回退到 `toolId`。
- Test: `frontend/src/components/workspace/cli-tools/cli-tools.contract.test.ts`
  - 责任：作为 CLI mention label fallback 的现成红灯。
- Modify: `frontend/src/components/workspace/bridge/BridgeSection.tsx`
  - 责任：Bridge 无桌面 client 时走 i18n `desktopOnly` 文案，而不是硬编码英文。
- Test: `frontend/src/core/bridge/client-availability.test.ts`
  - 责任：作为 Bridge fallback i18n 的现成红灯。
- Modify: `frontend/src/components/workspace/notebook-routes.test.ts`
  - 责任：移除过时的 `buildNotebookAssistPrompt` 断言，改为当前 notebook shell 架构断言。
- Verify: `frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
  - 责任：作为 notebook shell 新契约的对照测试，避免把旧结构误写回去。
- Create: `frontend/src/core/config/dev-surface.contract.test.ts`
  - 责任：锁住默认前端开发面必须避开 Turbopack 路径问题，并允许 `127.0.0.1` / `localhost` 的 dev origin。
- Modify: `frontend/package.json`
  - 责任：把默认 `dev` 切到 webpack 安全路径，并保留可选的 `dev:turbo`。
- Modify: `frontend/next.config.js`
  - 责任：补 `allowedDevOrigins`，减少 `127.0.0.1` 经 Nginx 访问 dev 资源时的跨源阻塞。
- Modify: `README.md`
  - 责任：更新开发启动说明，明确默认 dev 路径和非 ASCII 目录兼容策略。
- Modify: `backend/CLAUDE.md`
  - 责任：同步开发工作流说明，保持与代码和 README 一致。

## Task 1: 修复 Backend Embedded Stream 的 `additional_kwargs=None` 缺陷

**Files:**
- Modify: `backend/tests/test_thread_event_logging.py`
- Modify: `backend/packages/harness/nion/client.py`
- Test: `backend/tests/test_thread_event_logging.py`

- [ ] **Step 1: 写一条聚焦的失败回归测试**

在 `backend/tests/test_thread_event_logging.py` 现有 `test_embedded_agent_stream_records_run_events` 旁边新增下面这条测试，专门锁住 `additional_kwargs` 缺省时不能把 `None` 传给 `HumanMessage`：

```python
def test_embedded_agent_stream_tolerates_missing_additional_kwargs(
    tmp_path,
    monkeypatch,
) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None

    with patch("nion.client.get_app_config", return_value=MagicMock()):
        client = NionClient()

    agent = MagicMock()
    agent.stream.return_value = iter([{"messages": [AIMessage(content="ok", id="ai-1")]}])

    with (
        patch.object(client, "_ensure_agent"),
        patch.object(client, "_agent", agent),
    ):
        events = list(
            client.stream(
                "hello",
                thread_id="thread-no-extra",
                human_message_payload={"content": "hello"},
            )
        )

    assert events[-1].type == "end"
```

- [ ] **Step 2: 跑这条测试，确认它先红**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest tests/test_thread_event_logging.py::test_embedded_agent_stream_tolerates_missing_additional_kwargs -q
```

Expected:

- FAIL
- 报错里包含 `HumanMessage` 与 `additional_kwargs`

- [ ] **Step 3: 写最小实现，只在 `dict` 时传 `additional_kwargs`**

把 `backend/packages/harness/nion/client.py` 中 `HumanMessage(...)` 这一段改成显式组装 kwargs，不再把 `None` 传进去：

```python
        human_payload = human_message_payload or {}
        human_content = human_payload.get("content", message)
        human_additional_kwargs = human_payload.get("additional_kwargs")
        human_message_kwargs: dict[str, Any] = {
            "content": human_content,
        }
        if isinstance(human_additional_kwargs, dict):
            human_message_kwargs["additional_kwargs"] = human_additional_kwargs

        state: dict[str, Any] = {
            "messages": [HumanMessage(**human_message_kwargs)]
        }
```

- [ ] **Step 4: 跑回归测试和现有事件日志测试，确认都绿**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest \
  tests/test_thread_event_logging.py::test_embedded_agent_stream_tolerates_missing_additional_kwargs \
  tests/test_thread_event_logging.py::test_embedded_agent_stream_records_run_events \
  -q
```

Expected:

- PASS
- 不再出现 `ValidationError`

- [ ] **Step 5: 提交**

```bash
git add backend/tests/test_thread_event_logging.py backend/packages/harness/nion/client.py
git commit -m "fix: avoid none additional kwargs in embedded stream"
```

## Task 2: 修复 CLI mention 的空白 `displayName` 回退

**Files:**
- Modify: `frontend/src/components/workspace/input-box.tsx`
- Test: `frontend/src/components/workspace/cli-tools/cli-tools.contract.test.ts`

- [ ] **Step 1: 直接使用现有红灯作为回归测试**

不要先改实现。`frontend/src/components/workspace/cli-tools/cli-tools.contract.test.ts` 已经包含目标断言：

```ts
assert.match(source, /tool\.displayName\?\.trim\(\) \|\| toolId/);
```

- [ ] **Step 2: 跑单测，确认它先红**

Run:

```bash
cd frontend
pnpm exec node --test src/components/workspace/cli-tools/cli-tools.contract.test.ts
```

Expected:

- FAIL
- 失败项是 `CLI composer popover keeps manage-tools affordance`

- [ ] **Step 3: 把 `??` 改成 `||`，只修空白字符串回退**

在 `frontend/src/components/workspace/input-box.tsx` 的 `cliMentionOptions` 映射里改这一行：

```ts
          label: tool.displayName?.trim() || toolId,
```

保留其余字段不动：

```ts
          description: tool.version
            ? `v${tool.version} · ${tool.description}`
            : tool.description,
```

- [ ] **Step 4: 只跑 CLI 相关 contract test，确认转绿**

Run:

```bash
cd frontend
pnpm exec node --test \
  src/components/workspace/cli-tools/cli-tools.contract.test.ts \
  src/core/threads/cli-selection-payload.contract.test.ts
```

Expected:

- PASS
- 不引入新的 CLI payload 断言失败

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/workspace/input-box.tsx
git commit -m "fix: fallback to cli tool id for blank display names"
```

## Task 3: 修复 Bridge desktop-only fallback 的 i18n 回退

**Files:**
- Modify: `frontend/src/components/workspace/bridge/BridgeSection.tsx`
- Test: `frontend/src/core/bridge/client-availability.test.ts`

- [ ] **Step 1: 直接使用现有红灯作为回归测试**

`frontend/src/core/bridge/client-availability.test.ts` 已经要求 fallback 走 locale contract：

```ts
assert.match(source, /t\.bridge\.desktopOnly/);
```

- [ ] **Step 2: 跑单测，确认它先红**

Run:

```bash
cd frontend
pnpm exec node --test src/core/bridge/client-availability.test.ts
```

Expected:

- FAIL
- 失败项是 `bridge section handles missing bridge client without throwing`

- [ ] **Step 3: 把硬编码英文改成 `desktopOnly` 文案**

在 `frontend/src/components/workspace/bridge/BridgeSection.tsx` 的 `if (!client)` 分支里，把：

```tsx
          Bridge is only available in the desktop app.
```

替换成：

```tsx
          {t("bridge.desktopOnly")}
```

完整片段应为：

```tsx
  if (!client) {
    return (
      <SettingsCard>
        <p className="text-sm text-muted-foreground">
          {t("bridge.desktopOnly")}
        </p>
      </SettingsCard>
    );
  }
```

- [ ] **Step 4: 跑 Bridge 相关测试，确认转绿**

Run:

```bash
cd frontend
pnpm exec node --test \
  src/core/bridge/client-availability.test.ts \
  src/core/i18n/locales/bridge-modules.test.ts
```

Expected:

- PASS

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/workspace/bridge/BridgeSection.tsx
git commit -m "fix: localize bridge desktop-only fallback"
```

## Task 4: 对齐 Notebook 路由测试与当前 shell 架构

**Files:**
- Modify: `frontend/src/components/workspace/notebook-routes.test.ts`
- Verify: `frontend/src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts`
- Verify: `frontend/src/components/workspace/notebook/notebook-shell.contract.test.ts`

- [ ] **Step 1: 先把新架构断言加进去，但先保留旧断言，让测试继续红**

在 `frontend/src/components/workspace/notebook-routes.test.ts` 的最后一个测试里，先在旧断言下面追加当前 shell 架构的断言：

```ts
  assert.match(source, /notebookAssistantSessionId/);
  assert.match(source, /startNotebookAssistantConversation/);
  assert.match(source, /<NotebookContextPanel/);
  assert.match(source, /pathOfNotebookTrash/);
```

先不要删掉这条旧断言：

```ts
  assert.match(source, /buildNotebookAssistPrompt/);
```

- [ ] **Step 2: 跑测试，确认它还是因为旧断言而红**

Run:

```bash
cd frontend
pnpm exec node --test \
  src/components/workspace/notebook-routes.test.ts \
  src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-shell.contract.test.ts
```

Expected:

- FAIL
- 失败点仍是 `buildNotebookAssistPrompt`

- [ ] **Step 3: 删除过时断言，只保留当前 shell 契约**

把这个测试收敛成下面这版：

```ts
void test("notebook page exposes the shell-based assistant entry points", async () => {
  const source = await readFile(
    new URL("./notebook/notebook-page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /notebookAssistantSessionId/);
  assert.match(source, /startNotebookAssistantConversation/);
  assert.match(source, /<NotebookContextPanel/);
  assert.match(source, /pathOfNotebookTrash/);
});
```

- [ ] **Step 4: 跑 notebook 路由与 panel contract test，确认全部转绿**

Run:

```bash
cd frontend
pnpm exec node --test \
  src/components/workspace/notebook-routes.test.ts \
  src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-shell.contract.test.ts
```

Expected:

- PASS
- 不再要求 `NotebookPage` 直接持有旧 prompt 构造逻辑

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/workspace/notebook-routes.test.ts
git commit -m "test: align notebook route smoke test with shell architecture"
```

## Task 5: 稳定默认前端开发面，绕开 Turbopack 中文路径 panic

**Files:**
- Create: `frontend/src/core/config/dev-surface.contract.test.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/next.config.js`

- [ ] **Step 1: 先写一个会失败的 contract test，锁住安全默认值**

新增 `frontend/src/core/config/dev-surface.contract.test.ts`：

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("frontend dev defaults to webpack and allows localhost proxy origins", async () => {
  const packageJson = JSON.parse(
    await readFile(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as {
    scripts?: Record<string, string>;
  };
  const nextConfigSource = await readFile(
    new URL("../../../next.config.js", import.meta.url),
    "utf8",
  );

  assert.equal(packageJson.scripts?.dev, "next dev --webpack");
  assert.equal(packageJson.scripts?.["dev:turbo"], "next dev --turbo");
  assert.match(
    nextConfigSource,
    /allowedDevOrigins:\s*\[\s*"127\.0\.0\.1",\s*"localhost"\s*\]/,
  );
});
```

- [ ] **Step 2: 跑新测试，确认先红**

Run:

```bash
cd frontend
pnpm exec node --test src/core/config/dev-surface.contract.test.ts
```

Expected:

- FAIL
- `scripts.dev` 还是 `next dev --turbo`
- `allowedDevOrigins` 还不存在

- [ ] **Step 3: 把默认 dev 切到 webpack，并保留显式 turbo 入口**

修改 `frontend/package.json`：

```json
  "scripts": {
    "demo:save": "node scripts/save-demo.js",
    "build": "next build",
    "check": "pnpm lint && pnpm typecheck",
    "dev": "next dev --webpack",
    "dev:turbo": "next dev --turbo",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix",
    "preview": "next build && next start",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
```

- [ ] **Step 4: 在 Next config 里允许 `127.0.0.1` 与 `localhost` 的 dev origin**

修改 `frontend/next.config.js`：

```js
const config = {
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  ...(isStaticExport ? { output: "export" } : {}),
  images: {
    unoptimized: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    return [
      {
        source: "/api/langgraph/:path*",
        destination: "http://127.0.0.1:2024/:path*",
      },
      {
        source: "/api/:path*",
        destination: "http://127.0.0.1:8001/api/:path*",
      },
    ];
  },
};
```

- [ ] **Step 5: 跑 contract test，并手工验证 workspace 页面不再是 `_error`**

Run:

```bash
cd frontend
pnpm exec node --test src/core/config/dev-surface.contract.test.ts
```

Expected:

- PASS

然后从仓库根目录执行：

```bash
make dev
curl -s -o /tmp/nion-chats.html -w '%{http_code}\n' 'http://127.0.0.1:2026/workspace/chats?thread=new'
grep -q '"page":"/_error"' /tmp/nion-chats.html && echo BAD || echo OK
curl -s -o /tmp/nion-projects.html -w '%{http_code}\n' 'http://127.0.0.1:2026/workspace/projects'
grep -q '"page":"/_error"' /tmp/nion-projects.html && echo BAD || echo OK
curl -s -o /tmp/nion-bridge.html -w '%{http_code}\n' 'http://127.0.0.1:2026/workspace/bridge'
grep -q '"page":"/_error"' /tmp/nion-bridge.html && echo BAD || echo OK
```

Expected:

- 三个 `curl` 都返回 `200`
- 三个 `grep` 都输出 `OK`

- [ ] **Step 6: 提交**

```bash
git add frontend/src/core/config/dev-surface.contract.test.ts frontend/package.json frontend/next.config.js
git commit -m "fix: stabilize frontend dev surface under non-ascii paths"
```

## Task 6: 同步文档并跑最终回归

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`

- [ ] **Step 1: 更新 README，说明默认 dev 路径和验证命令**

把根 README 中与前端开发有关的说明改成和代码一致，至少包含这两类信息：

```md
- `make dev` / `pnpm --dir frontend dev` 默认走 `next dev --webpack`，避免在非 ASCII 工作目录下触发 Turbopack panic。
- 若需要显式使用 Turbopack，请运行 `pnpm --dir frontend dev:turbo`。
- 当通过 `http://127.0.0.1:2026` 访问开发面时，`allowedDevOrigins` 已允许 `127.0.0.1` 与 `localhost`。
```

- [ ] **Step 2: 更新 `backend/CLAUDE.md` 的开发流程说明**

在 `backend/CLAUDE.md` 的 Commands / Development Guidelines 附近补一段，明确：

```md
- Frontend development now defaults to webpack-backed `next dev` to avoid Turbopack path panics in non-ASCII worktrees.
- Use `pnpm --dir frontend dev:turbo` only when the worktree path is ASCII-safe and Turbopack-specific behavior needs testing.
```

- [ ] **Step 3: 跑本次修复涉及的最小后端回归**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest \
  tests/test_thread_event_logging.py \
  tests/test_projects_router.py \
  tests/test_runtime_app_factory.py \
  -q
```

Expected:

- PASS

- [ ] **Step 4: 跑本次修复涉及的最小前端回归**

Run:

```bash
cd frontend
pnpm exec node --test \
  src/components/workspace/cli-tools/cli-tools.contract.test.ts \
  src/core/threads/cli-selection-payload.contract.test.ts \
  src/core/bridge/client-availability.test.ts \
  src/core/i18n/locales/bridge-modules.test.ts \
  src/components/workspace/notebook-routes.test.ts \
  src/components/workspace/notebook/notebook-assistant-panel.contract.test.ts \
  src/components/workspace/notebook/notebook-shell.contract.test.ts \
  src/core/config/dev-surface.contract.test.ts
pnpm exec tsc --noEmit -p tsconfig.json
```

Expected:

- PASS
- `tsc --noEmit` 通过

- [ ] **Step 5: 跑一次按报告收敛后的跨模块冒烟**

Run:

```bash
cd backend
UV_LINK_MODE=copy uv run pytest \
  tests/test_threads_router.py \
  tests/test_guardrail_middleware.py \
  tests/test_cli_catalog_api.py \
  tests/test_runtime_profile_api.py \
  tests/test_gateway_config_api.py \
  tests/test_notebook_api.py \
  tests/test_automation_router.py \
  tests/test_custom_agent.py \
  tests/test_desktop_helper_health.py \
  tests/test_local_daemon_api.py \
  tests/test_daemon_diagnostics_api.py \
  tests/test_daemon_channels_api.py \
  -q
```

Expected:

- PASS

- [ ] **Step 6: 提交**

```bash
git add README.md backend/CLAUDE.md
git commit -m "docs: update dev workflow after test regression fixes"
```

## Self-Review

### 1. Spec coverage

- 已覆盖报告中的后端真实缺陷：
  - `NionClient.stream()` 传 `additional_kwargs=None`
- 已覆盖报告中的两个前端真实回归：
  - CLI mention 空白 `displayName` 不回退
  - Bridge fallback 未走 i18n
- 已覆盖报告中的 Notebook 陈旧测试：
  - `notebook-routes.test.ts` 仍要求旧的 `buildNotebookAssistPrompt`
- 已覆盖浏览器 E2E 主阻塞：
  - `next dev --turbo` 在中文路径下 panic，导致 `/workspace/*` 500
- 已包含最终回归和文档同步

### 2. Placeholder scan

- 没有 `TODO`、`TBD`、`implement later`
- 每个任务都给了具体文件、命令、预期结果
- 每个代码步骤都给了明确代码片段

### 3. Type consistency

- Backend 修复统一使用 `human_message_kwargs`
- CLI mention 修复统一使用 `tool.displayName?.trim() || toolId`
- Bridge fallback 统一使用 `t("bridge.desktopOnly")`
- Notebook shell 对齐统一使用 `notebookAssistantSessionId` / `startNotebookAssistantConversation`
- Dev surface contract 统一锁定 `scripts.dev === "next dev --webpack"` 与 `scripts["dev:turbo"] === "next dev --turbo"`

### 4. 明确不纳入本计划的项

- `http://127.0.0.1:2026/api/daemon/runtime-info` 的 404 暂不纳入本计划
  - 当前证据只证明它未通过 web gateway 暴露
  - 还没确认这是产品契约缺陷还是桌面 daemon 直连设计
  - 等本计划完成、workspace 页面与 Bridge smoke 恢复后，再单独开计划处理模块 09 的 desktop / daemon 路由对齐
