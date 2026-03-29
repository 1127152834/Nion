# Chat Permission / CLI Runtime / Skills Configuration Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 修复当前聊天权限恢复、CLI runtime gating、skills 配置与前端错误处理中的高风险语义问题，并用最小增量补齐回归测试与文档契约。

**Architecture:** 这次整改优先收敛 3 条主链路：`permission request -> resolve -> replay`、`CLI runtime gating state machine`、`skills list/update/load/config path`。实现上坚持最小 diff：先用测试把现有错误语义钉死，再在现有 router / store / frontend hooks 上做局部修复，不引入无必要的新层次；同时把 replay 契约、skill identity、config path 语义写进测试与文档，避免继续补丁叠补丁。

**Tech Stack:** FastAPI, Pydantic, Python 3.12, pytest, Next.js/React, TypeScript, node:test, TanStack Query

---

## Scope and sequencing

本计划按风险从高到低分 5 个任务执行：

1. 权限 resolve authz / decision 语义 / replay payload 基础契约
2. 前端 permission request 展示与重放提交修复
3. CLI `awaiting_permission` 状态机闭环
4. skills toggle / parser / config path 统一
5. 行为文档与契约测试收尾

每个任务都要求：
- 先写或改失败测试
- 只做最小实现让测试通过
- 运行该任务最小测试集
- 检查有没有补丁叠补丁，如果有，先重构再提交
- 单任务提交一次 commit

## Shared references

开始前先阅读这些文件，建立统一心智模型：
- `backend/app/gateway/routers/threads.py`
- `backend/packages/harness/nion/thread_permissions.py`
- `backend/packages/harness/nion/guardrails/middleware.py`
- `backend/packages/harness/nion/threads/service.py`
- `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- `frontend/src/core/threads/types.ts`
- `frontend/src/core/threads/hooks.ts`
- `frontend/src/core/threads/permission-request.ts`
- `frontend/src/core/api/desktop-client.ts`
- `backend/app/gateway/routers/skills.py`
- `backend/packages/harness/nion/skills/parser.py`
- `backend/packages/harness/nion/skills/validation.py`
- `backend/packages/harness/nion/config/extensions_config.py`

## Global verification commands

后续任务会反复用到这些命令：

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_thread_permission_router.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tools_runtime_gating.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_skills_router.py tests/test_skills_api.py tests/test_skills_loader.py tests/test_skills_installer.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/messages/permission-request.contract.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/core/threads/desktop-client.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck --pretty false
```

---

### Task 1: Permission Resolve Contract Hardening

**Files:**
- Modify: `backend/packages/harness/nion/thread_permissions.py`
- Modify: `backend/app/gateway/routers/threads.py`
- Modify: `backend/tests/test_thread_permission_router.py`
- Create or modify: `backend/tests/test_thread_permissions_store.py`
- Optional docs note: `docs/suggestion/02-permission-request-guardrail-resolution.md`

**Step 1: Write the failing backend tests for replay payload and authz scaffold**

在 `backend/tests/test_thread_permission_router.py` 里新增这些测试，先让它们失败：

```python
def test_workspace_permission_resolve_returns_replay_payload_not_only_text(...):
    ...
    assert response.json()["replay_payload"] == {
        "text": "帮我安装 stripe CLI",
        "files": [],
        "additional_kwargs": {
            "shortcut_selections": {
                "cliTools": ["stripe"]
            }
        },
    }


def test_workspace_permission_resolve_rejects_mismatched_thread_request_pair(...):
    ...
    assert response.status_code in {400, 404}
    assert response.json()["ok"] is False
```

如果当前 router 暂时没有真正的用户身份概念，不要伪造完整 auth 系统；先把“必须属于 thread + request 配对”以及“不能只靠 request id 模糊放行”钉成测试。把真正的 caller ownership 校验作为后续可扩展钩子写在注释与文档里。

**Step 2: Add store-level tests for decision semantics**

在 `backend/tests/test_thread_permissions_store.py` 增加：

```python
def test_allow_session_marks_thread_profile_full_access(...):
    ...


def test_allow_creates_single_pending_allow_entry(...):
    ...


def test_permission_request_persists_replay_payload(...):
    ...
```

这里的目标是把 `ThreadPermissionRequestRecord` 从只保存 `original_message_text`，升级到保存一个结构化 `replay_payload`。如果还需要暂时兼容旧字段，可以保留 `original_message_text` 作为派生字段，但新逻辑必须只以 `replay_payload` 为准。

**Step 3: Run tests to verify failure**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_thread_permission_router.py tests/test_thread_permissions_store.py -q
```

Expected: FAIL，提示缺少 `replay_payload` 字段或返回结构不匹配。

**Step 4: Implement minimal backend contract**

在 `backend/packages/harness/nion/thread_permissions.py`：
- 给 `ThreadPermissionRequestRecord` 增加 `replay_payload: dict[str, Any]`
- `create_thread_permission_request()` 接收结构化 payload，而不是只接 `original_message_text`
- 暂时兼容读取旧数据：如果磁盘上没有 `replay_payload`，则退化为 `{"text": original_message_text, "files": [], "additional_kwargs": {}}`
- 保持 `allow` 仍然按 tool signature 生成 `pending_allows`
- 保持 `allow_session` 仍然写 thread-level `full_access`

在 `backend/app/gateway/routers/threads.py`：
- `_resolve_permission_request()` 返回 `replay_payload`
- 保留 `original_message_text` 一到两个过渡版本可以接受，但前端后续不再使用它
- 对 `thread_id` / `permission_request_id` 不匹配返回稳定错误
- 如果你能在当前 surface 里拿到 caller/thread ownership 语义，就在这里加显式校验；如果拿不到，不要编造系统，先把函数抽成 `_authorize_permission_resolution(...)` 占位，默认只校验 thread/request 配对并留下 TODO

**Step 5: Run tests to verify pass**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_thread_permission_router.py tests/test_thread_permissions_store.py -q
```

Expected: PASS

**Step 6: Commit**

```bash
git add backend/packages/harness/nion/thread_permissions.py backend/app/gateway/routers/threads.py backend/tests/test_thread_permission_router.py backend/tests/test_thread_permissions_store.py
git commit -m "fix: harden permission resolve replay contract"
```

---

### Task 2: Frontend Permission Replay And Pending Visibility Fix

**Files:**
- Modify: `frontend/src/app/workspace/chats/chat-thread-page.tsx`
- Modify: `frontend/src/core/threads/types.ts`
- Modify: `frontend/src/core/threads/permission-request.ts`
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/components/workspace/messages/permission-request.contract.test.ts`
- Modify: `frontend/src/core/threads/desktop-client.test.ts`
- Optional add unit test: `frontend/src/core/threads/permission-request.test.ts`

**Step 1: Write the failing frontend contract tests**

在 `frontend/src/components/workspace/messages/permission-request.contract.test.ts` 增加/改写断言：

```ts
assert.match(pageSource, /resolution\.replay_payload/);
assert.match(pageSource, /handleSubmit\(resolution\.replay_payload/);
assert.doesNotMatch(pageSource, /text: resolution\.original_message_text/);
```

并补一条对 pending 展示的测试，如果没有现成行为测试就先写纯函数测试：

```ts
test("derivePendingPermissionRequest does not hide pending request only because a later human message exists when request is still unresolved", () => {
  ...
});
```

**Step 2: Run tests to verify failure**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/messages/permission-request.contract.test.ts src/core/threads/desktop-client.test.ts
```

Expected: FAIL，因为页面仍然依赖 `original_message_text`。

**Step 3: Implement minimal frontend changes**

在 `frontend/src/core/threads/types.ts` 为 permission resolve 结果补类型：

```ts
export type PermissionReplayPayload = {
  text: string;
  files: FileInMessage[];
  additional_kwargs?: Record<string, unknown>;
};
```

在 `frontend/src/core/api/desktop-client.ts`：
- 给 `resolvePermission()` 的返回值建明确类型
- 保留兼容字段，但新主字段是 `replay_payload`

在 `frontend/src/app/workspace/chats/chat-thread-page.tsx`：
- `handlePermissionDecision()` 改为优先重放 `resolution.replay_payload`
- `handleSubmit(...)` 直接拿结构化 payload
- 如果 payload 缺失，再短期 fallback 到 `original_message_text`
- 加失败提示，不要只 `console.error`

在 `frontend/src/core/threads/permission-request.ts`：
- `derivePendingPermissionRequest()` 不要仅因“后面有 human message”就立刻返回 `null`
- 改成只隐藏“已经被明确 resolve / consumed”的 request
- 如果当前消息模型拿不到 resolved state，就至少改为“只看最后一个 permission_request tool message”，不要被普通 human message 抢走可见性

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/messages/permission-request.contract.test.ts src/core/threads/desktop-client.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/app/workspace/chats/chat-thread-page.tsx frontend/src/core/threads/types.ts frontend/src/core/threads/permission-request.ts frontend/src/core/api/desktop-client.ts frontend/src/components/workspace/messages/permission-request.contract.test.ts frontend/src/core/threads/desktop-client.test.ts
git commit -m "fix: replay structured permission payload in chat"
```

---

### Task 3: CLI Awaiting Permission State Machine Closure

**Files:**
- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Modify: `backend/packages/harness/nion/threads/models.py`
- Modify: `backend/tests/test_cli_tools_runtime_gating.py`
- Optional modify: `backend/tests/test_guardrail_middleware.py`
- Optional modify: `backend/tests/test_thread_permission_router.py`

**Step 1: Write the failing CLI runtime gating tests**

在 `backend/tests/test_cli_tools_runtime_gating.py` 里增加真实状态推进测试：

```python
def test_thread_service_marks_cli_management_awaiting_permission_when_cli_guardrail_interrupts(...):
    ...
    assert state["values"]["cli_management"]["phase"] == "awaiting_permission"
    assert state["values"]["cli_management"]["pending_permission_request_id"] == request_id


def test_permission_resolution_clears_pending_cli_permission_and_restores_managing(...):
    ...
    assert next_state["values"]["cli_management"]["phase"] == "managing"
    assert next_state["values"]["cli_management"]["pending_permission_request_id"] is None
```

如果 guardrail middleware 当前不直接操作 thread repository，就补一个最小桥接，不要重做整套架构。

**Step 2: Run tests to verify failure**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tools_runtime_gating.py -q
```

Expected: FAIL，因为生产路径没有真正写入 `awaiting_permission`。

**Step 3: Implement minimal state transitions**

目标状态图：

```text
inactive -> managing -> awaiting_permission -> managing | inactive
```

实现建议：
- 在 `guardrails/middleware.py` 创建 permission request 时，如果当前工具是 CLI builtin tool，就把 thread state 更新到：
  - `active=True`
  - `phase="awaiting_permission"`
  - `pending_permission_request_id=<new id>`
  - `last_trigger="permission_request"`
- 在 permission resolve 成功后，把 `pending_permission_request_id` 清空，并按决策恢复为：
  - `allow/allow_session` -> `managing`
  - `deny` -> `inactive` 或保留 `managing`，以产品语义为准，但必须写进测试
- 不要让 `ThreadService._next_cli_management_state()` 单独猜测外部状态；要把“状态是怎么被写进去的”补齐

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_cli_tools_runtime_gating.py tests/test_guardrail_middleware.py -q
```

Expected: PASS

**Step 5: Commit**

```bash
git add backend/packages/harness/nion/guardrails/middleware.py backend/packages/harness/nion/threads/service.py backend/packages/harness/nion/threads/models.py backend/tests/test_cli_tools_runtime_gating.py backend/tests/test_guardrail_middleware.py
git commit -m "fix: wire cli permission gating into thread state"
```

---

### Task 4: Skills Toggle / Identity / Parser / Config Path Unification

**Files:**
- Modify: `frontend/src/core/skills/api.ts`
- Modify: `frontend/src/core/skills/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/skill-settings-page.tsx`
- Modify: `backend/app/gateway/routers/skills.py`
- Modify: `backend/packages/harness/nion/skills/parser.py`
- Modify: `backend/packages/harness/nion/skills/validation.py`
- Modify: `backend/packages/harness/nion/skills/loader.py`
- Modify: `backend/packages/harness/nion/config/extensions_config.py`
- Modify: `backend/tests/test_skills_router.py`
- Modify: `backend/tests/test_skills_api.py`
- Modify: `backend/tests/test_skills_loader.py`
- Optional add: `backend/tests/test_skills_parser.py`

**Step 1: Write the failing tests for toggle failure and parser parity**

在 `backend/tests/test_skills_router.py` / `backend/tests/test_skills_api.py` 增加：

```python
def test_update_skill_writes_resolved_extensions_config_path(...):
    ...


def test_duplicate_skill_names_are_not_addressed_by_name_only(...):
    ...
```

在 `backend/tests/test_skills_loader.py` 增加：

```python
def test_load_skills_uses_yaml_parser_for_multiline_description(...):
    ...
```

前端至少补一个行为测试或最小 contract 断言，证明 `enableSkill()` 会对非 2xx 抛错，而不是静默成功。

**Step 2: Run tests to verify failure**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_skills_router.py tests/test_skills_api.py tests/test_skills_loader.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/messages/permission-request.contract.test.ts src/core/threads/desktop-client.test.ts
```

Expected: 至少 skills loader / router 相关测试失败。

**Step 3: Implement minimal skills fixes**

后端：
- `frontend/src/core/skills/api.ts` 的镜像修复要先做：`enableSkill()` 必须检查 `response.ok`，失败时抛错
- `useEnableSkill()` 只在 mutation 成功时 invalidation；失败由 UI toast 呈现
- `backend/packages/harness/nion/skills/parser.py` 改为和 validation 使用同一套 YAML 解析，不再手写 `split(':', 1)`
- `backend/packages/harness/nion/skills/loader.py` 与 installer / validation 共用解析结果，避免一边能装一边读不全
- `backend/app/gateway/routers/skills.py` 不再在 resolver 返回 `None` 时自己拼 `Path.cwd().parent / "extensions_config.json"`
- 给 skills route 抽一个统一的 `resolve_or_initialize_extensions_config_path()` helper，MCP router 也复用它
- skill identity 不要再只靠 `name`。最小方案：API 返回 `id = "{category}:{skill_path}"`，更新/删除仍暂时兼容 name 路由，但内部优先按 `category + relative_path` 识别。不要一口气重写全路由层。

前端：
- `skill-settings-page.tsx` 渲染 key、toggle 行为、删除行为都为后续 `skill.id` 做准备
- 至少把 mutation 失败 toast 补上

**Step 4: Run tests to verify pass**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_skills_router.py tests/test_skills_api.py tests/test_skills_loader.py tests/test_skills_installer.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck --pretty false
```

Expected: PASS

**Step 5: Commit**

```bash
git add frontend/src/core/skills/api.ts frontend/src/core/skills/hooks.ts frontend/src/components/workspace/settings/skill-settings-page.tsx backend/app/gateway/routers/skills.py backend/packages/harness/nion/skills/parser.py backend/packages/harness/nion/skills/validation.py backend/packages/harness/nion/skills/loader.py backend/packages/harness/nion/config/extensions_config.py backend/tests/test_skills_router.py backend/tests/test_skills_api.py backend/tests/test_skills_loader.py backend/tests/test_skills_installer.py
git commit -m "fix: unify skill config parsing and toggle semantics"
```

---

### Task 5: Contract Docs, Replay Boundary Notes, And Final Verification

**Files:**
- Modify: `docs/suggestion/modular-suggestions.md`
- Modify: `docs/suggestion/02-permission-request-guardrail-resolution.md`
- Modify: `docs/suggestion/03-cli-tools-runtime-gating.md`
- Modify: `docs/suggestion/05-settings-configuration-desktop-compatibility.md`
- Optional create: `docs/test/permission-cli-skills-contract-matrix.md`

**Step 1: Write or update docs tests/checklist**

如果没有文档测试，就在计划里手工执行，但文档必须写清这些契约：
- `allow` / `allow_session` / `deny` 的真实后端语义
- replay payload 的结构与兼容字段
- CLI `awaiting_permission` 的状态推进
- skill identity 的稳定键
- extensions config path 的唯一来源

**Step 2: Update docs with exact contracts**

文档不要写空泛建议，直接写契约：

```md
Permission resolve success response:
- ok: boolean
- decision: allow | allow_session | deny
- consumed: boolean
- replay_payload: { text, files, additional_kwargs }
```

并明确：
- `allow_session` 当前是 thread-scope bridge permission，不要写成模糊的 session/global
- 模块 04 仍是架构边界问题，不与已确认 defect 混排

**Step 3: Run final verification**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && UV_LINK_MODE=copy uv run pytest tests/test_thread_permission_router.py tests/test_thread_permissions_store.py tests/test_cli_tools_runtime_gating.py tests/test_skills_router.py tests/test_skills_api.py tests/test_skills_loader.py tests/test_skills_installer.py -q
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && node --test src/components/workspace/messages/permission-request.contract.test.ts src/core/threads/desktop-client.test.ts
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend && pnpm typecheck --pretty false
```

Expected: PASS

**Step 4: Commit**

```bash
git add docs/suggestion/modular-suggestions.md docs/suggestion/02-permission-request-guardrail-resolution.md docs/suggestion/03-cli-tools-runtime-gating.md docs/suggestion/05-settings-configuration-desktop-compatibility.md
git commit -m "docs: codify permission cli and skills contracts"
```

---

## Notes for the implementing engineer

- 不要先大重构。先让测试把错误语义钉住，再做最小修复。
- 不要在 Task 1 就引入完整 auth 系统。当前代码没有稳定 caller identity，就先把 thread/request pairing、bridge surface 语义、函数边界抽出来，给后续 authz 留口。
- `allow_session` 语义一定要和产品文案同步，不要继续让代码和 label 漂移。
- `replay_payload` 的目标不是“把所有状态都塞进去”，而是只包含重新提交同一请求所需的最小提交契约：`text/files/additional_kwargs/context-derived selections`。
- 每个任务结束前都问自己：这是不是补丁叠补丁。如果是，就先把共用 helper / 类型收束，再提交。

## Recommended commit order

1. `fix: harden permission resolve replay contract`
2. `fix: replay structured permission payload in chat`
3. `fix: wire cli permission gating into thread state`
4. `fix: unify skill config parsing and toggle semantics`
5. `docs: codify permission cli and skills contracts`
