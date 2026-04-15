# 测试文档总览

当前保留的业务测试文档：

- [10-memory-soul/README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-memory-soul/README.md)
  - 记忆系统与 Soul 系统的产品边界、最小回归集合、行为验收题库。
- `file-native memory / identity / soul + orchestration`
  - 当前实现阶段的正式回归面以 `docs/superpowers/plans/2026-04-13-memory-identity-soul-file-native-and-orchestration-implementation-plan.md` 与 `.omx/plans/test-spec-memory-identity-soul-file-native-and-orchestration.md` 为准，覆盖 whole-document markdown routes、Memory 只读产品面、runtime file artifacts、以及 delegated child work products -> lead synthesis speaking contract。
- `single-main-agent custom-agent orchestration`
  - 当前实现阶段的正式回归面以 `.omx/plans/test-spec-single-main-agent-custom-agent-orchestration.md` 为准，覆盖 child run、delegation policy、LangGraph orchestration、ACP/A2A remote transport。

当前还没有独立成册、但已经有代码级验证矩阵的业务面：

- retrieval models center（当前尚未独立成册）
  - backend:
    - `backend/tests/test_retrieval_models_settings_repository.py`
    - `backend/tests/test_retrieval_models_status_service.py`
    - `backend/tests/test_retrieval_models_router.py`
    - `backend/tests/test_memory_settings_router.py`
  - frontend:
    - `frontend/src/core/retrieval-models/api.test.ts`
    - `frontend/src/components/workspace/settings/models-section.navigation.test.ts`
    - `frontend/src/components/workspace/settings/retrieval-models-section.contract.test.ts`
    - `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts`
    - `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
    - `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
    - `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
  - 说明：
    - 检索模型能力 owner 已迁入 `Settings > 检索模型`
    - 页面已恢复 `本地模型 / API` 双模式骨架
    - desktop preload / IPC 已暴露 retrieval model manager 合同
    - 本地模式当前支持下载/导入/选择/探测；当 `ONNX + tokenizer + config` 资产完整时，Memory 本地语义索引执行可用
    - `Settings > 记忆` 只保留状态投影
    - `Knowledge Base` 已接入 retrieval consumer 提示
- custom-agent orchestration
  - backend: child-run repository / router / delegation policy / mention parser / orchestrator graph / delegated thread routing
  - frontend: dedicated sidebar child-run panel / child-run inspector contract / main-thread delegation summary / recent-chat two-tab taxonomy / input-box `@` notebook-agent tabs
- guardian mode / unified remote entry（当前尚未独立成册）
  - backend:
    - `/api/daemon/runtime-info` 需要同时覆盖旧字段兼容和 `guardian_mode` / `bridge_runtime` 新摘要合同
    - `bridge` surface policy fallback 到 `channel`
    - bridge 触发的 `/stream` 需要把 `execution_mode` / `host_workdir` 带入 runtime 主链
  - desktop / frontend:
    - `Settings > Daemon` 需要显示 guardian-mode 状态卡，且状态来自真实 runtime 信息而不是纯配置值
    - guardian runtime helper 需要覆盖 bridge-only fallback、daemon override、daemon failure fallback、invalid status -> offline
    - `/workspace/bridge` 需要保持平台 tabs 不变，同时以“统一远程入口” framing 页面级文案
    - slice 2 额外要求：
      - desktop IPC 需要暴露 `bridge:get-runtime-info` 统一 snapshot
      - frontend bridge client 需要暴露 `BridgeRuntimeInfo` / `getRuntimeInfo()`
      - bridge overview panel 需要显示运行态、活跃绑定、待处理事件、启用渠道与风险提示
      - overview actions 需要只停留在 diagnose / restart 两个 overview-level affordance
    - slice 3 额外要求：
      - `guardian-runtime.ts` 需要成为 guardian / bridge runtime merge 与 fallback 的唯一 owner
      - `use-guardian-runtime.ts` 需要成为共享 refresh owner（mount / focus / visibility / manual）
      - `Settings > Daemon` 与 `/workspace/bridge` 后续都应消费 shared runtime hook，而不是页面本地 runtime loader
  - 代码级入口：
    - `backend/tests/test_surface_policy_config.py`
    - `backend/tests/test_bridge_surface_policy.py`
    - `backend/tests/test_local_daemon_api.py`
    - `backend/tests/test_guardian_mode_runtime_info.py`
    - `desktop/tests/bridge-thread-client.contract.test.mjs`
    - `desktop/tests/bridge-runtime-lifecycle.contract.test.mjs`
    - `frontend/src/core/threads/desktop-client.test.ts`
    - `frontend/src/core/bridge/overview.test.ts`
    - `frontend/src/core/runtime/guardian-runtime.test.ts`
    - `frontend/src/core/runtime/use-guardian-runtime.contract.test.ts`
    - `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts`
- controlled local actions（当前尚未独立成册）
  - backend:
    - `backend/tests/test_local_actions_repository.py`
    - `backend/tests/test_local_actions_config_contract.py`
    - `backend/tests/test_local_actions_policy.py`
    - `backend/tests/test_local_actions_service.py`
    - `backend/tests/test_local_actions_router.py`
    - `backend/tests/test_thread_permission_router.py`
  - desktop:
    - `desktop/tests/local-actions-ipc.contract.test.mjs`
    - `desktop/tests/local-actions-executor.contract.test.mjs`
    - `desktop/tests/nion-thread-client-behavior.test.mjs`
    - `desktop/tests/bridge-manager-behavior.test.mjs`
  - 说明：
    - `daemon.local_actions_permission_mode` 是全局三档权限来源
    - `/api/local-actions/plan` 只负责目标、动作计划和执行审计记录
    - desktop main 的 local-actions executor 当前已支持首批白名单动作与本地历史，但仍不是任意 OS 控制器
    - 本机动作审批和通用工具审批现在共用 thread approval 主线，并以 `approval_kind` 分型

维护约定：

- 当某个业务模块新增或删减测试文档时，同步更新这里。
- 当模块边界发生变化时，先更新对应模块 README，再回写这一页的索引说明。
