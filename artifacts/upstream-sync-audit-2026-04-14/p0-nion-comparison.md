# P0 NION Comparison

## 92c7a20c vs NION
- NION evidence: `backend/packages/harness/nion/sandbox/security.py`, `backend/packages/harness/nion/sandbox/tools.py`, `backend/packages/harness/nion/tools/builtins/task_tool.py`, `backend/packages/harness/nion/subagents/registry.py`
- Current state: NION already disables host bash for `LocalSandboxProvider` unless explicitly allowed, and blocks bash subagent exposure on the same policy gate.
- Initial action: `已等价吸收，无需同步`
- Residual check: compare test coverage depth with upstream security tests.

## 89183ae7 vs NION
- NION evidence: `backend/packages/harness/nion/threads/service.py`, `backend/tests/test_threads_router.py`
- Current state: NION already guards active thread runs via `_claim_thread_run()` and surfaces `ThreadBusyError` through daemon SSE.
- Initial action: `已等价吸收，无需同步`
- Residual check: confirm bridge/channel adapters do not bypass `ThreadService.stream()`.

## 6dbdd467 vs NION
- NION evidence: `backend/packages/harness/nion/client.py`, `desktop/src/main/bridge/nion-thread-client.ts`, `frontend/src/core/api/desktop-client.ts`
- Current state: NION streams SSE directly from client/daemon surfaces and has explicit `end` events in the client contract, but no same-name `MemoryStreamBridge` queue implementation or dropped-count observability layer was found.
- Initial action: `重写后同步`
- Residual check: verify whether current stream pipeline can hang if end events are lost under backpressure.

## ddfc988b vs NION
- NION evidence: `backend/packages/harness/nion/utils/file_conversion.py`, `backend/tests/test_file_conversion.py`, `backend/packages/harness/nion/config/app_config.py`
- Current state: NION already uses PyMuPDF4LLM first, falls back to MarkItDown on sparse output/failure, and offloads large conversions to a thread. Upstream's `pdf_converter` config path would conflict with Config Center truth.
- Initial action: `已等价吸收，无需同步`
- Residual check: only compare minor heuristic/test differences; do not import config-driven converter mode.

## 5ff230ea vs NION
- NION evidence: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`, `backend/packages/harness/nion/utils/file_conversion.py`, `backend/tests/test_uploads_middleware_core_logic.py`
- Current state: NION already injects outlines and preview lines into `<uploaded_files>` with file-first `read_file` guidance.
- Initial action: `已等价吸收，无需同步`
- Residual check: compare upstream truncation sentinel and line-number presentation details for possible partial sync.

## 163121d3 vs NION
- NION evidence: `backend/packages/harness/nion/utils/file_conversion.py`, `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`, `backend/tests/test_file_conversion.py`
- Current state: NION supports markdown headings and split-bold numbered headings, preview fallback, and file-first guidance, but does not obviously include upstream's later regex hardening and preview-on-empty-outline refinements.
- Initial action: `部分同步`
- Residual check: review whether `_SPLIT_BOLD_HEADING_RE` and preview fallback should absorb the non-ASCII / malformed-bold hardening only.

## 46d0c329 vs NION
- NION evidence: `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py`, `backend/packages/harness/nion/agents/middlewares/thread_data_middleware.py`
- Current state: NION uploads middleware still reads `runtime.context.thread_id` directly and does not fall back to `configurable.thread_id`, while thread-data middleware elsewhere already follows a fallback pattern.
- Initial action: `部分同步`
- Residual check: this looks like a safe, local correctness fix and should likely be pulled into a future sync batch.
