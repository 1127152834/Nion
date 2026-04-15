# 检索模型本地模式恢复与页面收敛 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `Settings > 检索模型` 真正支持 `本地 / API` 双模式，并把页面收回到现有设置页的简洁设计语言。

**Architecture:** 继续保留当前 `retrieval-models` 作为唯一 owner surface，但把 schema 从 `remote_managed only` 扩展为 `local_onnx + remote` 双模式。后端负责 retrieval active profile、provider test、Memory 索引重建；桌面端负责本地模型清单、下载、导入与进度；前端只消费这三条正式主链，不再伪造本地模式 UI。

**Tech Stack:** FastAPI, Pydantic, Electron main/preload IPC, TanStack Query, React/Next.js, node:test contract tests, pytest

---

## File Structure

### Backend ownership
- Modify: `backend/packages/harness/nion/retrieval/models/settings.py`
  - retrieval active profile 扩展为本地 / API 双模式
- Create: `backend/packages/harness/nion/retrieval/models/local_catalog.py`
  - 本地模型规格、pack 规格、默认推荐组合 owner
- Modify: `backend/packages/harness/nion/retrieval/models/status_service.py`
  - 把本地模型状态、已安装状态、推荐组合与 provider readiness 聚合进 status read model
- Modify: `backend/packages/harness/nion/retrieval/models/service.py`
  - 处理 active profile 持久化、远端测试、Memory rebuild gating、本地模式校验
- Modify: `backend/app/gateway/routers/retrieval_models.py`
  - 增加 status 中的 local model surface，扩展 active/test payload contract
- Modify: `backend/packages/harness/nion/memory/search_fusion/vector_search.py`
  - local_onnx 尚未恢复 runtime 时必须显式 lexical fallback，不得假装可用
- Modify: `backend/packages/harness/nion/memory/embedding/index_service.py`
  - rebuild 时识别本地模式 readiness，未就绪则返回可读错误
- Modify: `backend/tests/test_retrieval_models_router.py`
- Modify: `backend/tests/test_memory_vector_search.py`
- Modify: `backend/tests/test_vector_search.py`

### Desktop ownership
- Create: `desktop/src/main/retrieval-model-manager.ts`
  - 从 `Nion_old` 迁入并裁剪为当前桌面架构可用的本地检索模型下载管理器
- Modify: `desktop/src/main/index.ts` 或当前 IPC 注册入口
  - 暴露 retrieval model list/download/cancel/remove/import IPC
- Modify: `desktop/src/preload.ts`
  - 暴露 retrieval model manager 桥接能力给 renderer
- Create: `desktop/tests/retrieval-model-manager.contract.test.mjs`
  - 下载进度、模型列举、导入删除 contract

### Frontend ownership
- Modify: `frontend/src/core/api/desktop-client.ts`
  - 增加 retrieval local model desktop bridge 类型
- Modify: `frontend/src/core/retrieval-models/types.ts`
  - status / active / test / local catalog / download progress 正式类型
- Modify: `frontend/src/core/retrieval-models/api.ts`
  - status / active / test / rebuild 适配新的本地 / API payload
- Modify: `frontend/src/core/retrieval-models/hooks.ts`
  - retrieval status + desktop local manager 数据拉取 / mutation hooks
- Modify: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
  - 恢复双模式页面结构；删掉“影响模块”主卡，保留更轻的说明
- Modify: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.tsx`
  - 简洁推荐组合，支持“应用本地推荐 / 应用 API 推荐”
- Modify: `frontend/src/components/workspace/settings/retrieval-embedding-card.tsx`
  - 增加本地 / API 模式切换与对应控件
- Modify: `frontend/src/components/workspace/settings/retrieval-reranker-card.tsx`
  - 增加本地 / API 模式切换与对应控件
- Modify: `frontend/src/components/workspace/settings/retrieval-consumers-card.tsx`
  - 降级成次级说明区块，或内联合并到页面底部
- Modify: `frontend/src/core/retrieval-models/api.test.ts`
- Modify: `frontend/src/components/workspace/settings/retrieval-models-section.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts`

### Documentation ownership
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`
- Modify: `docs/superpowers/specs/2026-04-15-retrieval-models-center-design.md`
  - 把“本地模型未实现”更新为“本地 / API 双模式恢复”

---

### Task 1: 冻结 retrieval models 双模式合同

**Files:**
- Modify: `backend/packages/harness/nion/retrieval/models/settings.py`
- Modify: `backend/tests/test_retrieval_models_router.py`
- Modify: `frontend/src/core/retrieval-models/api.test.ts`

- [ ] **Step 1: 写后端失败测试，锁定 active profile 支持本地 / API 双模式**
- [ ] **Step 2: 写前端失败测试，锁定 status payload 包含本地模型 catalog / active provider / api_key_configured / capability**
- [ ] **Step 3: 扩展 backend retrieval settings schema，支持 `embedding.provider in {local_onnx, openai_compatible}` 与 `reranker.provider in {local_onnx, rerank_api}`**
- [ ] **Step 4: 扩展 frontend retrieval types/api validator，匹配新的双模式 payload**
- [ ] **Step 5: 跑 targeted tests，确认先红后绿**
- [ ] **Step 6: 提交**

### Task 2: 迁回本地模型 catalog 与推荐组合

**Files:**
- Create: `backend/packages/harness/nion/retrieval/models/local_catalog.py`
- Modify: `backend/packages/harness/nion/retrieval/models/status_service.py`
- Modify: `backend/tests/test_retrieval_models_router.py`

- [ ] **Step 1: 从 `Nion_old/backend/src/retrieval_models/service.py` 提炼本地模型规格与 pack 定义，迁入新的 focused catalog 文件**
- [ ] **Step 2: 在 status route 暴露 `local_models`, `local_packs`, `recommended_profiles`**
- [ ] **Step 3: 明确 active profile 当前使用的是 `local_onnx` 还是远端 provider**
- [ ] **Step 4: 跑 router tests**
- [ ] **Step 5: 提交**

### Task 3: 接入桌面本地模型管理器

**Files:**
- Create: `desktop/src/main/retrieval-model-manager.ts`
- Modify: `desktop/src/main/*ipc*`
- Modify: `desktop/src/preload.ts`
- Create: `desktop/tests/retrieval-model-manager.contract.test.mjs`

- [ ] **Step 1: 从 `Nion_old/desktop/electron/src/retrieval-model-manager.ts` 迁入下载管理主链，裁掉无关运行时依赖，只保留 list/download/cancel/remove/import/progress**
- [ ] **Step 2: 统一下载目录到当前应用数据目录下的 retrieval model data 目录**
- [ ] **Step 3: 暴露 preload bridge：列举模型、下载 pack、下载单模型、取消、删除、导入、订阅进度**
- [ ] **Step 4: 写 contract test 锁定 IPC surface**
- [ ] **Step 5: 提交**

### Task 4: 把后端 rebuild / test 行为接到双模式主链

**Files:**
- Modify: `backend/packages/harness/nion/retrieval/models/service.py`
- Modify: `backend/packages/harness/nion/memory/search_fusion/vector_search.py`
- Modify: `backend/packages/harness/nion/memory/embedding/index_service.py`
- Modify: `backend/tests/test_memory_vector_search.py`
- Modify: `backend/tests/test_vector_search.py`

- [ ] **Step 1: 本地模式下，若模型未就绪，test/rebuild 返回明确错误，不得打空 URL**
- [ ] **Step 2: 本地模式下，vector search 在 runtime 未恢复前继续 lexical fallback，并明确记录为 best-effort**
- [ ] **Step 3: 远端模式保持现有 save/test/rebuild 行为**
- [ ] **Step 4: 跑 targeted pytest**
- [ ] **Step 5: 提交**

### Task 5: 前端恢复本地 / API 双模式 UI

**Files:**
- Modify: `frontend/src/core/api/desktop-client.ts`
- Modify: `frontend/src/core/retrieval-models/hooks.ts`
- Modify: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
- Modify: `frontend/src/components/workspace/settings/retrieval-embedding-card.tsx`
- Modify: `frontend/src/components/workspace/settings/retrieval-reranker-card.tsx`
- Modify: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.tsx`

- [ ] **Step 1: 页面结构收敛为现有设置页语言，不再有大 hero 和“影响模块”主卡**
- [ ] **Step 2: Embedding 区块增加 `本地模型 / API` 切换；本地模式下展示本地模型列表、下载、导入、删除、进度**
- [ ] **Step 3: Reranker 区块同样增加 `本地模型 / API` 切换**
- [ ] **Step 4: 推荐组合只保留简洁摘要，并能直接套用“中文本地推荐 / 英文本地推荐 / API 推荐”**
- [ ] **Step 5: `影响模块` 降为一句次级说明，或者并入页面底部说明区，不再单独占一块大 card**
- [ ] **Step 6: 保留真实 save/test/rebuild action，不得再出现假按钮**
- [ ] **Step 7: 跑 frontend contracts**
- [ ] **Step 8: 提交**

### Task 6: 文档与验收

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`
- Modify: `docs/superpowers/specs/2026-04-15-retrieval-models-center-design.md`

- [ ] **Step 1: 更新 owner 口径，明确 `Settings > 检索模型` 支持 `本地 / API` 双模式**
- [ ] **Step 2: 更新测试索引与桌面桥接 contract 说明**
- [ ] **Step 3: 跑后端 targeted pytest + 前端 contracts**
- [ ] **Step 4: 浏览器级验收：检查设置里的检索模型独立菜单、本地模式 UI、API 模式 UI、Memory 跳转、Knowledge 提示**
- [ ] **Step 5: 提交**
