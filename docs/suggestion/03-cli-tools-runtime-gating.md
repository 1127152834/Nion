# 模块建议 03 - CLI Tools Catalog / Runtime Gating

## 模块目标
保障 CLI 工具目录、安装/更新/描述、聊天回合中的 runtime gating、设置页和管理页之间契约一致。

## 当前主要问题
1. `cli_management.awaiting_permission` / `pending_permission_request_id` 已经在生产路径中写入并在 resolve 后清理，但 `last_intent` 目前仍偏保守，更多是满足闭环而不是高精度语义。
2. CLI 工具批准后的恢复语义已经接通到 permission replay 和 thread state，但仍与聊天主链路存在耦合，后续若调整 replay 契约需同步回归验证。
3. CLI runtime gating 测试已经补到真实权限请求推进 `awaiting_permission` 的路径，但页面级一致性测试仍然不足。

## 建议事项
- 保持 CLI permission request 与 `thread.values.cli_management` 的正式接通：创建请求写入 `awaiting_permission + pending_permission_request_id`，resolve 后清理并恢复目标状态。
- 将 CLI runtime gating 状态图正式文档化：inactive → managing → awaiting_permission → managing / inactive。
- 继续为 CLI 管理链路补页面级 integration 测试，而不只停留在后端状态测试。
- 将 CLI tools 管理页、聊天入口、settings 页对同一工具状态的依赖统一到同一后端契约，避免页面间感知不一致。
- 后续可提升 `last_intent` 的推断精度，减少当前“install 优先”的保守写法。

## 推荐优先级
- **已完成 / P0 已落地**：接通 awaiting_permission 状态机。
- **剩余 P1**：补真实 integration 测试覆盖，而不只靠 seeded state tests。
- **剩余 P1**：统一 CLI tools 在页面、设置、聊天中的状态来源。
- **剩余 P2**：提升 `last_intent` 推断质量。

## 推荐补充验证
- guardrail 发出 CLI permission request 后，thread state 是否进入 `awaiting_permission`。
- resolve 后 CLI 上下文是否恢复，并准确继续原操作。
- CLI 工具管理页 / settings 页 / 聊天中选中工具状态是否一致。
- CLI permission 被拒绝后，thread state 是否稳定落到 `inactive` 且不会残留 `pending_permission_request_id`。
