# 测试文档 07 - Automation 模块

- 文档用途：指导其他 agent 基于真实 automation 实现执行接口测试、UI 测试、agent-browser E2E、回归计划与自动化补齐。
- 适合交给哪类 agent 执行：后端 automation service/router 测试 agent、前端表单和状态页测试 agent、E2E/QA agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是，先覆盖 `jobs/runs/status` 与 draft builder，再做页面交互链路。

## 1. 模块说明
- 模块目标：为用户提供 reminder 和 scheduled task 两类自动化任务的创建、状态观察、暂停恢复、立即执行和历史查看能力。
- 核心业务职责：
  - 统一展示 scheduler status、jobs、runs。
  - 构建 reminder / scheduled task 请求体，包括 cadence、timeOfDay、timezone、delivery mode、skills。
  - 提供 `pause/resume/run/delete` 操作闭环。
  - 通过 overview/history/jobs 三类视图承载自动化状态。
- 典型用户角色：希望定时生成摘要、提醒、日程任务的桌面或 Web 用户。
- 上下游依赖：
  - 上游：Settings 文案、当前时区、delivery mode 选项。
  - 下游：AutomationService、AutomationRepository、Scheduler、Executor。
- 与其他模块关系：
  - 与模块 05：automation settings copy 与 session/tool policy 字段影响 create payload。
  - 与模块 09：若 delivery_mode 指向 channel/multi，会与桌面 bridge/channel 能力产生联动。
- 关键代码位置：
  - 前端页面：`frontend/src/app/workspace/automation/page.tsx`
  - 前端组件：`frontend/src/components/workspace/automation/automation-page.tsx`、`automation-overview-cards.tsx`、`automation-job-section.tsx`、`automation-history-section.tsx`、`scheduled-task-form.tsx`、`reminder-form.tsx`
  - 前端 core：`frontend/src/core/automation/api.ts`、`hooks.ts`、`types.ts`、`draft-builder.ts`、`presentation.ts`
  - 后端 router：`backend/app/gateway/routers/automation.py`
  - 后端 service / model / repository：`backend/packages/harness/nion/automation/service.py`、`repository.py`、`scheduler.py`、`executor.py`、`models.py`
  - 现有测试文件：`backend/tests/test_automation_router.py`、`test_automation_repository.py`、`test_automation_scheduler.py`、`test_automation_executor.py`、`frontend/src/core/automation/draft-builder.test.ts`、`presentation.test.ts`、`routing.test.ts`

## 2. 模块边界与测试范围
- 本模块覆盖的功能：
  - jobs list / get / create / delete
  - pause / resume / run now
  - runs history / overview status
  - reminder form / scheduled task form / advanced options
- 不属于本模块的功能：
  - 真正的外部 channel 投递结果细节
  - cron 引擎底层实现之外的基础设施监控
- 与其他模块的交叉测试点：
  - delivery mode 与 bridge/channel 可用性
  - skills/session_policy/toolset_profile 字段对执行结果的影响
- 易混淆边界：
  - overview cards 是 status/runs 的聚合展示，不是单独数据源。
  - `run now` 返回的是 AutomationRun，而 pause/resume 返回的是 AutomationJob。

## 3. 核心业务链路
1. 用户进入 `/workspace/automation`，前端并发调用：
   - `GET /api/automation/jobs`
   - `GET /api/automation/runs`
   - `GET /api/automation/status`
2. 页面按 Tab 分为 overview / reminders / tasks / history。
3. reminder 或 scheduled task 表单通过 `buildAutomationDraftRequest()` 生成请求体：
   - `job_kind`
   - `schedule_preset / schedule_kind / schedule_value`
   - `schedule_timezone`
   - `delivery_mode`
   - `skills`
4. 创建成功后统一 invalidation `automation jobs/runs/status` 三个 query key。
5. 用户在 job list 上对单个任务执行 pause/resume/run/delete。
6. overview cards 使用 status + runs 计算 active / runs / attention 等产品口径指标。
7. history 列表展示 run 的 started_at / finished_at / status / result_summary。

## 4. 接口测试文档

| 接口名称 | 路径 | 方法 | 业务动作 | 调用方 | 前置条件 | 请求关键字段 | 返回关键字段 | 成功场景 | 参数异常场景 | 权限异常场景 | 数据不存在场景 | 空数据场景 | 状态非法场景 | 并发/重复提交/幂等性场景 | 核心断言点 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 列出 jobs | `/api/automation/jobs` | GET | 获取任务列表 | AutomationPage | service 可用 | 无 | `jobs[]` | 返回当前任务列表 | 无 | 无 | 无 | 空 jobs[] | 无 | 重复 GET 一致 | jobs 列表字段完整 |
| 创建 job | `/api/automation/jobs` | POST | 创建 reminder/scheduled task | reminder/task form | payload 合法 | `name prompt job_kind schedule_* delivery_* skills session_policy toolset_profile` | `job` | reminder / scheduled_task 都可创建 | 非法 `schedule_kind`、缺 name/prompt | 无 | 无 | 最小合法 payload | schedule contract 不匹配 | 连续创建相同任务 | 201，字段完整透传 |
| 获取 job | `/api/automation/jobs/{job_id}` | GET | 获取单 job | 页面/外部 | job 存在 | path job_id | `job` | 正常返回 | 无 | 无 | 不存在 404 | 无 | 无 | 重复 GET 一致 | job id 与 path 一致 |
| pause job | `/api/automation/jobs/{job_id}/pause` | POST | 暂停任务 | job section | job 存在 | path job_id | `job` | state->paused enabled->False | 无 | 无 | job 不存在 404 | 无 | 已 paused 再 pause | 快速连点 | 调用 service.pause_job |
| resume job | `/api/automation/jobs/{job_id}/resume` | POST | 恢复任务 | job section | paused job | path job_id | `job` | state->scheduled enabled->True | 无 | 无 | job 不存在 404 | 无 | 非 paused job 恢复语义 | 快速连点 | `now` 注入正确 |
| run job now | `/api/automation/jobs/{job_id}/run` | POST | 立即执行一次任务 | job section | job 存在 | path job_id | `run` | 返回新的 run 记录 | 无 | 无 | job 不存在 404 | 无 | 正在运行时再次 run | 连续点击 run | 返回 AutomationRun |
| delete job | `/api/automation/jobs/{job_id}` | DELETE | 删除任务 | job section | job 存在 | path job_id | 204 | 删除成功 | 无 | 无 | job 不存在 404 | 无 | 删除后再删除 | 连续 delete | 删除后 jobs/status 变化 |
| 列出 runs | `/api/automation/runs` | GET | 获取执行历史 | overview/history | service 可用 | 无 | `runs[]` | 列出 run history | 无 | 无 | 无 | 空 runs[] | 无 | 重复 GET 一致 | runs 字段完整 |
| 获取 status | `/api/automation/status` | GET | 获取产品口径概览指标 | overview cards | service 可用 | 无 | scheduler_running total_jobs_count active_jobs_count paused_jobs_count error_jobs_count run_count failed_runs_count last_* | status 指标正确 | 无 | 无 | 无 | 0 值状态 | 指标口径错误 | 重复 GET 一致 | 不包含 future_hooks 等内部字段 |

## 5. UI 测试文档
- 页面入口：`/workspace/automation`。
- 首屏渲染：标题、描述、tabs、overview cards、form、job list、history list。
- 加载态：jobs/runs/status 任一 loading 时正确显示 loading 文案。
- 空态：无 reminders / tasks / history 时分别展示 empty 文案。
- 错误态：jobs/runs/create 任一 error 在顶部 error box 可见。
- 列表/卡片/面板展示：
  - overview 四张卡片
  - job card 中 state badge、schedule badge、summary/next run
  - history item 中 status badge、started/finished/job id
- 用户交互：
  - create reminder
  - create scheduled task
  - pause / resume
  - run now
  - remove
- 表单校验：name/prompt 为空禁止提交；advanced options 开关后 delivery/skills 输入可见。
- 按钮状态：isPending 时 create disabled；paused job 显示 resume，其他显示 pause。
- 条件渲染：overview/reminders/tasks/history 不同 tab 内容不同。
- 成功反馈：mutation 成功后列表刷新，status/runs 重新计算。
- 失败反馈：顶部 error box 显示错误消息。
- 刷新后状态：已创建 job 与 runs 仍可见。
- 返回/切页后状态：切 tab 后返回仍保持可操作状态。
- 重复点击：快速 pause/resume/run/delete 不应导致 UI 崩溃或错位。

## 6. E2E 测试文档

### 6.1 执行要求
- 本模块 E2E 使用 `agent-browser`。
- 优先结合 `/browse` 做表单和列表交互验证，结合 `/qa` 做状态回归。
- 必须抓 network：jobs/runs/status/create/pause/resume/run/delete。
- 必须截图：overview、创建成功后 job list、history 列表、空态/错误态。

### 6.2 E2E 场景清单

#### 场景 1：创建 reminder 主成功链路
- 场景目标：验证 reminder form 可以创建任务并刷新列表。
- 前置条件：automation API 可用。
- 测试数据：name=`Morning Reminder`，prompt=`提醒我查看今天的工单`，daily 09:00。
- 执行步骤：
  1. `agent-browser open http://localhost:2026/workspace/automation`
  2. `agent-browser wait --load networkidle`
  3. 切到 `reminders` tab。
  4. 填写 name、prompt、time，提交。
  5. 重新 snapshot，查看 reminders job list。
- 预期结果：新 job 出现在 reminders 列表，overview/status 计数刷新。
- 关键断言：`POST /api/automation/jobs` 201，后续 jobs/status 重新请求。
- 证据建议：创建前后截图、network 请求导出。
- 自动化建议：适合自动化。
- 优先级：P0。

#### 场景 2：创建 scheduled task 主成功链路
- 场景目标：验证 scheduled task form 与 advanced options 字段透传。
- 前置条件：automation API 可用。
- 测试数据：weekdays、09:00、delivery_mode=local、skills=`checks,summary`。
- 执行步骤：
  1. 打开 tasks tab。
  2. 填写 name/prompt/time。
  3. 打开 advanced options，设置 delivery mode 与 skills。
  4. 提交并检查 tasks list。
- 预期结果：新 task 出现在 tasks 列表，payload 含 `skills` 与 `delivery_mode`。
- 优先级：P0。

#### 场景 3：pause -> resume -> run now -> delete 链路
- 场景目标：验证单个 job 的完整状态流转闭环。
- 前置条件：至少存在 1 个 job。
- 执行步骤：
  1. 在 job card 上点击 Pause。
  2. 验证 badge 变 paused。
  3. 点击 Resume。
  4. 点击 Run Now。
  5. 打开 history tab 验证新 run。
  6. 返回 job list 点击 Remove。
- 预期结果：状态依次变化，run 记录增加，删除后 job 消失。
- 关键断言：pause/resume/run/delete 四个 network 请求成功。
- 优先级：P1。

#### 场景 4：空态与错误态
- 场景目标：验证无 jobs/runs 和接口失败时 UI 文案可用。
- 前置条件：空库或模拟接口失败。
- 预期结果：不同 tab 正确展示 empty/error 文案。
- 优先级：P1。

#### 场景 5：刷新恢复链路
- 场景目标：验证 jobs/runs/status 刷新后恢复一致。
- 前置条件：已有至少一个任务和一个 run。
- 优先级：P1。

### 6.3 必须覆盖的 E2E 场景类型
- 主成功链路：场景 1、2。
- 主失败链路：场景 4。
- 刷新恢复链路：场景 5。
- 返回/重进链路：各 tab 切换与返回。
- 重复点击/重复提交链路：create、pause/resume、run now、remove。
- 接口报错后的 UI 反馈链路：场景 4。
- 模块间联动链路：delivery mode / skills 与 settings/bridge 的约束。

### 6.4 agent-browser 与 skill 使用建议
- 适合 `/browse`：表单填写、tab 切换、job 操作。
- 适合 `/qa`：overview + history + state 变更回归。
- 适合 report-only：仅导出 UI 缺陷与状态问题。
- 必须抓 network：create / pause / resume / run / delete / jobs / runs / status。
- 必须看 console：表单状态和 mutation 异常。
- 必须截图留证：创建成功前后、history 追加记录、空态/错误态。

## 7. 数据一致性与状态流转测试
- create 后 jobs/status/runs query 一起 invalidation。
- paused_jobs_count / active_jobs_count / failed_runs_count 与 jobs/runs 一致。
- job state badge 与 enabled 字段一致。
- history run 与 `run now` 的即时执行结果一致。
- schedule label 与 payload `schedule_preset/schedule_kind/schedule_value` 一致。

## 8. 异常与边界测试
- 缺参：name/prompt 缺失。
- 非法参数：schedule_kind 非法、timezone 异常、delivery_mode 非法。
- 超长输入：长 prompt、长 skills 列表。
- 特殊字符：中文、emoji、换行、逗号分隔 skills。
- 空数据：jobs/runs/status 全 0。
- 资源不存在：操作不存在 job。
- 接口 4xx / 5xx：create/run/delete/pause/resume。
- 超时：scheduler 或 run now 长时间执行。
- 并发更新：两个窗口同时操作同一个 job。
- 状态非法切换：已 paused 再 pause、删除后再 resume。
- 刷新/回退/重进：刷新后状态一致。
- 重复操作问题：连点 create/run/delete。

## 9. 自动化建议
- 后端接口自动化优先：jobs CRUD、runs、status、invalid schedule。
- 前端 contract/integration：draft-builder、presentation、tabs 切换。
- agent-browser E2E：create reminder/task、pause/resume/run/delete。
- 人工探索：delivery mode 与 channel/multi 复杂联动。
- 最小冒烟集合：create reminder、run now、history 有记录、delete。
- 最小回归闭环：overview -> create -> job actions -> history -> delete。
- 高收益自动化优先级：P0 是 create/status；P1 是 state transitions/history。

## 10. 风险与优先级
- P0 必测项：两种 create 链路、status 统计。
- P1 高价值项：pause/resume/run/delete、history。
- P2 扩展项：复杂 delivery mode、多技能附带。
- 最容易漏测的点：`run now` 返回 run 记录而非 job；overview 是聚合数据，不能只测 UI。
- 最容易出现线上事故的链路：创建成功但 query 未刷新、job 状态与 badge 不一致、history 漏记录。
- 上线前必须回归的部分：create、run now、delete、status overview。

