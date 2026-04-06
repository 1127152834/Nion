# Soul System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有 Memory OS 基础上落地完整 Soul System，使主智能体拥有可生效、可成长、可治理、可解释的灵魂运行时，并把成长结果和 learning / procedure / automation 闭环打通。

**Architecture:** 实施采用“先中轴、后产品面”的分阶段推进，不平行重做 Memory OS，而是增量补齐 `artifact -> runtime compilation -> reflection -> governance -> product surface` 五条主线。优先建立 canonical soul artifacts 和独立 runtime 注入，再把 soul 反思、proposal、governance 和产品交互逐步接到现有 `heartbeat / growth / automation` 体系中。

**Tech Stack:** FastAPI, Pydantic, SQLite metadata store, local artifact filesystem, existing `nion.memory_os.*`, existing lead-agent prompt runtime, React/Next.js frontend memory surfaces, pytest, node:test, Electron desktop renderer routes.

---

## 1. Scope And Delivery Strategy

本实施方案覆盖：

1. Soul artifacts 与 metadata 的正式落地
2. 主智能体 runtime soul compilation
3. soul reflection / soul journal / soul proposal pipeline
4. soul governance and rollback
5. soul product surface
6. soul 与 learning / procedure / automation 的联动

本方案明确不在本轮完成：

1. 多用户 soul partition
2. skill crystallization
3. 复杂 visual editor
4. 训练级 personalization / finetune

本轮正确目标不是“做一个 fancy 灵魂 UI”，而是：

- 让主智能体真的有可运行的 soul
- 让 soul 真能成长
- 让 soul 成长和 Memory OS 其他成长回路合成一个系统

---

## 2. File Structure Lock

## 2.1 Backend

建议新增：

- `backend/packages/harness/nion/memory_os/soul_artifacts.py`
  - canonical soul artifacts 的读写
- `backend/packages/harness/nion/memory_os/soul_runtime.py`
  - runtime soul compilation 与 section 组装
- `backend/packages/harness/nion/memory_os/soul_context_assembler.py`
  - 把 soul runtime 对接到主 prompt runtime
- `backend/packages/harness/nion/memory_os/soul_journal.py`
  - soul-level reflective journaling
- `backend/packages/harness/nion/memory_os/soul_reflection.py`
  - 从 diary / relationship / user_model / growth outputs 合成 soul journal 与 proposal
- `backend/packages/harness/nion/memory_os/soul_governance.py`
  - proposal -> overlay promotion、rollback、drift guards

建议修改：

- `backend/packages/harness/nion/memory_os/models.py`
- `backend/packages/harness/nion/memory_os/repository.py`
- `backend/packages/harness/nion/memory_os/context_assembler.py`
- `backend/packages/harness/nion/memory_os/heartbeat.py`
- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/app/gateway/routers/memory_growth.py`

建议新增测试：

- `backend/tests/test_memory_os_soul_artifacts.py`
- `backend/tests/test_memory_os_soul_runtime.py`
- `backend/tests/test_memory_os_soul_reflection.py`
- `backend/tests/test_memory_os_soul_governance.py`
- `backend/tests/test_memory_os_soul_prompt_integration.py`
- `backend/tests/test_memory_growth_router.py` 扩展 soul contract

## 2.2 Frontend

建议新增：

- `frontend/src/core/soul/`
  - `types.ts`
  - `api.ts`
  - `hooks.ts`
  - `presentation.ts`

建议新增组件：

- `frontend/src/components/workspace/memory/soul-summary-card.tsx`
- `frontend/src/components/workspace/memory/soul-proposal-list.tsx`
- `frontend/src/components/workspace/memory/soul-growth-timeline.tsx`
- `frontend/src/components/workspace/memory/soul-automation-section.tsx`

建议修改：

- `frontend/src/components/workspace/memory/memory-home-page.tsx`
- `frontend/src/components/workspace/memory/memory-growth-page.tsx`
- `frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- `frontend/src/components/workspace/automation/automation-job-list-page.tsx`
- `frontend/src/components/workspace/automation/automation-job-detail-page.tsx`
- `frontend/src/core/automation/presentation.ts`

建议新增前端合同测试：

- `frontend/src/components/workspace/memory/soul-summary-card.contract.test.ts`
- `frontend/src/components/workspace/memory/soul-proposal-list.contract.test.ts`
- `frontend/src/components/workspace/memory/soul-growth-timeline.contract.test.ts`
- `frontend/src/core/soul/presentation.test.ts`

## 2.3 Docs

建议更新：

- `docs/memory-update/README.md`
- `README.md`
- `backend/CLAUDE.md`
- `docs/test/README.md`
- `docs/test/07-automation/README.md`

---

## 3. Phase Plan

本轮建议拆成 6 个实施阶段：

1. `S0 Soul Artifact Foundation`
2. `S1 Soul Runtime Injection`
3. `S2 Soul Reflection And Proposal Pipeline`
4. `S3 Soul Governance And Rollback`
5. `S4 Soul Product Surface`
6. `S5 Soul Growth Outputs`

每一阶段都应可独立验证、可回滚。

---

## 4. Phase S0: Soul Artifact Foundation

### 目标

把 `13-soul-data-contracts.md` 里定义的核心对象落到现有 Memory OS 底层能力上。

### 主要工作

1. 扩展 `models.py`
   - 为 soul 相关 object 提供 typed helper model 或最小 typed wrapper
2. 建 `soul_artifacts.py`
   - `read_core_soul()`
   - `write_core_soul()`
   - `read_identity_narrative()`
   - `write_identity_narrative()`
   - `read_relationship_soul()`
   - `write_relationship_soul()`
   - `read_active_overlay()`
   - `write_active_overlay()`
3. 建立 artifact 路径 helper
4. repository 最小补强：
   - 支持 soul artifact 的 save/list/get pattern
5. legacy `SOUL.md` -> `core_soul` 导入 helper

### 验收标准

- 能创建唯一 `core_soul`
- 能创建/读取 narrative / overlay / relationship_soul
- `SoulRuntimeSnapshot` 仅作为 observability artifact 保存，不进入业务真相路径
- legacy `SOUL.md` 可导入为 `core_soul`

### 回滚点

- 停用 soul artifact 读写 helper
- 主智能体继续走 legacy `SOUL.md`

---

## 5. Phase S1: Soul Runtime Injection

### 目标

让主智能体热路径真正读取 compiled soul runtime，而不是旧式双轨注入。

### 主要工作

1. 建 `soul_runtime.py`
   - 输入：
     - `core_soul`
     - `relationship_soul`
     - `identity_narrative`
     - `active_overlay`
     - `critical_soul_memories`
   - 输出：
     - `<soul_runtime>` block
2. 建 `soul_context_assembler.py`
   - 负责 fallback / conflict resolution / budget trimming
3. 改 `lead_agent/prompt.py`
   - `get_agent_soul()` 优先走 soul runtime
   - legacy `SOUL.md` 仅 fallback
4. 改 `context_assembler.py`
   - 停止普通 `memory_os_context` 中的 soul section 混入
5. 可选写 `runtime snapshot`

### 验收标准

- 任意一轮对话只有一条 soul 注入路径
- 缺失部分 soul artifacts 时能平稳降级
- 不会因为 `soul_journal` / raw proposal 进入 runtime 造成噪声

### 回滚点

- 回退到旧 `get_agent_soul()` + legacy `SOUL.md`

---

## 6. Phase S2: Soul Reflection And Proposal Pipeline

### 目标

让 soul 从现有 `heartbeat / diary / relationship / user_model / growth outputs` 中真实生长出来。

### 主要工作

1. 建 `soul_journal.py`
   - 写 soul-level reflection entry
2. 建 `soul_reflection.py`
   - 读取：
     - operational diary
     - relationship
     - user_model
     - learning / procedure / automation feedback
   - 输出：
     - soul journal
     - soul proposal
     - soul memory
     - narrative draft
3. 改 `heartbeat.py`
   - 加 `soul_reflection_cycle`
4. 固化最小阈值：
   - repeated evidence >= 3
   - >= 2 个日历日
   - >= 7 天观察窗
   - 24 小时 proposal 冷却
5. 扩展 `memory_growth` contract
   - 可以列出 soul proposals / recent soul changes

### 验收标准

- heartbeat 能稳定产出 soul journal / soul proposal
- proposal 不会因为单轮对话产生
- relationship / user_model 的变化会影响 soul reflection

### 回滚点

- 停掉 `soul_reflection_cycle`
- 主 soul runtime 继续使用上一版 stable artifacts

---

## 7. Phase S3: Soul Governance And Rollback

### 目标

让 `16-soul-governance-matrix.md` 真正可执行。

### 主要工作

1. 建 `soul_governance.py`
   - proposal evaluation
   - proposal promotion
   - overlay rollback
   - drift guard
2. 给 `identity_narrative` 引入 `draft -> suggested stable` 路径
3. 明确 `relationship_soul` 只能是派生人格层
4. drift 监控指标落地：
   - proposal 频率
   - overlay 频率
   - stance 振荡
5. 写 governance trace / audit

### 验收标准

- proposal 不能直接变 active overlay
- overlay 可回滚
- drift 触发后可暂停高风险 soul growth

### 回滚点

- 停掉 promotion
- 固定使用当前 stable overlay + core soul

---

## 8. Phase S4: Soul Product Surface

### 目标

让用户看到：

- 当前的我
- 为什么会这样
- 最近如何成长
- 为什么不能直接编辑

### 主要工作

1. 新增 soul core client 层
2. 首页增加：
   - Current Soul summary
   - Recent Growth summary
3. Growth 面补：
   - soul proposal list
   - recent soul timeline
4. Automation ownership 面补：
   - soul-driven automation 来源说明
5. 保持“不做角色配置器”

### 验收标准

- 用户能看到 soul summary
- 用户能看到 proposal 的来源与影响
- 用户能理解“为什么不能直接编辑 core soul”

### 回滚点

- 隐藏 soul 卡片和 soul timeline
- 保留后端 contract 不动

---

## 9. Phase S5: Soul Growth Outputs

### 目标

让 soul growth 不只改变文本，还改变真实服务能力。

### 主要工作

1. soul -> learning mapping
2. soul -> procedure mapping
3. soul -> automation projection mapping
4. automation provenance 解释增强

### 验收标准

- soul growth 可以形成 learning topic
- soul growth 可以形成 procedure draft
- soul growth 可以形成可解释的 agent-owned automation candidate

### 回滚点

- 停掉 soul 到 learning / procedure / automation 的输出桥
- 保留 runtime soul 本体

---

## 10. API / Contract Changes

建议新增最小 soul gateway 面：

- `GET /api/memory/soul`
  - 当前 soul summary
- `GET /api/memory/soul/proposals`
  - soul proposal 列表
- `POST /api/memory/soul/proposals/{id}/accept`
  - proposal -> overlay
- `POST /api/memory/soul/proposals/{id}/reject`
  - proposal reject
- `POST /api/memory/soul/overlay/rollback`
  - rollback to previous stable overlay

注意：

- 这些不应把 raw artifact 正文默认透出
- 默认返回 product-ready summary shape

---

## 11. Test Strategy

## 11.1 Backend

必须新增或扩展：

- `test_memory_os_soul_artifacts.py`
- `test_memory_os_soul_runtime.py`
- `test_memory_os_soul_reflection.py`
- `test_memory_os_soul_governance.py`
- 扩展 `test_memory_growth_router.py`
- 扩展 `test_memory_os_prompt_integration.py`
- 扩展 `test_memory_os_heartbeat.py`

### 必测场景

1. legacy `SOUL.md` 导入
2. soul runtime 单路径注入
3. raw proposal 不进入 runtime
4. repeated evidence 阈值生效
5. overlay rollback
6. drift guard 生效

## 11.2 Frontend

必须新增：

- `soul-summary-card.contract.test.ts`
- `soul-proposal-list.contract.test.ts`
- `soul-growth-timeline.contract.test.ts`
- `core/soul/presentation.test.ts`

并回归：

- `memory-home-page.contract.test.ts`
- `memory-growth-panel.contract.test.ts`
- `automation-job-detail-page.contract.test.ts`

## 11.3 Integration

必须覆盖：

1. soul runtime 与 legacy fallback 互斥
2. proposal accept 后 overlay 生效
3. overlay rollback 后恢复上一版
4. soul-driven automation 来源解释正确

---

## 12. Rollout Order

推荐真实开发顺序：

1. S0
2. S1
3. S2
4. S3
5. S4
6. S5

不要交换顺序。

理由：

- 没有 artifacts 就没有 runtime
- 没有 runtime 就没有验证
- 没有 reflection 就没有真实 soul growth
- 没有 governance 就不能安全上产品面

---

## 13. Risks

### 风险 1：Soul 与 relationship 双重真相源

缓解：

- 强制 `relationship_soul` 为派生层

### 风险 2：双轨注入

缓解：

- soul runtime 替代普通 soul context section

### 风险 3：人格漂移

缓解：

- 阈值 + 冷却 + drift guard + rollback

### 风险 4：产品面退化为角色配置器

缓解：

- 不开放 core soul direct edit

### 风险 5：只改文本，不改能力

缓解：

- 明确 soul -> learning / procedure / automation 输出桥

---

## 14. Completion Criteria

这个实施方案完成后，必须满足：

1. 主智能体已有 canonical soul artifact
2. 主智能体已有 compiled soul runtime
3. soul growth 能从现有 Memory OS 成长体系里产生
4. soul proposal 有治理、有 rollback
5. 用户能看到当前 soul 和 recent growth
6. soul growth 能影响 learning / procedure / automation

---

## 15. Open Questions Before Execution

1. soul API 是否并入现有 `memory_growth`，还是单独出 `memory_soul`
2. `SoulRuntimeSnapshot` 是否默认落盘
3. narrative history 是否需要独立 version table
4. `relationship_soul` 是否短期只支持单用户，不做多 target variant
5. soul-driven automation 是否第一版只支持 reminder/review，不支持更激进动作

---

## 16. Final Recommendation

这套 soul system 已经不需要继续扩规格范围。

正确的下一步不是再写更多概念文档，而是：

- 以 `S0 -> S5` 六阶段逐步实现
- 每阶段都保留回滚点
- 每阶段都做 focused contract tests
- 优先让主智能体真正拥有可运行 soul，再谈更复杂的成长产品面
