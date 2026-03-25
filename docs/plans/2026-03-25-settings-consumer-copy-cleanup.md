# Settings Consumer Copy Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove engineering-facing explanations and diagnostics from the user-facing settings experience so Search, CLI Tools, Tool Settings, and Channels read like a consumer product rather than an operator console.

**Architecture:** Execute this in the dedicated worktree that actually runs the product today: `/Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild` on branch `codex/settings-openviking-rebuild`. First codify the product-language rule in `frontend/AGENTS.md`, then add an audit test that fails on banned technical phrases, then delete entire diagnostics-only UI sections where possible and simplify the remaining locale-driven copy through the existing Search / CLI / Channels helper layers. Keep operator/runtime payloads verbatim only when they are real data, not explanatory chrome.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.8, shared `useI18n` locale dictionaries, existing Search / CLI / Channels presentation helpers, `node:test`, ESLint, `tsc --noEmit`

---

### Task 1: Codify The Product Language Rule And Add A Copy Audit

**Files:**
- Modify: `frontend/AGENTS.md`
- Create: `frontend/src/core/i18n/locales/settings-consumer-copy.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing audit test**

Create `frontend/src/core/i18n/locales/settings-consumer-copy.test.ts`.

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

function settingsCopySnapshot(locale: "en" | "zh") {
  const source = locale === "en"
    ? {
        toolPage: enUS.settings.toolPage,
        search: enUS.settings.search,
        cliTools: enUS.settings.cliTools,
        channels: enUS.settings.channels,
      }
    : {
        toolPage: zhCN.settings.toolPage,
        search: zhCN.settings.search,
        cliTools: zhCN.settings.cliTools,
        channels: zhCN.settings.channels,
      };

  return JSON.stringify(source);
}

void test("settings copy avoids engineering-facing explanations", () => {
  const english = settingsCopySnapshot("en");
  const chinese = settingsCopySnapshot("zh");

  assert.doesNotMatch(
    english,
    /Runtime config status|In sync with storage|Not synced to latest storage version|Runtime warnings|Processes|\/api\/cli\/catalog|provider fallback|operator-visible|single app workspace|Pending Pair Requests|Authorized Users/i,
  );

  assert.doesNotMatch(
    chinese,
    /运行时配置状态|已与存储版本同步|尚未同步到最新存储版本|运行时警告|进程状态|\/api\/cli\/catalog|配对请求|已授权用户|当前运行时|provider fallback/i,
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/core/i18n/locales/settings-consumer-copy.test.ts
```

Expected: FAIL because the current locale dictionaries still contain those technical phrases.

**Step 3: Add the policy to `frontend/AGENTS.md` and simplify top-level settings copy**

Add a short rule block under code-style / working guidance in `frontend/AGENTS.md`:

```md
- User-facing settings copy is written for non-technical people.
- Delete implementation detail instead of explaining it.
- Do not expose storage paths, API routes, runtime version sync state, provider fallback chains, process lists, or other internal mechanics in settings UI copy.
```

At the same time, simplify the top-level locale descriptions in `types.ts`, `en-US.ts`, and `zh-CN.ts` for:
- `settings.search.description`
- `settings.cliTools.description`
- `settings.channels.description`
- `settings.toolPage.*` keys that will remain after diagnostics removal

Target direction:
- `Search`: “Choose how Nion finds information online.”
- `CLI Tools`: “Choose which helper apps Nion can use.”
- `Channels`: “Connect chat apps and manage who can use them.”
- `Tool Settings`: only consumer-facing labels should remain after Task 2.

**Step 4: Update the locale schema for keys that are being deleted**

Remove locale keys that are only used for diagnostics/explanations scheduled for deletion in later tasks:
- `settings.toolPage.runtimeTitle`
- `settings.toolPage.runtimeSource`
- `settings.toolPage.runtimeVersion`
- `settings.toolPage.runtimeInSync`
- `settings.toolPage.runtimeOutOfSync`
- `settings.toolPage.runtimeWarnings`
- `settings.toolPage.runtimeProcesses`

Do not delete Search / CLI / Channels keys yet in this task unless they are purely top-level descriptions being simplified here.

**Step 5: Run the audit test again**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/core/i18n/locales/settings-consumer-copy.test.ts
```

Expected: still FAIL until Tasks 2–4 delete the actual UI copy; this task only establishes the guardrail and the governing policy.

**Step 6: Commit**

```bash
git add frontend/AGENTS.md frontend/src/core/i18n/locales/settings-consumer-copy.test.ts frontend/src/core/i18n/locales/types.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts
git commit -F - <<'EOF'
Set the consumer-language rule for settings surfaces

Define the product rule that settings copy must stay non-technical and
add an audit test so future work deletes diagnostics copy instead of
rephrasing implementation details.

Constraint: The running product branch is codex/settings-openviking-rebuild, not main
Rejected: Keep the rule implicit | guarantees drift back into operator-console language
Confidence: high
Scope-risk: narrow
Directive: If a sentence explains storage, API routes, runtime sync, provider fallback, or process state, remove it from the UI
Tested: node --test frontend/src/core/i18n/locales/settings-consumer-copy.test.ts
Not-tested: Browser rendering
EOF
```

### Task 2: Remove Tool Runtime Diagnostics From The Settings UI

**Files:**
- Create: `frontend/src/components/workspace/settings/tool-settings-page.test.ts`
- Modify: `frontend/src/components/workspace/settings/tool-settings-page.tsx`
- Modify: `frontend/src/core/i18n/locales/settings-consumer-copy.test.ts`

**Step 1: Write the failing source-level regression test**

Create `frontend/src/components/workspace/settings/tool-settings-page.test.ts`.

```ts
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

void test("tool settings page no longer renders runtime diagnostics", async () => {
  const source = await readFile(new URL("./tool-settings-page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /runtimeStatus\\.loaded_source_path/);
  assert.doesNotMatch(source, /runtime_processes/);
  assert.doesNotMatch(source, /runtimeWarnings/);
  assert.doesNotMatch(source, /runtimeVersion/);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/components/workspace/settings/tool-settings-page.test.ts
```

Expected: FAIL because `tool-settings-page.tsx` still renders the runtime diagnostics card.

**Step 3: Delete the diagnostics-only card**

In `frontend/src/components/workspace/settings/tool-settings-page.tsx`:
- remove `runtimeStatus` from the `useConfigEditor()` destructure
- delete the entire runtime diagnostics card
- collapse the page down to the actual tools form (`ToolsSection`, validation, save bar)
- keep `loadConfigFailed` as the only remaining top-level fallback/localized error label for this page

Minimal shape after deletion:

```tsx
<SettingsSection title={t.settings.tools.title} description={t.settings.tools.description}>
  {isLoading ? ... : error ? ... : (
    <div className="space-y-4">
      <ToolsSection ... />
      <ConfigValidationErrors ... />
      <ConfigSaveBar ... />
    </div>
  )}
</SettingsSection>
```

**Step 4: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/components/workspace/settings/tool-settings-page.test.ts
pnpm typecheck --pretty false
```

Expected:
- test PASS
- typecheck PASS

**Step 5: Commit**

```bash
git add frontend/src/components/workspace/settings/tool-settings-page.tsx frontend/src/components/workspace/settings/tool-settings-page.test.ts frontend/src/core/i18n/locales/settings-consumer-copy.test.ts
git commit -F - <<'EOF'
Remove tool runtime diagnostics from the settings page

Delete the operator-style runtime diagnostics card so the tools settings
surface only shows choices a normal user can act on.

Constraint: Tool runtime diagnostics are implementation detail, not product value
Rejected: Reword the diagnostics card in softer language | still exposes internal mechanics
Confidence: high
Scope-risk: narrow
Directive: Do not reintroduce storage paths, process lists, or version-sync state into this page
Tested: node --test frontend/src/components/workspace/settings/tool-settings-page.test.ts; pnpm --dir frontend typecheck --pretty false
Not-tested: Browser rendering
EOF
```

### Task 3: Delete Technical Explanations From Search And CLI Settings

**Files:**
- Modify: `frontend/src/components/workspace/settings/search-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/search-settings-page.copy.ts`
- Modify: `frontend/src/components/workspace/settings/search-settings-page.copy.test.ts`
- Modify: `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- Modify: `frontend/src/core/cli/presentation.ts`
- Modify: `frontend/src/core/cli/presentation.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/settings-consumer-copy.test.ts`

**Step 1: Extend the failing helper tests**

Add these cases to the existing helper tests.

For Search:

```ts
void test("buildSearchSettingsCopy strips runtime-mechanics helper copy", () => {
  const en = buildSearchSettingsCopy(enUS.settings.search);

  assert.equal(en.page.capabilityHint, "");
  assert.equal(en.page.unsupportedProviderPrefix, "");
  assert.equal(en.page.unsupportedProviderHint, "");
  assert.equal(en.page.docsAction, "");
});
```

For CLI:

```ts
void test("buildCliToolsCopy no longer exposes runtime or coupling explanations", () => {
  const en = buildCliToolsCopy(enUS.settings.cliTools);

  assert.equal(en.runtimeHint, "");
  assert.equal(en.composerHint, "");
  assert.ok(!("pathLabel" in en));
  assert.ok(!("sourceLabel" in en));
});
```

**Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
node --test src/core/cli/presentation.test.ts
```

Expected: both FAIL because the current helper outputs still include technical explanation strings and CLI source/path labels.

**Step 3: Delete Search explanatory chrome**

In `search-settings-page.copy.ts`, `search-settings-page.tsx`, and the locale files:
- delete the capability hint banner
- delete the unsupported-provider explanation banner
- delete the provider docs button
- keep the actual provider picker and fields
- simplify page/section copy to outcome-oriented language

Target locale direction:
- `settings.search.description`
  - EN: `Choose how Nion looks up web and image results.`
  - ZH: `选择 Nion 查找网页和图片结果的方式。`
- `settings.search.capabilityHint`
- `settings.search.unsupportedProviderPrefix`
- `settings.search.unsupportedProviderHint`
- `settings.search.docsAction`
  - set to empty strings and stop rendering them

**Step 4: Delete CLI implementation explanations**

In `cli-tools-page.tsx`, `core/cli/presentation.ts`, and the locale files:
- remove the runtime hint card
- remove the amber composer-coupling hint card
- remove the source/path row entirely
- remove now-unused keys from the locale contract:
  - `settings.cliTools.runtime.hint`
  - `settings.cliTools.sources.hostDetected`
  - `settings.cliTools.labels.path`
  - `settings.cliTools.labels.source`
  - `settings.cliTools.hints.composer`
  - `settings.cliTools.states.configured` if it becomes unused after the row is removed

Keep only user-actionable states such as enabled / disabled / installed / missing.

**Step 5: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
node --test src/core/cli/presentation.test.ts
node --test src/core/i18n/locales/settings-consumer-copy.test.ts
pnpm typecheck --pretty false
```

Expected: all PASS

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/search-settings-page.tsx frontend/src/components/workspace/settings/search-settings-page.copy.ts frontend/src/components/workspace/settings/search-settings-page.copy.test.ts frontend/src/components/workspace/settings/cli-tools-page.tsx frontend/src/core/cli/presentation.ts frontend/src/core/cli/presentation.test.ts frontend/src/core/i18n/locales/types.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/settings-consumer-copy.test.ts
git commit -F - <<'EOF'
Remove technical explanations from Search and CLI settings

Delete runtime and implementation-coupling explanations from Search and
CLI settings so users only see choices and outcomes they can act on.

Constraint: The feature surfaces stay, but engineering-facing explanations must go
Rejected: Keep the same copy and just translate it better | still reads like an operator console
Confidence: high
Scope-risk: narrow
Directive: Prefer deleting explanatory hint cards over softening them if they describe internal implementation
Tested: node --test frontend/src/components/workspace/settings/search-settings-page.copy.test.ts; node --test frontend/src/core/cli/presentation.test.ts; node --test frontend/src/core/i18n/locales/settings-consumer-copy.test.ts; pnpm --dir frontend typecheck --pretty false
Not-tested: Browser rendering
EOF
```

### Task 4: Remove Technical Explanations From Channels And Rename Remaining User-Facing Terms

**Files:**
- Modify: `frontend/src/components/workspace/settings/channel-settings-page.tsx`
- Modify: `frontend/src/core/channels/presentation.ts`
- Modify: `frontend/src/core/channels/presentation.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/settings-consumer-copy.test.ts`

**Step 1: Extend the failing helper test**

Add these assertions to `frontend/src/core/channels/presentation.test.ts`.

```ts
void test("buildChannelCopy removes operator-facing explanatory copy", () => {
  const copy = buildChannelCopy(zhCN.settings.channels, zhCN.workspace);

  assert.equal(copy.workspaceDescription, "");
  assert.equal(copy.configurationDescription, "");
  assert.equal(copy.runtimeStatusDescription, "");
  assert.equal(copy.pairSectionDescription, "");
  assert.equal(copy.pairCodeDescription, "");
  assert.equal(copy.sessionDefaultsDescription, "");
  assert.equal(copy.sessionOverrideDialogDescription, "");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/core/channels/presentation.test.ts
```

Expected: FAIL because the helper still exposes those technical descriptions.

**Step 3: Simplify the remaining locale-driven labels**

Delete explanatory paragraphs and rename the most operator-facing headings in the locale files and helper outputs:

- `workspaceDescription` → empty
- `configurationDescription` → empty
- `runtimeStatusDescription` → empty
- `pairSectionDescription` → empty
- `pairCodeDescription` → empty
- `sessionDefaultsDescription` → empty
- `sessionOverrideDialogDescription` → empty

Rename remaining visible labels to consumer language:
- `pairing.code.title`
  - EN: `Connection code`
  - ZH: `连接码`
- `pairing.pending.title`
  - EN: `Connection requests`
  - ZH: `连接请求`
- `authorization.title`
  - EN: `Connected people`
  - ZH: `已连接的人`

Do not rename or translate:
- `runtimeStatus.last_error`
- `external_user_name`
- `external_user_id`
- `chat_id`
- backend detail appended by `localizeChannelApiError()`

**Step 4: Delete any now-empty explanatory blocks from the page**

Update `channel-settings-page.tsx` so it does not render empty description wrappers for:
- workspace intro
- configuration intro
- runtime status intro
- pairing intro
- pair code intro
- session defaults intro
- session override dialog intro

Minimal pattern:

```tsx
{copy.runtimeStatusDescription ? (
  <div className="text-muted-foreground text-xs">{copy.runtimeStatusDescription}</div>
) : null}
```

Then remove the wrapper entirely if the section no longer needs one.

**Step 5: Run verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/core/channels/presentation.test.ts
node --test src/core/i18n/locales/settings-consumer-copy.test.ts
pnpm typecheck --pretty false
```

Expected: all PASS

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/channel-settings-page.tsx frontend/src/core/channels/presentation.ts frontend/src/core/channels/presentation.test.ts frontend/src/core/i18n/locales/types.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/settings-consumer-copy.test.ts
git commit -F - <<'EOF'
Remove operator-style explanations from Channels settings

Strip implementation-heavy explanations from the Channels settings UI and
rename the remaining connection-facing labels so normal users see plain
language instead of operator terminology.

Constraint: Runtime diagnostics and external identity data must remain verbatim where they are actual data
Rejected: Keep operator labels and only shorten the descriptions | still signals an admin console
Confidence: high
Scope-risk: moderate
Directive: In this page, only real data may stay technical; explanatory copy must stay plain-language or be deleted
Tested: node --test frontend/src/core/channels/presentation.test.ts; node --test frontend/src/core/i18n/locales/settings-consumer-copy.test.ts; pnpm --dir frontend typecheck --pretty false
Not-tested: Live channel flows
EOF
```

### Task 5: Final Audit, Browser Smoke, And Documentation Sync

**Files:**
- Modify: `frontend/README.md`
- Modify: `frontend/CLAUDE.md`

**Step 1: Update maintainer docs**

Add a short note to both docs:

```md
- Settings copy is written for non-technical people.
- Delete implementation detail instead of explaining it.
- Keep `settings-consumer-copy.test.ts` in sync when Search / CLI / Tool / Channels copy changes.
```

**Step 2: Run the full verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion-settings-rebuild/frontend
node --test src/core/i18n/locales/settings-consumer-copy.test.ts
node --test src/core/i18n/locales/settings-modules.test.ts
node --test src/components/workspace/settings/tool-settings-page.test.ts
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
node --test src/core/cli/presentation.test.ts
node --test src/core/channels/presentation.test.ts
pnpm lint
pnpm typecheck --pretty false
```

Expected: all PASS

**Step 3: Run a browser smoke test**

Use `@browse` or a real local browser against the running `codex/settings-openviking-rebuild` app and verify:
- Tool Settings no longer shows storage source, version sync, process status, or runtime warnings
- CLI Tools no longer explains `/api/cli/catalog`, lane coupling, source, or filesystem paths
- Search no longer explains runtime/provider fallback mechanics
- Channels no longer shows operator-style explanatory paragraphs or `On` / `Off`
- Chinese and English locales both stay plain-language

**Step 4: Commit**

```bash
git add frontend/README.md frontend/CLAUDE.md
git commit -F - <<'EOF'
Document the consumer-language rule for settings surfaces

Write down the product rule that settings UI copy must stay plain-language
and verify the cleanup branch is fully green before landing.

Constraint: This cleanup is product-facing and must stay enforced after the current branch lands
Rejected: Treat the copy cleanup as one-off polish | it will regress without an explicit rule
Confidence: high
Scope-risk: narrow
Directive: When a settings sentence sounds like docs for engineers, delete it or move it out of the product UI
Tested: node --test frontend/src/core/i18n/locales/settings-consumer-copy.test.ts; node --test frontend/src/core/i18n/locales/settings-modules.test.ts; node --test frontend/src/components/workspace/settings/tool-settings-page.test.ts; node --test frontend/src/components/workspace/settings/search-settings-page.copy.test.ts; node --test frontend/src/core/cli/presentation.test.ts; node --test frontend/src/core/channels/presentation.test.ts; pnpm --dir frontend lint; pnpm --dir frontend typecheck --pretty false
Not-tested: Browser screenshots
EOF
```
