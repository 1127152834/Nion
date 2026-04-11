# Personal-First Enterprise Agent Backend V1 Plan

## Goal

在不破坏当前“私人助理”主产品语义的前提下，为应用增加一个可选的企业接入层，并先完成 V1 企业后台底座。

V1 只做底座，不先做完整群聊和 `@助手` 产品面。

## Chosen architecture

### Service split

#### Local personal service

保留当前本地服务链：

- `backend/app/gateway/app.py`
- `backend/app/daemon/app.py`
- `backend/app/gateway/routers/notebook.py`
- `backend/app/gateway/routers/user_identity.py`
- `backend/packages/harness/nion/config/paths.py`

职责：

- notebook / wiki / memory / soul / thread 等个人私域能力
- enterprise connector 状态
- 目录 visibility metadata
- public manifest exporter

#### Remote enterprise backend

新增：

- `backend/app/enterprise/app.py`
- `backend/app/enterprise/routers/*`
- `backend/packages/harness/nion/enterprise/*`

职责：

- 组织 / 部门 / 职位 / 成员
- 申请 / 审批
- 企业身份会话
- 设备绑定
- 公共知识镜像与聚合索引
- 最小审计

### Why this split

- notebook 当前明确是“personal desktop notebook knowledge base”，不应该变成企业控制面
- 企业后台需要独立部署和独立权限模型
- 但现在直接拆成独立仓库还太重，所以先在同一仓库里分 app、分 domain、分测试

## Proposed file map

### Backend create

- `backend/app/enterprise/app.py`
- `backend/app/enterprise/config.py`
- `backend/app/enterprise/routers/access.py`
- `backend/app/enterprise/routers/applications.py`
- `backend/app/enterprise/routers/auth.py`
- `backend/app/enterprise/routers/devices.py`
- `backend/app/enterprise/routers/knowledge.py`
- `backend/app/enterprise/routers/admin.py`
- `backend/packages/harness/nion/enterprise/models.py`
- `backend/packages/harness/nion/enterprise/repository.py`
- `backend/packages/harness/nion/enterprise/service.py`
- `backend/packages/harness/nion/enterprise/access_state.py`
- `backend/packages/harness/nion/enterprise/probe.py`
- `backend/packages/harness/nion/enterprise/device_binding.py`
- `backend/packages/harness/nion/enterprise/public_mirror.py`
- `backend/packages/harness/nion/enterprise/audit.py`

### Backend modify

- `backend/app/runtime/app_factory.py`
- `backend/app/gateway/app.py`
- `backend/app/gateway/routers/notebook.py`
- `backend/packages/harness/nion/config/paths.py`

### Frontend create

- `frontend/src/components/workspace/settings/enterprise-access-settings-page.tsx`
- `frontend/src/core/enterprise-access/api.ts`
- `frontend/src/core/enterprise-access/hooks.ts`
- `frontend/src/core/enterprise-access/types.ts`
- `frontend/src/core/notebook/visibility.ts`

### Frontend modify

- `frontend/src/components/workspace/settings/settings-sections.ts`
- `frontend/src/components/workspace/settings/settings-dialog.tsx`
- `frontend/src/components/workspace/notebook/notebook-page.tsx`
- `frontend/src/components/workspace/notebook/notebook-tree-view.tsx`
- `frontend/src/components/workspace/notebook/notebook-sidebar.tsx`

## Delivery phases

### Phase 0: Contract-first boundary split

输出：

- enterprise app skeleton
- enterprise domain package skeleton
- local connector state machine
- probe / application / auth / device / public-manifest contract drafts

完成标准：

- 本地个人服务和企业后台的职责边界写死
- 不允许再把企业控制面逻辑塞进 notebook 主链

### Phase 1: Enterprise onboarding core

输出：

- 组织 / 成员 / 申请 / 审批模型
- 申请提交与审批接口
- 申请态结果通知通道

完成标准：

- 探针 -> 申请 -> 审批 / 拒绝闭环成立

### Phase 2: Security hardening chain

输出：

- 默认密码策略
- 首次强制改密
- 设备绑定 / 解绑 / 禁止未绑定设备登录

完成标准：

- 企业会话不能脱离设备绑定独立存在

### Phase 3: Local enterprise connector UX

输出：

- settings 中的 enterprise access page
- 本地 enterprise 状态持久化
- pending / rejected / approved / active UI

完成标准：

- 私人模式和企业模式切换清晰
- 未接入企业时企业功能和 hooks 完全隐藏

### Phase 4: Public knowledge sync

输出：

- 目录 visibility metadata
- public manifest exporter
- enterprise public mirror ingest / update / delete

完成标准：

- 目录默认 private
- 只有显式 public 目录被同步
- public -> private 撤回删除成立

### Phase 5: Audit and V1 acceptance

输出：

- 最小审计模型
- 隐私边界回归
- V1 验收矩阵

完成标准：

- 管理员无法访问私密区
- 企业后台只保留必要元数据和 public mirrors

## Hard rules during implementation

- 不要把 enterprise access 状态塞进现有 `user_identity` 语义里
- 不要把 public/private 做成 note 级离散开关；先以目录级为主
- 不要让 enterprise public mirror 反向成为本地知识 owner
- 不要为了快把审批结果通知偷做成“登录后才可见”
- 不要在 V1 偷带入多企业或多设备漫游

## What comes after V1

只有在以下条件全部成立后，才继续做群聊和 `@助手`：

- onboarding 主链稳定
- 设备绑定稳定
- public mirror sync 稳定
- privacy boundary 稳定

到那时再新增：

- 企业群聊对象模型
- `@用户` / `@用户助手` 路由
- `@助手` 最小审计痕迹

## Immediate next step

按 `.omx/plans/prd-personal-first-enterprise-backend-v1.md` 和 `.omx/plans/test-spec-personal-first-enterprise-backend-v1.md` 进入实现规划或执行，不再重新讨论根边界。
