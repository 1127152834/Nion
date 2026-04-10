# Dogfood Report: User Identity / Soul Immediate Tuning Round 3

| Field | Value |
|-------|-------|
| **Date** | 2026-04-10 |
| **Scope** | User identity owner, extraction, runtime injection, chat write-through, Settings > Soul immediate-save UI |
| **Renderer Surface** | `http://127.0.0.1:5173` |
| **Desktop Runtime Target** | `http://127.0.0.1:43115` |

## Summary

| Status | Count |
|--------|-------|
| Verified | 5 |
| Partially verified | 1 |
| Still open | 0 |

## Verification Notes

### CHECK-001: Settings > Soul 已从 draft/apply 变为逐项即时保存
**Status:** Verified
**Evidence:** [settings-soul-browser.png](screenshots/settings-soul-browser.png)
**Notes:** 页面已不再出现全局草稿区或统一应用栏，改为 `UserIdentityPanel` + 四张 soul 字段卡片。

### CHECK-002: 设置页新增轻量用户身份辅助面板
**Status:** Verified
**Evidence:** [settings-soul-browser.png](screenshots/settings-soul-browser.png)
**Notes:** 页面可见 `用户姓名 / 称呼你 / 我的自称 / 沟通偏好 / 互称规则`，没有治理控制台或内部维护动作。

### CHECK-003: Soul 空态不再直接暴露后端兜底句子
**Status:** Verified
**Evidence:** [settings-soul-browser.png](screenshots/settings-soul-browser.png)
**Notes:** 未设置的 soul 字段在页面上展示为 `尚未设置`，不再把“目前还没有稳定的...”这类内部兜底文案直接灌进输入框。

### CHECK-004: 后端主链回归集合通过
**Status:** Verified
**Evidence:** `42 passed in 9.53s`
**Notes:** 回归覆盖 `UserIdentityProfile` owner、提取、runtime、聊天直写、router、local daemon app surface。

### CHECK-005: 前端合同、typecheck、lint 全通过
**Status:** Verified
**Evidence:** `7 contract tests passed`; `pnpm --dir frontend typecheck`; targeted `eslint` passed
**Notes:** 当前前端变更至少在静态合同、类型和 lint 层面闭环。

### CHECK-006: live desktop daemon 的 `GET /api/user-identity` 复查
**Status:** Partially verified
**Evidence:** 当前源码内 `app.daemon.app.create_app()` 路由表包含 `/api/user-identity`；但运行中的 `43115` 进程在本轮手工 curl 里一度返回 `404`，说明桌面 dev 运行态存在旧进程/生命周期差异。
**Notes:** 这轮代码层已经补了 `test_local_daemon_exposes_user_identity_route` 护栏。剩余风险不在实现缺失，而在 dev 启动环境的一致性验证。
