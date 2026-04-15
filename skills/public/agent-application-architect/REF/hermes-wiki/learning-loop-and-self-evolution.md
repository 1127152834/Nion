# Hermes 的学习闭环与自进化边界

最后更新：2026-04-15

这一页专门回答一个之前还没拆硬的问题：

> Hermes 到底已经实现了哪些“成长闭环”？
> 哪些只是通过 prompt / 技能 /配置鼓励去做？
> 哪些已经被拆到独立的自进化项目里？

如果这一层不分清，专家 skill 很容易把“宣传语”“设计意图”“实际内置机制”“未来规划”混在一起。

## 1. 先给结论：Hermes 的“学习”至少分三层

### 第一层：运行时内置的学习闭环

这些是当前主仓库里已经明确落地的能力：

1. 持久记忆写入与下一 session 注入
2. `session_search` 的跨会话召回
3. `skill_manage` 驱动的技能创建 / 修改 / 删除
4. `trajectory` 保存与 `batch_runner` 轨迹数据输出
5. memory provider hooks 在 turn / session / compression 边界上的提取机会

### 第二层：通过 prompt / 技能 /文档驱动的“最佳努力学习”

这些能力更多依赖 agent 遵循规则，而不是系统强制：

1. “任务复杂后请保存 skill”
2. “学到稳定事实请写 memory”
3. “用户引用过去内容时请先 `session_search`”
4. “技能在使用中发现过时就 patch”

这层很重要，但它不是 hard guarantee，更像 runtime policy。

### 第三层：独立自进化管线

这部分已经被拆到 `hermes-agent-self-evolution` 独立仓库中：

1. 技能文本进化
2. 工具描述进化
3. 系统 prompt 段落进化
4. 未来的工具实现代码进化
5. 持续监控 → 触发优化 → 产出 PR 的自动化闭环

也就是说，Hermes 主仓库里有“可学习 runtime”，而 `self-evolution` 仓库在做“系统级优化器”。

## 2. 当前主仓库里已落地的记忆分层

如果只从“用户记忆”理解 Hermes，会低估它。
更准确地说，它目前至少有这几层：

### A. `MEMORY.md`

记录环境事实、工作流知识、约定、经验教训。
是 agent 对“世界”的 compact declarative memory。

### B. `USER.md`

记录用户身份、偏好、沟通方式、习惯。
是 agent 对“你”的 compact profile memory。

### C. SessionDB / `session_search`

记录跨 session 历史，可通过 FTS5 检索和摘要召回。
这是 episodic / searchable memory，不该与 compact memory 混为一谈。

### D. Skills

通过 `skill_manage` 形成 narrow、actionable、可复用的 procedural memory。
这层不是“记住事实”，而是“记住怎么做”。

### E. Memory Provider 外部层

通过 `MemoryProvider` interface，像 Honcho 这类外部 provider 能：

1. 预取记忆
2. 同步回合
3. 在 session 结束时提取结论
4. 在 context 压缩前抢救信号

这已经是比 `MEMORY.md` / `USER.md` 更高阶的记忆层。

所以如果要说“三层记忆”，一个更准确、可迁移的总结是：

1. **Compact durable memory**：`MEMORY.md` / `USER.md`
2. **Searchable episodic memory**：SessionDB + `session_search`
3. **Procedural / extracted memory**：skills + external memory provider abstractions

## 3. 核心循环里，Hermes 已经内置了哪些“提取机会”

从 `agent-loop.md`、`memory_manager.py`、`memory_provider.py` 可以看出，Hermes 的主循环不是只会“跑任务”，它已经留了多处信号提取钩子。

### Turn 完成后

- `sync_all(user_content, assistant_content)`
  让 memory provider 同步本轮。

### 下一轮前

- `queue_prefetch_all(query)`
  让 provider 为下一轮预取相关记忆。

### Session 结束时

- `on_session_end(messages)`
  允许 provider 从整段会话做 end-of-session extraction。

### 压缩前

- `on_pre_compress(messages)`
  允许 provider 从即将被压缩掉的消息中提取关键信号并注入总结 prompt。

### Delegation 返回时

- `on_delegation(task, result, child_session_id=...)`
  允许 parent 的 memory provider 把 delegation 结果作为观察样本吸收。

这些点连起来，说明 Hermes 已经不只是“会把对话存起来”，而是给了外部 provider 很多机会去从事件边界上抽取信息。

## 4. 但要诚实：主仓库里很多“反思闭环”仍然是 best effort，不是 hard-coded pipeline

从 README 和 prompt guidance 能看到：

- “periodic nudges”
- “autonomous skill creation after complex tasks”
- “skills self-improve during use”

这些描述说明 Hermes 非常强调成长闭环。
但如果严格看当前主仓库实现，很多环节仍然更接近：

1. system prompt 强力鼓励
2. `skill_manage` / `memory` / `session_search` 提供基础设施
3. agent 在任务中主动选择是否调用

也就是说：

> 它已经提供了学习所需的 primitives，
> 但很多“成长动作”仍然依赖 agent 在运行时做出正确判断。

这与一个完全 hard-coded 的 reflection pipeline 还是不同的。

## 5. 那么“周期性反射”在 Hermes 里处于什么状态？

### 已有基础

1. cron 系统可定期运行任务
2. agent 有 `session_search`
3. memory provider 有 end-of-session / pre-compress hooks
4. trajectory 可落盘用于回看

### 仍未完全内置的部分

从 issue #483 可以看到，官方自己也承认：

- 缺少系统性的 post-task reflection
- 缺少 missing affordance detection
- 当前记忆提取更多还是 best effort

所以目前更准确的说法是：

> Hermes 具备实现周期性反思的运行时基础设施，
> 但系统级、标准化、默认开启的 post-task reflection pipeline 还没有完全内建。

## 6. 技能蒸馏：Hermes 主仓库现在已经做到了什么

这部分不能说成“全自动闭环已经无处不在”，但也绝不能低估。

### 已经有的基础设施

1. `skill_manage`
2. `skills_list` / `skill_view`
3. progressive disclosure 的 skills runtime
4. prompt 中对 skill 保存/更新的强约束
5. `skills.external_dirs`
6. skills 作为 procedural memory 的正式定位

### 已经有的使用哲学

README 和 prompt guidance 一直在推同一个动作：

> 复杂任务完成后，把有效方法蒸馏成 skill。

也就是说，Hermes 已经把“技能蒸馏”定义成 agent 的正常行为，而不是外部技巧。

### 还没彻底自动化的部分

它还没有主仓库内置一个统一的：

1. 扫描失败/成功轨迹
2. 提取稳定 workflow
3. 自动生成候选 skill
4. 用 held-out task 验证
5. 再固化回 skills

这样的 end-to-end 自动蒸馏流水线。

## 7. 轨迹保存是一个很重要但容易被忽视的桥梁层

`trajectory.py` 与 `batch_runner.py` 很关键。
它们让 Hermes 的执行不只是“当场做完”，还变成：

1. 可保存
2. 可回放
3. 可训练
4. 可评估

轨迹里包括：

- conversations
- completed / failed
- api_calls
- toolsets_used
- tool_stats
- reasoning coverage

这意味着 Hermes 已经具备把执行转成监督/评估数据的能力。
这正是“扫描日志 → 提取信号 → 生成资产”的前半段基础设施。

## 8. 真正系统级的自进化，已经被拆到 `hermes-agent-self-evolution`

这里一定要分清。

### 主仓库做什么

- 提供 skills / memory / session / trajectory / batch_runner / prompt sections 这些可被优化对象和数据源

### 自进化仓库做什么

`hermes-agent-self-evolution` 的 README 和 PLAN 说得很清楚：

1. 选择目标（skill、prompt section、tool description、未来代码）
2. 构建评估数据集
3. 用执行轨迹做 reflective analysis
4. 生成 candidate variants
5. 通过 tests / size / caching / semantic constraints 做 gate
6. 输出 best variant + PR

这里最关键的一句话是：

> self-evolution operates ON hermes-agent, not inside it.

也就是说，Hermes 当前的系统级自进化并不是内置在主 runtime 的单个对话循环里，而是被设计成独立优化器。

## 9. 所以你说的那条链，在 Hermes 里应该怎样准确表达

你提到的链是：

> agent 完成任务
> 扫描日志
> 提取信号
> 生成可复用资产
> 验证固化

现在更准确的分解应该是：

### 在 Hermes 主仓库内已具备

1. 任务执行
2. 对话 / session / trajectory 落盘
3. 回合级同步与预取
4. session 结束提取机会
5. 压缩前抢救机会
6. `skill_manage` / `memory` 作为资产固化基础设施

### 在主仓库内主要靠 runtime policy 驱动

1. 什么时候把经验写 memory
2. 什么时候保存 skill
3. 什么时候更新已有 skill
4. 什么时候调用 `session_search`

### 在独立自进化仓库中正在系统化

1. 从轨迹 / session history 自动建评估集
2. 反思失败原因
3. 提出 candidate mutations
4. 验证约束与指标
5. PR 化固化

## 10. 这轮研究后，我认为还要补的内容

如果要说“彻底吃透”，还应该继续补：

1. `cli-config.yaml.example` 里与 `memory_nudge`、`save_trajectories` 相关的配置语义
2. memory provider 的具体实现差异，特别是 builtin 与 Honcho 在 recall / extraction 上的不同
3. `skill_manager_tool.py` 的完整生成/patch 逻辑，判断“技能自改进”到底已经自动到什么程度
4. `hermes-agent-self-evolution` 的 dataset builder、constraint validator、fitness metric，进一步把“验证固化”讲清楚
5. 现有 issue 中关于 post-task reflection、durable feedback routing、structured memory 的提案状态，区分已经落地和仍在规划

## 11. 对 expert skill 的直接启发

这个专家 skill 以后必须内置一个重要能力：

> 在分析 agent 系统时，严格区分
> “已内置闭环”
> “policy 驱动闭环”
> “外部优化器闭环”。

否则就会出现一种常见错误：

- 把系统设计意图误说成系统能力
- 把将来规划误说成当前已有
- 把“能做”误说成“默认会做”
