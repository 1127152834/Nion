# CodePilot Bridge Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Delete Nion's current channel module and rebuild a CodePilot-style Bridge module that only acts as a pure external connection center for Telegram, Feishu, Discord, QQ, and Weixin.

**Architecture:** Execute this in a dedicated worktree. Phase 1 hard-deletes the current Python `channels` subsystem, its settings page, APIs, config schema, database tables, and navigation hooks so no legacy channel behavior survives. Phase 2 recreates the feature using CodePilot as the product and module reference: a Bridge entry with a left-hand section navigator, per-platform credential/config panels, a desktop-hosted bridge runtime in Electron main, and a thin renderer client. The bridge always routes inbound messages to the single Nion main assistant; there is no per-channel assistant or subagent configuration.

**Tech Stack:** Next.js/React frontend in `frontend/`, Electron main/preload in `desktop/`, existing local daemon backend URL bridge, TypeScript `node:test`/ESLint/`tsc --noEmit`, Python backend cleanup for legacy removal, CodePilot reference code from `/tmp/codepilot`

---

### Task 1: Create The Isolated Worktree And Freeze The Replacement Scope

**Files:**
- Create worktree: `/Users/zhangtiancheng/Documents/项目/agent/nion-codepilot-bridge`
- Create: `docs/plans/2026-03-25-codepilot-bridge-rebuild.md` (this plan)
- Optional notes: `docs/plans/2026-03-25-codepilot-bridge-file-manifest.md`

**Step 1: Create the dedicated worktree**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git worktree add -b codex/codepilot-bridge-rebuild ../nion-codepilot-bridge
```

Expected: new worktree exists at `/Users/zhangtiancheng/Documents/项目/agent/nion-codepilot-bridge`.

**Step 2: Record the exact replacement boundary**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-codepilot-bridge
rg -n "core/channels|ChannelSettingsPage|/workspace/manage/channels|app.channels|/api/channels|channels_config" frontend backend desktop
```

Expected: concrete manifest of every frontend, backend, desktop, and docs reference that must be removed or rewritten.

**Step 3: Copy CodePilot reference files into a scratch manifest**

Run:

```bash
find /tmp/codepilot/src/components/bridge -maxdepth 2 -type f | sort
find /tmp/codepilot/src/lib/bridge -maxdepth 3 -type f | sort
find /tmp/codepilot/src/lib/channels -maxdepth 3 -type f | sort
```

Expected: a stable source-of-truth file list for the transplant.

**Step 4: Commit the planning checkpoint**

```bash
git add docs/plans/2026-03-25-codepilot-bridge-rebuild.md
git commit -m "plan: define CodePilot bridge replacement scope"
```

### Task 2: Hard-Delete The Existing Channel Module First

**Files:**
- Delete: `frontend/src/app/workspace/manage/channels/page.tsx`
- Delete: `frontend/src/components/workspace/settings/channel-settings-page.tsx`
- Delete: `frontend/src/components/workspace/settings/channel-settings-page.test.ts`
- Delete: `frontend/src/core/channels/api.ts`
- Delete: `frontend/src/core/channels/hooks.ts`
- Delete: `frontend/src/core/channels/index.ts`
- Delete: `frontend/src/core/channels/types.ts`
- Delete: `backend/app/channels/`
- Delete: `backend/app/gateway/routers/channels.py`
- Delete: `backend/packages/harness/nion/config/channels_config.py`
- Delete tests: `backend/tests/test_channel_repository.py`, `backend/tests/test_channel_pairing.py`, `backend/tests/test_channel_file_attachments.py`, `backend/tests/test_channels_api.py`, `backend/tests/test_channels.py`, `backend/tests/test_channel_runtime_status.py`, `backend/tests/test_feishu_parser.py`, `backend/tests/test_channel_manager_embedded.py`, `backend/tests/test_channels_router_ops.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `desktop/src/renderer/renderer-app.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Delete the old frontend channel page and hooks**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-codepilot-bridge
rm frontend/src/app/workspace/manage/channels/page.tsx
rm frontend/src/components/workspace/settings/channel-settings-page.tsx
rm frontend/src/components/workspace/settings/channel-settings-page.test.ts
rm -r frontend/src/core/channels
```

Expected: no legacy channel settings page or `core/channels` client module remains.

**Step 2: Delete the old backend channel runtime**

Run:

```bash
rm -r backend/app/channels
rm backend/app/gateway/routers/channels.py
rm backend/packages/harness/nion/config/channels_config.py
rm backend/tests/test_channel_repository.py
rm backend/tests/test_channel_pairing.py
rm backend/tests/test_channel_file_attachments.py
rm backend/tests/test_channels_api.py
rm backend/tests/test_channels.py
rm backend/tests/test_channel_runtime_status.py
rm backend/tests/test_feishu_parser.py
rm backend/tests/test_channel_manager_embedded.py
rm backend/tests/test_channels_router_ops.py
```

Expected: the legacy Python channel subsystem is gone in one commit-sized slice.

**Step 3: Remove all imports and nav entries that point at the deleted module**

Edit:
- `frontend/src/components/workspace/settings/settings-dialog.tsx`
- `frontend/src/components/workspace/workspace-nav-menu.tsx`
- `frontend/src/components/workspace/command-palette.tsx`
- `desktop/src/renderer/renderer-app.tsx`
- `backend/app/gateway/app.py`
- `backend/app/gateway/routers/__init__.py`
- `backend/packages/harness/nion/config/app_config.py`

Delete:
- settings tab entry
- `/workspace/manage/channels` route usage
- `/api/channels` router registration
- `channels: ChannelsAppConfig` from app config
- startup/shutdown hooks that start `ChannelService`

**Step 4: Remove channel locale schema and stale copy**

Edit:
- `frontend/src/core/i18n/locales/en-US.ts`
- `frontend/src/core/i18n/locales/zh-CN.ts`
- `frontend/src/core/i18n/locales/types.ts`

Delete the entire `settings.channels` subtree and old `workspace.manageChannels` copy that exists only for the deleted module.

**Step 5: Verify the deletion boundary**

Run:

```bash
rg -n "core/channels|ChannelSettingsPage|/workspace/manage/channels|app.channels|/api/channels|channels_config" frontend backend desktop
```

Expected: no matches.

**Step 6: Commit the hard-delete phase**

```bash
git add -A
git commit -m "refactor: remove the legacy channel subsystem entirely"
```

### Task 3: Introduce The New Bridge Domain And Storage Contract

**Files:**
- Create: `desktop/src/main/bridge/types.ts`
- Create: `desktop/src/main/bridge/settings-store.ts`
- Create: `desktop/src/main/bridge/bindings-store.ts`
- Create: `desktop/src/shared/bridge-ipc.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Create tests: `desktop/tests/bridge-settings-store.test.mjs`, `desktop/tests/bridge-bindings-store.test.mjs`

**Step 1: Define the bridge settings schema modeled on CodePilot**

In `desktop/src/main/bridge/types.ts`, define:

```ts
export type BridgePlatform = "telegram" | "feishu" | "discord" | "qq" | "weixin";

export type BridgeSettings = {
  remote_bridge_enabled: boolean;
  bridge_auto_start: boolean;
  bridge_default_work_dir: string;
  bridge_default_model: string;
  bridge_default_provider_id: string;
  bridge_telegram_enabled: boolean;
  bridge_feishu_enabled: boolean;
  bridge_discord_enabled: boolean;
  bridge_qq_enabled: boolean;
  bridge_weixin_enabled: boolean;
};
```

Add platform-specific config types copied from CodePilot only for those five platforms.

**Step 2: Implement desktop-side persistence without introducing new dependencies**

In `desktop/src/main/bridge/settings-store.ts`, persist a JSON file under Electron `userData`, for example:

```ts
type BridgeSettingsDocument = {
  settings: Record<string, string>;
  updatedAt: string;
};
```

In `desktop/src/main/bridge/bindings-store.ts`, persist bridge chat bindings in a second JSON file:

```ts
export type BridgeBinding = {
  id: string;
  platform: BridgePlatform;
  chatId: string;
  threadId: string;
  workingDirectory: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};
```

This is the one intentional deviation from CodePilot's `db.ts`: use userData JSON files instead of adding a new SQLite dependency.

**Step 3: Add failing tests for the store contracts**

Write:
- `desktop/tests/bridge-settings-store.test.mjs`
- `desktop/tests/bridge-bindings-store.test.mjs`

Test:
- defaults load on empty file
- save/read round-trip
- bindings upsert by `(platform, chatId)`
- deleting one binding does not mutate others

**Step 4: Run the tests**

```bash
pnpm --dir desktop exec node --test tests/bridge-settings-store.test.mjs tests/bridge-bindings-store.test.mjs
```

Expected: PASS.

**Step 5: Commit**

```bash
git add desktop/src/main/bridge/types.ts desktop/src/main/bridge/settings-store.ts desktop/src/main/bridge/bindings-store.ts desktop/src/shared/bridge-ipc.ts desktop/src/shared/ipc.ts desktop/src/preload/index.ts desktop/tests/bridge-settings-store.test.mjs desktop/tests/bridge-bindings-store.test.mjs
git commit -m "feat: add bridge settings and binding stores"
```

### Task 4: Recreate The CodePilot-Style Bridge UI Shell

**Files:**
- Create: `frontend/src/app/workspace/bridge/page.tsx`
- Create: `frontend/src/components/workspace/bridge/BridgeLayout.tsx`
- Create: `frontend/src/components/workspace/bridge/BridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/TelegramBridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/DiscordBridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/QqBridgeSection.tsx`
- Create: `frontend/src/components/workspace/bridge/WeixinBridgeSection.tsx`
- Create: `frontend/src/core/bridge/types.ts`
- Create: `frontend/src/core/bridge/client.ts`
- Create tests: `frontend/src/components/workspace/bridge/bridge-layout.test.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/components/workspace/command-palette.tsx`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`

**Step 1: Copy the CodePilot page structure**

Mirror these reference files:
- `/tmp/codepilot/src/app/bridge/page.tsx`
- `/tmp/codepilot/src/components/bridge/BridgeLayout.tsx`
- `/tmp/codepilot/src/components/bridge/BridgeSection.tsx`
- `/tmp/codepilot/src/components/bridge/*BridgeSection.tsx`

Adapt imports to the Nion workspace component library.

**Step 2: Add the new route**

Create `frontend/src/app/workspace/bridge/page.tsx` with:

```tsx
import { BridgeLayout } from "@/components/workspace/bridge/BridgeLayout";

export default function WorkspaceBridgePage() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-8">
      <BridgeLayout />
    </main>
  );
}
```

**Step 3: Add the renderer client**

In `frontend/src/core/bridge/client.ts`, wrap preload IPC:

```ts
export type BridgeClient = {
  getSettings(): Promise<Record<string, string>>;
  saveSettings(updates: Record<string, string>): Promise<void>;
  getStatus(): Promise<BridgeStatus>;
  start(): Promise<BridgeStartResult>;
  stop(): Promise<void>;
  listBindings(): Promise<BridgeBinding[]>;
  probe(platform: BridgePlatform): Promise<BridgeProbeResult>;
};
```

**Step 4: Rewire navigation**

Replace the deleted Manage Channels entry with Bridge:
- `workspace-nav-menu.tsx`
- `command-palette.tsx`

The route target must be `/workspace/bridge`.

**Step 5: Add a layout regression test**

Write `frontend/src/components/workspace/bridge/bridge-layout.test.tsx` to assert:
- left nav contains `Bridge`, `Telegram`, `Feishu`, `Discord`, `QQ`, `Weixin`
- no `ChannelSettingsPage`
- no `Session Defaults`
- no `assistant_id` fields

**Step 6: Verify**

```bash
pnpm --dir frontend exec node --test src/components/workspace/bridge/bridge-layout.test.tsx
pnpm --dir frontend exec tsc --noEmit
```

Expected: PASS.

### Task 5: Port The CodePilot Bridge Runtime Into Electron Main

**Files:**
- Create: `desktop/src/main/bridge/base-adapter.ts`
- Create: `desktop/src/main/bridge/bridge-manager.ts`
- Create: `desktop/src/main/bridge/channel-router.ts`
- Create: `desktop/src/main/bridge/conversation-engine.ts`
- Create: `desktop/src/main/bridge/adapters/telegram-adapter.ts`
- Create: `desktop/src/main/bridge/adapters/discord-adapter.ts`
- Create: `desktop/src/main/bridge/adapters/qq-adapter.ts`
- Create: `desktop/src/main/bridge/adapters/weixin-adapter.ts`
- Create: `desktop/src/main/bridge/feishu/*`
- Modify: `desktop/src/main/index.ts`
- Create tests: `desktop/tests/bridge-manager.test.mjs`, `desktop/tests/channel-router.test.mjs`

**Step 1: Copy the adapter and manager contracts**

Mirror the structure of:
- `/tmp/codepilot/src/lib/bridge/channel-adapter.ts`
- `/tmp/codepilot/src/lib/bridge/channel-router.ts`
- `/tmp/codepilot/src/lib/bridge/bridge-manager.ts`
- `/tmp/codepilot/src/lib/channels/types.ts`

Rename imports into `desktop/src/main/bridge/`.

**Step 2: Enforce the “single main assistant only” rule**

In `conversation-engine.ts`, hardcode bridge messages to one Nion target:

```ts
const MAIN_ASSISTANT_TARGET = "lead_agent";
```

No per-channel assistant selector, no subagent settings, no plan/thinking toggles.

**Step 3: Implement bindings**

When a bridge chat first sends a message:
- create or reuse a thread binding
- assign working directory from bridge defaults
- reuse the same thread for subsequent messages from the same `(platform, chatId)` pair

This mirrors CodePilot `channel_bindings` but targets Nion threads instead of CodePilot sessions.

**Step 4: Add the tests**

`desktop/tests/channel-router.test.mjs` should verify:
- first message creates a binding
- second message on same chat reuses the binding
- changing default work dir does not mutate existing binding retroactively

`desktop/tests/bridge-manager.test.mjs` should verify:
- only enabled platforms are started
- invalid config blocks start with explicit reason
- stop is idempotent

**Step 5: Verify**

```bash
pnpm --dir desktop exec node --test tests/bridge-manager.test.mjs tests/channel-router.test.mjs
```

Expected: PASS.

### Task 6: Port Feishu Streaming Cards First, Then The Other Four Platforms

**Files:**
- Create: `desktop/src/main/bridge/feishu/card-controller.ts`
- Create: `desktop/src/main/bridge/feishu/config.ts`
- Create: `desktop/src/main/bridge/feishu/gateway.ts`
- Create: `desktop/src/main/bridge/feishu/inbound.ts`
- Create: `desktop/src/main/bridge/feishu/outbound.ts`
- Create: `desktop/tests/feishu-card-controller.test.mjs`
- Modify platform sections in `frontend/src/components/workspace/bridge/*`

**Step 1: Copy Feishu card stream support as the fidelity anchor**

Use these references:
- `/tmp/codepilot/src/lib/channels/types.ts`
- `/tmp/codepilot/src/lib/channels/feishu/card-controller.ts`
- `/tmp/codepilot/src/lib/channels/feishu/config.ts`

Keep the same `CardStreamController` lifecycle:
- `create()`
- `update()`
- `finalize()`

**Step 2: Verify Feishu streaming card support with a source-level test**

Write `desktop/tests/feishu-card-controller.test.mjs` that checks:
- update calls are throttled
- finalize clears pending timer
- tool progress lines are rendered

**Step 3: Port the other four platforms without extra Nion-specific features**

Only copy the CodePilot-supported surface:
- Telegram
- Discord
- QQ
- Weixin

Do not add DingTalk, WeCom, Slack, pairing flows, session overrides, or workspace switching.

**Step 4: Verify the platform UI surface**

Run:

```bash
rg -n "assistant_id|subagent|thinking_enabled|is_plan_mode|Session Defaults|Pairing" frontend/src/components/workspace/bridge desktop/src/main/bridge
```

Expected: no matches.

### Task 7: Wire Bridge Runtime To The Existing Nion Backend

**Files:**
- Create: `desktop/src/main/bridge/nion-thread-client.ts`
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/preload/index.ts`
- Create tests: `desktop/tests/bridge-to-thread-client.test.mjs`

**Step 1: Build a minimal bridge → thread client**

Use the desktop backend base URL already available in Electron main:

```ts
export async function submitBridgeMessage(threadId: string, text: string): Promise<void> {
  await fetch(`${backendBaseUrl}/api/threads/${threadId}/runs/stream`, { ... });
}
```

This step must reuse the existing local daemon URL from `desktop/src/main/index.ts`.

**Step 2: Define the bridge preview strategy**

Use:
- Feishu card streaming if the adapter exposes `getCardStreamController()`
- normal preview hooks for Discord/Telegram when the adapter supports `sendPreview()`
- final text-only fallback for QQ/Weixin

**Step 3: Add the client test**

`desktop/tests/bridge-to-thread-client.test.mjs` should assert:
- thread creation or reuse is correct
- message submission payload contains plain user text only
- no channel-specific assistant config is injected

### Task 8: Remove The Last Residual Channel Concepts From Docs, Settings, And Tests

**Files:**
- Modify: `frontend/AGENTS.md`
- Modify: `backend/README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/desktop/development.md`
- Create: `frontend/src/core/i18n/locales/bridge-modules.test.ts`

**Step 1: Replace “channels” language with “bridge”**

Update docs and UI copy so the product says:
- `Bridge`
- `External channels`
- `Remote control`

Not:
- `Channel runtime`
- `Session defaults`
- `Authorized users`

**Step 2: Add a locale shape test for bridge copy**

Write `frontend/src/core/i18n/locales/bridge-modules.test.ts` that snapshots the new `bridge` subtree and ensures the deleted `settings.channels` subtree does not exist anymore.

**Step 3: Run full verification**

```bash
pnpm --dir frontend exec tsc --noEmit
pnpm --dir frontend exec eslint src/components/workspace/bridge src/core/bridge
pnpm --dir frontend exec node --test src/components/workspace/bridge/bridge-layout.test.tsx src/core/i18n/locales/bridge-modules.test.ts
pnpm --dir desktop exec node --test tests/bridge-settings-store.test.mjs tests/bridge-bindings-store.test.mjs tests/bridge-manager.test.mjs tests/channel-router.test.mjs tests/feishu-card-controller.test.mjs tests/bridge-to-thread-client.test.mjs
pytest backend/tests -q
```

Expected:
- frontend typecheck PASS
- bridge renderer tests PASS
- desktop bridge tests PASS
- backend tests PASS with all legacy channel tests removed

**Step 4: Final sweep for residual legacy imports**

Run:

```bash
rg -n "ChannelSettingsPage|core/channels|/api/channels|app.channels|channels_config|PairingService|authorized_users|pair_requests|session_override|assistant_id|thinking_enabled|subagent_enabled" frontend backend desktop
```

Expected: only deliberate bridge references remain; no old channel implementation references survive.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: replace channels with a CodePilot-style bridge subsystem"
```

### Task 9: Manual QA Against The Exact Product You Asked For

**Files:**
- No new source files; use the running desktop app

**Step 1: Start the app in the rebuild worktree**

Run the normal desktop dev command for this repo.

**Step 2: Verify the UX contract**

Check manually:
- old settings channel page is gone
- Bridge page exists as a first-class surface
- only Telegram / Feishu / Discord / QQ / Weixin appear
- no DingTalk / WeCom / Slack remnants
- no assistant selection or AI strategy controls in bridge UI
- Feishu streaming card mode actually updates while a long reply is running

**Step 3: Capture screenshots**

Save:
- bridge home
- each platform config page
- Feishu streaming card in progress
- binding list / status state

**Step 4: Record any gap before merge**

If Feishu card streaming falls back to static completion, stop and fix that before shipping; it is the fidelity anchor borrowed from CodePilot.

---

**Plan complete and saved to `docs/plans/2026-03-25-codepilot-bridge-rebuild.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
