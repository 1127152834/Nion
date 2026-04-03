# Memory OS Implementation Plan

## 1. Purpose

这份文档是 Memory OS 实施前置规格包的最后一篇。

它的作用是：

- 基于 `00-08` 的冻结规格，输出正式实施方案
- 定义实施阶段、模块边界、验收标准、测试与回滚点

## 2. Inputs

本篇依赖：

- [00-memory-os-scope-and-principles.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/00-memory-os-scope-and-principles.md)
- [01-memory-os-domain-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/01-memory-os-domain-model.md)
- [02-memory-os-business-rules.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/02-memory-os-business-rules.md)
- [03-memory-os-data-contracts.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/03-memory-os-data-contracts.md)
- [04-memory-os-runtime-flows.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/04-memory-os-runtime-flows.md)
- [05-memory-os-governance-and-permissions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/05-memory-os-governance-and-permissions.md)
- [06-memory-os-interaction-model.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/06-memory-os-interaction-model.md)
- [07-memory-os-migration-and-compatibility.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/07-memory-os-migration-and-compatibility.md)
- [08-memory-os-observability-and-risk.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/memory-update/08-memory-os-observability-and-risk.md)

## 3. 总判断

Memory OS 的正确实施方式不是“大版本一次性替换”，而是：

**以 runtime contract 为中轴、以兼容桥接为手段、以渐进式切换为节奏的分阶段演进。**

从 Claude Code operating model 的视角看，最值得先落的是：

- 中轴 contract
- runtime governance
- event / lifecycle plane

而不是先做一堆产品壳或 fancy growth 表层。

## 4. 实施阶段总览

实施分 6 个阶段：

1. `M0 Contract Foundation`
2. `M1 Memory OS Substrate`
3. `M2 Context Assembly Cutover`
4. `M3 Heartbeat And Self-Maintenance`
5. `M4 Growth And Governance Surfaces`
6. `M5 Agent-Owned Automation`

## 5. 阶段细节

## 5.1 M0 Contract Foundation

### 目标

- 把 Memory OS 变成代码中的正式 contract

### 主要工作

1. 定义 domain / owner / scope / lifecycle 枚举
2. 定义 `MemoryRecord` / `CandidateRecord` / `Artifact` / `AccessLog` / `ConsolidationEvent`
3. 定义新的 `Paths` 扩展
4. 建立 Memory OS 模块骨架

### 模块边界

建议新增：

- `backend/packages/harness/nion/memory_os/`
  - `contracts.py`
  - `models.py`
  - `paths.py`
  - `storage.py`
  - `artifacts.py`

### 验收标准

- 可以创建、读取空的 metadata store
- 所有枚举与对象模型在代码中落地
- 不影响现有聊天主链

### 回滚点

- 新模块可整体停用，不影响 legacy memory/recall

## 5.2 M1 Memory OS Substrate

### 目标

- 建立 metadata / artifact / bridge 的底座

### 主要工作

1. SQLite metadata store
2. artifact store
3. evidence link / access log / consolidation event stores
4. legacy import tool for `memory.json`
5. automation projection bridge model

### 模块边界

新增：

- `memory_os/repository.py`
- `memory_os/import_legacy.py`
- `memory_os/access_log.py`
- `memory_os/projections.py`

### 验收标准

- 能导入 legacy `memory.json`
- 能写入 artifact index
- 能记录 provenance/access logs

### 回滚点

- 新底座停用时，旧 `memory.json` 和 recall 仍可独立运行

## 5.3 M2 Context Assembly Cutover

### 目标

- 用 Memory OS context pack 替代直接 `memory.json` prompt injection

### 主要工作

1. 新建 context assembly service
2. 读取：
   - user_model
   - relationship
   - procedure
   - recall
   - knowledge projection
3. prompt runtime 接入新的 context pack
4. 保留 legacy fallback

### 模块边界

需要改：

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

建议新增：

- `memory_os/context_pack.py`
- `memory_os/context_assembler.py`

### 验收标准

- 聊天主链能在无 `memory.json` 注入时继续工作
- recall / notebook retrieval / stable user model 能统一组装
- legacy fallback 可切回

### 回滚点

- 切回旧 memory injection path

## 5.4 M3 Heartbeat And Self-Maintenance

### 目标

- 引入 daemon-owned heartbeat 和异步维护能力

### 主要工作

1. candidate queue
2. post-turn extraction bridge
3. daemon-owned heartbeat service
4. diary writer
5. consolidation engine
6. stale/archive sweep

### 模块边界

建议新增：

- `memory_os/candidates.py`
- `memory_os/extractor.py`
- `memory_os/consolidation.py`
- `memory_os/heartbeat.py`
- `memory_os/diary.py`

### 验收标准

- turn 后能稳定产生 candidate
- heartbeat 可按 cadence 执行
- consolidation 不阻塞聊天主链

### 回滚点

- 停掉 heartbeat，主链仍正常

## 5.5 M4 Growth And Governance Surfaces

### 目标

- 让 learning / procedure / soul proposal / user controls 成为真正产品面

### 主要工作

1. learning planner
2. procedure crystallization
3. soul proposal pipeline
4. user controls:
   - correct
   - freeze
   - forget request
   - accept/reject proposal
   - pause/resume growth topic

### 模块边界

后端新增：

- `memory_os/learning.py`
- `memory_os/procedures.py`
- `memory_os/soul.py`
- `memory_os/governance.py`

前端新增/改造：

- Memory / Agent Growth routes
- proposal cards
- user model correction/freeze flows

### 验收标准

- 用户能看见高价值长期理解
- 用户能控制高风险成长行为
- soul overlay 不会自动生效

### 回滚点

- growth surfaces 可隐藏
- proposal pipeline 可停用

## 5.6 M5 Agent-Owned Automation

### 目标

- 把 Memory OS 与现有 automation runtime 真正接起来

### 主要工作

1. 扩展 `AutomationJob` 字段
2. 建立 automation projection bridge
3. 区分 user-owned / agent-owned automation UI
4. 建立 agent-owned job governance rules

### 模块边界

需要改：

- `backend/packages/harness/nion/automation/models.py`
- `backend/packages/harness/nion/automation/service.py`
- `backend/app/gateway/routers/automation.py`
- `frontend/src/core/automation/types.ts`
- automation 前端相关组件

### 验收标准

- user-owned / agent-owned jobs 前台清晰分离
- agent-owned jobs 支持 pause/resume，但不能直接编辑
- automation runtime 本体不被重做

### 回滚点

- 新增治理字段可只读忽略
- jobs 继续按 legacy automation path 运转

## 6. 先做什么，不先做什么

## 6.1 首批 P0

最先做的必须是：

1. M0 Contract Foundation
2. M1 Memory OS Substrate
3. M2 Context Assembly Cutover 的兼容骨架

## 6.2 明确先不要做

下面这些不应先做：

1. fancy growth UI
2. 全盘 graph database
3. 多租户 memory provider shell
4. 自动生效 soul evolution
5. 高风险 agent-owned automation

## 7. 测试策略

## 7.1 Contract Tests

覆盖：

- domain / owner / lifecycle enums
- data contract serialization
- import mapping

## 7.2 Runtime Tests

覆盖：

- hot path context assembly
- candidate enqueue
- heartbeat execution
- consolidation decisions

## 7.3 Governance Tests

覆盖：

- AUTO / SUGGEST / CONFIRM / FORBID
- soul proposal approval
- automation ownership mutation limits

## 7.4 Migration Tests

覆盖：

- import from legacy `memory.json`
- fallback to legacy prompt injection
- recall / projection bridge continuity

## 7.5 Frontend Contract Tests

覆盖：

- user model visibility
- proposal accept/reject
- agent-owned automation controls

## 8. 验收标准总表

| 里程碑 | 验收标准 |
|---|---|
| M0 | 新 contract 已落代码，且不影响现有主链 |
| M1 | legacy data 可导入，metadata/artifact/provenance 可写 |
| M2 | 新 context pack 可替代 legacy memory injection，且可回滚 |
| M3 | heartbeat / diary / consolidation 可运行且不阻塞主链 |
| M4 | 用户能看见并控制成长系统的关键结果 |
| M5 | user-owned / agent-owned automation 前台与治理都闭环 |

## 9. 风险清单

## 9.1 最大风险

1. 在 LangGraph 之上平行重做状态层
2. 让 heartbeat 侵入主聊天路径
3. 让 growth features 先于 governance 落地
4. 让 Notebook 再次和 Memory 混起来
5. 让 agent-owned automation 在没有风险分级时上线

## 9.2 降低风险的方法

1. 所有新能力都经过 contract first
2. 所有主链切换都有 fallback
3. 所有自治能力先 proposal 后生效
4. observability 和 backpressure 不是后补项

## 10. 与 Claude Code operating model 的对应

从 Claude Code operating model 的角度看，这套实施顺序是合理的，因为它遵守了：

1. 先中轴 contract，再表层能力
2. 先 runtime governance，再扩展面
3. 不平行重做 LangGraph 已承担的部分
4. 不把 Memory OS 做成 prompt 文案工程

换句话说，这套实施方案抄的是 operating discipline，不是产品壳。

## 11. Rules / Contracts

本篇冻结以下硬规则：

1. Memory OS 必须按里程碑渐进落地。
2. M0-M2 先于任何 growth UI 扩展。
3. governance 和 observability 必须先于高自治能力上线。
4. 所有 cutover 都必须有 fallback。

## 12. Open Questions

本篇尚未冻结的问题：

1. 每个里程碑拆成几个 PR 最合理
2. 是否需要先做一个只读版 Agent Growth 页面作为过渡
3. `relationship` 的 UI 是否在 M4 第一批就做，还是和 user model 同步渐进

## 13. 结论

到这一篇为止，Memory OS 的规格包已经闭环。

接下来如果要进入真实开发，就不该再回到大而泛的架构讨论，而应该以这组规格为准，拆成可执行的开发计划和迭代任务。
