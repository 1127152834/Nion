# Nion Brand Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebrand the current DeerFlow repo into Nion end-to-end, align the workspace shell/About page/README/logo/welcome copy with `Nion-Agent`, remove obsolete deer-flow artifacts, and prove the migration with automated audits plus frontend/backend verification.

**Architecture:** Treat this as a guardrail-first migration, not a blind search-and-replace. First create an automated brand audit that fails on forbidden legacy tokens (`DeerFlow`, `deerflow`, `deer-flow`, `DF`, `DEER`, `ByteDance`, `bytedance`) while allowlisting only required upstream API hostnames such as `openspeech.bytedance.com`. Then migrate in layers: backend namespace/package/data-path rename, frontend copy/assets/shell port, README/doc relink, and finally deer-only file deletion plus exhaustive grep/lint/typecheck/pytest/manual browser verification. For the workspace shell, port Nion-Agent's visual structure directly where the current repo already has compatible primitives (`Sidebar` floating variant, prompt input, artifacts panel), and keep the workspace switcher presentational unless missing workspace-domain APIs are intentionally added later.

**Tech Stack:** Python 3.12, FastAPI, LangGraph, Next.js 16, React 19, Tailwind CSS v4, pnpm, uv, shell/Python audit scripts.

---

## Execution Notes

- Run this plan in a dedicated worktree before editing:

```bash
git worktree add ../nion-brand-rebuild -b codex/nion-brand-rebuild
cd ../nion-brand-rebuild
```

- Source-of-truth reference files from the donor project:
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/README.md`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo-v2.png`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo.png`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo.svg`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/about/about-page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/about/page.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/welcome.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-header.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-sidebar.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-nav-menu.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-sidebar-primary-action.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/new-chat-stage.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
  - `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/chats/[thread_id]/page.tsx`

- Brand migration rules:
  - Replace product/runtime branding with `Nion`.
  - Replace human-readable `ByteDance` / `bytedance` ownership text and links with `Huanxi` / `huanxi`.
  - Do **not** rewrite required upstream API hosts such as `https://openspeech.bytedance.com/...`.
  - Treat `DF`, deer icons, `Deep Exploration and Efficient Research Flow`, and deer-only filenames as forbidden legacy brand markers.

- Commit every task with the repo's Lore protocol. Use this shape:

```text
<intent line>

<context body>

Constraint: ...
Rejected: ... | ...
Confidence: medium
Scope-risk: narrow
Directive: ...
Tested: ...
Not-tested: ...
```

---

### Task 1: Add A Failing Brand Audit Guardrail

**Files:**
- Create: `scripts/check_branding.py`
- Create: `docs/brand-audit-allowlist.md`
- Modify: `Makefile`
- Test: `scripts/check_branding.py`

**Step 1: Write the failing audit script**

Create `scripts/check_branding.py` with a minimal but complete repo scanner:

```python
from __future__ import annotations

import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SKIP_PARTS = {".git", "node_modules", ".next", ".venv", ".omx", ".worktrees"}
TEXT_EXTENSIONS = {
    ".md", ".txt", ".py", ".toml", ".yaml", ".yml", ".json", ".ts", ".tsx",
    ".js", ".jsx", ".css", ".sh", ".env", ".example", ".conf", ".html",
}
FORBIDDEN = [
    (re.compile(r"\bDeerFlow\b"), "DeerFlow"),
    (re.compile(r"\bdeer-flow\b"), "deer-flow"),
    (re.compile(r"\bdeerflow\b"), "deerflow"),
    (re.compile(r"\bByteDance\b"), "ByteDance"),
    (re.compile(r"\bbytedance\b"), "bytedance"),
    (re.compile(r"\bDF\b"), "DF"),
    (re.compile(r"\bDEER\b"), "DEER"),
]


def load_allowlist() -> list[tuple[str, str]]:
    allowlist = ROOT / "docs/brand-audit-allowlist.md"
    if not allowlist.exists():
        return []
    pairs: list[tuple[str, str]] = []
    for raw in allowlist.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        path_text, needle = line.split("|", 1)
        pairs.append((path_text.strip(), needle.strip()))
    return pairs


def is_text_file(path: pathlib.Path) -> bool:
    return path.suffix in TEXT_EXTENSIONS or path.name in {
        "Makefile",
        "Dockerfile",
        ".env.example",
        "deer-flow.code-workspace",
        "nion.code-workspace",
    }


def is_allowlisted(path: pathlib.Path, snippet: str, allowlist: list[tuple[str, str]]) -> bool:
    rel = path.relative_to(ROOT).as_posix()
    return any(rel == allowed_path and allowed_snippet in snippet for allowed_path, allowed_snippet in allowlist)


def main() -> int:
    allowlist = load_allowlist()
    failures: list[str] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if any(part in SKIP_PARTS for part in path.parts):
            continue
        if not is_text_file(path):
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern, label in FORBIDDEN:
            for match in pattern.finditer(text):
                snippet = text[max(0, match.start() - 30):match.end() + 30]
                if not is_allowlisted(path, snippet, allowlist):
                    failures.append(f"{path.relative_to(ROOT)} | {label} | {snippet!r}")
    if failures:
        print("\n".join(failures))
        return 1
    print("Brand audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

**Step 2: Seed the allowlist with the only approved API-host exceptions**

Create `docs/brand-audit-allowlist.md`:

```md
# path|allowed substring
skills/public/podcast-generation/scripts/generate.py|openspeech.bytedance.com
```

**Step 3: Run the audit to prove the repo currently fails**

Run:

```bash
python scripts/check_branding.py
```

Expected: `FAIL` with many hits in `backend/packages/harness/deerflow/`, `frontend/src/core/i18n/locales/*`, `README*.md`, `deer-flow.code-workspace`, `skills/public/claude-to-deerflow/`, and demo artifacts.

**Step 4: Wire the audit into the root make targets**

Add to `Makefile`:

```make
.PHONY: check-branding

check-branding:
	@$(PYTHON) ./scripts/check_branding.py
```

**Step 5: Re-run through Makefile**

Run:

```bash
make check-branding
```

Expected: still `FAIL`, now via the standard developer entry point.

**Step 6: Commit**

Run:

```bash
git add Makefile scripts/check_branding.py docs/brand-audit-allowlist.md
git commit
```

Commit intent: establish a failing brand guardrail before the migration.

---

### Task 2: Rename The Backend Namespace And Runtime Paths To `nion`

**Files:**
- Move: `backend/packages/harness/deerflow/` -> `backend/packages/harness/nion/`
- Modify: `backend/packages/harness/pyproject.toml`
- Modify: `backend/pyproject.toml`
- Modify: `backend/langgraph.json`
- Modify: `backend/app/**/*.py`
- Modify: `backend/tests/**/*.py`
- Modify: `backend/CLAUDE.md`
- Modify: `backend/README.md`
- Modify: `config.example.yaml`
- Modify: `scripts/docker.sh`
- Modify: `scripts/deploy.sh`
- Modify: `scripts/serve.sh`
- Modify: `docker/**/*.yaml`
- Test: `backend/tests/test_nion_namespace.py`
- Test: `backend/tests/test_harness_boundary.py`
- Test: `scripts/check_branding.py`

**Step 1: Write a failing backend namespace test**

Create `backend/tests/test_nion_namespace.py`:

```python
from importlib import import_module
from pathlib import Path
import json


def test_nion_client_is_importable():
    module = import_module("nion.client")
    assert hasattr(module, "NionClient")


def test_langgraph_config_points_to_nion_namespace():
    config = json.loads(Path("backend/langgraph.json").read_text(encoding="utf-8"))
    payload = json.dumps(config)
    assert "nion.agents" in payload
```

**Step 2: Run the focused test and confirm it fails first**

Run:

```bash
cd backend
PYTHONPATH=. uv run pytest tests/test_nion_namespace.py -v
```

Expected: `FAIL` with `ModuleNotFoundError: No module named 'nion'` and/or `AssertionError` because `langgraph.json` still points at `deerflow`.

**Step 3: Perform the namespace move and metadata update**

Execute the directory rename first:

```bash
git mv backend/packages/harness/deerflow backend/packages/harness/nion
```

Then update the package metadata to match the donor project:

```toml
# backend/packages/harness/pyproject.toml
[project]
name = "nion-harness"
version = "0.1.0"
description = "Nion agent harness framework"
requires-python = ">=3.12"
dependencies = []

[tool.hatch.build.targets.wheel]
packages = ["nion"]
```

```toml
# backend/pyproject.toml
[project]
name = "nion"
dependencies = [
    "nion-harness",
    ...
]

[tool.uv.sources]
nion-harness = { workspace = true }
```

Update import prefixes and symbols in code/tests/scripts:

- `deerflow.` -> `nion.`
- `DeerFlowClient` -> `NionClient`
- `DEER_FLOW_*` env vars / data paths -> `NION_*`
- `.deer-flow` filesystem paths -> `.nion`
- `deer-flow` process names / compose project names / workspace filenames -> `nion`

High-signal files that need manual review after the move:

- `backend/app/gateway/app.py`
- `backend/app/gateway/path_utils.py`
- `backend/app/gateway/routers/uploads.py`
- `backend/app/gateway/routers/mcp.py`
- `backend/app/gateway/routers/agents.py`
- `backend/app/channels/service.py`
- `backend/app/channels/manager.py`
- `backend/packages/harness/nion/client.py`
- `backend/packages/harness/nion/config/paths.py`
- `backend/packages/harness/nion/agents/lead_agent/agent.py`
- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/tests/conftest.py`
- `backend/tests/test_client.py`
- `backend/tests/test_sandbox_tools_security.py`

**Step 4: Re-run the backend tests that lock the rename**

Run:

```bash
cd backend
PYTHONPATH=. uv run pytest tests/test_nion_namespace.py -v
PYTHONPATH=. uv run pytest tests/test_harness_boundary.py -v
PYTHONPATH=. uv run pytest tests/test_client.py -v
```

Expected: all `PASS`.

**Step 5: Re-run the brand audit against backend-sensitive files**

Run:

```bash
cd ..
python scripts/check_branding.py
```

Expected: still `FAIL`, but the hits should move out of `backend/packages/harness/deerflow/` and backend import paths.

**Step 6: Commit**

Run:

```bash
git add backend config.example.yaml scripts docker
git commit
```

Commit intent: move the runtime/package namespace from DeerFlow to Nion without breaking import boundaries.

---

### Task 3: Rebrand Frontend Copy, Metadata, Local Storage, And Assets

**Files:**
- Create: `frontend/public/images/nion-logo-v2.png`
- Create: `frontend/public/images/nion-logo.png`
- Create: `frontend/public/images/nion-logo.svg`
- Delete: `frontend/public/images/deer.svg`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/settings/local.ts`
- Modify: `frontend/src/components/landing/header.tsx`
- Modify: `frontend/src/components/landing/footer.tsx`
- Modify: `frontend/src/components/landing/hero.tsx`
- Modify: `frontend/src/components/landing/sections/*.tsx`
- Modify: `frontend/package.json`
- Test: `scripts/check_branding.py`
- Test: `pnpm lint`
- Test: `pnpm typecheck`

**Step 1: Lock the exact welcome slogan and app metadata**

The Chinese slogan must become exactly:

```text
一念之间，万事即达。你的专属 AI 智能助手，懂你所想，为你而行。
耗费繁琐操作，只需一个念头，工作与生活，皆可轻松托付。
```

Update `frontend/src/app/layout.tsx` to Nion metadata:

```ts
export const metadata: Metadata = {
  title: "Nion",
  description: "一念之间，万事即达。你的专属 AI 智能助手，懂你所想，为你而行。",
};
```

**Step 2: Replace i18n strings and local storage keys**

Update:

- `frontend/src/core/i18n/locales/zh-CN.ts`
- `frontend/src/core/i18n/locales/en-US.ts`
- `frontend/src/core/i18n/locales/types.ts`
- `frontend/src/core/settings/local.ts`

Required changes:

- `DeerFlow` -> `Nion`
- `DeerFlow's official website` -> `Nion's official website`
- `关于 DeerFlow` -> `关于 Nion`
- `deerflow.local-settings` -> `nion.local-settings`
- Add the `settings.aboutPage` copy shape needed by the donor About page component
- Update welcome copy to the exact slogan above

Use the donor locale blocks as the source of truth for the About page structure:

- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/i18n/locales/types.ts`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/i18n/locales/zh-CN.ts`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/core/i18n/locales/en-US.ts`

**Step 3: Replace logo assets and wire them into the app**

Copy the donor assets:

```bash
cp /Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo-v2.png frontend/public/images/nion-logo-v2.png
cp /Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo.png frontend/public/images/nion-logo.png
cp /Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/public/images/nion-logo.svg frontend/public/images/nion-logo.svg
git rm frontend/public/images/deer.svg
```

Then update any frontend consumers of the deer logo / DeerFlow wordmark to the new `nion-logo*` assets or the `Nion` wordmark.

**Step 4: Rebrand landing-page surfaces**

Update the public-facing landing UI files:

- `frontend/src/components/landing/header.tsx`
- `frontend/src/components/landing/footer.tsx`
- `frontend/src/components/landing/hero.tsx`
- `frontend/src/components/landing/sections/community-section.tsx`
- `frontend/src/components/landing/sections/skills-section.tsx`
- `frontend/src/components/landing/sections/case-study-section.tsx`
- `frontend/src/components/landing/sections/sandbox-section.tsx`
- `frontend/src/components/landing/sections/whats-new-section.tsx`

Required changes:

- GitHub URLs: `github.com/bytedance/deer-flow` -> Huanxi/Nion destination
- visible text: `DeerFlow` -> `Nion`
- repo badges / titles / screenshots referencing DeerFlow must be removed or replaced

**Step 5: Run the frontend verification loop**

Run:

```bash
cd frontend
pnpm lint
pnpm typecheck
cd ..
python scripts/check_branding.py
```

Expected: lint/typecheck `PASS`; brand audit may still fail in workspace shell/docs/demo files.

**Step 6: Commit**

Run:

```bash
git add frontend
git commit
```

Commit intent: switch the frontend brand foundation from DeerFlow to Nion and install the donor logo assets.

---

### Task 4: Port The Nion Workspace Shell, Floating Cards, And About Route

**Files:**
- Create: `frontend/src/app/workspace/about/page.tsx`
- Create: `frontend/src/components/workspace/about/about-page.tsx`
- Create: `frontend/src/components/workspace/new-chat-stage.tsx`
- Create: `frontend/src/components/workspace/workspace-sidebar-primary-action.tsx`
- Create: `frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
- Create: `frontend/src/components/workspace/workspace-switcher.tsx`
- Modify: `frontend/src/components/workspace/artifacts/context.tsx`
- Modify: `frontend/src/components/workspace/artifacts/index.ts`
- Modify: `frontend/src/components/workspace/chats/chat-box.tsx`
- Modify: `frontend/src/components/workspace/welcome.tsx`
- Modify: `frontend/src/components/workspace/workspace-header.tsx`
- Modify: `frontend/src/components/workspace/workspace-sidebar.tsx`
- Modify: `frontend/src/components/workspace/workspace-nav-menu.tsx`
- Modify: `frontend/src/app/workspace/chats/[thread_id]/page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Test: manual browser QA on `/workspace/chats/new`
- Test: manual browser QA on `/workspace/about`
- Test: `pnpm lint`
- Test: `pnpm typecheck`

**Reference files:**

- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/about/about-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/about/page.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/welcome.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-header.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-sidebar.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-nav-menu.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/workspace-sidebar-primary-action.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/new-chat-stage.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/frontend/src/app/workspace/chats/[thread_id]/page.tsx`

**Step 1: Prove the current workspace shell is wrong before editing**

Start the app:

```bash
make dev
```

Then verify these preconditions manually:

- `/workspace/about` does not exist yet or does not match the donor page
- the left sidebar still shows `DeerFlow` / `DF`
- `设置和更多` contains more than `设置` and `关于`
- the new thread page does not match the floating-card layout in the donor project/screenshot

**Step 2: Port the About route and replace the Markdown implementation**

Create:

- `frontend/src/components/workspace/about/about-page.tsx`
- `frontend/src/app/workspace/about/page.tsx`

Use the donor component as the exact base. After this, remove the Markdown-only About rendering path from the active UI. `AboutSettingsPage` should no longer be a plain `Streamdown` wrapper over `about-content.ts`; it should either reuse the new `AboutPage` component or be removed from the dialog if About becomes route-only.

**Step 3: Trim `设置和更多` down to only `设置` and `关于`**

Update `frontend/src/components/workspace/workspace-nav-menu.tsx` so the menu becomes:

```tsx
<DropdownMenuGroup>
  <DropdownMenuItem
    onClick={() => {
      setSettingsDefaultSection("appearance");
      setSettingsOpen(true);
    }}
  >
    <Settings2Icon />
    {t.common.settings}
  </DropdownMenuItem>
</DropdownMenuGroup>
<DropdownMenuSeparator />
<DropdownMenuItem
  onClick={() => {
    setSettingsOpen(false);
    router.push("/workspace/about");
  }}
>
  <InfoIcon />
  {t.workspace.about}
</DropdownMenuItem>
```

Remove the old website/GitHub/issues/contact entries from the menu entirely.

**Step 4: Port the floating sidebar shell and new-chat stage**

Adopt the donor visual structure:

- `Sidebar variant="floating" collapsible="icon"`
- branded header with `Nion`
- primary action button separated from the nav list
- floating new-thread hero stage
- top-right `WorkingDirectoryTrigger`
- centered `RuntimeModeToggle`
- translucent floating composer card

Important scope guard:

- The donor `WorkspaceSwitcher` depends on `@/core/workspace`, which does not exist in the current repo.
- Implement `frontend/src/components/workspace/workspace-switcher.tsx` as a presentational component showing `当前工作区 / Default` only.
- Do **not** add full workspace-domain APIs in this migration unless the user later expands scope.

Minimal presentational shell example:

```tsx
export function WorkspaceSwitcher() {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-12 w-full justify-between rounded-[1.55rem] border-sidebar-border/70 bg-sidebar-accent/55 px-3.5 text-sidebar-foreground"
    >
      <span className="flex items-center gap-3">
        <span className="flex size-8 items-center justify-center rounded-xl border border-border/70 bg-muted/50">
          <BriefcaseBusinessIcon className="size-4 text-muted-foreground" />
        </span>
        <span className="text-left">
          <span className="text-muted-foreground block text-[11px] font-medium uppercase tracking-[0.16em]">
            当前工作区
          </span>
          <span className="block text-sm font-medium">Default</span>
        </span>
      </span>
      <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
    </Button>
  );
}
```

**Step 5: Move the new-thread page to the donor composition**

Update `frontend/src/app/workspace/chats/[thread_id]/page.tsx` to match the donor structure:

- header with `WorkingDirectoryTrigger`
- new-thread branch renders `NewChatStage`
- `Welcome` is injected as hero content
- composer uses a floating, blurred card
- runtime toggle sits above the composer

Use the donor classes directly where possible:

```tsx
<NewChatStage
  hero={<Welcome className="sm:pb-1" mode={settings.context.mode} />}
  controls={<div className="flex w-full flex-col items-center gap-5">{renderRuntimeModeToggle("mx-auto")}</div>}
  composer={(
    <InputBox
      className="w-full bg-background/72 shadow-[0_34px_80px_-52px_rgba(70,60,41,0.4)] ring-1 ring-black/6 backdrop-blur-xl"
      ...
    />
  )}
/>
```

**Step 6: Add the working-directory panel plumbing only as far as the current app can support**

Port:

- `frontend/src/components/workspace/artifacts/context.tsx`
- `frontend/src/components/workspace/artifacts/index.ts`
- `frontend/src/components/workspace/artifacts/working-directory-trigger.tsx`

Only add the `panelType` support required to open a distinct `working-directory` panel in the existing artifacts shell. Do not port the donor workbench/plugin surface unless required for compilation.

**Step 7: Run the frontend verification loop**

Run:

```bash
cd frontend
pnpm lint
pnpm typecheck
cd ..
```

Then manually verify in the browser:

- `/workspace/chats/new`
- `/workspace/about`
- settings menu footer in the left sidebar

Expected:

- left sidebar is floating-card style
- brand is `Nion`, never `DeerFlow` / `DF`
- menu only contains `设置` and `关于`
- About page is the donor rich card layout, not Markdown
- welcome page shows the exact Chinese slogan
- the top-right `工作目录` trigger is visible

**Step 8: Commit**

Run:

```bash
git add frontend/src/app/workspace frontend/src/components/workspace frontend/src/core/i18n
git commit
```

Commit intent: adopt the Nion workspace shell and replace the Markdown About experience with the donor route/page.

---

### Task 5: Replace README, Repoint Ownership Links To Huanxi, And Rename Legacy Top-Level Files

**Files:**
- Modify: `README.md`
- Delete: `README_zh.md`
- Delete: `README_ja.md`
- Rename: `deer-flow.code-workspace` -> `nion.code-workspace`
- Rename or Delete: `skills/public/claude-to-deerflow/`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `LICENSE`
- Modify: `frontend/README.md`
- Modify: `backend/README.md`
- Modify: `Makefile`
- Modify: `scripts/*.sh`
- Modify: `docker/**/*.yaml`
- Modify: `docker/provisioner/**/*`
- Modify: any docs flagged by `scripts/check_branding.py`
- Test: `scripts/check_branding.py`

**Step 1: Replace the root README with the donor README**

Copy the donor file as the starting point:

```bash
cp /Users/zhangtiancheng/Documents/项目/新项目/Nion-Agent/README.md README.md
```

Then adapt any current-repo-specific paths/commands only if the copied file points at non-existent local paths.

**Step 2: Remove or rename deer-branded top-level files**

Execute:

```bash
git mv deer-flow.code-workspace nion.code-workspace
git rm README_zh.md README_ja.md
```

For the skill directory:

- If the skill still matters, rename it to a Nion-branded path such as `skills/public/claude-to-nion/`.
- If it is not part of the desired product surface, delete it.

Do **not** keep a deer-named skill directory after this migration just because the donor repo still has one.

**Step 3: Sweep non-API ownership references from docs and scripts**

Replace human-facing ownership links/text:

- `github.com/bytedance/deer-flow` -> Huanxi/Nion destination
- `ByteDance` -> `Huanxi`
- `bytedance` -> `huanxi`
- `deer-flow` workspace/process names -> `nion`

But keep runtime API hosts intact:

- `https://openspeech.bytedance.com/...`

High-signal files to review manually:

- `CONTRIBUTING.md`
- `SECURITY.md`
- `frontend/README.md`
- `backend/README.md`
- `backend/CLAUDE.md`
- `frontend/CLAUDE.md`
- `frontend/AGENTS.md`
- `docs/CODE_CHANGE_SUMMARY_BY_FILE.md`
- `docs/SKILL_NAME_CONFLICT_FIX.md`
- `docker/provisioner/README.md`
- `scripts/export_claude_code_oauth.py`

**Step 4: Run the audit again**

Run:

```bash
python scripts/check_branding.py
```

Expected: only demo/sample artifact hits should remain.

**Step 5: Commit**

Run:

```bash
git add README.md nion.code-workspace CONTRIBUTING.md SECURITY.md LICENSE frontend/README.md backend/README.md scripts docker docs skills
git commit
```

Commit intent: align the repo's public docs and ownership surfaces with Nion/Huanxi and remove deer-branded top-level files.

---

### Task 6: Delete Residual Deer Artifacts And Finish With Exhaustive Verification

**Files:**
- Delete: `frontend/public/demo/threads/fe3f7974-1bcb-4a01-a950-79673baafefd/user-data/outputs/research_deerflow_20260201.md`
- Delete or Rewrite: any `frontend/public/demo/threads/**` file still flagged by `scripts/check_branding.py`
- Delete: any remaining path returned by `find . -iname '*deer*'`
- Modify: `docs/brand-audit-allowlist.md` only if a remaining hit is truly intentional and documented
- Test: `python scripts/check_branding.py`
- Test: `find . -iname '*deer*'`
- Test: `cd frontend && pnpm lint && pnpm typecheck`
- Test: `cd backend && PYTHONPATH=. uv run pytest tests/ -v`
- Test: `make check`
- Test: manual browser QA

**Step 1: Remove deer-only sample/demo payloads**

Start from the known path hits:

```bash
git rm frontend/public/demo/threads/fe3f7974-1bcb-4a01-a950-79673baafefd/user-data/outputs/research_deerflow_20260201.md
```

Then re-run the audit and either rewrite or delete every remaining demo JSON/HTML/Markdown asset that still exposes deer-flow branding.

**Step 2: Verify no deer-named paths remain**

Run:

```bash
find . -path './.git' -prune -o -iname '*deer*' -print
```

Expected: no output.

**Step 3: Run the full automated verification suite**

Run:

```bash
python scripts/check_branding.py
cd frontend && pnpm lint && pnpm typecheck && cd ..
cd backend && PYTHONPATH=. uv run pytest tests/ -v && cd ..
make check
```

Expected: every command `PASS`.

**Step 4: Run the final manual product verification**

Boot the app and check these routes and surfaces:

```bash
make dev
```

Manual checklist:

1. `/workspace/chats/new`
2. `/workspace/about`
3. left sidebar footer menu
4. favicon, sidebar logo, and header wordmark
5. README render on GitHub/local preview

Expected product outcomes:

1. No visible `DeerFlow`, `DF`, deer icon, `ByteDance`, or `bytedance` text remains anywhere user-facing.
2. The welcome slogan is exactly:

```text
一念之间，万事即达。你的专属 AI 智能助手，懂你所想，为你而行。
耗费繁琐操作，只需一个念头，工作与生活，皆可轻松托付。
```

3. `设置和更多` only offers `设置` and `关于`.
4. `/workspace/about` is the rich Nion page, not Markdown.
5. The layout matches the donor floating-card aesthetic closely enough that the old DeerFlow shell is no longer recognizable.

**Step 5: Commit**

Run:

```bash
git add -A
git commit
```

Commit intent: remove the last deer artifacts and close the rebrand with full verification evidence.

**Step 6: Final implementation report**

When execution is done, the closeout response must include:

- changed files
- simplifications made
- remaining risks
- exact verification commands run

---

## Final Acceptance Gate

Do not call this migration complete until all of the following are true:

- `python scripts/check_branding.py` returns `Brand audit passed.`
- `find . -iname '*deer*'` returns nothing
- backend imports, package metadata, data paths, and tests use `nion`, not `deerflow`
- root README matches the donor Nion README structure/content direction
- left sidebar, welcome stage, logo, and About page visually match Nion-Agent
- non-API `bytedance` references are gone or replaced with `huanxi`
- only explicit allowlisted upstream API hosts still mention `bytedance`

## Risks To Watch

- The donor `WorkspaceSwitcher` depends on workspace-domain APIs not present in this repo; keep it presentational in this migration.
- The donor repo still contains `skills/public/claude-to-deerflow`; do not copy that path forward unchanged, because this task explicitly requires removing extra deer/deer-flow directories.
- Demo thread payloads are easy to miss because they live under `frontend/public/demo/threads/**`; the audit script must scan them.
- Python import rewrites can silently leave stale docstrings/comments/tests; rely on the audit script plus targeted backend tests, not grep alone.
