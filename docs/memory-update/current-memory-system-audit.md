# 当前记忆系统审计

## 1. 审计范围

本文件只讨论当前仓库里**真实存在且仍有源码接线**的记忆相关能力，不把历史设计稿直接当成现状。

## 2. 已确认事实

以下结论来自当前仓库代码与 README，而不是推测。

### 2.1 当前主链路仍是多套机制并存

Nion 当前与记忆相关的主链路主要由四部分组成：

1. `memory.json`
   - 由 [backend/packages/harness/nion/agents/memory/storage.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/storage.py) 的 `FileMemoryStorage` 负责持久化。
   - 默认路径由 [backend/packages/harness/nion/config/paths.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/config/paths.py) 定义为 `~/.nion-data/memory.json`。
2. `recall.sqlite3`
   - 由 [backend/packages/harness/nion/recall/local_archive.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/recall/local_archive.py) 维护，用 SQLite FTS5 做对话召回。
3. OpenViking notebook chunk 检索
   - 由 [backend/packages/harness/nion/openviking/chunk_store.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/chunk_store.py) 和 [backend/packages/harness/nion/openviking/runtime_retriever.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/openviking/runtime_retriever.py) 提供 notebook chunk 搜索。
4. `SOUL.md`
   - 由 [backend/packages/harness/nion/agents/lead_agent/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py) 在 prompt 中单独注入。

### 2.2 结构化长期记忆仍以 `memory.json` 为中心

[backend/packages/harness/nion/memory_payloads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/memory_payloads.py) 当前定义的 canonical payload 主要包含：

- `user.workContext`
- `user.personalContext`
- `user.topOfMind`
- `history.recentMonths`
- `history.earlierContext`
- `history.longTermBackground`
- `facts[]`

这说明当前的长期记忆模型本质上仍然是：

- 几段摘要
- 一组事实条目

它还不是 richer user model，也不是 memory graph。

### 2.3 记忆更新已经有异步抽取与去抖

[backend/packages/harness/nion/agents/middlewares/memory_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/memory_middleware.py) 会在 agent 响应后：

- 过滤 tool 中间消息
- 清理上传文件块
- 识别用户纠正信号
- 把对话送进 memory update queue

[backend/packages/harness/nion/agents/memory/queue.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/queue.py) 则提供：

- debounce
- 批量处理
- 异步更新

[backend/packages/harness/nion/agents/memory/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/prompt.py) 里的 `MEMORY_UPDATE_PROMPT` 负责把对话总结成：

- context summary
- history summary
- newFacts
- factsToRemove

### 2.4 Prompt 注入已经打通

[backend/packages/harness/nion/agents/lead_agent/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py) 当前会把 memory 注入 `<memory>` 段，把 soul 注入 `<soul>` 段。

这意味着 Nion 已具备：

- 记忆写回
- 记忆读取
- prompt 注入

不是纯展示型 memory。

### 2.5 Recall 与 Memory 已经部分分层

[backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/recall_capture_middleware.py) 负责把最近一轮问答写入 recall。

[backend/packages/harness/nion/agents/middlewares/continuity_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/continuity_middleware.py) 会在模型调用前：

- 搜 thread recall
- 按需搜 notebook chunks
- 把召回结果组装为 continuity context block

这说明当前系统已经不是把所有东西都塞进一个记忆文件里，而是开始区分：

- durable memory
- transcript recall
- notebook retrieval

### 2.6 历史上设计过 Memory OS / heartbeat / self-maintenance，但当前主链路已不在

仓库里仍有多份文档描述：

- provider-based Memory OS
- heartbeat
- self-maintenance
- compaction / rebuild
- AutoDream 向 self-maintenance 收敛

但从当前代码树看：

- `backend/packages/harness/nion/heartbeat/`
- `backend/packages/harness/nion/memory_os/`
- `backend/packages/harness/nion/self_maintenance/`

现在基本只剩 `__pycache__`，没有对应源码文件继续挂在主链路上。

同时当前网关只保留了：

- [backend/app/gateway/routers/memory.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/memory.py)
- [backend/app/gateway/routers/recall.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/app/gateway/routers/recall.py)

没有 heartbeat / self-maintenance / provider runtime 的活跃 API surface。

结论很直接：

**今天真实在线的记忆系统，仍然是 `memory.json + recall.sqlite3 + notebook retrieval + soul 注入` 的组合。**

## 3. 当前系统的亮点

### 3.1 它不是单一记忆桶

当前 Nion 已经自然拆出了几类不同性质的上下文：

- 结构化长期记忆
- 对话召回
- notebook 资料检索
- agent soul

这比“所有东西都进一个向量库”更健康。

### 3.2 已经有 durable memory 与 ephemeral context 的边界意识

例如 memory middleware 和 updater 明确处理：

- tool 中间产物不入长期记忆
- upload block 不进入长期记忆
- session-scoped 文件路径不应污染 durable memory

这说明系统已经开始避免“脏记忆”。

### 3.3 有 prompt 级消费能力，不只是存储

当前 memory 并不是只存在 API 和设置页中，而是真正进入 agent prompt。

这意味着：

- 记忆可以影响回答风格
- 记忆可以影响任务上下文
- 后续升级时不需要重新发明注入入口

### 3.4 已有 per-agent memory 能力

[backend/packages/harness/nion/agents/memory/storage.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/memory/storage.py) 支持 agent 级 `memory.json`。

这为后面做：

- 主助手的自我记忆
- notebook assistant 的域内记忆
- 未来 specialized assistant 的局部记忆

留下了边界基础。

### 3.5 Notebook 与 Memory 的边界正在变清楚

README 与近期内部设计稿都反复强调：

- Notebook 是用户资产
- Memory 是给 agent runtime 用的

这是非常重要的产品判断。否则后续“第二大脑”一定会塌成一个巨型混合仓。

## 4. 当前系统的缺点

### 4.1 还不是统一 Memory OS，而是并存机制

现在的主要问题不是“没有记忆”，而是：

- 各层机制存在
- 但没有统一的 memory runtime contract

结果是：

- 记忆怎么写、怎么升格、怎么淘汰，还没统一
- 不同 memory surface 的时序关系也没统一
- 无法自然承接 heartbeat / self-maintenance / self-upgrade

### 4.2 `memory.json` 模型太薄，支撑不了陪伴型助手

现在的 schema 更像“摘要 + facts 列表”，不够表达下面这些对象：

- 用户职位与职责结构
- 工作节律
- 沟通风格
- 稳定兴趣
- 长期目标
- 高置信服务偏好
- 关系边界和互动约束
- 用户需求簇
- 需学习的服务领域

也就是说，它能记一些信息，但还无法形成真正的 `User Model`。

### 4.3 缺少“时间”与“状态变化”语义

当前 facts 没有很好表达：

- 什么时候成立
- 什么时候失效
- 是否已被更新/覆盖
- 最近多久被引用过
- 是否只是临时兴趣

这会导致“旧事实挂着不死”，也不利于做淘汰和归档。

### 4.4 缺少后台自我维护回路

你想要的能力里最关键的一层是：

- agent 自己写日记
- 自己做反思
- 自己维护学习计划
- 自己把高频经验沉淀成 skill / procedure

而当前主链路里并没有一个活跃的：

- heartbeat scheduler
- self-maintenance service
- reflective maintenance loop

这意味着当前系统仍然主要是“被动记忆”，不是“主动成长”。

### 4.5 缺少 agent 自己的记忆空间

当前的 `memory.json` 主要还是围绕“用户信息”和“对话总结”。

还没有清晰建模下面这些 agent-owned artifacts：

- assistant diary
- learning plan
- skill crystallization notes
- service playbooks
- failure postmortems
- growth milestones

没有这层，就很难做“灵魂”“自我升级”“成长可见”。

### 4.6 缺少记忆升级链路：记忆 -> 计划 -> 技能 -> 自动化

现在的链路主要是：

- 对话
- 抽取 memory
- 注入 prompt

但你要的 personal agent 需要更强的演化链：

1. 高频问题被识别成长期服务主题
2. 长期服务主题生成学习计划
3. 学习结果沉淀为 procedure / skill
4. procedure 驱动新的自动化或服务模板

这条链当前还不存在。

### 4.7 缺少系统性遗忘机制

你提到很重要的一点：

- 很久不用的知识先归档
- 更久不用再删除

当前系统没有完整支持：

- `last_used_at`
- decay score
- archive candidate
- delete candidate
- invalidated / superseded

因此记忆容易只增不减。

### 4.8 缺少“用户任务”和“agent 自发任务”的治理边界

这是你这次想法里非常关键但现状缺失的一点。

当前自动化与记忆之间没有明确 runtime contract 去区分：

- 用户创建的任务
- agent 自发形成的学习/维护任务

而你希望：

- 用户创建的可编辑
- agent 创建的用户只能开关，不能修改

这需要任务 ownership model，当前并不存在。

### 4.9 `soul` 仍然是静态注入，不是可演化人格工件

今天的 `SOUL.md` 更像静态人格/身份文本。

它还没有进入：

- reflective proposal
- 版本化人格更新
- 用户长期偏好驱动的人格微调
- 行为准则演进

所以它还不是真正意义上的“灵魂系统”。

### 4.10 当前 recall 对中文 personal agent 不够友好

[backend/packages/harness/nion/recall/local_archive.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/recall/local_archive.py) 当前的 query normalization 主要依赖：

- `[A-Za-z0-9_]+`
- ASCII token 拼接

这意味着：

- 英文关键词召回相对自然
- 中文长句、中文主题词、混合中文表达的 thread recall 质量会偏弱

而 Nion 的真实用户场景明显包含大量中文办公与中文陪伴式对话。

这不是小问题，而是 personal agent 质量问题，因为它会直接削弱：

- 用户长期主题识别
- 中文语境下的连续服务
- 反思与学习候选发现

也就是说，哪怕暂时不重做整个 Memory OS，中文 recall / continuity 的检索能力也已经是当前主链路里的硬缺口。

## 5. 结论

当前 Nion 的记忆系统已经有不错的基础，但它更像：

**一套可用的记忆基础设施雏形**

而不是：

**一个能支撑陪伴型 personal agent 成长、自我维护、自主学习和长期懂用户的 Memory OS**

如果要进入下一阶段，升级重点不应是继续给 `memory.json` 打补丁，而应是：

1. 先建立统一的 memory runtime contract。
2. 再补 heartbeat / self-maintenance / archive / skill crystallization。
3. 最后把 soul、自动化、主动学习纳入同一成长回路。
