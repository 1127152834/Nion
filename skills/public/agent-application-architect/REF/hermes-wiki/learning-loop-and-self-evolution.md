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

## 3.5 `memory_nudge` 和 `skill creation nudge` 的真实语义

这一点之前很容易被说得太重。
从 `cli-config.yaml.example` 可以确认，当前主仓库里至少明确暴露了两类 nudge 配置：

### `memory.nudge_interval`

- 定义：每 N 个 user turns 提醒 agent 考虑保存 memory
- 关闭方式：设为 `0`
- 语义：**remind the agent to consider saving memories**

而且从 `run_agent.py` 现在可以进一步确认，这个配置不是死文档：

1. `AIAgent.__init__` 里会读取 `mem_config["nudge_interval"]`
2. 每轮 `run_conversation()` 开始时，`_turns_since_memory` 会累加
3. 达到阈值后置 `\_should_review_memory = True`
4. 在本轮主任务完成后，触发 `_spawn_background_review(...)`
5. 这个 background review agent 会用 `_MEMORY_REVIEW_PROMPT` 回看对话并决定是否调用 memory tool

所以它已经是 **已接线的运行时提醒机制**，但依然不是“强制写 memory”的系统级闭环。

### `skills.creation_nudge_interval`

- 定义：每 N 个 tool-calling iterations 提醒模型考虑保存 skill
- 关闭方式：设为 `0`
- 语义：**remind the model to consider saving a skill**

而且它同样已经接到了运行时代码里：

1. `AIAgent.__init__` 读取 `skills.creation_nudge_interval`
2. agent loop 中每个 tool-calling iteration 会累加 `\_iters_since_skill`
3. 当本轮结束时，如果达到阈值，就置 `\_should_review_skills = True`
4. 随后同样走 `_spawn_background_review(...)`
5. review agent 使用 `_SKILL_REVIEW_PROMPT` 或 `_COMBINED_REVIEW_PROMPT`，决定是否 `create` / `patch` skill

所以 skill nudge 也不是空配置，而是 **已接线的 post-task review trigger**。

但它依旧不是“任务一完成就一定自动蒸馏成 skill”。
它只是让 agent 在合适时机多一次反思机会。

所以到目前为止更准确的表述应该是：

> Hermes 主 runtime 已经内置了“提醒去学习”的机制，
> 但不是“强制自动把经验固化”的机制。

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

## 6.5 `skill_manage` 现在已经是 procedural memory 的真实写接口

从 `tools/skill_manager_tool.py` 可以更具体地确认，这不是概念层的存在，而是真实的主接口。

它支持：

1. `create`
2. `patch`
3. `edit`
4. `delete`
5. `write_file`
6. `remove_file`

而且它的 schema 描述已经明确把 skill 定义成：

> procedural memory — reusable approaches for recurring task types

并写明适用场景：

- complex task succeeded
- errors overcome
- user-corrected approach worked
- non-trivial workflow discovered
- or user asks you to remember a procedure

这说明 Hermes 在“如何把经验写成可复用资产”这一步上，其实已经提供了相当完整的基础设施。
缺的不是写接口，而是更强的自动触发与自动验证闭环。

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

## 7.5 Trajectory 到自进化的接口边界

当前主仓库里：

- `AIAgent` 可以 `save_trajectories`
- `trajectory.py` 负责 JSONL 落盘
- `batch_runner.py` 会额外记录 `tool_stats`、`tool_error_counts`、`reasoning_stats`

而在 `hermes-agent-self-evolution` 里：

- `dataset_builder.py` 用 synthetic / sessiondb / golden 三种方式构造评估集
- `skill_module.py` 把 skill 文本包装成 DSPy module
- `constraints.py` 做 size / growth / structure / test-suite gate
- `fitness.py` 做评分与反馈

所以这条接口边界可以概括为：

1. Hermes 主仓库负责 **产生轨迹与运行数据**
2. 自进化仓库负责 **把轨迹和历史转成评估样本**
3. 自进化仓库负责 **生成候选变体并做验证固化**

这再次说明，自进化当前是“外挂优化器”，不是“主循环默认子程序”。

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
5. 什么时候响应 memory / skill nudges

### 在独立自进化仓库中正在系统化

1. 从轨迹 / session history 自动建评估集
2. 反思失败原因
3. 提出 candidate mutations
4. 验证约束与指标
5. PR 化固化

并且这套外部优化器已经明确具备：

6. size / growth / caching compatibility gate
7. synthetic / sessiondb / golden 三种 eval dataset 来源
8. 反思式优化（GEPA）与 fallback optimizer 的分层

## 10. 这轮研究后，我认为还要补的内容

如果要说“彻底吃透”，还应该继续补：

1. builtin memory provider 的源码位置与行为文档，进一步和 Honcho / OpenViking 做精确对比
2. Honcho `prefetch()`、`queue_prefetch()`、`sync_turn()`、`on_session_end()`、`on_pre_compress()` 的完整代码路径
3. background review agent 的结果汇总与用户可见反馈是否还有隐藏条件
4. `hermes-agent-self-evolution` 的真实反馈链路是否已经把 `LLMJudge` 正式接进主优化 metric
5. 现有 issue 中关于 post-task reflection、durable feedback routing、structured memory 的提案状态，区分已经落地和仍在规划

## 10.5 Builtin vs External Memory Provider：目前已确认的真实差异

这一点现在也可以说得更具体，不必只停留在“内建 vs 外挂”。

### Builtin memory 的特点

1. 核心载体是 `MEMORY.md` / `USER.md`
2. session 起点做 frozen snapshot 注入
3. mid-session 通过 memory tool 显式 add / replace / remove
4. 更像 compact, curated, user-steered memory

而且从 `tools/memory_tool.py` 现在已经可以确认：

5. `MemoryStore` 同时维护 live state 与 `_system_prompt_snapshot`
6. `load_from_disk()` 会捕获快照，后续 mid-session 写入不会刷新这个快照
7. `add` / `replace` / `remove` 都是 file-backed、受字符上限约束、显式操作

所以 builtin memory 的设计重点是：

> 小而稳，可审计，可持久化，可缓存友好。

### Honcho / external provider 的特点

从 `plugins/memory/honcho/__init__.py` 与 `MemoryProvider` interface 可确认：

1. 有 `recall_mode`
   - `context`
   - `tools`
   - `hybrid`
2. 有 first-turn context baking
3. 有 background prefetch / queue_prefetch
4. 有 turn-level sync
5. 有 session-end extraction
6. 有 pre-compression extraction
7. 可通过 tool schemas 暴露自己的 memory tools

也就是说，external provider 不只是“另一种存储”，而是更像：

> 一套带 recall policy、sync policy、extraction policy、tool exposure 的 memory subsystem。

### 一个更准确的分层理解

- Builtin memory：低复杂度、稳定、紧凑、默认 durable layer
- External provider：高表达力、可检索、可总结、可注入、可扩展的 adaptive layer

这也是为什么两者最好被看成互补层，而不是简单替代层。

## 10.6 Honcho 与 OpenViking：external memory provider 之间也有显著差异

前面说 external provider 是 richer adaptive layer，但它们内部也不一样。

### Honcho 更像什么

从 `plugins/memory/honcho/__init__.py` 可以确认：

1. 有 `recall_mode = context | tools | hybrid`
2. 有 first-turn context baking
3. 有 cost-awareness cadence（context/dialectic cadence）
4. 有 `tools-only` 延迟初始化模式
5. `system_prompt_block()` 会根据 recall_mode 改变 agent 的使用模式
6. `prefetch()` / `queue_prefetch()` 带有明确的 auto-injection 语义

也就是说，Honcho 更像一个 **带策略层的认知型 memory provider**。

### OpenViking 更像什么

从 `plugins/memory/openviking/__init__.py` 可以确认：

1. 有自己的知识库与 session
2. 有 `prefetch()` / `queue_prefetch()`，但更偏搜索结果预热
3. `sync_turn()` 记录对话 turn
4. `on_session_end()` 通过 commit 触发 memory extraction
5. 明确提到会提取 profile、preferences、entities、events、cases、patterns
6. `on_memory_write()` 会把 builtin memory 写入镜像过去

也就是说，OpenViking 更像一个 **带自动提取器的外部知识基座**。

### 一个更细的结论

- Honcho：更强调 user modeling / dialectic reasoning / recall policy
- OpenViking：更强调 external knowledge base / session commit / extraction categories

这说明“external provider”本身也不是一个统一范畴，它内部仍然分不同的 memory philosophy。

## 10.7 Background review agent：现在已经能确认的完整行为链

从 `run_agent.py` 可以确认这条链路已经相当具体：

1. 主任务完成
2. 判断 `_should_review_memory` / `_should_review_skills`
3. 触发 `_spawn_background_review(...)`
4. 根据触发源选择 `_MEMORY_REVIEW_PROMPT`、`_SKILL_REVIEW_PROMPT` 或 `_COMBINED_REVIEW_PROMPT`
5. 启动一个新的 `review_agent`
6. 这个 agent 会继承当前模型、provider、memory store，但把 nudge interval 清零，防止递归 review
7. review agent 跑一轮 `run_conversation()`
8. 主线程扫描 review agent 的 tool messages，抽取成功动作

这说明当前的 learning loop 已经不是“模型可能会记住”，而是：

> 主任务之后，系统确实会起一个后台反思 agent，
> 让它专门决定要不要固化 memory 或 skill。

## 10.8 但这个 background review 仍然有现实边界

从 issue 线索还能看到两个重要限制：

1. 它可能继承了当前 turn 的 cheap model，导致不会真正调用 tool
2. 在 smart routing / gateway 场景下，可能出现 review 不触发或效果不稳定

所以更准确的说法应该是：

- background review 已经是内置机制
- 但它仍是一个有现实失败模式的机制

这也是专家 skill 以后必须提醒用户的点：
“有 background review” 不等于 “有可靠 reflection pipeline”。

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
