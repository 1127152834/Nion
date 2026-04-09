# Memory / Soul 分析过程记录

日期：2026-04-09

目的：
- 不是给结论背书，而是记录这轮 memory / soul 深挖是如何从代码、测试、prompt、产品面逐步收敛到 PRD 输入的。

## 分析方法

本轮分析分五条线并行推进：

1. 后端主链：Memory OS、runtime、soul runtime、growth orchestrator。
2. 后端兼容层：`memory_os.compat`、legacy router payload、兼容状态更新函数。
3. 前端产品面：workspace memory pages、settings memory surfaces、desktop route wiring。
4. prompt / runtime：compiled soul runtime、soul onboarding、runtime memory context。
5. 测试与合同：backend pytest、frontend contract tests、行为验收文档。

## 已确认的关键文件

### 后端主链

- `backend/packages/harness/nion/memory_os/growth_orchestrator.py`
- `backend/packages/harness/nion/memory_os/soul_reflection.py`
- `backend/packages/harness/nion/memory_os/soul_governance.py`
- `backend/packages/harness/nion/memory_os/soul_runtime.py`
- `backend/packages/harness/nion/memory_os/relationship_soul.py`
- `backend/packages/harness/nion/memory/runtime_engine/service.py`
- `backend/packages/harness/nion/memory/soul/service.py`
- `backend/packages/harness/nion/memory/soul/console_service.py`

### 后端兼容层

- `backend/app/gateway/routers/memory.py`
- `backend/app/gateway/routers/memory_growth.py`
- `backend/app/gateway/routers/memory_soul.py`
- `backend/packages/harness/nion/memory_os/compat.py`
- `backend/packages/harness/nion/agents/memory/updater.py`
- `backend/packages/harness/nion/agents/memory/queue.py`

### 前端产品面

- `frontend/src/components/workspace/memory/memory-home-page.tsx`
- `frontend/src/components/workspace/memory/memory-growth-panel.tsx`
- `frontend/src/components/workspace/memory/memory-user-page.tsx`
- `frontend/src/components/workspace/memory/soul-console-page.tsx`
- `frontend/src/components/workspace/memory/memory-ledger-page.tsx`
- `frontend/src/components/workspace/settings/memory-console-panel.tsx`
- `frontend/src/components/workspace/settings/memory-surface-tabs.tsx`
- `frontend/src/core/memory-growth-v2/*`
- `frontend/src/core/soul-console/*`

### Prompt / Runtime

- `backend/packages/harness/nion/agents/lead_agent/prompt.py`
- `backend/packages/harness/nion/prompt_sections/core.py`
- `backend/packages/harness/nion/tools/builtins/soul_onboarding_tool.py`

### 测试 / 文档

- `docs/test/10-memory-soul/README.md`
- `docs/test/10-memory-soul/behavioral-acceptance-questions.md`
- `backend/tests/test_memory_os_growth_orchestrator.py`
- `backend/tests/test_memory_os_soul_runtime.py`
- `backend/tests/test_memory_growth_router.py`
- `backend/tests/test_soul_onboarding_tool.py`
- `backend/tests/test_soul_onboarding_prompt.py`
- `backend/tests/test_soul_judge_service.py`
- `frontend/src/components/workspace/memory/*.contract.test.ts`

## 目前已经钉实的结论

### 1. soul 当前仍被 growth 主链牵引

- `reflect_soul_growth()` 通过 repeated needs 直接生成 soul proposal。
- `run_growth_orchestrator()` 再以 `proposal_created` 为条件继续创建 learning topic 与 automation projection。
- 这不是边缘逻辑，而是正式测试覆盖的主链。

### 2. soul 的“稳定层”与“短期层”边界不够硬

- `identity_narrative` 带 freshness 过期语义。
- `relationship_stance` 既是显式 layer，又可从 relationship records 派生。
- `adaptive_overlay` 既是短期活动层，又被开放回滚与人工改写。

### 3. 普通用户产品面承载了大量系统治理语义

- 首页显式暴露 Growth / Soul Console / Ledger / Evidence / Runtime trace。
- `User context` 页面允许修正、冻结、遗忘、拒绝。
- `Soul Console` 允许手工编辑 layer、冻结自动演化、回滚 overlay。

### 4. compatibility layer 仍然是产品主入口，而不是迁移临时桥

- `/api/memory` 仍返回 legacy memory view。
- `/api/memory/growth` 仍基于 `list_legacy_*` / `update_legacy_*`。
- 这会阻止真正按 canonical domain model 收口。

### 5. 有明确的空壳、补丁壳和未接主链代码

- `memory-growth-v2` 是 V1 转发壳。
- `MemorySurfaceTabs` 是被测试固定的空壳。
- `MemoryConsolePanel` 未接主链。
- `soul_judge` 当前未接生产代码。

### 6. contract tests 当前不仅在保留页面，还在显式锁定错误产品面

- `memory-user-page.contract.test.ts` 明确要求页面继续保留 `修正 / 冻结 / 申请遗忘 / 拒绝`。
- `memory-growth-panel.contract.test.ts` 明确要求 Growth 面继续保留 `接受 / 冻结 / 恢复 / 拒绝`。
- `soul-console-page.contract.test.ts` 明确要求 Soul Console 保留 layered surfaces、revision metadata、edit affordances、rollback、freeze auto evolution。

这意味着：

- 这些测试不是在保护“最小用户价值面”，而是在保护当前治理控制台式产品结构。
- 后续重构必须把“删错页面功能”改成“先删错合同，再改页面”。

## 补充发现

### soul onboarding 的实现问题

- `initialize_soul_profile` 是真实可用工具，但 `created_at` 使用硬编码时间 `"2026-04-08T00:00:00Z"`，这会污染 provenance 与后续 freshness/时间语义。
- prompt section 已经加入 soul onboarding 规则，说明产品意图确实存在；问题不在“有没有这能力”，而在“能力如何与现有 soul layers 正确整合”。

### runtime 注入链路已经把 soul 与 memory 一起装配

- `agents/lead_agent/prompt.py` 先通过 `MemoryOSContextAssembler.build_runtime_memory_pack()` 取得 memory pack，再通过 `compile_soul_runtime()` 注入 soul runtime。
- `memory/runtime_engine/service.py` 运行时上下文当前会同时注入 `Constitution / Relationship Stance / Identity Narrative / Hot Memories / Relevant Procedures / Scoped Recall / Verbatim Evidence`。
- 这说明运行时本身已经是“memory + soul 共同装配”，真正不合理的是产品面把这些能力拆成多个治理入口，而不是统一成用户可感知的“当前我记住了什么、当前我会怎么和你说话”。

### canonical routes 与 compatibility routes 并存，但前端主入口仍依赖 compatibility 面

- `/api/memory-canonical/{user,history,facts}` 已存在，说明后端其实已经准备了较干净的 canonical surface。
- 但首页 summary cards 和 `useMemory()` 仍走 `/api/memory` 这个 compatibility 入口。
- `memory/user` 页面虽然读取 canonical user surface，同时又叠加 growth hooks 去做治理动作，导致“只读事实面”和“治理动作面”重新混在一起。

### runtime memory 的角色问题

- `memory/runtime_engine/service.py` 会把 `constitution / relationship_stance / identity_narrative` 与 hot memories、procedures、scoped recall 一起注入 runtime。
- 这说明运行时已经把 soul 和 memory 共同装配，但产品面仍把它们拆成多个治理控制台。

## 当前开放问题

1. `relationship_stance` 最终是稳定持久层还是 runtime 投影层？
2. `adaptive_overlay` 是否还应允许普通用户直接编辑，还是只允许聊天意图触发？
3. `memory/growth` 是否应彻底转为 internal/developer surface？
4. `soul_judge` 是否保留并真正接主链，还是删掉避免双轨？
5. 现有 contract tests 哪些应保留为“重构后仍成立的产品约束”，哪些只是当前错误产品面的快照？

## 共识规划结果

- Planner 已产出：
  - `.omx/plans/prd-memory-soul-boundary-reset.md`
  - `.omx/plans/test-spec-memory-soul-boundary-reset.md`
  - `docs/reviews/2026-04-09-memory-soul-consensus-plan.md`
- Architect 结论：`ITERATE`
  - 要求补齐 strongest rejected alternative
  - 要求把 contract 重定义前置
  - 要求把 `prompt/runtime`、`soul_governance`、`relationship_soul`、导航入口一起纳入
- Critic 首轮结论：`ITERATE`
  - 要求补齐明确的 Acceptance Criteria
  - 要求把 Risks/Mitigations/rollback 写硬
  - 要求加入 `memory updater/queue`、developer gating、contract migration 清单
- 当前已根据上述 blocking issues 修订计划文档。

## 当前结论

- 这轮分析已经从“发现问题”推进到“可执行计划”。
- 当前更适合进入 `team` 执行模式，而不是直接单线改码，因为任务天然分为：
  - backend boundary/runtime lane
  - frontend IA/surface lane
  - tests/contracts/docs lane

## Fresh Verification Evidence

本轮为了满足 `critic_verification`，又补了一轮新鲜验证，而不是复用旧结果：

- 后端定向测试：
  - `backend/.venv/bin/python -m pytest backend/tests/test_memory_os_growth_orchestrator.py backend/tests/test_memory_os_soul_runtime.py backend/tests/test_memory_growth_router.py backend/tests/test_soul_judge_service.py backend/tests/test_memory_os_soul_governance.py backend/tests/test_memory_os_relationship_soul.py backend/tests/test_memory_os_soul_events.py backend/tests/test_memory_os_soul_artifacts.py backend/tests/test_soul_onboarding_tool.py backend/tests/test_soul_onboarding_prompt.py -q`
  - 结果：`58 passed in 15.62s`
- 前端 contract tests：
  - `pnpm --dir frontend test:contracts -- src/components/workspace/memory/memory-routes.contract.test.ts src/components/workspace/memory/memory-route-smoke.contract.test.ts src/components/workspace/memory/memory-user-page.contract.test.ts src/components/workspace/memory/memory-growth-panel.contract.test.ts src/components/workspace/memory/soul-console-page.contract.test.ts src/components/workspace/memory/soul-summary-card.contract.test.ts src/components/workspace/memory/soul-proposal-list.contract.test.ts src/components/workspace/memory/soul-growth-timeline.contract.test.ts src/components/workspace/settings/memory-surface-tabs.contract.test.ts`
  - 结果：`12 passed`
- 文档校验：
  - `git diff --check -- docs/reviews/2026-04-09-memory-soul-consensus-plan.md docs/reviews/2026-04-09-memory-soul-analysis-process.md`
  - 结果：通过

这组 fresh evidence 进一步证明：

1. 当前 memory/soul/growth/router/runtime 的判断不是基于回忆，而是基于当前代码和当前测试结果。
2. 现有前端 contract tests 仍在锁定旧的治理控制台式产品面，因此“先重写合同，再改页面”必须保持为前置门槛。

## 下一步

- 若进入执行，优先按共识计划的 `Phase 0 -> Phase 4` 顺序推进。
- 执行前先以共识计划为准，不再新增新的高层设想。
