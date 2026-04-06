# Soul Runtime Compilation

## 1. Purpose

这份文档是 Soul System 实施前置规格的第二篇。

它负责冻结：

- Soul System 如何编译成主智能体热路径可用的 runtime text
- runtime 编译时读取哪些对象、不读取哪些对象
- 编译顺序、优先级、冲突处理和长度预算
- 与现有 prompt runtime / Memory OS context assembly / legacy `SOUL.md` 的接线方式
- runtime 编译失败时的降级策略

它**不**负责：

- soul 对象本身的字段定义
- soul 如何成长
- soul proposal 的治理等级
- 用户前台如何看到 runtime soul

这些分别交给：

- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- `15-soul-growth-and-reflection-rules.md`
- `16-soul-governance-matrix.md`
- `17-soul-product-interaction-model.md`

---

## 2. Inputs

本篇依赖：

- [12-nion-complete-soul-system-architecture.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/12-nion-complete-soul-system-architecture.md)
- [13-soul-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/docs/memory-update/13-soul-data-contracts.md)
- [04-memory-os-runtime-flows.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/04-memory-os-runtime-flows.md)
- [07-memory-os-migration-and-compatibility.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/07-memory-os-migration-and-compatibility.md)
- 当前代码中的：
  - [backend/packages/harness/nion/agents/lead_agent/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/agents/lead_agent/prompt.py)
  - [backend/packages/harness/nion/memory_os/context_assembler.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/context_assembler.py)
  - [backend/packages/harness/nion/memory_os/context_pack.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/memory_os/context_pack.py)
  - [backend/packages/harness/nion/config/agents_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend/packages/harness/nion/config/agents_config.py)

---

## 3. Decisions

本篇冻结以下关键决策：

1. 主智能体热路径不直接读取 raw soul artifacts，而是读取编译后的 soul runtime text。
2. Soul runtime text 必须是 summary-first、priority-ordered、bounded 的。
3. `core_soul`、`relationship_soul`、`identity_narrative`、`active_overlay` 是 runtime 核心输入。
4. `soul_memories` 允许进入 runtime，但只能以少量高权重摘要进入。
5. `soul_journal` 不直接进入 runtime，只作为 narrative / proposal / soul memory 的证据层。
6. legacy `SOUL.md` 只作为 fallback，不再是默认主路径。

---

## 4. Runtime Goal

Soul runtime compilation 的目标不是“把所有 soul 资料都塞进 prompt”。

它的目标是：

1. 让主智能体在当前会话里拥有稳定身份感
2. 让主智能体面对当前用户时呈现正确的关系人格
3. 让近期已批准的适应性变化生效
4. 让关键灵魂记忆以低噪音方式补充上下文
5. 控制 token 成本和冲突风险

---

## 5. Runtime Inputs

## 5.1 必选输入

主智能体 runtime soul text 的必选输入冻结为：

1. `SoulCoreArtifact`
2. `RelationshipSoulArtifact`
3. `IdentityNarrativeArtifact`
4. `SoulOverlayArtifact`

## 5.2 条件输入

条件输入冻结为：

1. `SoulMemoryRecord`
   - 仅限高 `salience` 条目
   - 仅限少量 critical items
2. `relationship.active`
   - 仅在 `RelationshipSoulArtifact` 缺失或明显过期时参与补充
3. legacy `SOUL.md`
   - 仅在 canonical soul artifact 缺失时 fallback

## 5.3 禁止直接输入

以下对象禁止直接进入 runtime soul text：

1. `SoulJournalEntry`
2. raw `SoulProposalRecord`
3. `candidate` 状态的任意 soul object
4. `invalidated / purged / superseded` 对象
5. 未经整理的 full diary 正文

原因：

- 这些对象噪音高
- 容易造成身份振荡
- 不适合 hot path

---

## 6. Runtime Compilation Order

runtime 编译顺序冻结为：

1. `core_soul`
2. `relationship_soul`
3. `active_overlay`
4. `identity_narrative`
5. `critical_soul_memories`

### 原则

- 先稳定层
- 再用户关系层
- 再近期适配层
- 再当前成长叙事
- 最后才是补充性高权重记忆

这个顺序不能乱。

如果把 `identity_narrative` 放在最前，会让动态叙事压过稳定人格。
如果把 `soul_memories` 放得太前，会让单点记忆过度驱动人格表现。

---

## 7. Runtime Section Schema

主智能体的 runtime soul text 结构冻结为：

```xml
<soul_runtime>
  <core_identity>
    ...
  </core_identity>
  <relationship_stance>
    ...
  </relationship_stance>
  <active_adaptations>
    ...
  </active_adaptations>
  <current_identity_narrative>
    ...
  </current_identity_narrative>
  <critical_soul_memories>
    ...
  </critical_soul_memories>
</soul_runtime>
```

说明：

- 这是 runtime assembly 结果，不要求 artifact 本体使用 XML。
- artifact 可以是 Markdown，但注入层应编译成稳定 section。

---

## 8. Section Semantics

## 8.1 `core_identity`

作用：

- 定义主智能体的根人格
- 价值观、关系伦理、服务原则、不可突破边界

要求：

- 必须最短、最稳定、最高优先级
- 不应包含近期波动内容

## 8.2 `relationship_stance`

作用：

- 定义主智能体面对当前用户时的默认姿态

要求：

- 必须以当前用户为 target
- 不应退化成普通 relationship facts

## 8.3 `active_adaptations`

作用：

- 承载已经批准生效的近期人格调整

要求：

- 只允许来源于 `active overlay`
- 不允许直接拼接 raw proposal

## 8.4 `current_identity_narrative`

作用：

- 让主智能体具备连续自我感

要求：

- 叙事应强调“当前我是什么样”
- 不应太长
- 不应用来覆盖 core identity

## 8.5 `critical_soul_memories`

作用：

- 补充少量高影响记忆

要求：

- 只保留 3-7 条高权重摘要
- 每条必须能解释其对人格或关系的影响

---

## 9. Compilation Rules

## 9.1 Summary-First Rule

所有输入对象在进入 runtime 前，必须先被压缩成：

- 低噪音 summary
- 明确影响点
- 去掉原始长正文

禁止：

- 直接拼接 artifact 全文
- 直接拼接 journal 正文
- 直接拼接 proposal evidence 列表

## 9.2 Conflict Resolution Rule

如果多个输入对象冲突，优先级如下：

1. `core_soul`
2. `relationship_soul`
3. `active_overlay`
4. `identity_narrative`
5. `soul_memories`

示例：

- narrative 说“我最近更主动”
- relationship_soul 说“当前用户不适合过度主动”

则以后者为准。

## 9.3 Freshness Rule

`relationship_soul`、`identity_narrative`、`active_overlay` 都必须有 freshness 检查。

若对象过期或 stale：

- 不直接停用 `core_soul`
- 可降级回上一版 stable object
- 或由 assembler 仅使用 core + critical memories

## 9.4 Provenance Rule

runtime compiled text 虽然最终注入 prompt，但其源对象必须可追踪。

建议：

- 生成 `SoulRuntimeSnapshot`
- 记录 source memory ids / artifact uris

---

## 10. Length Budget

## 10.1 总预算

本篇冻结 soul runtime compilation 的默认预算为：

- 建议目标：`600 - 1200 tokens`
- hard cap：`1600 tokens`

### 说明

这个预算是 soul runtime 自己的预算，
不包含 user_model / procedure / recall / notebook context 的预算。

## 10.2 分段预算

建议分配：

| section | recommended cap |
|---|---|
| `core_identity` | 180-300 tokens |
| `relationship_stance` | 120-220 tokens |
| `active_adaptations` | 80-180 tokens |
| `current_identity_narrative` | 120-260 tokens |
| `critical_soul_memories` | 120-240 tokens |

## 10.3 超预算处理

如果总长度超预算，按以下顺序压缩：

1. 先压缩 `critical_soul_memories`
2. 再压缩 `current_identity_narrative`
3. 再压缩 `active_adaptations`
4. 最后才压缩 `relationship_stance`
5. `core_identity` 最后最后才压缩

原因：

- `core_identity` 最不能失真
- 记忆与叙事更适合裁剪

---

## 11. Fallback Policy

## 11.1 Primary Path

默认主路径：

- Memory OS soul artifacts -> SoulContextAssembler -> runtime soul text

## 11.2 Fallback 1

若 canonical soul artifacts 未建全：

- `core_soul` 缺失时，回退到 legacy `SOUL.md`
- `relationship_soul` 缺失时，允许以 `relationship.active` 摘要降级替代
- `identity_narrative` 缺失时，可临时省略，不用 legacy 文本硬补

## 11.3 Fallback 2

若 assembler 本身失败：

- 仅保留 legacy `get_agent_soul()` path
- 同时记录 runtime warning / observability event

## 11.4 Forbidden Fallback

以下 fallback 禁止：

1. 直接用 raw diary 拼成 soul
2. 直接用 candidate proposal 充当 active overlay
3. 直接把 user_model 当 soul 替代品

---

## 12. Integration With Current Prompt Runtime

## 12.1 当前状态

当前代码中：

- `get_agent_soul()` 负责旧式 `<soul>` 注入
- `_get_memory_context()` 负责 Memory OS context pack

## 12.2 目标状态

完整版本里应改成：

1. `get_agent_soul()` 先尝试读取 `SoulContextAssembler`
2. 成功时返回 `<soul_runtime>...</soul_runtime>`
3. 失败时回退到 legacy `SOUL.md`
4. Memory OS context pack 中不再把 soul 当普通 memory block 混入

### 原因

Soul 是独立身份层，不应混在一般 memory_os_context 里。

---

## 13. Runtime Read Boundary

本篇冻结 soul runtime assembler 只读取：

- `active`
- 必要时少量 `warm`

默认不读取：

- `candidate`
- `invalidated`
- `purged`
- `superseded`

### 条件性读取

`archived` 仅在：

- debug
- rollback
- identity recovery

场景下允许读取。

---

## 14. Failure And Degrade Modes

## 14.1 Missing Core Soul

行为：

- fallback 到 legacy `SOUL.md`
- 记录 critical warning

## 14.2 Missing Relationship Soul

行为：

- 允许退化到 relationship summary
- 不阻塞主对话

## 14.3 Missing Identity Narrative

行为：

- runtime 继续工作
- narrative section 省略

## 14.4 Broken Active Overlay

行为：

- 回退到上一版 stable overlay
- 若无上一版，则直接省略 overlay section

## 14.5 Runtime Snapshot Write Failure

行为：

- 不阻塞主对话
- 只丢 observability，不丢核心注入

---

## 15. Suggested Implementation Boundary

建议后续新增：

```text
backend/packages/harness/nion/memory_os/
  soul_runtime.py
  soul_context_assembler.py
```

职责划分：

- `soul_runtime.py`
  - 读取对象
  - 长度裁剪
  - 冲突处理
  - section 编译
- `soul_context_assembler.py`
  - 对接 prompt runtime
  - 生成 `<soul_runtime>` block
  - 处理 fallback

---

## 16. Open Questions

1. `SoulRuntimeSnapshot` 是否在每轮对话都持久化，还是只在 debug/desktop mode 持久化。
2. `relationship_soul` 是否允许 thread-level temporary overlay。
3. `identity_narrative` 是否应该按 `user:xxx` 维护不同视角版本。
4. `critical_soul_memories` 的入选规则是完全基于 `salience`，还是要额外有人格影响分数。
5. runtime soul text 是否需要和普通 memory context 分开 token budget。

---

## 17. 本篇结论

1. 主智能体热路径必须读取编译后的 soul runtime text，而不是直接读取 raw soul artifact。
2. runtime 输入主轴固定为：`core_soul -> relationship_soul -> active_overlay -> identity_narrative -> critical_soul_memories`。
3. `soul_journal`、raw proposal、candidate 不能直接进入运行时。
4. legacy `SOUL.md` 只能作为 fallback。
5. 这篇文档为后续 `15` 的成长规则和 `16` 的治理矩阵提供了运行时边界。 
