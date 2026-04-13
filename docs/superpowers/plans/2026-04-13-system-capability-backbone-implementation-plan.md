# System Capability Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让主智能体获得统一的系统能力自描述层、系统对象意图路由层，以及针对 documents / automations / models / bridges / skills / notebook 的稳定读优先能力。

**Architecture:** 这轮实现不直接追求“自治修复”，而是先把系统对象做成一等 capability objects，并让 control plane、agent tools、CLI fallback 与 prompt 规则围绕同一套对象建模。第一批范围只覆盖高频对象：`identity_document`、`soul_document`、`active_memory_document`、`automation_registry`、`model_catalog`、`bridge_status`、`skill_registry`、`notebook_registry`。

**Tech Stack:** Python 3.12, FastAPI, Pydantic, LangChain tools, Nion control plane, TypeScript contract tests, pytest

---

## Scope Check

这份计划只覆盖 **“助手先知道系统里有什么”**，不直接进入自治修复。

In scope:

- system object registry
- capability object schema
- first-batch agent tools
- prompt read-first routing rule
- CLI mapping design hooks

Out of scope:

- automatic remediation
- incident playbook execution
- full autonomous repair loop

---

## Read This First

- [2026-04-13-system-capability-backbone-design.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-13-system-capability-backbone-design.md)
- [control_plane_tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/control_plane_tools.py)
- [tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py)
- [extensions.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_sections/extensions.py)
- [core.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/prompt_sections/core.py)
- [system_capability_catalog.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/system_capability_catalog.py)

---

## File Map

### Backend capability backbone

- Create: `backend/packages/harness/nion/capability_backbone/models.py`
- Create: `backend/packages/harness/nion/capability_backbone/registry.py`
- Create: `backend/packages/harness/nion/capability_backbone/intent_router.py`
- Modify: `backend/packages/harness/nion/system_capability_catalog.py`
- Modify: `backend/packages/harness/nion/capability_bridge_actions.py`

### Agent tools

- Create: `backend/packages/harness/nion/tools/builtins/capability_query_tools.py`
- Create: `backend/packages/harness/nion/tools/builtins/context_document_tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`

### Prompt/runtime

- Modify: `backend/packages/harness/nion/prompt_sections/extensions.py`
- Modify: `backend/packages/harness/nion/prompt_sections/core.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`

### Tests

- Create: `backend/tests/test_capability_backbone_registry.py`
- Create: `backend/tests/test_capability_intent_router.py`
- Create: `backend/tests/test_context_document_tools.py`
- Create: `backend/tests/test_capability_query_tools.py`
- Modify: `backend/tests/test_prompt_runtime_profiles.py`
- Modify: `backend/tests/test_tool_search.py`

---

## Task 1: Freeze first-batch system objects in tests

**Files:**
- Create: `backend/tests/test_capability_backbone_registry.py`
- Create: `backend/tests/test_capability_intent_router.py`

- [ ] **Step 1: Write failing tests for the first-batch capability objects**

```python
def test_capability_registry_includes_first_batch_system_objects():
    from nion.capability_backbone.registry import build_system_object_registry

    registry = build_system_object_registry()
    ids = {item["id"] for item in registry}

    assert "identity_document" in ids
    assert "soul_document" in ids
    assert "active_memory_document" in ids
    assert "automation_registry" in ids
    assert "model_catalog" in ids
    assert "bridge_status" in ids
    assert "skill_registry" in ids
```

- [ ] **Step 2: Write failing tests for alias routing**

```python
def test_intent_router_maps_common_aliases_to_system_objects():
    from nion.capability_backbone.intent_router import route_system_object_intent

    assert route_system_object_intent("帮我改一下 identify") == "identity_document"
    assert route_system_object_intent("帮我改一下 soul") == "soul_document"
    assert route_system_object_intent("现在有哪些模型") == "model_catalog"
    assert route_system_object_intent("现在有多少桥接在线") == "bridge_status"
    assert route_system_object_intent("帮我新增一个定时任务") == "automation_registry"
```

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_capability_backbone_registry.py \
  backend/tests/test_capability_intent_router.py -q
```

Expected:

- FAIL because registry and intent router do not exist yet

- [ ] **Step 4: Commit**

```bash
git add \
  backend/tests/test_capability_backbone_registry.py \
  backend/tests/test_capability_intent_router.py
git commit -m "test: freeze first-batch system capability objects"
```

---

## Task 2: Build the capability registry and alias router

**Files:**
- Create: `backend/packages/harness/nion/capability_backbone/models.py`
- Create: `backend/packages/harness/nion/capability_backbone/registry.py`
- Create: `backend/packages/harness/nion/capability_backbone/intent_router.py`
- Modify: `backend/tests/test_capability_backbone_registry.py`
- Modify: `backend/tests/test_capability_intent_router.py`

- [ ] **Step 1: Implement the capability object schema**

```python
class SystemCapabilityObject(BaseModel):
    kind: str
    id: str
    label: str
    status: str = "available"
    actions: list[str] = Field(default_factory=list)
    query_tool: str | None = None
    mutation_tool: str | None = None
    cli_command: str | None = None
    aliases: list[str] = Field(default_factory=list)
    description: str = ""
```

- [ ] **Step 2: Implement the first-batch registry**

```python
def build_system_object_registry() -> list[dict]:
    return [
        {"kind": "document", "id": "identity_document", "label": "Identity 文档", ...},
        {"kind": "document", "id": "soul_document", "label": "Soul 文档", ...},
        {"kind": "system_status", "id": "model_catalog", "label": "模型目录", ...},
    ]
```

- [ ] **Step 3: Implement the alias router**

```python
def route_system_object_intent(text: str) -> str | None:
    normalized = text.lower()
    for obj in build_system_object_registry():
        if any(alias in normalized for alias in obj["aliases"]):
            return obj["id"]
    return None
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_capability_backbone_registry.py \
  backend/tests/test_capability_intent_router.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/capability_backbone \
  backend/tests/test_capability_backbone_registry.py \
  backend/tests/test_capability_intent_router.py
git commit -m "feat: add system capability registry and alias intent router"
```

---

## Task 3: Expose first-batch capability query tools

**Files:**
- Create: `backend/packages/harness/nion/tools/builtins/capability_query_tools.py`
- Create: `backend/packages/harness/nion/tools/builtins/context_document_tools.py`
- Modify: `backend/packages/harness/nion/tools/builtins/__init__.py`
- Modify: `backend/packages/harness/nion/tools/tools.py`
- Create: `backend/tests/test_capability_query_tools.py`
- Create: `backend/tests/test_context_document_tools.py`

- [ ] **Step 1: Write failing tests for document and status tools**

```python
def test_document_tool_descriptions_include_common_aliases():
    from nion.tools.builtins.context_document_tools import read_identity_document_tool

    assert "identify" in read_identity_document_tool.description.lower()
    assert "身份" in read_identity_document_tool.description
```

- [ ] **Step 2: Implement document tools**

```python
@tool("read_identity_document", parse_docstring=True)
def read_identity_document_tool() -> str:
    \"\"\"Read the current IDENTITY.md document.

    Args:
        None
    \"\"\"
    return IdentityDocumentStore(get_paths().base_dir).read()
```

- [ ] **Step 3: Implement status query tools**

```python
@tool("get_model_catalog", parse_docstring=True)
def get_model_catalog_tool() -> str:
    return json.dumps(get_model_registry_service().list_runtime_models(), ensure_ascii=False, indent=2)
```

- [ ] **Step 4: Register tools in builtin surface**

```python
BASE_BUILTIN_TOOLS = [
    ...,
    read_identity_document_tool,
    write_identity_document_tool,
    read_soul_document_tool,
    write_soul_document_tool,
    get_model_catalog_tool,
]
```

- [ ] **Step 5: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_context_document_tools.py \
  backend/tests/test_capability_query_tools.py \
  backend/tests/test_tool_search.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add \
  backend/packages/harness/nion/tools/builtins/capability_query_tools.py \
  backend/packages/harness/nion/tools/builtins/context_document_tools.py \
  backend/packages/harness/nion/tools/builtins/__init__.py \
  backend/packages/harness/nion/tools/tools.py \
  backend/tests/test_context_document_tools.py \
  backend/tests/test_capability_query_tools.py
git commit -m "feat: expose first-batch system capability tools"
```

---

## Task 4: Inject system-object routing into the prompt

**Files:**
- Modify: `backend/packages/harness/nion/prompt_sections/core.py`
- Modify: `backend/packages/harness/nion/prompt_sections/extensions.py`
- Modify: `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- Modify: `backend/tests/test_prompt_runtime_profiles.py`
- Modify: `backend/tests/test_prompt_runtime_assembler.py`

- [ ] **Step 1: Add failing prompt tests for read-first routing**

```python
def test_prompt_includes_system_object_routing_guidance():
    prompt = apply_prompt_template(agent_name="default")
    assert "identity / identify / 身份 / 身份文件 / IDENTITY.md" in prompt
    assert "first call read_identity_document" in prompt
```

- [ ] **Step 2: Add a dedicated prompt section**

```python
SYSTEM_OBJECT_ROUTING_SECTION = \"\"\"<system-object-routing>
If the user mentions identity / identify / 身份 / 身份文件 / IDENTITY.md,
first call read_identity_document.
...
</system-object-routing>\"\"\"
```

- [ ] **Step 3: Weaken generic clarification precedence for known system objects**

```python
lines.append("- If the request clearly targets a known system object, read the object first and only ask for clarification after that read if a real gap remains.")
```

- [ ] **Step 4: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_prompt_runtime_profiles.py \
  backend/tests/test_prompt_runtime_assembler.py -q
```

Expected:

- PASS

- [ ] **Step 5: Commit**

```bash
git add \
  backend/packages/harness/nion/prompt_sections/core.py \
  backend/packages/harness/nion/prompt_sections/extensions.py \
  backend/packages/harness/nion/agents/lead_agent/prompt.py \
  backend/tests/test_prompt_runtime_profiles.py \
  backend/tests/test_prompt_runtime_assembler.py
git commit -m "feat: add read-first routing for known system objects"
```

---

## Task 5: Extend the capability catalog to include system objects and CLI mappings

**Files:**
- Modify: `backend/packages/harness/nion/system_capability_catalog.py`
- Modify: `backend/packages/harness/nion/capability_bridge_actions.py`
- Modify: `backend/tests/test_capability_query_tools.py`

- [ ] **Step 1: Add failing tests for system object metadata**

```python
def test_capability_catalog_lists_document_and_status_objects():
    payload = json.loads(get_capability_catalog_tool.invoke({}))
    object_ids = {item["id"] for item in payload["objects"]}
    assert "identity_document" in object_ids
    assert "soul_document" in object_ids
    assert "model_catalog" in object_ids
```

- [ ] **Step 2: Extend catalog output**

```python
return {
    ...,
    "objects": build_capability_objects(...),
    "system_objects": build_system_object_registry(),
}
```

- [ ] **Step 3: Run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_capability_query_tools.py \
  backend/tests/test_tool_search.py -q
```

Expected:

- PASS

- [ ] **Step 4: Commit**

```bash
git add \
  backend/packages/harness/nion/system_capability_catalog.py \
  backend/packages/harness/nion/capability_bridge_actions.py \
  backend/tests/test_capability_query_tools.py
git commit -m "feat: publish system objects through the capability catalog"
```

---

## Task 6: Final verification and docs sync

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`

- [ ] **Step 1: Update docs to describe the delivered backbone**

```md
- 主智能体现在拥有 first-batch system capability objects
- documents / models / bridges / skills / automations 可以通过统一查询面发现
- 已知系统对象采用 read-first routing，而不是直接 ask_clarification
```

- [ ] **Step 2: Run focused verification**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_capability_backbone_registry.py \
  backend/tests/test_capability_intent_router.py \
  backend/tests/test_context_document_tools.py \
  backend/tests/test_capability_query_tools.py \
  backend/tests/test_prompt_runtime_profiles.py \
  backend/tests/test_prompt_runtime_assembler.py \
  backend/tests/test_tool_search.py -q
```

Expected:

- PASS

- [ ] **Step 3: Commit**

```bash
git add README.md backend/CLAUDE.md docs/test/README.md
git commit -m "docs: sync system capability backbone behavior"
```

---

## Self-Review

### Spec coverage

- 统一 capability objects：Task 1, 2, 5
- intent router：Task 1, 2, 4
- CLI / tool 映射：Task 3, 5
- read-first routing：Task 4
- first-batch system objects：Task 1-6

### Placeholder scan

- 没有 `TODO` / `TBD`
- 每个任务都给了文件路径、测试、命令和期望

### Type consistency

- object ids 统一使用：
  - `identity_document`
  - `soul_document`
  - `active_memory_document`
  - `model_catalog`
  - `bridge_status`
  - `automation_registry`
  - `skill_registry`
  - `notebook_registry`

---

Plan complete and saved to `docs/superpowers/plans/2026-04-13-system-capability-backbone-implementation-plan.md`. Two execution options:

1. Subagent-Driven (recommended) - I dispatch a fresh subagent per task, review between tasks, fast iteration
2. Inline Execution - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
