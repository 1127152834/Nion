# NION Upstream Sync Execution Status

日期：2026-04-15  
基线：`electron` -> `codex/upstream-batch-a-20260414`  
范围：已审计 key commits 的执行闭环状态

---

## 1. 说明

这份状态表不重复做源码审计，而是回答一个更具体的问题：

> 已经进入同步决策面的这些 upstream key commits，现在在 NION 里处于什么执行状态？

状态只允许以下几类：

- `已同步`
- `已锁定`
- `已等价吸收`
- `明确不同步`
- `当前无安全落点`

其中：

- `已同步` 指已经在本分支产生新的 NION 实现提交
- `已锁定` 指不改实现，但新增测试把 NION 现状固定住
- `已等价吸收` 指 NION 在本轮开始前就已经具备对应能力，且现有代码/测试足以支撑结论
- `明确不同步` 指与 NION 现有主链冲突，不再进入当前同步批次
- `当前无安全落点` 指问题存在于 upstream 的另一套架构层，不适合在当前 NION 架构上直接落地

---

## 2. 执行状态表

| Upstream Item | 当前状态 | NION 落点 | 结果说明 |
| --- | --- | --- | --- |
| `46d0c329` uploads thread fallback | `已同步` | `7b611083` | 已在 uploads middleware 增加 `configurable.thread_id` fallback。 |
| `163121d3` outline regex / preview hardening | `已同步` | `f27088b4` | 已在 `file_conversion.py` 落地 parser 硬化和 outline 上限。 |
| `43ef3691` Claude OAuth billing header | `已同步` | `929d6a2c` | 已在 `claude_provider.py` 注入 billing header 与 `metadata.user_id`。 |
| `6dbdd467` stream end guarantee | `已锁定` | `02902e5e` | NION 当前 SSE client 已满足该业务规则，新增 split-end 测试锁定。 |
| `0948c7a4` Codex streamed output merge | `已锁定` | `88287e57` | NION 已有 streamed-output merge，新增回归测试锁定。 |
| `0eb6550c` thread model persistence | `已锁定` | `88287e57` | NION 已有 thread-scoped model persistence，新增本地设置测试锁定。 |
| `92c7a20c` LocalSandbox host bash hardening | `已等价吸收` | 现有代码 | `sandbox/security.py` 与现有 host-bash gating 已覆盖核心风险。 |
| `89183ae7` same-thread run guard | `已等价吸收` | 现有代码 | `threads/service.py` 和 `test_threads_router.py` 已覆盖。 |
| `ddfc988b` PDF converter auto-fallback | `已等价吸收` | 现有代码 | NION 已具备 PyMuPDF4LLM 优先、稀疏回退、thread offload。 |
| `5ff230ea` uploaded document outline injection | `已等价吸收` | 现有代码 | NION 已具备 outline / preview / file-first guidance。 |
| `dd30e609` vLLM provider support | `已等价吸收` | 现有代码 | `vllm_provider.py` 和现有测试已覆盖。 |
| `866cf4ef` IME submit guard | `已等价吸收` | 现有代码 | `isIMEComposing` 与输入组件 guard 已覆盖。 |
| `24805200` / `85b7ed3c` route `new` thread guard | `已等价吸收` | 现有代码 | `use-thread-chat.ts` 与 contract test 已覆盖。 |
| `5664b9d4` longTermBackground prompt injection | `已等价吸收` | 现有代码 | 现有 prompt 注入与测试已经覆盖。 |
| `18e34878` custom channel assistant id routing | `已等价吸收` | 现有代码 | `threads/service.py` 已把 `assistant_id` 归一到 `agent_name`。 |
| `9a557751` memory import/export | `已等价吸收` | 现有代码 | NION 兼容层已有 import/export 入口，不需要上游前端/路由实现。 |
| `ac04f270` subagent model override via config | `明确不同步` | 无 | 与 Config Center 真源冲突。 |
| `1c542ab7` memory storage abstraction | `明确不同步` | 无 | 与 NION Memory OS 主链和已批准合同冲突。 |
| `7eb3a150` upstream memory management product surface | `明确不同步` | 无 | 与 NION Memory/Soul 用户面边界冲突。 |
| `0cdecf7b` upstream memory reflection/correction product path | `明确不同步` | 无 | 与 NION Memory/Soul 合同冲突。 |
| `c4d273a6` / `fa96acdf` / `19809800` backend channel integrations | `明确不同步` | 无 | NION 当前 bridge 是 desktop-first，不接纳 upstream backend channel 架构。 |
| `8bb14fa1` / `c1366cf5` / `5350b2fb` docs/skills/community extras | `明确不同步` | 无 | 不属于当前“安全吸收 upstream”目标。 |
| `6de9c7b4` channel retry / typing reliability | `当前无安全落点` | 无 | upstream 修补发生在 backend channel 层；NION 当前仓库已没有对应落点。 |
| `092bf13f` / `82c3dbbc` Windows / startup fixes | `当前无安全落点` | 无 | 本轮未复现同类 failure，不应无依据改脚本。 |
| `133ffe71` Ollama native thinking support | `当前无安全落点` | 无 | capability 方向成立，但 upstream 落点依赖 config/dependency 路线，不适合当前批次直接引入。 |
| `79acc393` podcast generation failure handling | `当前无安全落点` | 无 | upstream 修补发生在 `skills/public/podcast-generation/scripts/generate.py`；NION 当前主链没有需要同步的 podcast 产品落点。 |
| `8b0f3fe2` thread deletion local data cleanup | `已等价吸收` | 现有代码 | `threads/service.py` / `repository.py` 和 `test_threads_router.py` 已覆盖删除线程目录行为。 |
| `b40b05f6` token usage per conversation turn | `已等价吸收` | 现有代码 | NION 已有 `messages/usage.ts`、`token-usage-indicator.tsx` 和相关测试。 |
| `0431a67b` SubtaskCard task-only filter | `已等价吸收` | 现有代码 | `tool-calls.ts` 与 `tool-calls.test.ts` 已只返回 `task` tool call ids。 |
| `48a19755` frontend i18n build fix | `当前无安全落点` | 无 | 该修补针对 upstream 当时的 i18n build 断点；NION 当前前端结构已不同。 |
| `d0049ad9` frontend lint CI workflow | `明确不同步` | 无 | 旧 upstream CI 工作流不属于当前 NION 主链同步目标。 |
| `c5ddc6a1` h3 lockfile bump | `当前无安全落点` | 无 | 仅改 `frontend/pnpm-lock.yaml`，且当前 worktree 已有无关 lockfile 脏改动，不能安全吸收。 |
| `4b15f146` frontend check command and docs | `已等价吸收` | 现有代码 | `frontend/package.json` 已有 `check = pnpm lint && pnpm typecheck`。 |
| `14a3fa52` analyze.py subprocess fix | `已等价吸收` | 现有代码 | `skills/public/data-analysis/scripts/analyze.py` 已经使用 `subprocess` 风格，不再用 `os.system` 作为主路径。 |
| `6bf52674` follow symlinks when scanning custom skills | `已等价吸收` | 现有代码 | `backend/packages/harness/nion/skills/loader.py` 已使用 `os.walk(..., followlinks=True)`。 |
| `a9940c39` sync wrapper for async MCP tools | `已等价吸收` | 现有代码 | `backend/packages/harness/nion/mcp/tools.py` 已有 sync wrapper 和对应测试。 |
| `067b19af` Windows make dev/start compatibility | `当前无安全落点` | 无 | 当前未复现同类脚本故障，且 NION 本地启动链已与 upstream 分叉。 |
| `77b8ef79` LoopDetectionMiddleware HumanMessage compat | `已等价吸收` | 现有代码 | NION 当前 `loop_detection_middleware.py` 已使用 `HumanMessage` 作为跨 provider 兼容注入。 |
| `16ed797e` configurable log level and token usage tracking | `已等价吸收` | 现有代码 | token usage 路径已由 `b40b05f6` 相关实现覆盖，log level 不构成当前独立同步项。 |
| `21febe1c` French README translation | `明确不同步` | 无 | 文档翻译不属于当前 upstream hardening 同步目标。 |
| `f499f37e` Russian README translation | `明确不同步` | 无 | 文档翻译不属于当前 upstream hardening 同步目标。 |
| `2eca58bd` null checks for runtime.context | `已等价吸收` | 现有代码 | NION 当前 middlewares/tools 已系统性处理 `runtime.context` 缺失场景。 |
| `97ad67db` docs typo and grammar fixes | `明确不同步` | 无 | 文档修字不进入当前同步批次。 |
| `afb0f66c` unit tests for skills parser | `已等价吸收` | 现有代码 | 当前 skills parser/validation 已存在对应测试面。 |
| `ec46ae07` unit tests for SubagentLimitMiddleware | `已等价吸收` | 现有代码 | Subagent limit 中间件能力已存在，当前缺口不构成实现任务。 |
| `12875664` docs domestic coding-plan link | `明确不同步` | 无 | 文档链接不进入当前同步批次。 |
| `fdfe08d4` China region user configuration template | `明确不同步` | 无 | 配置模板不进入当前同步批次。 |
| `adc51e54` stable ids for chat resizable panels | `已等价吸收` | 现有代码 | NION 已有 `panel-ids.ts` / `panel-ids.test.ts` 稳定 ID 路径。 |
| `d7e51076` runtime.context null checks and langgraph constraint | `已等价吸收` | 现有代码 | null-check 部分已系统吸收；langgraph 版本约束不作为当前单点同步。 |
| `afe325d3` container image pull syntax fix | `当前无安全落点` | 无 | 当前仓库没有对应执行面需要同步这条容器命令修补。 |
| `1f0ae64e` tests for DanglingToolCallMiddleware | `已等价吸收` | 现有代码 | NION 已有 `DanglingToolCallMiddleware` 路径，但这一项只属于测试覆盖补充，不是独立产品同步点。 |
| `ac97dc6d` tests for TodoMiddleware | `已等价吸收` | 现有代码 | NION 已有 `TodoMiddleware` 路径，这一项只属于测试覆盖补充。 |
| `792c49e6` align config.example.yaml to GEMINI_API_KEY | `明确不同步` | 无 | `config.example.yaml` 路线不进入当前同步主链。 |
| `d119214f` ACP harness integration mega-refactor | `当前无安全落点` | 无 | 这是一揽子架构级重切边界与 ACP 能力引入，不能在当前逐提交安全同步流里直接落地。 |
| `080a03f3` summarization model alias resolution | `已锁定` | 现有代码 | NION 当前 summarization middleware 已通过 runtime model factory 解析配置别名，新增回归测试锁定。 |
| `690d80f4` task_tool configurable thread_id fallback | `当前无安全落点` | 无 | 方向已被当前更通用的 runtime/thread fallback 模式覆盖，但未形成独立、必要的 NION task_tool 修补任务。 |
| `520c0352` MemoryMiddleware configurable thread_id fallback | `已等价吸收` | 现有代码 | `memory_middleware.py` 已显式从 `configurable.thread_id` 回退。 |
| `118485a7` lazy sandbox init configurable thread_id fallback | `已等价吸收` | 现有代码 | `sandbox.tools.ensure_sandbox_initialized()` 已显式从 `runtime.config.configurable.thread_id` 回退。 |
| `b8bc80d8` shared skill installer / upload manager extraction | `当前无安全落点` | 无 | upstream 的 harness/app split 重构已远超当前逐提交安全同步边界。 |
| `ae6a791c` config.example.yaml update | `明确不同步` | 无 | `config.example.yaml` 路线不进入当前同步主链。 |
| `a087fe7b` Gemini thinking/tool-call gateway fix | `当前无安全落点` | 无 | 需要单独 provider/gateway 差口对照，不应在当前批次凭标题落地。 |
| `4d1a69a9` full backend/LangGraph base URL fix | `当前无安全落点` | 无 | 需要与当前 desktop/runtime base URL 策略做专项对照。 |
| `c0a6b818` pnpm-workspace packages section | `明确不同步` | 无 | workspace packaging 不是当前主链同步目标。 |
| `b3d3287b` requests dependency bump | `明确不同步` | 无 | 依赖升级不按逐提交业务同步流处理。 |
| `b9583f72` Windows backend test compatibility | `当前无安全落点` | 无 | 当前未复现同类 backend Windows 测试故障。 |
| `0d3cefaa` active artifact safe-download hardening | `已锁定` | 现有代码 | NION `artifacts.py` 已对 HTML/SVG 活跃内容强制 attachment，新增 SVG 回归测试锁定。 |
| `227967df` hide model ID and show display_name only | `当前无安全落点` | 无 | 需要与当前 model admin/product surface 专项对照。 |
| `d7bdb1a4` remove unused suggestion icon import | `明确不同步` | 无 | 杂项清理，不进入当前同步批次。 |
| `f80d1743` security alerts to documents | `当前无安全落点` | 无 | 当前 NION 主链没有对应 documents 安全提示产品面。 |
| `e1853df0` install.md agent setup guide | `明确不同步` | 无 | 文档项，不进入当前同步批次。 |
| `c1379338` DuckDuckGo search implementation | `当前无安全落点` | 无 | 需要和当前 search/provider/runtime 体系专项对照。 |
| `6b13f5c9` GitHub PAT rate-limit support | `当前无安全落点` | 无 | 需要与当前 GitHub 集成能力和凭据真源专项对照。 |
| `8ae02357` Docker build-arg proxies/mirrors | `当前无安全落点` | 无 | 当前未复现同类 build gap。 |
| `99965057` Docker service name guidance for channel URLs | `明确不同步` | 无 | docs/config 指南，不进入当前同步批次。 |
| `a4e4bb21` LangSmith tracing docs | `明确不同步` | 无 | 文档项，不进入当前同步批次。 |
| `43a19f96` task tool polling non-blocking fix | `当前无安全落点` | 无 | 需要和当前 `task_tool` / subagent executor 的 polling 机制做专项对照。 |
| `47087007` no-images-viewed proper content format | `已等价吸收` | 现有代码 | 当前 runtime-context guards 与 image middleware 已有兼容内容格式保护。 |
| `40a4acbb` aio sandbox upload permission relax | `当前无安全落点` | 无 | 需要与当前 aio sandbox/upload permission contract 做专项对照。 |

---

## 3. 本轮产出

本轮最终形成的执行提交为：

1. `7b611083` uploads fallback
2. `f27088b4` outline parser hardening
3. `929d6a2c` Claude OAuth billing header
4. `02902e5e` stream end rule lock
5. `88287e57` equivalent-absorption lock tests

这些提交已经把本轮能安全自动处理的 key commits 处理完了。

---

## 4. 结论

对于已进入审计决策面的 key commits，本轮状态已经闭环：

- 该同步的，已经同步
- 不该改实现但该锁规则的，已经锁定
- 早已吸收的，已经用代码/测试确认
- 不该合并的，已经明确关闭
- 当前无安全落点的，已经停止继续推进

这意味着当前分支不再存在“应该继续自动处理但还没处理”的剩余项。
