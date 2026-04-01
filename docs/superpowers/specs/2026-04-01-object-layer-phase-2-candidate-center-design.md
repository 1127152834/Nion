# Object Layer Phase 2 Candidate Center Design

## 背景

`Object Layer Phase 1` 已经把 `Project / Notebook / Memory` 之间的 object bridge 基础能力落地到了主分支：

- `object_bridges` domain model
- candidate / reference persistence
- `/api/notebook/bridge/*` 与 `/api/projects/{project_id}/bridge/*`
- Notebook / Projects 页面中的最小 candidate generation 入口

这意味着 Nion 已经具备：

- 从 Notebook 生成 project draft candidate
- 从 Notebook 提炼 memory candidate
- 从 Project 导出 notebook draft candidate
- 从 Project 提炼 memory / skill candidate
- 显式建立 project ↔ notebook reference

但当前系统仍然停在“candidate 能生成”的阶段，还没有进入“candidate 能被产品化治理”的阶段。

当前缺口主要有四个：

1. candidate 缺少正式的生命周期管理
2. 缺少统一的 review / apply / dismiss / defer contract
3. 缺少统一的 review surface
4. provenance 与 reference 虽然有数据，但还没有正式的产品投影

这会直接导致后续风险：

- Notebook 自己长一套确认 UI
- Projects 自己长一套确认 UI
- completion lane 再长第三套
- agent runtime / future SkillTool 再走第四套隐式内部接口

如果不先补 `Phase 2`，`Phase 1` 很容易退化成“多了几个 bridge 按钮”，而不是稳定的对象层治理底座。

## 目标

把 `candidate-first` 从“生成机制”升级成“产品级治理机制”，形成一套正式的 Candidate Center 设计，满足：

- candidate 生命周期清晰
- review / apply / dismiss / defer 有统一 contract
- Notebook / Projects / future completion lane 共用一套 review surface
- provenance / target / side effects 可解释
- 后续可扩展到 agent runtime 与更广义的待确认中心

## 非目标

本阶段不做：

- Notebook 2.0 全量检索 / 多视图
- Projects 2.0 全量 dashboard / completion lane 全量 UI
- global Memory provider 演进
- SkillTool 真正的 authoring / publish flow
- plugin / MCP
- 通用 permission request center
- Notebook rewrite pending flow 收编进候选中心

本阶段只做：

- Candidate Center contract
- Bridge Review Center 产品面设计
- object bridge candidate 的 review / apply / dismiss / defer 治理

## 设计前提

下面这些前提已经在本轮设计对话中确认：

### 1. 产品形态

Candidate Center 采用双形态：

- 平时是全局抽屉 / 收件箱
- 复杂候选进入独立详情页

### 2. 范围策略

第一版只接：

- object bridge candidates

但数据模型从一开始按“通用候选中心”设计，后续可以接入：

- completion lane extraction suggestions
- agent-generated candidates
- future higher-level confirmation flows

### 3. 交互深度

第一版不允许在候选中心内编辑 candidate。

用户只能：

- 查看
- apply
- dismiss
- defer

不把 Candidate Center 做成第二套 Notebook / Project 编辑器。

### 4. 确认语义

Candidate Center 本身就是确认面。

因此：

- 用户进入中心
- 打开候选
- 点击 `apply`

这一下就算最终确认，不再统一弹第二层确认框。

## 总体判断

`Phase 2` 最重要的不是“再做一个页面”，而是：

**把 object bridge candidate 的生成、审查、应用、拒绝、延期和过期，正式变成一条统一治理链。**

这条治理链未来将成为：

- Notebook / Projects 的对象层确认主链路
- completion lane 的提炼确认主链路
- agent runtime 候选输出的治理主链路

## 产品命名

为了避免和 desktop bridge / message bridge 混淆，产品层建议使用：

- 中文产品名：`候选中心`
- 技术/设计内部别名：`Bridge Review Center`
- 后端 contract 名：`object-candidates`

本设计后续统一使用：

- 产品层：候选中心
- contract 层：Candidate Center / object-candidates

## 架构定位

Candidate Center 不是新的一级对象域。

它是一个横切的治理层，位于：

```text
Notebook / Project / Memory bridge generation
        ↓
Bridge Candidate Record
        ↓
Candidate Center Contract
  ├─ list
  ├─ detail
  ├─ apply
  ├─ dismiss
  └─ defer
        ↓
Candidate Center Surface
  ├─ global drawer
  └─ detail page
```

关键定位：

- Notebook / Projects 负责生成 candidate
- Candidate Center 负责治理 candidate
- apply handler 负责 type-specific 落地

## 生命周期设计

## 1. 生命周期状态

第一版统一使用下面 5 个状态：

- `draft`
- `ready`
- `applied`
- `dismissed`
- `expired`

### `draft`

候选刚生成，还处于内部过渡态。

语义：

- 还未完成 review projection
- 还未做最小目标 guard 检查
- 默认不直接暴露给用户

### `ready`

候选已经可以被用户审查和操作。

语义：

- 可以进入候选中心列表
- 可以执行 `apply / dismiss / defer`
- 是第一版最主要的用户态

### `applied`

候选已经成功落地到目标对象。

语义：

- 是终态
- 但不能删除记录
- 必须保留 provenance、action history 和 applied target link

### `dismissed`

候选被用户显式拒绝。

语义：

- 是终态
- 必须保留 terminal reason
- 不等于“系统没处理”

### `expired`

候选因为上下文失效而不再适用。

语义：

- 是终态
- 通常由 guard 失败触发
- 不是用户拒绝

## 2. defer 不是生命周期状态

`defer` 第一版不单独建生命周期状态。

原因：

- 否则状态机会迅速膨胀成 `deferred / reopened / waiting / seen`
- defer 本质上是队列管理，不是对象语义变化

因此 `defer` 只更新这些字段：

- `deferred_until`
- `deferred_reason`

但 candidate 仍然保持 `ready`。

## 3. 推荐状态流转

第一版支持：

- `draft -> ready`
- `ready -> applied`
- `ready -> dismissed`
- `ready -> expired`
- `draft -> expired`

不支持：

- `applied -> ready`
- `dismissed -> ready`
- `expired -> ready`

也就是说，第一版不做 reopen。

## 4. 第一版产品显示规则

全局抽屉默认显示：

- `ready`
- 且未 defer 或 defer 已到期的候选

详情页允许查看：

- `ready`
- `applied`
- `dismissed`
- `expired`

### 为什么 `draft` 不显示

因为第一版的 `draft` 是内部态，不是用户主状态。

更稳妥的策略是：

- candidate 生成成功后尽快推进到 `ready`
- 用户永远主要面向 `ready` 工作

## 数据模型设计

## 1. 通用 Candidate Record 扩展

`Phase 1` 的 `BridgeCandidateRecord` 还偏“生成态”。

`Phase 2` 建议把它扩成“可治理态”。

建议增加：

```python
@dataclass(slots=True)
class BridgeCandidateRecord:
    id: str
    candidate_type: BridgeCandidateType
    status: BridgeCandidateStatus
    title: str
    summary: str
    requires_confirmation: bool
    payload: dict[str, Any]
    provenance: list[BridgeActionProvenance]

    source_object_type: str | None = None
    source_object_id: str | None = None
    target_object_type: str | None = None
    target_object_id: str | None = None

    risk_level: Literal["low", "medium", "high"] = "medium"
    available_actions: list[str] = field(default_factory=list)

    deferred_until: str | None = None
    deferred_reason: str | None = None

    reviewed_at: str | None = None
    reviewed_by: Literal["user", "agent", "system"] | None = None

    applied_at: str | None = None
    applied_by: Literal["user", "agent", "system"] | None = None

    terminal_reason: str | None = None
    guard_state: dict[str, Any] = field(default_factory=dict)
    last_error: str | None = None

    created_at: str = ""
    updated_at: str = ""
```

这不是为了字段越多越好，而是为了把：

- 候选是什么
- 候选现在处于什么治理阶段
- 候选还能不能被安全应用

区分清楚。

## 2. source / target 投影对象

候选中心列表和详情页不应该直接从 `payload` 临时拼文案。

建议引入标准投影对象：

```python
@dataclass(slots=True)
class CandidateSourceSummary:
    object_type: str
    object_id: str
    title: str
    fragment_count: int = 0
    action_name: str = ""


@dataclass(slots=True)
class CandidateTargetSummary:
    object_type: str
    object_id: str | None
    title: str
    side_effect_summary: str
```

### 目的

- 抽屉列表能稳定展示
- UI 不必按 candidate 类型分散拼文案
- future completion lane / runtime-generated candidate 也能复用

## 3. action history

第一版应显式持久化候选动作历史。

建议最小模型：

```python
@dataclass(slots=True)
class CandidateActionEvent:
    event_id: str
    candidate_id: str
    action: Literal[
        "candidate_created",
        "candidate_ready",
        "candidate_deferred",
        "candidate_applied",
        "candidate_dismissed",
        "candidate_expired",
    ]
    actor_type: Literal["user", "agent", "system"]
    reason: str | None = None
    detail: dict[str, Any] = field(default_factory=dict)
    created_at: str = ""
```

### 第一版价值

- 详情页能显示动作历史
- 后续能接 Hook Event Plane / Activity Layer
- 能回答“这个候选是怎么走到今天这个状态的”

## Guard 设计

## 1. 目标

candidate 从生成到应用之间，来源和目标都可能变化。

因此 `apply` 前必须有一层 guard。

## 2. 最小 guard 模型

```python
{
  "is_applicable": true,
  "reasons": [],
  "checked_at": "..."
}
```

## 3. 典型 guard 失败场景

- Notebook 来源内容已经变化太大
- Project 阶段已经切换
- target directory 不存在
- 关联 project memory entry 已删除
- candidate 已经被应用或已终态

## 4. guard 和过期的关系

不是所有 guard 失败都立刻把 candidate 设为 `expired`。

建议区分两类：

### 结构性失效

例如：

- 来源对象已不存在
- 目标 guard 永久不满足
- 当前 candidate 版本不再可信

这种可以推进到：

- `expired`

### 执行性失败

例如：

- 服务异常
- IO 异常
- downstream persistence 失败

这种不应直接 `expired`，而应该：

- 保持 `ready`
- 写入 `last_error`
- 支持重试

## Review / Apply Contract

## 1. 生成接口保留对象资源面

`Phase 2` 不推翻 `Phase 1` 的生成路径。

也就是说，candidate 生成仍然继续挂在：

- `/api/notebook/bridge/*`
- `/api/projects/{project_id}/bridge/*`

原因：

- 生成动作天然属于源对象
- 这层边界在 `Phase 1` 已经立住

## 2. review / apply 统一收口

`Phase 2` 新增统一 contract：

- `GET /api/object-candidates`
- `GET /api/object-candidates/{candidate_id}`
- `POST /api/object-candidates/{candidate_id}/apply`
- `POST /api/object-candidates/{candidate_id}/dismiss`
- `POST /api/object-candidates/{candidate_id}/defer`

### 核心原则

- 对象页面继续负责生成
- Candidate Center 负责治理
- type-specific 落地由 apply handler registry 负责

## 3. 列表接口

### Endpoint

`GET /api/object-candidates`

### Query 建议

- `status=ready|applied|dismissed|expired`
- `candidate_type=...`
- `source_object_type=...`
- `target_object_type=...`
- `include_deferred=true|false`

### 返回模型

建议列表项包含：

- `id`
- `candidate_type`
- `status`
- `title`
- `summary`
- `source_summary`
- `target_summary`
- `risk_level`
- `available_actions`
- `created_at`
- `deferred_until`

## 4. 详情接口

### Endpoint

`GET /api/object-candidates/{candidate_id}`

### 返回模型

详情应比列表多出：

- `payload`
- `provenance`
- `source_objects`
- `target_object`
- `side_effect_summary`
- `action_history`
- `guard_state`
- `last_error`

详情页的责任不是编辑 candidate，而是完整解释 candidate。

## 5. apply 接口

### Endpoint

`POST /api/object-candidates/{candidate_id}/apply`

### 语义

Candidate Center 本身就是确认面。

因此：

- 用户在中心点击 `apply`
- 即视为最终确认
- 不再统一弹二次确认框

### 执行步骤

1. 读取 candidate
2. 校验当前状态必须为 `ready`
3. 重新计算 `guard_state`
4. 若 guard 通过，路由到对应 apply handler
5. 成功后写入 target object
6. candidate 置为 `applied`
7. 记录 `action_history`

### 返回

建议返回：

```json
{
  "candidate": {},
  "applied_target": {},
  "applied_at": "..."
}
```

## 6. dismiss 接口

### Endpoint

`POST /api/object-candidates/{candidate_id}/dismiss`

### 请求

```json
{
  "reason": "..."
}
```

### 语义

- 显式拒绝
- 进入 `dismissed`
- 记录 `reviewed_at / reviewed_by / terminal_reason`

## 7. defer 接口

### Endpoint

`POST /api/object-candidates/{candidate_id}/defer`

### 请求

```json
{
  "deferred_until": "...",
  "reason": "..."
}
```

### 语义

- 不改变生命周期状态
- 只更新队列属性
- 记录 `candidate_deferred` action history

## 8. apply handler registry

统一 contract 背后，必须有 type-specific apply handler registry。

建议最小抽象：

```python
class CandidateApplyHandler(Protocol):
    def supports(self, candidate_type: str) -> bool: ...
    def apply(self, candidate: BridgeCandidateRecord) -> dict[str, Any]: ...
```

### 第一版 handler

- `project_draft`
- `notebook_draft`
- `memory_entry`
- `project_constraint`

### `skill_candidate`

第一版建议：

- 先不接真实 skill authoring
- 可只支持 `dismiss / defer`
- 不支持真正 `apply`

或者把它定义成：

- `apply` 只是进入“confirmed candidate retained”状态

但第一版更稳妥的是先不暴露 `apply`。

## 产品面设计

## 1. 全局抽屉

候选中心平时作为全局抽屉出现。

### 抽屉职责

- 展示待处理候选列表
- 快速 `apply / dismiss / defer`
- 跳转详情页

### 默认展示

- `ready`
- defer 已到期的候选

### 列表项信息

- 类型 badge
- 标题
- 一句话摘要
- 来源对象
- 目标对象
- 创建时间
- 快捷动作

## 2. 独立详情页

建议路由：

- `/workspace/candidates/[candidate_id]`

### 详情页职责

- 解释来源
- 解释目标
- 解释副作用
- 展示 provenance
- 展示 action history
- 承载复杂 candidate 的最终处理

### 详情页区块建议

1. 候选摘要
2. 来源链 / provenance
3. 目标对象与副作用说明
4. payload 预览
5. 动作历史
6. action bar

## 3. 对象页面与候选中心的分工

Notebook / Projects 页面只负责：

- 触发生成
- 局部成功反馈
- 提供跳转候选中心的入口

不负责：

- 完整 review
- 完整 apply
- 终态管理

这能避免对象页面重新长出旁路治理逻辑。

## 4. 第一版范围控制

Candidate Center 第一版只接：

- object bridge candidates

不接：

- Notebook rewrite pending
- permission request
- generic confirm dialogs
- completion lane extraction suggestions

但模型和 contract 从一开始按通用候选中心设计。

## 与 LangGraph / Runtime 的关系

本阶段仍然遵守“优先复用 LangGraph 承载能力，不平行重造”的原则。

### LangGraph / runtime 原生承载

- 执行流程
- state persistence
- interrupt / resume
- future agent-generated candidate flow

### Nion 自己补的 contract

- Candidate Center 领域模型
- review / apply / dismiss / defer API
- source / target / provenance projection
- candidate lifecycle rules
- guard semantics

Candidate Center 是产品层治理 contract，不是新的 orchestration engine。

## 测试方案

## 1. lifecycle contract 测试

覆盖点：

- `draft -> ready`
- `ready -> applied`
- `ready -> dismissed`
- `ready -> expired`
- `defer` 不改变生命周期状态

建议文件：

- `backend/tests/test_object_candidate_lifecycle.py`

## 2. apply contract 测试

覆盖点：

- project draft apply
- notebook draft apply
- memory candidate apply
- project constraint apply
- skill candidate 第一版不误落成真实 skill

建议文件：

- `backend/tests/test_object_candidate_apply.py`

## 3. guard / expiry 测试

覆盖点：

- 来源变化导致 expired
- 目标 guard 失效导致 expired
- 执行性失败不直接 expired

建议文件：

- `backend/tests/test_object_candidate_guards.py`

## 4. provenance / action history 测试

覆盖点：

- 所有 candidate 带 provenance
- 所有治理动作写 action history

建议文件：

- `backend/tests/test_object_candidate_audit.py`

## 5. frontend contract / integration 测试

覆盖点：

- 抽屉列表项 shape 稳定
- 详情页读取 shape 稳定
- `apply / dismiss / defer` 按钮行为稳定
- Notebook / Projects 页面只生成 candidate，不直接做 apply

建议文件：

- `frontend/src/core/object-candidates/api.test.ts`
- `frontend/src/components/workspace/candidates/*.contract.test.ts`

## 验收标准

### A. 生命周期验收

1. candidate 不再只是“生成后静置”
2. `ready / applied / dismissed / expired` 语义清晰

### B. 产品面验收

3. 存在统一候选中心，而不是对象页面各玩各的确认流
4. 轻量候选可在抽屉处理，复杂候选可在详情页处理

### C. 契约验收

5. apply / dismiss / defer 有统一 API
6. 新对象页面不再自定义 review/apply 协议

### D. 边界验收

7. 第一版仍然只处理 object bridge candidates
8. 不把候选中心做成第二套编辑器

### E. 可扩展性验收

9. completion lane 后续可复用
10. runtime / agent-generated candidate 后续可接入

## 风险与取舍

### 风险 1：UI-first 导致 review 逻辑重新散落

处理方式：

- 先定义统一 review contract
- 再让抽屉和详情页消费这套 contract

### 风险 2：候选中心被做成第二套对象编辑器

处理方式：

- 第一版明确不允许编辑 candidate
- 只做治理，不做 authoring

### 风险 3：状态机膨胀

处理方式：

- `defer` 只做队列属性
- 第一版不做 reopen / seen / archived 等额外状态

### 风险 4：过早接入所有待确认流

处理方式：

- 第一版只收 object bridge candidates
- 模型按通用候选中心设计，但范围严格收敛

## 与后续阶段的关系

这份设计完成后，对后续的作用是：

- `Notebook 2.0` 可以直接把 extraction queue / bridge candidate queue 挂到候选中心
- `Projects 2.0` 可以把 completion lane 的提炼候选挂到候选中心
- `SkillTool` 未来可以消费相同的 candidate contract
- `agent runtime` 未来可以把高价值跨对象输出也投递成 candidate

## 下一步建议

这份设计确认后，下一步最合理的是：

1. 写 `Object Layer Phase 2 Implementation Plan`
2. 再按计划实现：
   - backend candidate center contract
   - frontend drawer + detail page
   - lifecycle / apply / dismiss / defer

不建议在这之前直接开始 UI 实现。
