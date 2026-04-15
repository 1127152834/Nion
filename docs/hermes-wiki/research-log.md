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

## 2026-04-15 第三轮服务层与插件层研究

### 本轮目标

补齐我自己前面明确承认还不够的部分：

1. gateway
2. cron
3. provider runtime
4. memory/context plugin contract
5. 更像“专家 skill 预备材料”的知识架构

### 本轮新增材料

#### 官方 developer guide

1. `gateway-internals.md`
2. `cron-internals.md`
3. `memory-provider-plugin.md`
4. `context-engine-plugin.md`
5. `plugins.md`
6. `credential-pools.md`
7. `fallback-providers.md`

#### 核心源码

1. `gateway/run.py`
2. `gateway/session.py`
3. `cron/scheduler.py`
4. `hermes_cli/runtime_provider.py`
5. `agent/auxiliary_client.py`

#### 关键 issue 线索

1. gateway oversized session / hygiene
2. queued message overwrite
3. approval interception ambiguity
4. cron delivery silent failure
5. cron run hang after output
6. memory prefetch contamination
7. fallback not triggered on auth failure

### 本轮最重要的认识变化

#### 1. Hermes 的“服务性”不是副产物，而是主设计目标之一

看完 `gateway-internals` 和源码后，这件事已经很清楚：

- gateway 不是 transport glue
- 它是会话路由、忙时输入、中断协议、审批路由、适配器生命周期、交付路径的中心

也就是说，Hermes 从一开始就不是只为 CLI 准备的。

#### 2. Hermes 的时间模型比我之前理解的更完整

cron 不是“调度一个 prompt”，而是：

1. fresh session
2. 可附带 skills
3. 可附带 script
4. 有 provider recovery
5. 有 delivery model
6. 有 recursion guard

这说明 Hermes 其实在解决一个更大问题：

> agent 如何在没有用户即时输入的情况下，仍然以受控方式行动。

#### 3. Plugin system 真正厉害的地方，不是 extensibility，而是 strategy isolation

这轮让我更确定：

- general plugins 是并列能力
- memory providers 是长期知识策略
- context engines 是上下文管理策略

Hermes 不是简单做成“都能插件化”，而是很明确地把可变性分层了。

#### 4. Runtime provider 这层比我之前预期更像基础设施中枢

不只是 main model 会用到它，auxiliary tasks、cron、gateway 都在用。
这意味着 provider runtime 不只是“配置解析”，而是整个 agent runtime 的认证、路由、fallback、pooling 总线。

#### 5. 真正的设计哲学很多藏在 issue 里，而不是文档里

比如：

1. approval routing 错误说明“中断与审批”是协议问题
2. cron silent failure 说明执行成功与交付成功必须分开建模
3. memory prefetch contamination 说明动态 recall 注入层选择会直接伤 prompt correctness
4. fallback auth failure 说明运行时解析的分层顺序本身就是架构点

这让我更加确定：
未来 expert skill 必须吸收“失败模式语料库”，不能只吸收官方 happy path。

### 本轮新增产物

新增了三页：

1. `service-runtime-and-time-model.md`
2. `plugin-and-provider-architecture.md`
3. `expert-skill-blueprint.md`

其中前两页继续拆 Hermes，本身仍是学习成果。
最后一页开始反推未来 skill 的知识模块骨架。

### 当前判断

现在我对 Hermes 的理解，已经开始从“理解一个项目”转向“从这个项目里提炼 agent 系统设计学”。
但还没到可以正式制作 skill 的程度，下一步最关键的是：

1. 继续整理演化史
2. 引入跨系统对照
3. 再做一次知识架构收束

## 2026-04-15 第四轮演化史与跨系统对照研究

### 本轮目标

把 Hermes 从“一个值得学习的项目”继续推进成“一个可被转译为通用 agent 架构教材的案例”。
这轮重点不再是补单一模块，而是：

1. 看 Hermes 是怎么演化到今天的
2. 看哪些思想是 Hermes 独有，哪些是更普遍的 agent 范式
3. 把这些内容转成未来 expert skill 的审查框架

### 本轮新增材料

#### Hermes 自身演化材料

1. `RELEASE_v0.6.0.md`
2. `RELEASE_v0.7.0.md`
3. gateway / cron / approval / fallback / memory provider 相关 issue 摘要

#### 跨系统对照材料

1. Anthropic skills cookbook README
2. OpenAI Codex README 与开发者文档摘要
3. OpenClaw 二手架构资料与既有内部学习笔记
4. Claude Code / prompt caching 公开文章摘要

### 本轮最重要的认识变化

#### 1. Hermes 的演化主线已经很清楚

从 `v0.6.0` 到 `v0.7.0`，它的收敛路径大致是：

1. 多实例、多入口、可部署
2. 然后是 provider / gateway / profile / session 统一
3. 再然后开始对 memory、compression、安全、delivery、approval 做 resilience hardening

这说明 Hermes 的设计哲学不是先有完美蓝图，而是先把 runtime 做成真的长期系统，再被生产现实逼着把 contract 做硬。

#### 2. Claude Skills / Codex / OpenClaw / Hermes 分别代表不同层次

现在我越来越确定，它们不是简单竞品，而是分别代表：

1. **Claude Skills**：capability packaging / progressive disclosure
2. **Codex / Claude Code**：task runtime / local execution / cache-friendly orchestration
3. **Hermes / OpenClaw**：persistent service runtime / memory / service surface / long-lived governance

这个分层一旦想清楚，未来 expert skill 的定位就更明确了：
不能只偏任何一边，必须把三层范式组合起来。

#### 3. 真正强的 expert skill 必须内置失败模式语料

以前我觉得 expert skill 主要是知识框架。
现在更明确了：不够。

它还必须显式内置：

1. 反模式
2. 失效模式
3. 设计评估问题

否则它只能输出“看起来合理”的建议，无法防止用户把系统做成 demo 级空壳。

### 本轮新增产物

新增三页：

1. `evolution-and-failure-corpus.md`
2. `cross-system-comparison.md`
3. `expert-skill-review-framework.md`

这三页分别负责：

1. 让 Hermes 不只是静态结构，而是有演化史和失败语料
2. 让专家 skill 不会变成“Hermes 复读机”
3. 让未来的 skill 具备审查和诊断能力，而不只是说明能力

### 当前判断

到这一轮为止，我已经不只是“继续补知识”，而是在把这些知识重组为一个未来可执行的专家系统骨架。
还没到正式创建 skill，但已经非常接近“可以进入 skill 设计前夜”的阶段。
