# Upstream Review Since 2026-04-03

**范围：** `upstream/main` 自 `6de9c7b4` 之后至 `ca2fb95e` 的新增提交  
**评估方法：** 逐个阅读上游 diff，并对照当前 NION（Electron-first、Config Center、local daemon、ThreadService -> NionClient）对应实现，按“功能价值优先”而不是“是否好 cherry-pick”给出判断。  
**强约束：**

- 不让 `config.yaml` 回流为运行时真相
- 不用 upstream 的部署/网关/渠道假设替换 NION 当前桌面架构
- 同步建议以 `直接吸收 / 部分吸收 / 暂缓 / 不拉` 四类输出

---

## 总结结论

这一批新增提交里，真正值得 NION 优先研究和同步的，不是 runtime platform 本体，而是：

1. 上传文档理解链路增强
2. sandbox 检索与本地挂载安全增强
3. 前端附件输入稳定性增强
4. 若干低风险健壮性修复

不建议优先碰的主要是：

1. 启动/部署脚本体系
2. 渠道大功能（尤其 wecom）
3. 技能内容包
4. upstream 特有的 gateway/runtime 假设

---

## 逐项评估表

| 提交 | 上游代码里实际做了什么 | 对 NION 的帮助 | 影响范围 | 建议 |
|---|---|---|---|---|
| `ddfc988b` | 在 `utils/file_conversion.py` 中把 PDF 转 Markdown 从单一 `MarkItDown` 升级为 `pymupdf4llm -> 稀疏度检测 -> MarkItDown fallback`，并对大文件使用 `asyncio.to_thread()`，同时引入 `UploadsConfig.pdf_converter` 控制策略。 | 高。NION 当前 [file_conversion.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/utils/file_conversion.py) 仍是最基础的 `MarkItDown()` 直转。对聊天附件、Notebook、知识沉淀都是真实能力提升。 | 中。影响上传文档转换、依赖、少量配置模型。 | `部分吸收` |
| `5ff230ea` | 在 `uploads_middleware.py` 中为已转换文档提取 heading outline，并把 `Lxx: heading` 注入 `<uploaded_files>` prompt，让 agent 先按目录定位，再用 `read_file` 精读。 | 高。NION 当前 [uploads_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/middlewares/uploads_middleware.py) 只列文件名与路径，没有结构信息。对长文档问答非常有帮助。 | 中。影响上传文件 prompt 结构和转换结果消费。 | `部分吸收` |
| `163121d3` | 强化 `extract_outline()`：支持 split-bold heading，outline 为空时提供 preview/fallback，并继续把“优先文件内搜索”写入上传上下文。 | 高。它不是单纯 regex 修补，而是让 outline 提取失败时仍能给 agent 一个内容锚点。NION 当前完全没有这层 fallback。 | 中。与 `5ff230ea`、`ddfc988b` 形成一条完整文档链路。 | `部分吸收` |
| `bbd08663` | 在上传文件 prompt 中增加明确工作流：优先 `grep` / `glob` / `read_file`，不要文件一上传就去 web search。 | 中高。非常符合 NION 当前本地优先、Notebook、本地工作区资产优先的产品方向。 | 低。主要是 prompt 文案层。 | `直接吸收` |
| `c6cdf200` | 新增 sandbox 内建 `grep` 和 `glob` 工具，包含本地/AIO sandbox 搜索实现、ignore 策略、regex 风险控制、测试。 | 高。对 NION 桌面本地 runtime 价值很高，能增强 agent 在工作区、上传文件、Notebook 副本中的检索效率。当前 NION [sandbox/tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/tools.py) 还没有这类工具。 | 高。涉及工具、sandbox 搜索实现、权限验证、测试面。 | `部分吸收` |
| `1694c616` | 为本地 sandbox path mapping 引入 `PathMapping(read_only)`，允许自定义 mounts 且保留只读约束；写入操作遇到只读映射会拒绝。 | 高。NION 当前已经有 [sandbox_config.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/config/sandbox_config.py) 的 `mounts`/`read_only` 配置模型，但本地 sandbox 路径映射层还没有完整吃透只读语义。这笔是真缺口。 | 高。影响本地 sandbox provider、路径映射、权限安全。 | `部分吸收` |
| `1c0051c1` | 前端附件在上传前后保持对原始 `File` 对象的引用，避免依赖 blob URL 再重建；新增 `prompt-input-files.ts` 管理附件到上传的转换。 | 高。NION 当前 [prompt-input.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/components/ai-elements/prompt-input.tsx) 已经保存了 `file` 字段，但 [threads/hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/core/threads/hooks.ts) 仍在走 blob URL -> File 重建，说明只同步了一半。 | 中。影响附件提交流程与前端状态。 | `部分吸收` |
| `144c9b24` | 前端识别并拦截 `.app` 包上传，给出明确错误提示。 | 中高。NION 是桌面产品，用户更可能拖进 `.app`。这类文件浏览器上传本来就不稳定，前端早拦比后端失败更合理。 | 低。仅附件输入校验。 | `直接吸收` |
| `5664b9d4` | 修复 memory prompt 注入时漏掉 `history.longTermBackground.summary`。 | 中高。NION 当前 [memory/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/memory/prompt.py) 也确实只注入了 `recentMonths` 和 `earlierContext`，漏掉了 `longTermBackground`。这是实 bug。 | 低。纯 memory prompt 修复。 | `直接吸收` |
| `83039fa2` | `suggestions.py` 改为用 `SystemMessage + HumanMessage` 调模型，而不是把 system 指令和用户内容拼成一个字符串。 | 中。NION 当前 [suggestions.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/app/gateway/routers/suggestions.py) 仍是 `model.invoke(prompt)` 单字符串。某些模型下确实更脆。 | 低。只影响 follow-up suggestions。 | `直接吸收` |
| `db82b592` | `LoopDetectionMiddleware` 兼容 `AIMessage.content` 为 `list[dict]` 的情况，避免 `list + str` 触发 TypeError。 | 中。NION 当前 [loop_detection_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py) 确实还会直接拼接字符串，存在相同风险。 | 低。中间件健壮性修复。 | `直接吸收` |
| `72d4347a` | 在 sandbox 工具 helper 写入 `runtime.context["sandbox_id"]` 等位置前，加 `runtime.context is not None` 守卫。 | 中。NION 本地已有 [test_runtime_context_guards.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/tests/test_runtime_context_guards.py) 覆盖一部分 `None context` 情况，但是否所有写路径都防住还需要逐行核。 | 低。属于防御性修复。 | `部分吸收` |
| `a283d4a0` | `GET /api/agents` 列表返回里包含 `soul` 字段，而不是只有详情接口包含。 | 中。NION 当前 [agents.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/app/gateway/routers/agents.py) 列表仍不带 soul，只详情带。如果前端要在列表页直接编辑/预览人格，这笔有价值。 | 低。agent catalog API 改动小。 | `部分吸收` |
| `8049785d` | memory 层做两件事：`_fact_content_key()` 改为 `casefold()` 做大小写无关去重；增加 positive reinforcement 检测，让明确肯定的话也能强化记忆写入。 | 中。大小写去重有价值；reinforcement 机制也有启发。但 NION 当前 memory 系统已明显分叉，这更适合选点吸收，而不是整包追。 | 中。影响 memory middleware、queue、updater。 | `部分吸收` |
| `76fad8b0` | 给 `DeerFlowClient` 增加 `available_skills` 参数，并通过 prompt 控制技能可见集。 | 低到中。NION 当前 [client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/client.py) 已经走了另一条路：`requested_skills`、`selected_mcp_tools`、`selected_cli_tools` 都会进入 runnable config 和 prompt，功能上大部分已覆盖。 | 低。和你们当前 client 分叉较大。 | `不拉` |
| `48565664` | 修正 ACP `mcpServers` payload 的线格式装配。 | 低。NION 当前 [invoke_acp_agent_tool.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/tools/builtins/invoke_acp_agent_tool.py) 已经不是 upstream 当时那套 payload 结构，且 ACP 这块你们前面已专项核过。 | 低。ACP 路线已 NION-native。 | `不拉` |
| `6dbdd467` | 保证 `MemoryStreamBridge` 在队列满时也一定投递 END sentinel，避免 SSE 永远不结束。 | 中，但不是当前优先。它对 upstream gateway runtime 很重要，但 NION 现在主要走 embedded `NionClient` 流，不是同一套 `StreamBridge` 主路径。 | 中。更偏未来 runtime compatibility 项。 | `暂缓` |
| `2a150f5d` | 混合提交：suggestions 文案微调、title fallback 改 async、本地 config/paths 查找更稳、前端 hydration、serve.sh 小改。 | 中。里面有个别点有帮助，但它不是一笔可以整包吸收的提交。尤其 config/paths 的默认查找还是围绕 `config.yaml` 生态，与 NION 当前 Config Center 路线不一致。 | 高。跨很多层，风险大。 | `暂缓` |
| `19809800` | 新增 wecom channel，涉及 `backend/app/channels/wecom.py`、manager/service、tests、依赖、文档、配置。 | 低到中。功能本身可能有商业价值，但你们当前渠道体系与 upstream 已明显分叉，本地 `backend/app/channels` 目录本身都不是同一结构，不能按 donor 路线直接追。 | 高。渠道、配置、依赖、测试全链路。 | `暂缓` |
| `117fa9b0` | slack allowed user ids 规范化。 | 低。只有在你们当前 slack 渠道仍完全沿用 upstream 解析路径时才值同步；从当前仓库结构看不是。 | 低。渠道边角修复。 | `不拉` |
| `9735d73b` | follow-up suggestion UI 避免遮挡，主要调 thread page / input box / message list 布局。 | 低。偏 UI 体验，不是当前 NION 主线能力缺口。除非你们现在线上就有同类视觉 bug。 | 低到中。页面布局。 | `暂缓` |
| `3d4f9a88` | agent 创建页加入显式 save 动作和提示。 | 低到中。产品上有一定价值，但相对你们当前 runtime、上传、Notebook、automation 主线优先级不高。 | 中。agents/new 页和少量 hooks。 | `暂缓` |
| `8bb14fa1` | 新增 3 个 public skills 内容包。 | 低。不是底层能力增强。 | 低。内容资产。 | `不拉` |
| `4ceb18c6` | 本地前端开发脚本改回 webpack。 | 低。只影响 upstream 本地 dev 脚本。NION 当前 dev 启动链路已不同。 | 低。脚本层。 | `不拉` |
| `6473d389` | `Button` 组件 hydration mismatch 小修。 | 低。NION 当前 [button.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/components/ui/button.tsx) 仍会无条件输出 `data-variant/data-size`，理论上有同类风险，但只有在实际出现 mismatch 时才值得动。 | 低。UI 基础组件。 | `暂缓` |
| `28474c47` | 命令面板 macOS hydration mismatch 修复。 | 低。当前 NION 的 [command-palette.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/components/workspace/command-palette.tsx) 也有基于 `navigator.userAgent` 的分支，但是否真实出问题要先复现。 | 低。前端细节。 | `暂缓` |
| `e5416b53` | Docker multi-stage build，减小 runtime 镜像。 | 低。运维价值，不是产品能力。 | 中。部署构建。 | `不拉` |
| `fb2d99fd` / `fd310582` | Docker / nginx 启动修复。 | 低。只对 upstream 容器化部署有帮助。 | 中。部署层。 | `不拉` |
| `0ffe5a73` | 提高 subagent max-turn limit。 | 低。不是能力补齐，而是行为参数调整，容易引入成本和行为漂移。 | 低。subagent 配置。 | `不拉` |
| `9ca68ffa` | 保持虚拟路径分隔符风格。 | 低到中。是个真实健壮性修复，但价值小于 grep/glob、只读挂载、上传链路。 | 低。路径显示细节。 | `暂缓` |
| `ca2fb95e` | 统一 serve.sh，支持 gateway mode。 | 低。你已经明确不拉，这笔主要是启动/部署体系，不是产品能力。 | 高。脚本/部署拓扑。 | `不拉` |

---

## 建议优先级

### P1：建议下一批优先研究和实现

1. `ddfc988b`
2. `5ff230ea`
3. `163121d3`
4. `bbd08663`
5. `c6cdf200`
6. `1694c616`
7. `1c0051c1`
8. `144c9b24`
9. `5664b9d4`
10. `83039fa2`
11. `db82b592`

### P2：有帮助，但需要你们架构内重写

1. `8049785d`
2. `a283d4a0`
3. `72d4347a`
4. `2a150f5d`

### P3：暂缓

1. `19809800`
2. `9735d73b`
3. `3d4f9a88`
4. `28474c47`
5. `6473d389`
6. `9ca68ffa`
7. `6dbdd467`

### 不建议同步

1. `ca2fb95e`
2. `76fad8b0`
3. `48565664`
4. `117fa9b0`
5. `8bb14fa1`
6. `4ceb18c6`
7. `e5416b53`
8. `fb2d99fd`
9. `fd310582`
10. `0ffe5a73`

---

## 最终判断

如果只看“这批新的 upstream 里哪些对 NION 真有帮助”，最值得投入的是：

- 文档上传 -> 结构提取 -> 本地搜索 -> 精准阅读 这一整条链
- sandbox 本地挂载和检索能力
- 附件输入稳定性
- 少量明确的健壮性 bugfix

不值得优先投入的是：

- 启动/部署体系
- 大渠道接入
- 技能内容包
- 与你们当前 Electron-first / Config Center / local daemon 架构冲突的 donor 假设
