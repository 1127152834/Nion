# 测试文档总览

当前保留的业务测试文档：

- [10-memory-soul/README.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/test/10-memory-soul/README.md)
  - 记忆系统与 Soul 系统的产品边界、最小回归集合、行为验收题库。
- `file-native memory / identity / soul + orchestration`
  - 当前实现阶段的正式回归面以 `docs/superpowers/plans/2026-04-13-memory-identity-soul-file-native-and-orchestration-implementation-plan.md` 与 `.omx/plans/test-spec-memory-identity-soul-file-native-and-orchestration.md` 为准，覆盖 whole-document markdown routes、Memory 只读产品面、runtime file artifacts、以及 delegated child work products -> lead synthesis speaking contract。
- `single-main-agent custom-agent orchestration`
  - 当前实现阶段的正式回归面以 `.omx/plans/test-spec-single-main-agent-custom-agent-orchestration.md` 为准，覆盖 child run、delegation policy、LangGraph orchestration、ACP/A2A remote transport。

当前还没有独立成册、但已经有代码级验证矩阵的业务面：

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
  - 代码级入口：
    - `backend/tests/test_surface_policy_config.py`
    - `backend/tests/test_bridge_surface_policy.py`
    - `backend/tests/test_local_daemon_api.py`
    - `backend/tests/test_guardian_mode_runtime_info.py`
    - `desktop/tests/bridge-thread-client.contract.test.mjs`
    - `desktop/tests/bridge-runtime-lifecycle.contract.test.mjs`
    - `frontend/src/core/threads/desktop-client.test.ts`
    - `frontend/src/core/bridge/overview.test.ts`
    - `frontend/src/components/workspace/settings/guardian-mode-status-card.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-layout-guardian-copy.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-overview-panel.contract.test.ts`
    - `frontend/src/components/workspace/bridge/bridge-overview-actions.contract.test.ts`

维护约定：

- 当某个业务模块新增或删减测试文档时，同步更新这里。
- 当模块边界发生变化时，先更新对应模块 README，再回写这一页的索引说明。
