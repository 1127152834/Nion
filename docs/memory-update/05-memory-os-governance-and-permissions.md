# Memory OS Governance And Permissions

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第五篇。

它负责冻结：

- Memory OS 的治理等级
- 各类动作的权限模型
- user-owned / agent-owned 的控制边界
- 自动行为、建议行为、确认行为的分级
- soul / learning / automation 的审批语义

它**不**负责：

- 具体 UI 表现
- 具体 runtime 时序
- 具体 SQL schema

## 2. Inputs

本篇依赖：

- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [02-memory-os-business-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/02-memory-os-business-rules.md)
- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)

## 3. Decisions

本篇冻结以下关键决策：

1. Memory OS 的自治能力必须以治理等级为前提。
2. 所有动作统一按 `Auto / Suggest / Confirm / Forbid` 四级处理。
3. `agent_self` 的记录可以高自治，`soul`、`agent-owned automation`、`externally visible actions` 必须更严格。
4. 用户对 agent-owned automation 的默认权限是 `pause/resume`，而不是直接编辑内部逻辑。
5. 用户对长期记忆拥有纠正权与冻结权，但不必拥有对 agent internal artifacts 的正文编辑权。

## 4. 权限等级总表

## 4.1 Action Decision Levels

Memory OS 相关动作统一分为四级：

### `AUTO`

- 系统可自动执行
- 不需要提示用户

### `SUGGEST`

- 系统生成建议
- 默认不执行
- 用户可一键接受/忽略

### `CONFIRM`

- 必须显式确认后才能执行

### `FORBID`

- 本期禁止自动或手动经由 Memory OS 直接触发

## 4.2 核心判断原则

动作分级只看三件事：

1. 是否改变长期 truth
2. 是否改变 agent 行为基线
3. 是否产生对外影响或高代价后果

## 5. 各类动作的治理分级

## 5.1 `recall` / evidence capture

### 动作

- capture latest exchange
- append evidence link

### 等级

- `AUTO`

### 原因

- 只是证据层写入
- 不直接改变长期 truth

## 5.2 `agent_self` 写入

### 动作

- diary entry
- reflection note
- service mistake record

### 等级

- `AUTO`

### 原因

- 属于 agent internal artifacts
- 不直接改变用户长期画像

## 5.3 `user_model` candidate extraction

### 动作

- 从对话中提取 user_model candidate

### 等级

- `AUTO`

### 原因

- 仍然只是 candidate，不是 truth

## 5.4 `user_model` consolidation

### 动作

- 将 candidate 写入 `user_model.active`
- 覆盖旧事实

### 等级

- 默认 `AUTO`，但必须满足业务规则与 provenance 要求

### 额外限制

以下情况升级为 `SUGGEST`：

1. 高不确定度
2. 影响用户核心身份理解
3. 与已有高置信记录冲突明显

## 5.5 `relationship` consolidation

### 动作

- 生成/更新 initiative policy
- 更新 teaching tolerance 等

### 等级

- 默认 `SUGGEST`

### 原因

- 它直接影响 agent 如何对待用户
- 误判成本高

### 例外

用户显式表述的关系约束可直接 `AUTO` 写入。

## 5.6 `procedure` candidate generation

### 动作

- 从 repeated evidence 生成 procedure draft

### 等级

- `AUTO`

### 原因

- 只是 draft，不会直接影响外部行为

## 5.7 `procedure` approval

### 动作

- draft -> approved procedure

### 等级

- 默认 `SUGGEST`

### 原因

- 这一步开始会影响后续服务方式
- 不应完全黑箱化

## 5.8 `learning` backlog generation

### 动作

- 生成 learning candidate / backlog item

### 等级

- `AUTO`

### 原因

- 内部学习待办
- 不直接改变外部行为

## 5.9 `learning plan` activation

### 动作

- 将学习主题变成激活中的 learning plan

### 等级

- 默认 `SUGGEST`

### 原因

- 它会消耗后台预算
- 会影响 agent 后续行为优先级

## 5.10 `soul proposal`

### 动作

- 生成 soul_proposal

### 等级

- `AUTO`

### 原因

- proposal 不是最终生效

## 5.11 `adaptive soul overlay` 写入

### 动作

- proposal -> approved adaptive overlay

### 等级

- `CONFIRM`

### 原因

- 这会直接改变 agent 长期行为基线
- 风险高于一般 memory consolidation

## 5.12 `agent-owned automation` candidate generation

### 动作

- maintenance / learning / review / refresh 类型 job candidate

### 等级

- `AUTO`

### 原因

- 仍然只是 candidate，不是实际 job

## 5.13 `agent-owned automation` job creation

### 动作

- 将 automation candidate 变成真实 job

### 等级

- 分级处理

#### `AUTO`

仅允许：

- internal-only maintenance jobs
- 不对外发消息
- 不调用高风险外部动作
- 不消费付费资源

#### `SUGGEST`

适用于：

- 学习型 job
- review / refresh job
- 可能增加后台资源消耗的内部任务

#### `CONFIRM`

适用于：

- user-visible job
- 会在聊天或 channel 中主动触达用户的任务

#### `FORBID`

禁止：

- 外部发布、付费动作、系统高影响动作

## 5.14 `user-owned automation`

### 创建

- `CONFIRM` by user action

### 修改

- `CONFIRM` by user action

### 删除

- `CONFIRM` by user action

Memory OS 不自动替用户创建可编辑的 user-owned automation。

## 6. 用户权利模型

## 6.1 用户对 `user_model`

用户拥有：

- 查看权
- 纠正权
- 冻结权
- 遗忘请求权

用户不一定需要：

- 逐字段手工编辑底层 metadata

## 6.2 用户对 `relationship`

用户拥有：

- 查看权
- 修改权
- 冻结权

因为这层直接涉及互动舒适度。

## 6.3 用户对 `agent_self`

用户默认不拥有正文编辑权。

用户拥有：

- 可见性控制权
- 冻结某类自动维护行为的权利
- 针对明显错误的反馈权

## 6.4 用户对 `soul`

### `core_soul`

- 不对用户开放直接编辑

### `adaptive_overlay`

- 用户可查看概要
- 用户可拒绝/回滚 proposal

### `soul_proposals`

- 用户可确认或驳回

## 6.5 用户对 `learning`

用户拥有：

- 查看权
- 暂停权
- 恢复权
- 拒绝某主题继续学习的权利

用户不直接编辑 learning artifact 正文。

## 6.6 用户对 `agent-owned automation`

用户拥有：

- 查看权
- 暂停权
- 恢复权
- 删除建议权

用户不直接拥有：

- prompt body 编辑权
- 内部 schedule 细节编辑权

## 7. 冻结与回滚语义

## 7.1 Freeze

`freeze` 指某个对象停止被自动更新。

可用于：

- user_model item
- relationship item
- learning topic
- adaptive soul proposal
- agent-owned automation

## 7.2 Rollback

`rollback` 指将对象恢复到上一个稳定版本。

必须支持 rollback 的对象：

- soul overlays
- procedures
- learning plans
- user_model 高价值 records

## 7.3 Reject

`reject` 用于 candidate / proposal 阶段。

它不同于 delete：

- reject = 不接受进入稳定层
- delete = 移除已有对象

## 8. 审批矩阵

| 动作 | 默认等级 | 备注 |
|---|---|---|
| capture recall | `AUTO` | 证据层 |
| write diary | `AUTO` | agent internal |
| generate user_model candidate | `AUTO` | 非 truth |
| consolidate user_model | `AUTO/SUGGEST` | 冲突或高影响时升为 suggest |
| consolidate relationship | `SUGGEST` | 影响互动边界 |
| create procedure draft | `AUTO` | draft only |
| approve procedure | `SUGGEST` | 会影响服务模式 |
| add learning candidate | `AUTO` | internal backlog |
| activate learning plan | `SUGGEST` | 消耗预算 |
| create soul proposal | `AUTO` | proposal only |
| apply adaptive soul overlay | `CONFIRM` | 改行为基线 |
| create internal maintenance job | `AUTO/SUGGEST` | 视影响等级 |
| create user-visible agent job | `CONFIRM` | 触达用户 |
| create external/high-risk job | `FORBID` | 本期禁止 |

## 9. Risk Classes

为了让后续 runtime 和 interaction model 不漂，本篇冻结 4 个风险等级：

### `R0`

- 内部记录动作
- 无外部影响

### `R1`

- 内部维护动作
- 有资源消耗
- 无用户可见外部影响

### `R2`

- 用户可感知行为变化
- 用户会看到结果

### `R3`

- 外部可见、高影响或有成本动作

规则：

- `R0` 通常可 `AUTO`
- `R1` 通常 `AUTO/SUGGEST`
- `R2` 至少 `SUGGEST`，多为 `CONFIRM`
- `R3` 默认 `FORBID`

## 10. Rules / Contracts

本篇冻结以下硬性合同：

1. Memory OS 所有自治行为必须落入 `AUTO / SUGGEST / CONFIRM / FORBID` 四级之一。
2. `adaptive soul overlay` 不能自动生效。
3. agent-owned automation 不能默认获得外部高风险动作权限。
4. 用户对 user-facing长期认知拥有纠正、冻结、遗忘请求权。
5. agent internal artifacts 默认不对用户开放正文编辑权。

## 11. Impacts

本篇会直接约束：

- `04-memory-os-runtime-flows.md`
- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 12. Open Questions

本篇尚未冻结的问题：

1. `SUGGEST` 在 UI 中采用什么交互密度最合适
2. `CONFIRM` 是否区分一次性确认与长期授权
3. 哪些 `user_model` consolidation 应强制走 `SUGGEST`
4. `R1` 与 `R2` 的边界是否需要更细拆

## 13. 结论

到这一篇为止，Memory OS 的自治能力已经有了明确的治理骨架。

后续的 runtime flow 和 interaction model 必须在这个审批矩阵和风险等级之上展开，不能重新发明权限语义。
