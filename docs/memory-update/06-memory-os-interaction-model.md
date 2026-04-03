# Memory OS Interaction Model

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的第七篇。

它负责冻结：

- 用户可见的 Memory OS 产品面
- 用户可操作的控制面
- 用户如何理解 agent 的成长行为
- 用户如何反馈纠错、冻结、遗忘
- agent-owned automation 的前台交互模型

它**不**负责：

- 最终视觉设计
- 具体组件实现
- 后端 API 细节

## 2. Inputs

本篇依赖：

- [02-memory-os-business-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/02-memory-os-business-rules.md)
- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [04-memory-os-runtime-flows.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/04-memory-os-runtime-flows.md)
- 当前 memory / automation 前端骨架：
  - [frontend/src/components/workspace/memory/memory-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/memory/memory-page.tsx)
  - [frontend/src/components/workspace/automation/automation-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-page.tsx)
  - [frontend/src/components/workspace/settings/memory-settings-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/settings/memory-settings-page.tsx)

## 3. Decisions

本篇冻结以下关键决策：

1. Memory OS 必须是可见、可解释、可控制的，不允许做成完全黑箱。
2. 用户看到的是“为我服务的长期认知系统”，不是一堆底层表结构。
3. 用户默认看到的是与自己相关的面，而不是 agent internal raw artifacts。
4. `agent_self`、`soul proposal`、`learning`、`agent-owned automation` 都需要前台有解释面。
5. 用户必须有“纠错 / 冻结 / 暂停 / 遗忘请求”四类核心控制权。

## 4. 顶层产品面

Memory OS 前台信息架构冻结为 5 个一级面：

1. `Memory Home`
2. `User Model`
3. `Memory Search`
4. `Agent Growth`
5. `Automation Ownership`

## 4.1 `Memory Home`

### 作用

- 给用户一个总体理解入口

### 展示内容

- 最近更新的关键记忆
- 当前高置信 user model 摘要
- 最近成长提案概览
- 当前启用中的 agent-owned automation 概览

### 不展示

- 原始 candidate 队列
- 内部日志明细

## 4.2 `User Model`

### 作用

- 展示 agent 当前如何理解用户

### 模块

1. 工作画像
2. 沟通偏好
3. 工作节律
4. 长期目标
5. 互动边界

### 用户操作

- 标记正确
- 纠正
- 冻结
- 请求遗忘

## 4.3 `Memory Search`

### 作用

- 跨 recall / memory / notebook projection 查询

### 搜索结果类型

- 对话证据
- 用户画像记录
- notebook 投影片段
- procedure / learning 相关项

### 必须展示

- 来源类型
- 更新时间
- 是否 active / archived
- provenance 简述

## 4.4 `Agent Growth`

### 作用

- 告诉用户 agent 正在如何成长，而不是让成长过程完全黑箱

### 子模块

1. 学习主题
2. 学习计划
3. procedure / skill 提案
4. soul proposals
5. 最近反思摘要

### 关键原则

- 展示“结果和理由”
- 不默认展示 diary 全文

## 4.5 `Automation Ownership`

### 作用

- 分开呈现 user-owned 与 agent-owned automation

### 子模块

1. 用户创建的自动化
2. agent 创建的自动化

### 核心区别

- user-owned: 可编辑
- agent-owned: 仅启停/查看来源/查看理由

## 5. 对不同对象的前台暴露策略

## 5.1 `user_model`

### 默认可见

- 是

### 默认可操作

- 纠正
- 冻结
- 遗忘请求

### 默认不直接暴露

- 原始底层 metadata

## 5.2 `relationship`

### 默认可见

- 是

### 默认可操作

- 修改
- 冻结

### 理由

- 这层直接影响用户与 agent 的舒适度

## 5.3 `knowledge_projection`

### 默认可见

- 通过 search / detail drawer 暴露

### 默认可操作

- 跳转原始 notebook / document

### 不可做

- 直接把 projection 当成可编辑正文

## 5.4 `agent_self`

### 默认可见

- 仅展示摘要，不展示完整 diary 流水账

### 默认可操作

- 对某类自动维护行为进行暂停
- 对错误结论进行反馈

### 默认不可操作

- 直接编辑 diary 正文

## 5.5 `procedure`

### 默认可见

- 显示已批准的 procedure 摘要
- 显示 draft/proposal 概览

### 默认可操作

- 对 proposal 进行接受/忽略

## 5.6 `soul`

### `core_soul`

- 默认不可编辑
- 可显示“当前风格基础简介”

### `adaptive_overlay`

- 默认显示概要，不显示底层全文

### `soul_proposals`

- 默认可见
- 必须提供：
  - 为什么产生
  - 会改变什么
  - 接受 / 拒绝

## 5.7 `learning`

### 默认可见

- 学习主题
- 学习状态
- 与用户服务的关联理由

### 默认可操作

- 暂停
- 恢复
- 停止学习该主题

## 5.8 `agent-owned automation`

### 默认可见

- 是

### 默认显示字段

- 名称
- 类型
- 为什么创建
- 来源于哪个 learning topic / memory / procedure
- 上次运行结果
- 当前状态

### 默认可操作

- pause
- resume
- dismiss suggestion

### 默认不可操作

- 编辑 prompt
- 编辑内部 schedule 细节

## 6. 用户控制动作清单

## 6.1 基础控制动作

每个长期认知对象至少支持以下控制之一：

- `correct`
- `freeze`
- `forget_request`
- `pause`
- `resume`
- `accept`
- `reject`

## 6.2 各对象控制矩阵

| 对象 | 查看 | 纠正 | 冻结 | 遗忘请求 | 接受/拒绝 | 暂停/恢复 |
|---|---|---|---|---|---|---|
| user_model | 是 | 是 | 是 | 是 | 否 | 否 |
| relationship | 是 | 是 | 是 | 是 | 否 | 否 |
| knowledge_projection | 是 | 否 | 否 | 否 | 否 | 否 |
| agent_self summary | 摘要可见 | 反馈 | 某类行为可冻结 | 否 | 否 | 否 |
| procedure proposal | 是 | 否 | 否 | 否 | 是 | 否 |
| soul proposal | 是 | 否 | 否 | 否 | 是 | 否 |
| learning topic | 是 | 否 | 否 | 否 | 否 | 是 |
| user-owned automation | 是 | 通过编辑实现 | 否 | 删除 | 否 | 是 |
| agent-owned automation | 是 | 否 | 否 | 停止建议权 | 否 | 是 |

## 7. 关键用户场景

## 7.1 用户纠正 agent 误记

### 场景

- 用户说：“我不是财务负责人，是财务 BP。”

### 前台行为

1. 当前回答生效
2. User Model 面显示旧记录被覆盖
3. 新记录进入 active 或 suggestion，取决于规则
4. 用户可看到“为什么更新”

## 7.2 用户不希望被系统主动教

### 场景

- 用户说：“不要顺便教我这些知识点。”

### 前台行为

1. relationship 更新为更低 teaching tolerance
2. Agent Growth 中相关 learning/teaching proposal 收敛
3. 用户可看到该约束已生效

## 7.3 agent 生成新的学习主题

### 场景

- 系统识别到用户持续问财务汇报表达

### 前台行为

1. Agent Growth 中出现新 learning topic
2. 显示：
   - 为什么出现
   - 最近证据
   - 当前状态
3. 用户可 pause / stop

## 7.4 agent 生成 agent-owned automation

### 场景

- 系统希望每周回顾一次某学习主题

### 前台行为

1. 在 Automation Ownership 中出现一条 agent-created job
2. 明示：
   - 来源
   - 类型
   - 影响等级
3. 用户可 pause/resume

## 7.5 soul proposal 出现

### 场景

- 系统认为应更结论先行

### 前台行为

1. Agent Growth 中出现 soul proposal 卡片
2. 必须展示：
   - 变更内容
   - 依据
   - 风险级别
3. 用户必须显式 accept/reject

## 8. 交互密度原则

## 8.1 默认展示摘要，不展示原始工件

原因：

- 用户需要理解，不需要先看内部流水账

## 8.2 解释优先于控制

如果一个对象可控制，必须先能解释：

- 它是什么
- 为什么会出现
- 它会影响什么

## 8.3 轻量反馈优先

对大多数对象，优先提供：

- 正确
- 不对
- 暂停
- 不要再这样

而不是复杂表单。

## 8.4 用户资产和 agent 内部工件分开呈现

Notebook 页面不承载 agent_self 和 soul 的主体内容。  
Agent Growth 页面不伪装成用户 notebook。

## 9. 与当前前端结构的承接

## 9.1 当前可复用

可以继续承接现有：

- `/workspace/memory/*`
- `/workspace/automation/*`
- settings 里的 memory summary

## 9.2 推荐的未来产品面组织

### Memory

- Home
- User Model
- Search
- History / Evidence

### Agent Growth

- Learning
- Procedures
- Soul Proposals
- Growth Summary

### Automation

- User-Owned
- Agent-Owned

## 9.3 不建议继续的做法

不建议把以下内容继续混在一个设置页：

- memory summary
- automation ownership
- soul proposals
- learning backlog

这会再次回到“巨型设置抽屉”。

## 10. Rules / Contracts

本篇冻结以下硬规则：

1. 用户必须能看到 Memory OS 对自己的核心理解。
2. 用户必须能对高价值长期理解进行纠正、冻结、遗忘请求。
3. `agent_self` 和 `soul` 不默认暴露正文，只暴露可解释摘要与提案。
4. agent-owned automation 必须单独标识，不能伪装成用户创建。
5. `soul overlay` 的生效必须通过显式 accept/reject 交互承载。

## 11. Impacts

本篇会直接约束：

- `07-memory-os-migration-and-compatibility.md`
- `08-memory-os-observability-and-risk.md`
- `09-memory-os-implementation-plan.md`

## 12. Open Questions

本篇尚未冻结的问题：

1. Agent Growth 是否作为独立路由还是 Memory 子域
2. soul proposal 与 procedure proposal 是否共用同一种卡片模型
3. 遗忘请求的反馈文案与系统说明如何最小化复杂度
4. “不再学习这个主题”与“暂停这个学习主题”是否分成两级

## 13. 结论

到这一篇为止，Memory OS 不再只是后台系统，而是拥有了一套前台交互模型。

后续迁移、风险与实施方案必须保证这些交互权利和解释面不会在实现时被削弱。
