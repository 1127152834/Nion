# Dogfood Report: Acceptance Round 4

| Field | Value |
|-------|-------|
| **Date** | 2026-04-11 |
| **Scope** | Electron-style acceptance for user identity and soul settings |
| **Renderer Surface** | `http://127.0.0.1:5173` with desktop backend injection |
| **Daemon Targets** | `43115` live desktop daemon, `43116` source-backed acceptance daemon |

## Summary

| Status | Count |
|--------|-------|
| Verified | 3 |
| Fixed during acceptance | 1 |
| Remaining environment risk | 1 |

## Verification Notes

### CHECK-001: 设置页单字段保存会真实写入用户身份后端
**Status:** Verified
**Evidence:** [settings-after-save.png](screenshots/settings-after-save.png)
**Notes:** 通过设置页保存后，`user_name`、`preferred_address_for_user`、`assistant_self_name` 能回写到 `/api/user-identity`。

### CHECK-002: 用户身份主链回归仍然稳定
**Status:** Verified
**Evidence:** `42 passed in 3.27s`
**Notes:** owner / 提取 / runtime / 聊天直写 / router / local daemon API 主链继续全绿。

### CHECK-003: 前端设置页合同、typecheck、lint 继续通过
**Status:** Verified
**Evidence:** `7 contract tests passed`; `pnpm --dir frontend typecheck`; targeted `eslint` passed

### ISSUE-001: 分别保存“称呼你”和“我的自称”后，互称规则没有自动更新
**Status:** Fixed during acceptance
**Repro:** 在设置页依次保存 `称呼你=大哥`、`我的自称=小老弟`，随后读取 `/api/user-identity`，`mutual_addressing_rule` 仍为空。
**Fix:** 在 `UserIdentityService.apply_patch()` 里补了资料归一化逻辑：当两个称呼字段都存在且这次没有显式传 `mutual_addressing_rule` 时，自动生成 `你叫我X，我叫你Y`。
**Evidence:** 新增并通过 `test_user_identity_router_derives_mutual_addressing_rule_from_two_address_fields`

### RISK-001: live desktop daemon 启动链仍有时序/环境噪音
**Status:** Remaining environment risk
**Notes:** `43115` 的 live desktop daemon 有时能正常提供 `/api/user-identity`，有时又会在验收前后掉线或保留旧代码行为。源码级和测试级合同已经补齐，但桌面 dev 启动链本身仍建议单独做一次收官排查。
