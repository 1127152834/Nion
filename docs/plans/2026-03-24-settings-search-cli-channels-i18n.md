# Settings Search CLI Channels I18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fill the missing `en-US` / `zh-CN` localization coverage for the Search settings page, CLI tools page, and Channels settings page so all UI-owned copy in those modules follows the active locale.

**Architecture:** Keep localization frontend-owned. Expand the existing `Translations.settings` contract, then move module-scope static metadata behind locale-aware pure builders so we can test them with `node:test` without adding a React test framework. Treat runtime- or user-supplied text as passthrough; localize only UI-owned strings and known built-in defaults.

**Tech Stack:** Next.js 16, React 19, TypeScript 5.8, existing `useI18n` dictionaries, `node:test`, ESLint, `tsc --noEmit`

---

### Task 1: Expand the Settings Localization Contract

**Files:**
- Create: `frontend/src/core/i18n/locales/settings-modules.test.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

void test("search, cliTools, and channels expose the full settings i18n contract", () => {
  assert.ok(enUS.settings.search.capabilityHint);
  assert.ok(enUS.settings.search.capabilities.web_search.title);
  assert.ok(enUS.settings.search.providers.tavily.webSearchDescription);
  assert.ok(enUS.settings.cliTools.defaults.python3);
  assert.ok(enUS.settings.channels.platforms.lark);
  assert.ok(enUS.settings.channels.fields.appId);
  assert.ok(zhCN.settings.search.capabilityHint);
  assert.ok(zhCN.settings.cliTools.defaults.python3);
  assert.ok(zhCN.settings.channels.fields.appId);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/i18n/locales/settings-modules.test.ts
```

Expected: FAIL because `settings.search`, `settings.cliTools`, and `settings.channels` only expose `title` / `description` today.

**Step 3: Extend the translation types first**

Add the missing nested contract in `frontend/src/core/i18n/locales/types.ts` before editing locale data.

```ts
search: {
  title: string;
  description: string;
  loadConfigFailed: string;
  capabilityHint: string;
  unsupportedProviderPrefix: string;
  unsupportedProviderHint: string;
  selectProvider: string;
  providerTitle: string;
  providerPlaceholder: string;
  enableLabel: string;
  docsAction: string;
  supportedBadge: string;
  unsupportedBadge: string;
  noProviderFields: string;
  capabilities: {
    web_search: { title: string; description: string };
    web_fetch: { title: string; description: string };
    image_search: { title: string; description: string };
  };
  fields: {
    apiKey: string;
    maxResults: string;
    timeoutSeconds: string;
    apiKeyPlaceholder: string;
    maxResultsPlaceholder: string;
    timeoutPlaceholder: string;
  };
  providers: {
    tavily: { title: string; webSearchDescription: string; webFetchDescription: string };
    firecrawl: { title: string; webSearchDescription: string; webFetchDescription: string };
    jinaReader: { title: string; description: string };
    duckduckgoImages: { title: string; description: string };
  };
}
```

Mirror that level of detail for:
- `settings.cliTools`: empty states, status badges, hints, source labels, known built-in CLI descriptions, and an `errors` block for load/update failures.
- `settings.channels`: `platforms`, `fields`, `hints`, `actions`, `runtime`, `pairing`, `session`, and `errors` groupings so the page no longer needs a fallback object.

**Step 4: Populate both locale dictionaries**

Add matching concrete values in:
- `frontend/src/core/i18n/locales/en-US.ts`
- `frontend/src/core/i18n/locales/zh-CN.ts`

Keep key names identical across locales. Do not leave any Search / CLI / Channels string in module-local fallback objects after this task.

**Step 5: Run the test again**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/i18n/locales/settings-modules.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add frontend/src/core/i18n/locales/types.ts frontend/src/core/i18n/locales/en-US.ts frontend/src/core/i18n/locales/zh-CN.ts frontend/src/core/i18n/locales/settings-modules.test.ts
git commit -F - <<'EOF'
Define the settings i18n contract for Search, CLI, and Channels

Add the translation keys these modules need before rewiring the UI so
follow-up work stays type-safe and testable.

Constraint: No new frontend test framework may be added
Rejected: Keep large fallback-copy objects inline | leaves translation drift untested
Confidence: high
Scope-risk: narrow
Directive: Add future settings UI copy to locales/types.ts and both locale files together
Tested: node --test src/core/i18n/locales/settings-modules.test.ts
Not-tested: Browser rendering
EOF
```

### Task 2: Localize the Search Settings Page

**Files:**
- Create: `frontend/src/components/workspace/settings/search-settings-page.copy.ts`
- Create: `frontend/src/components/workspace/settings/search-settings-page.copy.test.ts`
- Modify: `frontend/src/components/workspace/settings/search-settings-page.tsx`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "../../../core/i18n/locales/en-US";
import { zhCN } from "../../../core/i18n/locales/zh-CN";

const { buildSearchSettingsCopy } = await import(
  new URL("./search-settings-page.copy.ts", import.meta.url).href
);

void test("buildSearchSettingsCopy localizes capability and provider metadata", () => {
  const en = buildSearchSettingsCopy(enUS.settings.search);
  const zh = buildSearchSettingsCopy(zhCN.settings.search);

  assert.equal(en.capabilityMeta.web_search.title, "Web Search");
  assert.equal(zh.capabilityMeta.web_search.title, "网页搜索");
  assert.equal(zh.providerCatalog.web_search[0]?.description, "面向 Agent 的网页搜索，可配置结果数量。");
  assert.equal(zh.fieldLabels.max_results, "最大结果数");
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
```

Expected: FAIL because `buildSearchSettingsCopy()` does not exist yet.

**Step 3: Create the copy builder**

In `frontend/src/components/workspace/settings/search-settings-page.copy.ts`, export a pure builder that accepts `t.settings.search` and returns all page-owned copy plus localized provider / capability metadata.

```ts
export function buildSearchSettingsCopy(copy: Translations["settings"]["search"]) {
  return {
    page: copy,
    fieldLabels: {
      api_key: copy.fields.apiKey,
      max_results: copy.fields.maxResults,
      timeout: copy.fields.timeoutSeconds,
    },
    capabilityMeta: {
      web_search: copy.capabilities.web_search,
      web_fetch: copy.capabilities.web_fetch,
      image_search: copy.capabilities.image_search,
    },
    providerCatalog: {
      web_search: [
        { id: "tavily", title: copy.providers.tavily.title, description: copy.providers.tavily.webSearchDescription },
        { id: "firecrawl", title: copy.providers.firecrawl.title, description: copy.providers.firecrawl.webSearchDescription },
      ],
      web_fetch: [
        { id: "jina_ai", title: copy.providers.jinaReader.title, description: copy.providers.jinaReader.description },
        { id: "tavily", title: copy.providers.tavily.title, description: copy.providers.tavily.webFetchDescription },
      ],
      image_search: [
        { id: "duckduckgo", title: copy.providers.duckduckgoImages.title, description: copy.providers.duckduckgoImages.description },
      ],
    },
  };
}
```

Use relative imports in the test file, not `@/` aliases.

**Step 4: Rewire the page component**

Update `frontend/src/components/workspace/settings/search-settings-page.tsx` to:
- remove the large `FALLBACK_COPY` object,
- replace module-scope `SEARCH_PROVIDER_CATALOG` with locale-aware data from `buildSearchSettingsCopy()`,
- replace `CAPABILITY_META` with a non-localized icon map plus localized titles/descriptions from `buildSearchSettingsCopy()`,
- call `buildSearchSettingsCopy(t.settings.search)` inside the component,
- keep using `ConfigSaveBar` / `ConfigValidationErrors`,
- show `searchCopy.page.loadConfigFailed` instead of English inline fallback text when config loading fails.

Minimal shape:

```ts
const searchCopy = useMemo(
  () => buildSearchSettingsCopy(t.settings.search),
  [t.settings.search],
);

const CAPABILITY_ICONS = {
  web_search: SearchIcon,
  web_fetch: GlobeIcon,
  image_search: ImageIcon,
} as const;
```

**Step 5: Run targeted verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
pnpm typecheck
```

Expected: both commands PASS

**Step 6: Commit**

```bash
git add frontend/src/components/workspace/settings/search-settings-page.copy.ts frontend/src/components/workspace/settings/search-settings-page.copy.test.ts frontend/src/components/workspace/settings/search-settings-page.tsx
git commit -F - <<'EOF'
Make Search settings copy locale-driven

Move Search page metadata behind a pure locale-aware builder so the
page no longer owns English-only fallback strings.

Constraint: Search provider metadata is frontend-owned, not backend-configured
Rejected: Inline translated strings directly in JSX | hard to test and easy to regress
Confidence: high
Scope-risk: narrow
Directive: Keep provider catalogs locale-driven; do not add new hardcoded English strings to this page
Tested: node --test src/components/workspace/settings/search-settings-page.copy.test.ts; pnpm typecheck
Not-tested: Manual browser locale switch
EOF
```

### Task 3: Localize the CLI Tools Page

**Files:**
- Create: `frontend/src/core/cli/presentation.ts`
- Create: `frontend/src/core/cli/presentation.test.ts`
- Modify: `frontend/src/core/cli/api.ts`
- Modify: `frontend/src/components/workspace/settings/cli-tools-page.tsx`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { enUS } from "../i18n/locales/en-US";
import { zhCN } from "../i18n/locales/zh-CN";

const { resolveCliDescription } = await import(
  new URL("./presentation.ts", import.meta.url).href
);

void test("resolveCliDescription localizes known built-in CLIs but preserves configured text", () => {
  assert.equal(
    resolveCliDescription(
      { id: "python3", configured: false, description: "Python runtime" },
      zhCN.settings.cliTools,
    ),
    "Python 运行时",
  );

  assert.equal(
    resolveCliDescription(
      { id: "ruff", configured: true, description: "Ruff formatter" },
      zhCN.settings.cliTools,
    ),
    "Ruff formatter",
  );

  assert.equal(
    resolveCliDescription(
      { id: "git", configured: false, description: "Git version control" },
      enUS.settings.cliTools,
    ),
    "Git version control",
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/cli/presentation.test.ts
```

Expected: FAIL because `presentation.ts` does not exist yet.

**Step 3: Build a small CLI presentation layer**

Create `frontend/src/core/cli/presentation.ts` with pure helpers:
- `resolveCliDescription(item, copy)` for known built-in default descriptions,
- `buildCliToolsCopy(copy)` for page-owned labels,
- `localizeCliApiError(error, copy)` so UI stops showing raw English fallback strings from `core/cli/api.ts`.

```ts
const DEFAULT_DESCRIPTION_KEYS = {
  python3: "python3",
  node: "node",
  git: "git",
  pnpm: "pnpm",
  uv: "uv",
} as const;

export function resolveCliDescription(
  item: Pick<CLIStateConfig, "id" | "configured" | "description">,
  copy: Translations["settings"]["cliTools"],
) {
  if (item.configured) return item.description;
  const key = DEFAULT_DESCRIPTION_KEYS[item.id as keyof typeof DEFAULT_DESCRIPTION_KEYS];
  return key ? copy.defaults[key] : item.description;
}
```

**Step 4: Stabilize module-owned error keys**

Update `frontend/src/core/cli/api.ts` so it throws stable module keys as error prefixes instead of raw English strings, while still preserving HTTP status/detail for debugging:

```ts
throw new Error(`settings.cliTools.errors.loadFailed::${response.status}`);
throw new Error(`settings.cliTools.errors.updateFailed::${response.status}`);
```

Have `localizeCliApiError()` translate the key prefix and append the raw suffix when present.

Then update `frontend/src/components/workspace/settings/cli-tools-page.tsx` to:
- use `buildCliToolsCopy(t.settings.cliTools)`,
- render `resolveCliDescription(item, t.settings.cliTools)`,
- use `localizeCliApiError(err, t.settings.cliTools)` in top-level error UI and toasts.

**Step 5: Run targeted verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/cli/presentation.test.ts
pnpm typecheck
```

Expected: both commands PASS

**Step 6: Commit**

```bash
git add frontend/src/core/cli/presentation.ts frontend/src/core/cli/presentation.test.ts frontend/src/core/cli/api.ts frontend/src/components/workspace/settings/cli-tools-page.tsx
git commit -F - <<'EOF'
Localize the CLI tools settings surface

Translate the CLI page chrome and known built-in CLI descriptions without
touching runtime- or user-supplied descriptions.

Constraint: CLI catalog descriptions may come from runtime config and must remain passthrough when user-defined
Rejected: Translate every description blindly | would corrupt configured custom text
Confidence: high
Scope-risk: narrow
Directive: Keep built-in default description mapping centralized in core/cli/presentation.ts
Tested: node --test src/core/cli/presentation.test.ts; pnpm typecheck
Not-tested: Browser rendering of every CLI combination
EOF
```

### Task 4: Localize the Channels Settings Page

**Files:**
- Create: `frontend/src/core/channels/presentation.ts`
- Create: `frontend/src/core/channels/presentation.test.ts`
- Modify: `frontend/src/core/channels/api.ts`
- Modify: `frontend/src/components/workspace/settings/channel-settings-page.tsx`

**Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { zhCN } from "../i18n/locales/zh-CN";

const { buildPlatformFields, summarizeSessionOverride } = await import(
  new URL("./presentation.ts", import.meta.url).href
);

void test("channel presentation helpers localize field specs and session summaries", () => {
  const copy = zhCN.settings.channels;
  const fields = buildPlatformFields(copy);
  const proxyModeField = fields.dingtalk.find((field) => field.key === "proxy_mode");

  assert.equal(fields.lark[0]?.label, "App ID");
  assert.equal(proxyModeField?.label, "代理模式");
  assert.match(proxyModeField?.hint ?? "", /出站网络/);

  const summary = summarizeSessionOverride(
    { context: { thinking_enabled: true, is_plan_mode: false } },
    copy,
  );

  assert.deepEqual(summary, ["思考: 开启", "计划模式: 关闭"]);
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/channels/presentation.test.ts
```

Expected: FAIL because the presentation helper does not exist yet.

**Step 3: Extract localized channel presentation helpers**

Create `frontend/src/core/channels/presentation.ts` and move page-owned static metadata there:
- `buildChannelCopy(copy, workspace)` for page labels and action text,
- `buildPlatformFields(copy)` for credential field specs and hints,
- `summarizeSessionOverride(session, copy)` for localized session summary lines,
- `localizeChannelApiError(error, copy)` for stable frontend error keys from `core/channels/api.ts`.

```ts
export function buildPlatformFields(copy: Translations["settings"]["channels"]) {
  return {
    lark: [
      { key: "app_id", label: copy.fields.appId, requiredModes: ["webhook", "stream"] },
      { key: "app_secret", label: copy.fields.appSecret, sensitive: true, requiredModes: ["webhook", "stream"] },
    ],
    dingtalk: [
      { key: "proxy_mode", label: copy.fields.proxyMode, hint: copy.hints.dingtalkProxyMode },
    ],
    telegram: [
      { key: "bot_token", label: copy.fields.botToken, sensitive: true, requiredModes: ["webhook", "stream"] },
    ],
  };
}
```

**Step 4: Stabilize channel API error keys**

Update `frontend/src/core/channels/api.ts` so `requestJSON()` receives stable keys instead of English fallback strings:

```ts
getChannelConfig(platform, "settings.channels.errors.loadConfigFailed");
upsertChannelConfig(platform, payload, "settings.channels.errors.saveConfigFailed");
```

Then update `frontend/src/components/workspace/settings/channel-settings-page.tsx` to:
- delete the giant `FALLBACK_COPY` object,
- delete inline `PLATFORM_FIELDS`,
- use the new presentation helpers,
- replace hardcoded `"On"` / `"Off"` session summary text with localized strings,
- use `localizeChannelApiError()` for query errors and toast fallbacks.

Do not translate:
- external user names,
- chat IDs,
- runtime `last_error` / backend diagnostics,
- other server-supplied operator data.

**Step 5: Run targeted verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/channels/presentation.test.ts
pnpm typecheck
```

Expected: both commands PASS

**Step 6: Commit**

```bash
git add frontend/src/core/channels/presentation.ts frontend/src/core/channels/presentation.test.ts frontend/src/core/channels/api.ts frontend/src/components/workspace/settings/channel-settings-page.tsx
git commit -F - <<'EOF'
Make the Channels settings surface locale-aware

Extract channel field specs and session-summary formatting into pure
locale-aware helpers so the page stops carrying English-only fallback copy.

Constraint: Runtime diagnostics and external identities must stay verbatim
Rejected: Translate backend diagnostics in the UI | risks hiding real operator signals
Confidence: high
Scope-risk: moderate
Directive: Keep credential field labels and action copy in the locale dictionaries, not inline in the page
Tested: node --test src/core/channels/presentation.test.ts; pnpm typecheck
Not-tested: End-to-end channel operations against live connectors
EOF
```

### Task 5: Final Verification and Documentation

**Files:**
- Modify: `frontend/README.md`
- Modify: `frontend/CLAUDE.md`

**Step 1: Update the frontend README**

Add a short note in `frontend/README.md` that Search / CLI / Channels settings are locale-driven through `frontend/src/core/i18n/locales/*` and must not introduce UI-owned hardcoded strings.

Suggested snippet:

```md
### Settings Localization

Search, CLI Tools, and Channels settings use the shared `en-US` / `zh-CN`
locale dictionaries. When adding UI-owned text to those pages, update
`src/core/i18n/locales/types.ts`, `en-US.ts`, and `zh-CN.ts` together.
```

**Step 2: Update the frontend CLAUDE guide**

Add a maintainer note to `frontend/CLAUDE.md`:

```md
- Search / CLI Tools / Channels settings copy is locale-driven.
- Add new strings to `src/core/i18n/locales/types.ts`, `en-US.ts`, `zh-CN.ts`.
- Keep pure copy/presentation helpers covered by `node:test`.
```

**Step 3: Run the full verification suite**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
node --test src/core/i18n/locales/settings-modules.test.ts
node --test src/components/workspace/settings/search-settings-page.copy.test.ts
node --test src/core/cli/presentation.test.ts
node --test src/core/channels/presentation.test.ts
pnpm lint
pnpm typecheck
```

Expected:
- All `node --test` commands PASS
- `pnpm lint` PASS
- `pnpm typecheck` PASS

**Step 4: Manual bilingual smoke test**

Use `@browse` or a local browser session and verify:
- Switch locale from English to Chinese and back.
- `Search` page capability cards, provider selectors, field labels, and hints all change language.
- `CLI Tools` page badges, hints, empty states, and built-in default descriptions change language.
- `Channels` page tab labels, credential field labels, pairing section, runtime labels, dialog copy, and toasts change language.
- Runtime/user data stays verbatim and is not machine-translated.

**Step 5: Commit**

```bash
git add frontend/README.md frontend/CLAUDE.md
git commit -F - <<'EOF'
Document the settings i18n maintenance rules

Record where Search, CLI Tools, and Channels localization now lives so
future edits update the locale contract and tests together.

Constraint: Repo policy requires docs to stay in sync with code changes
Rejected: Leave the behavior undocumented | future contributors will reintroduce hardcoded copy
Confidence: high
Scope-risk: narrow
Directive: Treat locale files and copy-helper tests as part of the feature, not optional cleanup
Tested: node --test src/core/i18n/locales/settings-modules.test.ts; node --test src/components/workspace/settings/search-settings-page.copy.test.ts; node --test src/core/cli/presentation.test.ts; node --test src/core/channels/presentation.test.ts; pnpm lint; pnpm typecheck
Not-tested: Visual QA screenshots
EOF
```
