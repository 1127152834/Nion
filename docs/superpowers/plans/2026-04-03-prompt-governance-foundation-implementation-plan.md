# Prompt Governance Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 Prompt Governance Foundation for Nion: prompt section registry, static/dynamic prompt boundary hardening, and a unified tool runtime contract that reuses LangGraph primitives and establishes Nion's runtime governance contract.

**Architecture:** Keep LangGraph as the execution substrate for state, middleware, streaming, interrupt/resume, and persistence. Add a thin Nion runtime-governance layer above it: provider-driven prompt assembly, profile-aware prompt composition, diagnostics-ready prompt artifacts, and a formal tool execution contract that standardizes execution stages across existing middleware. Do not expose new system-management capabilities in this plan; only build the foundation they will later plug into.

**Tech Stack:** Python, LangGraph, FastAPI, dataclasses, existing Nion middleware stack, pytest, node:test

---

## Scope Lock

This implementation plan covers only:

1. Prompt section registry
2. Static / Dynamic prompt boundary
3. Unified Tool Runtime Contract

It explicitly excludes:

- SkillTool
- plugin loader / marketplace
- system-management tools for notebook/memory/agent/automation
- specialist agents
- transcript compact / resume
- product shell changes

## File Structure

### New files

- Create: `backend/packages/harness/nion/prompt_runtime/registry.py`
  Prompt section provider registration, filtering, dedupe, ordering, and profile-aware assembly orchestration.

- Create: `backend/packages/harness/nion/prompt_runtime/profiles.py`
  Agent prompt profile model and default profile resolution for `lead`, `subagent`, `notebook-chat`, and `bootstrap`.

- Create: `backend/packages/harness/nion/prompt_runtime/diagnostics.py`
  Prompt diagnostics projection helpers that turn `PromptBuildArtifact` into debug/telemetry-friendly metadata.

- Create: `backend/packages/harness/nion/prompt_sections/__init__.py`
  Exports the built-in section providers and a helper that registers the default prompt section set.

- Create: `backend/packages/harness/nion/prompt_sections/core.py`
  Core section providers for identity, thinking style, clarification policy, and response baseline.

- Create: `backend/packages/harness/nion/prompt_sections/session.py`
  Session guidance providers for current date, selected extensions, and future session-level guidance.

- Create: `backend/packages/harness/nion/prompt_sections/extensions.py`
  Providers for skills discoverability, CLI capability, deferred tools, ACP, and MCP instruction hooks (with MCP provider returning empty placeholder in Phase 1 if no unified instruction plane exists yet).

- Create: `backend/packages/harness/nion/prompt_sections/overlays.py`
  Agent overlay providers for lead, subagent, notebook-chat, and bootstrap.

- Create: `backend/packages/harness/nion/tool_runtime_contract/models.py`
  Formal tool execution context/result/stage dataclasses.

- Create: `backend/packages/harness/nion/tool_runtime_contract/diagnostics.py`
  Shared helpers to build execution-stage metadata for hook/telemetry projections.

- Create: `backend/tests/test_prompt_section_registry.py`
  Tests for provider registration, filtering, ordering, dedupe, and profile application.

- Create: `backend/tests/test_prompt_runtime_diagnostics.py`
  Tests for prompt diagnostics projection and artifact metadata.

- Create: `backend/tests/test_tool_runtime_contract.py`
  Tests for execution-stage models and mapping of existing middleware outcomes into the contract.

### Existing files to modify

- Modify: `backend/packages/harness/nion/prompt_runtime/models.py`
  Expand `PromptSection`, `PromptBuildContext`, and `PromptBuildArtifact` to support provider metadata, diagnostics, and profile-aware composition.

- Modify: `backend/packages/harness/nion/prompt_runtime/assembler.py`
  Keep assembly focused on sorting/splitting, but extend artifact output to include diagnostics metadata.

- Modify: `backend/packages/harness/nion/prompt_runtime/providers.py`
  If needed, refine the existing `PromptSectionProvider` protocol to carry `provider_id` and align with the new registry.

- Modify: `backend/packages/harness/nion/prompt_runtime/__init__.py`
  Export new registry/profile/diagnostics helpers.

- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
  Stop hand-building all sections inline. Move section generation to providers, keep only core prompt template helpers and provider bootstrap wiring.

- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
  Build the prompt through the registry/profile path and attach prompt diagnostics metadata to the runtime where useful.

- Modify: `backend/packages/harness/nion/client.py`
  Use the new prompt registry/profile path when creating embedded agents and preserve diagnostics metadata in a way future APIs can inspect.

- Modify: `backend/packages/harness/nion/threads/service.py`
  Pass session guidance fields through consistently, but do not add more prompt-specific string assembly logic.

- Modify: `backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
  Map guardrail/error paths to the new tool runtime contract stages without changing current user-visible behavior.

- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
  Ensure approval / deny / fail-open/fail-closed outcomes can be interpreted through the unified contract model.

- Modify: `backend/tests/test_prompt_runtime_profiles.py`
  Update to assert provider-registry based output instead of only inline section append behavior.

- Modify: `backend/tests/test_cli_tools_runtime_gating.py`
  Keep the selected extensions prompt injection assertions aligned with the new provider-driven output.

- Modify: `backend/tests/test_threads_router.py`
  Keep thread service pass-through assertions aligned with the new session guidance contract.

- Modify: `backend/CLAUDE.md`
  Update development guidance to document the new prompt registry/profile/diagnostics flow and the tool runtime contract boundaries.

- Modify: `README.md`
  Add a concise note that prompt assembly is now section-based and diagnostics-ready (only if user-facing docs already mention runtime design; otherwise keep this minimal).

## Phase Ordering

Implement in this exact order:

1. Prompt runtime models and registry
2. Prompt providers and profile-based assembly
3. Prompt diagnostics
4. Tool runtime contract models
5. Mapping existing middleware behavior into the contract
6. Documentation synchronization

This order matters because:

- providers depend on the registry and profile model
- diagnostics depend on the final artifact shape
- tool runtime contract should wrap existing middleware behavior, not be invented in isolation

## Task 1: Expand Prompt Runtime Models

**Files:**
- Modify: `backend/packages/harness/nion/prompt_runtime/models.py`
- Test: `backend/tests/test_prompt_runtime_sections.py`

- [ ] **Step 1: Write the failing tests for model extensions**

Add tests covering:

- `PromptSection` carries `source`, `priority`, and `cache_group`
- `PromptBuildArtifact` carries diagnostics-ready metadata fields
- backward-compatible default values still work

Test additions:

```python
def test_prompt_section_supports_governance_metadata():
    section = PromptSection(
        key="dynamic.test",
        title=None,
        content="hello",
        scope="session_dynamic",
        layer="extension",
        order=10,
        source="selected_extensions",
        priority=5,
        cache_group="session-guidance",
    )

    assert section.source == "selected_extensions"
    assert section.priority == 5
    assert section.cache_group == "session-guidance"


def test_prompt_build_artifact_supports_diagnostics_metadata():
    artifact = PromptBuildArtifact(
        full_prompt="A",
        static_prefix="B",
        dynamic_suffix="C",
        section_manifest=[],
        provider_manifest=["core.identity"],
        static_char_count=1,
        dynamic_char_count=1,
    )

    assert artifact.provider_manifest == ["core.identity"]
    assert artifact.static_char_count == 1
    assert artifact.dynamic_char_count == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_sections.py -q
```

Expected:
- FAIL because the new fields are not defined yet.

- [ ] **Step 3: Implement the model extensions**

Update `PromptSection` and `PromptBuildArtifact` in `models.py` with the new fields and safe defaults.

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_sections.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_runtime/models.py backend/tests/test_prompt_runtime_sections.py
git commit -m "feat: expand prompt runtime models for governance metadata"
```

## Task 2: Add Prompt Section Registry

**Files:**
- Create: `backend/packages/harness/nion/prompt_runtime/registry.py`
- Create: `backend/packages/harness/nion/prompt_runtime/profiles.py`
- Modify: `backend/packages/harness/nion/prompt_runtime/providers.py`
- Modify: `backend/packages/harness/nion/prompt_runtime/__init__.py`
- Test: `backend/tests/test_prompt_section_registry.py`

- [ ] **Step 1: Write failing tests for registry behavior**

Cover:

- provider registration
- provider filtering by agent kind
- provider filtering by surface
- section dedupe by `key`
- higher `priority` wins on key conflict
- profile disables specific section keys

Example tests:

```python
def test_registry_orders_sections_by_registration_and_section_order():
    registry = PromptSectionRegistry()
    registry.register(PromptSectionRegistration(...))
    artifact_sections = registry.build_sections(context, profile)
    assert [section.key for section in artifact_sections] == [
        "core.identity",
        "dynamic.selected_extensions",
    ]


def test_registry_resolves_key_conflict_by_priority():
    ...
    assert selected.content == "new"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_section_registry.py -q
```

Expected:
- FAIL because registry/profile classes do not exist.

- [ ] **Step 3: Implement registry and profiles**

Implementation notes:

- `PromptSectionRegistry` is a pure orchestration helper, no global singleton required at first
- `PromptSectionRegistration` holds provider metadata and filter conditions
- `AgentPromptProfile` holds enable/disable/required-provider overlay decisions
- `providers.py` should keep the protocol minimal and framework-agnostic

LangGraph note:
- This layer is intentionally outside LangGraph and should remain pure prompt assembly infrastructure
- Do not put provider resolution into graph nodes or middleware

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_section_registry.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_runtime/registry.py backend/packages/harness/nion/prompt_runtime/profiles.py backend/packages/harness/nion/prompt_runtime/providers.py backend/packages/harness/nion/prompt_runtime/__init__.py backend/tests/test_prompt_section_registry.py
git commit -m "feat: add prompt section registry and agent profiles"
```

## Task 3: Move Prompt Assembly to Providers

**Files:**
- Create: `backend/packages/harness/nion/prompt_sections/__init__.py`
- Create: `backend/packages/harness/nion/prompt_sections/core.py`
- Create: `backend/packages/harness/nion/prompt_sections/session.py`
- Create: `backend/packages/harness/nion/prompt_sections/extensions.py`
- Create: `backend/packages/harness/nion/prompt_sections/overlays.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/agent.py`
- Modify: `backend/packages/harness/nion/client.py`
- Modify: `backend/packages/harness/nion/threads/service.py`
- Test: `backend/tests/test_prompt_runtime_profiles.py`
- Test: `backend/tests/test_cli_tools_runtime_gating.py`

- [ ] **Step 1: Write failing tests for provider-driven prompt assembly**

Add assertions that:

- `apply_prompt_template()` builds sections through the registry path
- selected extensions are emitted by a provider-backed section
- notebook overlays are still injected via provider-backed section
- current date still exists as dynamic section

Example:

```python
def test_apply_prompt_template_uses_registry_built_sections(monkeypatch):
    captured = {}
    monkeypatch.setattr(...build_prompt_artifact..., fake)
    monkeypatch.setattr(...get_default_prompt_registry..., fake_registry)
    apply_prompt_template(...)
    assert "dynamic.user_selected_extensions" in captured["keys"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_profiles.py tests/test_cli_tools_runtime_gating.py -q
```

Expected:
- FAIL because `prompt.py` still hand-builds sections inline.

- [ ] **Step 3: Implement provider-driven assembly**

Implementation notes:

- Keep `SYSTEM_PROMPT_TEMPLATE` only for core static prompt body
- Build provider-backed sections in `prompt_sections/*`
- `apply_prompt_template()` should:
  1. build `PromptBuildContext`
  2. resolve `AgentPromptProfile`
  3. call registry to build ordered sections
  4. pass sections to `build_prompt_artifact()`

- `lead_agent/agent.py` and `client.py` should continue passing session guidance values into `PromptBuildContext`
- `threads/service.py` must stay a pass-through only; no prompt-content assembly logic should return here

LangGraph note:
- The prompt still enters LangGraph as `system_prompt`
- Provider-driven prompt assembly must remain outside graph nodes

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_profiles.py tests/test_cli_tools_runtime_gating.py tests/test_threads_router.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_sections backend/packages/harness/nion/agents/lead_agent/prompt.py backend/packages/harness/nion/agents/lead_agent/agent.py backend/packages/harness/nion/client.py backend/packages/harness/nion/threads/service.py backend/tests/test_prompt_runtime_profiles.py backend/tests/test_cli_tools_runtime_gating.py backend/tests/test_threads_router.py
git commit -m "refactor: move prompt assembly to section providers"
```

## Task 4: Harden Static / Dynamic Boundary and Prompt Diagnostics

**Files:**
- Modify: `backend/packages/harness/nion/prompt_runtime/assembler.py`
- Create: `backend/packages/harness/nion/prompt_runtime/diagnostics.py`
- Test: `backend/tests/test_prompt_runtime_assembler.py`
- Test: `backend/tests/test_prompt_runtime_diagnostics.py`

- [ ] **Step 1: Write failing diagnostics tests**

Cover:

- artifact reports `provider_manifest`
- `static_char_count` and `dynamic_char_count` are populated
- diagnostics projection groups sections by `scope`, `layer`, and `source`

Example:

```python
def test_prompt_diagnostics_projection_exposes_scope_layer_and_source():
    diagnostics = project_prompt_diagnostics(artifact)
    assert diagnostics["sections"][0]["scope"] == "global_static"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_assembler.py tests/test_prompt_runtime_diagnostics.py -q
```

Expected:
- FAIL because diagnostics projection does not exist yet.

- [ ] **Step 3: Implement artifact metadata and diagnostics projection**

Implementation notes:

- assembler remains deterministic and pure
- diagnostics helper should not own assembly; it only projects artifact metadata for debug/telemetry
- no API route yet in this plan; just prepare helper layer

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_assembler.py tests/test_prompt_runtime_diagnostics.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_runtime/assembler.py backend/packages/harness/nion/prompt_runtime/diagnostics.py backend/tests/test_prompt_runtime_assembler.py backend/tests/test_prompt_runtime_diagnostics.py
git commit -m "feat: add prompt diagnostics metadata and projection"
```

## Task 5: Define Unified Tool Runtime Contract Models

**Files:**
- Create: `backend/packages/harness/nion/tool_runtime_contract/models.py`
- Create: `backend/packages/harness/nion/tool_runtime_contract/diagnostics.py`
- Test: `backend/tests/test_tool_runtime_contract.py`

- [ ] **Step 1: Write failing tests for execution-stage models**

Cover:

- `ToolExecutionContext`
- `ToolExecutionResult`
- stage enums / literals
- normalization of failure / permission-denied / success outcomes

Example:

```python
def test_tool_execution_result_supports_permission_denied():
    result = ToolExecutionResult(
        status="permission_denied",
        output={"reason": "approval_required"},
    )
    assert result.status == "permission_denied"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_contract.py -q
```

Expected:
- FAIL because contract models do not exist.

- [ ] **Step 3: Implement contract models**

LangGraph note:
- This does not replace LangGraph tool runtime
- It standardizes metadata and stage semantics around the existing LangGraph middleware chain

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_contract.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tool_runtime_contract/models.py backend/packages/harness/nion/tool_runtime_contract/diagnostics.py backend/tests/test_tool_runtime_contract.py
git commit -m "feat: add unified tool runtime contract models"
```

## Task 6: Map Existing Middleware to the Tool Runtime Contract

**Files:**
- Modify: `backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
- Modify: `backend/packages/harness/nion/guardrails/middleware.py`
- Test: `backend/tests/test_tool_runtime_permission_contract.py`
- Test: `backend/tests/test_tool_error_handling_middleware.py`
- Test: `backend/tests/test_guardrail_middleware.py`

- [ ] **Step 1: Write failing tests for execution-stage mapping**

New assertions should verify that:

- approval-required denial maps to `permission_decision`
- execution exception maps to `post_tool_use_failure`
- success path can carry normalized stage metadata in `additional_kwargs`

Example:

```python
def test_guardrail_approval_request_maps_to_permission_decision_stage():
    ...
    assert tool_runtime["stage"] == "permission_decision"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_permission_contract.py tests/test_tool_error_handling_middleware.py tests/test_guardrail_middleware.py -q
```

Expected:
- FAIL because current metadata is not yet aligned to the new contract.

- [ ] **Step 3: Implement stage mapping on top of existing middleware**

Implementation notes:

- Do not rewrite guardrail logic
- Do not rewrite LangGraph permission behavior
- Add explicit stage mapping metadata only
- Keep user-visible tool result semantics unchanged

LangGraph note:
- Middleware remains the execution interception layer
- Nion contract maps those interception points into product-level stage names

- [ ] **Step 4: Run tests to verify they pass**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_permission_contract.py tests/test_tool_error_handling_middleware.py tests/test_guardrail_middleware.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py backend/packages/harness/nion/guardrails/middleware.py backend/tests/test_tool_runtime_permission_contract.py backend/tests/test_tool_error_handling_middleware.py backend/tests/test_guardrail_middleware.py
git commit -m "refactor: map middleware outcomes to tool runtime contract"
```

## Task 7: Documentation Synchronization

**Files:**
- Modify: `backend/CLAUDE.md`
- Modify: `README.md`

- [ ] **Step 1: Update backend development guidance**

Add:

- prompt assembly is registry/provider-based
- static/dynamic boundary is formalized
- tool runtime contract is the canonical execution-stage vocabulary
- later features must not bypass these layers

- [ ] **Step 2: Update root README minimally**

Only add concise language describing:

- prompt assembly is now section-based
- this repository is moving toward governance-first runtime assembly

- [ ] **Step 3: Verify docs mention actual current architecture**

Run:

```bash
rg -n "prompt runtime|section registry|tool runtime contract" README.md backend/CLAUDE.md
```

Expected:
- Matches the implemented architecture, not aspirational fiction.

- [ ] **Step 4: Commit**

```bash
git add backend/CLAUDE.md README.md
git commit -m "docs: document prompt governance foundation"
```

## Final Verification

After all tasks complete, run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_prompt_runtime_sections.py \
  tests/test_prompt_section_registry.py \
  tests/test_prompt_runtime_assembler.py \
  tests/test_prompt_runtime_diagnostics.py \
  tests/test_prompt_runtime_profiles.py \
  tests/test_cli_tools_runtime_gating.py \
  tests/test_threads_router.py \
  tests/test_tool_runtime_contract.py \
  tests/test_tool_runtime_permission_contract.py \
  tests/test_tool_error_handling_middleware.py \
  tests/test_guardrail_middleware.py -q
```

Expected:
- all tests pass

Optional smoke verification:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/frontend
pnpm exec node --test \
  src/core/threads/cli-selection-payload.contract.test.ts \
  src/components/workspace/messages/message-list-item.contract.test.ts
```

Expected:
- prompt/session guidance related UI contracts still pass

## Spec Coverage Check

This plan covers every requirement from the spec:

- Prompt section registry
  - Tasks 1–3
- Static / Dynamic prompt boundary
  - Tasks 1, 3, 4
- Tool runtime contract
  - Tasks 5–6
- LangGraph-first constraint
  - preserved explicitly in Tasks 3 and 6
- Diagnostics / observability
  - Task 4
- Non-goals preserved
  - no SkillTool, no specialist agents, no system management tools in this plan

## Placeholder Scan

Checked for and removed:

- no TBD/TODO placeholders
- all new modules have explicit target paths
- all verification commands are concrete
- all commits are concrete and scoped

## Type Consistency Check

Naming is kept consistent across tasks:

- `PromptSectionProvider`
- `PromptSectionRegistration`
- `AgentPromptProfile`
- `PromptBuildArtifact`
- `ToolExecutionContext`
- `ToolExecutionResult`

These names should be introduced exactly as written to avoid drift between tasks.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-03-prompt-governance-foundation-implementation-plan.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
