# Claude Code 能力借鉴与复刻路线图

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 以小步快跑但架构正确的方式，把 Claude Code 最有价值的 prompt/runtime contract、tools、skills/plugin/MCP 能力逐步融合进 Nion。

**Architecture:** 不追求表面对齐 Claude Code 的工具数量，而是优先补齐 Nion 在 coding-agent 场景下缺失的 operating model。先做 prompt/runtime contract，再做 SkillTool 与高价值 coding tools，再进入 AgentTool / plugin / MCP 深化，最后收口到统一的运行时与产品体验层。

**Tech Stack:** Python backend, LangGraph/LangChain middleware, FastAPI gateway, Next.js frontend, Electron desktop, MCP integrations

## 研究校正

这份路线图现在应与研究文档一起阅读：

- `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/research/2026-04-01-claude-code-operating-model-for-nion.md`

校正后的总判断是：

- Claude Code 最值得借鉴的是 operating model，而不是 prompt 文本或工具名字表
- Nion 当前并非能力缺失，而是缺少把 prompt、tools、skills、MCP、subagents、diagnostics 收口成同一 runtime contract 的中轴
- 因此实施顺序必须从“运行时 contract”出发，而不是先机械补工具数量

---

## 文件结构

### 研究与设计参考

- Claude Code 关键参考：
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/constants/prompts.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/prompt.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/SkillTool/prompt.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/services/tools/toolExecution.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/services/tools/toolHooks.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/AgentTool.tsx`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/runAgent.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/built-in/exploreAgent.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/built-in/planAgent.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/tools/AgentTool/built-in/verificationAgent.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/utils/plugins/loadPluginCommands.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/skills/loadSkillsDir.ts`
  - `/Users/zhangtiancheng/Documents/项目/agent/claude-code/src/services/mcp/client.ts`

### Nion 当前核心落点

- prompt runtime：
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/prompt.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/lead_agent/agent.py`
- 工具装配与治理：
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/tools.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/catalog.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/guardrails/middleware.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/tool_error_handling_middleware.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/agents/middlewares/deferred_tool_filter_middleware.py`
- skills / subagents / MCP：
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/skills/`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/task_tool.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py`
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/mcp/client.py`

### 本路线图新增/更新目标文件

- 研究文档：
  - `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/research/2026-04-01-claude-code-operating-model-for-nion.md`
- 计划与设计文档：
  - Modify: `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-01-claude-code-replication-roadmap.md`
  - Create later as needed:
    - `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-tool-runtime-contract-design.md`
    - `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-skilltool-design.md`
    - `/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/specs/2026-04-01-plugin-compatibility-design.md`

---

## 总体判断

Claude Code 的能力不应该按“抄 16 个 tool 名字”来复刻，而应该按下面 5 层来推进：

1. **Prompt runtime**：先把 prompt 从大模板收口成 section registry + dynamic boundary
2. **Tool runtime governance**：再补工具执行前后治理、权限、hook、摘要
3. **Execution primitives**：再做 SkillTool、AgentTool、Plan/Verification 的一等运行时语义
4. **Coding-facing tools**：补齐 coding agent 高频工具面
5. **Extension plane**：最后做 plugin 和 MCP 的深度兼容

这个顺序可以保证每一步都对 Nion 有独立价值，不会为了追求 Claude Code 同构而把系统打散，也不会把现有 runtime 推翻重来。

---

## 阶段 0：Prompt Runtime 与 Context Hygiene 打底

### 目标

在继续扩工具和 agent 之前，先把 Nion 的 prompt runtime 从单体模板升级成可治理结构。

### 要补的能力

1. system prompt section registry
2. static / dynamic boundary
3. session-specific guidance 注入点
4. tool summary / todo / skill / reminder 的压缩保留规则

### 为什么必须前置

Claude Code 的稳定性不是工具先带来的，而是 prompt/runtime discipline 先带来的。
如果这层不先立住，后续 SkillTool、plugin、MCP、specialist agents 都只会继续往模板里堆字符串。

### 验收标准

- prompt 不再是一整块模板字符串
- 新能力通过 section 注入，而不是直接往主模板追加 XML/文案
- 能区分 cache-stable 内容与 session-dynamic 内容

---

## 阶段 1：升级 Tool Runtime Governance

### 目标

向 Claude Code 学习，把工具调用做成统一运行时契约，而不是“模型调函数 + middleware 拦一下”。

### 要补的能力

1. 统一工具执行链
   - schema
   - validateInput
   - policy / permission
   - pre hooks
   - tool call
   - post hooks
   - failure hooks
2. 工具级 read-only / destructive / concurrency-safe 元数据
3. 工具可见性预过滤
4. 工具失败、拒绝、审批请求的统一语义

### 对 Nion 的映射

- 现有 `GuardrailMiddleware`、`ToolErrorHandlingMiddleware`、`DeferredToolFilterMiddleware` 不是废弃，而是应被提升为统一 execution contract 的组成件
- 不再让“能否调用”“如何显示”“如何被摘要”分散在多个无关模块里

### 验收标准

- 工具调用前后逻辑集中在少数核心模块中
- 权限拒绝、审批请求、参数校验、后处理语义一致
- 前端可以基于统一结构渲染失败/拒绝/进度

---

## 阶段 2：把 Skill 变成一等运行时能力

### 目标

不只是有 skills，而是让“匹配到 skill 就必须调用 skill”成为系统行为。

### 要补的能力

1. 一等 `SkillTool`
2. skill listing budget / discoverability
3. skill frontmatter 中的 `allowed-tools` / `model` / `effort` / invocation policy
4. skill 执行隔离
   - 直接执行
   - forked execution（按需要）

### 为什么这是前置阶段

Claude Code 的技能系统并不是“目录里有文档”，而是 execution primitive。
Nion 如果先补更多工具、再补 SkillTool，后面很容易返工。

### 验收标准

- skill 从“文档/资源”升级为“可执行工作流包”
- 匹配 skill 时，agent 倾向于调用 SkillTool 而不是口头提及
- 后续 plugin skill 和 Claude Code skill 兼容有稳定入口

---

## 阶段 3：补齐高价值 Coding Tools

### 目标

先把 Nion 补到“coding-facing tool surface 基本完整”，不追工具数量，而追语义覆盖。

### 优先补齐的工具

1. **GlobTool**
   - 现状：只有 `ls` 与 `bash find`
   - 价值：高频代码探索动作，适合专用 schema + 专用返回格式
2. **GrepTool**
   - 现状：只有 `bash grep`
   - 价值：比 shell grep 更稳、更可控、更适合结果摘要与前端渲染
3. **增强版 FileEditTool**
   - 现状：只有 `write_file` 和 `str_replace`
   - 价值：`str_replace` 太弱，`write_file` 太粗，需要面向 patch/edit 的中间层
4. **LSPTool**
   - 现状：无一等 LSP tool
   - 价值：提升代码导航、诊断和修复质量

### 这一阶段不做

- 不为了对齐而补齐所有 Claude Code tool 名字
- 不先做 AgentTool 重构
- 不先做 plugin 兼容

### 验收标准

- Agent 不依赖 `bash find` / `bash grep` 完成主要代码探索
- 文件编辑不再只依赖整文件重写和字符串替换
- LSP 能提供至少“诊断 + 跳转/符号信息”中的一部分

---

## 阶段 4：建立 Tool Activity Layer

### 目标

复刻 Claude Code 最值钱的“工具不是日志而是活动”这套体验层。

### 要补的能力

1. 每个工具有统一 activity metadata
   - activity_label
   - summary_label
   - result_class
2. 工具批次摘要（Tool Use Summary）
3. tool activity 消息类型
4. 与 task/subtask/diagnostics 三端统一

### 为什么放在这个阶段

因为它依赖前面已经存在的统一工具契约，以及专用 Grep/Glob/FileEdit/LSP 的结果结构；先补 contract 和工具，再做活动层，数据才稳定。

### 验收标准

- 前端聊天流能显示阶段化的工具摘要，而不是纯工具噪音
- 子任务页面和 diagnostics 页能显示最近活动摘要
- 同一批工具调用能生成一条高层 summary message

---

## 阶段 5：重做 AgentTool / 子代理运行时

### 目标

从现在的 `task + invoke_acp_agent`，升级成更像 Claude Code 的统一 agent execution primitive。

### 要补的能力

1. AgentTool 统一委派入口
2. specialist agents
   - Explore
   - Plan
   - Verification
3. fork / self-fork 语义
4. background agent progress summary
5. agent transcript / lifecycle cleanup / metadata

### 这一阶段依赖

- 需要前面的工具层、工具活动层、工具执行契约都相对稳定

### 验收标准

- 子代理调用不再只是“启动一个别的 agent”
- 有清晰角色分工
- 长任务具备可感知进度

---

## 阶段 6：Plugin 兼容层

### 目标

这是最有潜在爆发力的一层：尽可能兼容 Claude Code 风格 plugin / plugin skills / frontmatter 逻辑。

### 要补的能力

1. plugin markdown / skill loader
2. frontmatter 兼容
   - allowed-tools
   - effort
   - model
   - user-invocable
   - hooks
   - shell
   - context=fork
3. plugin variable substitution
4. plugin skill 纳入 skill registry

### 策略

- 不先追完整 UI marketplace
- 先追兼容“本地 plugin 目录 + markdown 命令/skill 加载逻辑”
- 业务逻辑上可以直接向 Claude Code 致敬，但只兼容对 Nion 有价值的 frontmatter 子集

### 验收标准

- Nion 能加载一批 Claude Code 风格 plugin skill
- plugin skill 能复用 SkillTool 与 tool contract

---

## 阶段 7：MCP 深度融合

### 目标

把 MCP 从“工具来源”提升为“行为层扩展入口”。

### 要补的能力

1. MCP tools 纳入统一 Tool model
2. MCP instructions 注入 prompt/runtime
3. MCP tool policy / visibility / summary / activity 统一
4. agent-specific MCP servers（可选）

### 为什么放后面

MCP 能力很强，但如果前面没有统一 Tool model、SkillTool、plugin/runtime contract，MCP 只会变成更多动态工具，而不会变成更强的 agent 行为层。

### 验收标准

- MCP 工具不再是特殊散兵
- MCP 说明能够影响 agent 行为
- MCP tool 在前端与 diagnostics 中被统一呈现

---

## 建议的实施顺序

按执行优先级排序：

1. Prompt runtime 与 context hygiene 打底
2. Tool Runtime Governance
3. SkillTool
4. GlobTool
5. GrepTool
6. 增强版 FileEditTool
7. LSPTool
8. Tool Activity Layer
9. AgentTool / specialist agents
10. Plugin 兼容层
11. MCP 深度融合

---

## 里程碑验收

### 里程碑 A：Runtime Contract 成型

- prompt section registry、dynamic boundary、tool execution contract 落地第一版
- 权限、拒绝、审批、工具后处理在统一运行时下收口

### 里程碑 B：Coding Tool Surface 完整

- SkillTool / Glob / Grep / FileEdit / LSP 至少具备第一版可用实现
- Agent 主要代码探索和编辑不再依赖 shell 兜底

### 里程碑 C：Tool Activity 可视化

- 聊天流、子任务、diagnostics 共用统一工具活动语义
- 长任务不再只有原始工具噪音

### 里程碑 D：Claude Code 生态兼容起步

- Nion 可加载并执行 Claude Code 风格 skill/plugin 的一部分
- MCP instructions 与 agent-specific MCP servers 具备第一版设计

---

## 当前结论

第一批优先事项已经明确：

- **先补 contract：** `Prompt runtime` 与 `Tool Runtime Governance`
- **然后补 execution primitive：** `SkillTool`
- **再补高价值 tools：** `GlobTool`、`GrepTool`、增强版 `FileEditTool`、`LSPTool`
- **补完后进入表达层：** `Tool Activity Layer`
- **最后再做重 orchestration / extension：** `AgentTool`、`Plugin`、`MCP`

这条路线不是最短的，但对 Nion 来说是 Claude Code 研究结论下返工最少、稳定性最高的路线。
