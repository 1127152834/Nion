# 测试文档 08 - Custom Agents 模块

- 文档用途：指导其他 agent 对 custom agents 列表、bootstrap 创建、CRUD、进入专属线程聊天执行测试。
- 适合交给哪类 agent 执行：后端 agents API 测试 agent、前端 agent gallery/UI 测试 agent、E2E agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是。

## 1. 模块说明
- 模块目标：允许用户创建具备独立 SOUL/config 的自定义 agent，并在专属线程中与之对话。
- 核心业务职责：
  - `/api/agents*` CRUD 与 `/api/agents/check` 名称校验。
  - `/workspace/agents` gallery 浏览与删除。
  - `/workspace/agents/new` 通过 bootstrap thread + `setup_agent` tool 创建 agent，而不是直接普通表单提交。
  - 创建后跳转到 `pathOfNewAgentThread(agentName)` 开始专属聊天。
- 关键代码位置：`frontend/src/app/workspace/agents/new/page.tsx`、`frontend/src/components/workspace/agents/*`、`frontend/src/core/agents/*`、`backend/app/gateway/routers/agents.py`、`backend/packages/harness/nion/tools/builtins/setup_agent_tool.py`、`backend/packages/harness/nion/agents/lead_agent/agent.py`。
- 现有测试：`backend/tests/test_custom_agent.py`。

## 2. 模块边界与测试范围
- 覆盖：agents list/get/create/update/delete/check、bootstrap create 流、gallery delete、专属线程入口。
- 不覆盖：agent 内部任务能力本身。
- 交叉点：bootstrap thread 使用模块 01 的消息流；创建成功依赖 `setup_agent` tool。

## 3. 核心业务链路
1. 用户在 `/workspace/agents/new` 输入名称。
2. 前端先调用 `checkAgentName()` 校验命名与可用性。
3. 名称通过后进入 step=chat，创建稳定 `threadId` 并以 `is_bootstrap=true` 调用 `useThreadStream`。
4. bootstrap lead agent 暴露 `setup_agent` 工具；当 tool end 名称为 `setup_agent` 时，前端回读 `getAgent(agentName)`。
5. 创建成功后显示 success card，可开始聊天或返回 gallery。

## 4. 接口测试文档
- 必测：`GET /api/agents`、`GET /api/agents/{name}`、`GET /api/agents/check`、`POST /api/agents`、`PUT /api/agents/{name}`、`DELETE /api/agents/{name}`、`GET/PUT /api/user-profile`。
- 核心断言：
  - invalid name 422，duplicate 409。
  - create/update/delete 对磁盘文件同步生效。
  - model/tool_groups 可透传。
  - user profile 独立于 agent CRUD。

## 5. UI 测试文档
- gallery 首屏、empty state、agent card、delete confirm。
- new page 两步流：name -> bootstrap chat -> success card。
- 名称校验错误、check 失败、bootstrap 失败显示。
- 成功后跳新线程、返回 gallery。

## 6. E2E 测试文档
- 场景 1：gallery 空态到创建成功，P0。
- 场景 2：非法名称和重复名称校验，P1。
- 场景 3：bootstrap 对话创建 agent 并显示 success card，P0。
- 场景 4：从 agent card 进入聊天，P1。
- 场景 5：删除 agent，P1。
- 统一要求：使用 `agent-browser`，抓 `/api/agents/check` 与 bootstrap thread network，保留 success card 截图。

## 7. 数据一致性与状态流转测试
- API 列表与 gallery 一致。
- 创建成功后磁盘 agent dir/config/SOUL 存在。
- delete 后列表与磁盘同步删除。
- bootstrap thread 与最终 agent 数据一致。

## 8. 异常与边界测试
- 缺参、非法名称、重复名称、更新不存在 agent、删除不存在 agent、bootstrap tool 失败、SOUL 超长、tool_groups 空/非法。

## 9. 自动化建议
- 后端接口自动化优先：CRUD + disk persistence。
- 前端 integration：new page step state / delete dialog。
- agent-browser E2E：创建成功链路。
- 冒烟：create -> get -> chat entry -> delete。

## 10. 风险与优先级
- P0：bootstrap create、name check。
- P1：gallery/delete/update。
- 易漏点：真实创建链路不是直接 POST `/api/agents`，而是 bootstrap thread + `setup_agent`。
- 事故链路：agent UI 成功但磁盘没落盘，或 bootstrap tool 成功后前端回读失败。

