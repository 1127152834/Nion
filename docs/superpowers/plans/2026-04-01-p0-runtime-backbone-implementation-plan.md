# P0 Runtime Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 落地 Nion 的 P0 运行时中轴：Prompt Runtime、Tool Runtime Contract、Hook Event Plane，为后续 SkillTool、Tool Activity、plugin/MCP、specialist agents 提供稳定、可产品化、低返工的基础设施。

**Architecture:** 先把现有 `prompt.py`、`tools.py`、middleware builder、guardrail、tool error handling 统一重构到产品级 contract 上，再在此基础上引入统一 hook 事件面。整个实现优先复用 LangGraph 的 middleware、ToolNode、`Command`、interrupt/resume、streaming，不平行重造 state/persistence/orchestration。

**Tech Stack:** Python backend, LangGraph/LangChain middleware, FastAPI gateway, existing thread/task telemetry, pytest, uv

---

## Scope Lock

这个计划只覆盖 P0 中轴，不在本轮内实现：

- SkillTool
- plugin frontmatter loader
- MCP behavior plane
- Tool Activity Layer
- Explore / Plan / Verification
- Glob / Grep / patch-edit / LSP

这些能力都依赖 P0，但不属于本计划实施范围。

## Source Specs

本计划严格基于下面 3 份设计稿执行：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-prompt-runtime-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-tool-runtime-contract-design.md`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-hook-event-plane-design.md`

## Architecture Invariants

- 不允许绕开 LangGraph 平行重造一套状态机、pause/resume、持久化和 orchestration
- Prompt Runtime 必须输出结构化 build artifact，而不是只有字符串
- Tool Runtime Contract 必须显式建模 execution stage
- Hook Event Plane 必须区分 `IN_RUNTIME` 和 `OUT_OF_RUNTIME`
- 现有 `GuardrailMiddleware`、`ToolErrorHandlingMiddleware`、`ClarificationMiddleware` 必须被收编进统一 contract，而不是推倒重写
- 实施过程中必须优先减少返工、保证产品化和天然兼容，不走补丁式塞功能路线

## File Structure

### Create

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/providers.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/assembler.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/runtime_models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/runtime_pipeline.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/hooks/event_models.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/hooks/dispatcher.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_sections.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_assembler.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_profiles.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_runtime_pipeline.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_runtime_permission_contract.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_schema.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_in_runtime.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_out_of_runtime.py`

### Modify

- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/agent.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/guardrails/middleware.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/clarification_middleware.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/tool_search.py`
- `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`

---

## Task 1: 建立 Prompt Runtime 核心模型

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_sections.py`

- [ ] **Step 1: 写失败测试，锁定 PromptSection / PromptBuildContext / PromptBuildArtifact 基本形态**

测试至少覆盖：
- `PromptSection.scope`
- `PromptSection.layer`
- disabled section 不进入输出
- artifact 暴露 `full_prompt/static_prefix/dynamic_suffix/section_manifest`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_sections.py -q
```

Expected:
- FAIL with missing module or missing symbols

- [ ] **Step 3: 实现最小模型代码**

实现：
- `PromptSection`
- `PromptBuildContext`
- `PromptBuildArtifact`
- `PROMPT_DYNAMIC_BOUNDARY`

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_sections.py -q
```

Expected:
- PASS

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_runtime/models.py \
  backend/tests/test_prompt_runtime_sections.py
git commit -m "feat(prompt-runtime): add core prompt runtime models"
```

## Task 2: 实现 Prompt Assembler 与 Section Provider 机制

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/providers.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_runtime/assembler.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_assembler.py`

- [ ] **Step 1: 写失败测试，锁定 assembler 的 static/dynamic 拼装行为**

测试至少覆盖：
- static sections 正确进入 `static_prefix`
- dynamic sections 正确进入 `dynamic_suffix`
- boundary marker 正确插入
- 相同 context 多次构造结果一致

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_assembler.py -q
```

Expected:
- FAIL with missing assembler/provider implementation

- [ ] **Step 3: 实现 PromptSectionProvider 协议和 assembler**

要求：
- provider 可返回多个 section
- assembler 能排序、过滤、分层、产出 artifact
- 不引入任何具体业务 provider

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_assembler.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/prompt_runtime/providers.py \
  backend/packages/harness/nion/prompt_runtime/assembler.py \
  backend/tests/test_prompt_runtime_assembler.py
git commit -m "feat(prompt-runtime): add section provider assembler"
```

## Task 3: 把现有 lead prompt 平移到 Prompt Runtime

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_prompt_runtime_profiles.py`

- [ ] **Step 1: 写失败测试，锁定 lead/bootstrp/subagent profile 的核心差异**

测试至少覆盖：
- lead profile 包含 skill/deferred/acp 等动态段
- bootstrap profile 支持限定 skill 集
- subagent profile 不等价于 lead 全量 prompt

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_profiles.py -q
```

Expected:
- FAIL with missing profile behavior

- [ ] **Step 3: 在 `prompt.py` 中引入 section provider 平移层**

要求：
- 保留现有行为尽量不变
- `_get_memory_context`、`get_skills_prompt_section`、`get_deferred_tools_prompt_section`、`_build_acp_section` 不再直接往模板里插字符串，而改造成 provider 贡献
- `SYSTEM_PROMPT_TEMPLATE` 不再继续扩展

- [ ] **Step 4: 运行 profile 测试**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_profiles.py -q
```

- [ ] **Step 5: 做兼容性回归检查**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_prompt_runtime_sections.py tests/test_prompt_runtime_assembler.py tests/test_prompt_runtime_profiles.py -q
```

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/tests/test_prompt_runtime_profiles.py
git commit -m "feat(prompt-runtime): migrate lead prompt to section runtime"
```

## Task 4: 扩展 Tool Catalog 为 Contract-aware Catalog

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/runtime_models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_runtime_pipeline.py`

- [ ] **Step 1: 写失败测试，锁定 ToolExecutionTraits / ToolExecutionStage / ToolRuntimeResult 基本形态**

测试至少覆盖：
- `ToolExecutionTraits`
- `ToolExecutionStage`
- `ToolRuntimeResult.status`
- `ToolCatalogEntry.visibility`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_pipeline.py -q
```

- [ ] **Step 3: 实现最小 contract 模型**

要求：
- 不改执行路径
- 先建立模型

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_pipeline.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/tools/runtime_models.py \
  backend/packages/harness/nion/tools/catalog.py \
  backend/tests/test_tool_runtime_pipeline.py
git commit -m "feat(tool-runtime): add runtime contract models"
```

## Task 5: 把现有 middleware 收口到 Tool Runtime Contract

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_runtime_permission_contract.py`

- [ ] **Step 1: 写失败测试，锁定 approval_required / denied / failed 统一语义**

测试至少覆盖：
- approval_required 仍能生成审批请求
- denied 仍能生成标准错误消息
- fail_closed evaluator error 仍有稳定语义
- error handling 仍不会吞掉 `GraphBubbleUp`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_permission_contract.py -q
```

- [ ] **Step 3: 在 middleware builder 中引入 contract-aware 运行时层**

要求：
- 不重写 LangGraph 工具执行入口
- 保持 middleware / ToolNode / `Command` 为第一承载点
- GuardrailMiddleware 和 ToolErrorHandlingMiddleware 角色升级为 contract adapter

- [ ] **Step 4: 运行 permission contract 测试**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_permission_contract.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py \
  backend/packages/harness/nion/guardrails/middleware.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/tests/test_tool_runtime_permission_contract.py
git commit -m "feat(tool-runtime): align middleware with runtime contract"
```

## Task 6: 把 deferred tools 正式并入 Tool Runtime Contract

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/tool_search.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_tool_runtime_deferred_tools.py`

- [ ] **Step 1: 写失败测试，锁定 active/deferred visibility 行为**

测试至少覆盖：
- deferred tools 不进入 bind_tools
- `tool_search` 能发现 deferred tools
- catalog visibility 与 deferred registry 一致

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_deferred_tools.py -q
```

- [ ] **Step 3: 把 deferred discoverability 定义为 contract 正式能力**

要求：
- `tool_search` 不再只是孤立小系统
- `DeferredToolFilterMiddleware` 成为 visibility stage 的实现件

- [ ] **Step 4: 运行 deferred tools 测试**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_tool_runtime_deferred_tools.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py \
  backend/packages/harness/nion/tools/builtins/tool_search.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/tests/test_tool_runtime_deferred_tools.py
git commit -m "feat(tool-runtime): formalize deferred tool contract"
```

## Task 7: 建立 Hook Event Plane 核心模型

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/hooks/event_models.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_schema.py`

- [ ] **Step 1: 写失败测试，锁定 HookEvent / HookExecutionMode / HookInput / HookResult 基本形态**

测试至少覆盖：
- `HookEvent`
- `HookExecutionMode`
- `HookInput.payload`
- `HookResult.permission_behavior`
- `HookResult.continue_execution`

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_schema.py -q
```

- [ ] **Step 3: 实现 hook 事件核心模型**

要求：
- 不直接实现 dispatcher
- 先立统一 schema

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_schema.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/hooks/event_models.py \
  backend/tests/test_hook_event_plane_schema.py
git commit -m "feat(hooks): add hook event plane schema"
```

## Task 8: 实现 In-Runtime / Out-of-Runtime Hook Dispatcher

**Files:**
- Create: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/hooks/dispatcher.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_in_runtime.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_out_of_runtime.py`

- [ ] **Step 1: 写失败测试，锁定两类 dispatcher 的边界**

测试至少覆盖：
- in-runtime 可返回 `updated_input`
- in-runtime 可返回 `permission_behavior`
- in-runtime 可阻止继续执行
- out-of-runtime 不污染当前模型执行流

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_in_runtime.py tests/test_hook_event_plane_out_of_runtime.py -q
```

- [ ] **Step 3: 实现最小 dispatcher**

要求：
- 先实现框架与 contract 边界
- 不在这一轮引入完整 plugin/skill hook 来源

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_in_runtime.py tests/test_hook_event_plane_out_of_runtime.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/hooks/dispatcher.py \
  backend/tests/test_hook_event_plane_in_runtime.py \
  backend/tests/test_hook_event_plane_out_of_runtime.py
git commit -m "feat(hooks): add runtime and out-of-runtime dispatchers"
```

## Task 9: 把现有 Guardrail / Clarification / Tool Error Handling 收编进 Hook Event Plane

**Files:**
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/guardrails/middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/clarification_middleware.py`
- Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_langgraph_integration.py`
- Test: `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_hook_event_plane_regression.py`

- [ ] **Step 1: 写失败测试，锁定现有行为迁移后不回退**

测试至少覆盖：
- clarification 仍可中断执行
- permission request 仍可生成审批流程
- denied / tool failure 仍能被标准处理
- `GraphBubbleUp` 不被错误吞掉

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_langgraph_integration.py tests/test_hook_event_plane_regression.py -q
```

- [ ] **Step 3: 按 event plane 重构现有逻辑**

要求：
- `GuardrailMiddleware` 成为 permission-related hook adapter
- `ClarificationMiddleware` 成为 user-prompt/interrupt adapter
- `ToolErrorHandlingMiddleware` 成为 failure hook adapter

- [ ] **Step 4: 运行 LangGraph 集成测试**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest tests/test_hook_event_plane_langgraph_integration.py tests/test_hook_event_plane_regression.py -q
```

- [ ] **Step 5: Commit**

```bash
git add backend/packages/harness/nion/guardrails/middleware.py \
  backend/packages/harness/nion/agents/middlewares/clarification_middleware.py \
  backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py \
  backend/tests/test_hook_event_plane_langgraph_integration.py \
  backend/tests/test_hook_event_plane_regression.py
git commit -m "feat(hooks): align existing middleware with hook event plane"
```

## Task 10: P0 整体验收与补丁式实现自检

**Files:**
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-prompt-runtime-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-tool-runtime-contract-design.md`
- Review only: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-hook-event-plane-design.md`

- [ ] **Step 1: 运行 P0 相关测试套件**

Run:

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/backend
uv run pytest \
  tests/test_prompt_runtime_sections.py \
  tests/test_prompt_runtime_assembler.py \
  tests/test_prompt_runtime_profiles.py \
  tests/test_tool_runtime_pipeline.py \
  tests/test_tool_runtime_permission_contract.py \
  tests/test_tool_runtime_deferred_tools.py \
  tests/test_hook_event_plane_schema.py \
  tests/test_hook_event_plane_in_runtime.py \
  tests/test_hook_event_plane_out_of_runtime.py \
  tests/test_hook_event_plane_langgraph_integration.py \
  tests/test_hook_event_plane_regression.py -q
```

- [ ] **Step 2: 做补丁式实现自检**

检查项：

- Prompt Runtime 是否仍靠单体模板主导
- Tool Runtime 是否仍依赖多个彼此无感知的 middleware 特例
- Hook Event Plane 是否只是给旧逻辑套了一层名字，没有统一事件模型
- 是否出现绕开 LangGraph 平行重做 state / interrupt / command control flow 的实现

如果任一项成立，继续重构后再进入最终提交。

- [ ] **Step 3: 提交最终 P0 落地结果**

```bash
git add backend/packages/harness/nion/prompt_runtime \
  backend/packages/harness/nion/tools/runtime_models.py \
  backend/packages/harness/nion/tools/catalog.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/packages/harness/nion/hooks \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py \
  backend/packages/harness/nion/guardrails/middleware.py \
  backend/packages/harness/nion/agents/middlewares/clarification_middleware.py \
  backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py \
  backend/packages/harness/nion/tools/builtins/tool_search.py \
  backend/tests/test_prompt_runtime_sections.py \
  backend/tests/test_prompt_runtime_assembler.py \
  backend/tests/test_prompt_runtime_profiles.py \
  backend/tests/test_tool_runtime_pipeline.py \
  backend/tests/test_tool_runtime_permission_contract.py \
  backend/tests/test_tool_runtime_deferred_tools.py \
  backend/tests/test_hook_event_plane_schema.py \
  backend/tests/test_hook_event_plane_in_runtime.py \
  backend/tests/test_hook_event_plane_out_of_runtime.py \
  backend/tests/test_hook_event_plane_langgraph_integration.py \
  backend/tests/test_hook_event_plane_regression.py \
  docs/superpowers/plans/2026-04-01-p0-runtime-backbone-implementation-plan.md
git commit -m "feat(runtime): implement p0 runtime backbone"
```

## Self-Review

在开始执行前，先检查这份计划是否满足：

1. 覆盖了 3 份 P0 设计稿的关键要求
2. 没有 placeholder 式步骤
3. 没有要求平行重造 LangGraph 基础设施
4. 所有步骤都有明确测试与提交点

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-01-p0-runtime-backbone-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
