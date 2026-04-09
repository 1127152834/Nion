# OpenViking 代码审计

## 结论

当前仓库中，`OpenViking` 作为“大一统 Memory OS / provider / 产品概念”基本已经退场；但 `openviking` 作为 **notebook ingest + retrieval 子系统** 仍然真实存在，并且仍在后端运行时主链路中被调用。

更具体地说：

- **后端仍在真实使用**
  - notebook reindex
  - notebook search
  - notebook context preview
  - continuity middleware 中的 notebook context injection
- **前端没有真实消费**
  - `frontend/src/core/openviking/*` 这层 API/hooks 还在
  - 但当前组件层没有实际引用
- **有测试残留**
  - `test_openviking_config.py` 依赖的 `nion.config.openviking_config` 在当前代码库中缺失，属于悬空残留

## 审计表

| 路径/模块 | 作用 | 当前状态 | 证据 | 判断 |
|---|---|---|---|---|
| `backend/app/runtime/app_factory.py` | 运行时注册 `openviking.router` | 运行中 | `include_router(openviking.router)` | 后端主链 |
| `backend/app/gateway/routers/openviking.py` | 暴露 `/api/openviking/notebook/reindex/search/context-preview` | 运行中 | 路由存在且被 app_factory 注册 | 后端主链 |
| `backend/packages/harness/nion/openviking/notebook_ingest.py` | note -> resource/chunk reindex | 运行中 | router 和 tests 直接调用 `EmbeddedNotebookIngestService` | 后端主链 |
| `backend/packages/harness/nion/openviking/runtime_retriever.py` | chunk retrieval -> context pack | 运行中 | router 和 continuity middleware 直接调用 | 后端主链 |
| `backend/packages/harness/nion/openviking/context_assembler.py` | notebook retrieval 结果拼成 continuity block | 运行中 | continuity middleware 调用 `build_continuity_context_block` | 后端主链 |
| `backend/packages/harness/nion/openviking/retrieval_intent.py` | 判断消息是否应检索 notebook | 运行中 | continuity middleware 调用 `classify_retrieval_intent` | 后端主链 |
| `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py` | 将 openviking notebook retrieval 注入主 agent continuity | 运行中 | 直接 import `RuntimeNotebookRetriever` / `classify_retrieval_intent` / `build_continuity_context_block` | 后端主链 |
| `backend/packages/harness/nion/openviking/chunk_store.py` | chunk search 存储 | 运行中 | ingest/retriever 依赖 | 间接在用 |
| `backend/packages/harness/nion/openviking/resource_store.py` | note resource registry | 运行中 | ingest 依赖 | 间接在用 |
| `backend/packages/harness/nion/openviking/chunker.py` | markdown chunking | 运行中 | ingest 依赖 | 间接在用 |
| `backend/packages/harness/nion/openviking/notebook_projection.py` | note -> resource projection | 运行中 | ingest 依赖 | 间接在用 |
| `backend/packages/harness/nion/openviking/context_pack.py` | notebook context pack 类型 | 运行中 | retriever/context_assembler 依赖 | 间接在用 |
| `backend/packages/harness/nion/openviking/contracts.py` / `models.py` / `uri.py` / `__init__.py` | 类型、导出、URI 约定 | 运行中 | 上述主链模块依赖 | 间接在用 |
| `backend/packages/harness/nion/config/paths.py` | `openviking/` 本地目录与 sqlite 路径 | 运行中 | `ensure_openviking_dirs()` 被 ingest/retriever 调用 | 后端主链 |
| `frontend/src/core/openviking/api.ts` | 前端 API 封装 | 无组件消费 | 全局搜索未发现组件引用 | 前端残留 |
| `frontend/src/core/openviking/hooks.ts` | React Query hooks | 无组件消费 | 全局搜索未发现组件引用 | 前端残留 |
| `frontend/src/core/openviking/types.ts` / `index.ts` | 类型和导出 | 无组件消费 | 无组件层引用 | 前端残留 |
| `frontend/src/core/i18n/locales/*` 中的 openviking 文案 | 文案定义 | 未见实际 UI 调用 | 组件层无 `openviking` 使用 | 命名残留 |
| `backend/tests/test_openviking_router.py` | notebook reindex/search/context-preview 路由测试 | 有效 | 直接请求 `/api/openviking/notebook/*` | 证明后端接口仍受支持 |
| `backend/tests/test_openviking_runtime_retriever.py` | runtime retriever 测试 | 有效 | 直接实例化 retriever | 证明后端主链仍维护 |
| `backend/tests/test_openviking_notebook_ingest.py` | ingest 测试 | 有效 | 直接实例化 ingest service | 证明后端主链仍维护 |
| 其他 `backend/tests/test_openviking_*` | paths / chunker / search / projection / context 等测试 | 有效 | 覆盖底层模块 | 说明子系统未废弃 |
| `backend/tests/test_openviking_config.py` | openviking config 测试 | 失效残留 | 依赖 `nion.config.openviking_config`，当前文件缺失 | 需要清理 |
| `memory_os` 相关文件里提到 openviking 的文字/注释 | 旧架构残留 | 不算当前运行时使用 | 当前缺少 `memory_os/openviking_provider.py` 等 provider 实现 | 历史残留 |
| `docs/**` 中大量 OpenViking | 文档残留 | 不算当前运行时使用 | 主要是旧设计/计划文档 | 文档残留 |

## 直接证据

### 前端零消费

对下面这些函数/Hook 做全局搜索，除定义文件外没有命中任何业务组件：

- `useReindexNotebookResources`
- `useNotebookResourceSearch`
- `useNotebookContextPreview`
- `reindexNotebookResources`
- `searchNotebookResources`
- `loadNotebookContextPreview`

这说明 `frontend/src/core/openviking/*` 当前只是 API 封装残留，没有真实产品面消费。

### 后端主链仍在

全局搜索显示以下符号仍在被路由或中间件直接调用：

- `EmbeddedNotebookIngestService`
- `RuntimeNotebookRetriever`
- `build_continuity_context_block`
- `classify_retrieval_intent`

其中最关键的是：

- `backend/app/gateway/routers/openviking.py`
- `backend/packages/harness/nion/agents/middlewares/continuity_middleware.py`

这两处说明 openviking notebook retrieval 不是“库里有代码但没人用”，而是当前 agent 主链和公开 API 都还在用。

## 总判断

一句话总结：

**当前项目里真正还在使用的 openviking，只剩后端 notebook ingest + retrieval + continuity injection 这条链；前端产品面已经退场，只剩 API/hooks 与文案残留；更大的 OpenViking provider / Memory OS 概念主要是历史文档残留。**
