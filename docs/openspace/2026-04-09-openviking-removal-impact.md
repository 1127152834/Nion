# OpenViking 删除影响评估

## 结论

删除 `openviking` 能力后，**不会大面积伤到 Nion 的 Notebook 基础功能**，但会移除一条当前仍在运行时主链路中生效的能力：

- 主助手在回答前，按 query 从 notebook 中检索相关片段并注入 continuity context

如果用产品语言说，删掉它的主要代价不是“Notebook 不能用了”，而是：

**主助手会暂时失去 notebook 跨 note 检索增强。**

这条能力和你最终想要的 `LLM Wiki / 共维护知识库` 不是一回事。它只是一个过渡性的 retrieval substrate。

## 影响表

| 模块 | 是否受影响 | 影响内容 | 证据 |
|---|---|---|---|
| 主助手回答链路 | 是 | `ContinuityMiddleware` 不再从 notebook 检索相关内容并注入 `<continuity_context>` | `lead_agent/agent.py` 将 `ContinuityMiddleware()` 加入主 middleware 链；`continuity_middleware.py` 直接调用 `RuntimeNotebookRetriever` |
| Notebook 创建/编辑/历史/重写/垃圾箱/元数据 | 否，或几乎无影响 | 这些功能走 `notebook` 自己的 router/service，不走 `openviking` | `backend/app/gateway/routers/notebook.py`、`backend/packages/harness/nion/notebook/service.py` |
| 公开的 notebook retrieval API | 是 | `/api/openviking/notebook/reindex`、`/search`、`/context-preview` 会被删除 | `backend/app/gateway/routers/openviking.py` |
| 后端 runtime 路由注册 | 是 | 需要移除 `openviking.router` | `backend/app/runtime/app_factory.py` |
| 前端业务组件 | 基本否 | 当前没有页面/组件直接消费 `frontend/src/core/openviking/*` | 全局搜索组件层无命中 |
| 前端 openviking API/hooks/types | 是 | 这层封装会被一起删除 | `frontend/src/core/openviking/*` |
| i18n 文案与 OpenAPI tags | 是 | `openviking` 相关文案和 tag 会被清理 | `frontend/src/core/i18n/locales/*`、`backend/app/gateway/app.py` |
| 测试 | 是 | `test_openviking_*` 和依赖 notebook retrieval continuity 的测试要删/改 | `backend/tests/test_openviking_*`、`frontend/src/core/openviking/api.test.ts` |
| Recall / Memory OS 本体 | 轻微 | Recall 仍在，但 `ContinuityMiddleware` 里 notebook retrieval 分支消失 | `continuity_middleware.py` |

## 新鲜验证证据

### 1. 主助手确实在用这条链

`backend/packages/harness/nion/agents/lead_agent/agent.py` 中：

```py
middlewares.append(ContinuityMiddleware())
```

这说明 `openviking` notebook retrieval 不是死代码，而是当前主助手运行链的一部分。

### 2. ContinuityMiddleware 直接依赖 openviking

`backend/packages/harness/nion/agents/middlewares/continuity_middleware.py` 中存在以下关键调用：

- `from nion.openviking import build_continuity_context_block, classify_retrieval_intent`
- `from nion.openviking.runtime_retriever import RuntimeNotebookRetriever`
- `self._notebook_retriever = RuntimeNotebookRetriever(base_dir=base_dir)`
- `notebook_items = self._search_notebook_context_items(latest_content)`

这说明只要保留 `ContinuityMiddleware` 的当前实现，`openviking` 就仍然是运行时依赖。

### 3. 前端没有真实业务消费

对下面这些符号进行组件层全局搜索，除定义文件外没有任何业务命中：

- `useReindexNotebookResources`
- `useNotebookResourceSearch`
- `useNotebookContextPreview`
- `reindexNotebookResources`
- `searchNotebookResources`
- `loadNotebookContextPreview`

这说明删掉 `frontend/src/core/openviking/*` 不会打断现有页面交互，只会清理残留封装。

### 4. 测试环境当前无法作为删除前基线

尝试运行以下测试：

- `backend/tests/test_openviking_router.py`
- `backend/tests/test_openviking_runtime_retriever.py`
- `backend/tests/test_recall_capture_middleware.py`

均被本机 `uv run pytest` 的 Python 3.12 动态库签名问题阻断，而不是测试本身失败。因此本次影响评估主要依据代码链路和静态调用关系，而不是现成 pytest 结果。

## 删除后的系统状态

如果彻底删除 `openviking` 能力，系统会进入这样一个状态：

- Notebook 继续保留为本地内容容器
- Notebook assistant 继续保留，但只围绕当前 note 工作
- 主助手不再自动从 notebook 拉跨 note 检索上下文
- 公开的 notebook retrieval API 消失
- 前端 `core/openviking/*` 和相关文案消失

也就是说，删除后系统会更简单，但也会更“窄”：

- 更简单：去掉历史概念、去掉一条过渡 retrieval 子系统
- 更窄：新的知识库层上线前，主助手对 notebook 的利用能力下降

## 建议

如果产品方向已经明确转向：

- 共同维护知识库
- Obsidian-compatible vault
- graph-aware retrieval
- compiled knowledge layer

那么删除 `openviking` 是合理的，因为这条链并不是目标能力本身，只是一个旧的过渡方案。

唯一需要接受的现实是：

**在新的 knowledge base retrieval/compile 层落地之前，主助手会短期失去 notebook 检索增强。**
