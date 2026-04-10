# Memory / Soul Product Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复桌面壳启动阻塞，并把 Memory / Soul / 首页 的产品面从“开发态残留”收口成正式产品。

**Architecture:** 这轮按 4 个批次推进。先修桌面壳，让 Electron 稳定出窗；然后去掉 Memory 页和 Settings / Soul 中的内部机制型说明文案；最后压缩首页欢迎区，让输入与工作入口回到视觉中心。每个批次都先写 failing test，再做最小实现，最后用 dogfood 回归。

**Tech Stack:** Electron, TypeScript, React, Next-style frontend workspace shell, Node test runner, agent-browser / dogfood

---

## File Map

### Desktop shell

- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/main/window.ts`
- Modify: `desktop/src/main/daemon-launcher.ts`
- Create: `desktop/tests/startup-window-order.contract.test.mjs`
- Modify: `desktop/tests/daemon-launcher.test.mjs`

### Memory page

- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

### Settings / Soul

- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

### Welcome / homepage

- Modify: `frontend/src/components/workspace/welcome.tsx`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Create: `frontend/src/components/workspace/welcome.contract.test.ts`

### Verification artifacts

- Reuse: `artifacts/dogfood/electron-memory-soul-2026-04-10/report.md`

## Task 1: Restore Desktop Shell Window Creation

**Files:**
- Create: `desktop/tests/startup-window-order.contract.test.mjs`
- Modify: `desktop/src/main/index.ts`
- Test: `desktop/tests/startup-window-order.contract.test.mjs`
- Test: `desktop/tests/daemon-launcher.test.mjs`

- [ ] **Step 1: Write the failing contract test for startup order**

```js
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("desktop main creates the window before bridge runtime restoration", () => {
  const source = fs.readFileSync(
    new URL("../src/main/index.ts", import.meta.url),
    "utf8",
  );

  const createWindowIndex = source.indexOf("mainWindow = await createMainWindow(");
  const restoreBridgeIndex = source.indexOf("await restoreBridgeRuntimeIfNeeded();");

  assert.notEqual(createWindowIndex, -1);
  assert.notEqual(restoreBridgeIndex, -1);
  assert.ok(
    createWindowIndex < restoreBridgeIndex,
    "createMainWindow must happen before restoreBridgeRuntimeIfNeeded to avoid a blank/no-window launch",
  );
});
```

- [ ] **Step 2: Run the new desktop test to verify it fails**

Run:

```bash
node --test desktop/tests/startup-window-order.contract.test.mjs
```

Expected:

- FAIL because `restoreBridgeRuntimeIfNeeded()` currently runs before `createMainWindow()`

- [ ] **Step 3: Move bridge runtime restoration after window creation**

Implementation target in `desktop/src/main/index.ts`:

```ts
  const preloadPath = path.join(__dirname, "..", "preload", "index.js");
  const rendererUrl =
    process.env.NION_DESKTOP_RENDERER_URL?.trim() || "nion://app/index.html";

  mainWindow = await createMainWindow({
    preloadPath,
    rendererUrl,
  });

  await restoreBridgeRuntimeIfNeeded();
```

Keep `mainWindow.on("closed", ...)` and `app.on("second-instance", ...)` logic after creation. Do not add a second startup path or fallback launcher.

- [ ] **Step 4: Run the targeted desktop tests to verify they pass**

Run:

```bash
node --test \
  desktop/tests/startup-window-order.contract.test.mjs \
  desktop/tests/daemon-launcher.test.mjs
```

Expected:

- PASS

- [ ] **Step 5: Run full desktop tests**

Run:

```bash
pnpm --dir desktop test
```

Expected:

- PASS

- [ ] **Step 6: Commit Batch 1**

```bash
git add desktop/src/main/index.ts \
  desktop/tests/startup-window-order.contract.test.mjs
git commit -m "Restore desktop window creation before bridge runtime startup"
```

## Task 2: Remove Debug-Flavored Memory Copy

**Files:**
- Modify: `frontend/src/components/workspace/memory/memory-home-page.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.tsx`
- Modify: `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`
- Modify: `frontend/src/components/workspace/memory/memory-summary-cards.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

- [ ] **Step 1: Write failing contract assertions for banned Memory copy**

Add assertions in `frontend/src/components/workspace/memory/memory-home-page.contract.test.ts`:

```ts
  assert.doesNotMatch(source, /治理控制台入口/);
  assert.doesNotMatch(source, /如果有错误，直接在对话里告诉我/);
  assert.doesNotMatch(source, /如果这条记错了/);
```

Add assertions in `frontend/src/components/workspace/memory/memory-summary-cards.contract.test.ts`:

```ts
  assert.doesNotMatch(source, /summaryCards\\.userContext/);
  assert.doesNotMatch(source, /summaryCards\\.historyBackground/);
```

- [ ] **Step 2: Run the targeted frontend contract tests to verify they fail**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-summary-cards.contract.test.ts
```

Expected:

- FAIL on the old debug-flavored copy and stale summary-card keys

- [ ] **Step 3: Simplify the Memory page copy**

Implementation targets:

`frontend/src/components/workspace/memory/memory-home-page.tsx`

```tsx
<h1 className="text-[2rem] font-semibold tracking-tight">记忆</h1>
```

Delete:

- page-level explanatory paragraph about removed governance entry
- group-level paragraph about correcting via chat
- per-item footer sentence about “如果这条记错了……”

Keep the page focused on content and lightweight metadata only.

- [ ] **Step 4: Align summary cards with the three-group model**

Implementation target in `frontend/src/components/workspace/memory/memory-summary-cards.tsx`:

```tsx
const cards = [
  { label: t.settings.memory.summaryCards.factCount, value: String(memory?.fact_memories.length ?? 0) },
  { label: t.settings.memory.summaryCards.lastUpdated, value: formatTimeAgo(lastUpdated) ?? t.settings.memory.notAvailable },
  { label: t.settings.memory.summaryCards.userProfile, value: String(memory?.user_profile.length ?? 0) },
  { label: t.settings.memory.summaryCards.longTermBackground, value: String(memory?.long_term_background.length ?? 0) },
];
```

Update locale keys accordingly:

```ts
summaryCards: {
  factCount: "事实记忆",
  lastUpdated: "最近更新",
  userProfile: "用户画像",
  longTermBackground: "长期背景",
}
```

- [ ] **Step 5: Run targeted frontend tests and typecheck**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/memory/memory-home-page.contract.test.ts \
  src/components/workspace/memory/memory-summary-cards.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit Batch 2**

```bash
git add frontend/src/components/workspace/memory/memory-home-page.tsx \
  frontend/src/components/workspace/memory/memory-summary-cards.tsx \
  frontend/src/components/workspace/memory/memory-home-page.contract.test.ts \
  frontend/src/components/workspace/memory/memory-summary-cards.contract.test.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/en-US.ts
git commit -m "Remove debug-flavored copy from the Memory page"
```

## Task 3: Productize Settings / Soul

**Files:**
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

- [ ] **Step 1: Write failing contract assertions for banned Settings / Soul copy**

Add assertions:

```ts
assert.doesNotMatch(source, /这里只保留稳定层 Soul 设置/);
assert.doesNotMatch(source, /正式入口位于 Settings/);
assert.doesNotMatch(source, /稳定层只响应用户明确设置/);
```

Also add a settings-dialog assertion to ensure the user-facing fallback copy no longer mentions config-center internals.

- [ ] **Step 2: Run the targeted failing tests**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/settings/soul-settings-page.contract.test.ts
```

Expected:

- FAIL on current internal copy

- [ ] **Step 3: Simplify the Settings header fallback and Soul page**

Implementation targets:

`frontend/src/components/workspace/settings/settings-dialog.tsx`

Replace:

- `配置中心当前不可用。`

With a neutral fallback such as:

```ts
"部分设置暂时不可用。"
```

`frontend/src/components/workspace/settings/soul-settings-page.tsx`

Keep:

- section title
- four stable fields
- current overlay badge
- apply button

Delete:

- rule-explaining paragraphs
- “正式入口位于 Settings > Soul”
- all stable-layer governance explanation text

- [ ] **Step 4: Fix Settings navigation overflow at standard desktop height**

Implementation target in `frontend/src/components/workspace/settings/settings-dialog.tsx`:

Adjust container sizing so left navigation remains reachable:

```tsx
<DialogContent className="flex h-[82vh] max-h-[calc(100vh-1.5rem)] flex-col sm:max-w-5xl md:max-w-6xl">
```

And reduce sidebar grouping density if needed by tightening `space-y-*`, `py-*`, and button height values.

- [ ] **Step 5: Run targeted tests and full frontend typecheck**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/settings/soul-settings-page.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit Batch 3**

```bash
git add frontend/src/components/workspace/settings/settings-dialog.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.tsx \
  frontend/src/components/workspace/settings/soul-settings-page.contract.test.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/en-US.ts
git commit -m "Productize the Settings and Soul surfaces"
```

## Task 4: Compress the Homepage Welcome Area

**Files:**
- Create: `frontend/src/components/workspace/welcome.contract.test.ts`
- Modify: `frontend/src/components/workspace/welcome.tsx`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`

- [ ] **Step 1: Write the failing welcome contract test**

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("welcome surface keeps the input-first workspace tone", async () => {
  const source = await readFile(
    new URL("./welcome.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /animate-wave/);
  assert.doesNotMatch(source, /text-\\[clamp\\(2\\.35rem/);
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/welcome.contract.test.ts
```

Expected:

- FAIL on the oversized animated welcome heading

- [ ] **Step 3: Reduce visual weight in the welcome component**

Implementation target in `frontend/src/components/workspace/welcome.tsx`:

```tsx
<div className="mx-auto flex w-full flex-col items-center justify-center gap-3 px-4 text-center">
  <div className="text-[clamp(1.8rem,3vw,2.5rem)] font-semibold tracking-[-0.04em] text-balance text-foreground">
```

Also:

- remove the waving animation
- reduce emoji prominence
- shorten locale copy to one concise line in both languages

- [ ] **Step 4: Run welcome test and full frontend typecheck**

Run:

```bash
pnpm --dir frontend test -- --run \
  src/components/workspace/welcome.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 5: Commit Batch 4**

```bash
git add frontend/src/components/workspace/welcome.tsx \
  frontend/src/components/workspace/welcome.contract.test.ts \
  frontend/src/core/i18n/locales/zh-CN.ts \
  frontend/src/core/i18n/locales/en-US.ts
git commit -m "Compress the workspace welcome surface"
```

## Task 5: Final Verification

**Files:**
- Reuse: `artifacts/dogfood/electron-memory-soul-2026-04-10/report.md`

- [ ] **Step 1: Run full backend, frontend, and desktop verification**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests -q
pnpm --dir frontend typecheck
pnpm --dir desktop test
```

Expected:

- PASS

- [ ] **Step 2: Re-run the Electron dogfood path**

Required route:

1. Launch Electron shell
2. Verify window appears
3. Open `Memory`
4. Open `Settings > Soul`
5. Re-check homepage

Expected:

- no blank shell
- no debug-flavored Memory copy
- no internal Settings/Soul copy
- improved Settings/Soul discoverability
- lighter homepage welcome

- [ ] **Step 3: Commit any final test-only or copy polish fixes**

```bash
git add -A
git commit -m "Verify and polish the memory/soul product remediation"
```
