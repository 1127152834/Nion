# Notebook / Project Bridge Actions Design

## 背景

在 `Knowledge / Work Object Model` 已经定义 `Memory / Notebook / Project` 三者职责之后，下一步必须把它们之间的桥接动作正式定义出来。

原因很简单：

- 没有 bridge actions，`Notebook / Project / Memory` 只是三组并列对象
- 没有 bridge contract，后续 Notebook 2.0 / Projects 2.0 很容易通过页面按钮继续偷偷实现跨对象副作用
- 没有 provenance，所有提炼、导出、生成动作都会变成黑箱

当前 Nion 已经存在一些 bridge-like 能力：

- Notebook 支持从聊天导入内容
- Notebook assistant 支持对当前 note 进行 rewrite / apply / cancel
- Project 完成链路已有 `extract_long_term_memory`、`extract_skill` 决策入口
- Project 已有 `project_memory_summary`

这些说明 bridge 的需求是存在的，但还没有被定义成统一 contract。

## 目标

定义 Notebook / Project 之间的正式 bridge actions，并明确：

- 每个 bridge action 的目标
- 输入对象
- 输出对象
- 默认是否只生成 draft / candidate
- 是否需要用户确认
- provenance 怎么记录
- 哪些动作允许自动执行，哪些必须 explicit confirm

## 非目标

这份设计不处理下面这些内容：

- Notebook 2.0 检索和 UI
- Projects 2.0 dashboard 改版
- global Memory provider 演进
- SkillTool 执行协议
- Hook Event Plane 内部实现

这份设计只定义 bridge actions contract。

## 设计原则

### 1. Bridge action 必须是显式动作

不能再出现“某个页面交互顺手把内容写进另一个对象”这种隐式副作用。

### 2. Draft-first 优先

绝大多数 bridge action，默认先生成：

- `candidate`
- `draft`
- `suggestion`

而不是直接写入目标对象。

### 3. Notebook 用户资产边界优先

凡是会写入 Notebook 正文的动作，都默认需要用户确认，除非用户显式授权某种自动化策略。

### 4. Project 可承载更多自动化，但仍需要 provenance

Project 是长期工作容器，可以承载更多 agent 自动推进，但任何提炼/导出/升级动作都必须能追溯来源。

### 5. 先定义对象间动作，再定义 UI

按钮、菜单、快捷入口都只是这些 bridge actions 的产品表层，不应倒过来由 UI 定义行为。

## Bridge Action 分类

建议按 4 类来组织：

### A. 生成类

从一个对象生成另一个对象的候选内容。

例如：

- 从笔记生成项目草案
- 从项目生成笔记草稿
- 从项目生成 memory candidate

### B. 提炼类

从已有对象中抽取更高密度的知识或约束。

例如：

- 从 Project Memory 提炼到 global Memory
- 从多个 notes 提炼成项目约束

### C. 绑定类

把一个对象与另一个对象建立显式引用关系。

例如：

- note 绑定到 project 作为 reference
- project artifact 绑定到 notebook note 作为来源

### D. 导出类

把一个对象中已经整理好的内容显式导出为另一个对象中的草稿或记录。

例如：

- 项目复盘导出为 notebook note draft
- 项目总结导出为 shareable report artifact

## 正式 Bridge Actions

下面这批是当前最值得正式定义的 bridge action。

## 1. Notebook -> Project

### 1.1 `create_project_from_notebook`

作用：

- 以一篇或多篇笔记为输入，创建一个新的 Project 草案

输入：

- note ids
- optional note fragment ids
- create mode

输出：

- `ProjectDraftCandidate`

默认策略：

- 不直接创建正式 Project
- 先产出候选：
  - `name`
  - `goal`
  - `description`
  - optional initial constraints

需要确认：

- 是

### 1.2 `create_plan_from_notebook`

作用：

- 从笔记内容提炼出某个 Project 的初始计划草案

输入：

- project id
- note ids / fragments

输出：

- `PlanDraftCandidate`

默认策略：

- 先作为 draft plan，不直接进入 running

### 1.3 `extract_constraints_from_notebook`

作用：

- 从笔记提炼约束、风险、待决问题，写入 Project 的候选上下文

输出：

- `ProjectConstraintCandidate[]`

## 2. Project -> Notebook

### 2.1 `export_project_summary_to_notebook`

作用：

- 将项目总结导出为 notebook 草稿

输入：

- project id
- scope (`current_phase` / `whole_project`)

输出：

- `NotebookDraftCandidate`

默认策略：

- 只生成草稿
- 默认需要用户确认写入

### 2.2 `export_project_retro_to_notebook`

作用：

- 将项目复盘导出为 notebook 草稿

输出：

- `NotebookDraftCandidate`

### 2.3 `export_project_decision_log_to_notebook`

作用：

- 将关键决策整理成 notebook 草稿

输出：

- `NotebookDraftCandidate`

## 3. Project -> Memory

### 3.1 `extract_long_term_memory_from_project`

作用：

- 从 project / project memory 中提炼 durable learnings、constraints、preferences

输入：

- project id
- extraction scope

输出：

- `MemoryEntryCandidate[]`

默认策略：

- 先生成 candidate
- 不直接写入 global Memory

### 3.2 `promote_project_constraint_to_memory`

作用：

- 将项目内约束升级为跨项目约束

输出：

- `MemoryEntryCandidate`

## 4. Notebook -> Memory

### 4.1 `extract_memory_from_notebook`

作用：

- 从单篇或多篇笔记中提炼 durable memory

输出：

- `MemoryEntryCandidate[]`

默认策略：

- 只提炼高稳定度内容
- 明确禁止直接写入长文档正文

## 5. Project -> SkillCandidate

### 5.1 `extract_skill_candidate_from_project`

作用：

- 从项目完成阶段提炼可复用 workflow，生成 skill candidate

输出：

- `SkillCandidateDraft`

默认策略：

- 只生成 candidate
- 不直接写入技能目录

## 6. Project / Notebook -> Reference Binding

### 6.1 `attach_notebook_note_to_project`

作用：

- 将某篇 note 显式绑定为 project reference，而不是复制内容

输出：

- `ProjectReferenceLink`

### 6.2 `attach_project_artifact_to_notebook`

作用：

- 将项目产物显式绑定为 notebook 引用来源

输出：

- `NotebookReferenceLink`

## Candidate / Draft 模型

建议引入统一候选对象模型。

### 1. NotebookDraftCandidate

```python
@dataclass(slots=True)
class NotebookDraftCandidate:
    id: str
    source_project_id: str | None
    title: str
    body: str
    target_directory: str | None
    requires_user_confirmation: bool = True
    provenance: list[ObjectProvenance]
```

### 2. ProjectDraftCandidate

```python
@dataclass(slots=True)
class ProjectDraftCandidate:
    id: str
    name: str
    goal: str
    description: str
    initial_constraints: list[str]
    provenance: list[ObjectProvenance]
```

### 3. MemoryEntryCandidate

```python
@dataclass(slots=True)
class MemoryEntryCandidate:
    id: str
    category: str
    title: str
    content: str
    confidence: float
    provenance: list[ObjectProvenance]
```

### 4. SkillCandidateDraft

```python
@dataclass(slots=True)
class SkillCandidateDraft:
    id: str
    title: str
    summary: str
    suggested_scope: str
    provenance: list[ObjectProvenance]
```

## Approval / Confirmation 规则

### 默认必须确认的动作

- 任何写入 Notebook 正文的动作
- 任何写入 global Memory 的动作
- 任何创建 SkillCandidate 并准备升级为真实 skill 的动作

### 可以系统自动执行的动作

在 future 策略允许时，下列动作可以自动执行，但仍必须留下 provenance：

- 为 Project 增加 note reference link
- 为 Project 增加 candidate constraints
- 为 Project Memory 增加阶段性提炼候选

### 默认不允许自动执行的动作

- Project 自动写 Notebook note
- Notebook 自动写 global Memory
- Project 自动写真实 skill

## Provenance 细化

所有 bridge action 产物都必须记录：

- source object
- source fragment（可选）
- bridge action name
- actor
- timestamp
- approval mode

建议扩展为：

```python
@dataclass(slots=True)
class BridgeActionProvenance:
    action_name: str
    source_objects: list[ObjectProvenance]
    initiated_by: Literal["user", "agent", "system"]
    approval_mode: Literal["required", "auto_allowed", "none"]
    created_at: str
```

## 与现有模块的映射

### Notebook assist

Notebook assist 当前主要是 note-scoped rewrite flow。

设计要求：

- 它不直接承担跨对象 bridge
- 但它可以成为 future bridge action 的内容生成器

例如：

- 生成 notebook draft candidate
- 生成 memory candidate

### Notebook import chat

当前 `import-sources(chat)` 已经是一个 bridge-like 能力。

它的角色应被重定义为：

- `Thread -> Notebook` 的显式 bridge action

### Project completion decisions

当前已存在：

- `extract_long_term_memory`
- `extract_skill`
- `complete_project`

这些应被纳入统一 bridge contract，而不是继续停留在“特殊决策类型”。

### Project memory summary

当前 `project_memory_summary` 仍然更像 projection。

后续要求：

- 它应来自正式的 project memory entries / candidate entries
- 不应再由 dashboard 自己启发式拼接

## 与 Hook Event Plane 的关系

Bridge action 的执行不等于 hook，但它们会被 Hook Event Plane 观测和治理。

建议 future 事件：

- `bridge_action_requested`
- `bridge_action_confirmed`
- `bridge_action_applied`
- `bridge_action_cancelled`

但这不是本设计的范围。

## 与 Tool Runtime / SkillTool 的关系

Bridge action 最终应能被：

- Project workflows
- Notebook assistant
- future SkillTool
- future specialist agents

共同调用。

因此它们不能写死在页面逻辑里。

## 测试方案

### 1. Bridge action schema 单元测试

覆盖点：

- candidate 模型字段完整
- approval requirement 默认值正确
- provenance 字段完整

建议文件：

- `backend/tests/test_bridge_action_candidates.py`

### 2. Bridge action contract 测试

覆盖点：

- `create_project_from_notebook`
- `create_plan_from_notebook`
- `export_project_summary_to_notebook`
- `extract_long_term_memory_from_project`
- `extract_memory_from_notebook`
- `extract_skill_candidate_from_project`

建议文件：

- `backend/tests/test_bridge_action_contracts.py`

### 3. Boundary regression 测试

覆盖点：

- Project 不自动写 Notebook
- Notebook 不自动写 global Memory
- Notebook 仍保持用户资产边界

建议文件：

- `backend/tests/test_bridge_action_boundaries.py`

### 4. Provenance 测试

覆盖点：

- 每个 candidate 都带 provenance
- approval_mode 被正确记录

建议文件：

- `backend/tests/test_bridge_action_provenance.py`

## 验收标准

### A. 动作定义验收

1. Notebook / Project / Memory 之间的高价值桥接动作被正式命名和定义
2. 所有桥接动作都不再依赖页面临时逻辑命名

### B. Boundary 验收

3. Project 自动写 Notebook 被明确禁止
4. Notebook 自动写 global Memory 被明确禁止
5. Notebook 用户资产边界被保留

### C. Candidate 验收

6. NotebookDraftCandidate / ProjectDraftCandidate / MemoryEntryCandidate / SkillCandidateDraft 具备稳定模型
7. 默认写入高风险目标对象时，先产出 candidate/draft，而不是直接落库

### D. Provenance 验收

8. 所有 bridge action 结果都带 provenance
9. 用户能理解来源、动作和 approval 状态

### E. 可扩展性验收

10. future Notebook 2.0 / Projects 2.0 可以直接消费这些 bridge action
11. future Hook Event Plane / SkillTool 可以直接挂接这些动作

## 风险与取舍

### 风险 1：把 bridge action 设计成 UI 交互

处理方式：

- 先定义 action contract
- UI 只是 action 的入口，不是行为定义者

### 风险 2：一开始就追求完全自动化

处理方式：

- 优先 draft-first
- 高风险动作默认确认

### 风险 3：过度抽象，脱离现有实现

处理方式：

- 保持和现有 Notebook import、Notebook assist、Project completion decisions 的映射

## 下一步

这份设计确认后，最合理的下一份应是：

- `Notebook 2.0 Design`

因为对象模型和 bridge action 都建立后，Notebook 才能从“页面”升级成 agent-native knowledge workspace。
