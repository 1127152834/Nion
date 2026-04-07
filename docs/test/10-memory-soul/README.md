# 测试文档 10 - Memory / Soul 模块

- 文档用途：指导其他 agent 对 Memory OS + Soul System 的完整版本收口做接口测试、产品面测试、桌面端验收。
- 推荐优先级：P0。
- 推荐测试方式：接口 + contract + desktop smoke + `agent-browser`。

## 核心验收点

1. `/workspace/memory/user` 只对真实 `user_model` record 提供写操作。
2. `/workspace/memory/growth` 的 `Recent Growth` 只读取后端 `recent soul events`。
3. `identity_narrative` 与 `relationship_soul` 都有正式 artifact 路径与稳定状态。
4. `agent-owned automation` 的来源、限制、暂停/恢复链路全部可见可测。
5. legacy fallback 仅在 canonical source 缺失时生效。
6. retention lifecycle 能把长期不用的 active 记录归档，并把长期归档记录清理为 `purged`。
7. 前端 memory/soul 合同测试能通过 `pnpm test:contracts -- <test files...>` 运行。

## 最小回归集合

```bash
cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/backend && \
uv run pytest tests/test_memory_os_*.py tests/test_memory_growth_router.py tests/test_automation_router.py -q

cd /Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-memory-os-m0-contract-foundation/frontend && \
pnpm typecheck && \
pnpm test:contracts -- src/core/soul/test-runner.contract.test.ts src/core/soul/presentation.test.ts src/components/workspace/memory/soul-growth-timeline.contract.test.ts src/components/workspace/memory/memory-home-page.contract.test.ts src/components/workspace/memory/memory-user-page.contract.test.ts src/components/workspace/memory/memory-growth-panel.contract.test.ts
```
