# Agent 应用专家 Skill 的审查框架

最后更新：2026-04-15

这页用于反推：未来的“agent 应用专家 skill”在输出架构建议时，应该内置什么审查框架，避免只给漂亮但空心的方案。

## 1. 先判断用户在造哪一类 agent

专家 skill 第一步不该直接给方案，而应该先分类。

至少要分：

1. **Capability agent**：以技能、工作流、专长封装为主
2. **Task runtime agent**：以本地执行、工具编排、代码工作流为主
3. **Persistent service agent**：以长期运行、多入口、记忆、调度为主
4. **Hybrid agent**：同时具备两层或三层特征

不同类型，架构重点完全不同。

## 2. 八大设计面审查

### 1. Runtime Boundary

必须问：

- 什么是 turn？
- 什么是 session？
- session 何时开始、何时结束、何时 fork、何时 reset？

### 2. Prompt / Context Boundary

必须问：

- 稳定前缀是什么？
- 什么内容 frozen snapshot？
- 什么内容是 ephemeral overlay？
- 动态 recall 注入到哪一层？

### 3. Memory Boundary

必须问：

- 哪些默认知道？
- 哪些按需检索？
- 哪些要变成 procedural memory？
- memory provider 是单实现还是 contract？

### 4. Tool Boundary

必须问：

- 哪些是 registry tools？
- 哪些必须是 agent-core tools？
- toolsets 如何组织？
- dangerous operations 如何审批？

### 5. Delegation Boundary

必须问：

- child agent 是共享上下文还是 fresh context？
- 允许什么 side effects？
- 回流什么，不回流什么？

### 6. Service / Time Boundary

必须问：

- 是否有多入口？
- session key 如何定义？
- 是否有 cron / heartbeat / background run？
- 执行结果如何交付？

### 7. Extension Boundary

必须问：

- 系统允许哪些扩展类型？
- 哪些可多选，哪些必须单选？
- provider / memory / context strategy 如何切换？

### 8. Failure Boundary

必须问：

- 最可能出现什么失效模式？
- 哪些问题在 auth 层发生？
- 哪些问题在 prompt 层发生？
- 哪些问题在 delivery 层发生？

## 3. 专家 skill 必须内置的反模式清单

### 反模式 1：Everything in the system prompt

表现：

- 人格、项目规则、动态状态、历史总结、临时提示全部塞在一个大 prompt 里

后果：

- cache 全碎
- 语义混层
- debug 极其困难

### 反模式 2：Memory as a bag of facts

表现：

- 把所有东西都存 memory
- 不区分 user profile / environment / episodic history / procedural memory

后果：

- 真正重要的信息被淹没
- prompt 体积不断膨胀

### 反模式 3：Tools without runtime boundaries

表现：

- 把修改 agent 自身状态的工具也当作普通工具调用处理

后果：

- 状态同步混乱
- 难以做 session correctness

### 反模式 4：Subagents that share muddy context

表现：

- 子 agent 默认继承大量脏上下文

后果：

- 错误传播
- 上下文污染加倍

### 反模式 5：Cron that reuses ambiguous conversation state

表现：

- 定时任务继承不清晰的旧对话上下文

后果：

- 行为不可预测
- 自动任务逐渐失控

### 反模式 6：Fallback only at the model-call layer

表现：

- 以为模型调用失败时 fallback 就够了

后果：

- auth / runtime resolution 层失败直接把 fallback 绕死

### 反模式 7：Delivery treated as success by default

表现：

- 只要 agent 有文本输出就当成功

后果：

- 用户根本没收到消息，但系统显示成功

### 反模式 8：Plugin system without trust boundaries

表现：

- 任意 bundle / plugin / path / external source 都可加载

后果：

- path traversal
- secret leakage
- tool poisoning

## 4. 专家 skill 输出建议时应带的结构

未来 skill 给用户输出时，至少应包含：

1. 你在造哪类 agent
2. 你的核心 runtime contract 是什么
3. 你当前最大的 3 个架构风险
4. 你最应该明确的 3 个边界
5. 你当前最危险的 3 个反模式
6. 推荐的最小可行架构
7. 后续可演化路径

## 5. 评估一个 agent 架构是否成熟的简单标准

如果一个方案能回答下面这些问题，才算开始成熟：

1. 系统在什么层持久化什么信息？
2. 系统在什么层允许中断？
3. 系统在什么层允许 fallback？
4. 系统在什么层定义身份？
5. 系统在什么层承载临时 recall？
6. 系统在什么层记录 lineage？
7. 系统在什么层做 delivery？

如果回答不出来，通常说明方案还停留在 demo 层。
