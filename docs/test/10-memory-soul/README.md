# 测试文档 10 - Memory / Soul 模块

- 文档用途：指导其他 agent 对 Memory OS + Soul System 的完整版本收口做接口测试、产品面测试、桌面端验收。
- 推荐优先级：P0。
- 推荐测试方式：接口 + contract + desktop smoke + `agent-browser`。

## 核心验收点

1. `/workspace/memory` 只展示分组后的你的信息、长期背景、事实记忆，不暴露治理控制面。
2. `Settings > 身份` 与 `Settings > Soul` 必须分开，分别承载稳定身份与稳定 Soul 设置。
3. `identity_narrative` 与 `relationship_soul` 都有正式 artifact 路径与稳定状态。
4. `agent-owned automation` 的来源、限制、暂停/恢复链路全部可见可测。
5. legacy fallback 仅在 canonical source 缺失时生效。
6. retention lifecycle 能把长期不用的 active 记录归档，并把长期归档记录清理为 `purged`。
7. 前端 memory/soul 合同测试能通过 `pnpm test:contracts -- <test files...>` 运行。
8. `/api/memory/growth/*` 必须返回 404，不得再作为产品公开接口存在。

## 最小回归集合

```bash
cd backend && \
uv run pytest tests/test_memory_os_*.py tests/test_memory_router.py tests/test_memory_soul_router.py tests/test_automation_router.py -q

cd frontend && \
pnpm test:contracts -- src/core/test-runner.contract.test.ts src/components/workspace/memory/memory-home-page.contract.test.ts src/components/workspace/memory/memory-retired-client-layers.contract.test.ts src/components/workspace/settings/user-identity-panel.contract.test.ts src/components/workspace/settings/soul-settings-page.contract.test.ts src/components/workspace/settings/memory-settings-page.config.test.ts && \
node --test src/core/navigation/desktop-routes.test.ts
```

## 行为验收

- 行为级验收题库见：
  - [behavioral-acceptance-questions.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-memory-soul/behavioral-acceptance-questions.md)

- 这一组问题专门用来判断：
  - soul 是否真的进入运行时
  - user model 是否真的能回忆
  - 回答风格偏好是否真的影响后续回答
  - soul 初始化引导模式是否真的工作
