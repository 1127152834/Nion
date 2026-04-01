# Bridge Config To Config DB Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Bridge 的配置项迁入统一 `config.db` / Config Center，同时保留 bindings / offsets / incidents / observations / weixin account 等运行态本地存储。

**Architecture:** 后端 `AppConfig` 新增 `bridge` section，Config Center `/api/config` 成为 Bridge 配置真源。desktop Bridge 不再以本地 `settings` store 为配置真源，而是通过统一配置接口读写桥接配置；本地 runtime store 继续保留当前职责。

**Tech Stack:** FastAPI, Pydantic, SQLite Config Center, Electron main, React 19, node:test, pytest

---

### Task 1: 定义 Bridge 配置 schema 并锁住后端 API 行为

**Files:**
- Create: `backend/packages/harness/nion/config/bridge_config.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `backend/app/gateway/routers/config.py`
- Modify: `backend/tests/test_gateway_config_api.py`
- Modify: `backend/CLAUDE.md`

- [ ] **Step 1: 写 failing test，断言 `/api/config` round-trip 保留 bridge section**

```python
def test_gateway_config_api_round_trip_includes_bridge(monkeypatch, tmp_path):
    ...
    payload = client.get("/api/config").json()
    assert "bridge" in payload["config"]
```

- [ ] **Step 2: 运行后端配置 API 测试并确认失败**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_gateway_config_api.py -q
```

Expected: FAIL because `bridge` section does not exist yet.

- [ ] **Step 3: 最小实现 `BridgeConfig` 与 `AppConfig.bridge`**

```python
class TelegramBridgeConfig(BaseModel):
    enabled: bool = False
    bot_token: str = ""
    chat_id: str = ""
    allowed_users: str = ""
    verified: bool = False
    verified_at: str | None = None
    verified_fingerprint: str = ""
```

- [ ] **Step 4: 把 bridge section 加入 Config Center schema**

```python
"bridge": ConfigSectionSchema(
    title="Bridge",
    description="Configure cross-channel bridge credentials and defaults.",
),
```

- [ ] **Step 5: 重新运行后端配置 API 测试并确认通过**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_gateway_config_api.py -q
```

Expected: PASS

### Task 2: 保持 desktop runtime store 只管理本地运行态

**Files:**
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/bridge/bridge-manager.ts`
- Modify: `desktop/tests/bridge-storage-contract.test.mjs`
- Modify: `desktop/tests/bridge-main-contract.test.mjs`

- [ ] **Step 1: 写 failing contract test，断言 desktop 不再创建 bridge settings JSON**

```js
assert.doesNotMatch(source, /bridge", "settings\\.json"/);
assert.match(source, /api\\/config/);
```

- [ ] **Step 2: 运行 desktop contract test 并确认失败**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-storage-contract.test.mjs tests/bridge-main-contract.test.mjs
```

Expected: FAIL because desktop still instantiates `createBridgeSettingsStore(...)`.

- [ ] **Step 3: 删除 bridge settings 本地真源接线，只保留 runtime stores**

```ts
const bridgeBindingsStore = createBridgeBindingsStore(path.join(environment.userDataPath, "bridge", "bindings.json"));
const bridgeOffsetStore = createBridgeOffsetStore(path.join(environment.userDataPath, "bridge", "offsets.json"));
```

- [ ] **Step 4: desktop main 通过统一配置接口读取 bridge config**

```ts
const loadBridgeConfig = async () => {
  const response = await fetch(`${runtimeInfo.baseUrl}/api/config`);
  const payload = await response.json();
  return payload.config.bridge ?? {};
};
```

- [ ] **Step 5: 重新运行 desktop contract test 并确认通过**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-storage-contract.test.mjs tests/bridge-main-contract.test.mjs
```

Expected: PASS

### Task 3: 桌面端 Bridge 配置改走统一配置接口

**Files:**
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Modify: `frontend/src/core/bridge/client.ts`

- [ ] **Step 1: 写 failing contract test，断言 desktop bridge settings 读写改经 `/api/config`**

```js
assert.match(source, /fetch\\(`\\$\\{runtimeInfo.baseUrl\\}\\/api\\/config`/);
assert.match(source, /method: "PUT"/);
```

- [ ] **Step 2: 运行 contract test 确认失败**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-main-contract.test.mjs
```

Expected: FAIL because desktop bridge config still uses local store functions.

- [ ] **Step 3: 最小实现统一配置读写 helper**

```ts
async function readBridgeConfigFromConfigCenter() { ... }
async function writeBridgeConfigToConfigCenter(updates: Record<string, string>) { ... }
```

- [ ] **Step 4: 保持 preload / renderer Bridge API 接口不变**

```ts
getSettings: () => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.getSettings),
saveSettings: (updates) => ipcRenderer.invoke(DESKTOP_BRIDGE_IPC_CHANNELS.saveSettings, updates),
```

- [ ] **Step 5: 运行 desktop contract test 确认通过**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-main-contract.test.mjs
```

Expected: PASS

### Task 4: 迁移旧 desktop bridge settings 到 config.db

**Files:**
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/tests/bridge-main-contract.test.mjs`

- [ ] **Step 1: 写 failing contract test，断言存在 JSON -> config.db 迁移入口**

```js
assert.match(source, /migrateLegacyBridgeSettings/);
```

- [ ] **Step 2: 运行 contract test 并确认失败**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-main-contract.test.mjs
```

Expected: FAIL because migration helper does not exist yet.

- [ ] **Step 3: 最小实现一次性迁移 helper**

```ts
if (legacySettingsExists && !config.bridgeConfigured) {
  await writeBridgeConfigToConfigCenter(legacyPayload);
}
```

- [ ] **Step 4: 再跑 contract test 确认通过**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-main-contract.test.mjs
```

Expected: PASS

### Task 5: 前端 Bridge 页面改用统一配置真源

**Files:**
- Modify: `frontend/src/core/config-center/types.ts`
- Create: `frontend/src/core/bridge-config/*`
- Modify: `frontend/src/components/workspace/bridge/TelegramBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/DiscordBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/QqBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/WeixinBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Modify: `frontend/src/components/workspace/bridge/bridge-verification.contract.test.ts`
- Modify: `frontend/README.md`

- [ ] **Step 1: 写 failing contract test，断言 bridge 页面消费统一配置层而不是 desktop local settings 真源**

```ts
assert.match(source, /useBridgeConfigEditor/);
```

- [ ] **Step 2: 运行前端 bridge contract test 并确认失败**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/bridge/bridge-verification.contract.test.ts
```

Expected: FAIL because sections still read local bridge settings API as the config source.

- [ ] **Step 3: 最小实现 bridge-config hooks**

```ts
export function useBridgeConfigEditor() {
  const { draftConfig, onConfigChange, onSave } = useConfigEditor(...)
  ...
}
```

- [ ] **Step 4: 桥接页改从统一 config draft 读写配置项**

```ts
const telegram = bridgeConfig.telegram;
setBotToken(telegram.bot_token);
```

- [ ] **Step 5: 运行前端 bridge contract test 并确认通过**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/bridge/bridge-verification.contract.test.ts
```

Expected: PASS

### Task 6: 全量验证与提交

**Files:**
- Modify: `backend/CLAUDE.md`
- Modify: `frontend/README.md`

- [ ] **Step 1: 跑后端配置与 gateway 相关测试**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend && uv run pytest tests/test_gateway_config_api.py -q
```

Expected: PASS

- [ ] **Step 2: 跑 desktop bridge contract tests**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/desktop && node --test tests/bridge-main-contract.test.mjs tests/bridge-storage-contract.test.mjs
```

Expected: PASS

- [ ] **Step 3: 跑前端 bridge contract tests 与 lint**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && node --test frontend/src/components/workspace/bridge/bridge-verification.contract.test.ts
pnpm --dir frontend exec eslint src/components/workspace/bridge
```

Expected: PASS

- [ ] **Step 4: 检查是否还有 bridge settings 本地真源残留**

Run:
```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion && rg -n 'settings.json|createBridgeSettingsStore' desktop/src
```

Expected: no remaining bridge local settings truth path

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/config/bridge_config.py backend/packages/harness/nion/config/app_config.py backend/app/gateway/routers/config.py backend/tests/test_gateway_config_api.py desktop/src/main/index.ts frontend/src/components/workspace/bridge frontend/src/core/config-center/types.ts frontend/src/core/bridge-config frontend/README.md backend/CLAUDE.md
git commit -m "feat: move bridge config into config db"
```
