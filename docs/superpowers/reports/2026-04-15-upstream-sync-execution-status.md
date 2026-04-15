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
| `68c9e09a` Windows shell fallback for local sandbox | `已同步` | `026f3714` | 已为 LocalSandbox 增加 Windows shell fallback，并通过定向测试验证。 |
| `75c4757f` nginx runtime DNS re-resolution | `已同步` | `ec5ad02b` | Docker nginx upstream 已增加 `zone` + `resolve` 并用 contract test 锁定。 |
| `cdb2a3a0` anchor relative paths to thread workspace in local mode | `已等价吸收` | 现有代码 | 当前 `sandbox.tools` 已有 `_apply_cwd_prefix()` 并在 `bash_tool` 中调用。 |
| `9e5ba74e` allow MCP filesystem server paths in local bash commands | `已等价吸收` | 现有代码 | 当前 `validate_local_bash_command_paths()` 已允许 `_get_mcp_allowed_paths()` 返回的 host path。 |
| `8590249d` ACP env field for subprocess injection | `已等价吸收` | 现有代码 | 当前 `ACPAgentConfig.env` 和 ACP transport env 解析/注入已覆盖 upstream 语义。 |
| `50f50d76` skill frontmatter validation tests | `已锁定` | `0c53e971` | 已新增 `test_skills_validation.py` 锁定现有 validation 行为，不扩散到 install/router 行为。 |
| `18b07941` SETUP relative links | `已同步` | `0c53e971` | `backend/docs/SETUP.md` 已修到当前真实路径。 |
| `50db51d0` frontend format scripts | `当前无安全落点` | 无 | 当前 frontend 环境里 `prettier` 未可执行，不能在未补齐 toolchain 的情况下宣称完成该脚本接入。 |
| `6bf23ba0` cross-language README links | `当前无安全落点` | 无 | NION 当前没有 upstream 多语言 README 体系，不应为了这条重新引入 DeerFlow 文档面。 |
| `9a4e8f43` better-auth README note | `明确不同步` | 无 | 当前 `frontend` 仍未启用 upstream 所述 better-auth server/session helpers，同步会制造错误文档状态。 |
| `03b144f9` replace bare print() with logging across harness | `已同步` | `2a9d6f04` | 已把 harness runtime 层 bare `print()` 收束到 logger，并用源码契约测试锁定。 |
| `ca20b486` CI action version alignment | `明确不同步` | 无 | 仅涉及 upstream lint workflow 版本升级；NION 当前 CI 结构不同，不属于业务同步面。 |
| `d22cab86` SSR-safe backend base origin resolution | `已等价吸收` | 现有代码 | `frontend/src/core/config/index.ts` 已有 `window` guard，并优先走 desktop-aware base URL。 |
| `49f2e38f` prevent SpeechRecognition instance leaks | `已同步` | `ed8b1bb0` | 已在 `PromptInputSpeechButton` 引入稳定 callback 引用并用源码契约测试锁定生命周期。 |
| `9caea026` separate mock and default LangGraph clients | `已等价吸收` | 现有代码 | `api-client.ts` 已使用 `_singleton` / `_mockSingleton` 分离 mock 与默认 client。 |
| `c2dd8937` IM channel backend URLs in Docker | `当前无安全落点` | 无 | upstream 修补依赖 backend channel service 与 `config.yaml` 通道 URL；NION 当前是 desktop-first bridge 路线。 |
| `481494b9` custom middleware injection for embedded client | `当前无安全落点` | 无 | 这条会扩张 `NionClient` 的公开 SDK surface；当前仓库没有稳定的自定义 middleware 注入合同，也没有业务主链需求。 |
| `06a623f9` create_deerflow_agent SDK entry point | `当前无安全落点` | 无 | upstream 新增整套 harness SDK factory surface；NION 当前没有对等稳定入口，不应在逐提交同步流里直接引入。 |
| `084dc7e7` formatting checks for backend and frontend | `当前无安全落点` | 无 | upstream 这条同时依赖 lint workflow、frontend format scripts 和大范围格式化；当前 `pnpm -C frontend exec prettier` 不可执行，不能安全落地。 |
| `25df82cb` style sweep and prettierignore update | `当前无安全落点` | 无 | 当前仓库没有对应 `factory.py` / `.prettierignore` 落点，且该提交主体是大范围格式化噪音。 |
| `70e9f2dd` add format step to contributing workflow | `当前无安全落点` | 无 | 当前 frontend format 命令链未闭环，先写入贡献文档会让仓库文档与真实工具链失真。 |
| `6091ba83` provider timeout/max_retries examples in config.example | `明确不同步` | 无 | `config.example.yaml` 路线已退出主链；NION 的 provider/runtime 配置由设置面与 Config Center 承担。 |
| `8b6c333a` README_zh security wording | `明确不同步` | 无 | 当前仓库没有 upstream `README_zh.md` 文档面，不应为了这条重新引入 DeerFlow 中文 README。 |
| `580920ef` Git Bash wrapper for Windows local startup | `当前无安全落点` | 无 | 当前批次没有 Windows 启动失败证据，且 NION 本地启动链已与 upstream 分叉，不应先行加入额外 wrapper。 |
| `d475de79` broken backend doc links | `已同步` | `d274e996` | 已按 NION 当前目录结构修复 TitleMiddleware 与 provisioner 文档断链，不引入 upstream demo 输出路径改写。 |
| `fc7de7ff` manual add/edit memory facts | `明确不同步` | 无 | 这条会把旧 memory facts 手工编辑产品面重新引回主链，违反当前 Memory OS / Soul 已批准边界。 |
| `5ceb19f6` Claude OAuth cache_control hardening | `已同步` | `0b7e92b9` | 已在 Claude OAuth sync/async create 路径去除 `cache_control` 标记，并用定向 provider 测试锁定。 |
| `9aa3ff7c` SandboxAuditMiddleware for bash auditing | `当前无安全落点` | 无 | 方向有价值，但这会新增一层命令审计产品/治理面；当前批次先不在缺少既有事故证据的情况下扩张 runtime middleware 合同。 |
| `c5034c03` exclude sandbox dirs from gateway hot-reload watcher | `当前无安全落点` | 无 | 需要先确认当前 `scripts/serve.sh` 真有同类误触发 reload 故障，再决定是否吸收；本轮暂不凭 upstream 标题直接改 dev 脚本。 |
| `ef58bb8d` MiniMax M2.7 highspeed config example fix | `明确不同步` | 无 | 仅涉及 `config.example.yaml` 示例字段与命名，不进入当前设置中心/Config Center 主链。 |
| `9bcdba60` deferred tool promotion after tool_search | `已同步` | `b7ee334a` | 已在 deferred registry 增加 promotion，并用回归测试锁定“工具已暴露 schema 后即可被调用”的行为。 |
| `7db95926` configurable Lark domain for Feishu channel | `已等价吸收` | 现有代码 | 当前 bridge 配置、Feishu 设置页和文案已同时支持 `feishu` / `lark` domain 选择。 |
| `34e835bc` LangGraph Platform API in Gateway | `当前无安全落点` | 无 | 这是 upstream 网关/runtime 大型重构面，NION 当前 gateway/daemon/desktop 路线已明显分叉，不能按逐提交安全同步直接吸收。 |
| `2330c382` SSR fallback in getBaseOrigin | `已等价吸收` | 现有代码 | 当前 `getBackendBaseURL/getLangGraphBaseURL` 已有 desktop-aware SSR fallback，不依赖 `window` 访问。 |
| `0f1b023a` langgraph dev worker concurrency flag in Docker | `当前无安全落点` | 无 | 当前批次不回流 upstream `langgraph dev` Docker 路线，也没有现成同类阻塞故障证据。 |
| `b21792d9` run uv sync before dev services | `当前无安全落点` | 无 | 这是针对 upstream Docker named-volume venv 漂移的修补；NION 当前不在本批次直接调整 dev compose 启动链。 |
| `4bb3c101` Docker mirrors and uv build acceleration | `明确不同步` | 无 | Docker 构建镜像源优化不属于当前业务同步面，也会引入环境特定默认值。 |
| `9e3d4848` route agent checks to gateway | `当前无安全落点` | 无 | 当前前端 agent create/check 路由已直连 `getBackendBaseURL()`，但 upstream 依赖本地 rewrite/docker 联动，需专项对照后再决定是否值得同步。 |
| `64e0f532` remove LANGSMITH_TRACING override | `明确不同步` | 无 | NION 当前生产 compose 使用 `LANGCHAIN_TRACING_V2`，并没有 upstream 所述 `LANGSMITH_TRACING` 覆盖问题。 |
| `ac9a6ee6` config.yaml mount path in docker-compose | `明确不同步` | 无 | 纯 `config.yaml` 挂载路径修补，不进入当前去 YAML 真源的同步主链。 |
| `b356a13d` improve network error message for agent name check | `已等价吸收` | 现有代码 | 当前 `AgentNameCheckError` 已区分 backend unreachable 与 request failed，并有中英文文案。 |
| `09a92097` Windows dependency check compatibility | `当前无安全落点` | 无 | 当前 `scripts/check.py` 未复现同类 Windows `stdio.reconfigure` 问题，本批次不凭标题改脚本。 |
| `c2f7be37` break circular import in view_image_tool | `已同步` | `30e46efa` | 已把 `sandbox.tools` import 下沉到函数体，并用源码契约测试锁定。 |
| `3ff15423` Windows Docker sandbox path mounting | `当前无安全落点` | 无 | 该修补落在 upstream runtime/provisioner/config paths 组合层，NION 当前仅局部吸收了 local backend mount 语法修补。 |
| `aae59a8b` surface configured sandbox mounts to agents | `当前无安全落点` | 无 | upstream 通过 prompt/runtime 注入 sandbox mounts；NION 当前未建立同构合同，不适合直接挪入。 |
| `a3bfea63` serialize concurrent exec_command in AioSandbox | `已同步` | `5f5e7242` | 已补齐 ErrorObservation 重试与 `list_dir` 安全 quoting，并用 AioSandbox 单测锁定。 |
| `6ff60f2a` forward assistant_id as agent_name in run config | `已等价吸收` | 现有代码 | `threads/service.py` 已将 `assistant_id` 归一到 `agent_name`，并有路由测试覆盖。 |
| `cf43584d` artifact content loading includes URL for non-write files | `当前无安全落点` | 无 | 当前 artifact 详情页仍以 `srcDoc` 预览为主，upstream 方案需要专项评估 iframe/src 与现有 artifact 安全策略的契合度。 |
| `3e461d9d` safe docker bind mount syntax for sandbox mounts | `已同步` | `5f5e7242` | 已为 local container backend 增加 runtime-aware mount formatter，避免 Docker 在 Windows drive-letter 路径上误解析。 |
| `52c8c06c` local dev Makefile worker concurrency flag | `当前无安全落点` | 无 | 当前仓库并未沿用 upstream `langgraph dev --n-jobs-per-worker` 本地开发主链，且未复现同类串行阻塞故障。 |
| `2f3744f8` async httpx Jina client refactor | `当前无安全落点` | 无 | 这是上游对 Jina/web_fetch 热路径的并发优化重构；NION 当前没有对应性能故障证据，不在本批次强行切 async。 |
| `c2ff59a5` merge context into configurable for langgraph-compat runs | `当前无安全落点` | 无 | NION 当前网关已不承载 upstream `thread_runs` / langgraph-compat run API 面，缺少同构落点。 |
| `68d44f67` share .deer-flow in docker-compose-dev for uploads | `明确不同步` | 无 | 纯 `.deer-flow` / docker-compose-dev 共享目录修补，不进入当前 NION `.nion` / desktop-first 主链。 |
| `e97c8c99` multiline YAML strings in SKILL.md frontmatter | `已等价吸收` | 现有代码 | 当前 `parse_and_validate_skill_frontmatter_text()` 已使用 `yaml.safe_load`，并已有 multiline frontmatter 测试覆盖。 |
| `1fb5acee` avoid 400 when client sends context with configurable | `当前无安全落点` | 无 | 该修补依赖 upstream gateway services / run config 兼容层；NION 当前无对应 router/service 主链。 |
| `0a379602` avoid treating Feishu file paths as commands | `当前无安全落点` | 无 | NION 当前仓库没有 upstream Feishu parser / channel manager 主链，无法安全局部迁入这条命令解析修补。 |
| `df5339b5` truncate oversized bash and read_file outputs | `已等价吸收` | 现有代码 | 当前 `sandbox.tools` 已具备 bash/read_file 输出截断与对应安全测试。 |
| `3a672b39` LLM call retry handling middleware | `当前无安全落点` | 无 | upstream 新增独立 LLM error middleware 与前端错误呈现路径；NION 当前尚无同构中间层，不在本批次硬迁。 |
| `2d1f90d5` optional Langfuse support | `明确不同步` | 无 | 这会引入新的 tracing provider 与依赖，不属于当前逐提交业务同步面。 |
| `f8fb8d6f` per-agent skill filter | `已等价吸收` | 现有代码 | 当前 prompt/runtime 已支持 `available_skills` / `requested_skills` 限定，不需要回流 config-file 路线。 |
| `3aab2445` bump aiohttp indirect dependency | `明确不同步` | 无 | 依赖升级不按逐提交业务同步流处理。 |
| `a2cb38f6` prevent concurrent subagent file write conflicts | `当前无安全落点` | 无 | upstream 依赖新的 file-operation lock 模块和更大范围 sandbox 写路径治理；当前批次先不扩张到跨路径文件锁体系。 |
| `f56d0b48` exclude URL paths from absolute path validation | `已等价吸收` | 现有代码 | 当前 `validate_local_bash_command_paths()` 已显式跳过 `http/https` URL 并保留 file URL 拦截。 |
| `636053fb` add noopener/noreferrer to blank-target links | `已等价吸收` | 现有代码 | 当前 artifact detail / message list item 已有 contract test 锁定关键 blank-target 链接的 `noopener noreferrer`。 |
| `8128a3bc` enable DanglingToolCallMiddleware for subagents | `已等价吸收` | 现有代码 | `build_subagent_runtime_middlewares()` 已包含 `DanglingToolCallMiddleware`，并被 subagent executor 调用。 |
| `952059eb` avoid over-segmenting CJK messages | `已同步` | `53636008` | 已为 `rehypeSplitWordsIntoSpans()` 增加 CJK 文本直通保护，并用前端 contract test 锁定。 |
| `ef711a48` sync README table of contents | `明确不同步` | 无 | 文档目录同步不属于当前 upstream 业务同步面。 |
| `76fad8b0` available_skills parameter to DeerFlowClient | `已等价吸收` | 现有代码 | NION 当前 prompt/runtime 已把 `available_skills` 与 `requested_skills` 作为显式参数贯通。 |
| `48565664` ACP mcpServers payload | `当前无安全落点` | 无 | NION ACP 已改为 remote transport seam，当前 transport 没有 upstream `new_session(mcpServers=...)` 同构合同。 |
