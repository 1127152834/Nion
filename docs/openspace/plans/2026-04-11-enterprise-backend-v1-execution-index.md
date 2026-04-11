# Enterprise Backend V1 Execution Index

## Why this exists

`Personal-First Enterprise Agent Backend V1` 已经完成 intake、PRD 和测试规范，但它天然跨了多个相对独立的子系统。如果把它们塞进一张巨型 implementation plan，后面只会重新走向补丁叠补丁。

因此这里先把执行拆成若干可独立落地、可单独验收的子计划。

## Subplans

### Plan A: Enterprise Access Foundation

目标：

- 新增 remote enterprise app 的 probe surface
- 本地应用新增 enterprise access state
- settings 中新增 enterprise access 页面
- 跑通“启用开关 + `base_url` 探针 + 本地状态持久化”

产物：

- [2026-04-11-enterprise-access-foundation-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/openspace/plans/2026-04-11-enterprise-access-foundation-implementation-plan.md)

### Plan B: Enterprise Enrollment, Approval, and Device Binding

目标：

- 申请单模型
- 管理员审批 / 拒绝
- 申请态结果通知
- 默认密码 + 首次改密 + 设备绑定

依赖：

- Plan A 完成

### Plan C: Public Directory Visibility and Mirror Sync

目标：

- notebook 目录 visibility metadata
- public manifest exporter
- 企业镜像 create / update / delete

依赖：

- Plan A 完成
- Plan B 至少完成企业 active session 主链

### Plan D: Privacy Boundary Hardening and V1 Acceptance

目标：

- 最小审计
- 管理员访问边界
- 端到端回归
- V1 exit gate

依赖：

- Plan B 完成
- Plan C 完成

## Execution rule

- 先做 Plan A，再做 Plan B。
- 在 Plan B 未完成之前，不进入群聊和 `@助手`。
- 在 Plan C 未完成之前，不让任何知识离开本地。
- 在 Plan D 未通过之前，不宣布 V1 成立。
