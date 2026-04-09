# Memory / Soul Runtime Mainchain Design

日期：2026-04-10  
状态：Draft for review  
范围：`B. 运行时主链重构`

## 1. 任务定义

第一阶段已经完成了 `Memory` / `Soul` 的产品边界收口：

- 普通用户只看到一个 `Memory` 主页面
- `Soul` 只存在于 `Settings > Soul`
- `/api/memory/growth` 已从产品公开面移除
- 前端错误产品面、split pages、compat 壳已经删除

但这并不等于系统已经真正稳定。当前剩余问题集中在**运行时主链**，也就是：

1. 运行时实际读取的 memory / soul 数据仍由多条链分别拼装。  
   现在至少存在这些入口：
   - `backend/packages/harness/nion/agents/lead_agent/prompt.py`
   - `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
   - `backend/packages/harness/nion/memory_os/context_assembler.py`
   - `backend/packages/harness/nion/memory/runtime_engine/service.py`
   - `backend/packages/harness/nion/memory_os/soul_runtime.py`

2. `Soul` 的稳定层和短期层虽然在产品面已经分开，但运行时还没有单一 owner。  
   `identity_narrative`、`relationship_stance`、`adaptive_overlay` 仍然存在“谁负责写、谁负责读、谁负责过期”的多头语义。

3. legacy memory updater / queue 仍然挂在主链附近。  
   它们已经被标记为 compatibility-only，但仍然被 middleware 直接引用，意味着系统仍保留“旧链也许还会写主记忆”的结构性风险。

4. internal governance 还没有完成真正的 owner 定义。  
   现在产品面已经切干净，但 internal surface、compat helpers、runtime compatibility 仍没有完全收束成“明确保留”或“明确退休”的状态。

这个阶段的目标不是继续做页面，而是把**运行时主链**做成和产品模型一致的真实系统。

## 2. 设计目标

### 核心目标

- 让 runtime 只使用一条正式的 memory / soul 注入链
- 让 stable soul 和 adaptive overlay 成为明确分层
- 让 stable soul 只被用户显式修改
- 让 adaptive overlay 成为唯一允许自动变化的 soul 层
- 让 legacy memory updater / queue 明确退出主链

### 结果目标

- `prompt runtime`、`continuity middleware`、`runtime memory engine` 对同一份 runtime bundle 达成一致
- `identity_narrative` 不再通过任何自动运行时链路被 agent 主动改写
- `relationship_stance` 不再通过自动派生链路悄悄进入 stable soul
- `adaptive_overlay` 有明确的触发、去重、续期、过期规则
- internal governance 的保留项与退休项有清晰 owner

## 3. 非目标

本阶段不做：

- 新的普通用户产品页面改版
- Notebook 产品语义重构
- Automation 产品 IA 重构
- 非 memory / soul 范围的 prompt 系统重构

## 4. 已确认的硬约束

这些是本阶段必须继续服从的上位约束：

1. `Memory` 对普通用户仍然保持极简、无感。
2. `Soul` 仍然独立于 `Memory`，入口固定在 `Settings > Soul`。
3. stable soul 只有用户能改。
4. agent 不能主动修改 stable soul。
5. 只有 `adaptive_overlay` 可以自动变化。
6. 不存在 `proposal / accept / reject` 概念。
7. internal governance 不得重新回流到普通产品面。

## 5. 当前代码证据

### 5.1 运行时装配分裂

当前 runtime memory / soul 相关逻辑散落在：

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- `backend/packages/harness/nion/memory_os/context_assembler.py`
- `backend/packages/harness/nion/memory/runtime_engine/service.py`
- `backend/packages/harness/nion/memory_os/soul_runtime.py`

这说明目前系统没有“唯一 runtime 组装器”，而是多处直接取数、多处单独拼 prompt block。

### 5.2 legacy memory 写链仍可见

当前 legacy compatibility 仍保留：

- `backend/packages/harness/nion/agents/memory/updater.py`
- `backend/packages/harness/nion/agents/memory/queue.py`
- `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`

虽然文件内部已经强调 compatibility-only，但主链附近仍存在真实引用，所以“旧链不会再影响系统”还不能算成立。

### 5.3 stable soul / adaptive overlay 仍缺单一 owner

当前 soul 相关语义分散在：

- `backend/packages/harness/nion/memory/soul/service.py`
- `backend/packages/harness/nion/memory/soul/console_service.py`
- `backend/packages/harness/nion/memory_os/soul_artifacts.py`
- `backend/packages/harness/nion/memory_os/soul_reflection.py`
- `backend/packages/harness/nion/memory_os/soul_runtime.py`

虽然第一阶段已经删掉了 proposal/governance 路线，但 runtime 层仍需要进一步制度化。

## 6. 备选方案

### Option A: 继续小修现有多入口

做法：
- 保留 `prompt.py`、`continuity_middleware`、`runtime_engine` 各自取数
- 只在局部修字段和过期逻辑

优点：
- 改动小
- 风险表面上低

缺点：
- 多入口装配问题不解决
- 后续极易再次漂移
- 还是“靠纪律维持一致”，不是靠结构

### Option B: 引入单一 Runtime Context Bundle

做法：
- 明确一个唯一 runtime bundle builder
- 所有 runtime 注入入口都消费同一份 bundle
- stable soul、adaptive overlay、memory recall 统一在 bundle 中定义

优点：
- 结构清晰
- 测试可集中写
- 能真正收掉分裂的主链

缺点：
- 需要同时改多条运行时入口
- 需要一轮集中测试迁移

### Option C: 直接重写为全新 memory runtime 子系统

做法：
- 新建完整 runtime framework
- 再把所有老逻辑切过去

优点：
- 理论最干净

缺点：
- 本阶段范围过大
- 风险不成比例
- 会把“主链收口”升级成“平台重写”

### 推荐方案

选择 **Option B**。

原因：
- 足够彻底，能解决主链分裂
- 又没有膨胀到平台重写
- 最符合“稳扎稳打、每期都能验收”的节奏

## 7. 目标运行时模型

### 7.1 Stable Soul Profile

stable soul 是用户拥有的长期人格配置，只包含：

- `core_identity`
- `speech_style`
- `values_and_boundaries`
- `relationship_stance`

规则：

- 只能由用户显式设置页应用，或由用户在聊天中明确要求修改时更新
- 不能由 heartbeat、reflection、growth、repeated needs 自动写入
- runtime 读取时必须优先读这份 stable profile，而不是从若干 record subtype 做隐式推断

### 7.2 Adaptive Overlay

`adaptive_overlay` 是唯一允许自动变化的短期层。

职责：

- 反映短期表达策略调整
- 不能改写 stable soul
- 可以被 runtime 注入，但必须和 stable soul 并列，而不是覆盖 stable soul 的 owner

规则：

- 必须有明确触发条件
- 必须有去重规则
- 必须有续期 / 覆盖规则
- 必须有过期 / 失效规则

### 7.3 Runtime Memory Bundle

运行时应当由一个统一 bundle 输出以下 section：

- stable soul
- adaptive overlay
- hot memories
- relevant procedures
- scoped recall
- verbatim evidence

约束：

- `lead_agent prompt` 与 `continuity middleware` 都只能消费 bundle，不再各自直接查库拼装
- bundle 是唯一“什么会进入 runtime”的裁决面

## 8. 生命周期设计

### 8.1 Stable Soul 写入

唯一正式入口：

- `Settings > Soul` 应用
- 用户在对话里明确要求修改 soul

不允许的入口：

- heartbeat
- repeated needs
- growth orchestrator
- reflection
- internal derived relationship signals

### 8.2 Identity Narrative

`identity_narrative` 在本阶段的定位：

- 如果它被保留为 stable soul 的一部分，则它必须受 stable soul 写入规则约束
- 如果存在 staged draft，则 staged draft 只能是 internal artifact，不得自动进入 stable runtime

结论：

- staged narrative 可以保留为 internal artifact
- staged -> stable 的晋升必须是显式 transition，而不是后台自动推进
- runtime 中 stable narrative 不再按 freshness 自然失效

### 8.3 Relationship Stance

`relationship_stance` 是 stable soul 的一部分，而不是 relationship domain 自动派生写回 stable soul 的后门。

允许：

- relationship domain 作为参考信号
- relationship domain 参与 internal analysis

不允许：

- relationship derivation 直接改写 stable soul

### 8.4 Adaptive Overlay

`adaptive_overlay` 的 lifecycle：

1. repeated needs 达到阈值时，可尝试刷新 overlay
2. 若新摘要与当前 active overlay 相同，则不重复写入
3. 若不同，则写新版本或更新 active overlay
4. overlay 过期后退出 runtime 注入
5. overlay 的存在不改变 stable soul 的 owner 和更新时间语义

## 9. 运行时装配设计

### 9.1 Single Owner

建议把 runtime 注入统一到一个 owner：

- `runtime_engine.service` 负责生成 structured runtime result
- `context_assembler` 只负责把 structured result 转成 context pack / prompt block
- `prompt.py` 和 `continuity_middleware` 只消费结果，不直接查库

### 9.2 Session Policy

`session_mode / memory_read / memory_write` 继续作为 gating 输入，但作用方式要统一：

- `memory_read=false` 时，bundle 返回 gated 结果
- `memory_write=false` 时，禁止 durable evidence 与 stable soul 写入
- `temporary_chat` 不得污染 stable soul

### 9.3 Prompt Injection Order

建议固定为：

1. stable soul
2. adaptive overlay
3. hot memories
4. relevant procedures
5. scoped recall
6. verbatim evidence

目标：

- runtime 表达先由 stable identity 决定
- adaptive overlay 只做短期调节
- memory recall 不反向决定人格

## 10. Legacy Compatibility 策略

### 10.1 Legacy updater / queue

本阶段必须做出明确决定：

- 要么退出主链
- 要么保留为明确 gated 的 compatibility lane

不能继续处于“逻辑上已退休、引用上仍活着”的状态。

### 10.2 Internal Governance

internal governance 可以保留，但要满足：

- 有明确 owner
- 有明确 developer/internal gating
- 不再被 runtime 主链默认依赖

## 11. 关键文件触点

第二阶段设计直接涉及这些真实文件：

### Runtime Assembly

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`
- `backend/packages/harness/nion/memory_os/context_assembler.py`
- `backend/packages/harness/nion/memory/runtime_engine/service.py`
- `backend/packages/harness/nion/memory/runtime_engine/models.py`
- `backend/packages/harness/nion/memory_os/soul_runtime.py`

### Soul Lifecycle

- `backend/packages/harness/nion/memory/soul/service.py`
- `backend/packages/harness/nion/memory/soul/console_service.py`
- `backend/packages/harness/nion/memory_os/soul_artifacts.py`
- `backend/packages/harness/nion/memory_os/soul_reflection.py`
- `backend/packages/harness/nion/memory_os/soul_transitions.py`
- `backend/packages/harness/nion/memory/soul/judge.py`

### Legacy Compatibility

- `backend/packages/harness/nion/agents/memory/updater.py`
- `backend/packages/harness/nion/agents/memory/queue.py`
- `backend/packages/harness/nion/agents/middlewares/memory_middleware.py`
- `backend/packages/harness/nion/memory_os/compat.py`

## 12. 验收标准

1. runtime 中 stable soul 只有单一正式来源。
2. repeated needs 不再直接驱动 stable soul 变化。
3. `identity_narrative` 不会因 freshness 自动失效。
4. `adaptive_overlay` 是唯一自动变化层，且 lifecycle 有测试覆盖。
5. `prompt.py`、`continuity_middleware`、`runtime_engine` 读取的是同一 runtime bundle。
6. legacy updater / queue 已明确退休或硬隔离。
7. internal governance 不再默认参与 runtime 主链。

## 13. 风险

1. 如果只改 runtime_engine，不改 prompt / continuity，分裂主链还会存在。
2. 如果只改 soul_reflection，不改 stable soul write owner，stable/active 仍会继续混。
3. 如果只写文档不清 legacy 引用，compat 代码会继续通过 middleware 回流。

## 14. 下一步

这份 spec 通过后，直接进入第二阶段实施文档：

- 按 runtime assembly、soul lifecycle、legacy retirement 三条主线拆任务
- 先写 failing tests，再改实现
- 最后做后端回归 + 前端 typecheck/contracts + browser/electron smoke
