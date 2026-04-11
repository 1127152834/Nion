## Task statement

把当前单机个人 agent 助手演进为“个人优先、可接入企业后台”的企业级 agent 系统，并先明确 V1 后台底座的边界。

## Desired outcome

得到一份足够清晰的需求收敛结果，能直接进入下一阶段规划，重点覆盖：

- 个人模式与企业接入模式的切换边界
- 企业后台底座的职责
- 公私知识同步与 `@助手` 的权限前提
- 审批、设备绑定、留痕和隐私边界

## Stated solution

用户希望：

- 应用默认可独立作为私人助理使用
- 在设置中通过开关启用企业后台，并输入 `base_url`
- 应用自动探测企业后台可用性
- 未登录时进入申请 / 登录链路
- 企业侧不允许自注册，只允许申请并由管理员审批
- 接入企业后，只有用户显式公开的知识目录才同步到服务端
- 未来支持群聊中 `@某人的助手`，由服务端聚合的公开知识代答

## Probable intent hypothesis

在不牺牲个人隐私和本地自治的前提下，把个人助理升级成组织协作网络中的一个节点，使“问人”可以逐步演进成“问此人的公开知识代理”。

## Known facts / evidence

- 仓库已经是 brownfield：包含 `backend/`、`frontend/`、`desktop/`
- 前端已有 notebook / settings / memory 等工作区结构
- 桌面端已有对外部平台和 base URL 交互的桥接代码
- 当前系统主线仍是单用户 memory / soul / notebook 体验，不存在企业租户底座
- 用户明确要求系统以个人应用为根，而不是以企业租户为根

## Constraints

- 强隐私优先，管理员永远不得穿透个人私密区
- V1 先做企业后台底座，不先做群聊产品面
- V1 单安装实例只允许接入一个企业
- 不允许个人自注册，只允许申请制
- 每个应用实例必须绑定当前安装设备
- 默认密码统一，但首次登录必须强制修改

## Unknowns / open questions carried into planning

- 申请态用户在尚未正式注册前，如何安全接收审批拒绝通知
- 设备绑定采用哪种设备指纹 / 密钥注册方案
- `base_url` 探针的协议、健康检查和版本协商格式
- 企业消息正文、最小审计痕迹、公开知识索引三者的具体表结构和 retention 规则
- 本地私密目录切换为公开 / 私密时的同步删除协议

## Decision-boundary unknowns

- V1 是否需要单独的“企业身份会话”与“个人本地会话”双 token 模型
- 审批通知应走未授权 websocket、轮询 inbox、还是基于申请单号的临时收件通道
- 设备解绑由谁发起、是否需要管理员二次审批

## Likely codebase touchpoints

- `frontend/src/app/workspace/notebook/page.tsx`
- `frontend/src/core/memory-settings/api.ts`
- `desktop/src/main/index.ts`
- `desktop/src/main/bridge/`
- `backend/` 下未来新增的 enterprise auth / org / approval / device-binding / public-knowledge 模块
