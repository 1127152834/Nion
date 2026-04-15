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

## 2026-04-15 第二轮源码级研究

### 本轮目标

把 Hermes 从“设计轮廓”推进到“源码级架构认识”，并且开始抽取将来构建 agent 应用专家 skill 所需的方法论。

### 本轮新增材料

1. 官方 developer guide 源 markdown：
   - `architecture.md`
   - `agent-loop.md`
   - `prompt-assembly.md`
   - `context-compression-and-caching.md`
   - `tools-runtime.md`
   - `session-storage.md`
   - `provider-runtime.md`
   - `delegation.md`
   - `memory.md`
2. 核心源码文件：
   - `run_agent.py`
   - `agent/prompt_builder.py`
   - `agent/context_engine.py`
   - `agent/context_compressor.py`
   - `agent/memory_provider.py`
   - `tools/memory_tool.py`
   - `model_tools.py`
   - `tools/registry.py`
   - `hermes_state.py`
   - `plugins/memory/honcho/__init__.py`
3. issue / release 线索：
   - memory prefetch contamination
   - pluggable memory provider
   - profile isolation
   - compression death spiral

### 本轮最重要的认识变化

#### 1. Hermes 真正的中心是 runtime contract，不是 feature list

以前的理解还是偏“功能架构图”。
这轮看完源码与 developer guide 后更清楚了：Hermes 真正的骨架是几组 contract：

1. `AIAgent`
2. `ContextEngine`
3. `MemoryProvider`
4. `ToolRegistry`
5. SessionDB / session lineage
6. runtime provider resolution

所以 Hermes 能持续演化，不是因为它 feature 多，而是因为这些 contract 比较清楚。

#### 2. Hermes 很多设计选择，本质上是在为“稳定前缀”服务

这轮最深的感受是：
大量架构选择都指向同一个目标：

- prompt 只在 session 起点构建
- memory snapshot 冻结
- skill 只注入 index
- dynamic overlay 不进 cached system prompt
- context files 有优先级、有截断、有安全扫描

也就是说，Hermes 的很多设计不是孤立 best practice，而是围绕同一个 prefix/cache 哲学协同出来的。

#### 3. 真正强的 agent 架构，必须把“设计张力”显式化

memory prefetch contamination、compression death spiral、fallback auth bug、memory provider bridge 缺失，这些 bug 很有教育意义。
它们说明 Hermes 真正难的地方不是“有没有这些能力”，而是：

1. recall 放在哪一层注入
2. compression 何时触发、如何失败
3. memory provider 如何和 agent loop 正确耦合
4. 多入口 runtime 怎么共享状态又不相互污染

这也让我确认：未来那个专家 skill 必须讲 tradeoff，而不能只讲功能清单。

### 本轮新增产物

新增了三页：

1. `source-code-architecture.md`
2. `agent-design-patterns.md`
3. `design-tensions-and-tradeoffs.md`

它们分别回答：

1. Hermes 的关键源码对象和骨干链路是什么
2. 哪些模式可以迁移到别的 agent 应用
3. 这些模式背后有哪些真实张力

### 下一步研究方向

下一轮最值得做的是三件事：

1. 沿着官方 developer guide 继续拆 `gateway-internals`、`cron-internals`、`memory-provider-plugin`、`context-engine-plugin`
2. 结合更多 issue / PR，把“架构演化史”整理出来
3. 开始反推“agent 应用专家 skill”的知识架构，而不是等学完后再临时归纳
