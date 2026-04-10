# Dogfood Report: Nion Desktop / Workspace Memory-Soul Audit

| Field | Value |
|-------|-------|
| **Date** | 2026-04-10 |
| **App URL** | `electron://local-shell` + `http://127.0.0.1:5173` |
| **Session** | `electron-cdp:9229` + browser dogfood |
| **Scope** | Desktop shell launch, Workspace chat home, Memory page, Settings entry and Soul discoverability, product copy / layout / IA audit |

## Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 3 |
| Medium | 3 |
| Low | 0 |
| **Total** | **6** |

## Issues

<!-- Copy this block for each issue found. Interactive issues need video + step-by-step screenshots. Static issues (typos, visual glitches) only need a single screenshot -- set Repro Video to N/A. -->

### ISSUE-001: {Short title}

| Field | Value |
|-------|-------|
| **Severity** | critical / high / medium / low |
| **Category** | visual / functional / ux / content / performance / console / accessibility |
| **URL** | {page URL where issue was found} |
| **Repro Video** | {path to video, or N/A for static issues} |

**Description**

{What is wrong, what was expected, and what actually happened.}

**Repro Steps**

<!-- Each step has a screenshot. A reader should be able to follow along visually. -->

1. Navigate to {URL}
   ![Step 1](screenshots/issue-001-step-1.png)

2. {Action -- e.g., click "Settings" in the sidebar}
   ![Step 2](screenshots/issue-001-step-2.png)

3. {Action -- e.g., type "test" in the search field and press Enter}
   ![Step 3](screenshots/issue-001-step-3.png)

4. **Observe:** {what goes wrong -- e.g., the page shows a blank white screen instead of search results}
   ![Result](screenshots/issue-001-result.png)

---

### ISSUE-001
**Title:** 桌面端启动后无窗口，Electron 只保留后台进程
**Severity:** P1
**Type:** Functional / launch blocker
**Area:** Desktop shell startup
**Summary:** 通过 Electron 标准 dev 启动链拉起应用后，Electron 进程存在，但没有任何窗口创建，CDP 只暴露空白 browser target，导致后续 UI/E2E 无法在桌面壳内继续。
**Steps to Reproduce:**
1. 启动桌面 dev renderer 与 main watch。
2. 使用 `electron --remote-debugging-port=9229 dist/main/index.js` 启动桌面端。
3. 观察前台无窗口弹出；`ghost_os` 显示 Electron 无 open windows；CDP `tab` 仅显示 `about:blank`。
**Expected:** 桌面主窗口正常创建并加载 workspace。
**Actual:** 只有 Electron 进程，没有窗口。
**Evidence:**
- Screenshot: `screenshots/initial.png`
- Repro Video: `N/A`
- Notes: 控制台同时出现 runtime profile fetch 失败，说明应用启动链可能在 daemon/session 阶段已异常。

### ISSUE-002
**Title:** Memory 页充斥内部实现说明，像调试面板而不像正式产品
**Severity:** P1
**Type:** UX copy / product mismatch
**Area:** Memory page
**Summary:** Memory 页头和三张分组卡片都在向用户解释系统如何运作、如何纠错、哪些入口已删除。这类文字属于内部实现说明，不应进入普通用户产品面，造成明显 debug 感和认知噪音。
**Evidence:**
- Screenshot: `screenshots/memory-page.png`
- Repro Video: `N/A`
- Notes: 页头出现“这里只展示已经留下来的用户画像、长期背景和事实记忆，不再包含治理控制台入口。”；分组卡片重复出现“如果有错误，直接在对话里告诉我。”之类说明。

### ISSUE-003
**Title:** Memory 页统计区信息架构与当前三分组模型不一致
**Severity:** P2
**Type:** IA / layout
**Area:** Memory page
**Summary:** 当前产品模型已经收口为“用户画像 / 长期背景 / 事实记忆”，但统计区仍然显示“用户上下文 / 历史背景”等旧命名，还以“为空”作为主视觉输出，既不稳定也不友好。
**Evidence:**
- Screenshot: `screenshots/memory-page.png`
- Repro Video: `N/A`
- Notes: 这会让用户看到两套并行术语，也把空态变成了主信息，削弱真正的记忆分组内容。

### ISSUE-004
**Title:** 设置弹层直接暴露“配置中心当前不可用”这类内部状态文案
**Severity:** P1
**Type:** UX copy / product mismatch
**Area:** Settings dialog
**Summary:** 设置页不是调试面板，但弹层头部直接出现“正在加载配置中心...”和“配置中心当前不可用。”这类内部系统状态文案。对普通用户没有解释价值，只会制造产品不稳定、半成品的感受。
**Evidence:**
- Screenshot: `screenshots/settings-page.png`
- Screenshot: `screenshots/soul-page-final.png`
- Repro Video: `N/A`
- Notes: 这类文案应该被更温和的产品语言替换，或者在正常路径里完全隐藏。

### ISSUE-005
**Title:** 设置弹层左侧分类在标准桌面高度下被裁切，Soul 可发现性很差
**Severity:** P2
**Type:** Layout / IA
**Area:** Settings dialog
**Summary:** 在当前桌面窗口尺寸下，设置页左侧分类列表发生垂直裁切，`记忆` / `Soul` 已经接近甚至进入折叠区下缘。用户需要额外滚动或反复尝试，核心设置的可发现性明显不足。
**Evidence:**
- Screenshot: `screenshots/settings-page.png`
- Screenshot: `screenshots/soul-page-final.png`
- Repro Video: `N/A`
- Notes: 这会直接影响 `Settings > Soul` 作为独立主入口的产品目标。

### ISSUE-006
**Title:** 聊天首页欢迎区营销化过强，压缩了真正的工作输入空间
**Severity:** P2
**Type:** Layout / content
**Area:** Workspace chat home
**Summary:** 首页上半屏被超大问候标题、挥手 emoji 和三行品牌文案占据，输入框和任务快捷入口被整体下推。对一个以“立刻开始工作”为核心的桌面助手来说，这种欢迎区过重，效率感不足。
**Evidence:**
- Screenshot: `screenshots/browser-initial.png`
- Screenshot: `screenshots/settings-dialog-open.png`
- Repro Video: `N/A`
- Notes: 这不是功能 bug，但明显不符合生产工具的首屏优先级。
