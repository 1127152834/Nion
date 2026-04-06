# Soul Product Interaction Model

## 1. Purpose

这份文档是 Soul System 实施前置规格的第五篇。

它负责冻结：

- Soul System 的用户可见产品面
- 用户可执行动作与不可执行动作
- soul growth、soul proposal、relationship soul、automation 外化的解释模型
- “为什么变了 / 为什么不能直接编辑 / 来源是什么”的产品表达规则
- soul 与现有 Memory / Growth / Automation 前台面的关系

它**不**负责：

- 最终视觉设计
- 组件细节
- 后端 API 字段
- 治理等级本身

这些分别交给：

- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- [16-soul-governance-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/16-soul-governance-matrix.md)

---

## 2. Inputs

本篇依赖：

- [12-nion-complete-soul-system-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/12-nion-complete-soul-system-architecture.md)
- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- [14-soul-runtime-compilation.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/14-soul-runtime-compilation.md)
- [15-soul-growth-and-reflection-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/15-soul-growth-and-reflection-rules.md)
- [16-soul-governance-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/16-soul-governance-matrix.md)
- [06-memory-os-interaction-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/06-memory-os-interaction-model.md)
- 当前前端产品面：
  - [frontend/src/components/workspace/memory/memory-home-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/memory-home-page.tsx)
  - [frontend/src/components/workspace/memory/memory-growth-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/memory/memory-growth-page.tsx)
  - [frontend/src/components/workspace/automation/automation-job-list-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/automation/automation-job-list-page.tsx)
  - [frontend/src/components/workspace/automation/automation-job-detail-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend/src/components/workspace/automation/automation-job-detail-page.tsx)

---

## 3. Decisions

本篇冻结以下关键决策：

1. Soul System 必须可见、可解释、可反馈，但不能退化成角色配置器。
2. 用户可以影响 soul growth，但不能像编辑配置一样直接编辑 `core_soul`。
3. 默认展示的是“当前的我 + 为什么会这样 + 最近怎样成长”，而不是 raw artifacts。
4. soul proposal 必须附带来源、影响范围和接受/拒绝后果说明。
5. soul 和 agent-owned automation 的关系必须被产品解释清楚：不是“它自己乱建任务”，而是“成长结果外化为长期服务动作”。

---

## 4. Product Goals

Soul 产品面的目标不是给用户一个“人格编辑器”。

它的目标是：

1. 让用户理解这个 agent 当前是什么样的存在
2. 让用户感知它如何在成长
3. 让用户理解某些变化为什么发生
4. 让用户对高影响变化拥有治理权
5. 让用户看到人格成长如何转化成真实服务能力

---

## 5. Top-Level Information Architecture

建议 soul 产品面不独立于 Memory OS 主体，而是作为 `Memory / Agent Growth / Automation Ownership` 的增强层。

前台信息架构冻结为：

1. `Current Soul`
2. `Current Relationship Stance`
3. `Recent Growth`
4. `Soul Proposals`
5. `Learning And Procedure Outputs`
6. `Soul-Driven Automation`

---

## 6. `Current Soul`

## 6.1 作用

向用户解释：

- 这个 agent 当前的长期人格基底是什么
- 它的服务伦理和关系姿态是什么

## 6.2 展示内容

默认展示：

- `core_soul` 的摘要
- `identity_narrative` 的当前摘要
- 当前生效 `active_overlay` 的概要

### 必须解释

- 这是“当前长期基线”
- 不是一段临时 prompt
- 它不会因为一次聊天就大幅变化

## 6.3 不展示

默认不展示：

- `core_soul.md` 全文
- overlay 历史全文
- narrative 原始全文

---

## 7. `Current Relationship Stance`

## 7.1 作用

向用户解释：

- agent 现在如何看待和对待这个用户

## 7.2 展示内容

建议展示：

- 温度倾向
- 主动性倾向
- 教学/建议姿态
- 当前关系边界

## 7.3 必须解释

- 这不是“用户设置”，而是 agent 基于长期证据形成的关系人格
- 用户可以反馈不适合，但不能直接像表单那样改写

---

## 8. `Recent Growth`

## 8.1 作用

向用户解释：

- 它最近为什么发生了变化
- 它最近学到了什么
- 它最近如何调整了服务方式

## 8.2 展示内容

建议展示最近 7-30 天内的：

- accepted proposals
- narrative refresh
- relationship soul shifts
- 由 soul growth 触发的 learning / procedure / automation

## 8.3 关键原则

只展示：

- 结果
- 原因
- 影响范围

不默认展示：

- raw journal
- raw evidence list

---

## 9. `Soul Proposals`

## 9.1 作用

承载用户对高影响人格变化的治理界面。

## 9.2 每张 proposal 卡片必须展示

1. 提案标题
2. 为什么产生
3. 会改变什么
4. 不会改变什么
5. 来源于哪类 evidence
6. 风险等级
7. `接受 / 拒绝`

## 9.3 proposal 文案要求

必须解释：

- “为什么会有这个提案”
- “接受后会怎样”
- “拒绝后会怎样”

示例：

- 不允许只写：“调整表达风格”
- 应写成：“最近多次互动显示用户在高压期更偏好低刺激、少安慰、结论先行的支持方式。接受后，agent 会在类似场景下降低鼓励式措辞，但不会改变其长期价值观与关系边界。”

---

## 10. `Learning And Procedure Outputs`

## 10.1 作用

向用户解释：

- soul growth 不只是变得更像人
- 它还会转化成真实能力

## 10.2 展示内容

建议展示：

- 由 soul growth 触发的 learning topics
- 由 soul growth 固化出的 procedure

## 10.3 必须解释

例如：

- “因为长期观察到用户在月底高压期需要低打扰支持，agent 形成了新的服务方法”
- “因为陪伴型复盘需求持续出现，agent 把它加入学习计划”

---

## 11. `Soul-Driven Automation`

## 11.1 作用

向用户解释：

- 为什么会出现 agent-owned automation
- 这些自动化和 soul growth 的关系

## 11.2 展示内容

每条 soul-driven automation 必须展示：

1. 当前状态
2. 来源 learning topic
3. 来源 soul 或 relationship 变化
4. 为什么创建
5. 为什么只能 pause/resume 不能直接编辑

## 11.3 核心解释模型

必须解释：

- 这不是“agent 擅自建任务”
- 而是“agent 在长期成长后，把稳定有效的支持方式外化为自动化服务”

---

## 12. User Actions

## 12.1 用户允许执行的动作

用户默认允许：

1. 查看当前 soul 摘要
2. 查看 relationship stance 摘要
3. 查看 recent growth 摘要
4. 查看 soul proposal
5. `接受 / 拒绝` 高影响 soul proposal
6. 冻结某些 soul-driven growth lane
7. 对 soul-driven automation 执行 `pause / resume`

## 12.2 用户不允许执行的动作

用户默认不允许：

1. 直接编辑 `core_soul`
2. 直接编辑 `relationship_soul`
3. 直接编辑 `identity_narrative`
4. 直接编辑 `soul_journal`
5. 直接手工写 `active_overlay`
6. 把 soul 改成任意角色扮演模板

---

## 13. Explanation Model

Soul 产品面必须默认回答 3 个问题：

1. **为什么能操作**
   - 这属于 proposal / governance surface
2. **为什么不能直接编辑**
   - 这属于长期身份基线，不是配置字段
3. **来源是什么**
   - 来源于哪些 memory / relationship / learning / procedure / automation feedback

---

## 14. Empty / Loading / Error States

## 14.1 Empty State

如果 soul artifacts 还未建全，应显示：

- 当前尚未形成完整 soul 结构
- 系统仍在基于长期交互形成稳定身份层
- 暂不暴露空白配置面

禁止显示：

- 空表单
- “请手动填写人格”

## 14.2 Loading State

必须明确区分：

- 正在加载当前 soul
- 正在加载 growth proposals
- 正在加载 soul-driven automation

## 14.3 Error State

如果 soul runtime 或 artifacts 读取失败，应解释：

- 当前无法展示完整 soul 视图
- 主系统已降级到稳定 fallback
- 这不等于 agent 没有记忆或人格

---

## 15. Relationship To Existing Memory Surfaces

## 15.1 与 `Memory Home`

`Memory Home` 里建议只展示：

- Current Soul summary card
- Recent Growth summary card

不把 soul 全量内容堆在首页。

## 15.2 与 `Agent Growth`

`Agent Growth` 继续作为：

- learning
- procedure
- soul proposals

的主入口。

## 15.3 与 `Automation Ownership`

`Automation Ownership` 继续承接：

- soul-driven automation 的查看、来源解释与启停治理

## 15.4 是否单独出 `Soul` 页面

本篇建议：

- 短期不强制独立一级页面
- 先以 `Memory Home + Agent Growth + Automation Ownership` 的增强层落地

当 soul artifacts、growth 和 governance 全部稳定后，再考虑独立 `Soul` 详情页。

---

## 16. Runtime / Product Impact

## 16.1 对 runtime 的影响

产品解释面必须和 runtime 真正一致。

不允许出现：

- 产品说“它正在变成这样”
- runtime 实际没注入

因此所有前台展示都必须来自：

- active soul artifacts
- accepted proposals
- active overlay

而不是 draft-only 数据。

## 16.2 对治理的影响

前台动作必须完全受 [16-soul-governance-matrix.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/16-soul-governance-matrix.md) 约束。

---

## 17. Open Questions

1. 是否需要在 `Memory Home` 增加单独的 “Current Soul” 卡片入口。
2. `RelationshipSoul` 的摘要是否应和 `relationship` 页面合并展示，还是在 soul 面单独解释。
3. soul proposal 卡片是否和 procedure proposal 共用视觉模型。
4. soul-driven automation 是否需要独立标签，如 “由成长系统生成”。
5. 是否需要一个用户可见的 “最近为什么变了” 时间线面板。

---

## 18. 本篇结论

1. Soul 产品面必须可解释，但不能退化成角色配置器。
2. 用户应看到当前 soul、最近成长、proposal 与外化能力，而不是 raw artifacts。
3. 用户可以治理高影响变化，但不能直接编辑 core identity。
4. “为什么变了 / 为什么不能编辑 / 来源是什么” 必须成为 soul 产品面的默认解释语言。
5. 本篇把 soul system 和现有 Memory / Growth / Automation 前台面正式接起来了。
