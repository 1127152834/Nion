# Projects Completion Lane + Candidate Center Integration Design

## 背景

`Object Layer Phase 2` 已经把 Candidate Center 落地到了系统里：

- `candidate lifecycle`
- `apply / dismiss / defer`
- `/api/object-candidates/*`
- global drawer + detail page
- Notebook / Projects 页面统一导向候选中心

与此同时，Projects 对象面已经具备：

- dashboard
- plans
- threads
- timeline
- decisions
- managed artifacts
- project memory summary

但现在 Projects 的“完成”仍然不够产品化。

当前问题是：

- `标记完成` 还是偏按钮语义，而不是正式收口流程
- long-term memory / skill / retro 这些高价值提炼动作还没有真正进入项目完成主链路
- Candidate Center 已经能治理 candidate，但 Projects 还没有把“项目收口”正式接入这个治理面

如果继续停在这里，Projects 还是会更像“项目状态面板”，而不是“长期工作容器”。

所以这一阶段的目标不是单独再做 Candidate Center，而是：

**把 Projects completion lane 和 Candidate Center 正式接起来。**

## 目标

为 Projects 设计一个正式的 completion lane，使项目完成不再是单个动作，而是一个 gated review flow，并把 completion 产出的 candidate 统一投递到 Candidate Center。

本阶段的目标包括：

- 项目完成前先进入 `completion_in_review`
- completion lane 按条件生成高价值 candidate
- 每个 candidate 必须被显式处理
- 根据处理结果把项目推进到：
  - `completed`
  - 或 `completed_with_followups`

## 非目标

本阶段不做：

- 独立的 completion workspace
- 多步 wizard 壳
- completion lane 内部的 candidate 编辑器
- completion 之后的 portfolio/report 产品面
- completion lane 收编 permission request / rewrite pending / generic confirm flow
- skill candidate 真正落地 skill authoring

本阶段只做：

- Projects completion lane 设计
- completion candidate generation contract
- Projects 与 Candidate Center 的状态协同

## 已确认设计前提

下面这些前提已经在对话中确认：

### 1. 入口策略

completion lane 有两个入口：

- 主入口：`标记完成`
- 次入口：项目进行中手动触发 extraction

但产品主心智仍然是：

**completion lane 主要服务项目收口。**

### 2. candidate 范围

第一版 completion lane 只产出：

- `long_term_memory candidate`
- `skill candidate`
- `notebook retro/summary draft`

### 3. UI 形态

不做 wizard，不做独立 completion workspace。

第一版只做：

- Projects dashboard 顶部主区块中的结构化 completion panel

### 4. 项目状态

项目完成态不再只有 `completed` 一种。

第一版引入：

- `completion_in_review`
- `completed_with_followups`

### 5. gating 规则

进入 `completion_in_review` 之后：

- 本轮生成的所有 candidate 必须被显式处理
- 允许处理方式：
  - `apply`
  - `dismiss`
  - `defer`

### 6. defer 对完成态的影响

如果本轮 completion candidates 中存在 defer：

- 项目进入 `completed_with_followups`

如果没有 defer：

- 项目进入 `completed`

### 7. candidate 生成策略

completion lane 不机械全生成 candidate，而是：

**按条件生成。**

### 8. 判断依据

candidate 生成判断遵循：

- 结构化对象优先
- 必要时参考最近 thread / activity 摘要
- 不直接拿原始 thread message 作为主输入

### 9. completion panel 位置

一旦项目进入 `completion_in_review`：

- Projects dashboard 顶部主区块切换成 completion lane

而不是旁边一个附属卡片。

## 总体方案

### 核心判断

这一阶段最适合采用：

**Dashboard 内嵌 gated completion lane**

而不是：

- 直接 completed 再给建议
- 或者另起一个很重的 completion workspace

### 为什么这样最合适

因为当前系统已经具备：

- Projects dashboard
- object bridge contract
- Candidate Center

现在最值钱的不是再长一个新壳，而是把这些现有中轴连起来。

## 项目状态设计

## 1. 推荐生命周期状态

Projects 生命周期建议扩为：

- `active`
- `completion_in_review`
- `completed`
- `completed_with_followups`
- `archived`
- `abandoned`

### `completion_in_review`

语义：

- 项目已经开始正式收口
- 但还没进入最终完成态
- completion lane 现在是项目主线

### `completed`

语义：

- completion lane 已完成
- 本轮 candidate 已全部显式处理
- 且没有 defer

### `completed_with_followups`

语义：

- completion lane 已完成
- 本轮 candidate 已全部显式处理
- 但存在 defer，说明还有后续工作保留

## 2. 状态流转

推荐状态流转：

- `active -> completion_in_review`
- `completion_in_review -> completed`
- `completion_in_review -> completed_with_followups`

第一版不建议支持：

- `completed -> completion_in_review`
- `completed_with_followups -> completion_in_review`

后续若需要 reopen，再单独设计。

## completion lane 结构化步骤

第一版 completion lane 固定为 4 个结构化步骤，但不做 wizard。

## Step 1: Completion Readiness

目标：

判断当前项目是否具备进入收口流程的条件。

典型检查项：

- 是否还有 running / blocked 的主计划
- 是否还有 pending decision
- 是否还有关键 artifact 风险
- 当前生命周期是否允许进入 completion review

结果：

- 不满足则阻止进入 completion lane
- 满足则进入候选生成阶段

## Step 2: Generate Completion Candidates

目标：

基于当前项目结构化状态，生成本轮需要处理的 completion candidates。

第一版候选类型：

- `long_term_memory candidate`
- `skill candidate`
- `notebook retro/summary draft`

这一步必须显式展示：

- 生成了什么
- 为什么生成
- 为什么某类没有生成

## Step 3: Review Completion Candidates

目标：

用户显式处理每个 candidate。

允许动作：

- `apply`
- `dismiss`
- `defer`

这里不要求全部 apply，但不允许“跳过不处理”。

这一步是 Projects 和 Candidate Center 正式接轨的核心。

## Step 4: Finalize Project State

目标：

根据 Step 3 的结果推进最终项目状态。

规则：

- 如果没有 defer：
  - `completed`
- 如果存在 defer：
  - `completed_with_followups`

同时记录：

- completion reviewed_at
- completion reviewed_by
- completion summary

## completion candidate 生成条件

## 1. long_term_memory candidate

建议生成条件：

- 存在足够稳定的 project memory / summary
- 存在明确 decision / constraint / learning 证据
- 这些结论具备跨项目复用价值

不生成的典型情况：

- 只有过程噪声
- 项目还没有形成稳定结论

## 2. skill candidate

建议生成条件：

- 存在明显 workflow pattern
- 至少有一个较完整的计划推进链 / 返工链 / 决策-执行-产物链
- 能归纳出以后可复用的方法

不生成的典型情况：

- 只是一次性事项
- 没形成稳定 workflow

## 3. notebook retro/summary draft

建议生成条件：

- 存在足够多可总结的 artifacts / timeline / decisions
- 项目具备文档化价值
- 当前项目状态适合输出复盘或总结

不生成的典型情况：

- 几乎没有沉淀
- 不足以支撑复盘

## 4. 判断输入来源

candidate 生成判断应遵循：

### 优先输入

- `project memory`
- `plans`
- `decisions`
- `artifacts`
- `timeline`

### 辅助输入

- 最近 thread summary
- activity summary

### 不作为主输入

- 原始 thread messages

这样可以保持 completion lane 仍然是对象层逻辑，而不是聊天文本拼接逻辑。

## completion review record

第一版建议引入结构化 completion review record：

```python
@dataclass(slots=True)
class ProjectCompletionReview:
    review_id: str
    project_id: str
    started_at: str
    reviewed_at: str | None = None
    reviewed_by: str | None = None
    candidate_ids: list[str] = field(default_factory=list)
    deferred_candidate_ids: list[str] = field(default_factory=list)
    final_state: Literal["completed", "completed_with_followups"] | None = None
    summary: str = ""
```

### 第一版价值

- completion history 可追踪
- `completed` 与 `completed_with_followups` 可解释
- 后续可以自然扩展 portfolio / review report

## Projects 与 Candidate Center 的边界

### Projects completion lane 负责

- readiness check
- completion candidate generation
- final project state transition
- completion review record

### Candidate Center 负责

- candidate review
- apply / dismiss / defer
- provenance / detail / action history

### 关键原则

Projects 不重新做 candidate review UI。

Projects 只：

- 进入 completion lane
- 展示 candidate 处理进度
- 消费 Candidate Center 的处理结果

## 产品面设计

## 1. completion panel 位置

Projects dashboard 顶部主区块。

项目进入 `completion_in_review` 后：

- 不再显示普通 next action 主区块
- 改为 completion lane 主视图

## 2. completion panel 内容

第一版顶部 panel 至少要显示：

- 当前阶段：`completion_in_review`
- readiness 结果
- 本轮生成了哪些 candidate
- 每个 candidate 当前处理状态
- 是否还有未处理 candidate
- 项目最终会进入：
  - `completed`
  - 或 `completed_with_followups`

## 3. candidate 列表表达

completion panel 里只需要展示 candidate 的：

- title
- type
- current disposition
- 跳转 Candidate Center 的入口

不在 completion panel 里做复杂详情或编辑。

## API / 状态 contract 设计

## 1. 进入 completion review

建议保留现有：

- `POST /api/projects/{project_id}/complete`

但语义升级为：

- 不是直接 completed
- 而是把项目推进到 `completion_in_review`

返回内容应包含：

- project lifecycle update
- readiness summary
- generated candidate ids

## 2. 读取 completion lane 状态

建议新增：

- `GET /api/projects/{project_id}/completion-review`

返回内容：

- readiness summary
- candidate ids
- candidate processing summary
- projected final state
- completion review record

## 3. 结束 completion review

建议新增：

- `POST /api/projects/{project_id}/completion-review/finalize`

语义：

- 检查本轮 candidate 是否都已显式处理
- 若通过，则推进：
  - `completed`
  - 或 `completed_with_followups`

## 4. 与 Candidate Center 的关系

completion lane 不需要自己的 apply API。

它只依赖：

- `/api/object-candidates/*`

来处理 candidate。

## 测试方案

## 1. completion state contract 测试

覆盖点：

- `active -> completion_in_review`
- `completion_in_review -> completed`
- `completion_in_review -> completed_with_followups`
- 未处理 candidate 时不能 finalize

建议文件：

- `backend/tests/test_projects_completion_review_contract.py`

## 2. completion candidate generation 测试

覆盖点：

- `long_term_memory candidate`
- `skill candidate`
- `notebook retro/summary draft`
- 按条件生成而不是机械全生成

建议文件：

- `backend/tests/test_projects_completion_candidate_generation.py`

## 3. Candidate Center 集成测试

覆盖点：

- completion lane 产出的 candidate 进入 Candidate Center
- Candidate Center 的 disposition 影响项目最终状态

建议文件：

- `backend/tests/test_projects_completion_candidate_center_integration.py`

## 4. frontend contract / integration 测试

覆盖点：

- completion lane 顶部主区块渲染
- 项目进入 `completion_in_review` 后 UI 切换
- candidate 列表导向 Candidate Center
- 项目最终态显示 `completed / completed_with_followups`

建议文件：

- `frontend/src/components/workspace/projects/project-completion-lane.contract.test.ts`

## 验收标准

### A. 状态验收

1. 项目完成前先进入 `completion_in_review`
2. 存在 `completed_with_followups` 正式状态

### B. completion lane 验收

3. completion lane 是 dashboard 顶部主区块，不是附属卡片
4. completion lane 不再只是“完成后建议区”

### C. candidate 验收

5. 本轮 candidate 按条件生成，而不是机械全生成
6. 本轮每个 candidate 都必须显式处理

### D. Candidate Center 集成验收

7. Projects 不复制 candidate review UI
8. candidate review 统一通过 Candidate Center

### E. 收口验收

9. 没有 defer 时进入 `completed`
10. 存在 defer 时进入 `completed_with_followups`

## 风险与取舍

### 风险 1：把 completion lane 做成事后建议区

处理方式：

- 引入 `completion_in_review`
- 不允许直接 completed

### 风险 2：把 completion lane 做成过重 wizard

处理方式：

- 第一版只做结构化 panel
- 不另起 completion workspace

### 风险 3：把 Candidate Center 的职责重新塞回 Projects

处理方式：

- Projects 只负责收口流程
- Candidate review 继续交给 Candidate Center

### 风险 4：为了流程完整而机械生成低质量 candidate

处理方式：

- 按条件生成
- 结构化对象优先

## 下一步建议

这份设计确认后，下一步最合理的是：

1. 写 `Projects Completion Lane + Candidate Center Integration Implementation Plan`
2. 再按计划执行：
   - backend completion review contract
   - projects dashboard completion panel
   - candidate center integration
