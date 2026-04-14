# Architecture-Sensitive NION Comparison

## 模型与 provider 能力

### 0948c7a4 vs NION
- NION evidence: `backend/packages/harness/nion/models/openai_codex_provider.py`, `backend/tests/test_model_factory.py`
- Current state: NION already merges streamed Codex output items back into the completed response when `response.output` is incomplete, which is the same core protection upstream added.
- Initial action: `已等价吸收，无需同步`

### 43ef3691 vs NION
- NION evidence: provider tree under `backend/packages/harness/nion/models/`
- Current state: no obvious Claude OAuth billing-header helper surfaced in quick grep output; if absent, this is a good local provider correctness candidate.
- Initial action: `部分同步`

### dd30e609 vs NION
- NION evidence: `backend/packages/harness/nion/models/vllm_provider.py`, `backend/tests/test_vllm_provider.py`, `backend/packages/harness/nion/model_management/seed.py`
- Current state: vLLM provider support and tests already exist in NION.
- Initial action: `已等价吸收，无需同步`

### 133ffe71 vs NION
- NION evidence: `backend/packages/harness/nion/model_management/seed.py` already seeds `ollama`; no matching optional dependency/config-file flow is the current source of truth.
- Current state: the capability surface exists, but upstream implementation is config-file-centric and not shaped for NION settings-center truth.
- Initial action: `重写后同步`

### ac04f270 vs NION
- NION evidence: subagent execution already honors reasoning effort and model settings through runtime code, but config truth is store-backed, not `config.yaml`.
- Current state: the capability idea is plausible, but upstream implementation is explicitly `CFG`.
- Initial action: `明确不同步`

## 前端交互与线程体验

### 866cf4ef vs NION
- NION evidence: `frontend/src/lib/ime.ts`, `frontend/src/components/ai-elements/prompt-input.tsx`, `frontend/src/app/workspace/agents/new/page.tsx`
- Current state: IME composition guard already exists in NION.
- Initial action: `已等价吸收，无需同步`

### 24805200 / 85b7ed3c vs NION
- NION evidence: `frontend/src/components/workspace/chats/use-thread-chat.ts`, `frontend/src/components/workspace/chats/use-thread-chat.contract.test.ts`
- Current state: NION already guards `threadIdFromPath === "new"`.
- Initial action: `已等价吸收，无需同步`

### 0eb6550c vs NION
- NION evidence: `frontend/src/core/settings/local.ts`, `frontend/src/app/workspace/chats/chat-thread-page.tsx`, `frontend/src/components/workspace/input-box.tsx`
- Current state: NION already carries thread-scoped model/reasoning context, but exact persistence semantics need deeper diffing before claiming equivalence.
- Initial action: `部分同步`

### 2a150f5d vs NION
- NION evidence: many touched areas now diverge substantially, including daemon/runtime and workspace hydration surfaces.
- Current state: too broad to direct-sync; only isolated bugfixes should be considered later.
- Initial action: `明确不同步`

## Memory / Soul / 长时上下文

### 1c542ab7 vs NION
- NION evidence: `backend/packages/harness/nion/agents/memory/storage.py`, `backend/packages/harness/nion/config/memory_config.py`, `backend/packages/harness/nion/compat_memory/storage.py`
- Current state: NION still carries compatibility-only file-backed storage abstraction while Memory OS is the approved mainline.
- Initial action: `明确不同步`

### 7eb3a150 vs NION
- NION evidence: current memory settings and memory user-facing routes follow approved NION Memory/Soul contracts, not upstream memory settings UX.
- Current state: product model conflict.
- Initial action: `明确不同步`

### 9a557751 vs NION
- NION evidence: `backend/packages/harness/nion/client.py`, `backend/packages/harness/nion/memory_os/compat.py`, locale strings already expose import/export actions.
- Current state: import/export capability exists through compatibility layers, but the upstream frontend/settings flow is not the right source.
- Initial action: `已部分吸收，无需直接同步`

### 0cdecf7b vs NION
- NION evidence: approved Memory/Soul specs explicitly constrain reflection/correction semantics and forbid proposal-style product reintroduction.
- Current state: high `MEMORY` conflict; only algorithmic subparts might be worth later research.
- Initial action: `明确不同步`

### 5664b9d4 vs NION
- NION evidence: `backend/tests/test_memory_prompt_injection.py`, `backend/packages/harness/nion/agents/memory/prompt.py`
- Current state: `longTermBackground` is already represented in NION prompt injection tests and code.
- Initial action: `已等价吸收，无需同步`

## Channel / Bridge / 第三方通道

### c4d273a6 / fa96acdf / 19809800 vs NION
- NION evidence: `desktop/src/main/bridge/*`, desktop bridge tests, frontend bridge settings/client, bridge incident store.
- Current state: NION's bridge runtime is desktop-first and already has Discord/Weixin-facing surfaces in the desktop layer; upstream backend-channel modules are the wrong architectural layer.
- Initial action: `重写后同步`

### 6de9c7b4 vs NION
- NION evidence: bridge adapters and telemetry exist in desktop runtime; backend `threads` route typing also exists.
- Current state: likely partial-sync candidate for retry/typing correctness ideas, but not for backend channel architecture.
- Initial action: `部分同步`

### 18e34878 vs NION
- NION evidence: `backend/packages/harness/nion/threads/service.py` already normalizes `assistant_id` into `agent_name`.
- Current state: core idea already exists in NION, though channel-layer plumbing may differ.
- Initial action: `已等价吸收，无需同步`

## 开发 / 构建 / 跨平台工具链

### 092bf13f / 82c3dbbc
- NION evidence: desktop/runtime scripts and Windows-related startup logic are already customized.
- Current state: low-risk partial-sync candidates only if they fix current script failures; otherwise defer.
- Initial action: `P2 候选，待更细 diff`

### 084dc7e7
- NION evidence: repo already has its own verification discipline.
- Current state: useful but not urgent to current sync objective.
- Initial action: `P2 候选`

### 4ceb18c6
- NION evidence: local serve/dev scripts are heavily customized.
- Current state: likely skip unless local frontend dev is currently broken in the same way.
- Initial action: `明确不同步`

## 文档 / 技能 / 社区扩展

### 8bb14fa1 / c1366cf5 / 5350b2fb
- NION evidence: no current product or architecture need justifies pulling these during upstream sync hardening.
- Current state: low-value drift.
- Initial action: `明确不同步`
