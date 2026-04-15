# Hermes Research Log

最后更新：2026-04-15

这个文件记录研究路径、假设修正和阶段性判断，保留思考过程，而不把过程污染到主题页里。

## 2026-04-15 第一轮扩展研究

### 研究目标

把 Hermes 学透，不停留在 Memory / Soul，而是覆盖：

1. runtime 架构
2. prompt assembly
3. memory 与 user modeling
4. skills 与学习闭环
5. context compression
6. delegation / subagent
7. gateway / service 化
8. plugin / profiles
9. cron / automation
10. security 边界

### 执行路径

1. 先读取仓库内已有笔记，避免重复研究。
2. 使用 `Agent Reach` 指定的网页抓取方式和 Tavily API 做多源检索。
3. 以官方 README、官网、release note 为主骨架。
4. 用社区文章补“别人为何觉得 Hermes 值得学”的视角，但不让社区材料反客为主。
5. 在 `docs/hermes-wiki` 建立主题化知识库，而不是追加一篇大杂烩长文。

### 关键发现

#### 1. Hermes 的自我定位非常清楚

README 直接把 Hermes 定义成：

- self-improving AI agent
- the only agent with a built-in learning loop
- not tied to your laptop
- lives on your server
- remembers what it learns

这说明 Hermes 的第一设计目标不是“像一个好用聊天框”，而是“成为一个常驻、可持续累积能力的 agent runtime”。

#### 2. Hermes 的“学习”不是神秘过程，而是几条明确机制的组合

目前可以较高置信地把它拆成：

1. `MEMORY.md` / `USER.md` 的显式持久化
2. FTS5 session search 的跨会话检索
3. skills 的生成、沉淀、更新
4. Honcho 用户建模
5. cron / gateway 让 agent 能在长期周期中继续工作

也就是说，“会成长”并不是一句 marketing 文案，而是一个由若干数据结构和工作流组成的系统行为。

#### 3. Prompt 设计被 Hermes 当成运行时工程，而不是提示词写作

官方和社区都反复强调 prompt assembly、layered prompt、cache efficiency。  
这说明 Hermes 把 prompt 看成：

- 指令层级系统
- token 成本系统
- KV cache 复用系统
- session state 注入系统

这和很多 agent 项目“在一个大 system prompt 里不断堆东西”的做法完全不同。

#### 4. Skills 在 Hermes 里是经验复用机制，而不是功能菜单

README 和多篇社区解读都把 skills 放在 learning loop 的核心位置。  
这意味着 Hermes 不是简单地提供“工具 + prompt”，而是把复杂任务中抽出的稳定流程沉淀为可反复调用的 procedural memory。

#### 5. Hermes 明显把 service 化与多入口视作本体能力

CLI、Telegram、Discord、Slack、WhatsApp、Signal、Email、API Server、MCP Server、Cron 都不是外围插件，而是官方主叙事的一部分。  
这个项目的真正野心是把 agent 从单入口交互界面里解放出来。

### 假设修正

#### 旧假设：Hermes 只是把 OpenClaw 的 persistent memory 做得更完整

修正后判断：不对。  
Hermes 的重点不是“更强记忆”，而是“把 memory、skills、profiles、gateway、cron、API server、安全边界拼成一个完整 runtime”。

#### 旧假设：Hermes 的差异化主要是人格与用户画像

修正后判断：不够。  
人格与画像只是其中一层。真正差异化的是：

1. prompt 分层与缓存
2. service 化入口
3. pluggable memory / context engines
4. profile isolation
5. 可运营的安全硬化

#### 旧假设：Hermes 是偏产品侧的 agent

修正后判断：一半对，一半错。  
它产品感很强，但底子其实是高度工程化的 runtime，而不是简单产品包装。

### 当前仍待核实的问题

1. Prompt Assembly 的精确层序和每层缓存/非缓存边界，还需要后续在源码中进一步核验。
2. Context compressor 与 plugin context engine 的接口 contract，最好后续直接读代码确认。
3. Honcho 集成后到底承担多少 user modeling 职责，哪些仍留在 `USER.md`，需要进一步拆清。
4. 子 agent 的 terminal / tool isolation 在运行时里是怎样落到具体 backend 的，还需要读源码和测试说明。

### 当前阶段结论

Hermes 的核心价值不在于“让模型多会做事一点”，而在于把 agent 设计成一个可以长期存在的软件系统：  
能记、能检索、能压缩、能调度、能隔离、能治理、能跨入口持续服务用户。
