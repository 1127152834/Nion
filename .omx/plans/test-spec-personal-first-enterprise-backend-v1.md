# Test Spec: Personal-First Enterprise Backend V1 Foundation

日期：2026-04-11
状态：Draft for consensus review
对应 PRD：`.omx/plans/prd-personal-first-enterprise-backend-v1.md`

## Verification Goals

1. 私人模式在未接入企业时保持完整，不暴露任何企业语义。
2. 企业接入主链路可闭环运行：探针 -> 申请 -> 审批/拒绝 -> 通知 -> 登录 -> 设备绑定 -> 首次改密。
3. 个人知识默认不出本地；只有显式 public 目录会同步。
4. public -> private 切换会撤回删除服务端镜像。
5. 管理员永远无法访问私密 notebook / wiki / 会话正文。
6. 一个安装实例只能绑定一个企业。

## Verification Layers

1. Backend unit / contract verification
2. Backend integration / API verification
3. Frontend state / contract verification
4. End-to-end onboarding and sync verification
5. Security and observability verification

## Expanded Test Plan

### Unit

#### Backend

- `base_url` probe classifier:
  - valid enterprise endpoint
  - non-enterprise endpoint
  - unreachable endpoint
- enterprise access state machine:
  - disabled -> probing -> disconnected
  - disconnected -> applying
  - applying -> pending
  - pending -> approved / rejected
  - approved -> login_required
  - authenticated -> device_unbound
  - device_unbound -> password_reset_required
  - password_reset_required -> active
- application service:
  - create application
  - reject application with reason
  - approve application
  - re-apply guard when pending already exists
- application receipt token / pending inbox resolver:
  - can fetch status without full login
  - cannot read another applicant's status
- device binding service:
  - first bind success
  - second unbound device rejected
  - revoked device blocked
- first-login password policy:
  - default password accepted exactly once
  - active session blocked until password rotated
- public export manifest builder:
  - no public directories -> empty manifest
  - nested public directory manifest generation
  - private descendants excluded unless explicitly public model allows inheritance
- mirror delete planner:
  - public -> private emits delete operations
  - deleted local directory emits delete operations
- audit writer:
  - strips note body / wiki body / assistant answer body
  - records only IDs, timestamps, result codes, actor IDs

#### Frontend

- enterprise settings section parsing and navigation
- enterprise access reducer / hook state transitions
- notebook directory visibility controls:
  - hidden in personal mode
  - visible in enterprise mode
  - default private state shown
- application status UI:
  - pending
  - approved
  - rejected with reason
- forced password reset gate UI
- device-unbound gate UI

### Integration

#### Local app and remote enterprise backend

- local app can probe enterprise backend health / version endpoint
- local app can submit application and persist local pending state
- enterprise admin approve / reject updates application status
- local app can poll / subscribe to pending application result using receipt token
- approved user can exchange default credentials for an enterprise session
- session without device binding cannot access enterprise resources
- session after password reset can access enterprise resources

#### Public knowledge sync

- local public manifest upload creates enterprise mirror records
- updating a public note body updates mirror content
- switching directory to private deletes corresponding mirror records
- private directories are never mirrored even if note content changes locally
- enterprise knowledge listing only returns mirrored public nodes

#### Authorization boundaries

- admin APIs can list organizations, members, devices, applications, public mirrors
- admin APIs cannot fetch private note content
- no enterprise endpoint exposes raw notebook / wiki content outside mirrored public payloads

### End-to-End

#### Scenario A: Personal mode baseline

1. Launch app without enterprise enabled
2. Open settings and notebook
3. Confirm enterprise UI is hidden
4. Confirm notebook has no public/private controls

#### Scenario B: Rejected application flow

1. Enable enterprise access and enter a valid `base_url`
2. Submit application
3. Admin rejects with a reason
4. Applicant receives rejection result without full enterprise login
5. App returns to rejected/disconnected state without leaking stale session

#### Scenario C: Approved application first login flow

1. Applicant submits application
2. Admin approves
3. Applicant receives approval result
4. Applicant logs in with default password
5. App requires device binding
6. App requires password change
7. Enterprise mode activates only after both succeed

#### Scenario D: Public directory sync flow

1. Enterprise mode active
2. User marks one notebook directory public
3. Mirror appears in enterprise backend
4. User edits content inside that directory
5. Mirror updates
6. User switches directory back to private
7. Mirror disappears from enterprise backend

#### Scenario E: Admin privacy boundary

1. User keeps a second directory private
2. Admin browses enterprise backend
3. Admin can only see organization data and mirrored public content
4. Private directory content remains unreachable

### Observability

- log enterprise access state transitions by device and user
- log application lifecycle transitions
- log device binding success / failure / revoke
- log public mirror sync create / update / delete counts
- log privacy-guard denials when forbidden endpoints are attempted
- never log note bodies, wiki bodies, or `@助手` answer正文

## Contract Tests

### Backend Contracts

- enterprise health / capability probe endpoint
- application submit / status / approve / reject endpoints
- pending applicant status endpoint with receipt token
- enterprise login / first-login password-reset / device-bind endpoints
- public manifest upload / delete endpoints
- mirrored public knowledge listing endpoint
- admin organization / member / device / application / mirror endpoints

### Frontend Contracts

- settings section addition does not break existing navigation
- enterprise access page respects disabled / probing / pending / rejected / active states
- notebook tree / sidebar only renders visibility controls when enterprise mode is active
- visibility controls default to private and require explicit user change

## Regression Matrix

1. 企业开关开启后，个人模式下仍错误显示 public/private 控件
2. 目录默认值不是 private，导致隐式公开
3. private -> public 和 public -> private 不对称，留下脏镜像
4. 审批拒绝只能通过正式登录 websocket 收到，申请态用户收不到
5. 设备绑定不是强约束，未绑定设备也能读企业数据
6. 默认密码改密流程可跳过
7. 管理员接口意外暴露私密 note body / wiki body
8. 单实例可绑定多个企业

## Manual / Smoke

### Backend smoke

- start local personal gateway
- start enterprise app
- verify health and probe contract
- submit application and inspect stored state
- approve / reject through admin path

### Frontend smoke

- toggle enterprise mode on/off
- enter valid and invalid `base_url`
- run pending / rejected / approved UI flows
- verify notebook directory visibility toggle only in enterprise-active state

### Security smoke

- attempt enterprise login from unbound device
- attempt admin fetch of private content
- inspect logs for leaked正文

## Evidence Required

- command outputs for probe/application/auth flows
- screenshots or recorded UI evidence for settings/notebook states
- API traces for approve/reject/device-bind/public-sync
- audit log samples demonstrating minimum-retention behavior

## Exit Criteria

- PRD acceptance criteria all map to concrete tests
- local personal mode regression is clean
- enterprise onboarding mainline passes
- public directory sync and revoke-delete pass
- privacy boundary tests pass
- single-enterprise binding rule passes
- no test or observability artifact shows leaked private正文
