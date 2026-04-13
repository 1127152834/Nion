# Nion Autonomous System Operations Design

日期：2026-04-13  
状态：Draft for review  
范围：`系统自治能力 / 诊断骨架 / 自动修复策略 / 持续执行闭环`

---

## 1. 这份设计解决的不是“更聪明”，而是“更自治”

当我们说希望 Nion 拥有像 Hermes / OpenClaw 那样的自治能力时，真正想要的不是：

- 更会说
- 更会解释
- 更会问问题

而是下面这些系统级能力：

1. 出错时能先看系统状态，而不是先猜
2. 能区分“代码错误”和“配置错误”
3. 对一部分低风险非代码问题能自己修
4. 修完之后知道怎么验证
5. 中断之后能继续
6. 做完一次之后知道下次应该怎么更快定位

一句话：

> 你要的不是一个聊天更像人的 agent，而是一个能操作自己系统的 AI operator。

---

## 2. 当前 Nion 的真实能力与真实短板

### 2.1 我们已经具备的底子

这轮之前和当前重构已经让 Nion 拥有了一批很好的基础设施：

- daemon control plane
- diagnostics / incidents
- capability catalog
- capability bridge actions
- file-native context artifacts
  - `IDENTITY.md`
  - `SOUL.md`
  - `MEMORY.md`
- delegated execution
- child runs
- runtime state
- bridge / channel runtime
- notebook
- automation

所以问题不是“从零开始做自治”。

### 2.2 但我们还缺完整自治闭环

当前短板主要集中在三件事：

1. **观察层不够统一**
   - 主智能体还没有一套统一的 system self-knowledge surface
   - capability backbone 还只是方向，不是完整落地

2. **诊断层不够成体系**
   - 有 diagnostics
   - 有 incidents
   - 有 control-plane tools
   - 但没有正式的 playbook registry 和 remediation policy

3. **执行层还没完全分级**
   - 有能力做很多事
   - 但没有严格区分：
     - 自动修
     - 需确认后修
     - 禁止自动修

所以现在的 Nion 更像：

- 一个有很多工具的聪明助手

而不是：

- 一个有观察、诊断、恢复、学习闭环的自治系统

---

## 3. 核心判断

## 3.1 自治能力不是单点功能，而是 7 层闭环

真正的自治必须满足这个循环：

```text
Observe -> Model -> Decide -> Act -> Verify -> Recover -> Learn
```

如果少一环，系统都会退化成“会说话的脚本”。

### Observe
- 看到当前状态

### Model
- 理解状态意味着什么

### Decide
- 决定下一步做什么

### Act
- 真正执行动作

### Verify
- 用 fresh evidence 验证动作是否生效

### Recover
- 失败时继续、回滚、重试

### Learn
- 把经验沉淀成可复用知识

---

## 3.2 CLI 是关键，但不是最终答案

完整 CLI 的确是重要因素。

但真正决定自治能力的不是“有没有 CLI”，而是：

> 有没有一套统一的能力骨架，让 CLI、agent tools、control plane、UI、prompt 使用同一套世界模型。

也就是说：

- CLI 很重要
- 但 CLI 只是自治操作系统的一个外壳

---

## 4. Nion 自治能力的目标架构

我建议把自治系统定义成四层骨架 + 三层执行闭环。

## 4.1 四层骨架

### Layer A: Capability Backbone

解决“系统里有什么”。

对象包括：

- documents
  - `identity_document`
  - `soul_document`
  - `active_memory_document`
- automations
- models
- bridges
- skills
- notebook
- child runs
- runtime status

这层已经有设计方向，但还没完全落地。

### Layer B: Diagnostic Backbone

解决“系统现在哪里坏了”。

组成：

- diagnostics APIs
- incident records
- error taxonomy
- root-cause heuristics
- playbooks

### Layer C: Remediation Backbone

解决“可以怎么修”。

组成：

- fix action registry
- risk policy
- safe auto-fix rules
- approval-needed rules

### Layer D: Durable Execution Backbone

解决“不要半途而废”。

组成：

- Ralph / persistent execution loop
- task ledger
- completion checkpoints
- verification evidence persistence
- retry state

---

## 4.2 三层执行闭环

### 1. Read-first

当用户提到系统内对象时：

- 先读当前状态
- 再决定是否要问

例如：

- “帮我改 identity”
- “帮我新增一个定时任务”
- “现在有几个 bridge 连上了”

都不应该先泛化澄清。

### 2. Diagnose-first

当系统出错时：

- 先诊断
- 再决定是否修
- 再执行

不要直接瞎改。

### 3. Verify-always

修完后必须有 fresh evidence：

- route 恢复
- health 变 green
- typecheck / tests 通过
- config 生效

没有验证的“修复”不算修复。

---

## 5. 第一批自治对象

为了避免范围爆炸，第一批只做这些对象的自治：

### A. 文档对象

- `identity_document`
- `soul_document`
- `active_memory_document`

典型意图：

- 帮我改 identity
- 帮我重写 soul
- 看看现在的 memory.md

### B. 系统状态对象

- `model_catalog`
- `bridge_status`
- `skill_registry`
- `runtime_status`

典型意图：

- 现在有哪些模型
- 哪些桥接在线
- 当前有多少 skill
- 系统现在健康吗

### C. 自动化对象

- `automation_registry`
- `automation_create`
- `automation_update`

典型意图：

- 新增一个定时任务
- 看看现有自动化
- 改这个提醒规则

### D. Notebook 对象

- `notebook_registry`
- `notebook_create_note`

典型意图：

- 帮我写个笔记
- 把这个存到笔记里

---

## 6. 第一批自治能力

## 6.1 系统状态查询能力

这批必须优先落地：

- `get_model_catalog`
- `get_bridge_status`
- `get_skill_registry`
- `get_runtime_status`
- `list_automations`
- `read_identity_document`
- `read_soul_document`
- `read_active_memory_document`

这解决“助手先知道自己家里有什么”。

## 6.2 文档修改能力

必须支持：

- `write_identity_document`
- `write_soul_document`

暂时不开放给普通用户直接改：

- `write_active_memory_document`

因为 `MEMORY.md` 在当前设计里仍是 assistant-maintained artifact。

## 6.3 配置与状态修复能力

优先做低风险、非代码型问题：

- bridge restart / reconnect
- vector index rebuild
- provider state reset
- document/projection resync
- automation payload rewrite

## 6.4 诊断与恢复能力

必须统一成：

- diagnose
- suggest
- execute
- verify

而不是散落成一堆不相连的小工具。

---

## 7. 错误分类与自动修复策略

## 7.1 错误分类

建议先统一成下面这 5 类：

### A. Code Error

特征：

- typecheck fail
- stack trace
- test fail
- import error
- runtime exception

默认策略：

- 自动定位可以
- 自动修复需要更严格限制

### B. Config Error

特征：

- 缺字段
- 值不合法
- 签名变化
- endpoint 配错
- 模式切换后状态没同步

默认策略：

- 优先做自动修复

### C. State Desync

特征：

- 文档主档和投影不一致
- runtime 读不到应有状态
- UI 和后端状态错位

默认策略：

- 自动重同步

### D. Runtime Availability Error

特征：

- bridge offline
- daemon degraded
- model registry empty
- remote transport timeout

默认策略：

- 自动诊断
- 有些可自动修

### E. User-Risk Error

特征：

- 覆盖长期人格
- 删自动化
- 改全局配置
- 影响用户数据

默认策略：

- 必须 ask for confirmation

---

## 7.2 自动修复分级

### Level 1: 可自动修

这些是当前最值得先做的：

- 重建索引
- bridge reconnect
- provider status reset
- document/projection sync
- runtime cache refresh
- automation payload validation rewrite

### Level 2: 建议后修

- 重写 `IDENTITY.md`
- 重写 `SOUL.md`
- 更新 automation
- 变更 non-critical config

可以先给草案 / patch，再确认。

### Level 3: 禁止自动修

- 删除用户数据
- 破坏性迁移
- 覆盖 secrets
- 执行不透明 shell
- 大规模清理 automation / notebook / threads

---

## 8. Playbook Registry

自治系统必须有 playbooks，不然 agent 每次都重新发明轮子。

建议第一批 playbooks：

### System Status

- `model_catalog_empty`
- `bridge_disconnected`
- `runtime_status_degraded`

### Context Files

- `identity_document_missing`
- `soul_document_missing`
- `memory_document_missing`
- `document_projection_desynced`

### Automation

- `automation_invalid_schedule`
- `automation_creation_failed`

### Retrieval

- `vector_index_stale`
- `embedding_provider_unavailable`

### Orchestration

- `child_work_products_missing`
- `lead_synthesis_bypassed`
- `a2a_terminal_state_missing`

每个 playbook 至少要定义：

- trigger
- diagnostics
- safe fixes
- verify command
- escalation rule

---

## 9. 与当前 Nion 能力的结合方式

## 9.1 现有 control-plane tools 继续保留，但要重新分组

当前已有：

- `get_runtime_status`
- `get_capability_catalog`
- `get_capability_actions`
- incident / diagnostics tools

这些不是废掉，而是要纳入 backbone。

## 9.2 新增 document tools 作为第一批系统对象工具

我们已经开始做：

- `read_identity_document`
- `write_identity_document`
- `read_soul_document`
- `write_soul_document`

这正是自治能力的第一批雏形。

## 9.3 prompt 要新增自治规则

除了 capability backbone prompt，还要新增一个 `autonomous_operations` section。

它至少要包含：

1. 当用户询问系统状态时，优先查系统
2. 当系统报错时，优先 diagnose
3. 对 Level 1 问题可以自动修
4. 修完必须 verify

---

## 10. 实现优先级

## Phase 1: Self-Knowledge

目标：

- 助手知道系统里有哪些对象和能力

内容：

- capability backbone
- system object registry
- intent router
- document tools
- model / bridge / skill / automation query tools

## Phase 2: Self-Diagnosis

目标：

- 出错时能定位

内容：

- incident taxonomy
- playbook registry
- diagnose-first policy

## Phase 3: Safe Auto-Fix

目标：

- 自动修低风险非代码问题

内容：

- config fixes
- resync
- reconnect
- rebuild
- validate-and-rewrite

## Phase 4: Durable Autonomy

目标：

- 中断了还能继续

内容：

- Ralph loop
- persistent task ledger
- verification checkpoints

## Phase 5: Autonomic Coordination

目标：

- 多智能体自治协同

内容：

- diagnostician agent
- config-fixer agent
- bridge operator agent
- notebook/doc editor agent

但永远保持：

- 主智能体统一对外发声

---

## 11. 最终结论

Nion 要拥有 Hermes / OpenClaw 那种“知道自己会什么、出错了会自己查、能修一部分非代码错误”的能力，靠的不是继续局部修 prompt，而是要建立：

### `Autonomous System Operations`

它建立在两个前提上：

1. `System Capability Backbone`
2. `Diagnostic + Remediation + Verification Backbone`

所以正确路线不是：

- 再加几句 prompt
- 再多写几个“如果…就…”规则

而是：

1. 统一系统对象
2. 统一能力查询
3. 统一诊断语义
4. 统一自动修复分级
5. 统一验证闭环

做完这些，Nion 才会真的像一个自治系统，而不是一个知道很多工具名、但不会先查系统的聊天模型。
