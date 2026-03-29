# 测试文档 07 - Automation 模块

- 文档用途：指导其他 agent 对 reminder / scheduled task、状态概览、运行历史、暂停恢复与立即执行做测试。
- 适合交给哪类 agent 执行：后端 automation API/service 测试 agent、前端表单/UI 测试 agent、E2E agent。
- 推荐优先级：P1。
- 推荐测试方式：接口 + UI + agent-browser E2E。
- 是否建议先做 contract / integration 再做 E2E：是。

## 1. 模块说明
- 模块目标：为用户提供 reminder/scheduled task 自动化创建和运行观察界面。
- 核心业务职责：jobs CRUD、pause/resume/run/delete、runs/history、scheduler status、表单草稿构建。
- 关键代码位置：`frontend/src/components/workspace/automation/*`、`frontend/src/core/automation/*`、`backend/app/gateway/routers/automation.py`、`backend/packages/harness/nion/automation/*`。
- 现有测试：`backend/tests/test_automation_router.py`、`test_automation_repository.py`、`test_automation_scheduler.py`、`frontend/src/core/automation/*.test.ts`。

## 2. 模块边界与测试范围
- 覆盖 jobs/runs/status 与两种表单。
- 不覆盖外部 channel delivery 具体渠道实现细节。
- 交叉点：settings 中 automation 文案、delivery mode、skills 附带。

## 3. 核心业务链路
1. 进入 `/workspace/automation` 后并行拉 jobs/runs/status。
2. 选择 reminder 或 scheduled task 表单，生成 create payload。
3. create 后刷新 jobs/runs/status。
4. 对 job 执行 pause/resume/run/delete。
5. overview/history 区块展示状态和运行记录。

## 4. 接口测试文档
- 必测接口：
  - `GET /api/automation/jobs`
  - `POST /api/automation/jobs`
  - `GET /api/automation/jobs/{job_id}`
  - `POST /api/automation/jobs/{job_id}/pause`
  - `POST /api/automation/jobs/{job_id}/resume`
  - `POST /api/automation/jobs/{job_id}/run`
  - `DELETE /api/automation/jobs/{job_id}`
  - `GET /api/automation/runs`
  - `GET /api/automation/status`
- 关键断言：
  - create 对 `job_kind/schedule_preset/schedule_timezone/delivery_mode` 的透传。
  - pause/resume/run/delete 的状态变更。
  - invalid schedule_kind 返回 422。
  - status response 使用 product-facing metrics。

## 5. UI 测试文档
- 页面入口：`/workspace/automation`。
- 首屏：overview cards、tabs、forms、jobs list、history list。
- 表单：name/prompt/time/cadence/delivery mode/skills。
- 状态：empty、loading、error、paused/running badges。
- 交互：create、pause、resume、run now、remove。
- 刷新后状态：jobs/runs/status 同步更新。

## 6. E2E 测试文档
- 场景 1：创建 reminder，P0。
- 场景 2：创建 scheduled task，P0。
- 场景 3：pause -> resume -> run now -> delete，P1。
- 场景 4：history tab 查看 recent runs，P1。
- 场景 5：无 job 空态与错误态，P1。
- 统一要求：使用 `agent-browser`，抓 jobs/runs/status network，保留创建前后截图。

## 7. 数据一致性与状态流转测试
- create 后 jobs/status/runs query 一起 invalidation。
- paused_jobs_count / active_jobs_count / failed_runs_count 与 runs/jobs 一致。
- schedule 文案与 payload 对应。

## 8. 异常与边界测试
- 缺参、非法 cadence/schedule_kind、空 prompt、timezone 异常、run/pause/delete 不存在 job、慢 scheduler。

## 9. 自动化建议
- 后端接口自动化优先。
- 前端 integration：draft-builder / presentation。
- E2E：创建和操作按钮链路。
- 冒烟：create -> status -> delete。

## 10. 风险与优先级
- P0：create 两种 job。
- P1：状态流转、history。
- 易漏点：delivery mode/skills 附带、status 指标口径。
- 事故链路：job 创建成功但状态未刷新，pause/resume 文案与真实状态不一致。

