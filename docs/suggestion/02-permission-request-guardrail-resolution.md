# 模块建议 02 - Permission Request / Guardrail Resolution

## 模块目标
保障受限工具请求在 guardrail 拦截、前端展示、用户批准/拒绝、后端恢复执行这一闭环中的语义一致与权限安全。

## 当前主要问题
1. `allow_session` 目前已经落成 thread 级持久授权，但产品语义仍不够清晰，容易被误解为更大范围的“session 全开”。
2. resolve 接口已经能返回结构化 `replay_payload`，并在成功 resolve 后持久化 `resolved_permission_request_ids`；但显式调用方归属校验仍缺失，authz 风险仍在。
3. replay 契约已经从“只返回 `original_message_text`”升级为“返回 `replay_payload + original_message_text` 兼容字段”，但接口与文档尚未完全对齐。
4. 前端 pending permission request 已不再因为后续 human message 直接消失；当前可见性依赖后端持久化的 `resolved_permission_request_ids` 与前端乐观态联合判断，仍建议补更强的端到端验证。

## 建议事项
- 补充并固定三种决策语义：
  - `allow`：一次性放行，仍依赖 tool signature 命中；
  - `allow_session`：当前 thread 持久授权；
  - `deny`：明确落到不可继续状态。
- 给 resolve 路由增加显式 authz 校验，至少验证当前调用方是否拥有该 thread / permission request 的操作权。
- 将 `replay_payload` 正式写入接口契约与文档，明确最小字段为 `text/files/additional_kwargs`。
- 继续用后端真实状态驱动 pending permission request 可见性，避免回退到仅靠前端局部状态判断。
- 补充“批准后是否立即执行”“是否保留上下文”“允许范围有多大”的产品文案与开发契约说明。

## 推荐优先级
- **已完成 / P0 已落地**：把 replay 从“重发文本”改为“重放原请求”。
- **已完成 / P1 已落地**：修正前端 pending permission request 可见性。
- **剩余 P0**：补 resolve authz。
- **剩余 P1**：补清晰的接口/状态契约文档，并收敛 `allow_session` 文案。

## 推荐补充验证
- `allow` / `allow_session` / `deny` 三分支端到端测试。
- 非拥有者调用 resolve 的 authz 失败测试。
- 批准后保留 files / shortcut selections / CLI selections 的 replay 集成测试。
- “后续又发一条人类消息”时 pending request 仍可恢复/展示的前后端联动测试。
- 刷新页面 / 重进线程后，已 resolve 的 permission request 不再重复显示的持久化测试。
