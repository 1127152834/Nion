# Soul Governance Matrix

## 1. Purpose

这份文档是 Soul System 实施前置规格的第四篇。

它负责冻结：

- soul 各类对象的治理等级
- `AUTO / SUGGEST / CONFIRM / FORBID` 在 soul 域中的适用规则
- `proposal -> overlay -> core` 的升级边界
- 用户、系统、heartbeat 在 soul 对象上的控制权限
- soul drift / rollback 的治理规则

它**不**负责：

- soul 对象的数据字段
- soul 如何进入 runtime
- soul 如何成长
- 用户界面如何表现这些治理动作

这些分别交给：

- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- [14-soul-runtime-compilation.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/14-soul-runtime-compilation.md)
- [15-soul-growth-and-reflection-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/15-soul-growth-and-reflection-rules.md)
- `17-soul-product-interaction-model.md`

---

## 2. Inputs

本篇依赖：

- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- [14-soul-runtime-compilation.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/14-soul-runtime-compilation.md)
- [15-soul-growth-and-reflection-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/15-soul-growth-and-reflection-rules.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [08-memory-os-observability-and-risk.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/08-memory-os-observability-and-risk.md)

---

## 3. Decisions

本篇冻结以下关键决策：

1. Soul 是 Memory OS 中最保守的域之一，治理严格程度高于 `agent_self`，接近或高于 `relationship`。
2. `soul_journal` 可以高自治，但 `core_soul` 与 `active_overlay` 必须更严格。
3. `soul_proposal` 默认允许自动生成，但默认不允许自动生效。
4. `identity_narrative` 允许自动形成 draft，但不应绕过高影响人格变化的治理路径。
5. 用户拥有对 soul growth 的反馈权、接受权、拒绝权，但不拥有对 core soul 的直接正文编辑权。
6. drift 风险一旦升高，系统必须优先保护 identity continuity，而不是继续追求成长速度。

---

## 4. Decision Levels

Soul 相关动作统一使用下面四级：

### `AUTO`

- 系统可自动执行
- 不要求用户感知

### `SUGGEST`

- 系统可自动形成建议
- 但默认不直接生效

### `CONFIRM`

- 必须显式确认后才能生效

### `FORBID`

- 本阶段禁止自动或直接触发

---

## 5. Core Judgment Rules

对 soul 域做治理分级时，只看这三件事：

1. 是否改变长期身份基线
2. 是否改变面对用户的关系姿态
3. 是否会持续影响后续行为、学习、自动化输出

如果三项里有任意两项为“是”，等级不能低于 `CONFIRM`。

---

## 6. Object-Level Governance Matrix

## 6.1 总表

| object | create | update | activate | archive | user direct edit |
|---|---|---|---|---|---|
| `core_soul` | `FORBID` | `FORBID` | `FORBID` | `CONFIRM` | `FORBID` |
| `relationship_soul` | `SUGGEST` | `SUGGEST` | `CONFIRM` | `SUGGEST` | `FORBID` |
| `identity_narrative` | `AUTO` | `SUGGEST` | `SUGGEST` | `SUGGEST` | `FORBID` |
| `soul_memory` | `SUGGEST` | `SUGGEST` | `AUTO` | `SUGGEST` | `FORBID` |
| `soul_journal` | `AUTO` | `FORBID` | `AUTO` | `AUTO` | `FORBID` |
| `soul_proposal` | `AUTO` | `AUTO` | `FORBID` | `AUTO` | `FORBID` |
| `active_overlay` | `FORBID` | `FORBID` | `CONFIRM` | `CONFIRM` | `FORBID` |
| `runtime_snapshot` | `AUTO` | `AUTO` | `AUTO` | `AUTO` | `FORBID` |

说明：

- `activate` 对 `soul_proposal` 是 `FORBID`，因为 proposal 本身不能直接等于生效。
- `active_overlay` 的 create/update 不直接开放，因为它必须由 proposal promotion 导出。

---

## 6.2 `core_soul`

### 创建

- `FORBID`

说明：

- 运行时、heartbeat、普通成长流程都不得直接创建新的第二份 core soul。
- core soul 只能来源于：
  - 初始系统引导
  - 极高等级治理变更

### 更新

- `FORBID`

说明：

- 不允许 heartbeat 自动改写
- 不允许用户通过产品面直接改写

### 归档 / 替换

- `CONFIRM`

说明：

- 只有极少数系统级迁移或重大身份重构才允许

---

## 6.3 `relationship_soul`

### 创建 / 更新

- `SUGGEST`

说明：

- 它比 core soul 更灵活
- 但它直接影响用户感知到的关系姿态，不能全自动

### 激活

- `CONFIRM`

说明：

- 新版本 relationship soul 生效前需要明确确认

---

## 6.4 `identity_narrative`

### 创建

- `AUTO`

说明：

- 系统必须能自动形成 identity narrative

### 更新

- `SUGGEST`

说明：

- narrative 可以自动形成新版本草稿
- 但进入长期稳定版本前，建议走显式建议链

### 激活

- `SUGGEST`

条件：

- 更新只是当前叙事刷新，不改变 core values 与关系基线
- 且未与 `relationship_soul`、`active_overlay` 冲突

原因：

- narrative 会进入用户可见“当前的我”层
- 不应成为绕过 proposal / overlay 治理的快速通道

---

## 6.5 `soul_memory`

### 创建

- `SUGGEST`

说明：

- 进入 soul memory 的记忆已经是高权重身份记忆
- 不能完全黑箱自动升格

### 激活

- `AUTO`

条件：

- 仅作为 memory 层 active
- 不等于直接进入 runtime hot path

---

## 6.6 `soul_journal`

### 创建

- `AUTO`

说明：

- 它本质上是内部反思日志
- 不直接改变人格基线

### 更新

- `FORBID`

说明：

- journal 一旦写出，不应用覆盖写方式更新
- 只能追加新条目

### 归档

- `AUTO`

说明：

- 允许系统按时间和热度归档

---

## 6.7 `soul_proposal`

### 创建

- `AUTO`

说明：

- 系统必须能自动形成 proposal，作为成长探索机制

### 更新

- `AUTO`

说明：

- 系统可补充 evidence、更新 risk、延长观察期

### 生效

- `FORBID`

说明：

- proposal 永远不能直接当成 active soul

---

## 6.8 `active_overlay`

### 创建 / 更新

- `FORBID`

说明：

- 运行时或普通写入逻辑不得直接写 active overlay
- 只能由 governance promotion 生成

### 激活

- `CONFIRM`

说明：

- 这是会直接改变长期行为基线的对象

### 归档 / 回退

- `CONFIRM`

说明：

- overlay 的移除、替换、回退都会影响行为基线

---

## 6.9 `runtime_snapshot`

### 创建 / 更新 / 归档

- `AUTO`

说明：

- 只是运行时可观测产物
- 不应成为治理瓶颈
- 不应进入用户可见稳定人格面

---

## 7. Actor-Level Permissions

## 7.1 Heartbeat

heartbeat 默认允许：

- `AUTO` 写 `soul_journal`
- `AUTO` 生成 `soul_proposal`
- `AUTO` 刷新 `runtime_snapshot`

heartbeat 默认不允许：

- 修改 `core_soul`
- 直接写 `active_overlay`
- 直接激活新的 `relationship_soul`

## 7.2 Governance Engine

governance engine 默认允许：

- 评估 proposal
- promotion proposal -> overlay
- 归档旧 overlay
- 触发 drift rollback

## 7.3 User

用户默认允许：

- 看 soul summary
- 看 soul proposal
- 接受 / 拒绝 proposal
- 停止某些 soul-driven growth

用户默认不允许：

- 直接编辑 `core_soul`
- 直接编辑 `identity_narrative` 正文
- 直接编辑 `soul_journal`
- 手工创建 `active_overlay`

## 7.4 System Bootstrap / Migration

系统引导或迁移流程允许：

- 创建初始 `core_soul`
- 从 legacy `SOUL.md` 导入 `core_soul`

但之后不能把普通 runtime 逻辑提升成同等权限。

---

## 8. Promotion Rules

## 8.1 `soul_proposal -> active_overlay`

必须满足：

1. evidence 完整
2. risk 已评估
3. 未与 core soul 冲突
4. 明确确认通过

## 8.2 `relationship evidence -> relationship_soul`

必须满足：

1. repeated evidence
2. 与当前 relationship policy 不明显冲突
3. 不会造成高频摇摆

## 8.3 `overlay -> core_soul`

默认禁止直接 promotion。

仅允许在系统级 review / migration 下发生。

---

## 9. Drift And Rollback

## 9.1 Drift Signals

以下指标出现时视为 drift 风险：

1. proposal 生成过于频繁
2. overlay 更替过快
3. relationship stance 在短期内多次反向变化
4. runtime soul 和 core soul 一致性显著下降

## 9.2 Auto Protection

当 drift 触发时，系统可自动：

- 暂停新的高风险 proposal
- 暂停 overlay promotion
- 继续允许 journal 写入
- 继续允许 runtime snapshot 写入

## 9.3 Rollback

允许 `CONFIRM` 级回退：

- 当前 overlay -> 上一版 stable overlay
- 当前 relationship_soul -> 上一版 stable relationship_soul

不允许直接回退到无 soul 状态。

---

## 10. Audit And Traceability

所有以下动作都必须写 access / governance trace：

1. proposal 创建
2. proposal 状态变更
3. overlay 激活
4. overlay 回退
5. relationship soul 激活
6. core soul migration

审计目标：

- 能回答“为什么变了”
- 能回答“谁批准的”
- 能回答“是哪些 evidence 触发的”

---

## 11. Runtime / Product Impact

## 11.1 对 runtime 的影响

本篇要求：

- runtime 不得直接使用 raw proposal
- runtime 只读取 approved / active layer
- drift 保护优先于成长速度

## 11.2 对产品面的影响

本篇要求：

- 用户看到 proposal，不直接改 core
- 用户能确认 / 拒绝高影响变化
- 用户能理解为什么不能直接编辑

---

## 12. Open Questions

1. `relationship_soul` 的激活是否全部都要 `CONFIRM`，还是低风险变化可以降到 `SUGGEST`。
2. `identity_narrative` 的更新是否可以在“仅文本刷新”时完全 `AUTO`。
3. `soul_memory` 晋升是否需要独立 review 阶段。
4. drift threshold 应按 proposal 数量、语义距离还是用户反馈共同决定。
5. `core_soul` 的系统级变更是否需要额外单独审计表。

---

## 13. 本篇结论

1. Soul 是高风险域，治理强度必须高于普通 `agent_self`。
2. `soul_journal` 可以高自治，但 `active_overlay` 与 `core_soul` 必须强治理。
3. proposal 可以自动生成，但不能自动生效。
4. 用户拥有反馈与确认权，但不拥有 core soul 的直接编辑权。
5. 本篇为 `17-soul-product-interaction-model.md` 提供了清晰的可见/可控边界。
