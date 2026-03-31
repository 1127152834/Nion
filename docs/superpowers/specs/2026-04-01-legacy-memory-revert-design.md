# Legacy Memory Revert Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:writing-plans after this spec is approved. Do not implement directly from this spec without a task-by-task implementation plan.

**Goal:** 将 Nion 当前的记忆系统完整回退到最开始的 `memory.json` 版本，只保留旧版 `/api/memory` 主链路与 `Notebook` 独立知识库能力，彻底删除 `memory-os`、`AutoDream`、`self-maintenance`、`heartbeat`、`compaction`、`rebuild` 以及相关产品面与运行时接线。

**Architecture:** 本次不是 Git 历史层面的整批回滚，而是基于当前 `electron` 基线进行“直接删除式回退”。实现策略是从旧版本回捞已经验证过的 legacy `memory.json` 主链路，再在当前代码上删除所有新记忆系统的运行入口、桌面入口、设置页面、数据层、测试与文档，使系统实际行为回到旧记忆模型，同时不影响 `Notebook`、`Projects`、桥接和模型管理等其他模块。

**Tech Stack:** FastAPI, Pydantic, Electron, Next.js/React, local JSON storage (`memory.json`), pytest, node:test, make desktop-dev

---

## 1. 背景与问题定义

当前 Nion 的“记忆系统”已经偏离最开始的简单 `memory.json` 模式，演变成一套带有以下要素的系统：

- `Memory OS` provider family / provider state
- `Mem0` compatibility runtime
- `OpenViking` embedded/remote provider
- `AutoDream` compatibility surface
- `self-maintenance` 页面与 API
- `heartbeat` 维护骨架
- `memory compact / rebuild` operator actions

这套系统的产品问题不是“功能太少”，而是“能力表述和真实底座不匹配”：

- 用户看到的是接近 `Memoh` 的记忆/维护产品壳
- 实际底座没有完成 `Memoh` 的 dense / sparse / vector / embedding / real provider parity
- 结果是产品理解成本高，但用户真实收益不足

用户已经明确决定放弃这条路线，回到最开始的旧记忆系统。新的目标不是保留兼容模式，而是**直接删除**当前新记忆系统。

## 2. 产品目标

回退后的产品模型必须满足：

1. `Memory` 重新回到最开始的简单模型：
   - 基于 `memory.json`
   - 通过 `/api/memory` 读写
   - 不再暴露 provider、维护、重建、压缩、自我升级等概念
2. `Notebook` 继续独立存在：
   - 是知识库 / second brain
   - 不是 memory 的一部分
3. `Projects`、桥接、模型管理等其他模块不受影响
4. 桌面端中不再存在任何当前记忆系统的新概念入口：
   - `self-maintenance`
   - `AutoDream`
   - provider foundation
   - heartbeat
   - compaction
   - rebuild

## 3. 非目标

以下内容不属于本次回退范围：

- 不重构 `Notebook`
- 不调整 `Projects` 模块
- 不回退桥接/渠道/模型管理等其他功能
- 不保留所谓“Legacy mode”开关
- 不尝试同时保留 `Memory OS` 的兼容入口
- 不把这次工作做成“保守隐藏”，而是明确删除

## 4. 设计原则

### 4.1 行为回退优先于历史回退

本次目标是恢复旧行为，而不是强行用 `git revert` 逆转全部历史提交。

原因：

- 当前主线已经包含大量与记忆系统无关的新功能
- 直接回滚历史会误伤其他模块
- 旧记忆主链路本身可以按文件级回捞

### 4.2 保留 notebook 的独立边界

`Notebook` 是用户知识库，不是 memory，不应随着这次回退被删除或弱化。

### 4.3 删除而非隐藏

本次不接受“保留代码但不展示”的做法作为最终完成态。运行时入口、产品入口、测试与文档必须同步删除，避免系统继续维持一套名义上已弃用的壳。

### 4.4 先恢复旧主链路，再删除新主链路

顺序必须是：

1. 从旧版本回捞 legacy memory 主链路
2. 确保 `/api/memory` 和 `memory.json` 正常工作
3. 再删除新记忆系统的运行接线和产品面

这样可以避免出现“先删光，再起不来”的中间态。

## 5. 回退后的目标架构

### 5.1 保留的系统

保留：

- `memory.json` 文件型记忆存储
- legacy `nion.agents.memory.*` 主链路
- `/api/memory`
- memory settings / memory page 的旧版基本能力
- `Notebook`
- `Projects`
- 其他所有非记忆模块

### 5.2 删除的系统

后端必须删除：

- `memory_os` 路由接线
- `self_maintenance` 路由接线
- `autodream` 路由接线
- `heartbeat` 运行接线
- `memory compact` 路由
- `memory rebuild` 路由
- daemon 中所有与以上能力相关的服务初始化和状态暴露

前端和桌面必须删除：

- `Self-Maintenance` 页面、路由、导航入口
- memory provider foundation UI
- memory 页面中所有 provider/runtime/capability 文案和交互
- `AutoDream` operator surface
- compact / rebuild / maintenance 的数据层 hooks 和 API

文档和测试必须删除或改写：

- Memoh-style memory/self-maintenance/provider parity 相关产品化描述
- 对应 contract tests、router tests、service tests、desktop route tests
- 与当前新记忆系统绑定的模块测试交接文档

## 6. 旧主链路恢复策略

本次要从旧版本回捞以下类型的 legacy 代码：

- `backend/app/gateway/routers/memory.py` 中直接调用 `nion.agents.memory.updater`
- legacy memory storage / updater / queue 调用路径
- 前端 memory 页面中最开始的结构化 memory 浏览/清理/删除 fact 能力

不从旧版本回捞以下内容：

- 与旧版本其他模块耦合的无关设置页面结构
- 任何会把 `Notebook` 重新混进 memory 的旧设计
- 任何会覆盖当前 `Projects`、桥接、模型管理成果的旧 UI 外壳

## 7. 受影响模块

### 7.1 Backend

主要受影响：

- `backend/app/gateway/routers/memory.py`
- `backend/app/gateway/routers/memory_os.py`
- `backend/app/gateway/routers/autodream.py`
- `backend/app/gateway/routers/self_maintenance.py`
- `backend/app/gateway/routers/compaction.py`
- `backend/app/gateway/routers/rebuild.py`
- `backend/app/gateway/routers/heartbeat.py`
- `backend/app/runtime/app_factory.py`
- `backend/app/daemon/service.py`
- `backend/app/daemon/app.py`
- `backend/packages/harness/nion/memory_os/*`
- `backend/packages/harness/nion/openviking/autodream_*`
- `backend/packages/harness/nion/self_maintenance/*`
- `backend/packages/harness/nion/heartbeat/*`
- `backend/packages/harness/nion/compaction/*`
- `backend/packages/harness/nion/rebuild/*`

### 7.2 Frontend / Desktop

主要受影响：

- `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- `frontend/src/components/workspace/settings/memory-provider-foundation-card.tsx`
- `frontend/src/components/workspace/self-maintenance/*`
- `frontend/src/core/memory-os/*`
- `frontend/src/core/self-maintenance/*`
- `frontend/src/core/autodream/*`
- `frontend/src/core/compaction/*`
- `frontend/src/core/rebuild/*`
- `frontend/src/core/i18n/locales/*`
- `desktop/src/renderer/renderer-app.tsx`
- `desktop/tests/workspace-contract.test.mjs`

## 8. 风险与缓解

### 风险 1：直接删除新链路后，memory 页面无法工作

缓解：

- 先恢复 old `/api/memory` 主链路
- 先写 failing tests 锁定 old behavior
- 后删新路由和前端入口

### 风险 2：删除 runtime router 影响 Electron 启动

缓解：

- 以 `make desktop-dev` 作为每轮必跑验证
- 任何启动失败先修启动链路，不继续删代码

### 风险 3：误删 notebook / project 相关依赖

缓解：

- 先画出删除清单，只删明确属于新记忆系统的模块
- notebook 路由、service、页面和测试单独保留并 smoke 验证

### 风险 4：留下一堆孤儿文案与测试

缓解：

- 将文档和测试纳入正式回退范围
- 不接受“功能删了但 contract test 还在”的半完成态

## 9. 验收标准

完成后必须满足：

1. `/api/memory`、`/api/memory/reload`、`/api/memory/config`、`/api/memory/status` 正常工作
2. 记忆数据真实读写 `memory.json`
3. 系统中不再有以下运行路由：
   - `/api/memory-os/*`
   - `/api/autodream/*`
   - `/api/self-maintenance/*`
   - `/api/memory/compact*`
   - `/api/memory/rebuild*`
4. 桌面端不再有 `Self-Maintenance` 页面或入口
5. 设置页不再展示 provider / self-maintenance / AutoDream / compact / rebuild
6. `Notebook` 页面与能力保持可用
7. `make desktop-dev` 启动成功
8. 相关后端、前端、桌面验证通过

## 10. 实施后文档要求

代码回退完成后，必须同步更新：

- `backend/CLAUDE.md`
- `frontend/CLAUDE.md`
- `docs/test/README.md`
- memory / desktop / notebook 相关测试交接文档

文档必须反映新的真实状态：

- Nion 当前仅保留 legacy `memory.json` 记忆系统
- `Notebook` 独立存在
- 当前不再支持 provider-based memory、heartbeat、self-maintenance、AutoDream、compaction、rebuild
