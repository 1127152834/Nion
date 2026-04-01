# Knowledge / Work Object Model Design

## 背景

Nion 当前已经有三个和“长期工作”密切相关的对象面：

- `Memory`
- `Notebook`
- `Project`

但它们之间还没有被正式组织成一个统一的 Knowledge / Work Object Model。

当前的真实状态更接近：

- `Memory` 是 legacy `memory.json` 主链路，主要通过 `/api/memory` 暴露
- `Notebook` 是本地优先的用户知识资产，支持 Markdown、历史、回收站、assist、聊天导入
- `Project` 是长期工作容器，已有 dashboard、plans、threads、timeline、decisions、artifacts、project memory summary

这些能力都已经存在，但对象边界和桥接关系还没有形成产品级 contract。

这会直接导致几个问题：

- Notebook、Project、Memory 的职责虽然在文档里有边界，但没有正式对象模型承载
- 用户和 agent 很难稳定判断“什么应该放哪”
- 从聊天到知识、从项目到长期记忆、从知识到项目计划，都缺少显式 bridge action
- provenance 不完整，后续 extraction / reuse / skill generation 很容易变成黑箱

如果不先设计这一层，后面继续做 Notebook 2.0 / Projects 2.0，只会继续堆页面和按钮，而不是做真正的 agent 一级对象。

## 目标

把 `Memory / Notebook / Project` 三者定义为统一 Knowledge / Work Object Model 的一级对象，并明确：

- 各自职责
- 各自 owner
- 各自读写边界
- 它们之间允许的 bridge actions
- 每次 bridge 的 provenance 和可回滚性

这层设计必须服务 Nion 的通用办公 agent 愿景，而不是 code-first 的工作流。

## 非目标

这份设计不处理下面这些内容：

- Prompt Runtime
- Tool Runtime Contract
- Hook Event Plane 的内部技术实现
- Notebook 2.0 的检索/界面细节
- Projects 2.0 的 dashboard 具体交互细节
- SkillTool 的执行协议

这份设计只负责对象层及其 bridge contract。

## 设计原则

### 1. 对象优先于页面

Notebook、Project、Memory 都不是页面模块，而是 agent 可理解、可引用、可提炼、可桥接的一级对象。

### 2. Notebook 是用户资产

这个边界必须保持不变：

- Notebook 不是 agent memory
- Notebook 不应被系统偷偷污染
- 任何将项目内容写入 Notebook 的动作都必须显式可见

### 3. Project 是长期工作容器

Project 不应被当成“更复杂的聊天页”，也不应变成 Notebook 替代品。

Project 的核心职责是：

- 目标
- 计划
- 执行
- 决策
- 产物
- 项目内记忆
- 完成后的提炼

### 4. Memory 只承载 durable facts / preferences / learnings

Memory 不应该吸收：

- 长文档正文
- 项目过程噪声
- 临时探索内容

它应该只承载跨对象、跨项目、长期稳定的信息。

### 5. 所有 bridge action 都必须显式、有来源、有副作用说明

不能出现“系统自动帮你写进 Notebook / Memory，但用户感知不到”的行为。

## 当前已确认边界

下面这些是现有文档和实现中已经明确的事实：

- Notebook 是用户资产，不是 agent memory，[README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/README.md#L63)
- Project is not a Notebook replacement and must not auto-write Notebook，[backend/CLAUDE.md](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md#L138)
- Project 模块当前已经有 `project memory summaries`，但这是 project object 内部能力，不等于全局 memory，[backend/CLAUDE.md](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md#L133)
- Memory 当前仍是 legacy `/api/memory` 主链路，[backend/CLAUDE.md](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/CLAUDE.md#L88)
- 嵌入式会话契约里已经有 `memory_read` / `memory_write`，说明 Memory 是 runtime read/write domain，而不是页面附属能力，[README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/README.md#L24)

这些边界都不能在对象模型设计里被破坏。

## 对象模型

## 1. Memory

### 定义

Memory 是 Nion 的 durable agent memory domain。

它承载：

- 用户长期偏好
- 稳定工作习惯
- 跨项目约束
- 高价值经验
- 可长期复用的结论

### 不承载

- 笔记正文
- 长文档
- 项目执行过程日志
- 临时聊天内容
- 未确认的推断

### 建议子类

```text
Memory
  ├─ Preferences
  ├─ Stable Facts
  ├─ Cross-Project Constraints
  ├─ Reusable Learnings
  └─ Long-Term Handoff Notes
```

### owner

- primary owner: agent runtime + user
- write 权限：显式、受控
- 来源必须可追溯

## 2. Notebook

### 定义

Notebook 是用户资产型知识对象。

它承载：

- 原始笔记
- 草稿
- 资料
- 会议记录
- 引用资料
- 研究摘要
- 文档型知识整理

### 不承载

- 默认长期记忆
- 项目状态机
- 自动沉淀的 agent 噪声

### 特征

- 本地优先
- 用户显式拥有
- 可以被 agent 协助编辑，但不能被 agent 默认接管

### owner

- primary owner: user
- agent 是 assistant，不是 owner

## 3. Project

### 定义

Project 是长期工作容器型对象。

它承载：

- goal
- context
- plans
- threads
- blockers
- decisions
- managed artifacts
- project memory
- completion / extraction lane

### 不承载

- Notebook 的用户知识资产
- 全局长期偏好
- 临时未归类的知识碎片

### 特征

- 生命周期强
- execution-heavy
- 和 agent runtime 高耦合

### owner

- primary owner: user + agent runtime

## 4. Project Memory

Project Memory 不是 global Memory，也不是 Notebook。

它是 Project 的内部记忆层，承载：

- 当前项目内的约束
- 当前项目内已验证路径
- 当前项目内关键决策摘要
- 当前项目内阶段学习
- handoff 要点

它应该首先服务 project 内部推进，只有经过显式提炼，才有资格进入 global Memory。

## 对象关系

### A. Memory ↔ Notebook

默认关系：

- Notebook 可以作为 Memory 提炼来源
- Memory 不直接回写 Notebook 正文

允许的桥接：

- `Notebook -> Memory`
  - 仅限显式提炼 durable facts / preferences / learnings

### B. Notebook ↔ Project

默认关系：

- Notebook 可以为 Project 提供证据、资料、草稿、输入
- Project 可以生成 Notebook 草稿或建议笔记，但不能自动写入

允许的桥接：

- `Notebook -> Project`
  - 基于笔记创建项目
  - 从笔记生成计划草案 / 风险草案 / 决策候选
- `Project -> Notebook`
  - 显式导出复盘
  - 显式导出会议纪要
  - 显式导出方案文档

### C. Project ↔ Memory

默认关系：

- Project 内记忆先留在 Project Memory
- 只有高价值、跨项目稳定信息，才提炼到 Memory

允许的桥接：

- `Project -> Memory`
  - 项目完成后提炼 durable learnings
  - 关键约束升级为跨项目约束

### D. Project ↔ Skill

默认关系：

- 项目不会自动生成 skill
- 但完成阶段可以显式提炼 reusable workflow

允许的桥接：

- `Project -> SkillCandidate`

## Bridge Actions

所有 bridge action 都应被定义成正式动作，而不是隐式副作用。

### 1. Notebook -> Memory

动作名建议：

- `extract_memory_from_notebook`

输入：

- source note ids / note fragments
- extraction target type

输出：

- memory candidate entries

副作用：

- 不自动写入，除非用户确认或策略明确允许

### 2. Notebook -> Project

动作名建议：

- `create_project_from_notebook`
- `create_plan_from_notebook`
- `extract_risks_from_notebook`

### 3. Project -> Notebook

动作名建议：

- `export_project_note_draft`
- `export_project_retro`
- `export_project_summary`

要求：

- 生成 draft
- 不默认直接落地到用户 Notebook 正文，除非用户确认

### 4. Project -> Memory

动作名建议：

- `extract_long_term_memory_from_project`

### 5. Project -> SkillCandidate

动作名建议：

- `extract_skill_candidate_from_project`

## Provenance 设计

所有桥接动作必须携带 provenance。

建议统一字段：

```python
@dataclass(slots=True)
class ObjectProvenance:
    source_object_type: Literal["memory", "notebook", "project", "project_memory", "thread", "artifact"]
    source_object_id: str
    source_fragment_id: str | None = None
    source_action: str
    created_at: str
    created_by: Literal["user", "agent", "system"]
```

适用范围：

- memory entry
- project memory entry
- notebook draft export
- skill candidate
- decision candidate

## 对 agent runtime 的要求

对象模型必须能被 agent runtime 直接使用，而不是只给 UI 看。

因此 runtime 至少要能回答：

- 当前 thread 绑定哪个 project
- 当前可读哪些 notebook refs
- 当前 memory read / write 策略是什么
- 当前 extraction 候选来自哪里

这意味着 object model 必须能直接向 runtime 提供 context assembly contract。

## 与现有模块的映射

### 1. Memory

当前落点：

- `/api/memory`
- `nion.agents.memory.*`

设计要求：

- 暂不改 legacy 主链路
- 先在对象层定义职责边界
- 后续再考虑 provider evolution

### 2. Notebook

当前落点：

- `NotebookService`
- `NotebookAssistantService`
- notebook sidebar / editor / trash / history / import

设计要求：

- 保持“用户资产”边界
- assistant 只提供 workflow，不改变 owner 关系

### 3. Project

当前落点：

- `ProjectRepository`
- `ExecutionPlan`
- `ProjectThreadLink`
- `ProjectMemorySummary`
- `ProjectDecisionRequest`

设计要求：

- 从 dashboard projection 提升为一级对象模型
- project memory summary 不再只是展示投影，而应明确对应 project memory domain

## Notebook / Project / Memory 的强约束

### 不允许

- Project 自动偷偷写 Notebook
- Notebook 默认被当成长期记忆
- Memory 存长文档正文
- bridge action 没有 provenance
- “页面交互”直接绕过对象 contract 写入别的对象

### 必须支持

- 显式 bridge action
- draft-first export
- user-reviewable extraction
- provenance-traceable entries
- future skill extraction lane

## 测试方案

### 1. 对象模型单元测试

覆盖点：

- Memory / Notebook / Project / ProjectMemory 的职责边界被类型/contract 体现
- bridge action payload/response schema 稳定

建议文件：

- `backend/tests/test_knowledge_work_object_models.py`

### 2. Bridge action contract 测试

覆盖点：

- Notebook -> Project
- Project -> Notebook
- Project -> Memory
- Project -> SkillCandidate

建议文件：

- `backend/tests/test_object_bridge_actions.py`

### 3. Provenance 测试

覆盖点：

- 所有 extraction / export / candidate 都带 provenance

建议文件：

- `backend/tests/test_object_provenance.py`

### 4. 回归测试

覆盖点：

- Notebook 仍然是用户资产
- Project 不自动写 Notebook
- Memory 仍走 legacy 主链路

建议文件：

- `backend/tests/test_object_boundary_regression.py`

## 验收标准

### A. 边界验收

1. `Memory / Notebook / Project / ProjectMemory` 的职责被正式定义
2. Notebook 不再被隐式视作 memory
3. Project 不再被隐式视作 Notebook 替代品

### B. 桥接验收

4. Notebook -> Project / Project -> Notebook / Project -> Memory / Project -> SkillCandidate 都有正式 bridge action
5. 所有 bridge action 都是显式动作，不是隐式副作用

### C. Provenance 验收

6. 所有提炼、导出、候选对象都可追溯来源
7. 用户能理解“这条内容从哪来”

### D. Runtime 兼容验收

8. object model 能被 future runtime context assembly 直接消费
9. 不需要通过页面逻辑反推对象关系

## 风险与取舍

### 风险 1：对象层设计过于理想化

处理方式：

- 明确映射现有 Memory / Notebook / Project 实现
- 不假定本轮就改完所有存储结构

### 风险 2：过早把 provider 演进也塞进来

处理方式：

- Memory 仍保持 legacy 主链路
- 先定义对象职责，再决定存储演进

### 风险 3：把 bridge action 做成自动副作用

处理方式：

- 所有跨对象动作必须显式
- 尽量 draft-first

## 下一步

这份设计确认后，最合理的下一份应是：

- `Notebook / Project Bridge Actions Design`

或者如果你想直接往产品层推进，也可以先写：

- `Notebook 2.0 Design`
