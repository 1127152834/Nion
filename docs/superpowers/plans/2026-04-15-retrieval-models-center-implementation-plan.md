# 检索模型中心 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把向量模型 / 重排序模型能力从 `Settings > 记忆` 迁到 `Settings > 模型 > 检索模型`，让 Memory 与 Knowledge Base 成为统一的检索能力消费者。

**Architecture:** phase 1 采用“单一 active retrieval profile + 多 consumer 独立索引 namespace”的保守方案。前端先在模型管理中增加检索模型中心，Memory 设置页收口为状态投影；后端通过 retrieval-models surface 暴露统一的配置、状态、测试与 consumer rebuild 能力，并让旧 `/api/memory/settings` 进入 compat projection 期。

**Tech Stack:** FastAPI, Pydantic, TanStack Query, Next.js/React, node:test contract tests, pytest

---

## File Structure

### Backend ownership

- Create: `backend/app/gateway/routers/retrieval_models.py`
  - retrieval models 的正式 product API owner
  - 暴露 status / recommendation / assets / active / test / rebuild-consumer-indexes
- Create: `backend/packages/harness/nion/retrieval/models/status_service.py`
  - 聚合 provider、active profile、consumer 状态的 read model
- Create: `backend/packages/harness/nion/retrieval/models/settings.py`
  - retrieval profile / provider config schema
- Create: `backend/packages/harness/nion/retrieval/models/settings_repository.py`
  - retrieval models 配置持久化 owner
- Create: `backend/packages/harness/nion/retrieval/models/consumer_registry.py`
  - 记录 Memory / Knowledge Base 等 consumer 及其 rebuild target
- Modify: `backend/app/gateway/app.py`
  - 注册 retrieval models router
- Modify: `backend/app/daemon/app.py`
  - 保证 desktop local daemon 复用同一路由 surface
- Modify: `backend/app/gateway/routers/memory_settings.py`
  - 降级成 compat projection / redirect-oriented surface
- Modify: `backend/packages/harness/nion/memory/search_fusion/vector_search.py`
  - 改读 retrieval models active profile，而不是 memory 私 settings
- Modify: `backend/packages/harness/nion/memory/embedding/index_service.py`
  - 改为使用 retrieval models profile / consumer-aware rebuild

### Frontend ownership

- Create: `frontend/src/core/retrieval-models/types.ts`
  - retrieval models center 的正式类型
- Create: `frontend/src/core/retrieval-models/api.ts`
  - retrieval models 新 API 客户端
- Create: `frontend/src/core/retrieval-models/hooks.ts`
  - retrieval models query / mutation hooks
- Create: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
  - 模型管理中的检索模型中心主容器
- Create: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.tsx`
  - 推荐组合卡
- Create: `frontend/src/components/workspace/settings/retrieval-embedding-card.tsx`
  - 向量模型卡
- Create: `frontend/src/components/workspace/settings/retrieval-reranker-card.tsx`
  - 重排序模型卡
- Create: `frontend/src/components/workspace/settings/retrieval-consumers-card.tsx`
  - Memory / Knowledge Base consumer 状态卡
- Modify: `frontend/src/components/workspace/settings/model-settings-page.tsx`
  - 在模型页加入 `检索模型` 子视图
- Modify: `frontend/src/components/workspace/settings/configuration/sections/models-section.tsx`
  - 视图 tab 扩展到 retrieval child view
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
  - 收口为状态页 + 跳转入口
- Modify: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
  - 降级为 compat status projection，最终可删除
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
  - 增加 retrieval capability 提示区块

### Tests

- Create: `backend/tests/test_retrieval_models_router.py`
- Create: `backend/tests/test_retrieval_models_status_service.py`
- Create: `backend/tests/test_retrieval_models_settings_repository.py`
- Create: `frontend/src/components/workspace/settings/retrieval-models-section.contract.test.ts`
- Create: `frontend/src/core/retrieval-models/api.test.ts`
- Modify: `backend/tests/test_memory_settings_router.py`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Modify: `frontend/src/components/workspace/settings/models-section.navigation.test.ts`

---

### Task 1: 冻结 retrieval models 的 phase-1 合同

**Files:**
- Create: `backend/packages/harness/nion/retrieval/models/settings.py`
- Create: `backend/tests/test_retrieval_models_settings_repository.py`
- Create: `backend/packages/harness/nion/retrieval/models/settings_repository.py`

- [ ] **Step 1: 写 phase-1 retrieval profile 的失败测试**

```python
from nion.retrieval.models.settings import RetrievalModelsSettings


def test_retrieval_models_settings_defaults_to_single_remote_profile() -> None:
    settings = RetrievalModelsSettings()

    assert settings.active.embedding.mode == "remote_managed"
    assert settings.active.reranker.mode in {"local_managed", "remote_managed"}
    assert settings.consumer_policy.allow_per_consumer_override is False
    assert settings.consumer_policy.profile_version == 1
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_settings_repository.py -q`
Expected: FAIL with module or symbol not found.

- [ ] **Step 3: 写最小 settings schema**

```python
from pydantic import BaseModel, Field


class RetrievalEmbeddingProfile(BaseModel):
    mode: str = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "text-embedding-3-large"
    dimensions: int = 3072


class RetrievalRerankerProfile(BaseModel):
    mode: str = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "bge-reranker-large"


class RetrievalActiveProfile(BaseModel):
    embedding: RetrievalEmbeddingProfile = Field(default_factory=RetrievalEmbeddingProfile)
    reranker: RetrievalRerankerProfile = Field(default_factory=RetrievalRerankerProfile)


class RetrievalConsumerPolicy(BaseModel):
    allow_per_consumer_override: bool = False
    profile_version: int = 1


class RetrievalModelsSettings(BaseModel):
    active: RetrievalActiveProfile = Field(default_factory=RetrievalActiveProfile)
    consumer_policy: RetrievalConsumerPolicy = Field(default_factory=RetrievalConsumerPolicy)
```

- [ ] **Step 4: 写 repository 最小实现**

```python
import json
from pathlib import Path

from nion.retrieval.models.settings import RetrievalModelsSettings


class RetrievalModelsSettingsRepository:
    def __init__(self, base_dir: str | Path) -> None:
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "retrieval-models" / "settings.json"

    def load(self) -> RetrievalModelsSettings:
        if not self._path.exists():
            return RetrievalModelsSettings()
        return RetrievalModelsSettings.model_validate(
            json.loads(self._path.read_text(encoding="utf-8"))
        )

    def save(self, settings: RetrievalModelsSettings) -> RetrievalModelsSettings:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(settings.model_dump_json(indent=2), encoding="utf-8")
        return settings
```

- [ ] **Step 5: 运行测试确认通过**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_settings_repository.py -q`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add backend/packages/harness/nion/retrieval/models/settings.py backend/packages/harness/nion/retrieval/models/settings_repository.py backend/tests/test_retrieval_models_settings_repository.py
git commit -m "feat: add retrieval models settings contract"
```

### Task 2: 建 retrieval models status read model

**Files:**
- Create: `backend/packages/harness/nion/retrieval/models/consumer_registry.py`
- Create: `backend/packages/harness/nion/retrieval/models/status_service.py`
- Create: `backend/tests/test_retrieval_models_status_service.py`

- [ ] **Step 1: 写失败测试，锁定 consumer summary 与 active profile 输出**

```python
from nion.retrieval.models.status_service import build_retrieval_models_status


def test_build_retrieval_models_status_returns_active_profile_and_consumers(tmp_path) -> None:
    payload = build_retrieval_models_status(base_dir=tmp_path)

    assert payload["active_profile"]["embedding"]["mode"] == "remote_managed"
    assert payload["consumers"][0]["consumer_id"] == "memory"
    assert payload["consumers"][1]["consumer_id"] == "knowledge_base"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_status_service.py -q`
Expected: FAIL with module or function not found.

- [ ] **Step 3: 写 consumer registry**

```python
CONSUMER_REGISTRY = [
    {
        "consumer_id": "memory",
        "label": "Memory",
        "supports_vector": True,
    },
    {
        "consumer_id": "knowledge_base",
        "label": "Knowledge Base",
        "supports_vector": True,
    },
]
```

- [ ] **Step 4: 写 status service 最小实现**

```python
from pathlib import Path

from nion.retrieval.models.consumer_registry import CONSUMER_REGISTRY
from nion.retrieval.models.settings_repository import RetrievalModelsSettingsRepository


def build_retrieval_models_status(*, base_dir: Path) -> dict[str, object]:
    settings = RetrievalModelsSettingsRepository(base_dir).load()
    return {
        "active_profile": settings.model_dump(mode="json")["active"],
        "consumers": [
            {**consumer, "index_state": "unknown", "rebuild_required": False}
            for consumer in CONSUMER_REGISTRY
        ],
    }
```

- [ ] **Step 5: 运行测试确认通过**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_status_service.py -q`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add backend/packages/harness/nion/retrieval/models/consumer_registry.py backend/packages/harness/nion/retrieval/models/status_service.py backend/tests/test_retrieval_models_status_service.py
git commit -m "feat: add retrieval models status read model"
```

### Task 3: 增加 retrieval models router

**Files:**
- Create: `backend/app/gateway/routers/retrieval_models.py`
- Create: `backend/tests/test_retrieval_models_router.py`
- Modify: `backend/app/gateway/app.py`
- Modify: `backend/app/daemon/app.py`

- [ ] **Step 1: 写失败测试，锁定 status route 与 rebuild gate**

```python
from fastapi.testclient import TestClient

from app.gateway.app import create_app
from nion.config.paths import reset_paths


def test_retrieval_models_router_exposes_status(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/retrieval-models/status")

    assert response.status_code == 200
    assert response.json()["active_profile"]["embedding"]["mode"] == "remote_managed"
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_router.py -q`
Expected: FAIL with 404 or import error.

- [ ] **Step 3: 写 router 最小实现**

```python
from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.retrieval.models.status_service import build_retrieval_models_status

router = APIRouter(prefix="/api/retrieval-models", tags=["memory"])


@router.get("/status")
async def get_retrieval_models_status() -> dict[str, object]:
    return build_retrieval_models_status(base_dir=get_paths().base_dir)
```

- [ ] **Step 4: 在 gateway runtime app 中注册 retrieval models router**

```python
# 在 create_runtime_app 注册现有 routers 的位置旁边加入：
from app.gateway.routers import retrieval_models

app.include_router(retrieval_models.router)
```

- [ ] **Step 5: 在 desktop local daemon surface 中确保共享同一路由**

```python
# 当前 `backend/app/daemon/app.py` 复用 `create_runtime_app(...)`。
# 这里必须补一条 daemon 可达性测试，而不是写一句“看情况”：
#
# def test_local_daemon_exposes_retrieval_models_status():
#     with TestClient(create_app()) as client:
#         response = client.get("/api/retrieval-models/status")
#     assert response.status_code == 200
```

- [ ] **Step 6: 运行测试确认通过**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_router.py -q`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add backend/app/gateway/routers/retrieval_models.py backend/app/gateway/app.py backend/app/daemon/app.py backend/tests/test_retrieval_models_router.py
git commit -m "feat: add retrieval models status router"
```

### Task 4: 把 Memory settings 收口成状态投影

**Files:**
- Modify: `backend/app/gateway/routers/memory_settings.py`
- Modify: `backend/tests/test_memory_settings_router.py`

- [ ] **Step 1: 写失败测试，锁定 memory settings 只保留状态和跳转级 payload**

```python
def test_memory_settings_router_returns_projection_only(monkeypatch, tmp_path) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    reset_paths()

    with TestClient(create_app()) as client:
        response = client.get("/api/memory/settings")

    assert response.status_code == 200
    payload = response.json()
    assert "retrieval_status" in payload
    assert "jump_target" in payload
    assert "remote_config" not in payload
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_memory_settings_router.py -q`
Expected: FAIL because current payload still contains config surface.

- [ ] **Step 3: 将 memory settings router 改成 compat projection**

```python
return {
    "retrieval_status": {
        "vector_enabled": payload["active_profile"]["embedding"]["mode"] == "remote_managed",
        "reranker_enabled": payload["active_profile"]["reranker"]["mode"] in {"local_managed", "remote_managed"},
        "detail": "检索模型配置已迁移到模型管理中的检索模型中心。",
    },
    "index_health": {
        "state": "unknown",
        "detail": "索引健康状态来自 retrieval models consumer projection。",
        "record_count": 0,
        "last_rebuild_at": None,
    },
    "jump_target": {
        "section": "models",
        "child_view": "retrieval",
    },
}
```

- [ ] **Step 4: 删除或禁用旧的 config write actions**

```python
# PATCH /download /rebuild 改成 409 或 redirect-oriented error，提示到新 retrieval models surface。
raise HTTPException(status_code=409, detail="请前往模型管理中的检索模型中心进行配置。")
```

- [ ] **Step 5: 运行测试确认通过**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_memory_settings_router.py -q`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add backend/app/gateway/routers/memory_settings.py backend/tests/test_memory_settings_router.py
git commit -m "refactor: reduce memory settings to retrieval status projection"
```

### Task 5: 前端建立 retrieval models 数据层

**Files:**
- Create: `frontend/src/core/retrieval-models/types.ts`
- Create: `frontend/src/core/retrieval-models/api.ts`
- Create: `frontend/src/core/retrieval-models/hooks.ts`
- Create: `frontend/src/core/retrieval-models/api.test.ts`

- [ ] **Step 1: 写失败测试，锁定 status payload adapter**

```ts
import assert from "node:assert/strict";
import test from "node:test";

const { loadRetrievalModelsStatus } = await import(new URL("./api.ts", import.meta.url).href);

void test("loadRetrievalModelsStatus validates the retrieval models payload", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ active_profile: { embedding: { mode: "remote_managed" } }, consumers: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  try {
    const result = await loadRetrievalModelsStatus();
    assert.equal(result.active_profile.embedding.mode, "remote_managed");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/core/retrieval-models/api.test.ts`
Expected: FAIL with module not found.

- [ ] **Step 3: 写 types**

```ts
export interface RetrievalEmbeddingProfile {
  mode: "remote_managed";
  endpoint: string;
  model_name: string;
  dimensions: number;
}

export interface RetrievalRerankerProfile {
  mode: "local_managed" | "remote_managed";
  model_name: string;
}

export interface RetrievalModelsStatusResponse {
  active_profile: {
    embedding: RetrievalEmbeddingProfile;
    reranker: RetrievalRerankerProfile;
  };
  consumers: Array<{
    consumer_id: string;
    label: string;
    index_state: string;
    rebuild_required: boolean;
  }>;
}
```

- [ ] **Step 4: 写 api/hook 最小实现**

```ts
export async function loadRetrievalModelsStatus(): Promise<RetrievalModelsStatusResponse> {
  const response = await fetch(`${getBackendBaseURL()}/api/retrieval-models/status`);
  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(`Failed to load retrieval models status (${response.status})`);
  if (!isRetrievalModelsStatusResponse(payload)) throw new Error("Invalid retrieval models payload");
  return payload;
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/core/retrieval-models/api.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add frontend/src/core/retrieval-models/types.ts frontend/src/core/retrieval-models/api.ts frontend/src/core/retrieval-models/hooks.ts frontend/src/core/retrieval-models/api.test.ts
git commit -m "feat: add retrieval models frontend data layer"
```

### Task 6: 在模型页增加“检索模型”子视图

**Files:**
- Modify: `frontend/src/components/workspace/settings/model-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/configuration/sections/models-section.tsx`
- Create: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
- Modify: `frontend/src/components/workspace/settings/models-section.navigation.test.ts`
- Create: `frontend/src/components/workspace/settings/retrieval-models-section.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定模型页新增 retrieval child view**

```ts
void test("model settings page registers retrieval as a child view", async () => {
  const source = await readFile(new URL("./model-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /检索模型|Retrieval/);
  assert.match(source, /retrieval/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/models-section.navigation.test.ts src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: FAIL because retrieval child view does not exist yet.

- [ ] **Step 3: 扩展 ModelSettingsChildView 类型与 tab**

```ts
export type ModelSettingsChildView = "providers" | "models" | "retrieval";
```

```tsx
{
  id: "retrieval",
  label: isZh ? "检索模型" : "Retrieval",
  subtitle: isZh ? "向量与重排序" : "Embedding and rerank",
  count: 2,
  icon: SparklesIcon,
}
```

- [ ] **Step 4: 写 retrieval-models-section 最小实现**

```tsx
export function RetrievalModelsSection() {
  const { data, isLoading, error } = useRetrievalModelsStatus();
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <h3 className="text-sm font-semibold">检索模型</h3>
      {isLoading ? <div>正在读取检索模型状态...</div> : null}
      {error ? <div>{error.message}</div> : null}
      {data ? <div>{data.active_profile.embedding.model_name}</div> : null}
    </section>
  );
}
```

- [ ] **Step 5: 在模型页条件渲染 retrieval section**

```tsx
{activeView === "retrieval" ? <RetrievalModelsSection /> : null}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/models-section.navigation.test.ts src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add frontend/src/components/workspace/settings/model-settings-page.tsx frontend/src/components/workspace/settings/configuration/sections/models-section.tsx frontend/src/components/workspace/settings/retrieval-models-section.tsx frontend/src/components/workspace/settings/models-section.navigation.test.ts frontend/src/components/workspace/settings/retrieval-models-section.contract.test.ts
git commit -m "feat: add retrieval child view under model settings"
```

### Task 7: 把现有 Memory 设置页降级为状态 + 跳转

**Files:**
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.config.test.ts`
- Modify: `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定 Memory 设置页只剩状态与跳转**

```ts
void test("memory settings page no longer owns retrieval model configuration", async () => {
  const source = await readFile(new URL("./memory-settings-page.tsx", import.meta.url), "utf8");
  assert.match(source, /检索增强状态|前往模型管理/);
  assert.doesNotMatch(source, /endpoint|API Key|向量维度|保存接口配置/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/memory-settings-page.config.test.ts src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
Expected: FAIL because current page still owns retrieval config.

- [ ] **Step 3: 重写 memory settings page 为状态投影**

```tsx
export function MemorySettingsPage() {
  return (
    <SettingsSection title={t.settings.memory.title} description="这里只看记忆检索增强状态。">
      <MemoryEmbeddingPanel />
      <Button type="button" variant="outline" onClick={() => window.dispatchEvent(new CustomEvent("nion-open-settings", { detail: { section: "models" } }))}>
        前往模型管理中的检索模型
      </Button>
    </SettingsSection>
  );
}
```

- [ ] **Step 4: 重写 memory-embedding-panel 为 status-only 卡片**

```tsx
export function MemoryEmbeddingPanel() {
  const { settings } = useMemorySettings();
  return (
    <section className="space-y-4 rounded-xl border p-4">
      <div className="text-sm font-semibold">检索增强状态</div>
      <div>{settings.retrieval_status.detail}</div>
      <div>{settings.index_health.detail}</div>
    </section>
  );
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/memory-settings-page.config.test.ts src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components/workspace/settings/memory-settings-page.tsx frontend/src/components/workspace/settings/memory-embedding-panel.tsx frontend/src/components/workspace/settings/memory-settings-page.config.test.ts frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts
git commit -m "refactor: reduce memory settings page to retrieval status"
```

### Task 8: 在检索模型中心实现推荐组合与基础 consumer 状态

**Files:**
- Modify: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
- Create: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.tsx`
- Create: `frontend/src/components/workspace/settings/retrieval-consumers-card.tsx`
- Create: `frontend/src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定推荐组合和 consumer 状态卡存在**

```ts
void test("retrieval models section leads with recommendation and consumer status", async () => {
  const source = await readFile(new URL("./retrieval-models-section.tsx", import.meta.url), "utf8");
  assert.match(source, /RetrievalRecommendedStackCard/);
  assert.match(source, /RetrievalConsumersCard/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: FAIL because cards do not exist yet.

- [ ] **Step 3: 写推荐组合卡**

```tsx
export function RetrievalRecommendedStackCard({
  embeddingModel,
  rerankerModel,
  consumerCount,
}: {
  embeddingModel: string;
  rerankerModel: string;
  consumerCount: number;
}) {
  return (
    <section className="rounded-xl border p-4">
      <div className="text-sm font-semibold">推荐组合</div>
      <div>{embeddingModel}</div>
      <div>{rerankerModel}</div>
      <div>覆盖 {consumerCount} 个消费者</div>
    </section>
  );
}
```

- [ ] **Step 4: 写 consumers card**

```tsx
export function RetrievalConsumersCard({
  consumers,
}: {
  consumers: Array<{ consumer_id: string; label: string; index_state: string; rebuild_required: boolean }>;
}) {
  return (
    <section className="rounded-xl border p-4">
      <div className="text-sm font-semibold">消费方</div>
      {consumers.map((consumer) => (
        <div key={consumer.consumer_id}>{consumer.label}</div>
      ))}
    </section>
  );
}
```

- [ ] **Step 5: 组装 retrieval models section**

```tsx
<RetrievalRecommendedStackCard
  embeddingModel={status.active_profile.embedding.model_name}
  rerankerModel={status.active_profile.reranker.model_name}
  consumerCount={status.consumers.length}
/>
<RetrievalConsumersCard consumers={status.consumers} />
```

- [ ] **Step 6: 运行测试确认通过**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add frontend/src/components/workspace/settings/retrieval-models-section.tsx frontend/src/components/workspace/settings/retrieval-recommended-stack-card.tsx frontend/src/components/workspace/settings/retrieval-consumers-card.tsx frontend/src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts
git commit -m "feat: add retrieval recommendation and consumer status cards"
```

### Task 9: 实现 embedding / reranker 配置卡与 action gating

**Files:**
- Create: `frontend/src/components/workspace/settings/retrieval-embedding-card.tsx`
- Create: `frontend/src/components/workspace/settings/retrieval-reranker-card.tsx`
- Modify: `frontend/src/components/workspace/settings/retrieval-models-section.tsx`
- Modify: `backend/app/gateway/routers/retrieval_models.py`
- Modify: `backend/tests/test_retrieval_models_router.py`

- [ ] **Step 1: 写失败测试，锁定 remote-only 与 status-only gating 行为**

```ts
void test("retrieval embedding card can render disabled actions when runtime capability is incomplete", async () => {
  const source = await readFile(new URL("./retrieval-embedding-card.tsx", import.meta.url), "utf8");
  assert.match(source, /status-only|beta|暂未开放/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: FAIL because cards and gating copy do not exist.

- [ ] **Step 3: 在 router 增加 capability gating 字段**

```python
return {
    "active_profile": {
        "embedding": settings.model_dump(mode="json")["active"]["embedding"],
        "reranker": settings.model_dump(mode="json")["active"]["reranker"],
    },
    "consumers": [
        {
            "consumer_id": consumer["consumer_id"],
            "label": consumer["label"],
            "index_state": "unknown",
            "rebuild_required": False,
        }
        for consumer in CONSUMER_REGISTRY
    ],
    "capability": {
        "local_prepare_enabled": False,
        "remote_config_enabled": True,
        "test_enabled": False,
        "rebuild_enabled": False,
        "status_only": True,
    },
}
```

- [ ] **Step 4: 写 embedding / reranker 卡片，按 capability 决定动作是否可用**

```tsx
<Button disabled={status.capability.status_only}>一键准备</Button>
{status.capability.status_only ? <div>当前只开放状态查看，完整动作会在 runtime 补齐后开放。</div> : null}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `backend/.venv/bin/python -m pytest backend/tests/test_retrieval_models_router.py -q && ./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/settings/retrieval-models-section.contract.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add backend/app/gateway/routers/retrieval_models.py backend/tests/test_retrieval_models_router.py frontend/src/components/workspace/settings/retrieval-embedding-card.tsx frontend/src/components/workspace/settings/retrieval-reranker-card.tsx frontend/src/components/workspace/settings/retrieval-models-section.tsx
git commit -m "feat: add retrieval model cards with capability gating"
```

### Task 10: 将 Knowledge Base 接成 retrieval consumer 状态源

**Files:**
- Modify: `backend/packages/harness/nion/retrieval/models/consumer_registry.py`
- Modify: `frontend/src/components/workspace/knowledge/knowledge-home-page.tsx`
- Create: `frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`

- [ ] **Step 1: 写失败测试，锁定 knowledge page 展示 retrieval capability hint**

```ts
void test("knowledge home page can point users to retrieval models when semantic retrieval is unavailable", async () => {
  const source = await readFile(new URL("./knowledge-home-page.tsx", import.meta.url), "utf8");
  assert.match(source, /检索模型|retrieval/);
});
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
Expected: FAIL because hint does not exist yet.

- [ ] **Step 3: 在 consumer registry 明确保留 knowledge_base consumer**

```python
CONSUMER_REGISTRY = [
    {"consumer_id": "memory", "label": "Memory", "supports_vector": True},
    {"consumer_id": "knowledge_base", "label": "Knowledge Base", "supports_vector": True},
]
```

- [ ] **Step 4: 在 knowledge home page 增加 retrieval hint 区块**

```tsx
<section>
  <div>语义检索增强</div>
  <div>前往模型管理中的检索模型完成配置。</div>
</section>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `./scripts/pnpm.sh --dir frontend test:contracts -- src/components/workspace/knowledge/knowledge-home-page.contract.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add backend/packages/harness/nion/retrieval/models/consumer_registry.py frontend/src/components/workspace/knowledge/knowledge-home-page.tsx frontend/src/components/workspace/knowledge/knowledge-home-page.contract.test.ts
git commit -m "feat: expose retrieval capability hint to knowledge base"
```

### Task 11: 文档与 compat 清理

**Files:**
- Modify: `README.md`
- Modify: `backend/CLAUDE.md`
- Modify: `docs/test/README.md`
- Modify: `docs/superpowers/plans/2026-04-15-retrieval-models-center-implementation-plan.md`

- [ ] **Step 1: 更新 README 中 retrieval ownership 文案**

```md
- 向量模型与重排序模型已迁入 `Settings > 模型 > 检索模型`
- `Settings > 记忆` 只保留检索增强状态投影
- `Memory` 与 `Knowledge Base` 共用 single active retrieval profile
```

- [ ] **Step 2: 更新 backend/CLAUDE 合同**

```md
- Product-facing retrieval model ownership now lives under retrieval-models surface, not memory settings
- `/api/memory/settings` is compatibility projection only until final cleanup
```

- [ ] **Step 3: 更新 docs/test/README 索引**

```md
- 增加 retrieval models center 的测试与 dogfood 入口
```

- [ ] **Step 4: 运行轻量检查**

Run: `rg -n "local_managed|Memory Settings.*embedding|retrieval private to memory" README.md backend/CLAUDE.md docs/test/README.md`
Expected: no outdated product claims.

- [ ] **Step 5: 提交**

```bash
git add README.md backend/CLAUDE.md docs/test/README.md
git commit -m "docs: align retrieval model ownership with model settings"
```

### Task 12: 最终验证与收口

**Files:**
- Verify only

- [ ] **Step 1: 运行 backend retrieval suite**

Run:
```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_retrieval_models_settings_repository.py \
  backend/tests/test_retrieval_models_status_service.py \
  backend/tests/test_retrieval_models_router.py \
  backend/tests/test_memory_settings_router.py \
  backend/tests/test_memory_vector_search.py \
  backend/tests/test_vector_search.py -q
```
Expected: all pass.

- [ ] **Step 2: 运行 frontend contracts**

Run:
```bash
./scripts/pnpm.sh --dir frontend test:contracts -- \
  src/core/retrieval-models/api.test.ts \
  src/components/workspace/settings/retrieval-models-section.contract.test.ts \
  src/components/workspace/settings/retrieval-recommended-stack-card.contract.test.ts \
  src/components/workspace/settings/memory-settings-page.config.test.ts \
  src/components/workspace/knowledge/knowledge-home-page.contract.test.ts
```
Expected: all pass.

- [ ] **Step 3: 运行 frontend typecheck**

Run: `rm -rf frontend/.next && ./scripts/pnpm.sh --dir frontend typecheck`
Expected: pass; if unrelated pre-existing worktree errors remain, document them explicitly before any completion claim.

- [ ] **Step 4: 浏览器级验证**

Run a browser check against:
- `Settings > 模型 > 检索模型`
- `Settings > 记忆`
- `Knowledge Base` 首页

Capture:
- 检索模型中心主视图截图
- Memory 设置状态页截图
- Knowledge Base retrieval hint 截图

- [ ] **Step 5: 最终提交**

```bash
git add -A
git commit -m "feat: move retrieval model ownership into model settings"
```
