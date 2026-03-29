# 测试文档 08 - Custom Agents 模块

- 文档用途：指导其他 agent 对 custom agents 列表、bootstrap 创建、CRUD、进入专属线程聊天做完整测试。
- 适合交给哪类 agent 执行：后端 agents API 测试 agent、前端 gallery/new page 测试 agent、E2E agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先覆盖 CRUD 和 bootstrap thread，再做页面主链路。

## 1. 模块说明
- 模块目标：允许用户创建具备独立 `config.yaml + SOUL.md` 的 custom agent，并从 gallery 进入其专属线程。
- 核心业务职责：
  - 提供 `check -> create -> get -> update -> delete` API。
  - 提供 gallery/card/delete UI。
  - 提供 new page 的两步式 bootstrap 创建体验。
  - 通过 lead agent bootstrap 模式暴露 `setup_agent` 工具完成落盘。
- 典型用户角色：希望快速创建特化 agent 的高级用户。
- 上下游依赖：agent paths、lead agent bootstrap、thread stream、user profile。
- 与其他模块关系：
  - 与模块 01：new page 的第二步就是 bootstrap 聊天线程。
  - 与模块 05：模型和工具组配置会影响 custom agent 行为。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/agents/page.tsx`、`frontend/src/app/workspace/agents/new/page.tsx`、`frontend/src/app/workspace/agents/agent-chat-page.tsx`
  - 前端组件：`frontend/src/components/workspace/agents/agent-gallery.tsx`、`agent-card.tsx`
  - 前端 core：`frontend/src/core/agents/api.ts`、`hooks.ts`、`types.ts`
  - 后端 router：`backend/app/gateway/routers/agents.py`
  - 后端工具/agent：`backend/packages/harness/nion/tools/builtins/setup_agent_tool.py`、`backend/packages/harness/nion/agents/lead_agent/agent.py`
  - 现有测试文件：`backend/tests/test_custom_agent.py`

## 2. 模块边界与测试范围
- 本模块覆盖：agents CRUD、name check、bootstrap create、gallery delete、user profile API、专属线程入口。
- 不属于本模块：agent 聊天内容本身的业务正确性。
- 交叉测试点：bootstrap 流依赖 thread stream；agent 专属聊天页复用聊天组件。
- 易混淆边界：
  - 真正用户路径不是直接 POST `/api/agents`。
  - `/api/user-profile` 是全局 USER.md，不属于单个 agent 配置，但在同一路由模块中。

## 3. 核心业务链路
1. 用户进入 `/workspace/agents`：
   - 无 agent 时显示 empty state。
   - 有 agent 时展示 cards。
2. 点击“新建 Agent”进入 `/workspace/agents/new`。
3. Step 1：输入名称，前端执行：
   - 正则校验 `^[A-Za-z0-9-]+$`
   - `GET /api/agents/check?name=...`
4. 名称可用后进入 Step 2：
   - 创建稳定 `threadId`
   - `useThreadStream({ is_bootstrap: true, threadId })`
   - 用户以自然语言描述 agent
5. bootstrap lead agent 暴露 `setup_agent` 工具：
   - 根据 runtime.context.agent_name 创建 agent dir
   - 写入 `config.yaml` 和 `SOUL.md`
   - 返回 ToolMessage
6. 前端监听 `onToolEnd(name === 'setup_agent')`，调用 `getAgent(agentName)` 回读详情。
7. 创建成功后展示 success card，可进入 `pathOfNewAgentThread(agentName)`。
8. gallery 中可删除 agent，删除后目录从磁盘移除。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交 | 核心断言 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| list agents | `/api/agents` | GET | 获取所有 custom agent | gallery | paths 可读 | 无 | `agents[]` | 空列表/有列表都正确 | 无 | 无 | 空数组 | 无 | 重复 GET | 列表字段不含多余异常值 |
| check agent name | `/api/agents/check` | GET | 校验名称和可用性 | new page | name 输入存在 | `name` query | `available name` | 可用名称返回 true | 非法名称 422 | 无 | 无 | 已存在返回 available=false | 快速重复校验 | name lower-case 归一化 |
| create agent | `/api/agents` | POST | 直接 API 创建 agent | tests/API | payload 合法 | `name description model tool_groups soul` | agent | 创建成功 | 非法名称 422 | duplicate 409 | 最小 soul 也可创建 | 无 | 重复创建 | 磁盘写入 config.yaml 与 SOUL.md |
| get agent | `/api/agents/{name}` | GET | 读取 agent 详情 | gallery/detail/bootstrap 回读 | agent 存在 | path | agent | 成功读取 | 非法名称 | 不存在 404 | 无 | 无 | 重复 GET | SOUL 返回正确 |
| update agent | `/api/agents/{name}` | PUT | 更新 description/model/tool_groups/soul | 编辑流程/测试 | agent 存在 | request body | agent | 更新单字段或多字段成功 | 非法 payload | 不存在 404 | 无 | 无 | 并发 update | 磁盘内容与返回同步 |
| delete agent | `/api/agents/{name}` | DELETE | 删除 agent | gallery | agent 存在 | path | 204 | 删除成功 | 非法名称 | 不存在 404 | 无 | 删除后再删 | 连续 delete | 磁盘目录移除 |
| user profile get/put | `/api/user-profile` | GET/PUT | 读写全局 USER.md | 设置/测试 | paths 可写 | `content` | content | put 后 get 一致 | 内容类型非法 | 无 | content 可为空 | 无 | 重复 PUT | USER.md 落盘正确 |

## 5. UI 测试文档
- 页面入口：`/workspace/agents`、`/workspace/agents/new`、`/workspace/agents?agent={name}&thread={id}`。
- 首屏渲染：gallery 标题/说明、empty state、新建按钮。
- 加载态：`useAgents()` isLoading；bootstrap chat loading。
- 空态：无 agents 时的 empty title/description/button。
- 错误态：名称校验失败、create/check 失败、delete 失败 toast。
- 列表/卡片：name、description、model badge、tool_groups badges、chat/delete 按钮。
- 用户交互：
  - 新建 agent 名称输入与 Enter 提交
  - bootstrap 聊天提交
  - success card 两个 CTA
  - 删除确认弹窗
- 表单校验：名称为空不可继续；非法名称显示错误；check 失败显示错误。
- 按钮状态：checking name 时 continue disabled；delete pending 时按钮 disabled。
- 条件渲染：step=name 与 step=chat 完全不同；agent 创建后显示 success card 替代 composer。
- 成功反馈：成功创建后回读 agent 并展示 success card；删除成功 toast。
- 失败反馈：bootstrap 未成功时不显示 success card。
- 刷新后状态：gallery 列表恢复；new page 在成功后可以通过 API 重新读到 agent。
- 返回/切页后状态：返回 gallery 后 card 可见；进入 chat route 正常。
- 重复操作：重复点 continue、重复 bootstrap 提交、重复 delete。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 优先结合 `/browse` 完成名称校验、bootstrap 对话、success card 和 gallery 删除。
- 必须抓 network：`/api/agents/check`、bootstrap `/api/threads/*/stream`、`/api/agents/{name}`、delete API。
- 必须截图：gallery empty/non-empty、名称错误、bootstrap success card、delete confirm。

### 6.2 E2E 场景清单

#### 场景 1：从空态创建 custom agent 主成功链路
- 场景目标：验证用户从 gallery empty state 经名称校验和 bootstrap 对话创建 agent。
- 前置条件：当前无同名 agent。
- 测试数据：agent name=`release-helper`，bootstrap 描述=`你是一个负责发布检查的智能体`。
- 执行步骤：
  1. 打开 `/workspace/agents`。
  2. 点击新建按钮，进入 `/workspace/agents/new`。
  3. 输入名称并提交。
  4. 等待进入 bootstrap chat step。
  5. 在对话中描述 agent 职责并提交。
  6. 等待 `setup_agent` 完成并出现 success card。
- 预期结果：gallery 中新增该 agent；success card 提供开始聊天和返回 gallery。
- 关键断言：`/api/agents/check` 成功；bootstrap stream 完成；`GET /api/agents/release-helper` 成功。
- 优先级：P0。

#### 场景 2：非法名称与重复名称校验
- 场景目标：验证 name step 错误提示。
- 步骤：输入 `Code Reviewer!`；或输入已存在名称。
- 预期结果：非法名称显示 invalid error；重复名称显示 already exists。
- 优先级：P1。

#### 场景 3：从 success card 进入专属聊天
- 场景目标：验证创建完成后能进入 agent thread。
- 步骤：点击 `开始聊天`，进入 `/workspace/agents?agent=...&thread=new`。
- 预期结果：AgentChatPage header 显示该 agent 名称。
- 优先级：P1。

#### 场景 4：gallery 删除 agent
- 场景目标：验证删除确认与列表更新。
- 前置条件：存在至少 1 个 agent。
- 步骤：点击 delete -> confirm -> 返回 gallery。
- 预期结果：card 消失；再次访问 agent detail 404。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1。
- 主失败链路：场景 2。
- 刷新恢复链路：创建后刷新 gallery 可见；刷新 agent chat 仍可加载。
- 返回/重进链路：new page -> gallery -> agent chat。
- 重复提交链路：名称 continue、bootstrap submit、delete confirm。
- 模块间联动链路：bootstrap thread -> agents API -> agent chat。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：gallery/new page/success card/delete。
- 适合 `/qa`：完整 create/delete 回归。
- 适合 report-only：只产出 agent 管理页问题列表。
- 必须抓 network：check、stream、get agent、delete。
- 必须看 console：bootstrap 失败、API 失败。
- 必须截图：名称校验错误、success card、gallery 列表。

## 7. 数据一致性与状态流转测试
- `checkAgentName` 结果与 create 冲突校验一致。
- API 列表、gallery cards、磁盘目录三者一致。
- bootstrap thread tool end 与 `getAgent` 回读结果一致。
- delete 后磁盘与列表同步消失。

## 8. 异常与边界测试
- 缺参：无 soul、无 name。
- 非法参数：名称含空格/特殊字符、tool_groups 非法。
- 超长输入：超长 SOUL、超长 description。
- 特殊字符：中文描述、markdown SOUL。
- 空数据：空 gallery。
- 资源不存在：get/update/delete 不存在 agent。
- 接口 4xx / 5xx：check/create/update/delete。
- 超时：bootstrap stream 超时、setup_agent 失败。
- 并发更新：两个窗口同名创建。
- 状态非法切换：success card 未出现前刷新/返回。
- 重复操作问题：重复 delete、重复 bootstrap submit。

## 9. 自动化建议
- 后端接口自动化优先：CRUD、check、user profile、disk persistence。
- 前端 integration：step transitions、delete dialog、success card。
- agent-browser E2E：create success/delete。
- 人工探索：复杂 SOUL 和 tool_groups、与模型配置联动。
- 最小冒烟集合：check -> bootstrap create -> gallery visible -> delete。
- 最小回归闭环：gallery -> new -> create -> chat -> delete。
- 高收益自动化优先级：P0 是 bootstrap create；P1 是 delete/update。

## 10. 风险与优先级
- P0 必测项：名称校验、bootstrap create、磁盘落盘。
- P1 高价值项：gallery delete、chat entry、update。
- P2 扩展项：复杂 user profile/tool_groups/model 配置。
- 最容易漏测的点：真实创建链路依赖 `setup_agent` tool，而不是简单 POST API。
- 最容易出现线上事故的链路：bootstrap 成功但 getAgent 回读失败、磁盘写入不完整、删除只删 UI 不删目录。
- 上线前必须回归的部分：create、delete、chat entry。

