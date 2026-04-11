## Metadata

- Profile: standard
- Rounds: 9 focused clarification rounds + 2 pressure clarifications
- Final ambiguity: 0.08
- Threshold: 0.20
- Context type: brownfield
- Context snapshot: `.omx/context/personal-first-enterprise-agent-backend-20260411T031107Z.md`
- Transcript: `.omx/interviews/personal-first-enterprise-agent-backend-20260411T031107Z.md`

## Clarity Breakdown

| Dimension | Score | Notes |
| --- | --- | --- |
| Intent Clarity | 0.97 | 明确是“个人助理升级为可接入企业协作网络”，不是直接改造成企业主系统 |
| Outcome Clarity | 0.95 | 已锁定 V1 成功定义：接入主链路 + 数据边界生效 |
| Scope Clarity | 0.90 | 已明确 V1 先做后台底座，并排除了多企业、漫游、共享编辑等扩张项 |
| Constraint Clarity | 0.92 | 隐私优先、管理员无私域穿透权、单设备绑定、申请制等约束已经固定 |
| Success Criteria | 0.91 | 已明确 base_url 探针、审批通知、设备绑定、改密、公开目录同步等验收标准 |
| Context Clarity | 0.83 | 已确认现有系统是 brownfield 单机产品，具备 notebook / desktop bridge 基础，但尚无企业租户主链 |

## Intent

在保住当前产品“私人助理”本质的前提下，逐步把用户数字化，让用户未来能够通过公开知识代理被他人高效询问，而不是把整个系统重心迁移成企业统一工作台。

## Desired Outcome

得到一份可直接进入规划阶段的产品需求边界，明确：

1. 个人模式与企业接入模式如何共存
2. 企业后台 V1 要先建设哪些底层能力
3. 哪些数据永远留在个人私域，哪些数据可以进入企业域
4. 公开知识聚合与 `@助手` 回答的安全前提是什么
5. 哪些能力必须压后，不进入 V1

## In Scope

- 企业后台启用开关与 `base_url` 探测
- 申请制企业接入链路
- 管理员审批 / 拒绝与实时通知
- 默认密码与首次强制改密
- 单安装实例绑定单企业
- 单设备绑定登录
- 接入企业后的目录级公开 / 私密知识同步模型
- 企业公开知识聚合视图
- `@某人助手` 的最小留痕规则

## Out of Scope / Non-goals

- 多企业同时接入
- 跨设备漫游
- 企业共享知识协同编辑
- 管理员代管或查看个人私密知识
- 多人共同维护同一个个人助手
- 自动把私密目录推荐为公开
- 企业外部联系人网络
- 具体数据库表、API schema、前端组件拆分、实现细节

## Decision Boundaries

- 产品主体始终是个人应用，不是企业租户壳
- 企业能力必须显式启用，不得默认侵入私人模式
- 未接入企业时，不暴露公开 / 私密知识开关
- 接入企业后，知识仍默认全部私密
- 只有用户手动公开目录，服务端才接收同步
- 管理员只拥有企业域治理权，没有私域穿透权
- 企业公开知识库是个人公开知识的聚合，不是共享编辑空间
- `@助手` 回答正文不做长期保存，只保留必要审计痕迹
- V1 单应用实例只绑定一个企业

## Constraints

- 强安全意识优先于功能铺开速度
- 申请制替代自注册
- 审批结果必须实时送达申请人
- 默认密码必须在首次登录后立即失效
- 设备绑定必须是强约束
- 公开转私密时，服务端必须删除已同步知识

## Testable Acceptance Criteria

- 用户可在设置中启用企业后台并输入 `base_url`
- 应用能正确探测 `base_url` 是否为有效企业后台
- 未接入企业时，企业功能和相关 hooks 不出现或不生效
- 用户可提交企业接入申请，包含用户名、姓名、组织架构、职位
- 管理员可审批或拒绝申请，并附带拒绝理由
- 申请人能够第一时间收到审批通过 / 拒绝通知
- 登录必须绑定当前安装设备，未绑定设备不能进入企业模式
- 首次登录后必须修改默认密码
- 未接入企业时，笔记 / wiki 没有公开 / 私密开关
- 接入企业后，笔记 / wiki 默认私密
- 只有用户显式公开的目录会同步到服务端
- 管理员永远不能访问个人私密笔记、私密 wiki、私密会话
- 企业公开知识库只展示个人公开目录聚合结果
- 群里 `@某人助手` 的回答正文不做长期保存，只保留最小审计痕迹
- 一个安装实例只能接入一个企业

## Assumptions Exposed + Resolutions

### Assumption 1

“企业接入后，系统可能应该以企业为根来治理所有数据。”

Resolution:

用户明确否定。根模型是个人应用；企业后台只是一层受控接入能力。

### Assumption 2

“公开知识库也许应该允许多人共编，才能体现企业协同。”

Resolution:

用户明确否定。企业公开知识库只是个人公开知识的聚合视图，不存在协同编排。

### Assumption 3

“既然企业里会有 `@助手` 协作，就应该把问答正文沉淀下来，方便企业复盘。”

Resolution:

用户只接受最小审计痕迹，不接受长期保存问答正文。

### Assumption 4

“V1 也许应该一开始就支持一个用户接多个企业。”

Resolution:

用户明确否定。V1 单应用实例只允许绑定一个企业。

## Pressure-pass findings

- Revisited answer: “企业公开知识库”的产品语义
- Pressure method: 追问其是否属于共享编辑空间
- Finding: 不是；它只是个人公开知识的聚合
- Outcome: 后续可避免把知识库错误规划成协作文档系统

- Revisited answer: “企业功能区”这类抽象词
- Pressure method: 用户指出术语不清后，改拆成群聊消息、审批记录、`@助手` 问答三类对象重问
- Finding: 企业协作数据与个人私域数据的边界需要按对象逐一建模，不能靠抽象大词兜底
- Outcome: 问题从抽象平台叙事收敛到可落地的数据对象

## Brownfield Evidence vs Inference

### Evidence

- `frontend/src/app/workspace/notebook/page.tsx` 表明现有产品已有 notebook 工作区
- `frontend/src/core/memory-settings/api.ts` 表明现有系统已有 memory settings 访问链
- `desktop/src/main/index.ts` 表明桌面端已有远端 base URL 交互能力
- `desktop/src/main/bridge/` 表明桌面端已有多平台 bridge 基础设施

### Inference

- 当前系统适合按“在单机产品上增量接入企业能力”的方式推进
- 企业身份、审批、设备绑定、知识同步治理等仍需要新增清晰子系统，而不是从现有 memory / notebook 逻辑里补丁扩张

## Technical Context Findings

- 当前仓库适合拆成“个人本地能力”与“企业后台能力”两条明确主链
- 企业后台 V1 应优先抽出：组织与成员、审批、设备绑定、企业身份会话、公开知识聚合索引、最小审计
- 公开 / 私密切换必须以目录为单位，并要求本地到服务端的可逆同步协议
- 审批拒绝通知是一个关键安全设计点，因为对象尚未正式注册

## Answer to carry forward

- 产品主语义：个人优先，企业可接入
- V1 主轴：先搭企业后台底座，不先做群聊表层
- 数据边界：默认只上传身份与设备；知识默认不出本地，只有公开目录同步
- 权限边界：管理员永远不能碰个人私密区
- 知识模型：企业公开知识库只是个人公开知识的聚合
- 留痕边界：`@助手` 问答只保留最小审计痕迹，不长期保存正文
- 范围边界：V1 单企业、单设备、无漫游、无共享编辑、无外部联系人网络

## Execution Bridge

推荐下一步使用 `$ralplan`，聚焦以下规划主题：

1. 企业接入状态机与前后端切换语义
2. 审批 / 通知 / 未注册申请人收件通道
3. 设备绑定与企业会话安全模型
4. 目录级公开知识同步与撤回删除协议
5. 企业群聊、`@助手`、最小审计之间的数据对象建模
6. 后台管理面与个人设置面的职责边界
