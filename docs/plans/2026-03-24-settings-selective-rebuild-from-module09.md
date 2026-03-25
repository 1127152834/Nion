# Settings Selective Rebuild From Module 09 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the settings integration from the clean `codex/settings-module-09` baseline, then selectively replay Modules 10, 11, and 12 without bringing in Hermes-lane functionality that later entered the broader mainline.

**Architecture:** Do not "roll back main" in place. Instead, create a fresh worktree from `codex/settings-module-09` (`dce8507`) and build a new integration branch there. Replay Module 10 (`f9d1dc7`), Module 11 (`5d5e22e`), and Module 12 (`90d1b76`) as isolated top-level commits using `git cherry-pick`, because those commits are module-scoped even though the `settings-module-11` and `settings-module-12` branches themselves were cut from a mainline that already contained Recall / Tool Policy / Pairing code.

**Tech Stack:** Git worktrees, git cherry-pick, FastAPI, Next.js, pnpm, uv, pytest

---

**Execution Notes**

- Use `@verification-before-completion`.
- Treat `codex/settings-module-09` as the last clean settings branch for this rebuild.
- Do **not** merge `codex/settings-module-10`, `codex/settings-module-11`, or `codex/settings-module-12` as branches.
- Do **not** rebase or reset the current `main` branch.
- The safe replay units are the individual module commits:
  - Module 10: `f9d1dc7`
  - Module 11: `5d5e22e`
  - Module 12: `90d1b76`
- Shared conflict hotspots across Modules 10 and 11:
  - `docker/nginx/nginx.local.conf`
  - `frontend/src/components/workspace/settings/settings-dialog.tsx`
  - `frontend/src/components/workspace/settings/settings-sections.ts`
  - `frontend/src/core/i18n/locales/en-US.ts`
  - `frontend/src/core/i18n/locales/types.ts`
  - `frontend/src/core/i18n/locales/zh-CN.ts`
- Hermes-adjacent functionality that must remain absent in the rebuilt branch:
  - `backend/app/gateway/routers/recall.py`
  - `backend/app/gateway/routers/tool_policy.py`
  - `backend/app/channels/pairing_repository.py`
  - `backend/app/channels/pairing_service.py`
  - `backend/packages/harness/nion/recall/*`
  - `backend/packages/harness/nion/config/surface_policy_config.py`
  - `frontend/src/core/recall/*`
- If a cherry-pick drags in changes outside the module file list below, stop and resolve manually instead of continuing blindly.

### Task 1: settings-rebuild-01-audit-and-worktree

**Files:**
- Verify: `.git`
- Verify: `refs/heads/codex/settings-module-09`
- Verify: `refs/heads/codex/settings-module-10`
- Verify: `refs/heads/codex/settings-module-11`
- Verify: `refs/heads/codex/settings-module-12`

**Step 1: Write the failing audit checks**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git merge-base --is-ancestor 557b9d1 codex/settings-module-09 && echo BAD || echo OK
git merge-base --is-ancestor 935a0a1 codex/settings-module-09 && echo BAD || echo OK
git merge-base --is-ancestor 557b9d1 codex/settings-module-10 && echo BAD || echo OK
git merge-base --is-ancestor 935a0a1 codex/settings-module-10 && echo BAD || echo OK
git merge-base --is-ancestor 557b9d1 codex/settings-module-11 && echo BAD || echo OK
git merge-base --is-ancestor 935a0a1 codex/settings-module-11 && echo BAD || echo OK
git merge-base --is-ancestor 557b9d1 codex/settings-module-12 && echo BAD || echo OK
git merge-base --is-ancestor 935a0a1 codex/settings-module-12 && echo BAD || echo OK
```

Expected:
- all lines print `OK`
- this confirms the branches do not literally contain `hermes/surface-tool-policy-3` or `usage-insights-2` commits

**Step 2: Run branch ancestry checks**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git rev-list --parents -n 1 dce8507
git rev-list --parents -n 1 f9d1dc7
git rev-list --parents -n 1 5d5e22e
git rev-list --parents -n 1 90d1b76
git merge-base dce8507 f9d1dc7
git merge-base dce8507 5d5e22e
git merge-base dce8507 90d1b76
```

Expected:
- Module 09 commit is `dce8507`
- the common ancestor of `09` with `10/11/12` is `58f46e2`
- this proves `11/12` were cut from later mainline state, not from `09`

**Step 3: Create the clean worktree**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
git worktree add ../nion-settings-rebuild dce8507
git -C ../nion-settings-rebuild switch -c codex/settings-openviking-rebuild
```

**Step 4: Verify the clean baseline**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
test ! -e backend/app/gateway/routers/recall.py
test ! -e backend/app/gateway/routers/tool_policy.py
test ! -e backend/app/channels/pairing_repository.py
test ! -e backend/app/channels/pairing_service.py
test ! -e backend/packages/harness/nion/recall/local_archive.py
```

Expected: success exit code and no output

**Step 5: Commit**

```bash
cat >/tmp/settings-rebuild-01.commit <<'EOF'
Start a clean settings rebuild from the module-09 baseline

Constraint: The rebuild must not rewrite or reset the current main branch
Rejected: Hard-reset main back to module-09 | destructive and erases unrelated later work
Confidence: high
Scope-risk: narrow
Directive: Perform all selective replay work in the dedicated worktree branch only
Tested: git ancestry audit; worktree baseline file absence checks
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git commit --allow-empty -F /tmp/settings-rebuild-01.commit
```

### Task 2: settings-rebuild-02-replay-module-10

**Files:**
- Modify: `backend/packages/harness/nion/config/app_config.py`
- Create: `backend/packages/harness/nion/config/tool_config.py`
- Test: `backend/tests/test_search_settings_config.py`
- Modify: `docker/nginx/nginx.local.conf`
- Create: `frontend/src/components/workspace/settings/search-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git restore --source f9d1dc7 -- backend/tests/test_search_settings_config.py
cd backend
uv run pytest tests/test_search_settings_config.py -q
```

Expected: `FAIL` because `tool_config.py` and the search-settings wiring are not present on the `settings-module-09` baseline

**Step 2: Apply the minimal implementation**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git cherry-pick -n f9d1dc7
```

If cherry-pick conflicts in any of these shared files, resolve only the Module-10 additions:

```text
docker/nginx/nginx.local.conf
frontend/src/components/workspace/settings/settings-dialog.tsx
frontend/src/components/workspace/settings/settings-sections.ts
frontend/src/core/i18n/locales/en-US.ts
frontend/src/core/i18n/locales/types.ts
frontend/src/core/i18n/locales/zh-CN.ts
```

**Step 3: Run tests to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/backend
uv run pytest tests/test_search_settings_config.py tests/test_tool_config_validation.py tests/test_channels_api.py tests/test_automation_config_loading.py tests/test_mcp_config_api.py tests/test_skills_api.py tests/test_sandbox_settings_validation.py -q
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/frontend
pnpm check
```

Expected: `PASS`

**Step 4: Verify no Hermes-adjacent files appeared**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git diff --name-only dce8507..HEAD | rg 'recall|tool_policy|pairing|surface_policy|core/recall' && exit 1 || exit 0
```

Expected: success exit code and no output

**Step 5: Commit**

```bash
cat >/tmp/settings-rebuild-02.commit <<'EOF'
Replay module-10 search settings onto the clean module-09 baseline

Constraint: Module-10 must come in without later Recall or Tool Policy additions from main
Rejected: Merge the settings-module-10 branch directly | branch ancestry is broader than the module replay need
Confidence: high
Scope-risk: moderate
Directive: Keep module replay commit-scoped; do not restore whole-file snapshots from later dirty branches
Tested: uv run pytest tests/test_search_settings_config.py tests/test_tool_config_validation.py tests/test_channels_api.py tests/test_automation_config_loading.py tests/test_mcp_config_api.py tests/test_skills_api.py tests/test_sandbox_settings_validation.py -q; cd frontend && pnpm check
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git commit -F /tmp/settings-rebuild-02.commit
```

### Task 3: settings-rebuild-03-replay-module-11

**Files:**
- Modify: `backend/app/gateway/routers/cli.py`
- Test: `backend/tests/test_cli_catalog_api.py`
- Modify: `docker/nginx/nginx.local.conf`
- Create: `frontend/src/components/workspace/settings/cli-tools-page.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-dialog.tsx`
- Modify: `frontend/src/components/workspace/settings/settings-sections.ts`
- Modify: `frontend/src/core/cli/api.ts`
- Modify: `frontend/src/core/cli/hooks.ts`
- Modify: `frontend/src/core/cli/types.ts`
- Modify: `frontend/src/core/i18n/locales/en-US.ts`
- Modify: `frontend/src/core/i18n/locales/types.ts`
- Modify: `frontend/src/core/i18n/locales/zh-CN.ts`

**Step 1: Write the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git restore --source 5d5e22e -- backend/tests/test_cli_catalog_api.py
cd backend
uv run pytest tests/test_cli_catalog_api.py -q
```

Expected: `FAIL` because the clean `09 + 10` branch still lacks Module-11 CLI settings wiring

**Step 2: Apply the minimal implementation**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git cherry-pick -n 5d5e22e
```

If cherry-pick conflicts, resolve only the CLI-lane additions in:

```text
docker/nginx/nginx.local.conf
frontend/src/components/workspace/settings/settings-dialog.tsx
frontend/src/components/workspace/settings/settings-sections.ts
frontend/src/core/i18n/locales/en-US.ts
frontend/src/core/i18n/locales/types.ts
frontend/src/core/i18n/locales/zh-CN.ts
```

**Step 3: Run tests to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/backend
uv run pytest tests/test_cli_catalog_api.py -q
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/frontend
pnpm check
```

Expected: `PASS`

**Step 4: Verify no Hermes-adjacent files appeared**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git diff --name-only dce8507..HEAD | rg 'recall|tool_policy|pairing|surface_policy|core/recall|memory-settings-page' && exit 1 || exit 0
```

Expected: success exit code and no output

**Step 5: Commit**

```bash
cat >/tmp/settings-rebuild-03.commit <<'EOF'
Replay module-11 CLI settings onto the clean rebuilt branch

Constraint: Module-11 must not reintroduce Recall, Pairing, or Tool Policy files through its later branch base
Rejected: Restore full file snapshots from settings-module-11 | shared files would import unrelated mainline state
Confidence: high
Scope-risk: moderate
Directive: When shared files conflict, keep only the CLI page wiring and shared catalog changes
Tested: uv run pytest tests/test_cli_catalog_api.py -q; cd frontend && pnpm check
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git commit -F /tmp/settings-rebuild-03.commit
```

### Task 4: settings-rebuild-04-replay-module-12

**Files:**
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/gateway/langgraph_client.py`
- Modify: `backend/app/gateway/routers/__init__.py`
- Create: `backend/app/gateway/routers/workbench/__init__.py`
- Create: `backend/app/gateway/routers/workbench/models.py`
- Create: `backend/app/gateway/routers/workbench/plugins.py`
- Test: `backend/tests/test_workbench_plugins_api.py`
- Modify: `frontend/src/app/workspace/layout.tsx`
- Create: `frontend/src/components/plugin-initializer.tsx`
- Create: `frontend/src/components/workspace/settings/workbench-plugins-page.tsx`
- Create: `frontend/src/components/workspace/settings/workbench-plugins-utils.ts`
- Create: `frontend/src/core/workbench/hooks.ts`
- Create: `frontend/src/core/workbench/index.ts`
- Create: `frontend/src/core/workbench/loader.ts`
- Create: `frontend/src/core/workbench/registry.ts`
- Create: `frontend/src/core/workbench/types.ts`
- Create: `frontend/src/core/workbench/versioning.ts`
- Create: `frontend/src/plugins/index.ts`

**Step 1: Write the failing test**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git restore --source 90d1b76 -- backend/tests/test_workbench_plugins_api.py
cd backend
uv run pytest tests/test_workbench_plugins_api.py -q
```

Expected: `FAIL` because the workbench plugin router and frontend plugin loader are absent

**Step 2: Apply the minimal implementation**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git cherry-pick -n 90d1b76
```

If cherry-pick conflicts in `backend/app/gateway/app.py` or `backend/app/gateway/routers/__init__.py`, keep only the workbench additions; do not import unrelated routers.

**Step 3: Run tests to verify it passes**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/backend
uv run pytest tests/test_workbench_plugins_api.py -q
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/frontend
pnpm check
```

Expected: `PASS`

**Step 4: Verify no Hermes-adjacent files appeared**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git diff --name-only dce8507..HEAD | rg 'recall|tool_policy|pairing|surface_policy|core/recall|memory-settings-page' && exit 1 || exit 0
```

Expected: success exit code and no output

**Step 5: Commit**

```bash
cat >/tmp/settings-rebuild-04.commit <<'EOF'
Replay module-12 workbench plugin support onto the clean rebuilt branch

Constraint: Module-12 must land without inheriting the dirty mainline branch base it was originally cut from
Rejected: Merge settings-module-12 directly | branch ancestry would drag unrelated state into the rebuild
Confidence: high
Scope-risk: moderate
Directive: Restrict any conflict resolution to workbench plugin surfaces only
Tested: uv run pytest tests/test_workbench_plugins_api.py -q; cd frontend && pnpm check
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git commit -F /tmp/settings-rebuild-04.commit
```

### Task 5: settings-rebuild-05-hermes-contamination-audit

**Files:**
- Verify: `backend/app/gateway/routers/recall.py`
- Verify: `backend/app/gateway/routers/tool_policy.py`
- Verify: `backend/app/channels/pairing_repository.py`
- Verify: `backend/app/channels/pairing_service.py`
- Verify: `backend/packages/harness/nion/recall/__init__.py`
- Verify: `backend/packages/harness/nion/recall/filtering.py`
- Verify: `backend/packages/harness/nion/recall/local_archive.py`
- Verify: `backend/packages/harness/nion/recall/models.py`
- Verify: `backend/packages/harness/nion/config/surface_policy_config.py`
- Verify: `frontend/src/core/recall/api.ts`
- Verify: `frontend/src/core/recall/hooks.ts`
- Verify: `frontend/src/core/recall/types.ts`

**Step 1: Write the failing audit command**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
for path in \
  backend/app/gateway/routers/recall.py \
  backend/app/gateway/routers/tool_policy.py \
  backend/app/channels/pairing_repository.py \
  backend/app/channels/pairing_service.py \
  backend/packages/harness/nion/recall/__init__.py \
  backend/packages/harness/nion/recall/filtering.py \
  backend/packages/harness/nion/recall/local_archive.py \
  backend/packages/harness/nion/recall/models.py \
  backend/packages/harness/nion/config/surface_policy_config.py \
  frontend/src/core/recall/api.ts \
  frontend/src/core/recall/hooks.ts \
  frontend/src/core/recall/types.ts; do
  test ! -e "$path" || { echo "unexpected:$path"; exit 1; }
done
```

Expected: success exit code and no output

**Step 2: Compare rebuilt branch against current main**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git diff --name-only HEAD..e879135 | rg 'recall|tool_policy|pairing|surface_policy|core/recall|memory-settings-page'
```

Expected: matches are shown
- this is good
- it proves the rebuilt branch is intentionally missing the Hermes-adjacent files still present on current `main`

**Step 3: Run smoke verification**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/backend
uv run pytest tests/test_channels_api.py tests/test_cli_catalog_api.py tests/test_search_settings_config.py tests/test_workbench_plugins_api.py -q
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild/frontend
pnpm check
```

Expected: `PASS`

**Step 4: Capture the resulting branch summary**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git log --oneline --decorate --max-count=6
git status --short
```

Expected:
- three new module replay commits exist on top of the empty setup commit
- worktree is clean

**Step 5: Commit**

```bash
cat >/tmp/settings-rebuild-05.commit <<'EOF'
Verify the rebuilt settings branch stays free of Hermes-lane contamination

Constraint: The rebuilt branch must remain a clean launch point for OpenViking memory integration
Rejected: Accept a partly contaminated branch and clean it up later | guarantees memory refactor scope creep
Confidence: high
Scope-risk: narrow
Directive: Use this rebuilt branch as the only base for the OpenViking lane
Tested: path absence audit; uv run pytest tests/test_channels_api.py tests/test_cli_catalog_api.py tests/test_search_settings_config.py tests/test_workbench_plugins_api.py -q; cd frontend && pnpm check
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git commit --allow-empty -F /tmp/settings-rebuild-05.commit
```

### Task 6: settings-rebuild-06-hand-off-to-openviking

**Files:**
- Create: `docs/plans/2026-03-24-openviking-first-memory-integration.md`

**Step 1: Write the hand-off note**

Create `docs/plans/2026-03-24-openviking-first-memory-integration.md` with:

```markdown
# OpenViking First Memory Integration Plan

Base branch: `codex/settings-openviking-rebuild`

This branch intentionally excludes:
- recall/session-search lane
- tool policy lane
- pairing/channel ops lane
- Hermes memory replacement lane

Next lane starts from this clean rebuilt branch and introduces OpenViking as the memory/context/document substrate.
```

**Step 2: Verify the hand-off file exists**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
test -f docs/plans/2026-03-24-openviking-first-memory-integration.md
```

Expected: success exit code

**Step 3: Commit**

```bash
cat >/tmp/settings-rebuild-06.commit <<'EOF'
Record the clean rebuilt branch as the OpenViking integration launch point

Constraint: The memory rewrite must start from the clean rebuilt settings branch rather than the contaminated mainline
Rejected: Begin OpenViking work directly on main | mixes branch surgery with memory integration
Confidence: high
Scope-risk: narrow
Directive: Do not start OpenViking implementation before the rebuilt branch is verified clean
Tested: hand-off plan file existence
EOF
cd /Users/zhangtiancheng/Documents/项目/nion-settings-rebuild
git add docs/plans/2026-03-24-openviking-first-memory-integration.md
git commit -F /tmp/settings-rebuild-06.commit
```

