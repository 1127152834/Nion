# Bridge Verification Enable Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让桥接平台必须在连接验证成功后才能启用，并在每次重新启用时自动复验。

**Architecture:** 前端负责统一展示“已验证 / 未验证 / 启用前复验”的交互，桌面端负责持久化平台验证状态与关键配置指纹，运行时在启动平台时做最终守卫。

**Tech Stack:** React 19, TypeScript, Electron IPC, node:test

---

### Task 1: 先锁住失败行为

**Files:**
- Modify: `desktop/tests/bridge-manager-behavior.test.mjs`
- Create or Modify: `frontend/src/components/workspace/bridge/bridge-verification.contract.test.ts`

- [ ] 写桌面端失败测试，断言未验证平台不能 `startPlatform`
- [ ] 跑桌面端测试，确认先失败
- [ ] 写前端合同测试，断言 section 和共享组件使用验证门槛
- [ ] 跑前端合同测试，确认先失败

### Task 2: 落桌面端验证状态模型

**Files:**
- Modify: `desktop/src/main/index.ts`
- Modify: `desktop/src/shared/bridge-ipc.ts`
- Modify: `desktop/src/shared/ipc.ts`
- Modify: `desktop/src/preload/index.ts`
- Modify: `frontend/src/core/bridge/client.ts`

- [ ] 新增平台验证状态字段与帮助函数
- [ ] 让验证成功路径写入验证状态
- [ ] 让关键配置保存路径失效旧验证并清掉平台启用状态
- [ ] 为微信补最小验证接口与账号集合联动

### Task 3: 加运行时守卫

**Files:**
- Modify: `desktop/src/main/bridge/bridge-manager.ts`

- [ ] 在 `startPlatform()` 前增加“平台已验证”检查
- [ ] 在 `start()` 全量启动时也过滤未验证平台
- [ ] 更新原因码映射，保证前端能正确提示

### Task 4: 收敛前端 5 个平台交互

**Files:**
- Modify: `frontend/src/components/workspace/bridge/bridge-shared.tsx`
- Modify: `frontend/src/components/workspace/bridge/TelegramBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/FeishuBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/DiscordBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/QqBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/WeixinBridgeSection.tsx`
- Modify: `frontend/src/components/workspace/bridge/BridgeSection.tsx`

- [ ] 抽取共享验证状态读取与提示逻辑
- [ ] 让平台开关在未验证时禁用
- [ ] 让启用动作先自动复验，成功后再写启用状态
- [ ] 让运行时卡片读取 `connectionVerified`
- [ ] 清理总桥接页里能绕过规则的旧启用入口

### Task 5: 验证、文档、提交

**Files:**
- Modify: `frontend/README.md` 或相关桥接说明文件（如有必要）

- [ ] 跑桌面端测试
- [ ] 跑前端合同测试 / lint / typecheck
- [ ] 做一轮结构复查，消除重复验证分支
- [ ] 提交代码
