# Memory / Soul 严格审查与产品收敛建议

日期：2026-04-09

范围：
- 后端 `memory_os/*`、`memory/*`、gateway memory/soul routers
- 前端 `workspace/memory/*`、`core/soul*`、memory settings surfaces
- memory/soul 相关合同测试与单测

验证：
- `backend/.venv/bin/pytest backend/tests/test_memory_os_growth_orchestrator.py backend/tests/test_memory_os_soul_runtime.py backend/tests/test_memory_growth_router.py backend/tests/test_legacy_memory_retirement.py -q`
- `pnpm --dir frontend test:contracts -- src/components/workspace/memory/memory-routes.contract.test.ts src/components/workspace/memory/memory-route-smoke.contract.test.ts src/components/workspace/settings/memory-surface-tabs.contract.test.ts`

## 执行摘要

当前系统并不是一个已经收口的“记忆系统 + 独立灵魂系统”，而是四层东西叠在一起：

1. `Memory OS` 作为新主链。
2. `memory_os.compat` 与 `/api/memory`、`/api/memory/growth` 维持旧产品语义。
3. 前端继续把大量治理面、调试面、证据面直接暴露给普通用户。
4. 灵魂系统虽然名义上独立，但实际仍被 growth / repeated_needs / relationship 派生逻辑强耦合。

结论很直接：

- 代码上，存在明显的兼容壳、重复壳、空壳组件、仅被测试消费但未进入主链的判定逻辑。
- 业务上，记忆系统和灵魂系统没有被真正分层；“长期人格”仍然被“近期信号”和“成长轨道”牵引。
- 产品上，当前前端严重过度暴露内部维护面，不符合普通用户只想“看到系统记住了什么”的目标。

## 严格 Findings

### P1 记忆增长链路会直接驱动灵魂提案，并继续外化成学习 / 方法 / 自动化，系统边界是错的

证据：
- `backend/packages/harness/nion/memory_os/soul_reflection.py:10`
- `backend/packages/harness/nion/memory_os/growth_orchestrator.py:12`
- `backend/tests/test_memory_os_growth_orchestrator.py:6`

现状：
- `reflect_soul_growth()` 只要 `evidence_days >= 2`、`repeated_needs >= 3` 且内容完全相同，就创建 soul proposal。
- `run_growth_orchestrator()` 只要 soul proposal 创建成功，就继续创建 learning topic，并投影 procedure 与 automation。

问题：
- 这等于把“灵魂”当成重复需求的副产品。
- 这也把“人格/陪伴方式”的变化与“任务方法/自动化能力”的增长绑成同一条流水线。
- 用户指出“灵魂不应随着记忆而改变”在当前主链上是成立的，且不是局部问题，是 orchestrator 级别的问题。

影响：
- 灵魂会被 operational pattern 污染。
- 灵魂提案出现时机过于机械，容易生成伪人格变化。
- 任何未来再往 growth 上叠功能，都会继续加重耦合。

### P1 `identity_narrative` 被设计成 7 天 freshness，长期灵魂层会自动失效

证据：
- `backend/packages/harness/nion/memory/soul/service.py:9`
- `backend/packages/harness/nion/memory/soul/service.py:58`
- `backend/packages/harness/nion/memory_os/soul_runtime.py:7`
- `backend/tests/test_memory_os_soul_runtime.py:49`

现状：
- `identity_narrative` 的 `freshness_window` 被硬编码为 `timedelta(days=7)`。
- `compile_soul_runtime()` 读取 soul layer snapshot 时强依赖 freshness。

问题：
- 核心人格叙事本应稳定，顶多需要人工晋升或版本替换，不应该因为时间窗口自然过期。
- 这会把“长期身份叙事”降格成“近期有效的配置项”。
- 这与用户要求的“性格、爱好、说话方式、背景等不会经常调整”直接冲突。

影响：
- 7 天后即使没有新叙事，也可能在运行时消失。
- prompt runtime 会出现不连续的人格表达。

### P1 普通用户前端暴露了大量不该直面的治理动作

证据：
- `frontend/src/components/workspace/memory/memory-home-page.tsx:24`
- `frontend/src/components/workspace/memory/memory-growth-panel.tsx:25`
- `frontend/src/components/workspace/memory/memory-user-page.tsx:68`
- `frontend/src/components/workspace/memory/soul-console-page.tsx:64`
- `backend/app/gateway/routers/memory_growth.py:115`
- `backend/app/gateway/routers/memory_soul.py:24`

现状：
- 首页直接暴露 `Growth`、`Soul Console`、`Ledger`、`Evidence`、`Runtime trace`。
- `User context` 页面直接开放 `修正 / 冻结 / 申请遗忘 / 拒绝`。
- `Growth` 页面开放 `接受 / 冻结 / 恢复 / 拒绝`。
- `Soul Console` 开放 `编辑 layer / 回滚 overlay / 冻结自动演化`。

问题：
- 这些都是内部治理或运维动作，不是普通用户的主任务。
- 用户要的是“能看到 agent 存了哪些记忆”，不是管理一个 memory ops 后台。
- 当前信息架构把内部系统维护面误当成产品能力面。

影响：
- 用户理解成本高。
- 错误操作面增多。
- 页面越做越像运维控制台，而不是个人助手。

### P1 `/api/memory` 与 `/api/memory/growth` 仍以 legacy compatibility 语义作为主产品 API

证据：
- `backend/app/gateway/routers/memory.py:1`
- `backend/app/gateway/routers/memory.py:149`
- `backend/app/gateway/routers/memory.py:273`
- `backend/app/gateway/routers/memory_growth.py:7`
- `backend/packages/harness/nion/memory_os/compat.py:85`
- `backend/packages/harness/nion/memory_os/compat.py:383`

现状：
- 主 memory router 明确写着 `compatibility surfaces`。
- `get_memory()` / `reload_memory()` / `export_memory()` 都返回 `build_legacy_memory_view()`。
- growth 列表与 user-model 列表走 `list_legacy_*`，状态修改走 `update_legacy_growth_item_status()`。

问题：
- 这意味着主产品 API 仍然在“新实现 + 旧语义投影”的桥接层上。
- 兼容层不再只是迁移辅助，而是实际业务入口。
- 任何收敛动作都会先撞上 compat 语义债务。

影响：
- 后端概念污染。
- 前端无法对真实域模型建模，只能继续消费 legacy 形状。

### P2 Growth / Soul 前端存在明确的补丁式重复壳

证据：
- `frontend/src/core/memory-growth-v2/api.ts:1`
- `frontend/src/core/memory-growth-v2/hooks.ts:1`
- `frontend/src/core/memory-growth-v2/types.ts:1`

现状：
- `V2` API/hook/type 只是逐行转调 `V1`，没有新语义、没有新契约、没有迁移边界。

问题：
- 这是典型“补丁叠补丁”。
- 文件数量变多，但没有降低复杂度。
- 后续开发者会误以为存在两个阶段中的系统。

影响：
- 命名噪音上升。
- 改一处要查两层。

### P2 存在明确死代码/空壳代码，且被合同测试固化

证据：
- `frontend/src/components/workspace/settings/memory-surface-tabs.tsx:3`
- `frontend/src/components/workspace/settings/memory-surface-tabs.contract.test.ts:1`
- `frontend/src/components/workspace/settings/memory-console-panel.tsx:25`

现状：
- `MemorySurfaceTabs` 整个组件只 `return null`，且合同测试专门断言它必须是空壳。
- `MemoryConsolePanel` 是一个完整的大组件，但仓库内没有任何生产代码引用。

问题：
- 一个是已退役但仍保留的空壳。
- 一个是未接线的大型遗留组件。
- 两者都说明记忆产品面经历了反复改线，但没有彻底清仓。

影响：
- 维护者无法快速分辨真实入口。
- 容易造成“以为还在用”的误读。

### P2 `Soul Judge` 逻辑目前是测试型孤岛，不在真实主链

证据：
- `backend/packages/harness/nion/memory/soul/judge.py:9`
- `backend/packages/harness/nion/memory/soul/models.py:1`
- `backend/packages/harness/nion/memory/extraction/models.py:1`

现状：
- `judge_soul_signal()` 只有测试引用，没有生产代码调用。
- `SoulSignal` 在 `memory/soul/models.py` 与 `memory/extraction/models.py` 各有一份近似定义。

问题：
- 这是“看起来像未来主链、实际上未入主链”的代码。
- 数据结构重复，职责边界不清。

影响：
- 未来接入时容易出现平行实现。
- 当前阅读成本高，但不产生真实价值。

### P3 存在明显的临时/场景硬编码，像原型代码而不是通用系统

证据：
- `backend/packages/harness/nion/memory_os/growth_orchestrator.py:33`
- `backend/packages/harness/nion/memory_os/soul_reflection.py:26`

现状：
- growth 里直接硬编码学习主题标题 `低刺激支持策略`。
- soul proposal 标题固定成 `调整陪伴与支持方式`。

问题：
- 这是强场景偏置，不是领域模型。
- 更像原型期演示数据模板，而不是生产逻辑。

影响：
- 一旦业务主题变化，输出会带着错误的默认叙事。

## 真实业务模型梳理

### 当前记忆系统实际承载了什么

从代码看，当前“记忆系统”至少混了五类东西：

1. 用户模型
2. 历史背景
3. 事实库
4. 成长治理对象
5. 证据、ledger、runtime trace 等内部观察面

其中 1-3 是用户可感知价值，4-5 是系统内部治理与诊断。

问题不是功能太多本身，而是把 4-5 直接做成普通用户日常要操作的页面。

### 当前灵魂系统实际承载了什么

从运行时和控制台看，当前 soul 被拆成：

1. `constitution`
2. `identity_narrative`
3. `relationship_stance`
4. `adaptive_overlay`

这是一个合理的分层方向，但实现上有两个错误：

1. `identity_narrative` 仍然带 freshness 失效语义。
2. `relationship_stance` / `adaptive_overlay` / growth proposal 之间的边界仍不够硬，导致灵魂被近期信号和治理动作拖着走。

## 第一性原理收敛方案

### 记忆系统应该只保留一个用户可见主面

普通用户真正需要的是：

1. 我当前记住了什么
2. 这些记忆最近有没有变化
3. 如果我在聊天里说“这个记错了”“别再记这个”，系统能理解并处理

因此前端应该收敛成：

- 一个 Memory 页面
- 默认只展示当前有效记忆
- 按“用户画像 / 长期背景 / 事实记忆”分组
- 可选显示来源与更新时间

不应该默认暴露：

- freeze
- reject
- resume
- forget 按钮
- ledger
- evidence
- runtime trace
- canonical node / revision 术语

这些都应该转入：

- agent 内部治理
- 开发者诊断面
- 或聊天意图触发的显式操作

### 灵魂系统应该独立于记忆系统，但共享底层存储

建议结构：

- Memory：用户事实与背景
- Soul：助手稳定人格与表达策略

Soul 只保留两个用户面：

1. `当前灵魂摘要`
2. `灵魂设置`

其中“灵魂设置”也不应是 ops console，而应是稳定配置页，只允许编辑：

- 性格
- 说话方式
- 偏好风格
- 背景设定
- 与用户的关系基调

不应出现：

- revision
- rollback overlay
- freeze auto evolution
- governance event
- evidence_ref

这些属于系统内部实现细节。

### soul 分层建议

- `constitution`：只可初始化或极少数管理员级变更，不参与自动演化。
- `identity_narrative`：长期稳定层，不应按 freshness 自动失效。
- `relationship_stance`：可从长期交互稳定推导，但不应直接暴露给普通用户手工治理。
- `adaptive_overlay`：唯一允许短期波动的层，用于阶段性表达调整。

### growth 应该降级为内部机制，而不是用户产品面

growth 仍可存在，但应转为：

- 后台治理
- 开发态诊断
- agent 自主维护

不应再作为主记忆产品面的一级入口。

如果保留页面，也应至少移入开发者模式。

## 建议的落地顺序

### 第一批：产品面止血

1. 记忆首页只保留“当前记忆总览”。
2. 下掉首页到 `Growth / Soul Console / Ledger / Evidence / Runtime trace` 的显性入口。
3. `User context` 页面去掉 `冻结 / 申请遗忘 / 拒绝`，保留只读与必要修正入口。
4. `Soul Console` 改造成真正的 `Soul Settings`。

### 第二批：后端边界硬化

1. 把 `/api/memory` 从 `build_legacy_memory_view()` 正式迁到 canonical product DTO。
2. 把 `/api/memory/growth` 降级为 internal/developer surface。
3. 拆断 `growth_orchestrator -> soul proposal -> learning/procedure/automation` 的联动主链。
4. 去掉 `identity_narrative` freshness。

### 第三批：代码清仓

1. 删除 `memory-growth-v2` 壳层。
2. 删除未接线的 `MemoryConsolePanel`。
3. 删除 `MemorySurfaceTabs` 空壳和其合同测试。
4. 决定 `SoulSignal` 的唯一归属，移除重复模型定义。
5. 决定 `judge_soul_signal()` 是否进入主链；如果不进，直接删。

## 简化后的目标产品结构

### Memory

- 当前记忆
- 最近新增/修正
- 聊天驱动修正
- 向量配置

### Soul

- 当前人格摘要
- 性格 / 语气 / 背景 / 关系基调配置
- 系统说明：灵魂不会因单次聊天自动重写

### Developer only

- Growth governance
- Ledger
- Evidence
- Runtime trace
- Soul events

## 这轮审查后的判断

当前最需要做的不是继续在现有页面上小修小补，而是先做一次明确的收口：

- 把“用户面”与“治理面”分开。
- 把“记忆”与“灵魂”分开。
- 把“长期人格”与“短期适配”分开。
- 把“新主链”与“兼容壳”分开。

否则后面任何新增功能，都会继续长在错误边界上。
