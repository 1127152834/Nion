# Dogfood Report: Nion Memory / Soul Product Remediation Round 2

| Field | Value |
|-------|-------|
| **Date** | 2026-04-10 |
| **App URL** | `electron://local-shell` + `http://127.0.0.1:5173` |
| **Session** | `nion-round2` |
| **Scope** | Post-fix recheck for desktop shell, homepage, Memory, Settings / Soul |

## Summary

| Status | Count |
|--------|-------|
| Fixed | 6 |
| Partially fixed | 0 |
| Still open | 0 |
| **Total reviewed** | **6** |

## Verification Notes

### ISSUE-001: 桌面端启动后无窗口，Electron 只保留后台进程
**Status:** Fixed
**Evidence:** 代码修复后，Electron 可稳定出窗；不再是“进程存在但无窗口”的状态。

### ISSUE-002: Memory 页充斥内部实现说明，像调试面板而不像正式产品
**Status:** Fixed
**Evidence:** [memory.png](screenshots/memory.png)
**Notes:** 页头和分组卡片中的内部解释文字已删除。

### ISSUE-003: Memory 页统计区信息架构与当前三分组模型不一致
**Status:** Fixed
**Evidence:** [memory.png](screenshots/memory.png)
**Notes:** 统计区术语已收口为“事实记忆 / 最近更新 / 用户画像 / 长期背景”。

### ISSUE-004: 设置弹层直接暴露“配置中心当前不可用”这类内部状态文案
**Status:** Fixed
**Evidence:** [settings-final.png](screenshots/settings-final.png)
**Notes:** 设置弹层头部已恢复为正常产品描述，不再优先暴露配置中心内部状态。

### ISSUE-005: 设置弹层左侧分类在标准桌面高度下被裁切，Soul 可发现性很差
**Status:** Fixed
**Evidence:** [settings-final.png](screenshots/settings-final.png)
**Notes:** 设置弹层高度和导航密度已经调整，`Soul` 项可直接看见并进入，不再需要额外猜测或绕路点击。

### ISSUE-006: 聊天首页欢迎区营销化过强，压缩了真正的工作输入空间
**Status:** Fixed
**Evidence:** [home.png](screenshots/home.png)
**Notes:** 欢迎标题明显收敛，副文案缩成一行，输入区视觉优先级已提升。
