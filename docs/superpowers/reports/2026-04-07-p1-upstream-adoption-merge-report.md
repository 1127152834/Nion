# P1 Upstream Adoption Merge Report

**落地分支：** `electron`  
**落地方式：** 无损快进合并 `codex/upstream-review-20260406` 到 `electron`，并恢复主工作区未提交改动  
**基线提交：** `d65a0188`  
**落地结果头部：** `938c268d`

---

## 1. 本轮完成了什么

这一轮已经把前一份评估里定义的 `P1` 批次能力同步到 `electron`，并且没有覆盖你主工作区原本未提交的改动。

本轮吸收的能力分为四组：

1. 文档上传理解链路
2. sandbox 搜索和只读挂载安全
3. 前端附件输入稳定性
4. 小范围健壮性修复

---

## 2. 已落地能力

### 2.1 文档上传理解链路

对应提交：

- `1da00332`
- `baf72f64`
- `0d6fd834`
- `c43bbdca`
- `a9d3a5d1`
- `e9c8dd2c`
- `50f50523`
- `57e666ba`

落地效果：

- 文档转换从单一 `MarkItDown` 升级为 `pymupdf4llm -> markitdown` fallback
- 大文件转换支持 `asyncio.to_thread`
- 支持从 sidecar `.md` 提取 outline
- outline 为空时回退 preview lines
- 上传上下文中加入 file-first guidance
- `<uploaded_files>` 提示块里的动态文本已做安全转义，避免 prompt block 被恶意内容提前闭合

当前你们在 `electron` 上已经具备：

- 更适合 PDF/长文档问答的结构化上传理解
- 更稳的文档转换链路
- 更安全的上传提示注入

关键文件：

- [backend/packages/harness/nion/utils/file_conversion.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/utils/file_conversion.py)
- [backend/packages/harness/nion/agents/middlewares/uploads_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/middlewares/uploads_middleware.py)
- [backend/tests/test_file_conversion.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/tests/test_file_conversion.py)
- [backend/tests/test_uploads_middleware_core_logic.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/tests/test_uploads_middleware_core_logic.py)

### 2.2 Sandbox 搜索和只读挂载安全

对应提交：

- `d2e27679`
- `391fb7f9`
- `5d84bc10`

落地效果：

- 本地 sandbox 新增 `grep` / `glob`
- 本地 path mapping 引入 `read_only`
- `skills` / `acp-workspace` 只读路径不再允许通过 bash 访问
- 阻断相对路径逃逸写入
- `grep/glob` 不再跟随 symlink 越界

这部分是本轮最重要的安全落地之一。  
在 review 过程中，这一块其实经历了多轮加固，最后才把几个真实 blocker 关掉：

- bash 不能再通过 `foo/../../...` 之类的路径段逃出 workspace
- 根路径本身是 symlink 时，`grep/glob` 会直接拒绝/忽略
- 只读映射不再被 bash 间接写入

关键文件：

- [backend/packages/harness/nion/sandbox/search.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/search.py)
- [backend/packages/harness/nion/sandbox/tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/tools.py)
- [backend/packages/harness/nion/sandbox/local/local_sandbox.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/local/local_sandbox.py)
- [backend/packages/harness/nion/sandbox/local/local_sandbox_provider.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/sandbox/local/local_sandbox_provider.py)
- [backend/tests/test_sandbox_tools_security.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/tests/test_sandbox_tools_security.py)
- [backend/tests/test_sandbox_search_tools.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/tests/test_sandbox_search_tools.py)

### 2.3 前端附件输入稳定性

对应提交：

- `b6925669`
- `938c268d`

落地效果：

- `.app` 文件现在会在前端被拦截
- File helper 已经从主流程上统一
- `threads/hooks.ts` 不再自己维护 blob URL -> File 的重建逻辑
- provider/local 两条附件路径进一步收口到同一套准备逻辑
- 两个新增 `.mjs` 测试已经去掉对 `cwd` 的依赖

这里的价值不是“加了个小拦截”，而是把附件输入主链路从“勉强可用”变成“更稳定、行为更一致”。

关键文件：

- [frontend/src/components/ai-elements/prompt-input.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/components/ai-elements/prompt-input.tsx)
- [frontend/src/core/threads/hooks.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/core/threads/hooks.ts)
- [frontend/src/core/uploads/file-validation.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/core/uploads/file-validation.ts)
- [frontend/src/core/uploads/prompt-input-files.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/frontend/src/core/uploads/prompt-input-files.ts)

### 2.4 小范围健壮性修复

对应提交：

- `abc41516`
- `9d42aaf2`
- `39e0d48c`

落地效果：

- `suggestions` 现在使用 `SystemMessage + HumanMessage`
- async 和 sync fallback 都保持 message-based 调用
- 保留了 `resolve_model_name_with_fallback(...)` 的旧恢复语义，避免 stale config 直接静默变成空 suggestions
- `LoopDetectionMiddleware` 可以处理 `AIMessage.content` 为 list 的 hard stop
- memory prompt 注入补上了 `Background: ...`
- `/api/agents` 列表现在会返回 `soul`

关键文件：

- [backend/app/gateway/routers/suggestions.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/app/gateway/routers/suggestions.py)
- [backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/middlewares/loop_detection_middleware.py)
- [backend/packages/harness/nion/agents/memory/prompt.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/packages/harness/nion/agents/memory/prompt.py)
- [backend/app/gateway/routers/agents.py](/Users/zhangtiancheng/Documents/项目/agent/nion/.worktrees/codex-upstream-review-20260406/backend/app/gateway/routers/agents.py)

---

## 3. 这轮明确没有做的内容

本轮没有继续追这些上游内容：

- wecom / slack / channels 路线
- serve.sh / deploy / nginx / docker 路线
- runtime platform / SDK 主线改造
- public skills 内容包

原因仍然成立：

- 它们对当前 NION 产品价值不如本轮 P1 批次直接
- 或者它们会明显带回 upstream 的 donor 假设
- 或者它们会和你们当前 Electron-first / Config Center / local daemon 架构冲突

---

## 4. 已知非阻塞风险

本轮已经把 blocker 都收掉了，但还有一些非阻塞风险值得记住：

### 4.1 文档转换阈值仍是启发式

`pymupdf4llm` 的 sparse-output 判断仍是启发式，不是内容质量判定器。  
它已经足够比旧逻辑好，但不是“所有 PDF 都能稳定最优转换”。

### 4.2 搜索忽略规则有重复定义

`search.py` 里目前复制了一份 ignore 规则。  
这次为了快速解除循环导入没有进一步抽共享模块，后面如果继续打磨 sandbox，可以把 ignore 规则抽成共享层。

### 4.3 PromptInputProvider 仍是最小收口

provider/local 主路径已经比之前一致很多，但如果未来继续扩展附件上传策略，最好再把 provider 暴露 API 的语义进一步制度化，而不是继续在组件内部兜。

---

## 5. 验证情况

这轮不是“写完就算”，而是逐任务 review 闭环后才落回 `electron`。  
过程中实际跑过的验证包括：

- `backend/tests/test_file_conversion.py`
- `backend/tests/test_uploads_middleware_core_logic.py`
- `backend/tests/test_memory_upload_filtering.py`
- `backend/tests/test_sandbox_tools_security.py`
- `backend/tests/test_sandbox_search_tools.py`
- `backend/tests/test_suggestions_router.py`
- `backend/tests/test_loop_detection_middleware.py`
- `backend/tests/test_memory_prompt_injection.py`
- `backend/tests/test_custom_agent.py`
- `frontend` 的 node tests
- `frontend` typecheck
- 多轮 `ruff check`

有一部分 Python 测试在本地默认 3.12 解释器下会遇到 `dyld` / code-signature 环境问题，所以在 sandbox 相关阶段使用了明确的 Python 3.13 路径来完成验证；这不是代码逻辑问题，是当前机器环境问题。

---

## 6. 当前 electron 状态

P1 批次已经落地到 `electron`。  
同时，主工作区原本未提交的改动也已经恢复回来了，没有被覆盖。

当前主工作区仍然存在这些未提交改动：

- [backend/packages/harness/nion/client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/packages/harness/nion/client.py)
- [backend/tests/test_client.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_client.py)
- [backend/tests/test_notebook_assistant_api.py](/Users/zhangtiancheng/Documents/项目/agent/nion/backend/tests/test_notebook_assistant_api.py)
- [frontend/src/components/workspace/automation/automation-home-page.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-home-page.tsx)
- [frontend/src/components/workspace/automation/automation-routing.contract.test.ts](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/automation/automation-routing.contract.test.ts)
- [frontend/src/components/workspace/messages/message-list-item.tsx](/Users/zhangtiancheng/Documents/项目/agent/nion/frontend/src/components/workspace/messages/message-list-item.tsx)
- [docs/superpowers/plans/2026-04-04-memory-os-m0-contract-foundation-implementation-plan.md](/Users/zhangtiancheng/Documents/项目/agent/nion/docs/superpowers/plans/2026-04-04-memory-os-m0-contract-foundation-implementation-plan.md)

也就是说：

- P1 同步已落地
- 你的本地 WIP 仍然在
- 当前还没有去处理 `origin/electron` 的那 1 个 behind 提示

---

## 7. 下一步建议

现在有三条自然的后续路径：

1. 继续第二批同步评估
   面向上次表里的 `P2 / 暂缓` 项，继续挑功能价值高的能力往下做。

2. 先做一次主分支总体验证
   在 `electron` 主工作区或新 worktree 上，对本轮 P1 落地做更系统的验证报告。

3. 先处理你主工作区现有 WIP
   因为 `client.py`、automation、message-list 这些文件本身就是和本轮能力会相互影响的区域，先把你的本地改动收口也有价值。

我的建议顺序是：

1. 先不要碰 `origin/electron` 那个 behind 1 的远端差异
2. 先做第二批 upstream 功能筛选
3. 同时保持你现在这批本地 WIP 不被打断
