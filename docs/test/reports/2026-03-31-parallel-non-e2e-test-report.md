# Nion 并发非 E2E 测试汇总报告

- 测试日期：2026-03-31
- 仓库路径：`/Users/zhangtiancheng/Documents/项目/agent/nion`
- 测试依据：`docs/test/README.md` 与 01-10 模块文档
- 执行方式：按模块启动子 agent 并发执行非 E2E 测试
- 明确排除：端到端测试、浏览器自动化、agent-browser 页面验证
- 说明：下文的模块通过数来自各模块定向测试，存在少量共享测试文件被不同模块重复执行的情况，不应简单视为“唯一测试用例总数”

## 一、结论摘要

- 10 个业务模块都已完成一轮独立的非 E2E 测试执行与缺口盘点。
- 01、02、03、04、05、07、10 模块的定向自动化均为绿色。
- 06 模块有 1 个前端 Notebook 旧 contract 测试失败，判断为测试过期，不是当前产品回归。
- 09 模块有 3 个桌面端 bridge observation 测试失败，判断为测试前提落后于当前更严格的 verification gate，不是随机 flaky。
- 08 模块后端 pytest 被本机 Python 3.12 动态库签名异常阻断，前端定向测试通过。
- 仓库级静态检查存在重复出现的共性阻塞项：
  - `frontend/src/components/workspace/recent-chat-list.tsx` 中 `groups` 在声明前使用
  - `frontend/src/components/workspace/bridge/BridgeSection.tsx` 中 `bridge.desktopOnly` i18n key 类型未同步
  - `desktop/src/main/window.ts` 中 Electron `console-message` 事件参数类型与代码访问不一致

## 二、模块结果

| 模块 | 定向测试结果 | 主要阻塞/失败 | 当前判断 |
|---|---:|---|---|
| 01 Chat / Thread / Message | Backend `28 passed`，Frontend `38 passed` | Frontend typecheck 被 `recent-chat-list.tsx` 与 `BridgeSection.tsx` 阻断 | 主链路定向自动化健康，但核心行为测试偏少 |
| 02 Permission Request | Backend `41 passed`，Frontend `12 passed` | Frontend typecheck 被全局问题阻断 | 模块测试健康，缺行为级测试 |
| 03 CLI Tools | Backend `22 passed`，Frontend `18 passed` | Frontend typecheck 被全局问题阻断 | 模块测试健康，真实 API 契约覆盖不足 |
| 04 Runtime / Guardrail | Backend `49 passed`，Frontend `16 passed` | Frontend typecheck 被全局问题阻断 | 治理主链路健康，边界条件覆盖不足 |
| 05 Settings / Config Center | Backend `7 passed`，Frontend `30 passed` | Frontend typecheck 被全局问题阻断 | 基础读写健康，配置中心状态机测试缺口明显 |
| 06 Notebook | Backend `36 passed`，Frontend `40 passed, 1 failed` | `notebook-routes.test.ts` 过期；Frontend typecheck 另有全局问题 | 核心 CRUD 健康，旧测试需更新 |
| 07 Automation | Backend `59 passed`，Frontend `31 passed` | `uv run pytest` 被 Python 动态库问题阻断，但改用 `./.venv/bin/python -m pytest` 后通过；Frontend typecheck 被全局问题阻断 | 模块主干健康，hooks/API 联动刷新测试缺口大 |
| 08 Custom Agents | Frontend `4 passed` | Backend pytest 被 Python 3.12 签名问题阻断 | 前端薄覆盖，后端当前无执行证据 |
| 09 Bridge / Desktop | Backend `22 passed, 2 skipped`，Frontend `29 passed`，Desktop `75 passed, 3 failed` | `bridge-observations-contract.test.mjs` 3 例失败；Frontend/Desktop typecheck 各有全局问题 | 基础覆盖有了，但 preload/IPC/terminal 行为级测试不足 |
| 10 Projects | Backend `9 passed`，Frontend `12 passed` | Frontend typecheck 被 `recent-chat-list.tsx` 阻断 | 项目模块基础 contract 健康，写接口和状态机覆盖不足 |

## 三、共性阻塞项

### 1. 前端 typecheck 反复失败

重复出现在 01、02、03、04、05、06、07、08、09、10 模块的非 E2E 收尾检查中。

- 文件：[recent-chat-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/recent-chat-list.tsx#L157)
  - 现象：`groups` 在声明前使用
  - 影响：阻断 frontend 全量 typecheck
- 文件：[BridgeSection.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/BridgeSection.tsx#L84)
  - 现象：`bridge.desktopOnly` 未纳入 i18n key 联合类型
  - 影响：阻断 frontend 全量 typecheck

### 2. 桌面端 typecheck 失败

- 文件：[window.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/window.ts#L27)
- 现象：`details.line` 的类型访问与当前 Electron 类型定义不匹配
- 影响：阻断 desktop 全量 typecheck

### 3. Python 运行环境不稳定

- 08 模块后端 pytest 完全被阻断
- 07 模块的 `uv run pytest` 被阻断，但直接使用 `./.venv/bin/python -m pytest` 可以执行
- 现象集中在 Python 3.12 动态库签名/加载异常，不是单个业务模块的实现问题

## 四、已确认的失败与性质判断

### 真实代码/配置问题

- [recent-chat-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/recent-chat-list.tsx#L157)
  - `groups` 声明顺序错误，属于真实 TypeScript 缺陷
- [BridgeSection.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/bridge/BridgeSection.tsx#L84)
  - i18n key 类型未同步，属于真实类型定义缺陷
- [window.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/src/main/window.ts#L27)
  - Electron 事件参数类型访问不一致，属于真实桌面端类型缺陷

### 测试过期或测试前提落后

- [notebook-routes.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook-routes.test.ts)
  - 仍要求 `NotebookPage` 直接持有旧的助手聊天逻辑
  - 当前实现已下沉到 `NotebookContextPanel` / `NotebookAssistantPanel`
  - 判断：测试过期
- [bridge-observations-contract.test.mjs](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/tests/bridge-observations-contract.test.mjs)
  - 只注入 `verified=true`，未注入平台所需真实配置
  - 当前实现已要求 “verified + 必要配置” 同时满足
  - 判断：测试前提落后于现实现

## 五、最高优先级覆盖缺口

### P0

- 01 Chat 主链路缺少行为级测试
  - [frontend/src/core/threads/hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.ts)
  - [frontend/src/components/workspace/messages/message-list.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.tsx)
  - [frontend/src/app/workspace/chats/chat-thread-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/app/workspace/chats/chat-thread-page.tsx)
- 04 Runtime / Guardrail 的边界与安全分支覆盖不足
  - `files/path_utils/runtime_profile/guardrail` 的 400/403/404/409/路径穿越/截断分支
- 05 Config Center 缺少状态机测试
  - [frontend/src/components/workspace/settings/use-config-editor.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/use-config-editor.ts)
  - [frontend/src/core/config-center/api.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/config-center/api.ts)
  - [frontend/src/core/config-center/hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/config-center/hooks.ts)
- 07 Automation 缺少 hooks/API 联动刷新验证
  - [frontend/src/core/automation/hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/hooks.ts)
  - [frontend/src/core/automation/api.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/api.ts)
- 09 Bridge / Desktop 缺少 preload / IPC / terminal / bridge permission resolve 的行为测试

### P1

- 03 CLI Tools 需要补真实 API 契约
  - custom CRUD
  - install SSE
  - detail/status/describe
- 06 Notebook 需要补 rewrite pending flow、chat import、router 异常分支
- 10 Projects 需要补 `/api/projects/*` 写接口状态机、受管产物恢复、项目内 `@会话` 导入链路
- 08 Custom Agents 前端仅薄覆盖，后端当前无执行证据

## 六、建议优先补的测试文件

- [frontend/src/core/threads/hooks.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/threads/hooks.test.ts)
- [frontend/src/components/workspace/messages/message-list.test.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list.test.tsx)
- [backend/tests/test_threads_stream_contract.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_threads_stream_contract.py)
- [frontend/src/components/workspace/settings/use-config-editor.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/use-config-editor.test.ts)
- [frontend/src/core/config-center/api.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/config-center/api.test.ts)
- [frontend/src/core/automation/hooks.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/automation/hooks.test.ts)
- [backend/tests/test_automation_package_file_router.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_automation_package_file_router.py)
- [frontend/src/core/bridge/client.behavior.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/bridge/client.behavior.test.ts)
- [desktop/tests/preload-bridge-behavior.test.mjs](/Users/zhangtiancheng/Documents/项目/agent/nion/desktop/tests/preload-bridge-behavior.test.mjs)
- [backend/tests/test_projects_router_threads.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_projects_router_threads.py)
- [frontend/src/core/projects/hooks.test.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/core/projects/hooks.test.tsx)
- [frontend/src/components/workspace/notebook/notebook-assistant-routing.contract.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/notebook/notebook-assistant-routing.contract.test.ts)

## 七、建议后续处理顺序

1. 先修复全局类型阻塞项
2. 更新已过期的 Notebook 与 desktop observation 测试
3. 为 01、04、05、07、09 补行为级测试
4. 为 03、06、08、10 补 API/状态机缺口
5. 在全局 typecheck 绿后，再做统一非 E2E 回归
6. 之后再安排串行 E2E

## 八、验证说明

本报告基于 10 个模块子 agent 的独立执行结果汇总而成。当前没有声称“仓库全绿”：

- Frontend typecheck 仍被全局问题阻断
- Desktop typecheck 仍被全局问题阻断
- 08 模块 backend pytest 仍缺执行证据
- 09 模块 desktop tests 仍有 3 个失败

当前能确认的是：

- 大部分模块的定向非 E2E 自动化主链路是健康的
- 失败点主要集中在全局静态类型问题、过期测试，以及桌面桥接测试前提落后
