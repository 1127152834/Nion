# P0 Source Review

## 92c7a20c [Security] Address critical host-shell escape in LocalSandboxProvider
- Theme: 安全与沙箱
- Upstream files: `backend/packages/harness/deerflow/sandbox/security.py`, `backend/packages/harness/deerflow/sandbox/tools.py`, `backend/packages/harness/deerflow/tools/builtins/task_tool.py`, `backend/packages/harness/deerflow/tools/tools.py`
- Upstream problem: Local sandbox host bash default was unsafe; upstream hardened bash gating and subagent/tool exposure.
- Upstream signal: host bash disabled by default, explicit security messages, tests for local bash loading and subagent prompt security.

## 89183ae7 fix(channel): reject concurrent same-thread runs
- Theme: 线程与运行时稳定性
- Upstream files: `backend/app/channels/manager.py`, `backend/tests/test_channels.py`
- Upstream problem: concurrent same-thread runs could overlap and corrupt runtime behavior.
- Upstream signal: explicit busy detection plus tests proving a second same-thread run is rejected.

## 6dbdd467 fix: guarantee END sentinel delivery when stream bridge queue is full
- Theme: 线程与运行时稳定性
- Upstream files: `backend/packages/harness/deerflow/runtime/stream_bridge/memory.py`, `backend/tests/test_stream_bridge.py`
- Upstream problem: END sentinel could be dropped when the queue filled, causing hanging SSE subscribers and leaked resources.
- Upstream signal: queue eviction for END event, dropped counters, cleanup coverage, multi-producer tests.

## ddfc988b feat(uploads): add pymupdf4llm PDF converter with auto-fallback and async offload
- Theme: 上传与文档处理
- Upstream files: `backend/packages/harness/deerflow/utils/file_conversion.py`, `backend/packages/harness/deerflow/config/app_config.py`, `backend/tests/test_file_conversion.py`, `config.example.yaml`
- Upstream problem: PDF conversion quality and event-loop blocking were weak; fallback strategy and async offload were missing.
- Upstream signal: optional pymupdf4llm converter, sparse-output fallback to MarkItDown, config flag for converter mode, test coverage.

## 5ff230ea feat(uploads): inject document outline into agent context for converted files
- Theme: 上传与文档处理
- Upstream files: `backend/packages/harness/deerflow/agents/middlewares/uploads_middleware.py`, `backend/packages/harness/deerflow/utils/file_conversion.py`, `backend/tests/test_file_conversion.py`, `backend/tests/test_uploads_middleware_core_logic.py`
- Upstream problem: converted documents were available but not navigable; agent lacked structure hints and line-based reading prompts.
- Upstream signal: outline extraction, truncation hint, stream-based outline reads, middleware prompt rendering.

## 163121d3 fix(uploads): handle split-bold headings and ** ** artefacts in extract_outline
- Theme: 上传与文档处理
- Upstream files: `backend/packages/harness/deerflow/agents/middlewares/uploads_middleware.py`, `backend/packages/harness/deerflow/utils/file_conversion.py`, `backend/tests/test_file_conversion.py`, `backend/tests/test_uploads_middleware_core_logic.py`
- Upstream problem: PDF-derived markdown produced malformed bold heading splits that broke outline extraction and degraded uploaded-file guidance.
- Upstream signal: regex hardening, non-ASCII heading support, preview fallback when no outline exists.

## 46d0c329 fix(uploads): fall back to configurable.thread_id when runtime.context lacks thread_id
- Theme: 上传与文档处理
- Upstream files: `backend/packages/harness/deerflow/agents/middlewares/uploads_middleware.py`
- Upstream problem: uploads middleware silently skipped outline/historical-file attachment when runtime.context lacked thread_id.
- Upstream signal: same configurable-thread fallback already used by thread-data middleware applied to uploads path resolution.
