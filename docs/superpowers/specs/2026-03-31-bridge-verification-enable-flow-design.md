# Bridge Verification Enable Flow Design

## Goal

把桥接平台的交互改成“先完成连接验证，再允许启用渠道”，并要求每次重新启用渠道时自动复验连接。

## Scope

- 前端桥接页的 5 个平台分区：Telegram、飞书、Discord、QQ、微信
- 桌面端桥接设置持久化与平台启动守卫
- 微信账号接入视为连接配置的一种形式，需要纳入同一门槛

## Current Problem

- 平台渠道开关始终可用，用户可以在未完成连接验证前直接启用平台。
- 平台启用逻辑会顺带打开 `remote_bridge_enabled`，导致“启用”和“配置成功”耦合顺序错误。
- 当前运行时只检查 `bridge_<platform>_enabled` 与适配器配置字段，不检查该平台是否通过过连接验证。

## Target Behavior

### Common Rules

1. 配置区始终可编辑，用户不需要先启用平台才能录入凭据或完成扫码。
2. 平台开关只有在“连接验证通过”后才允许切换。
3. 每次从关闭切换到启用时，先自动执行一次连接复验；复验成功后才真正启用。
4. 如果关键凭据发生变化，旧的验证状态立即失效，同时清除该平台启用状态。
5. 运行时启动平台时，桌面端要再次检查该平台是否处于“已验证”状态，防止旧状态或手工写配置绕过前端。

### Platform-Specific Validation

- Telegram：`verifyTelegram` 成功
- 飞书：`verifyFeishu` 成功
- Discord：`verifyDiscord` 成功
- QQ：`verifyQq` 成功
- 微信：至少存在一个已关联且持有 token 的微信账号；启用时重新检查一次当前账号状态

## Data Model

桥接设置中新增平台级验证元数据：

- `bridge_<platform>_verified`
- `bridge_<platform>_verified_at`
- `bridge_<platform>_verified_fingerprint`

说明：

- `verified` 标记最近一次是否验证通过
- `verified_at` 用于 UI 展示与调试
- `verified_fingerprint` 绑定本次验证对应的关键配置指纹；关键配置变更后自动失效

微信不依赖手输凭据，校验指纹可使用固定标记，实际“当前是否已验证”由“是否存在可用账号”共同决定。

## Architecture

### Frontend

- 在桥接共享层新增平台验证状态解析与提示文案。
- `BridgePlatformEnableCard` 接收 `verified` 与 `verificationHint`，在未验证时禁用开关并显示说明。
- `BridgePlatformRuntimeCard` 接收 `connectionVerified`，未验证时显示“请先完成连接验证”的提示，并禁用启动按钮。
- 各平台 section 在保存关键配置后清理本地验证结果；在手动测试成功后刷新设置并读取持久化验证状态；在启用时执行自动复验。

### Desktop Main Process

- 在 `index.ts` 中集中维护：
  - 平台关键配置指纹生成
  - 验证状态写入
  - 关键配置变化后的验证状态清除
- 验证 IPC 成功后，立即写入对应平台的验证元数据。
- 微信扫码成功、删除最后一个账号、或账号集合失效时，同步更新微信平台验证状态。

### Bridge Runtime Guard

- `bridge-manager.ts` 的 `startPlatform()` 和 `start()` 在现有 `enabled` / `validateConfig()` 检查前增加“平台已验证”守卫。
- 未验证时返回明确原因，供前端展示。

## Testing

- 前端合同测试：锁定“平台 section 使用统一验证门槛”和“运行时卡片读取连接验证状态”。
- 桌面端行为测试：锁定 `startPlatform()` 在未验证时拒绝启动。
- 前端 `lint` + `typecheck`
- 桌面端 `test`

## Refactor Note

这次不在 5 个 section 中复制各自的验证状态判断。共享的“已验证/待验证/失效/启用前复验”规则集中在桥接共享层与桌面设置帮助函数中，避免继续堆平台特例分支。
