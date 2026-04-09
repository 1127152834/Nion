# Memory / Soul Boundary And Contracts Design

日期：2026-04-09
状态：Draft for review
范围：`A. 边界与合同重定义`

## 1. 问题定义

当前系统中的 Memory 与 Soul 已经进入“看起来能用、看起来强大，但实际上不可控”的状态。问题不在于功能少，而在于边界错了。

当前主要问题有四类：

1. 用户内容面和内部治理面混在一起。
   现在普通用户在 `Memory` 里能看到或进入 `growth / soul console / ledger / evidence / runtime trace`，这使产品从“个人助手”退化成“内部控制台”。

2. `growth -> soul` 主链错误。
   `repeated needs`、growth、learning、procedure、automation、soul proposal 被串成一条链，导致长期人格和短期需求被混成一个系统。

3. `Soul` 没有真正独立。
   现在它仍然挂在 `Memory` 子树和 `memory/growth` 相关语义下面，用户感知上仍然是记忆系统的一部分。

4. 合同层不干净。
   当前前端同时消费 `/api/memory`、`/api/memory/growth`、`/api/memory/soul`、`/api/memory/ledger`、`/api/memory/evidence`、`/api/memory/runtime-trace` 等多套语义混杂的接口。页面看起来像产品面，数据合同却仍然是治理面或兼容面。

本设计的目标不是“增加更多能力”，而是先把边界重新定义清楚，再让系统重新回到可靠、可维护、可迭代的状态。

## 2. 设计目标

### 产品目标

- `Memory` 只回答一个问题：系统当前记住了什么。
- `Soul` 只回答一个问题：这个助手长期会怎么和用户相处、怎么说话。
- 所有内部治理与诊断能力退出产品 UI。

### 架构目标

- 把用户面、配置面、治理面拆成明确三层。
- 把 `Soul` 从 `Memory` 中独立出来。
- 让前端只消费两套正式用户合同：
  - `memory user-facing`
  - `soul settings`
- 让内部治理合同彻底退出普通用户产品路径。

### 非目标

- 本阶段不直接重写完整运行时。
- 本阶段不直接改 Notebook。
- 本阶段不做 Automation 产品重构。

## 3. 核心设计原则

1. 用户面只暴露用户价值，不暴露系统维护动作。
2. `Soul` 必须独立于 `Memory growth`，不能继续作为其子功能。
3. 稳定层和短期层必须硬分离。
4. 不再存在 `proposal / accept / reject` 概念。
5. 先定义合同，再切后端主链，再切前端页面，最后删旧壳。

## 4. 用户决策基线

以下内容已作为硬约束确定：

### Memory

- 走极简档。
- 首页按内容类型分组：
  - 用户画像
  - 长期背景
  - 事实记忆
- 详情方式：轻量展开。
- 纠错方式：纯聊天引导，不放修正按钮。
- 详情默认展示：
  - 来源
  - 更新时间
  - 形成原因
  - 相关线程 / 证据引用
- 不保留独立 Facts 页面。
- 不保留 Memory 搜索页面。
- 不允许 UI 手动新增、导入、导出记忆。

### Soul

- `Soul` 独立于 `Memory`。
- 入口位于 `Settings > Soul`。
- 稳定层配置只包含：
  - 核心人格
  - 说话方式
  - 价值观 / 边界
  - 全局唯一关系基调
- 保存模型：草稿 + 应用。
- 关系基调：全局唯一。
- 稳定层只有用户能改。
- 用户可以通过设置页修改，也可以通过与助手对话修改。
- agent 不能主动修改稳定层 Soul。
- 只有 `adaptive_overlay` 可以自动变化。
- `adaptive_overlay` 弱可见，不做控制台。

### Internal

- `growth / ledger / evidence / runtime-trace` 完全从产品 UI 移除。
- 不保留 `proposal / accept / reject` 概念。
- 迁移方式：合同先行 + 快速切断。

## 5. 目标边界模型

重构后系统只保留三层：

### 5.1 Memory User-Facing

职责：
- 向普通用户展示当前长期记忆内容。

包含：
- 用户画像
- 长期背景
- 事实记忆

不包含：
- growth
- proposal
- ledger
- evidence explorer
- runtime trace
- 任何治理动作

### 5.2 Soul Settings

职责：
- 向用户展示和编辑稳定层 Soul。

包含：
- 核心人格
- 说话方式
- 价值观 / 边界
- 关系基调
- 当前是否存在临时 `adaptive_overlay`

不包含：
- revision
- evidence_ref
- rollback
- freeze auto evolution
- growth timeline
- proposal 状态

### 5.3 Internal Governance

职责：
- 服务系统内部治理、开发调试和后端维护。

包含：
- growth
- ledger
- evidence
- runtime trace
- 旧治理动作

约束：
- 不再进入普通用户产品 UI
- 不再作为产品概念存在

## 6. 页面与入口设计

### 6.1 Memory

最终只保留一个主页面：
- `Memory`

页面内容：
- 用户画像组
- 长期背景组
- 事实记忆组

每条内容：
- 默认摘要
- 点击后轻量展开
- 展开后显示来源、更新时间、形成原因、相关线程/证据引用
- 只显示一句聊天纠错提示

删除或退出产品面的页面：
- Facts
- Search
- Growth
- Ledger
- Evidence
- Runtime Trace

### 6.2 Soul

不再保留 `/workspace/memory/soul` 这种信息架构。

最终入口：
- `Settings > Soul`

页面能力：
- 编辑稳定层 Soul 草稿
- 应用草稿
- 弱提示当前是否有 `adaptive_overlay`

### 6.3 Internal

以下页面从产品 UI 彻底移除：
- Growth
- Ledger
- Evidence
- Runtime Trace

后端能力是否保留，由实施阶段决定；但无论保留与否，都不能继续占据用户产品路由与入口。

## 7. API 合同设计

### 7.1 Memory User-Facing Contract

职责：
- 只服务普通用户的 Memory 主页面。

返回结构：
- `user_profile`
- `long_term_background`
- `fact_memories`

单条记录最小字段：
- `id`
- `content`
- `source_label`
- `updated_at`
- `reason`
- `related_refs`

禁止字段：
- `canonical_key`
- `revision_id`
- `proposal_status`
- `governance_action`
- `freeze`
- `reject`
- `resume`

### 7.2 Soul Settings Contract

职责：
- 只服务 `Settings > Soul`。

返回结构：
- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`
- `adaptive_overlay_summary`
- `has_active_overlay`

写入结构：
- `draft`
- `apply`

禁止字段：
- `revision_id`
- `evidence_ref`
- `rollback_info`
- `freeze_auto_evolution`
- `proposal`

### 7.3 Internal Governance Contract

职责：
- 只服务内部治理和开发调试。

返回结构：
- 自由，但不再允许被普通前端页面消费。

### 7.4 Compat 策略

- `compat` 只能作为迁移桥，不能再承接正式产品语义。
- 新前端用户页面一旦切到新合同，就应尽快切断旧产品入口。

## 8. 稳定层与自动变化规则

### 8.1 稳定层

稳定层包括：
- 核心人格
- 说话方式
- 价值观 / 边界
- 全局关系基调

规则：
- 只能由用户修改
- 用户可通过设置页或聊天修改
- agent 不能主动修改

### 8.2 自动变化层

仅 `adaptive_overlay` 允许自动变化。

规则：
- 只能临时微调表达
- 不能上升为稳定层写入
- 用户只弱感知，不进入控制台式展示

## 9. 删除 / 重做 / 保留清单

### 9.1 直接退出产品面的对象

- Memory Search
- Facts 独立页
- Agent Growth
- Memory Ledger
- Memory Evidence
- Runtime Trace
- Soul Console 当前形态

### 9.2 必须重做

- Memory 首页
- Soul 入口与设置页
- Settings 中 Memory/Soul 分区

### 9.3 必须重写的测试

- `memory-user-page.contract`
- `memory-growth-panel.contract`
- `soul-console-page.contract`
- `soul-summary-card.contract`
- `soul-proposal-list.contract`
- `soul-growth-timeline.contract`

### 9.4 可保留但重归位

- `adaptive_overlay`
- canonical memory 读取能力
- internal governance 后端能力
- `docs/test/10-memory-soul`

## 10. 迁移顺序

### Phase 0

- 冻结目标边界
- 完成本设计 spec
- 明确删改保留清单

### Phase 1

- 定义三套正式合同
- 重写 contract tests

### Phase 2

- 切断后端错误主链
- 修正 Soul 稳定层 / 自动层边界

### Phase 3

- 快速切断旧前端产品面
- 上线新 Memory 与 Soul 入口

### Phase 4

- 清理旧壳、旧路由、旧测试、旧兼容逻辑

## 11. 验收标准

1. 普通用户只看到一个 `Memory` 主页面。
2. 普通用户不再看到 Facts/Search/Growth/Ledger/Evidence/Runtime Trace。
3. `Soul` 只存在于 `Settings > Soul`。
4. 稳定层 Soul 只有用户可改。
5. 只有 `adaptive_overlay` 可自动变化。
6. 产品中彻底不存在 `proposal / accept / reject`。
7. 用户页面不再消费 internal governance contract。
8. 旧产品面相关合同测试已被替换，不再锁死错误结构。

## 12. 风险

1. 只改页面不改合同，旧语义会回流。
2. 只改合同不改主链，底层仍会持续制造幻觉。
3. 迁移不够坚决，会重新滑回双轨长期共存。

## 13. 下一步

这份设计得到用户确认后，再进入实施文档编写。

实施文档需要进一步拆到：
- 具体文件改动顺序
- 测试迁移顺序
- 路由切换顺序
- compat 退出节奏
