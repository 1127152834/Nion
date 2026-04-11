# Memory / Soul Mainline Closure Dogfood Report

日期：2026-04-11  
执行人：Codex  
验收对象：Subproject A 主链闭环后的共享前端产品面

## 环境

- 后端网关：`backend && PYTHONPATH=. uv run uvicorn app.gateway.app:app --host 127.0.0.1 --port 8001`
- 前端：`pnpm --dir frontend dev`
- 验收入口：`http://localhost:3000/workspace/memory`

## 说明

本轮优先尝试了桌面端壳层验收，但 `make desktop-dev` 拉起后，renderer 持续报 `Failed to load runtime profile: TypeError: Failed to fetch`。同时手动运行 `backend && uv run python -m app.daemon.main` 时，Electron 会向 `/api/daemon/clients/<id>/heartbeat` 发起请求并收到 `404 Not Found`，daemon 随后退出。

因此，本轮 dogfood 改为共享的 Web 产品面验收。由于本次改动集中在共享的 React 页面与 `/api/*` 主链，这一轮验收可以直接覆盖本次变更本身。

## 验收记录

### 1. Memory 首页

结果：通过

观察：

- `/workspace/memory` 可以正常打开。
- 首页顶部仍保留 Memory 主页面，但主内容只剩 “你的信息 / 长期背景 / 事实记忆” 三组。
- “你的信息”组成功显示了当前稳定身份条目，不再是旧的用户画像三段式。
- 页面没有出现 ledger、evidence、growth、embedding、治理控制台等错误入口。

### 2. Identity 设置

结果：通过

打开方式：

- 在页面内执行 `window.dispatchEvent(new CustomEvent("nion-open-settings",{detail:{section:"identity"}}))`

观察：

- 设置弹窗存在独立的“身份”导航项。
- 身份页与 Soul 页已拆开，不再混在同一个页面。
- 身份页包含：用户姓名、常用别名、称呼你、我的自称、沟通偏好、互动边界、用户角色、时区、长期背景。
- 页面文案为产品化描述，没有暴露治理链路、runtime 或 debug 字段。

### 3. Soul 设置

结果：通过

打开方式：

- 在页面内执行 `window.dispatchEvent(new CustomEvent("nion-open-settings",{detail:{section:"soul"}}))`

观察：

- Soul 页只保留核心人格、说话方式、价值观 / 边界、关系基调四个稳定字段。
- 原来的 overlay 状态卡、`has_active_overlay` / `adaptive_overlay_summary` 可见面已去掉。
- 页面提供“打开身份设置”的跳转，信息架构更清晰。

### 4. Memory 设置

结果：通过

打开方式：

- 在页面内执行 `window.dispatchEvent(new CustomEvent("nion-open-settings",{detail:{section:"memory"}}))`

观察：

- 页面只保留“打开记忆 / 打开身份 / 打开 Soul / 临时纠正怎么做”这类产品化内容。
- 原来的 Embedding 只读假面板已经删除。
- 页面不再暴露 `fingerprint`、`vector_path`、`artifact_count`、`Memory OS`、`legacy memory.json` 等机制词。

## 结论

本轮 Subproject A 的共享前端产品面达到了“真实主链可见”的验收线：

- 稳定身份已经进入 `/workspace/memory`
- Identity / Soul / Memory 三个设置面边界清晰
- 假 embedding 面板、死页面、旧 canonical 客户端层已经清掉

## 仍需跟踪

- 桌面端 daemon 心跳 `404` 问题仍在，阻碍完整 Electron 壳层验收；这不是本轮 Memory / Soul 主链改造引入的共享前端问题，但需要单独跟进。
