# Hermes Runtime Architecture

最后更新：2026-04-15

## 1. 为什么说 Hermes 是 runtime，而不是单体助手

从官方 README、Architecture 页面摘要和 release note 可以看出，Hermes 至少由以下几个核心层构成：

1. provider/runtime resolver
2. prompt assembly
3. tool registry + toolsets
4. session persistence
5. memory/user model
6. gateway / messaging adapters
7. cron / background automation
8. API server / MCP server
9. profiles / multi-instance isolation
10. security and reliability hardening

这意味着 Hermes 的系统边界远大于一次模型调用。

## 2. 入口层：不是一个 UI，而是一组统一接入面

Hermes 官方明确支持：

- CLI
- Telegram
- Discord
- Slack
- WhatsApp
- Signal
- Email
- API Server
- MCP Server
- Cron

这不是“周边集成很多”，而是在说同一个 agent runtime 可以被多个入口驱动。  
真正连续的是 agent，本轮交互只是入口事件。

## 3. Session Persistence 是骨干，不是附属

Tavily 对官方文档和 DataCamp 教程摘要都指向同一个事实：Hermes 使用 SQLite + FTS5 做 session persistence 和搜索。  
这个设计非常关键，因为它让 Hermes 拥有了：

1. 跨 session 检索能力
2. 历史召回能力
3. 与持久记忆文件相区分的“对话事实层”

也就是说，Hermes 不用把所有历史直接塞进 prompt，也不用完全依赖脆弱的即时总结。

## 4. Provider Runtime Resolver 体现了 Hermes 的“系统工程”取向

Architecture 摘要表明 Hermes 有共享的 provider resolver，用于 CLI、gateway、cron、ACP、auxiliary calls。  
它负责把 `(provider, model)` 解析为实际运行所需的 `(api_mode, api_key, base_url)`。

这个层设计得好，带来几个直接收益：

1. 所有入口共享一套 provider 解析逻辑
2. fallback provider chain 可以统一落地
3. credential pools、OAuth、alias resolution 不需要散落在业务层
4. auxiliary model 也能复用统一运行时

这正是一个成熟 runtime 的风格：把 provider 选择视作基础设施，而不是 UI 菜单。

## 5. Tool Runtime 是 Hermes 的执行核心

Architecture 摘要显示 Hermes 有中心化 tool registry，并按 toolset 组织工具。  
README 也把 toolsets、40+ tools、六种 terminal backends 放在核心能力中。

这里最值得学的不是“工具多”，而是它的边界设计：

1. tool 文件自注册到 registry
2. registry 负责 schema、dispatch、availability、error wrapping
3. 工具能力按 toolset 暴露，减少上下文和权限面
4. terminal backend 可以在 local / Docker / SSH / Daytona / Modal / Singularity 间切换

这说明 Hermes 把执行环境和工具选择抽成了独立层，而不是和 agent loop 紧耦合。

## 6. Profiles：Hermes 把多实例隔离提升到一等能力

`RELEASE_v0.6.0` 的一个大改动是 profiles。  
每个 profile 拥有自己的：

- config
- memory
- sessions
- skills
- gateway service
- token locks

这件事意义很大。  
很多系统默认只有一个“全局我”，导致下面这些东西混在一起：

- 不同用户身份
- 不同工作域
- 不同平台 bot token
- 不同技能集

Hermes 则明确把 profile 做成隔离单元，这本质上是在回答：

> “一个长期运行 agent 如何安全地拥有多个人格 / 多套配置 / 多个服务身份？”

## 7. API Server / MCP Server：Hermes 想成为别的客户端背后的 agent backend

Hermes 不只是自己带 UI，它还支持：

- `hermes mcp serve`
- API server session continuity
- `X-Hermes-Session-Id`
- editor/client 提供的 MCP server 接入

这说明 Hermes 的 ambition 是当“可嵌入的 agent backend”。  
别的编辑器、聊天界面、工作流编排器，都可以把 Hermes 当中枢运行时来用。

## 8. Gateway 不是 transport glue，而是长期对话操作系统的一部分

从 release note 看，gateway 一直是高频强化区域：

- race condition 修复
- approval routing
- flood control
- message threading
- home channel routing
- platform-specific behavior control

这反映出 Hermes 的现实主义：  
只要 agent 真要跑在 Telegram/Slack/Discord 里，gateway 就不是配套小模块，而是直接决定系统稳定性的主链。

## 9. 这套架构的核心取舍

Hermes 选择的不是“最轻”，而是“长期可运营”：

1. 多一个 runtime 层，复杂度会上升
2. 多入口和多 backend，维护成本会上升
3. 加安全和隔离层，开发速度会下降

但换来的能力是：

1. 更强的生命周期连续性
2. 更强的经验累积能力
3. 更强的部署自由度
4. 更真实的 production 可用性

## 10. 对 Nion 的直接启发

如果要从 Hermes 学东西，最应该学的不是“更多功能”，而是下面这些结构性判断：

1. 把 memory、skills、session、profile、gateway 当系统结构，不当 feature。
2. 把多入口一致性放在 runtime 层做，而不是在各入口上各做一套。
3. 把工具运行时、provider 运行时和 prompt 运行时分开。
4. 把 profile isolation 视为长期运行 agent 的基础设施。
