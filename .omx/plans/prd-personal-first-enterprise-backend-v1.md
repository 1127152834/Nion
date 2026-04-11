# PRD: Personal-First Enterprise Backend V1 Foundation

日期：2026-04-11
状态：Draft for consensus review
输入规格：`.omx/specs/deep-interview-personal-first-enterprise-agent-backend.md`

## Task

把当前单机个人 agent 系统演进成“个人优先、企业可接入”的双态产品，并先实现 V1 企业后台底座。

V1 不直接做完整群聊产品，而是先打通以下主链：

- 企业后台启用与 `base_url` 探针
- 申请制接入
- 管理员审批 / 拒绝与实时通知
- 设备绑定登录
- 首次强制修改默认密码
- 个人目录级公开知识同步
- 管理员只治理企业域与公开数据，不得穿透个人私域

## Desired Outcome

1. 当前本地个人模式保持完整且默认可用。
2. 接入企业后，应用进入受控企业模式，但仍不失去个人私域所有权。
3. 企业后台获得组织、成员、审批、设备、公开知识索引、最小审计等控制面能力。
4. 企业公开知识库只作为个人公开知识的聚合视图存在，不演化为共享编辑空间。
5. 后续群聊、`@用户助手`、企业协作消息可以建立在该底座上，而不是先做表层再回填安全边界。

## Principles

1. **个人是根，不是租户。** 企业接入是能力层，不是产品根模型。
2. **私密默认值不可妥协。** 未接入企业时没有公开语义；接入后也必须默认私密。
3. **个人私域与企业域必须分仓。** notebook / wiki / 私密会话是个人资产，企业控制面只管理接入、公开镜像和协作元数据。
4. **企业公开知识只聚合，不共编。** owner 永远是个人。
5. **设备绑定和最小留痕是架构前提。** 不是后续补丁。
6. **V1 只支持单企业绑定。** 多企业接入不进入首期范围。

## Decision Drivers

1. 当前 gateway 明确把 notebook 视为“personal desktop notebook knowledge base”，不适合直接长进企业控制面语义：
   - `backend/app/gateway/app.py:48-129`
   - `backend/app/gateway/routers/notebook.py:1-40`
2. 当前用户身份仍是本地用户画像，不存在企业身份主链：
   - `backend/app/gateway/routers/user_identity.py:1-45`
3. 当前应用路径模型明确把 notebook 视为 user-owned base dir 下的本地资产：
   - `backend/packages/harness/nion/config/paths.py:8-38`
   - `backend/packages/harness/nion/config/paths.py:68-98`
4. daemon channels 已经有 “authorized users / pair requests / live diagnostics” 这类控制面模式，可借鉴但不能直接复用为企业身份系统：
   - `backend/app/daemon/routers/channels.py:1-120`
   - `backend/app/daemon/routers/channels.py:185-312`
5. 前端 settings 已有扩展 section 的既有模式，适合增加企业接入页面，而不是另起一套壳：
   - `frontend/src/components/workspace/settings/settings-sections.ts:1-18`
   - `frontend/src/components/workspace/settings/agent-integrations-settings-page.tsx:1-180`
6. notebook 当前是目录中心模型，适合把“公开 / 私密”收敛成目录级标记，而不是文档级散弹开关：
   - `frontend/src/components/workspace/notebook/notebook-page.tsx:1-120`
   - `frontend/src/components/workspace/notebook/notebook-tree-view.tsx:1-120`

## Viable Options

### Option A: 直接把企业能力塞进当前 gateway / notebook / user_identity 主链

做法：

- 在现有 `backend/app/gateway/routers/*` 体系中继续新增 enterprise endpoints
- 让 notebook 目录、user identity、memory settings 直接承载企业接入、审批、设备与公开同步逻辑

Pros:

- 初看起来改动入口少
- 能复用现有 app 启动与路由装配

Cons:

- 会把“个人私域”和“企业控制面”混进同一个产品面与 API 面
- notebook router 会被迫承担企业接入语义，边界错误
- 后续一旦需要独立部署企业服务，会更难抽离
- 很容易走成补丁叠补丁

### Option B: 在同一仓库中新增独立 enterprise control-plane app，并复用共享 domain package

做法：

- 保留当前 gateway / daemon 继续服务本地个人应用
- 新增 `backend/app/enterprise/app.py` 和独立 routers
- 新增共享包 `backend/packages/harness/nion/enterprise/*`
- 本地应用只新增 enterprise connector、visibility metadata、public sync exporter

Pros:

- 清晰区分本地个人服务与远端企业后台服务
- 保持 notebook / memory / soul 的个人语义不被污染
- 仍可在同一仓库内共享模型、配置、测试工具与部署管线
- 适合 V1，且为后续真正独立部署保留空间

Cons:

- 要新增一套 app surface 和 enterprise storage
- 需要设计“本地 connector -> 远端 backend”的明确协议

### Option C: 立即把企业后台拆成独立仓库 / 独立系统

做法：

- 新仓库、新部署、新数据库、新前后端管理台
- 当前仓库只保留个人应用和 connector SDK

Pros:

- 边界最干净
- 长期组织级隔离最彻底

Cons:

- 对当前阶段过重
- 会把 V1 变成基础设施项目，吞掉产品验证节奏
- 当前还没有足够稳定的企业域模型来支撑单独拆仓

## Recommended Decision

选择 **Option B**。

V1 在当前仓库内增加 **独立 enterprise control-plane app + 共享 enterprise domain package**，同时让本地个人应用只承担：

- enterprise access setting
- `base_url` 探针
- 企业登录 / 申请态 UI
- 本地目录公开 / 私密标记
- 公开知识增量同步器

## RALPLAN-DR Summary

### Principles

1. Personal-first root
2. Private-by-default knowledge
3. Separate personal service and enterprise backend
4. Aggregate public knowledge, never co-edit it
5. Security-first onboarding and retention

### Decision Drivers

1. notebook / user_identity 当前都是本地个人语义
2. 企业后台需要独立的审批、设备、安全、审计模型
3. V1 需要清晰边界，但还不值得单独拆仓

### Viable Options

- A. 继续扩展现有 gateway 主链
- B. 同仓独立 enterprise control-plane app
- C. 立即拆成独立仓库 / 独立系统

## Pre-mortem

### Scenario 1: 私密知识误同步到企业

触发方式：

- 本地目录默认值处理错误
- 公开 / 私密标记挂在 note 上而不是目录上，导致状态不一致

后果：

- 企业后台获得本不该看到的私密内容
- 整个产品的信任模型被破坏

缓解：

- 目录默认值必须硬编码为 private
- 本地 exporter 仅发送显式 public manifest
- 服务端只接受 manifest 中的 public nodes，不做“自动推断公开”

### Scenario 2: 未绑定设备仍能进入企业模式

触发方式：

- 默认密码登录后缺少二次设备注册
- 登录态和设备态分离不严格

后果：

- 企业身份可在任意机器被复制使用
- 安全边界退化成普通账号密码模型

缓解：

- 设备绑定成为登录完成的必要条件
- 企业 session 必须与 device binding record 一起校验
- 首次登录后的强制改密不能跳过设备完成态

### Scenario 3: 被拒绝的申请人收不到通知，状态悬空

触发方式：

- 只设计了正式登录后 websocket，没设计申请态通知通道

后果：

- 用户无法知道申请结果
- 管理员与用户都失去确定状态

缓解：

- 单独设计申请态 receipt token / inbox channel
- 审批通过 / 拒绝都走同一个 application-state event path
- 本地 UI 能在重启后恢复“待审批 / 已拒绝 / 已通过”状态

## ADR

### Decision

采用“**本地个人服务 + 远端企业控制面**”的双服务结构：

1. 当前 gateway / daemon 保持个人模式主链。
2. 新增 enterprise app 作为远端企业后台。
3. 新增 `nion.enterprise.*` 共享领域包，承载组织、成员、申请、审批、设备、会话、公开知识镜像、审计等能力。
4. notebook 只增加目录级 visibility metadata 与 export manifest，不引入企业知识编辑语义。
5. 企业公开知识库只接收镜像与索引，不接收协同编辑写入。
6. V1 不实现完整群聊产品；只提供审批通知、最小审计和未来协作对象模型的接口 seam。

### Drivers

- 现有 notebook / user identity / memory 是个人本地语义
- 用户明确要求“个人优先 + 企业可接入”
- 安全与权限边界必须结构化，而不是配置项式补丁

### Alternatives Considered

- 继续往 gateway 上补 enterprise endpoints
- 直接拆仓成企业独立系统

### Why Chosen

- 这是唯一同时满足“边界清晰、V1 可落地、长期可演进”的路线
- 它保留当前产品节奏，又不给未来企业控制面留下技术债地雷

### Consequences

- 需要新增 enterprise app、enterprise storage、connector 协议
- 前后端都需要增加新的 access state machine
- notebook 需要最小程度新增 visibility metadata，但不能被改造成企业协作文档系统

### Follow-ups

- 先定义企业接入状态机与 API contract
- 再定义设备绑定与申请态通知协议
- 再定义 public manifest/export/sync/delete 协议
- 最后才进入群聊与 `@助手` 的企业协作层

## Product Scope

### In Scope

- enterprise app skeleton 与 domain package
- `base_url` 探针
- 企业接入开关与 enterprise connector state machine
- 申请制接入
- 管理员审批 / 拒绝
- 申请态结果通知
- 设备绑定
- 默认密码首次改密
- 本地目录 visibility metadata
- public manifest/export/sync/delete 协议
- 企业公开知识聚合索引
- auth / approval / sync / device 的最小审计

### Out of Scope

- 企业群聊产品本身
- `@用户助手` 执行链本身
- 多企业接入
- 跨设备漫游
- 企业共享编辑知识库
- 管理员读取私密区
- 外部联系人网络
- notebook / memory / soul 的额外产品重构

## Acceptance Criteria

1. 应用设置中存在企业后台启用开关和 `base_url` 输入 / 探测流程。
2. 未启用企业后台时，不显示公开 / 私密目录语义，也不启动任何企业 hooks。
3. 企业后台可接收申请单，申请字段包含用户名、姓名、组织架构、职位。
4. 管理员可审批 / 拒绝并附带理由。
5. 申请人在未正式注册前，也能收到审批结果。
6. 登录成功后必须完成设备绑定；未绑定设备不能进入企业模式。
7. 首次登录必须强制修改默认密码。
8. 接入企业后，所有目录默认私密。
9. 只有用户显式标记为 public 的目录会被同步到企业后台。
10. public 目录切回 private 时，企业后台对应内容会被删除。
11. 管理员只能看到组织、成员、设备、申请、公开知识和企业域元数据，不能看到私密 notebook / wiki / 会话正文。
12. 企业公开知识库只提供聚合视图，不支持协同编辑。
13. 一个安装实例只能绑定一个企业。

## Workstreams

### Workstream 0: Contracts and service split

- 建立 enterprise app 入口与 shared domain package
- 明确 local gateway / daemon 与 remote enterprise app 的职责边界
- 定义 enterprise connector 状态机

### Workstream 1: Organization / identity / application domain

- 组织、部门、岗位、成员、申请单、审批动作模型
- 企业身份账号与状态机

### Workstream 2: Auth / device / first-login hardening

- 默认密码
- 首次改密
- 设备绑定与设备拒绝
- 单企业单设备约束

### Workstream 3: Local connector and application-state delivery

- `base_url` 探针
- 本地保存 enterprise access state
- 申请态结果通知机制
- 企业模式 UI 入口与隐藏逻辑

### Workstream 4: Public knowledge exposure and mirror sync

- 目录 visibility metadata
- public manifest 生成
- 增量同步
- public -> private 撤回删除
- 企业聚合索引

### Workstream 5: Audit and V1 acceptance hardening

- 最小审计模型
- 敏感内容脱敏
- 失败恢复
- 验收与回归

## Available-Agent-Types Roster

- `architect`: 服务边界、部署面、状态机、协议分层
- `executor`: 后端 / 前端实现
- `test-engineer`: 测试矩阵、contract / e2e 规划
- `security-reviewer`: auth、设备绑定、最小留痕、权限边界
- `verifier`: 完成证据与验收校验
- `writer`: 面向产品/设计/交付的说明文档

## Follow-up Staffing Guidance

### Ralph path

- Lane 1 `architect` `high`: 敲定 service split、state machine、API contract
- Lane 2 `executor` `high`: enterprise app + shared domain package
- Lane 3 `executor` `high`: local connector + settings / notebook visibility UI
- Lane 4 `test-engineer` `medium`: contract + e2e + regression
- Lane 5 `security-reviewer` `medium`: auth/device/retention 审计

### Team path

- Worker A: enterprise backend domain and routers
- Worker B: local connector, settings, notebook visibility metadata
- Worker C: sync protocol and public mirror pipeline
- Worker D: test and verification harness
- Reviewer lane: security + final verifier

## Launch Hints

- `$team "Implement .omx/plans/prd-personal-first-enterprise-backend-v1.md with test spec .omx/plans/test-spec-personal-first-enterprise-backend-v1.md"`
- `$ralph ".omx/plans/prd-personal-first-enterprise-backend-v1.md"`

## Team Verification Path

1. Team proves enterprise app / local connector / public sync flows independently.
2. Security reviewer validates private-data non-leak and device-binding gates.
3. Ralph/verifier runs final onboarding + sync + revoke regression before claiming V1 done.

## Verification Strategy

- 先锁 API / state contracts，再上实现
- 先做 auth/device/approval 的安全主链，再接 visibility/sync
- 公开知识同步必须以“默认 private + explicit public manifest”做 contract-first 测试
- 任何群聊 / `@助手` 工作都必须等 V1 验收通过后再启动
