# Architecture-Sensitive Source Review

## 模型与 provider 能力

### 0948c7a4 preserve streamed Codex output when response.completed.output is empty
- Upstream problem: Codex Responses API sometimes returns useful streamed items while `response.completed.output` is empty; provider should preserve streamed content instead of blanking the final answer.
- Upstream files: `backend/packages/harness/deerflow/models/openai_codex_provider.py`, `backend/tests/test_cli_auth_providers.py`
- Risk profile: low product-surface risk, medium runtime risk, high local value if NION still has the gap.

### 43ef3691 inject billing header for Claude OAuth models
- Upstream problem: Anthropic OAuth models require a billing header block and metadata user id for non-Haiku access.
- Upstream files: `backend/packages/harness/deerflow/models/claude_provider.py`, `backend/tests/test_claude_provider_oauth_billing.py`
- Risk profile: local provider correctness fix, candidate for partial sync if NION lacks the same billing-header injection.

### dd30e609 add vLLM provider support
- Upstream problem: missing vLLM OpenAI-compatible provider and Qwen reasoning toggle behavior.
- Upstream files: `backend/packages/harness/deerflow/models/factory.py`, `backend/packages/harness/deerflow/models/vllm_provider.py`, `backend/tests/test_model_factory.py`, `backend/tests/test_vllm_provider.py`, `config.example.yaml`
- Risk profile: high value, but config-driven upstream shape cannot be imported directly into NION's provider registry/settings-center model.

### 133ffe71 add langchain-ollama for native Ollama thinking support
- Upstream problem: optional local Ollama provider support with native thinking preservation.
- Upstream files: `backend/packages/harness/pyproject.toml`, `config.example.yaml`
- Risk profile: capability idea only; upstream implementation is too config-file-centric for direct sync.

### ac04f270 allow model override per subagent in config.yaml
- Upstream problem: per-subagent model overrides were not expressible in upstream config.
- Upstream files: `backend/packages/harness/deerflow/config/subagents_config.py`, `backend/packages/harness/deerflow/subagents/registry.py`, `backend/tests/test_subagent_timeout_config.py`, `config.example.yaml`
- Risk profile: explicit `CFG` conflict. Do not direct-sync.

## 前端交互与线程体验

### 866cf4ef prevent submit during IME composition
- Upstream problem: Enter key during IME composition could submit unfinished Chinese/Japanese/Korean input.
- Upstream files: `frontend/src/lib/ime.ts`, prompt input + recent-chat/new-agent pages.
- Risk profile: low-risk UX correctness fix.

### 24805200 / 85b7ed3c stale `new` thread id fixes
- Upstream problem: route `'new'` leaked into thread history/message queries and triggered invalid thread id requests.
- Upstream files: `frontend/src/components/workspace/chats/use-thread-chat.ts`, message list files.
- Risk profile: low-risk routing correctness fix; highly relevant if NION keeps the same `new` route semantics.

### 0eb6550c persist model selection per thread
- Upstream problem: selected model was not preserved per thread.
- Upstream files: frontend thread page + settings hooks/local storage.
- Risk profile: feature semantics overlap with NION's current settings/runtime design; needs source comparison before decision.

### 2a150f5d unblock concurrent threads and workspace hydration
- Upstream problem: thread/workspace hydration and title-generation timing regressions.
- Upstream files: backend config/title middleware, docker compose, frontend chat page, command palette, scripts.
- Risk profile: broad surface. Cannot be directly synced; only local bugfix extraction if NION has the same failure mode.

## Memory / Soul / 长时上下文

### 1c542ab7 configurable memory storage abstraction
- Upstream problem: legacy memory file storage was too rigid; upstream introduced provider abstraction + storage class config.
- Upstream files: `agents/memory/storage.py`, `agents/memory/updater.py`, `config/memory_config.py`, tests.
- Risk profile: explicit conflict with NION's approved Memory/Soul contracts and retirement path. Do not direct-sync.

### 7eb3a150 memory management actions and local filters in memory settings
- Upstream problem: memory settings lacked management actions and search/filter tooling.
- Upstream files: backend memory router, updater, client, frontend memory settings page.
- Risk profile: upstream memory product model diverges from NION's user-facing memory/soul boundary. Do not direct-sync.

### 9a557751 memory import/export
- Upstream problem: import/export support for legacy memory payloads.
- Upstream files: backend memory router/client, frontend memory API/settings page.
- Risk profile: may partially overlap with NION compatibility layer, but upstream UX/product surface is divergent.

### 0cdecf7b structured reflection + correction detection in MemoryMiddleware
- Upstream problem: enrich middleware-driven memory extraction with structured reflection/correction detection.
- Upstream files: `agents/memory/prompt.py`, `agents/memory/queue.py`, `agents/memory/updater.py`, `agents/middlewares/memory_middleware.py`, tests.
- Risk profile: `MEMORY` boundary conflict. Only inspect for algorithmic insights, not product-level sync.

### 5664b9d4 inject longTermBackground into memory prompt
- Upstream problem: `longTermBackground` persisted but was omitted from prompt injection.
- Upstream files: `agents/memory/prompt.py`, `backend/tests/test_memory_prompt_injection.py`
- Risk profile: likely already absorbed or easy partial sync if any field omission remains.

## Channel / Bridge / 第三方通道

### c4d273a6 add Discord channel integration
- Upstream problem: missing Discord channel adapter following Slack/Telegram pattern.
- Upstream files: `backend/app/channels/discord.py`, service/manager registration, tests.
- Risk profile: high because NION bridge runtime is desktop-first and not backend-channel-first.

### fa96acdf add WeChat channel integration
- Upstream problem: add backend WeChat channel with QR bootstrap and artifact handling.
- Upstream files: `backend/app/channels/wechat.py`, manager/service, tests, config examples.
- Risk profile: strong `BRIDGE` conflict with NION's desktop bridge architecture.

### 19809800 support wecom channel
- Upstream problem: add backend WeCom channel.
- Upstream files: `backend/app/channels/wecom.py`, manager/service, tests, config examples.
- Risk profile: same as WeChat/Discord: capability idea only, not direct implementation source.

### 6de9c7b4 improve Python reliability in channel retries and thread typing
- Upstream problem: smaller correctness fixes in channel retries and thread typing.
- Upstream files: `backend/app/channels/feishu.py`, `slack.py`, `telegram.py`, `routers/threads.py`, tests.
- Risk profile: promising partial-sync candidate because it looks transport-level rather than product-model level.

### 18e34878 support custom channel assistant IDs via lead_agent
- Upstream problem: custom assistant id routing for channels through `lead_agent`.
- Upstream files: `backend/app/channels/manager.py`, tests, config examples.
- Risk profile: NION already normalizes `assistant_id` into `agent_name` in `threads/service.py`; likely equivalent or partially absorbed.

## 开发 / 构建 / 跨平台工具链

### 092bf13f route Windows shell-script targets through Git Bash
- Upstream problem: Windows shell-script targets were unreliable.
- Upstream files: `Makefile`
- Risk profile: likely low-risk partial sync if NION still uses comparable scripts.

### 084dc7e7 enforce code formatting checks for backend and frontend
- Upstream problem: CI formatting checks missing.
- Upstream files: CI config only.
- Risk profile: low, but non-product. Candidate for `P2`.

### 82c3dbbc Fix Windows startup and dependency checks
- Upstream problem: Windows startup/dependency guard bugs.
- Upstream files: startup scripts and checks.
- Risk profile: low-to-medium if NION's local runtime scripts still mirror upstream enough.

### 4ceb18c6 use webpack for local frontend dev in serve.sh
- Upstream problem: frontend local dev command mismatch.
- Upstream files: `serve.sh`
- Risk profile: local dev only, but NION desktop/web scripts have diverged. Likely `P2` or skip.

## 文档 / 技能 / 社区扩展

### 8bb14fa1 add academic-paper-review, code-documentation, newsletter-generation skills
- Upstream problem: more built-in skills.
- Risk profile: low product value for current NION sync priority.

### c1366cf5 add documents site
- Upstream problem: docs site creation.
- Risk profile: not part of current sync objective.

### 5350b2fb add Exa search as community tool provider
- Upstream problem: extra community search provider.
- Risk profile: recommendation only; defer unless product strategy explicitly wants it.
