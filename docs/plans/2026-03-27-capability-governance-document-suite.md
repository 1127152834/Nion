# Capability Governance Document Suite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 产出一套真正落盘到 `docs/` 的能力治理文档，覆盖 PRD、数据模型与 API 合同、`@agent` 委派规则、健康状态规范、以及分阶段产品路线图。

**Architecture:** 先用一个新目录 `docs/capability-governance/` 承接整套文档，再用一个索引文档统一收口。文档内容必须基于当前代码事实而不是纯概念描述，明确区分“能力池、主体画像、回合选择、运行时裁决”四层模型，并把当前实现与目标实现的差距写清楚，避免后续实现阶段重新发明规则。

**Tech Stack:** Markdown, existing `docs/` structure, React settings/agents pages, FastAPI routers, Python harness/config models, `rg`, `sed`, `find`

---

## Preflight Constraints

- 这是文档计划，不是实现计划；本轮交付目标是把文档写进 `docs/`，不是改运行时权限逻辑。
- 执行时应使用独立 worktree，避免把文档撰写和后续实现改动混进同一工作区。
- 文档必须引用当前代码事实，至少核对以下文件：
  - `frontend/src/components/workspace/settings/settings-dialog.tsx`
  - `frontend/src/components/workspace/settings/tool-settings-page.tsx`
  - `frontend/src/components/workspace/settings/mcp-servers-page.tsx`
  - `frontend/src/components/workspace/settings/cli-tools-page.tsx`
  - `frontend/src/components/workspace/settings/skill-settings-page.tsx`
  - `frontend/src/components/workspace/agents/agent-gallery.tsx`
  - `frontend/src/app/workspace/agents/agent-chat-page.tsx`
  - `frontend/src/core/threads/hooks.ts`
  - `backend/app/gateway/routers/agents.py`
  - `backend/app/gateway/routers/mcp.py`
  - `backend/app/gateway/routers/skills.py`
  - `backend/app/gateway/routers/cli.py`
  - `backend/packages/harness/nion/tools/tools.py`
  - `backend/packages/harness/nion/tools/builtins/task_tool.py`
  - `backend/packages/harness/nion/config/agents_config.py`
  - `backend/packages/harness/nion/config/tool_config.py`
  - `backend/packages/harness/nion/config/extensions_config.py`
- 文档里不允许留下 `TODO`、`TBD`、`待补充` 这类占位词。
- 不新增文档框架依赖；只用仓库现有 Markdown 约定。

## Target Document Set

执行完成后，`docs/capability-governance/` 下必须存在以下真实文档：

- `docs/capability-governance/README.md`
- `docs/capability-governance/prd-v1.md`
- `docs/capability-governance/capability-profile-and-api-contract.md`
- `docs/capability-governance/agent-delegation-spec.md`
- `docs/capability-governance/health-state-spec.md`
- `docs/capability-governance/roadmap.md`

## Task 1: Create the Documentation Container and Index

**Files:**
- Create: `docs/capability-governance/README.md`
- Verify: `docs/capability-governance/`

**Step 1: Create the new documentation directory**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
mkdir -p docs/capability-governance
```

Expected: `docs/capability-governance` exists.

**Step 2: Write the index document skeleton**

Create `docs/capability-governance/README.md` with this exact top structure:

```md
# Capability Governance Documentation

## Purpose

This directory defines the product and implementation-facing documentation for:

- capability pool governance
- principal capability profiles
- @agent delegation rules
- capability health states
- phased delivery roadmap

## Documents

- [PRD v1](./prd-v1.md)
- [Capability Profile and API Contract](./capability-profile-and-api-contract.md)
- [Agent Delegation Spec](./agent-delegation-spec.md)
- [Health State Spec](./health-state-spec.md)
- [Roadmap](./roadmap.md)

## Source-of-Truth Code Paths

- `frontend/src/components/workspace/settings/settings-dialog.tsx`
- `frontend/src/app/workspace/agents/agent-chat-page.tsx`
- `backend/packages/harness/nion/tools/tools.py`
- `backend/packages/harness/nion/tools/builtins/task_tool.py`
```

**Step 3: Verify the directory layout**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
find docs/capability-governance -maxdepth 1 -type f | sort
```

Expected: only `docs/capability-governance/README.md` is listed.

**Step 4: Commit**

```bash
git add docs/capability-governance/README.md
git commit -F - <<'EOF'
Establish a stable home for capability-governance documentation

Create a dedicated docs directory and index file so the upcoming PRD,
contract, delegation, health, and roadmap documents have one durable
entry point instead of being scattered across ad hoc plan files.

Constraint: Documentation must live under docs/ and stay easy to discover
Rejected: Add a one-off flat file under docs/ | Would fragment the doc set
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep this README as the canonical index for all capability-governance docs
Tested: Directory creation and file presence verification via find
Not-tested: Any runtime or UI behavior
EOF
```

## Task 2: Write the PRD v1

**Files:**
- Create: `docs/capability-governance/prd-v1.md`
- Modify: `docs/capability-governance/README.md`
- Verify: current source files listed in Preflight Constraints

**Step 1: Read the current product surfaces before writing**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
sed -n '1,260p' frontend/src/components/workspace/settings/settings-dialog.tsx
sed -n '1,220p' frontend/src/app/workspace/agents/agent-chat-page.tsx
sed -n '1,220p' frontend/src/components/workspace/agents/agent-gallery.tsx
sed -n '1,220p' backend/app/gateway/routers/agents.py
```

Expected: confirm current settings IA, agent gallery/chat surfaces, and existing agent CRUD scope.

**Step 2: Write the PRD header and thesis**

Create `docs/capability-governance/prd-v1.md` with this exact opening:

```md
# Capability Governance PRD v1

## Purpose

Define how Nion should govern Tools, MCP, CLI, Skills, and agent delegation so that:

- main assistant permissions are real
- agent permissions are independent
- @agent is the only delegation entry for custom agents
- health state and authorization are clearly separated

## Problem Statement

The current product mixes:

- global capability installation
- per-surface settings
- per-turn shortcut selection
- custom-agent persona configuration

without one stable runtime contract.
```

**Step 3: Fill the required PRD sections**

The completed PRD must include:

- `Goals`
- `Non-Goals`
- `Core Principles`
- `Key Product Objects`
- `Information Architecture`
- `Behavior Rules`
- `Capability Categories`
- `@agent Rules`
- `Health vs Authorization`
- `Open Questions Resolved in v1`
- `Acceptance Criteria`
- `Risks`

Do not leave any unresolved v1 rule implicit.

**Step 4: Link the PRD from the index**

Ensure `docs/capability-governance/README.md` contains:

```md
- [PRD v1](./prd-v1.md)
```

**Step 5: Verify no placeholder language remains**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "TODO|TBD|待补充|placeholder" docs/capability-governance/prd-v1.md
```

Expected: no matches.

**Step 6: Commit**

```bash
git add docs/capability-governance/README.md docs/capability-governance/prd-v1.md
git commit -F - <<'EOF'
Lock the product contract for capability governance

Document the v1 product rules for capability governance so later
implementation does not drift between UI assumptions, runtime behavior,
and agent delegation semantics.

Constraint: PRD must be grounded in current repo behavior, not abstract product theory
Rejected: Keep the PRD in a plan file only | Plans are not a durable product contract
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Update this PRD before changing delegation or capability-governance behavior
Tested: Source-file inspection and placeholder scan via rg
Not-tested: Any implementation changes
EOF
```

## Task 3: Write the Capability Profile and API Contract

**Files:**
- Create: `docs/capability-governance/capability-profile-and-api-contract.md`
- Modify: `docs/capability-governance/README.md`
- Verify: `backend/packages/harness/nion/config/tool_config.py`
- Verify: `backend/packages/harness/nion/config/extensions_config.py`
- Verify: `backend/packages/harness/nion/config/agents_config.py`
- Verify: `backend/app/gateway/routers/{agents,mcp,skills,cli}.py`

**Step 1: Inspect the current source models**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
sed -n '1,220p' backend/packages/harness/nion/config/tool_config.py
sed -n '1,240p' backend/packages/harness/nion/config/extensions_config.py
sed -n '1,200p' backend/packages/harness/nion/config/agents_config.py
```

Expected: confirm current source-of-truth objects that must remain intact.

**Step 2: Write the contract doc with these exact section headings**

Create `docs/capability-governance/capability-profile-and-api-contract.md` with:

```md
# Capability Profile and API Contract

## Scope
## Existing Source Models
## New Product-Layer Objects
## Persistence Proposal
## Read APIs
## Write APIs
## Runtime Resolution Order
## Backward Compatibility
## Migration Notes
```

**Step 3: Define the new product-layer objects explicitly**

The document must define, in table or schema form:

- `CapabilityDescriptor`
- `PrincipalCapabilityProfile`
- `DelegationSelection`
- `ResolvedCapabilitySet`

For each object, specify:

- ownership
- persistence location
- fields
- producer
- consumer

**Step 4: Specify API endpoints, not just vague wishes**

Document concrete proposed contracts for:

- `GET /api/capabilities`
- `GET /api/principals/main/capabilities`
- `PUT /api/principals/main/capabilities`
- `GET /api/agents/{agent_name}/capabilities`
- `PUT /api/agents/{agent_name}/capabilities`
- any lightweight `probe` or `health` endpoint needed in v1

Include request and response examples in JSON blocks.

**Step 5: Verify terminology consistency**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "CapabilityPoolItem" docs/capability-governance
```

Expected: no matches, because this term was explicitly rejected.

**Step 6: Commit**

```bash
git add docs/capability-governance/README.md \
  docs/capability-governance/capability-profile-and-api-contract.md
git commit -F - <<'EOF'
Define the documentation-level contract for capability profiles and APIs

Capture the normalized capability objects and API surface in one place so
engineering can implement profile persistence and runtime resolution without
guessing how existing config models should relate to new product rules.

Constraint: Existing source models must remain source models, not be replaced by the doc-layer abstractions
Rejected: Introduce a single replacement mega-model | Would blur persistence and product semantics
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Treat this contract as the binding bridge between product language and code-level implementation
Tested: Source model inspection and terminology scan via rg
Not-tested: Endpoint implementation or schema validation
EOF
```

## Task 4: Write the @agent Delegation Spec

**Files:**
- Create: `docs/capability-governance/agent-delegation-spec.md`
- Modify: `docs/capability-governance/README.md`
- Verify: `frontend/src/core/threads/hooks.ts`
- Verify: `backend/packages/harness/nion/tools/builtins/task_tool.py`
- Verify: `backend/packages/harness/nion/subagents/builtins/__init__.py`

**Step 1: Inspect current delegation-related code**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
sed -n '540,575p' frontend/src/core/threads/hooks.ts
sed -n '260,380p' backend/packages/harness/nion/tools/builtins/task_tool.py
sed -n '1,80p' backend/packages/harness/nion/subagents/builtins/__init__.py
```

Expected: confirm current `subagent_enabled` path and built-in subagent restrictions.

**Step 2: Write the delegation spec with these exact sections**

Create `docs/capability-governance/agent-delegation-spec.md` with:

```md
# Agent Delegation Specification

## Purpose
## Current Runtime Facts
## v1 Delegation Rules
## @agent Parsing Semantics
## Candidate vs Forced Delegation
## Runtime Guardrails
## UI States
## Streaming and Transcript Expectations
## Failure Modes
## Acceptance Checklist
```

**Step 3: Freeze the parsing rules**

The document must explicitly define:

- what `@writer` means by default
- what language counts as explicit forced delegation
- what happens when multiple agents are mentioned
- the per-turn maximum number of active agents
- the rule that agents cannot call other agents

Do not leave these as “TBD by implementation”.

**Step 4: Add transcript and observability requirements**

The spec must state how the UI and logs should show:

- candidate agents
- forced delegation
- actual delegation events
- failure to delegate because the agent was not mentioned

**Step 5: Verify the document contains the forbidden-rule sentence**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "Only the main assistant may invoke custom agents" docs/capability-governance/agent-delegation-spec.md
```

Expected: one match.

**Step 6: Commit**

```bash
git add docs/capability-governance/README.md \
  docs/capability-governance/agent-delegation-spec.md
git commit -F - <<'EOF'
Make @agent delegation behavior explicit and enforceable on paper

Specify the @agent semantics, delegation limits, transcript rules, and
non-recursive agent relationships so implementation and UX stop drifting
around an underspecified feature idea.

Constraint: Agent delegation must remain main-assistant-only in v1
Rejected: Let agents call each other | Would create opaque orchestration and weak user control
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Do not implement @agent UI or runtime routing before this spec is approved
Tested: Delegation source inspection and sentence-presence check via rg
Not-tested: Any runtime delegation flow
EOF
```

## Task 5: Write the Health State Spec

**Files:**
- Create: `docs/capability-governance/health-state-spec.md`
- Modify: `docs/capability-governance/README.md`
- Verify: existing settings pages and probe surfaces

**Step 1: Inspect the current health/probe surfaces**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
sed -n '1,240p' frontend/src/components/workspace/settings/cli-tools-page.tsx
sed -n '120,250p' backend/app/gateway/routers/mcp.py
sed -n '120,220p' backend/app/gateway/routers/skills.py
sed -n '1,220p' backend/app/gateway/routers/cli.py
```

Expected: identify existing probe patterns and missing health-state abstractions.

**Step 2: Write the health spec with these exact sections**

Create `docs/capability-governance/health-state-spec.md` with:

```md
# Capability Health State Specification

## Purpose
## State Dimensions
## Authorization State
## Health State
## Per-Type Probe Rules
## UI Presentation Rules
## Refresh Lifecycle
## Runtime Failure Feedback
## Edge Cases
## Acceptance Checklist
```

**Step 3: Define state tables for all four capability categories**

For each of:

- Tool
- MCP
- CLI
- Skill

document:

- valid health states
- how the state is computed
- what user-facing copy should say
- whether the state blocks runtime invocation

**Step 4: Specify refresh and cache rules**

The completed doc must explicitly define:

- when a probe runs automatically
- when the user can trigger re-check
- what timestamp is stored
- how runtime failures feed back into cached health

**Step 5: Verify the health doc names both dimensions**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "Authorization State|Health State" docs/capability-governance/health-state-spec.md
```

Expected: both headings are present.

**Step 6: Commit**

```bash
git add docs/capability-governance/README.md \
  docs/capability-governance/health-state-spec.md
git commit -F - <<'EOF'
Separate capability health from authorization in the doc set

Define the health-state system so the product can distinguish a disabled
capability from a broken one, and so later settings and agent pages share
one consistent state vocabulary.

Constraint: Health and authorization must not collapse into one UI control
Rejected: Use a single enabled flag for everything | Would hide failure causes and break trust
Confidence: high
Scope-risk: moderate
Reversibility: clean
Directive: Preserve the two-dimension state model across UI, APIs, and runtime diagnostics
Tested: Probe-surface inspection and heading verification via rg
Not-tested: Any automated health-check implementation
EOF
```

## Task 6: Write the Product Roadmap

**Files:**
- Create: `docs/capability-governance/roadmap.md`
- Modify: `docs/capability-governance/README.md`
- Verify: previous four documents

**Step 1: Re-read the generated docs before sequencing delivery**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
sed -n '1,240p' docs/capability-governance/prd-v1.md
sed -n '1,260p' docs/capability-governance/capability-profile-and-api-contract.md
sed -n '1,240p' docs/capability-governance/agent-delegation-spec.md
sed -n '1,240p' docs/capability-governance/health-state-spec.md
```

Expected: confirm roadmap phases are derived from agreed contracts, not re-litigating them.

**Step 2: Write the roadmap with these exact sections**

Create `docs/capability-governance/roadmap.md` with:

```md
# Capability Governance Roadmap

## Outcome
## Delivery Principles
## Phase 0: Definition Freeze
## Phase 1: Main Assistant Capability Enforcement
## Phase 2: Agent Capability Profiles
## Phase 3: @agent Delegation
## Phase 4: Health State System
## Phase 5: Observability and Refinement
## Dependencies
## Risks
## Exit Criteria
```

**Step 3: Make each phase implementation-facing**

For every phase, include:

- objective
- in-scope changes
- out-of-scope changes
- concrete deliverables
- acceptance gate

Do not write vague “improve experience” fluff.

**Step 4: Cross-link the roadmap from the index**

Ensure `docs/capability-governance/README.md` contains:

```md
- [Roadmap](./roadmap.md)
```

**Step 5: Verify all expected docs now exist**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
find docs/capability-governance -maxdepth 1 -type f | sort
```

Expected output:

```text
docs/capability-governance/README.md
docs/capability-governance/agent-delegation-spec.md
docs/capability-governance/capability-profile-and-api-contract.md
docs/capability-governance/health-state-spec.md
docs/capability-governance/prd-v1.md
docs/capability-governance/roadmap.md
```

**Step 6: Commit**

```bash
git add docs/capability-governance/README.md \
  docs/capability-governance/roadmap.md
git commit -F - <<'EOF'
Sequence capability-governance delivery into explicit product phases

Turn the approved document set into a phased delivery roadmap so the team
can implement the work in dependency order without collapsing definition,
authorization, delegation, and health-state work into one risky batch.

Constraint: The roadmap must follow the contract docs, not replace them
Rejected: Build settings and @agent UI in parallel before runtime rules settle | Would cause rework and false confidence
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Keep roadmap phases aligned with the contract docs and update them together
Tested: Full document-set existence verification via find
Not-tested: Any implementation sequencing in code
EOF
```

## Task 7: Final Documentation QA and Handoff

**Files:**
- Modify: `docs/capability-governance/README.md` (only if links or wording need correction)
- Verify: all files under `docs/capability-governance/`

**Step 1: Run the final terminology and placeholder sweep**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "TODO|TBD|待补充|placeholder|lorem ipsum" docs/capability-governance
```

Expected: no matches.

**Step 2: Run the final link and heading sweep**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
rg -n "\]\(\./" docs/capability-governance/README.md
rg -n "^# " docs/capability-governance/*.md
```

Expected:

- README contains relative links to all five companion docs
- every doc has exactly one top-level `#` heading

**Step 3: Review the doc set against the original product intent**

Manually confirm the final docs answer all of these:

- 主助手和 agent 的关系是什么
- 主助手如何控制自己的能力
- agent 如何独立控制自己的能力
- `@agent` 如何进入委派流程
- 健康状态与授权状态如何区分
- 分阶段交付顺序是什么

**Step 4: Commit**

```bash
git add docs/capability-governance
git commit -F - <<'EOF'
Finalize the capability-governance documentation suite for execution

Perform the final QA pass so the new doc set is internally consistent,
free of placeholders, and ready to guide implementation without further
interpretation work.

Constraint: The final doc set must be execution-ready, not brainstorming material
Rejected: Merge partial docs and patch later | Would force engineers to infer missing rules
Confidence: high
Scope-risk: narrow
Reversibility: clean
Directive: Treat this directory as the execution handoff for capability-governance work
Tested: Placeholder scan, heading scan, and document-set verification
Not-tested: Downstream engineering implementation
EOF
```

## Final Verification

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion
find docs/capability-governance -maxdepth 1 -type f | sort
rg -n "TODO|TBD|待补充|placeholder" docs/capability-governance
```

Expected:

- all six files exist
- placeholder scan returns no matches

## Handoff Notes

- 文档阶段完成后，再开始实现阶段；不要在文档未冻结时提前改权限逻辑。
- 后续实现计划应直接引用：
  - `docs/capability-governance/prd-v1.md`
  - `docs/capability-governance/capability-profile-and-api-contract.md`
  - `docs/capability-governance/agent-delegation-spec.md`
  - `docs/capability-governance/health-state-spec.md`
  - `docs/capability-governance/roadmap.md`
