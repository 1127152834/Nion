# Memory OS Business Rules

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第三篇。

它负责冻结：

- candidate 的进入规则
- candidate 晋升为长期 truth 的规则
- invalidation / archive / purge 的业务规则
- 哪些信号允许进入 `soul / learning / automation`
- 哪些内容必须被拒绝或降级处理

它**不**负责：

- 具体数据字段
- 具体存储结构
- 具体 runtime 时序
- 具体 UI 交互

## 2. Inputs

本篇依赖：

- [00-memory-os-scope-and-principles.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/00-memory-os-scope-and-principles.md)
- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [current-memory-system-audit.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/current-memory-system-audit.md)
- [nion-memory-os-final-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/nion-memory-os-final-architecture.md)

## 3. Decisions

本篇冻结以下关键决策：

1. turn 结束后只能产生 `candidate`，不能直接改写长期 truth。
2. 进入 `active` 的长期记忆必须经过 consolidation，不允许“抽到了就算真”。
3. `user_model`、`relationship`、`soul`、`learning`、`automation_projection` 的晋升阈值不同。
4. 单次对话可以形成：
   - recall
   - candidate
   - diary evidence
   但不能直接形成：
   - approved procedure
   - adaptive soul overlay
   - agent-owned automation
5. 所有成长行为必须以“更好服务当前用户”为目标，而不是自由生长。

## 4. Candidate Entry Rules

## 4.1 可以进入 candidate 的信号

允许进入 candidate 的信号来源固定为：

1. 对话内容
2. 用户显式纠正
3. notebook / 文档投影抽取
4. 任务执行结果中的稳定行为证据
5. diary / reflection 中反复出现的经验

## 4.2 必须拒绝进入 candidate 的内容

以下内容默认不能进入 candidate：

1. 工具中间结果
2. session-scoped 上传文件路径
3. 一次性临时上下文
4. 明显无关的闲聊细节
5. 无法解释来源的模型臆断
6. 未经验证的外部资料结论

## 4.3 默认进入哪个 domain

### A. 用户长期角色、偏好、目标

进入：

- `user_model.candidate`

### B. 用户对 agent 互动方式的约束

进入：

- `relationship.candidate`

### C. 当前轮的经验、失误、观察

进入：

- `agent_self.diary_evidence`

### D. 来自 notebook / 文档的片段

进入：

- `knowledge_projection`

只有经过 consolidation 后，才可能升到 `user_model` 或 `procedure`。

### E. 重复服务方法线索

进入：

- `procedure.candidate`

### F. 重复学习主题线索

进入：

- `learning.candidate`

## 5. Candidate Promotion Rules

## 5.1 统一原则

candidate 进入长期 truth 时必须同时满足三件事：

1. **相关**
   - 与服务当前用户显著相关
2. **稳定**
   - 不是一次性或瞬时信号
3. **可解释**
   - 能说清来自哪里、为什么成立

如果缺任一项，不能晋升。

## 5.2 `user_model` 的晋升规则

以下情况可晋升为 `user_model.active`：

### 直接晋升

满足任一条件：

1. 用户明确陈述身份、职责、长期偏好、长期目标
2. 用户明确否定旧事实并给出新事实

### 延迟晋升

满足全部条件：

1. 跨会话重复出现
2. 与核心工作或稳定习惯相关
3. 没有被更高置信度事实冲突

### 不可晋升

以下情况不可晋升：

1. 一次性兴趣
2. 临时任务偏好
3. 单轮情绪化表达
4. 没有上下文支撑的弱推断

## 5.3 `relationship` 的晋升规则

`relationship` 比 `user_model` 更保守。

可晋升的典型条件：

1. 用户明确说“不要太主动”“可以提醒我”
2. 用户多次对某种互动方式给出一致正/负反馈

不可晋升的典型情况：

1. 单次抱怨
2. 单次客气表达
3. 模型自己推测“用户应该喜欢这样”

## 5.4 `agent_self` 的晋升规则

`agent_self` 不需要像 `user_model` 那样严格。

以下内容可以直接进入 `agent_self.active`：

1. 本轮做错了什么
2. 本轮服务中观察到的模式
3. 本轮待跟进问题

但它不能自动晋升到：

- `procedure.approved`
- `soul.adaptive_overlay`

它只能作为这些域的证据。

## 5.5 `procedure` 的晋升规则

要从 candidate 晋升为 procedure，至少满足：

1. 同类场景多次出现
2. 有明确服务收益
3. 已形成相对稳定的处理路径
4. 至少有重复证据支撑

禁止：

1. 单次成功经验直接晋升
2. 没有复用验证的 diary 内容直接晋升

## 5.6 `learning` 的晋升规则

进入 `learning.backlog` 至少满足：

1. 主题重复出现
2. 明显服务用户核心事务
3. 不是偶发 curiosity

以下主题不得进入 backlog：

1. 一次性娱乐问题
2. 无法形成长期服务价值的随机主题
3. 明显超出 agent 服务边界的泛化学习冲动

## 5.7 `soul` 的晋升规则

`soul` 是最保守域之一。

可进入 `soul.proposal` 的条件：

1. 长期互动风格出现稳定模式
2. 变化只影响行为表达，不影响核心边界
3. 有 repeated evidence

禁止直接进入 `adaptive_overlay` 的情况：

1. 单次互动偏好
2. diary 中一次性反思
3. 未经验证的自我人格推断

## 5.8 `automation_projection` 的晋升规则

agent-owned automation 只能从 `candidate` 晋升为真正 job，当且仅当：

1. 对用户长期服务明显有价值
2. 存在重复需求或稳定维护必要性
3. 不属于高风险外部动作
4. 能被清晰解释为 maintenance / learning / review / refresh

禁止：

1. 单次场景直接自动建 job
2. 高风险动作自动建 job
3. 无法说明来源的 job creation

## 6. Invalidation Rules

## 6.1 什么时候 invalidated

以下情况应进入 `invalidated`：

1. 新事实明确覆盖旧事实
2. 用户明确说以前的理解不对
3. 时间敏感事实已失效
4. 旧偏好被新偏好替代

## 6.2 什么时候 archived

以下情况进入 `archived`：

1. 长期未使用但仍可能有参考价值
2. 学习主题热度明显下降
3. procedure 不再常用但仍可能复用

## 6.3 什么时候 purged

以下情况才允许 `purged`：

1. 低价值 candidate 长期无引用
2. 被明确删除且无保留必要
3. 用户明确要求遗忘

## 6.4 什么时候 superseded

以下情况标记为 `superseded`：

1. procedure 新版本替代旧版本
2. soul proposal 被后续 proposal 替代
3. automation policy 被新 policy 替代

## 7. Memory -> Learning -> Procedure -> Automation Rules

这条升级链必须严格受控。

## 7.1 合法路径

允许的路径是：

`episodic evidence -> candidate -> consolidated pattern -> learning / procedure -> automation candidate`

## 7.2 非法跳级

以下跳级禁止：

1. `conversation -> soul overlay`
2. `conversation -> agent-owned automation`
3. `single diary -> approved skill`
4. `single notebook chunk -> user model truth`

## 7.3 经验升级优先级

当一条经验同时可能变成：

- user_model
- procedure
- learning topic

优先顺序为：

1. 先判断是否是长期用户事实
2. 再判断是否形成学习主题
3. 最后判断是否已经足够 procedural

这样可以避免太早 proceduralize。

## 8. Agent-Owned Automation Business Rules

## 8.1 允许创建的类型

仅允许以下类型进入 agent-owned automation candidate：

1. `maintenance`
   - 记忆压缩、归档、复盘等
2. `learning`
   - 定期学习某个明确主题
3. `review`
   - 检查某类长期问题是否仍成立
4. `refresh`
   - 定期刷新某类参考知识

## 8.2 不允许创建的类型

以下类型禁止自动形成 agent-owned automation：

1. 对外发送内容
2. 消费性或付费动作
3. 高影响系统改动
4. 无明确来源的外部操作

## 8.3 用户控制规则

agent-owned automation 的业务规则冻结为：

1. 用户可暂停
2. 用户可恢复
3. 用户不可直接改内部 prompt/body/schedule
4. 用户可通过聊天给出高层指令，由系统重建

## 9. Rules / Contracts

本篇冻结以下硬规则：

1. turn 结束后只能产生 candidate，不直接改长期 truth。
2. `user_model`、`relationship`、`soul`、`automation_projection` 默认都不能从单轮直接晋升为 active。
3. `agent_self` 可以快速记录，但只能作为更高层升级的证据，不是自动真理。
4. `procedure`、`soul adaptive overlay`、`agent-owned automation` 都必须经过 repeated evidence。
5. `Notebook -> user_model truth` 必须经过 consolidation，不允许直接抽取即采信。
6. 高风险自动化不能由 agent 自发生成。

## 10. Impacts

本篇会直接约束：

- `03-memory-os-data-contracts.md`
- `04-memory-os-runtime-flows.md`
- `05-memory-os-governance-and-permissions.md`
- `06-memory-os-interaction-model.md`
- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 11. Open Questions

本篇仍未冻结的问题：

1. repeated evidence 的最小阈值具体是多少
2. `learning topic score` 的精确公式
3. invalidation 与 archive 的自动触发阈值
4. 哪些类型需要用户显式确认才能 promotion
5. agent-owned automation 的风险等级矩阵细分

这些会在后续文档继续冻结。

## 12. 结论

到这一篇为止，Memory OS 已经不只是“域划分清楚”，而是连业务上的进入、晋升、失效、升级路径都被冻结了。

后续的数据结构、运行时、治理和迁移都必须围绕这些规则展开。
