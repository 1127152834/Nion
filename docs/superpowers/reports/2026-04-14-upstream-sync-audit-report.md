# NION Upstream Sync Audit Report

日期：2026-04-14  
基线：`electron` vs `upstream/main`  
状态：Draft audit report

---

## 1. 执行摘要

本报告只做源码级同步审计，不执行 merge、cherry-pick 或产品代码同步。

当前基线为：

- `electron`: `c554dd519905d1ed173c3cc73e259056a7e8abcb`
- `origin/electron`: `0ccaf0e30404e22f2ae9493eb5762f7d5090ea7f`
- `upstream/main`: `4ba3167f48b212605203c35cb5883e5520e53fa6`
- merge-base: `3be1d841aa0713230c29c2edb2ab69ef724a27af`

审计快照显示：

- `electron...upstream/main`: 本地 `1027`，上游 `253`
- 上游未进入 `electron` 的非 merge 提交：`253`
- 上游 endpoint diff 文件：`1880`
- NION divergent endpoint 文件：`1884`
- 重叠文件：`1785`

这意味着 NION 与 upstream 已经是“同仓库但不同产品主链”的关系，不能按 git 时间线机械拉取。

当前第一轮结论：

- `P0`
  - `线程与运行时稳定性`
  - `上传与文档处理`
- `P1`
  - `安全与沙箱`
  - `模型与 provider 能力`
  - `前端交互与线程体验`
- `P2`
  - `Channel / Bridge / 第三方通道`
  - `开发 / 构建 / 跨平台工具链`
- `P3`
  - `Memory / Soul / 长时上下文`
  - `文档 / 技能 / 社区扩展`

当前最值得优先同步研究的是：

1. 上传链 `thread_id` fallback 和 outline regex 局部硬化
2. stream `end` 终止保障在 NION 现有 streaming 架构中的等价防护
3. Claude OAuth billing header / Codex streamed output 这类 provider 局部正确性修复

本审计阶段没有执行任何 upstream merge 或 cherry-pick。

## 2. 主题总表

| 主题 | 上游改动摘要 | 提交数 | 关键 commit | 业务价值 | 影响范围 | 适配难度 | 架构冲突标记 | 建议动作 | 优先级 | 结论理由 |
| --- | --- | ---: | --- | --- | --- | --- | --- | --- | --- | --- |
| 安全与沙箱 | Local sandbox host bash 安全门禁、路径约束与命令审计强化 | 1 | `92c7a20c` | S | H | 2 | DESKTOP | 已等价吸收，无需同步 | P1 | NION 已有 host bash gating 与 subagent/tool 禁止逻辑，当前重点只剩测试覆盖差口核对。 |
| 线程与运行时稳定性 | 同线程并发 run 守卫与 SSE 终止正确性 | 2 | `89183ae7`, `6dbdd467` | S | H | 2-3 | DESKTOP | 已等价吸收 / 重写后同步 | P0 | 并发 run 拒绝已在 NION 主链化；END sentinel 保障属于不同 streaming 架构，需要按 NION 流水线重写验证。 |
| 上传与文档处理 | PDF 转换回退、outline 注入、thread_id fallback、heading regex 硬化 | 4 | `ddfc988b`, `5ff230ea`, `163121d3`, `46d0c329` | S | M | 2-3 | CFG | 已等价吸收 / 部分同步 | P0 | 转换与 outline 主链大体已吸收，但 `thread_id` fallback 与部分 regex/preview 硬化仍值得局部提取。 |
| 模型与 provider 能力 | Codex streamed-output、Claude OAuth billing、vLLM/Ollama、subagent model override | 5 | `0948c7a4`, `43ef3691`, `dd30e609`, `133ffe71`, `ac04f270` | A | H | 2-4 | CFG | 已等价吸收 / 部分同步 / 明确不同步 | P1 | vLLM 与 Codex streamed-output 已有；Claude provider 修复值得局部核对；Ollama/subagent override 不能按 `config.yaml` 路线直接拉。 |
| 前端交互与线程体验 | IME、防 `new` thread id、线程模型选择、本地 hydration | 5 | `866cf4ef`, `24805200`, `85b7ed3c`, `0eb6550c`, `2a150f5d` | A | M-H | 1-3 | DESKTOP | 已等价吸收 / 部分同步 / 明确不同步 | P1 | IME 和 `new` thread guard 已吸收；线程模型选择可局部比对；大范围 hydration/config 改动不能直拉。 |
| Memory / Soul / 长时上下文 | memory storage、management、import/export、reflection/correction、longTermBackground | 5 | `1c542ab7`, `7eb3a150`, `9a557751`, `0cdecf7b`, `5664b9d4` | A | H | 3-4 | MEMORY | 已等价吸收 / 明确不同步 | P3 | upstream memory 产品模型与 NION 已批准 Memory/Soul 合同冲突；只保留已吸收字段修复和兼容层参考。 |
| Channel / Bridge / 第三方通道 | Discord/WeChat/WeCom backend channels、channel retry/typing、assistant id routing | 5 | `c4d273a6`, `fa96acdf`, `19809800`, `6de9c7b4`, `18e34878` | B | H | 3-4 | BRIDGE, DESKTOP | 重写后同步 / 部分同步 / 已等价吸收 | P2 | NION 是 desktop-first bridge runtime，不能直拉 upstream backend channels；只抽 transport-level reliability 或已等价 agent routing。 |
| 开发 / 构建 / 跨平台工具链 | Windows/Git Bash、format CI、startup/dependency checks、serve.sh | 4 | `092bf13f`, `084dc7e7`, `82c3dbbc`, `4ceb18c6` | B | L-M | 1-3 | DESKTOP | 部分同步 / 明确不同步 | P2 | 对现有业务低风险，但 NION 桌面脚本已重构；只在当前验证链有同类失败时吸收。 |
| 文档 / 技能 / 社区扩展 | docs site、新 skills、Exa community provider | 3 | `8bb14fa1`, `c1366cf5`, `5350b2fb` | C | L | 1-2 | BRAND | 明确不同步 | P3 | 与本轮“安全追上游且不破坏主链”目标无关，可作为产品 backlog 而非 upstream sync 批次。 |

## 3. Commit 明细附表

| commit | 标题 | 涉及模块/文件 | 上游解决了什么问题 | NION 当前状态 | 是否已等价吸收 | 建议动作 | 风险点 | 证据 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `92c7a20c` | [Security] Address critical host-shell escape in LocalSandboxProvider | `sandbox/security.py`, `sandbox/tools.py`, `task_tool.py` | 禁止 LocalSandbox 默认暴露 host bash 与 bash subagent | NION 已有本地 sandbox host-bash gating 与同类错误消息 | 是 | 已等价吸收，无需同步 | 需要补比对测试覆盖深度 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/sandbox/security.py` |
| `89183ae7` | reject concurrent same-thread runs | `channels/manager.py`, `test_channels.py` | 防止同线程并发 run 互相踩踏 | NION 在 `threads/service.py` 已有 `_claim_thread_run()` 与 `ThreadBusyError` | 是 | 已等价吸收，无需同步 | bridge 适配层是否绕过线程服务 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/threads/service.py` |
| `6dbdd467` | guarantee END sentinel delivery when stream bridge queue is full | `runtime/stream_bridge/memory.py`, `test_stream_bridge.py` | 队列满时保证 END 事件送达，避免 SSE 永久挂起 | NION 未发现同名 stream bridge 队列层，但客户端契约要求 `end` 事件 | 否 | 重写后同步 | desktop/daemon streaming 架构不同，不能直接搬 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/client.py`; `desktop/src/main/bridge/nion-thread-client.ts` |
| `ddfc988b` | add pymupdf4llm PDF converter with auto-fallback and async offload | `utils/file_conversion.py`, `config/app_config.py`, `test_file_conversion.py` | 提升 PDF 转换质量并避免阻塞事件循环 | NION 已有 PyMuPDF4LLM 优先、稀疏回退、线程离线执行 | 是 | 已等价吸收，无需同步 | upstream 的 `pdf_converter` 配置会引入 CFG 冲突 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/utils/file_conversion.py` |
| `5ff230ea` | inject document outline into agent context for converted files | `uploads_middleware.py`, `file_conversion.py` | 把文档 outline/line hints 注入上传上下文 | NION 已有 outline、preview、file-first `read_file` 指导 | 是 | 已等价吸收，无需同步 | 可比较 truncation sentinel 细节 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py` |
| `163121d3` | handle split-bold headings and `** **` artefacts in extract_outline | `uploads_middleware.py`, `file_conversion.py` | 硬化 PDF 导出 markdown 的标题抽取与空 outline fallback | NION 已有 split-bold outline 基础，但 regex/preview 细化不完全一致 | 否 | 部分同步 | 只抽 regex/preview 硬化，不引入上游产品提示语义 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/utils/file_conversion.py` |
| `46d0c329` | uploads fallback to configurable.thread_id | `uploads_middleware.py` | runtime.context 无 thread_id 时仍能解析 uploads 目录 | NION uploads middleware 仍直接读 `runtime.context.thread_id` | 否 | 部分同步 | 局部 correctness fix，低风险可吸收 | `p0-source-review.md`; `p0-nion-comparison.md`; `backend/packages/harness/nion/agents/middlewares/uploads_middleware.py` |
| `0948c7a4` | preserve streamed Codex output when completed output is empty | `openai_codex_provider.py` | Codex streamed output 可能被空 completed output 覆盖 | NION 已在 `openai_codex_provider.py` 合并 streamed output 回 completed response | 是 | 已等价吸收，无需同步 | 仅需保留测试覆盖核对 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `backend/packages/harness/nion/models/openai_codex_provider.py` |
| `43ef3691` | inject billing header for Claude OAuth models | `claude_provider.py` | Claude OAuth 非 Haiku 模型需要 billing header 与 metadata | NION quick grep 未见同类 billing helper | 否 | 部分同步 | provider 局部修复，但需按 NION provider stack 落地 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `dd30e609` | add vLLM provider support | `models/vllm_provider.py`, `test_vllm_provider.py` | 增加 vLLM provider 与 Qwen thinking toggle | NION 已有 `nion/models/vllm_provider.py` 和测试 | 是 | 已等价吸收，无需同步 | 只比较测试覆盖差口 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `backend/packages/harness/nion/models/vllm_provider.py` |
| `ac04f270` | allow model override per subagent in config.yaml | `subagents_config.py`, `registry.py` | 每个 subagent 可覆盖模型 | NION 不能恢复 `config.yaml`，运行时/设置中心是当前真源 | 否 | 明确不同步 | CFG 冲突 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `866cf4ef` | prevent submit during IME composition | `frontend/src/lib/ime.ts` | IME 组合输入期间 Enter 误提交 | NION 已有 `frontend/src/lib/ime.ts` 和输入控件 guard | 是 | 已等价吸收，无需同步 | 无 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `24805200` / `85b7ed3c` | avoid route `new` as thread id | chat hooks/message list | 防止 `/chats/new` 作为真实 thread id 调历史接口 | NION 已有 `threadIdFromPath === "new"` guard 和 contract test | 是 | 已等价吸收，无需同步 | 无 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `use-thread-chat.contract.test.ts` |
| `0eb6550c` | persist model selection per thread | frontend settings/local hooks | 每线程模型选择持久化 | NION 已有 thread-scoped model/reasoning context，但持久化语义需核对 | 未确认 | 部分同步 | 可能与 Config Center/desktop runtime 状态冲突 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `1c542ab7` | configurable memory storage abstraction | memory storage/updater/config | upstream legacy memory storage provider 化 | NION Memory OS 是主线，file-backed storage 是兼容层 | 否 | 明确不同步 | MEMORY 冲突 | `architecture-source-review.md`; `architecture-nion-comparison.md`; Memory/Soul specs |
| `7eb3a150` | memory management actions and filters | memory router/settings page | upstream memory settings 产品化 | NION Memory/Soul 用户面和治理面已重切边界 | 否 | 明确不同步 | MEMORY 冲突 | `architecture-source-review.md`; `architecture-nion-comparison.md`; Memory/Soul specs |
| `9a557751` | memory import/export | memory router/client/frontend | legacy memory import/export | NION 已有 Memory OS compat import/export 入口 | 部分是 | 已等价吸收，无需同步 | upstream 前端/路由产品面不适配 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `nion/memory_os/compat.py` |
| `5664b9d4` | inject longTermBackground into memory prompt | memory prompt | longTermBackground 持久化但未注入 prompt | NION 已有 longTermBackground prompt/tests | 是 | 已等价吸收，无需同步 | 无 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `test_memory_prompt_injection.py` |
| `c4d273a6` / `fa96acdf` / `19809800` | Discord/WeChat/WeCom channels | `backend/app/channels/*` | 增加第三方通道 | NION bridge 已迁到 desktop-first runtime | 否 | 重写后同步 | BRIDGE/DESKTOP 冲突 | `architecture-source-review.md`; `architecture-nion-comparison.md`; `desktop/src/main/bridge/*` |
| `6de9c7b4` | channel retry and thread typing reliability | channel adapters/thread router | transport 级可靠性修复 | NION 可能有对应 desktop bridge retry/typing 问题 | 否 | 部分同步 | 不能导入 backend channel 架构 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `18e34878` | custom channel assistant IDs via lead_agent | channel manager | 通道可指定 assistant id | NION `threads/service.py` 已把 `assistant_id` 规范化为 `agent_name` | 是 | 已等价吸收，无需同步 | channel 层配置仍不同 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `092bf13f` / `82c3dbbc` | Windows startup and dependency checks | Makefile/startup scripts | Windows 启动链路修复 | NION 桌面/runtime 脚本已深度分叉 | 否 | 部分同步 | 只在当前脚本有同类失败时吸收 | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `8bb14fa1` / `c1366cf5` / `5350b2fb` | skills/docs/community provider | skills/docs/community tools | 新文档站、新技能、Exa provider | 对当前同步目标价值低 | 否 | 明确不同步 | 范围外/BRAND 风险 | `architecture-source-review.md`; `architecture-nion-comparison.md` |

## 4. 冲突热点分析

### 4.1 Settings / Config Center

危险模式：

- 上游通过 `config.yaml`、`config.example.yaml`、`SubagentsAppConfig`、provider config 段扩展运行时真源
- 典型例子：`ac04f270`、`ddfc988b`、`133ffe71`

安全吸收边界：

- 只吸收 provider 层或 parsing 层的局部正确性修复
- 不吸收任何以 `config.yaml` 为落点的产品入口或用户配置模型

### 4.2 Desktop / Electron + Daemon

危险模式：

- 上游默认假设 web/backend channel runtime，而 NION 当前是 desktop-first daemon + Electron
- 典型例子：`6dbdd467`、`c4d273a6`、`fa96acdf`、`19809800`

安全吸收边界：

- 可以吸收 transport/retry/queue/backpressure 的底层思路
- 不直接吸收 backend channel 模块或 upstream stream bridge 结构

### 4.3 Memory / Soul

危险模式：

- 上游 memory settings、storage abstraction、reflection/correction 都建立在旧 memory 产品模型之上
- 典型例子：`1c542ab7`、`7eb3a150`、`0cdecf7b`

安全吸收边界：

- 只吸收局部字段修复或算法性 insight
- 不同步 upstream memory 页面、治理流程、proposal 风格语义

### 4.4 Bridge / Channel / Runtime

危险模式：

- 上游把通道能力建在 `backend/app/channels/*` 路径上
- NION 当前 bridge 已迁移到 desktop runtime、desktop preload、desktop adapter 层

安全吸收边界：

- 可吸收 channel retry、typing、assistant id routing 等 transport-level correctness
- 不吸收 upstream 通道实现文件本身

### 4.5 Uploads / Document Pipeline

危险模式：

- 上游上传链同时混合“转换算法”、“prompt 注入策略”、“config 入口”
- 典型例子：`ddfc988b`、`5ff230ea`、`163121d3`

安全吸收边界：

- 可以局部吸收 regex/preview/thread_id fallback/exception guard
- 不能把 config-driven converter mode 或 upstream prompt 产品文案原样回流

## 5. 推荐同步批次

### Batch A: 上传 / 线程 / stream 正确性修复

包含：

- `46d0c329` uploads middleware `configurable.thread_id` fallback
- `163121d3` outline regex / preview fallback 局部硬化
- `6dbdd467` 对应的 NION streaming 终止保障重写研究

禁止混入：

- backend channel 新模块
- `config.yaml` 新配置项
- upstream memory 产品面改动

验证重点：

- 上传文件在缺失 `runtime.context.thread_id` 时仍能挂载 outline
- markdown outline 提取对 split-bold / 非 ASCII 标题稳定
- desktop/daemon streaming 在高压下不会丢 `end` 终止

### Batch B: Provider 局部正确性修复

包含：

- `0948c7a4` Codex streamed output 空 completed-output 保护
- `43ef3691` Claude OAuth billing header 局部修复

禁止混入：

- `ac04f270` config-driven subagent model override
- `133ffe71` 的 `config.yaml`/optional-dependency 路线

验证重点：

- Codex streamed 输出不被空 final payload 吃掉
- Claude OAuth token 在 NION provider stack 下可稳定访问目标模型

### Batch C: 前端线程体验与低风险 UX 修补

包含：

- 对 `0eb6550c` 的局部对照，若当前 thread-scoped model persistence 仍有差口则吸收
- 工具链中与现有验证链真实失败相匹配的 Windows/dev script 修补

禁止混入：

- 大范围 workspace hydration/config refactor
- backend runtime 结构改写

验证重点：

- thread 切换 / 新建 thread / per-thread model 选择
- Windows 或本地 dev 脚本的真实回归面

### Batch D: 仅保留为重写研究素材

包含：

- `c4d273a6` / `fa96acdf` / `19809800` 的通道能力方向
- `1c542ab7` / `7eb3a150` / `0cdecf7b` 的 memory 算法或兼容 insight

禁止混入：

- 任何 upstream backend channel 文件直接迁入
- 任何 upstream memory settings 页面或旧 memory 合同

验证重点：

- 只验证 NION 自己的新设计实现，不验证 upstream 文件合入

## 6. 明确不同步清单

| 项目 | 原因 | 冲突标记 | 证据 |
| --- | --- | --- | --- |
| `ac04f270` per-subagent model override via `config.yaml` | 与 NION Settings / Config Center 真源冲突 | `CFG` | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `1c542ab7` memory storage abstraction | upstream 旧 memory storage 模型与 NION Memory OS 主链冲突 | `MEMORY` | `architecture-source-review.md`; `architecture-nion-comparison.md`; Memory/Soul specs |
| `7eb3a150` memory management actions/settings | upstream memory 产品面与 NION 已批准 Memory/Soul 边界冲突 | `MEMORY` | `architecture-source-review.md`; `architecture-nion-comparison.md`; Memory/Soul specs |
| `0cdecf7b` structured reflection + correction detection | 触碰 NION Memory/Soul 合同与反 proposal 语义边界 | `MEMORY` | `architecture-source-review.md`; approved specs |
| `c4d273a6` Discord backend channel | NION bridge 是 desktop-first，不接受 upstream backend channel 架构直拉 | `BRIDGE`, `DESKTOP` | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `fa96acdf` WeChat backend channel | 同上 | `BRIDGE`, `DESKTOP` | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `19809800` WeCom backend channel | 同上 | `BRIDGE`, `DESKTOP` | `architecture-source-review.md`; `architecture-nion-comparison.md` |
| `8bb14fa1`, `c1366cf5`, `5350b2fb` | 与当前“安全追上游且不破坏主链”的目标无关 | `BRAND` | `architecture-source-review.md`; `architecture-nion-comparison.md` |

## 7. 审计证据与命令

```bash
git fetch upstream --prune
git rev-parse electron
git rev-parse origin/electron
git rev-parse upstream/main
git merge-base electron upstream/main
git rev-list --left-right --count electron...upstream/main
git rev-list --no-merges --count electron..upstream/main
git log --no-merges --reverse --date=short --pretty=format:'%h%x09%H%x09%ad%x09%s' electron..upstream/main > artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv
git diff --name-only electron..upstream/main > artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt
git diff --name-status electron..upstream/main > artifacts/upstream-sync-audit-2026-04-14/upstream-name-status.txt
git diff --name-only upstream/main..electron > artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt
comm -12 <(sort artifacts/upstream-sync-audit-2026-04-14/upstream-files.txt) <(sort artifacts/upstream-sync-audit-2026-04-14/nion-divergence-files.txt) > artifacts/upstream-sync-audit-2026-04-14/overlap-files.txt
rg -i 'sandbox|security|escape|permission|audit|path|mount|XSS|download|shell|thread|runtime|stream|middleware|loop|clarification|subagent|END|cancel|todo|upload|artifact|document|PDF|pdf|outline|file|readability|web_fetch' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv > artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv
rg -i 'model|provider|vLLM|Ollama|gateway|OAuth|Claude|DeepSeek|thinking|reasoning|LangGraph|Codex|frontend|UI|hydration|IME|suggestion|thread history|token|route|button|CSS|markdown|memory|soul|reflection|correction|longTermBackground|fact|channel|Slack|Discord|WeChat|WeCom|wecom|Feishu|Lark|IM|Windows|Docker|CI|Makefile|serve|lint|format|README|docs|skill|deps|uv|pnpm|blog|community' artifacts/upstream-sync-audit-2026-04-14/upstream-commits.tsv > artifacts/upstream-sync-audit-2026-04-14/architecture-candidate-commits.tsv
FULL_COMMIT="$(awk -F '\\t' 'NR==1 {print $2}' artifacts/upstream-sync-audit-2026-04-14/p0-candidate-commits.tsv)"
git show --stat --summary "$FULL_COMMIT"
git show --name-only --format=fuller "$FULL_COMMIT"
git show --format=fuller --find-renames --find-copies "$FULL_COMMIT"
sed -n '1,240p' backend/packages/harness/nion/agents/middlewares/uploads_middleware.py
rg -n 'thread_id|outline|preview_lines' backend frontend desktop docs
```
