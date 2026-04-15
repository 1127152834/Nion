# Hermes Agent 设计哲学总论

最后更新：2026-04-15

## 一句话概括

Hermes 不是“把模型包成助手”，而是“把模型放进一个长期运行、可治理、可学习的软件系统里”。

## 1. 它想解决的不是回答质量，而是 agent 生命周期

从 README、官网和 release 叙事看，Hermes 试图解决的是下面这些问题：

1. 一次对话结束后，系统怎么不把经验丢掉。
2. 长上下文下，系统怎么不在 token 成本和稳定性上崩掉。
3. 同一个 agent 怎么同时服务 CLI、IM、API 和定时任务，而不失去会话连续性。
4. 一个 agent 怎么在长期使用中逐步学会用户偏好、工作方式和重复流程。
5. 一个真实会执行命令、读写文件、联网搜索的 agent，怎么不把自己变成安全事故。

这说明 Hermes 的设计出发点不是“让回答更像人”，而是“让一个 agent 能像系统一样长期活着”。

## 2. Hermes 的基本世界观：agent 是 runtime，不是 prompt

很多 agent 项目看上去是在做“提示词工程 + 工具调用”。  
Hermes 的思路更接近：

1. 有一个统一 provider/runtime resolver
2. 有一个会话与 session persistence 系统
3. 有一个 prompt assembly 系统
4. 有一个 tool registry 和 toolset 系统
5. 有一个 memory / user modeling 系统
6. 有一个 skills / learning loop
7. 有一个 gateway / cron / API server / MCP server 作为入口层
8. 有一整套安全与权限边界

Prompt 只是这个 runtime 里的一层，不是全部。

## 3. Hermes 把“学习”定义为系统行为，而不是模型神迹

Hermes 之所以强调 self-improving，不是因为模型会自动内省进化，而是因为它具备把经验沉淀成结构化资产的能力。

这些资产至少包括：

1. `MEMORY.md`：环境、项目、工具怪癖、稳定事实
2. `USER.md`：用户身份、偏好、工作方式、沟通风格
3. 会话数据库：跨 session 的可搜索历史
4. skills：从复杂任务中抽出的稳定流程
5. Honcho 用户模型：更长期、更高阶的用户理解

所以 Hermes 的“成长”不是玄学，而是：

- 经验被写下来
- 经验能被找回来
- 经验能被流程化
- 经验能在未来的任务里再次使用

## 4. Hermes 的设计哲学是“按层分工”，不是“全塞进上下文”

Hermes 很强的一点，是它几乎在每个子系统里都坚持分层：

### Prompt 分层

- `SOUL.md` 负责身份 / voice / stance
- system prompt 负责通用运行时规则
- session state 负责本轮动态状态
- context 层负责召回的外部材料
- recent turns 负责短期对话连续性
- user message 负责当前意图

### Memory 分层

- 持久文件记忆
- 会话数据库记忆
- 用户模型记忆
- procedural memory

### 扩展点分层

- general plugins
- memory providers
- context engines

### 入口分层

- CLI
- gateway / messaging
- API server
- MCP server
- cron

这说明 Hermes 的基本哲学是：

> 不让单一机制背负所有语义，而是让不同层承担不同职责。

## 5. Hermes 的深层原则：长期稳定信息默认存在，临时信息按需召回

一个成熟 agent 必须处理两类信息：

1. 稳定且高频有用的信息
2. 临时且仅在特定任务相关的信息

Hermes 对这两类信息的处理方式明显不同：

- 用户身份、人格、基础偏好、核心环境知识，倾向于进入稳定层
- 历史对话、旧任务细节、检索材料、网页内容，倾向于按需召回

这比“全量带历史”或“全靠向量检索命中”都更合理，因为它减少了两种常见失败：

1. 该默认知道的东西，每次都想不起来
2. 不该常驻的东西，持续污染上下文

## 6. Hermes 的 runtime 目标是“服务连续性”，不是“单入口体验”

官网和 README 反复强调：

- not tied to your laptop
- talk to it from Telegram while it works on a cloud VM
- scheduled automations
- gateway / API / MCP

这背后是一个非常关键的设计转向：

> agent 不应该被 UI 绑定，UI 只是入口。

所以 Hermes 更像：

- 一个常驻后台 runtime
- 多个前端和消息入口
- 一组长期持续的数据资产

而不是一个桌面聊天应用。

## 7. Hermes 的成熟度体现在它承认“agent 会失控”，因此主动构建治理层

一个能执行命令、改文件、调模型、联网搜索、接消息平台的 agent，如果没有治理层，实际不可用。  
Hermes 在这个问题上明显比很多项目更现实：

1. 它有 command approval
2. 它有 secret redaction
3. 它有 credential directory protection
4. 它有 SSRF / exfiltration 防护
5. 它有 profile isolation
6. 它有压缩失败、gateway race、approval routing 等大量 reliability hardening

这说明 Hermes 不是把 agent 当 demo，而是当 production runtime 看待。

## 8. 对我最重要的启发

如果要真正学 Hermes，应该学的是下面这些原则，而不是只抄表层功能：

1. 把 agent 当 runtime 设计，不当聊天壳设计。
2. 让稳定知识默认存在，让临时知识显式召回。
3. 让经验落地成文件、数据库、技能或模型，而不是只停留在一轮回答里。
4. 把 prompt、memory、compression、安全都看作系统工程，而不是局部 patch。
5. 让多入口服务的是同一个 agent 生命周期，而不是多个彼此割裂的入口。
