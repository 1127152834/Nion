# NION Upstream Sync Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 产出一份 `electron` 对 `upstream/main` 的源码级上游同步审计报告，明确哪些上游改动应直接同步、部分同步、重写后同步、已等价吸收或明确不同步。

**Architecture:** 本计划只做审计和报告，不执行 merge、cherry-pick 或产品代码同步。流程先固定 git 基线和原始证据，再按 NION 主链风险主题聚类，上层给产品/架构同步决策，下层保留 commit 与文件级证据。

**Tech Stack:** Git CLI、Markdown、现有 `docs/superpowers/specs/2026-04-14-upstream-sync-audit-design.md`、现有 NION docs/specs/plans/reports；不引入新依赖。

---

## File Structure

**Create:**

- `artifacts/upstream-sync-audit-2026-04-14/README.md`
  - 记录本次审计快照、命令、生成文件说明。
- `artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv`
  - 上游未进入 `electron` 的非 merge commit 清单。
- `artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt`
  - `electron..upstream/main` endpoint diff 中被上游改动影响的文件清单。
- `artifacts/upstream-sync-audit-2026-04-14/upstream-name-status.txt`
  - 上游 endpoint diff 的 name-status 证据。
- `artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt`
  - NION 相对上游的 endpoint divergence 文件清单。
- `artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt`
  - 上游 endpoint diff 文件与 NION 本地 divergence 文件的交集。
- `artifacts/upstream-sync-audit-2026-04-14/topic-classification.md`
  - 9 个主题桶的 commit 归类草案与证据索引。
- `artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv`
  - P0 候选主题 commit 列表。
- `artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md`
  - P0 候选主题的上游源码证据摘录。
- `artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md`
  - P0 候选主题对 NION 当前实现的对照摘录。
- `artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv`
  - 架构敏感主题 commit 列表。
- `artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md`
  - 架构敏感主题的上游源码证据摘录。
- `artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md`
  - 架构敏感主题对 NION 当前实现的对照摘录。
- `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`
  - 最终交付报告，包含执行摘要、主题总表、commit 明细附表、冲突热点、推荐批次、明确不同步清单。

**Read / Reference:**

- `docs/superpowers/specs/2026-04-14-upstream-sync-audit-design.md`
  - 审计方法的唯一设计来源。
- `AGENTS.md`
  - NION 项目级硬规则，尤其禁止 `proposal` 语义、禁止补丁叠补丁、禁止 `config.yaml` 回流。
- `backend/AGENTS.md`
  - 后端目录约束，研究 backend 改动时必须遵守。
- `frontend/AGENTS.md`
  - 前端目录约束，研究 frontend 改动时必须遵守。
- `docs/superpowers/specs/2026-04-09-memory-soul-boundary-contracts-design.md`
  - Memory / Soul 边界合同。
- `docs/superpowers/plans/2026-04-09-memory-soul-boundary-contracts-implementation-plan.md`
  - Memory / Soul 当前改造执行约束。

**Do Not Modify:**

- 不修改产品代码。
- 不修改 `config.yaml`、`config.example.yaml` 或任何会恢复 file-mode 配置真源的文件。
- 不执行 `git merge upstream/main`。
- 不执行 `git cherry-pick`。
- 不执行破坏性 git 命令。

---

## Task 1: Freeze The Audit Baseline

**Files:**

- Create: `artifacts/upstream-sync-audit-2026-04-14/README.md`
- Create: `artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv`
- Create: `artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt`
- Create: `artifacts/upstream-sync-audit-2026-04-14/upstream-name-status.txt`

- [ ] **Step 1: Verify the worktree is `electron` and clean enough for report work**

Run:

```bash
git branch --show-current
git status --short --branch
```

Expected:

```text
electron
## electron...origin/electron
```

If unrelated untracked files appear outside `artifacts/upstream-sync-audit-2026-04-14/` or the planned docs report path, do not delete them. Record them in the final handoff as pre-existing workspace state and continue only if they do not overlap the audit files.

- [ ] **Step 2: Fetch latest upstream without merging**

Run:

```bash
git fetch upstream --prune
```

Expected: command exits `0`. There must be no merge, rebase, cherry-pick, or working tree code change.

- [ ] **Step 3: Create the artifact directory**

Run:

```bash
mkdir -p artifacts/upstream-sync-audit-2026-04-14
```

Expected: directory exists.

- [ ] **Step 4: Record immutable baseline SHAs**

Run:

```bash
{
  echo "# NION upstream sync audit evidence"
  echo
  echo "Date: 2026-04-14"
  echo "Local branch: electron"
  echo "Local SHA: $(git rev-parse electron)"
  echo "Origin electron SHA: $(git rev-parse origin/electron)"
  echo "Upstream main SHA: $(git rev-parse upstream/main)"
  echo "Merge base: $(git merge-base electron upstream/main)"
  echo
  echo "No merge, cherry-pick, or product-code sync has been performed in this audit step."
} > artifacts/upstream-sync-audit-2026-04-14/README.md
```

Expected: `README.md` contains the exact SHAs used by the report.

- [ ] **Step 5: Record ahead/behind and non-merge commit counts**

Run:

```bash
{
  echo
  echo "## Git delta"
  echo
  echo "electron...upstream/main left/right count: $(git rev-list --left-right --count electron...upstream/main)"
  echo "Upstream non-merge commits not in electron: $(git rev-list --no-merges --count electron..upstream/main)"
  echo "NION non-merge commits not in upstream: $(git rev-list --no-merges --count upstream/main..electron)"
} >> artifacts/upstream-sync-audit-2026-04-14/README.md
```

Expected: counts are appended to `README.md`.

- [ ] **Step 6: Generate upstream commit list**

Run:

```bash
git log --no-merges --reverse --date=short \
  --pretty=format:'%h%x09%H%x09%ad%x09%s' \
  electron..upstream/main \
  > artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv
```

Expected:

```bash
wc -l artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv
```

prints the same count as `git rev-list --no-merges --count electron..upstream/main`.

- [ ] **Step 7: Generate upstream endpoint file evidence**

Run:

```bash
git diff --name-only electron..upstream/main \
  > artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt

git diff --name-status electron..upstream/main \
  > artifacts/upstream-sync-audit-2026-04-14/upstream-name-status.txt
```

Expected: both files exist and are non-empty.

- [ ] **Step 8: Commit the baseline evidence**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/README.md \
  artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv \
  artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt \
  artifacts/upstream-sync-audit-2026-04-14/upstream-name-status.txt

git commit -m "Record the upstream audit baseline before classification

The upstream sync audit needs immutable evidence before any topic-level
judgment. This captures the electron/upstream SHAs, commit counts, and
endpoint file deltas without performing any merge or product-code sync.

Constraint: Audit must not change runtime behavior or pull upstream code
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Treat these artifacts as the baseline for the 2026-04-14 upstream audit report
Tested: git rev-list and git diff evidence generated successfully
Not-tested: No runtime tests; evidence-only commit"
```

Expected: one commit containing only the four baseline artifact files.

---

## Task 2: Map NION Divergence And Conflict Boundaries

**Files:**

- Create: `artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt`
- Modify: `artifacts/upstream-sync-audit-2026-04-14/README.md`

- [ ] **Step 1: Generate local divergence file list**

Run:

```bash
git diff --name-only upstream/main..electron \
  > artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt
```

Expected: file exists and is non-empty.

- [ ] **Step 2: Generate overlap list**

Run:

```bash
comm -12 \
  <(sort artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt) \
  <(sort artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt) \
  > artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt
```

Expected: `overlap-files.txt` exists. Empty is allowed, but must be recorded in `README.md`.

- [ ] **Step 3: Append conflict boundary summary**

Run:

```bash
{
  echo
  echo "## NION conflict boundaries"
  echo
  echo "Upstream endpoint files: $(wc -l < artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt)"
  echo "NION divergent endpoint files: $(wc -l < artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt)"
  echo "Overlapping files: $(wc -l < artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt)"
  echo
  echo "Hard conflict tags:"
  echo "- CFG: config.yaml or file-mode config truth source"
  echo "- DESKTOP: Electron or local daemon runtime chain"
  echo "- MEMORY: Memory / Soul approved boundary"
  echo "- BRIDGE: bridge / channel / runtime semantics"
  echo "- BRAND: DeerFlow brand or old product terminology"
} >> artifacts/upstream-sync-audit-2026-04-14/README.md
```

Expected: conflict boundary summary appears in `README.md`.

- [ ] **Step 4: Identify obvious protected-path overlaps**

Run:

```bash
{
  echo
  echo "## Protected path overlaps"
  echo
  echo "### Config / settings"
  rg -n '(^|/)(config\\.yaml|config\\.example\\.yaml|settings|config-center|model)' artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt || true
  echo
  echo "### Desktop / daemon"
  rg -n '(^|/)(desktop|electron|daemon|local-runtime)' artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt || true
  echo
  echo "### Memory / Soul"
  rg -n '(^|/)(memory|soul|identity)' artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt || true
  echo
  echo "### Bridge / Channel"
  rg -n '(^|/)(bridge|channel|channels|feishu|slack|wechat|wecom|discord)' artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt || true
  echo
  echo "### Uploads / documents"
  rg -n '(^|/)(upload|uploads|artifact|document|pdf)' artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt || true
} >> artifacts/upstream-sync-audit-2026-04-14/README.md
```

Expected: `README.md` includes protected-path overlap sections, even if a section has no matches.

- [ ] **Step 5: Commit the conflict-boundary evidence**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/README.md \
  artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt \
  artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt

git commit -m "Map NION divergence boundaries for upstream audit

The audit needs an explicit view of where upstream changes overlap NION's
own branch before any direct-sync recommendation can be made. This records
endpoint overlap and protected-path hotspots for config, desktop, memory,
bridge, and upload surfaces.

Constraint: Protected NION surfaces cannot be classified as directly syncable without source evidence
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Use overlap-files.txt as the first guardrail when reviewing topic-level sync candidates
Tested: git diff and protected-path grep evidence generated successfully
Not-tested: No runtime tests; evidence-only commit"
```

Expected: one commit containing divergence evidence only.

---

## Task 3: Produce The Topic Classification Matrix

**Files:**

- Create: `artifacts/upstream-sync-audit-2026-04-14/topic-classification.md`

- [ ] **Step 1: Create the classification skeleton**

Run:

```bash
cat > artifacts/upstream-sync-audit-2026-04-14/topic-classification.md <<'EOF'
# Upstream Topic Classification

Baseline: `electron` vs `upstream/main`  
Source commit list: `artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv`

## Classification Rules

- Business value: `S`, `A`, `B`, `C`
- Impact: `L`, `M`, `H`
- Adaptation difficulty: `1`, `2`, `3`, `4`
- Conflict tags: `CFG`, `DESKTOP`, `MEMORY`, `BRIDGE`, `BRAND`
- Actions: `直接同步`, `部分同步`, `重写后同步`, `已等价吸收，无需同步`, `明确不同步`
- Priorities: `P0`, `P1`, `P2`, `P3`

## Theme Buckets

| Theme | Commit Count | Key Commits | Business Value | Impact | Adaptation | Conflict Tags | Default Action | Priority | Evidence Notes |
| --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 安全与沙箱 | 0 |  | S | M | 2 |  | 部分同步 | P0 |  |
| 线程与运行时稳定性 | 0 |  | S | M | 2 |  | 部分同步 | P0 |  |
| 上传与文档处理 | 0 |  | S | M | 2 |  | 部分同步 | P0 |  |
| 模型与 provider 能力 | 0 |  | A | H | 3 | CFG | 重写后同步 | P1 |  |
| 前端交互与线程体验 | 0 |  | A | M | 2 |  | 部分同步 | P1 |  |
| Memory / Soul / 长时上下文 | 0 |  | A | H | 3 | MEMORY | 重写后同步 | P1 |  |
| Channel / Bridge / 第三方通道 | 0 |  | B | H | 3 | BRIDGE | 重写后同步 | P2 |  |
| 开发 / 构建 / 跨平台工具链 | 0 |  | B | L | 1 |  | 直接同步 | P2 |  |
| 文档 / 技能 / 社区扩展 | 0 |  | C | L | 1 | BRAND | 明确不同步 | P3 |  |

## Commit Appendix Draft

| Commit | Title | Theme | Files / Modules | Upstream Problem | NION State | Equivalent Absorption | Action | Risk | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
EOF
```

Expected: skeleton exists with the exact columns required by the design.

- [ ] **Step 2: Generate candidate commit groups by title keyword**

Run:

```bash
{
  echo
  echo "## Candidate keyword groups"
  echo
  echo "### Safety / sandbox"
  rg -n 'sandbox|security|escape|permission|audit|path|mount|XSS|download|shell' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Runtime / thread / stream / middleware"
  rg -n 'thread|runtime|stream|middleware|loop|clarification|subagent|END|cancel|todo' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Uploads / documents"
  rg -n 'upload|artifact|document|PDF|pdf|outline|file|readability|web_fetch' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Models / providers / gateway"
  rg -n 'model|provider|vLLM|Ollama|gateway|OAuth|Claude|DeepSeek|thinking|reasoning|LangGraph|Codex' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Frontend / UX"
  rg -n 'frontend|UI|hydration|IME|suggestion|thread history|token|route|button|CSS|markdown' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Memory / soul"
  rg -n 'memory|soul|reflection|correction|longTermBackground|fact' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Channels / bridge"
  rg -n 'channel|Slack|Discord|WeChat|WeCom|wecom|Feishu|Lark|IM' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
  echo
  echo "### Dev / build / CI / docs / skills"
  rg -n 'Windows|Docker|CI|Makefile|serve|lint|format|README|docs|skill|deps|uv|pnpm|blog|community' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv || true
} >> artifacts/upstream-sync-audit-2026-04-14/topic-classification.md
```

Expected: keyword group evidence appears below the table. This is only a candidate map; final classification still requires source reading.

- [ ] **Step 3: Add source-reading instructions inside the classification file**

Run:

```bash
cat >> artifacts/upstream-sync-audit-2026-04-14/topic-classification.md <<'EOF'

## Source Reading Protocol

For each key commit:

1. Read the full commit hash from column 2 of `upstream-commits.tsv`.
2. Run `git show --stat --summary "$FULL_COMMIT"`.
3. Run `git show --name-only --format=fuller "$FULL_COMMIT"`.
4. Open the touched upstream files through `git show "$FULL_COMMIT:$UPSTREAM_PATH"` when the file still exists at that commit.
4. Compare against NION's current file path in `electron`.
5. Record at least two evidence types before assigning an action.
6. If a commit touches protected paths, do not mark it `直接同步` unless the diff is proven local, semantic-neutral, and desktop/config/memory/bridge safe.
EOF
```

Expected: source-reading protocol appears at the end of the classification file.

- [ ] **Step 4: Commit the topic classification scaffold**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/topic-classification.md

git commit -m "Prepare the upstream audit topic classification matrix

The audit needs a fixed report-shaped matrix before source reading begins,
otherwise topic judgments drift while reviewing 252 upstream commits. This
adds the required theme table, commit appendix draft, keyword candidates,
and source-reading protocol.

Constraint: Commit-title grouping is only a candidate map, not final evidence
Rejected: Classifying directly in the final report first | makes source evidence harder to review
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Update topic counts and actions only after reading upstream and NION source evidence
Tested: Classification scaffold created with required columns and keyword evidence
Not-tested: No runtime tests; audit scaffolding only"
```

Expected: one commit containing the classification scaffold.

---

## Task 4: Deep-Read P0 Candidate Themes

**Files:**

- Modify: `artifacts/upstream-sync-audit-2026-04-14/topic-classification.md`
- Create: `artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv`
- Create: `artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md`
- Create: `artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md`
- Create: `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`

**Themes:**

- `安全与沙箱`
- `线程与运行时稳定性`
- `上传与文档处理`

- [ ] **Step 1: Create the report shell with fixed sections**

Run:

```bash
cat > docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md <<'EOF'
# NION Upstream Sync Audit Report

日期：2026-04-14  
基线：`electron` vs `upstream/main`  
状态：Draft audit report

---

## 1. 执行摘要

本报告只做源码级同步审计，不执行 merge、cherry-pick 或产品代码同步。

## 2. 主题总表

| 主题 | 上游改动摘要 | 提交数 | 关键 commit | 业务价值 | 影响范围 | 适配难度 | 架构冲突标记 | 建议动作 | 优先级 | 结论理由 |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |

## 3. Commit 明细附表

| commit | 标题 | 涉及模块/文件 | 上游解决了什么问题 | NION 当前状态 | 是否已等价吸收 | 建议动作 | 风险点 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 4. 冲突热点分析

## 5. 推荐同步批次

## 6. 明确不同步清单

## 7. 审计证据与命令
EOF
```

Expected: report shell exists with the six required report sections plus evidence section.

- [ ] **Step 2: Extract P0 candidate commit hashes**

Run:

```bash
rg -i 'sandbox|security|escape|permission|audit|path|mount|XSS|download|shell|thread|runtime|stream|middleware|loop|clarification|subagent|END|cancel|todo|upload|artifact|document|PDF|pdf|outline|file|readability|web_fetch' \
  artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv \
  > artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv
```

Expected: `p0-candidate-commits.tsv` exists. If it is empty, append a note to the report saying no P0 title candidates were found and continue with file-path evidence from `upstream-files.txt`.

- [ ] **Step 3: Read each P0 candidate commit source diff**

Run:

```bash
: > artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md

while IFS=$'\t' read -r short full date title; do
  {
    echo
    echo "## $short $title"
    git show --stat --summary "$full"
    echo
    git show --name-only --format=fuller "$full"
    echo
    git show --format=fuller --find-renames --find-copies "$full"
  } >> artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md
done < artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv
```

Expected: each P0 candidate commit has a raw source-review block appended to `p0-source-review.md`.

- [ ] **Step 4: Compare P0 candidate files against NION current implementation**

Run:

```bash
: > artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md

while IFS=$'\t' read -r short full date title; do
  git show --name-only --format='' "$full" | sed '/^$/d' | while read -r path; do
    {
      echo
      echo "## $short $title"
      echo "### Upstream path: $path"
      if test -f "$path"; then
        echo "NION state: 同名文件仍存在"
        sed -n '1,240p' "$path"
      else
        base="$(basename "$path")"
        stem="${base%.*}"
        echo "NION state: 同名文件不存在，搜索相关符号"
        rg -n "$stem" backend frontend desktop docs || true
      fi
    } >> artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md
  done
done < artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv
```

Expected: each P0 candidate has a corresponding NION comparison block in `p0-nion-comparison.md`, and each commit row later records one of these NION states:

- `NION 当前实现保留同名文件`
- `NION 当前实现已迁移到新路径`
- `NION 当前实现已等价吸收`
- `NION 当前没有对应实现`
- `NION 当前设计明确排除`

- [ ] **Step 5: Fill P0 rows in the report**

Append rows to the report's topic table and commit appendix for the three P0 candidate themes.

Required row rules:

- Every topic row must include at least one key commit.
- Every commit row must include at least one upstream file path and one NION evidence reference.
- If `settings`, `desktop/electron`, `backend daemon`, `memory/soul`, or `bridge/channel` is touched, the action must not be `直接同步`.

- [ ] **Step 6: Commit P0 deep-read results**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/topic-classification.md \
  artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv \
  artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md \
  artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md \
  docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md

git commit -m "Classify P0 upstream sync candidates by source evidence

The first audit pass covers safety, runtime stability, and upload/document
handling because these are the most likely high-value upstream fixes. Each
candidate is evaluated against NION's current implementation before any
direct-sync recommendation is allowed.

Constraint: Protected NION paths cannot be marked directly syncable without source proof
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Keep P0 rows evidence-backed; do not downgrade source reading to commit-title matching
Tested: git show source review and NION path comparison recorded in the audit report
Not-tested: No runtime tests; audit/report commit only"
```

Expected: one commit containing P0 audit rows.

---

## Task 5: Deep-Read Architecture-Sensitive Themes

**Files:**

- Modify: `artifacts/upstream-sync-audit-2026-04-14/topic-classification.md`
- Create: `artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv`
- Create: `artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md`
- Create: `artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md`
- Modify: `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`

**Themes:**

- `模型与 provider 能力`
- `前端交互与线程体验`
- `Memory / Soul / 长时上下文`
- `Channel / Bridge / 第三方通道`
- `开发 / 构建 / 跨平台工具链`
- `文档 / 技能 / 社区扩展`

- [ ] **Step 1: Extract architecture-sensitive candidates**

Run:

```bash
rg -i 'model|provider|vLLM|Ollama|gateway|OAuth|Claude|DeepSeek|thinking|reasoning|LangGraph|Codex|frontend|UI|hydration|IME|suggestion|thread history|token|route|button|CSS|markdown|memory|soul|reflection|correction|longTermBackground|fact|channel|Slack|Discord|WeChat|WeCom|wecom|Feishu|Lark|IM|Windows|Docker|CI|Makefile|serve|lint|format|README|docs|skill|deps|uv|pnpm|blog|community' \
  artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv \
  > artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: `architecture-candidate-commits.tsv` exists.

- [ ] **Step 2: Read model/provider candidates against Config Center**

Run:

```bash
: > artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md

while IFS=$'\t' read -r short full date title; do
  if printf '%s\n' "$title" | rg -qi 'model|provider|vLLM|Ollama|gateway|OAuth|Claude|DeepSeek|thinking|reasoning|LangGraph|Codex'; then
    {
      echo
      echo "## $short $title"
      git show --name-only --format=fuller "$full"
      echo
      git show --format=fuller "$full"
      echo
      rg -n 'config\\.yaml|config.example.yaml|Config Center|provider|model|credential|registry|settings' backend frontend desktop docs
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md
  fi
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: each model/provider candidate records whether it is `CFG` safe. If it uses `config.yaml` as runtime truth, action must be `重写后同步` or `明确不同步`.

- [ ] **Step 3: Read Memory / Soul candidates against approved contracts**

Run:

```bash
while IFS=$'\t' read -r short full date title; do
  if printf '%s\n' "$title" | rg -qi 'memory|soul|reflection|correction|longTermBackground|fact'; then
    {
      echo
      echo "## $short $title"
      git show --name-only --format=fuller "$full"
      echo
      git show --format=fuller "$full"
      echo
      sed -n '1,220p' docs/superpowers/specs/2026-04-09-memory-soul-boundary-contracts-design.md
      echo
      sed -n '1,220p' docs/superpowers/plans/2026-04-09-memory-soul-boundary-contracts-implementation-plan.md
      echo
      rg -n 'proposal|accept|reject|memory|soul|identity|reflection|correction' backend frontend docs
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md
  fi
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: each Memory / Soul candidate records whether it violates the approved boundary or proposal-ban rule.

- [ ] **Step 4: Read channel/bridge candidates against NION bridge semantics**

Run:

```bash
while IFS=$'\t' read -r short full date title; do
  if printf '%s\n' "$title" | rg -qi 'channel|Slack|Discord|WeChat|WeCom|wecom|Feishu|Lark|IM'; then
    {
      echo
      echo "## $short $title"
      git show --name-only --format=fuller "$full"
      echo
      git show --format=fuller "$full"
      echo
      rg -n 'bridge|channel|channels|runtime|daemon|pairing|diagnostic|incident' backend frontend desktop docs
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md
  fi
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: each channel/bridge candidate records whether it is a transport-level bugfix or a product-model change.

- [ ] **Step 5: Read frontend/thread UX candidates against desktop surfaces**

Run:

```bash
while IFS=$'\t' read -r short full date title; do
  if printf '%s\n' "$title" | rg -qi 'frontend|UI|hydration|IME|suggestion|thread history|token|route|button|CSS|markdown'; then
    {
      echo
      echo "## $short $title"
      git show --name-only --format=fuller "$full"
      echo
      git show --format=fuller "$full"
      echo
      rg -n 'thread|history|route|new|hydration|IME|suggestion|token|SubtaskCard|desktop' frontend desktop docs
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md
  fi
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: each frontend/thread UX candidate records whether the upstream UI assumption fits NION's desktop-first surface.

- [ ] **Step 6: Read dev/build/docs/skills candidates for low-risk adoption**

Run:

```bash
while IFS=$'\t' read -r short full date title; do
  if printf '%s\n' "$title" | rg -qi 'Windows|Docker|CI|Makefile|serve|lint|format|README|docs|skill|deps|uv|pnpm|blog|community'; then
    {
      echo
      echo "## $short $title"
      git show --name-only --format=fuller "$full"
      echo
      git show --format=fuller "$full"
      echo
      rg -n 'Windows|Docker|CI|Makefile|serve|lint|format|README|docs|skill|deps|uv|pnpm|blog|community' .
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md
  fi
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: each candidate is classified as `P2` unless it fixes a blocker for NION's existing verification flow.

- [ ] **Step 7: Build architecture-to-NION comparison evidence**

Run:

```bash
: > artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md

while IFS=$'\t' read -r short full date title; do
  git show --name-only --format='' "$full" | sed '/^$/d' | while read -r path; do
    {
      echo
      echo "## $short $title"
      echo "### Upstream path: $path"
      if test -f "$path"; then
        echo "NION state: 同名文件仍存在"
        sed -n '1,240p' "$path"
      else
        base="$(basename "$path")"
        stem="${base%.*}"
        echo "NION state: 同名文件不存在，搜索相关符号"
        rg -n "$stem" backend frontend desktop docs || true
      fi
    } >> artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md
  done
done < artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
```

Expected: architecture-sensitive candidates now have a companion NION comparison file for final action selection.

- [ ] **Step 8: Fill remaining report rows**

Update:

- topic table commit counts
- key commits for all 9 themes
- commit appendix rows for every key commit
- conflict tags
- actions
- priorities
- evidence references

Expected: every theme bucket has a non-empty conclusion, including themes that are classified as `明确不同步`.

- [ ] **Step 9: Commit architecture-sensitive audit results**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/topic-classification.md \
  artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv \
  artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md \
  artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md \
  docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md

git commit -m "Classify architecture-sensitive upstream sync candidates

This audit pass evaluates model/provider, frontend/thread UX, Memory/Soul,
bridge/channel, build, docs, and skills changes against NION's architecture
before assigning sync actions.

Constraint: Config Center, desktop daemon, Memory/Soul, and bridge semantics are protected boundaries
Rejected: Directly syncing high-value upstream features that rely on upstream product assumptions | would destabilize NION's existing business flows
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Treat CFG, DESKTOP, MEMORY, BRIDGE, and BRAND tags as direct-sync blockers
Tested: Source reading and NION boundary comparison recorded in the audit report
Not-tested: No runtime tests; audit/report commit only"
```

Expected: one commit containing all non-P0 theme audit rows.

---

## Task 6: Finalize The Report And Batch Recommendations

**Files:**

- Modify: `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`
- Modify: `artifacts/upstream-sync-audit-2026-04-14/topic-classification.md`

- [ ] **Step 1: Complete execution summary**

In the report, fill `## 1. 执行摘要` with:

- baseline SHAs from `artifacts/upstream-sync-audit-2026-04-14/README.md`
- upstream non-merge commit count
- topic count
- number of themes per priority
- top P0/P1 recommendations
- one sentence stating no merge or cherry-pick was performed

Expected: summary is readable without opening artifacts.

- [ ] **Step 2: Complete conflict hotspot analysis**

Fill `## 4. 冲突热点分析` with exactly these hotspot headings:

```markdown
### 4.1 Settings / Config Center
### 4.2 Desktop / Electron + Daemon
### 4.3 Memory / Soul
### 4.4 Bridge / Channel / Runtime
### 4.5 Uploads / Document Pipeline
```

Each hotspot must contain:

- dangerous upstream pattern
- safe absorption boundary
- evidence references from topic rows or commit appendix

- [ ] **Step 3: Complete recommended sync batches**

Fill `## 5. 推荐同步批次` with:

```markdown
### Batch A: 安全与稳定性底层修复
### Batch B: 上传 / 线程 / stream 正确性修复
### Batch C: 可兼容 provider 能力增强
### Batch D: 需要按 NION 架构重写的高价值能力
```

Each batch must include:

- included themes
- included key commits
- forbidden piggyback items
- verification focus

- [ ] **Step 4: Complete explicit skip list**

Fill `## 6. 明确不同步清单` with every theme or commit marked `P3` or `明确不同步`.

Each row must include:

- skipped item
- reason
- conflict tag
- evidence

- [ ] **Step 5: Record evidence commands**

Fill `## 7. 审计证据与命令` with the commands that generated:

- baseline SHAs
- commit list
- file list
- overlap file list
- keyword candidate lists

Expected: another engineer can reproduce the audit snapshot from this section.

- [ ] **Step 6: Commit the finalized report**

Run:

```bash
git add artifacts/upstream-sync-audit-2026-04-14/topic-classification.md \
  docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md

git commit -m "Finalize the upstream sync audit report

The report now turns the electron/upstream source audit into a prioritized
sync roadmap with topic-level decisions, commit evidence, conflict hotspots,
batch recommendations, and explicit skip records.

Constraint: Report conclusions must preserve NION's existing business and architecture boundaries
Confidence: medium
Scope-risk: narrow
Reversibility: clean
Directive: Use the batch recommendations as the entry point for future sync implementation plans
Tested: Report sections completed against the audit design and evidence artifacts
Not-tested: No runtime tests; report-only commit"
```

Expected: one commit containing finalized report changes.

---

## Task 7: Self-Review, Anti-Patch-Stack Check, And Final Handoff

**Files:**

- Modify: `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`

- [ ] **Step 1: Run placeholder scan**

Run:

```bash
rg -n 'TODO|TBD|待定|占位|placeholder|fill me|unknown|<[^>]+>' \
  docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md \
  artifacts/upstream-sync-audit-2026-04-14/topic-classification.md \
  artifacts/upstream-sync-audit-2026-04-14/p0-source-review.md \
  artifacts/upstream-sync-audit-2026-04-14/p0-nion-comparison.md \
  artifacts/upstream-sync-audit-2026-04-14/architecture-source-review.md \
  artifacts/upstream-sync-audit-2026-04-14/architecture-nion-comparison.md
```

Expected: command exits `1` with no matches. If matches appear, fix them with concrete evidence or remove unsupported claims.

- [ ] **Step 2: Verify every theme has a conclusion**

Run:

```bash
for theme in \
  '安全与沙箱' \
  '线程与运行时稳定性' \
  '上传与文档处理' \
  '模型与 provider 能力' \
  '前端交互与线程体验' \
  'Memory / Soul / 长时上下文' \
  'Channel / Bridge / 第三方通道' \
  '开发 / 构建 / 跨平台工具链' \
  '文档 / 技能 / 社区扩展'
do
  rg -n "$theme" docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md
done
```

Expected: every theme appears in the report.

- [ ] **Step 3: Verify direct-sync guardrails**

Run:

```bash
rg -n '直接同步' docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md
rg -n 'CFG|DESKTOP|MEMORY|BRIDGE|BRAND' docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md
```

Expected: no row with a conflict tag is marked `直接同步`. If such a row exists, change the action to `部分同步`、`重写后同步` or `明确不同步` and explain why.

- [ ] **Step 4: Verify no upstream sync was performed**

Run:

```bash
git status --short --branch
git log --oneline --no-merges electron..upstream/main | wc -l
```

Expected:

- working tree only contains audit/report changes before the final commit
- upstream non-merge count remains a positive number
- no merge commit from `upstream/main` appears in the current branch during this plan

- [ ] **Step 5: Perform anti-patch-stack review**

Read the report and answer in the final handoff:

- Did the audit report solve the decision problem directly?
- Did any section paper over missing evidence with vague language?
- Did any recommendation mix incompatible topics into the same sync batch?
- Did any protected NION surface get marked as directly syncable?

Expected: all answers support that the report is a coherent decision artifact, not a patch-on-patch workaround.

- [ ] **Step 6: Commit final review fixes**

If Step 1-5 required edits, run:

```bash
git add docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md \
  artifacts/upstream-sync-audit-2026-04-14/topic-classification.md

git commit -m "Tighten upstream sync audit report after self-review

The final review removes unsupported wording and verifies the report's
direct-sync guardrails before handing it off as the source of truth for
future batch plans.

Constraint: Protected NION surfaces must not be made directly syncable by vague wording
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Future sync implementation must start from the report's batch order, not from raw upstream chronology
Tested: Placeholder scan, theme coverage scan, and direct-sync guardrail scan
Not-tested: No runtime tests; report-only review commit"
```

If Step 1-5 required no edits, do not create an empty commit. Record in the final handoff that no final-review commit was needed.

---

## Plan Self-Review

Spec coverage:

- Baseline `electron` vs `upstream/main`: Task 1.
- Two-layer output: Task 3, Task 4, Task 5, Task 6.
- Four-dimensional evaluation: Task 3 and report schema.
- Five fixed decision actions: Task 3 and all deep-read tasks.
- Direct-sync protected boundaries: Task 2, Task 5, Task 7.
- Final report sections: Task 4 and Task 6.
- No merge / no cherry-pick / no `config.yaml`回流: File Structure, Task 1, Task 7.

Placeholder scan:

- This plan intentionally contains no unresolved placeholder markers in executable steps.

Type and naming consistency:

- Artifact directory is consistently `artifacts/upstream-sync-audit-2026-04-14/`.
- Final report path is consistently `docs/superpowers/reports/2026-04-14-upstream-sync-audit-report.md`.
- Spec path is consistently `docs/superpowers/specs/2026-04-14-upstream-sync-audit-design.md`.

Execution recommendation:

- Use `subagent-driven-development` for Task 4 and Task 5 if the executor has access to Codex native subagents, because P0 themes and architecture-sensitive themes can be reviewed independently.
- Use inline execution for Task 1, Task 2, Task 3, Task 6, and Task 7 because those tasks sequence shared artifacts and report assembly.
