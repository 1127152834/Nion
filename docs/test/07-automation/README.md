# 测试文档 07 - Automation 模块

- 文档用途：指导其他 agent 对当前单页自动化控制台做接口测试、UI 测试、`agent-browser` E2E 和回归验证。
- 适合交给哪类 agent 执行：后端 automation service/router 测试 agent、前端 automation console 测试 agent、E2E/QA agent。
- 推荐优先级：P0。
- 推荐测试方式：接口 + UI + `agent-browser` E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先覆盖 `jobs/runs/status`、`isolated_thread_id` 合同和 create/run/delete，再做页面交互链路。

## 1. 模块说明
- 模块目标：为用户提供 reminder 和 scheduled task 两类自动化能力，入口是一个单页工作台，而不是多 tab 配置页。
- 当前页面结构：
  - 顶部说明
  - 创建器：`提醒内容 / 任务内容 + 定时配置`
  - 自动化列表：左侧 reminder 列表 + scheduled task 列表
  - 结果区：选中 reminder 时展示运行列表；选中 scheduled task 时展示左侧 runs + 右侧 thread preview
  - overview cards：底部展示 scheduler / active / runs / attention
- 当前产品事实：
  - 自动化页不再有 overview / reminders / tasks / history 四个 tab 主路径。
  - reminder 与 scheduled task 共用一个创建器。
  - scheduled task 沿用主聊天输入能力，当前先支持 `@笔记`。
  - `run now` 和 `GET /api/automation/runs` 都要关注 `isolated_thread_id`，这是结果区线程预览的关键字段。
  - agent-owned automation 的创建链路已支持 `owner_type / mutability / provenance_memory_id / provenance_learning_id` 透传；带 soul provenance 的 agent-owned job 会写入 `recent soul events`。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/automation/page.tsx`
  - 前端组件：`frontend/src/components/workspace/automation/automation-page.tsx`、`automation-console.tsx`、`automation-creator.tsx`、`automation-list-panel.tsx`、`automation-results-panel.tsx`、`automation-run-preview.tsx`、`automation-overview-cards.tsx`
  - 前端 core：`frontend/src/core/automation/api.ts`、`hooks.ts`、`types.ts`、`draft-builder.ts`、`presentation.ts`
  - 后端 router：`backend/app/gateway/routers/automation.py`
  - 后端 service / model / repository：`backend/packages/harness/nion/automation/service.py`、`repository.py`、`scheduler.py`、`executor.py`、`models.py`

## 2. 模块边界与测试范围
- 本模块覆盖的功能：
  - jobs list / get / create / delete
  - pause / resume / run now
  - runs / status / result area
  - reminder / scheduled task 共用创建器
  - scheduled task run -> thread preview 联动
- 不属于本模块的功能：
  - 外部 channel 投递细节
  - 独立的 automation run detail 子系统
  - 线程详情页内部聊天能力本身
- 与其他模块的交叉测试点：
  - scheduled task 复用聊天输入语义，当前对象引用先支持 `@笔记`
  - thread preview 通过 thread state / thread routes 取数
- 易混淆边界：
  - overview cards 是 `status + runs + jobs` 的聚合展示，不是单独数据源。
  - `run now` 返回的是 `AutomationRun`，pause/resume 返回的是 `AutomationJob`。
  - reminder 的结果区是列表视图；scheduled task 的结果区是 `runs + thread preview` 双栏视图。
  - 当前版本新增了 `owner_type / mutability / provenance_*` 语义：`agent-owned` 任务必须在列表、卡片、详情页明确可见，并限制普通编辑链路。

## 3. 核心业务链路
1. 用户进入 `/workspace/automation`，前端并发调用：
   - `GET /api/automation/jobs`
   - `GET /api/automation/runs`
   - `GET /api/automation/status`
2. 页面直接渲染单页控制台，不经过 tab 切换。
3. 用户在创建器中选择 automation type，填写提醒内容或任务内容，并配置 schedule。
4. scheduled task 内容支持沿用主聊天输入能力，当前应能接受 `@笔记` 这类对象引用文本。
5. 创建请求通过 `buildAutomationDraftRequest()` 生成 payload，创建成功后统一 invalidation `automation jobs/runs/status`。
6. 用户在列表区对单个 job 执行 pause / resume / run now / delete。
7. 结果区按选中 job 分流：
   - reminder：展示该 reminder 的运行列表
   - scheduled task：左侧展示 runs，右侧根据 run 的 `isolated_thread_id` 拉取并预览关联线程
8. overview cards 使用 `status + runs + jobs` 计算 scheduler / active / runs / attention。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 数据不存在场景 | 并发/重复提交场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 列出 jobs | `/api/automation/jobs` | GET | 获取任务列表 | AutomationPage | service 可用 | 无 | `jobs[]` | 返回当前任务列表 | 无 | 重复 GET 一致 | jobs 字段完整 |
| 创建 job | `/api/automation/jobs` | POST | 创建 reminder/scheduled task | automation creator | payload 合法 | `name prompt job_kind schedule_* delivery_mode skills` | `job` | 两种 job 都可创建 | 无 | 连续创建相同任务 | 201，字段完整透传 |
| 创建 agent-owned job | `/api/automation/jobs` | POST | 创建由 agent/soul growth 外化出的任务 | Memory OS / automation bridge | payload 合法且 owner 为 agent | `owner_type mutability provenance_memory_id provenance_learning_id policy_flags` | `job` + soul event | 创建成功并保留 provenance | 无 | 重复创建 | job 字段透传，`/api/memory/growth/soul/events` 可看到 `soul_automation_created` |
| 获取 job | `/api/automation/jobs/{job_id}` | GET | 获取单 job | 页面/外部 | job 存在 | path job_id | `job` | 正常返回 | 404 | 重复 GET 一致 | job id 与 path 一致 |
| pause job | `/api/automation/jobs/{job_id}/pause` | POST | 暂停任务 | job section | job 存在 | path job_id | `job` | state -> paused | 404 | 快速连点 | 调用 service.pause_job |
| resume job | `/api/automation/jobs/{job_id}/resume` | POST | 恢复任务 | job section | paused job | path job_id | `job` | state -> scheduled | 404 | 快速连点 | 恢复后 `enabled/state` 正确 |
| run job now | `/api/automation/jobs/{job_id}/run` | POST | 立即执行一次任务 | job section | job 存在 | path job_id | `run` | 返回新的 run 记录 | 404 | 连续点击 run | `run` 包含 `job_id`、`status`、`result_summary`，scheduled task 路径上保留 `isolated_thread_id` |
| delete job | `/api/automation/jobs/{job_id}` | DELETE | 删除任务 | job section | job 存在 | path job_id | 204 | 删除成功 | 404 | 连续 delete | 删除后 jobs/status 变化 |
| 列出 runs | `/api/automation/runs` | GET | 获取执行历史 | results/overview | service 可用 | 无 | `runs[]` | 列出 run history | 无 | 重复 GET 一致 | scheduled task run 返回 `isolated_thread_id`，reminder run 可为空 |
| 获取 status | `/api/automation/status` | GET | 获取聚合概览指标 | overview cards | service 可用 | 无 | scheduler_running total_jobs_count active_jobs_count paused_jobs_count error_jobs_count run_count failed_runs_count last_* | status 指标正确 | 无 | 重复 GET 一致 | 不包含内部实现残留字段 |

## 5. UI 测试文档
- 页面入口：`/workspace/automation`。
- 首屏渲染：标题、描述、单一创建器、左右 job 列表、结果区、overview cards。
- 禁止回归旧 IA：
  - 页面主路径不应出现 overview / reminders / tasks / history tab 切换。
  - 页面主路径不应出现 advanced options、old forms、split reminder/task forms。
- 创建器验证：
  - 可切换 reminder / scheduled task。
  - reminder 展示“提醒内容”，scheduled task 展示“任务内容”。
  - schedule builder 支持 once / daily / weekdays / weekly / interval / custom。
  - 内容为空时禁止提交。
  - scheduled task 文案体现当前支持 `@笔记`。
- 列表区验证：
  - 列表按 `用户创建` 与 `Agent 创建` 分组，避免把 ownership 只藏在小 badge 里。
  - reminder / scheduled task 各自空态文案正确。
  - job card 展示 state badge、next run、schedule、summary、last result。
  - pause / resume / run now / remove 操作状态正确。
  - agent-owned job 仍可见，但其编辑限制需要在详情页被解释清楚。
- 结果区验证：
  - 未选中 job 时展示引导空态。
  - 选中 reminder 时，只展示运行列表。
  - 选中 scheduled task 时，展示左侧 runs、右侧 thread preview。
  - selected run 变化时，thread preview 跟随切换。
  - run 没有关联 `isolated_thread_id` 时，右侧展示“仅保留结果摘要”类空态。
- 详情页验证：
  - 必须展示 `编辑权限`
  - 必须展示 `来源记忆`
  - 必须展示 `来源学习主题`
  - agent-owned job 必须解释为什么不能直接编辑
- overview cards 验证：
  - scheduler / active / runs / attention 四张卡片可见。
  - `status` 变化后 cards 刷新。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 必须抓 network：`jobs / runs / status / create / pause / resume / run / delete`。
- 必须截图：首屏、创建成功后的列表区、scheduled task 结果区双栏、空态或错误态。
- 不再把 tab 切换当作主路径测试步骤。

### 6.2 E2E 场景清单

#### 场景 1：创建 reminder 主成功链路
- 场景目标：验证 reminder 通过单一创建器创建成功，并在 reminder 列表与结果区生效。
- 测试数据：`提醒我查看今天的工单`，daily `09:00`。
- 执行步骤：
  1. `agent-browser open http://localhost:2026/workspace/automation`
  2. `agent-browser snapshot -i`
  3. 在单页创建器中选择 `提醒事项`
  4. 填写提醒内容和时间
  5. 提交后重新 snapshot
- 预期结果：新 reminder 出现在 reminder 列表；选中后结果区显示 reminder runs 列表视图。
- 关键断言：`POST /api/automation/jobs` 201，随后 `jobs/status/runs` 重新请求。
- 优先级：P0。

#### 场景 2：创建 scheduled task 并验证 `@笔记`
- 场景目标：验证 scheduled task 复用聊天输入语义，当前支持 `@笔记` 文本输入。
- 测试数据：`每个工作日 18:30 总结 @笔记 中的项目进展并生成日报`。
- 执行步骤：
  1. 在单页创建器中选择 `定时任务`
  2. 输入带 `@笔记` 的任务内容
  3. 设置工作日 `18:30`
  4. 提交并检查 scheduled task 列表
- 预期结果：新 task 出现在 scheduled task 列表，内容按原样保存，不要求本阶段验证更多对象类型。
- 优先级：P0。

#### 场景 3：scheduled task 的 run now -> runs -> thread preview
- 场景目标：验证 scheduled task 在结果区走双栏视图，并通过 `isolated_thread_id` 打开线程预览。
- 前置条件：至少存在 1 个 scheduled task。
- 执行步骤：
  1. 在 scheduled task 列表中选中一个任务
  2. 点击 `Run now`
  3. 等待 runs 列表刷新
  4. 点击最新 run
  5. 检查右侧 thread preview
- 预期结果：
  - 左侧新增一条 run
  - 该 run 展示 `started_at` 和 `isolated_thread_id` 或无独立线程提示
  - 若 `isolated_thread_id` 存在，右侧成功拉取线程标题、摘要和最近消息
- 关键断言：`POST /api/automation/jobs/{job_id}/run` 返回的 run 可与右侧 preview 对上。
- 优先级：P0。

#### 场景 4：pause -> resume -> delete 链路
- 场景目标：验证单个 job 的状态流转闭环。
- 前置条件：至少存在 1 个 job。
- 预期结果：badge、按钮文案、列表状态和 overview cards 同步变化。
- 优先级：P1。

#### 场景 5：空态与错误态
- 场景目标：验证无 jobs/runs 和接口失败时，单页控制台各区域文案可用。
- 预期结果：
  - 创建器仍可见
  - reminder / task / result area / overview 各自空态或错误态正确
- 优先级：P1。

## 7. 数据一致性与状态流转测试
- create 后 `jobs/status/runs` query 一起 invalidation。
- `paused_jobs_count / active_jobs_count / failed_runs_count` 与 jobs/runs 一致。
- job state badge 与 `enabled/state` 一致。
- scheduled task 的 selected run 默认优先最新成功 run，否则回退到最新 run。
- result area 使用 run 的 `isolated_thread_id` 驱动线程预览，而不是额外 run-detail 接口。

## 8. 异常与边界测试
- 缺参：内容为空。
- 非法参数：schedule contract 非法、timezone 异常。
- 超长输入：长 prompt、长 `@笔记` 混合文本。
- 特殊字符：中文、emoji、换行。
- 空数据：jobs/runs/status 全 0。
- 资源不存在：操作不存在 job。
- 接口 4xx / 5xx：create / run / delete / pause / resume。
- 超时：scheduler 或 run now 长时间执行。
- 并发更新：两个窗口同时操作同一个 job。
- 状态非法切换：已 paused 再 pause、删除后再 resume。
- `isolated_thread_id` 缺失：scheduled task 结果区应降级为无独立线程提示，而不是崩溃。

## 9. 自动化建议
- 后端接口自动化优先：jobs CRUD、runs、status、executor 对 `isolated_thread_id` 的保留。
- 前端 contract/integration：draft-builder、presentation、automation console、results panel。
- `agent-browser` E2E：create reminder、create scheduled task、run now、thread preview、delete。
- 最小冒烟集合：create reminder、create scheduled task（含 `@笔记`）、run now、scheduled task preview、delete。
- 最小回归闭环：create -> list action -> runs -> thread preview -> overview refresh。

## 10. 风险与优先级
- P0 必测项：两种 create 链路、`run now`、`isolated_thread_id` 透传、scheduled task thread preview。
- P1 高价值项：pause/resume/delete、空态/错误态、overview 统计。
- 最容易漏测的点：
  - 仍按旧 tabs 思路写用例，导致主路径完全偏离当前产品
  - `run now` 返回 run 记录而非 job
  - `isolated_thread_id` 丢失后右侧 preview 无法工作
- 上线前必须回归的部分：single-page creator、scheduled task `@笔记` 输入、run preview、delete、status overview。
