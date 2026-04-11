# Test Spec: Single Main Agent + Governed Custom-Agent Orchestration

日期：2026-04-11
状态：Draft for consensus review
对应 PRD：`.omx/plans/prd-single-main-agent-custom-agent-orchestration.md`

## Verification Goals

1. 主智能体始终是唯一正式对外主智能体。
2. custom agent 既可独立使用，也可被主智能体或 `@` 语法调度。
3. 被调度智能体默认不直接向用户发言，只把结果回传主智能体。
4. child run 可在左侧展开查看，但不进入正式 thread history / search。
5. delegated 态的 permissions / private skills / SOUL / memory 规则可预测、可验证。
6. 站内协同优先走 LangGraph 编排；A2A/ACP 只在 remote transport seam 触发。

## Expanded Test Plan

### Unit

#### Backend

- mention parser 正确解析：
  - 单个 `@智能体`
  - 串行链式 `@A -> @B -> @C`
  - 无效/不存在的 agent mention
- orchestration planner 正确区分：
  - 普通 lead-only turn
  - delegated custom-agent turn
  - remote transport turn
- delegated policy 计算正确：
  - permission ceiling
  - delegatable private skills
  - soul overlay 注入
  - memory write default deny
- child-run state machine 正确：
  - created -> running -> completed
  - created -> running -> failed
  - completed/failed -> closed
- child-run store 不写入 `ThreadRecord`
- LangGraph orchestration glue 正确：
  - `Send` 生成的 worker assignments 与计划链一致
  - subgraph namespace 正确映射到 `child_run_id`
  - checkpointer 恢复后 child-run 状态不丢失
  - `Command` / interrupt 能在提权或审批点暂停并恢复

#### Frontend

- 最近聊天列表的主线程展开/收起逻辑正确
- child-run list 只挂在父线程下，不作为一级最近聊天条目出现
- child-run inspector 正确显示：
  - 对话消息
  - 工具调用
  - 结果/失败状态
- 主线程中仍只显示主智能体正式回复 + 轻量子任务摘要

### Integration

#### Runtime / API

- `custom agent standalone chat` 仍通过 `agent_name` 正常运行
- `custom agent delegated chat` 通过 orchestration graph 调用成功
- child-run API 返回父线程下的临时会话列表
- `search_threads` 不返回已结束 child run
- delegated turn 的最终用户可见回复由主智能体输出
- remote transport seam 在本地 agent 路径未被误触发

#### LangGraph / Streaming

- 编排请求能产生结构化 `child_run_created/running/completed/failed/closed` 事件
- 前端刷新页面时，活跃 child runs 可恢复
- 任务结束后 child run 自动关闭，且不会在后续历史搜索中出现
- 开启 subgraph streaming 时，child run 事件能按 namespace 正确落到对应 inspector

### End-to-End

- 用户输入：`@智能体1 搜索 xxx，交给 @智能体2 总结，再交给 @智能体3 排版成 html`
  - 主线程只出现主智能体统一回复
  - 左侧主线程可展开
  - 展开后出现 3 个 child runs
  - 每个 child run 可点开查看过程
  - 任务结束后 child runs 关闭
  - 刷新后不出现在最近聊天一级列表
- 用户直接进入 Agent 模块打开 `智能体2`
  - 它仍以 standalone agent 正常工作

### Observability

- 记录 parent thread 与 child_run_id 关联
- 记录 delegated policy 生效结果（不记录敏感 prompt 明文）
- 记录 remote transport 选择原因
- 记录 child-run close / cleanup 成功与失败

## Contract Tests

### Backend Contracts

- `threads/models.py`：
  - 正式 thread model 扩展后仍保持向后兼容
  - child run 不应要求变成新的正式 `ThreadScope`
- `threads/search`：
  - 默认不返回 child runs
- `child-run API`：
  - 父线程展开时返回临时 child-run 列表
  - completed child run 在关闭后不再返回

### Frontend Contracts

- `recent-chat-list`：
  - 主线程 row 可展开 child runs
  - child runs 不是一级 recent chat item
- `message-list`：
  - 主线程里保留轻量 delegation 摘要
  - child-run 详细内容不再强耦合到 `assistant:subagent` 分组
- `thread hooks/types`：
  - child-run state 可从 stream/custom events 恢复

## Regression Matrix

1. 把 custom agent 混进 built-in subagent registry，导致 worker 和 identity 语义混淆
2. child run 落成普通 `thread.json`，污染最近聊天列表
3. 被调度智能体直接在主聊天中对用户发言
4. delegated 态能直接写长期记忆，导致流水线噪音入库
5. private skill 在 delegated 态被全部裸露
6. 普通无 `@` 的 lead-only 聊天也强制走重编排路径
7. A2A/ACP 在站内本地 custom-agent 场景被错误启用
8. 没有真正使用 LangGraph subgraph/checkpointer，导致 child-run 只能前端临时拼装、刷新即丢

## Manual / Smoke

### Primary Flow

1. 新建三个 custom agent
2. 在主聊天输入链式 `@` 任务
3. 观察主线程回复是否仍只有主智能体
4. 观察左侧是否能展开看到临时 child runs
5. 逐个点开 child runs 检查过程
6. 任务结束后确认 child runs 自动关闭
7. 刷新页面后确认 child runs 不进入最近聊天一级列表

### Standalone Flow

1. 从 Agent 模块进入某个 custom agent
2. 直接发起会话
3. 确认其 SOUL / 私有 skill / 记忆仍按 standalone 语义工作

### Policy Flow

1. 为某个 custom agent 配置高权限/私有 skill
2. 在 delegated 态调度它
3. 确认 delegated ceiling 和 skill 暴露按策略收缩

### Remote Transport Flow

1. 配置一个 ACP agent integration
2. 构造需要 remote execution 的任务
3. 确认 orchestration graph 走 remote transport seam
4. 确认本地 custom agent 不受影响

### A2A Flow

1. 配置一个 A2A-compatible remote agent mock / adapter
2. 构造跨 runtime 的远程协同任务
3. 确认系统先通过 capability/agent card 发现远程 agent
4. 确认本地 custom agent 仍走站内 LangGraph path
5. 确认远程 agent 的 opaque memory/tool state 不泄漏到本地 child-run contract

## Verification by Workstream

### Workstream 1-2: Orchestration Model + Delegation Bridge

- 通过阈值：
  - backend unit/integration 全绿
  - child-run state machine 无悬空状态
- 关键用例：
  - standalone 与 delegated 两种运行面同时成立
  - custom agent 不进入 built-in subagent registry

### Workstream 3-5: Mentions + Child Runs + UI

- 通过阈值：
  - frontend contract tests 全绿
  - e2e 链式 `@` 流程通过
- 关键用例：
  - 左侧可展开查看 child runs
  - child runs 不归档

### Workstream 6-7: Governance + Remote Transport

- 通过阈值：
  - delegated policy contract tests 全绿
  - ACP/A2A seam smoke 通过
- 关键用例：
  - permission ceiling 生效
  - remote transport 只在需要时触发

## Exit Criteria

- PRD 中的 acceptance criteria 对应测试全部存在
- Backend unit/integration 通过
- Frontend contract/e2e 通过
- 主线程统一回复规则无破例
- child run 不进入正式线程搜索/归档
- A2A/ACP seam 不影响本地默认编排路径
