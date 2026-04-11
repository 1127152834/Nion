# Memory / Soul Vector System Product Closure (Subproject B) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把当前假完成的 embedding / vector 骨架建设成一个真实可用、可配置、可构建、可查询、可进入 Memory 主链的向量系统，范围限定为结构化长期记忆。

**Architecture:** 子项目 B 采用“本地向量库 + 本地/远端 embedding provider”的双模式方案。`local_managed` 使用本地下载的 `BAAI/bge-m3` 生成 embedding，`remote_managed` 使用远端 URL embedding endpoint；两者都写入同一个 canonical local vector store，并通过显式 rebuild 和运行时检索主链进入 Memory 主链。`custom_compatible`、`evidence_chunks`、`episode` 和 `recall` 向量化明确延期。

**Tech Stack:** Python, FastAPI, DuckDB, sentence-transformers, huggingface-hub, httpx, React, TypeScript, node:test, pytest

---

## File Map

### Dependencies and provider/config foundation

- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/packages/harness/nion/memory/embedding/settings.py`
- Create: `backend/packages/harness/nion/memory/embedding/settings_repository.py`
- Create: `backend/packages/harness/nion/memory/embedding/provider_factory.py`
- Create: `backend/packages/harness/nion/memory/embedding/local_provider.py`
- Create: `backend/packages/harness/nion/memory/embedding/remote_provider.py`
- Create: `backend/tests/test_memory_embedding_local_provider.py`
- Create: `backend/tests/test_memory_embedding_remote_provider.py`

### Local vector store and index management

- Modify: `backend/packages/harness/nion/memory/embedding/vector_store.py`
- Create: `backend/packages/harness/nion/memory/embedding/duckdb_store.py`
- Create: `backend/packages/harness/nion/memory/embedding/download_manager.py`
- Create: `backend/packages/harness/nion/memory/embedding/index_service.py`
- Create: `backend/tests/test_memory_vector_store_duckdb.py`
- Create: `backend/tests/test_memory_embedding_download_manager.py`
- Create: `backend/tests/test_memory_embedding_index_service.py`

### Production search integration

- Create: `backend/packages/harness/nion/memory/search_fusion/vector_search.py`
- Create: `backend/packages/harness/nion/memory/search_fusion/structured_search_service.py`
- Modify: `backend/packages/harness/nion/memory/search_fusion/service.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Create: `backend/tests/test_memory_vector_search.py`
- Create: `backend/tests/test_structured_memory_search_service.py`
- Modify: `backend/tests/test_memory_search_fusion.py`
- Modify: `backend/tests/test_runtime_memory_engine.py`

### Product surface

- Modify: `backend/app/gateway/routers/memory_settings.py`
- Modify: `backend/tests/test_memory_settings_router.py`
- Modify: `frontend/src/core/memory-settings/types.ts`
- Modify: `frontend/src/core/memory-settings/api.ts`
- Modify: `frontend/src/core/memory-settings/hooks.ts`
- Create: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Create: `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`

### Acceptance

- Create/Modify: `artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/report.md`

## Task 1: Land Real Embedding Providers and Settings

**Files:**
- Modify: `backend/packages/harness/pyproject.toml`
- Create: `backend/packages/harness/nion/memory/embedding/settings.py`
- Create: `backend/packages/harness/nion/memory/embedding/settings_repository.py`
- Create: `backend/packages/harness/nion/memory/embedding/provider_factory.py`
- Create: `backend/packages/harness/nion/memory/embedding/local_provider.py`
- Create: `backend/packages/harness/nion/memory/embedding/remote_provider.py`
- Create: `backend/tests/test_memory_embedding_local_provider.py`
- Create: `backend/tests/test_memory_embedding_remote_provider.py`

- [ ] **Step 1: Write the failing provider tests**

```python
# backend/tests/test_memory_embedding_local_provider.py
from pathlib import Path

from nion.memory.embedding.local_provider import LocalManagedEmbeddingProvider


def test_local_provider_downloads_and_embeds_bge_m3(tmp_path: Path):
    provider = LocalManagedEmbeddingProvider(
        base_dir=tmp_path,
        model_id="BAAI/bge-m3",
        cache_key="bge-m3",
    )

    vectors = provider.embed(["财务 BP", "经营分析"])

    assert len(vectors) == 2
    assert len(vectors[0]) == 1024
    assert (tmp_path / "memory-os" / "indexes" / "vector" / "models" / "bge-m3").exists()
```

```python
# backend/tests/test_memory_embedding_remote_provider.py
from nion.memory.embedding.remote_provider import RemoteManagedEmbeddingProvider


class _HTTPXMockResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_remote_provider_calls_endpoint_and_returns_vectors(monkeypatch):
    def fake_post(url, *, headers, json, timeout):
        assert url == "https://api.example.com/v1/embeddings"
        assert headers["Authorization"] == "Bearer secret"
        assert json["model"] == "text-embedding-3-large"
        assert json["input"] == ["foo", "bar"]
        assert timeout == 30.0
        return _HTTPXMockResponse(
            {"data": [{"embedding": [0.1, 0.2]}, {"embedding": [0.3, 0.4]}]}
        )

    monkeypatch.setattr("nion.memory.embedding.remote_provider.httpx.post", fake_post)
    provider = RemoteManagedEmbeddingProvider(
        provider_id="remote-default",
        endpoint="https://api.example.com/v1/embeddings",
        api_key="secret",
        model_name="text-embedding-3-large",
        dimensions=2,
    )

    vectors = provider.embed(["foo", "bar"])

    assert vectors == [[0.1, 0.2], [0.3, 0.4]]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_embedding_local_provider.py \
  backend/tests/test_memory_embedding_remote_provider.py -q
```

Expected:

- FAIL because the real providers do not exist yet

- [ ] **Step 3: Add the required dependencies**

Update `backend/packages/harness/pyproject.toml` and add these exact entries to the existing `dependencies` list:

```toml
"sentence-transformers>=3.0.1",
"huggingface-hub>=0.24.0",
```

- [ ] **Step 4: Implement settings models and repository**

Create `backend/packages/harness/nion/memory/embedding/settings.py`:

```python
from pydantic import BaseModel


class EmbeddingSystemSettings(BaseModel):
    mode: str = "local_managed"
    local_model_id: str = "BAAI/bge-m3"
    local_model_key: str = "bge-m3"
    remote_endpoint: str = ""
    remote_api_key: str = ""
    remote_model_name: str = "text-embedding-3-large"
    remote_dimensions: int = 3072
    distance_metric: str = "cosine"
```

Create `backend/packages/harness/nion/memory/embedding/settings_repository.py`:

```python
import json
from pathlib import Path

from nion.memory.embedding.settings import EmbeddingSystemSettings


class EmbeddingSettingsRepository:
    def __init__(self, base_dir: str | Path) -> None:
        self._base_dir = Path(base_dir)

    @property
    def _path(self) -> Path:
        return self._base_dir / "memory-os" / "indexes" / "vector" / "settings.json"

    def load(self) -> EmbeddingSystemSettings:
        if not self._path.exists():
            return EmbeddingSystemSettings()
        return EmbeddingSystemSettings.model_validate(
            json.loads(self._path.read_text(encoding="utf-8"))
        )

    def save(self, settings: EmbeddingSystemSettings) -> EmbeddingSystemSettings:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        self._path.write_text(
            settings.model_dump_json(indent=2),
            encoding="utf-8",
        )
        return settings

    def update(self, patch: dict[str, object]) -> EmbeddingSystemSettings:
        current = self.load()
        next_settings = current.model_copy(
            update={key: value for key, value in patch.items() if value not in (None, "")}
        )
        return self.save(next_settings)
```

Create `backend/packages/harness/nion/memory/embedding/provider_factory.py`:

```python
from pathlib import Path

from nion.memory.embedding.local_provider import LocalManagedEmbeddingProvider
from nion.memory.embedding.remote_provider import RemoteManagedEmbeddingProvider
from nion.memory.embedding.settings import EmbeddingSystemSettings


def build_embedding_provider(*, base_dir: Path, settings: EmbeddingSystemSettings):
    if settings.mode == "local_managed":
        return LocalManagedEmbeddingProvider(
            base_dir=base_dir,
            model_id=settings.local_model_id,
            cache_key=settings.local_model_key,
        )
    return RemoteManagedEmbeddingProvider(
        provider_id="remote-default",
        endpoint=settings.remote_endpoint,
        api_key=settings.remote_api_key,
        model_name=settings.remote_model_name,
        dimensions=settings.remote_dimensions,
    )
```

- [ ] **Step 5: Implement the local provider**

Create `backend/packages/harness/nion/memory/embedding/local_provider.py`:

```python
from pathlib import Path

from sentence_transformers import SentenceTransformer

from nion.memory.embedding.local_managed import LocalManagedEmbeddingProviderMetadata


class LocalManagedEmbeddingProvider:
    provider_id = "local-default"

    def __init__(self, *, base_dir: Path, model_id: str, cache_key: str) -> None:
        self._base_dir = Path(base_dir)
        self._model_id = model_id
        self._cache_key = cache_key
        self._model_dir = (
            self._base_dir / "memory-os" / "indexes" / "vector" / "models" / cache_key
        )
        self._model: SentenceTransformer | None = None

    def metadata(self) -> LocalManagedEmbeddingProviderMetadata:
        return LocalManagedEmbeddingProviderMetadata(
            provider_id=self.provider_id,
            model_name=self._cache_key,
            dimensions=1024,
            revision="2026-04-11",
            metadata={"model_id": self._model_id, "bundle": "downloaded"},
        )

    def _ensure_model(self) -> SentenceTransformer:
        if self._model is None:
            self._model_dir.mkdir(parents=True, exist_ok=True)
            self._model = SentenceTransformer(
                self._model_id,
                cache_folder=str(self._model_dir),
            )
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        vectors = self._ensure_model().encode(texts, normalize_embeddings=True)
        return [list(map(float, row)) for row in vectors]
```

- [ ] **Step 6: Implement the remote provider**

Create `backend/packages/harness/nion/memory/embedding/remote_provider.py`:

```python
import httpx

from nion.memory.embedding.remote_managed import RemoteManagedEmbeddingProviderMetadata


class RemoteManagedEmbeddingProvider:
    def __init__(
        self,
        *,
        provider_id: str,
        endpoint: str,
        api_key: str,
        model_name: str,
        dimensions: int,
    ) -> None:
        self.provider_id = provider_id
        self._endpoint = endpoint
        self._api_key = api_key
        self._model_name = model_name
        self._dimensions = dimensions

    def metadata(self) -> RemoteManagedEmbeddingProviderMetadata:
        return RemoteManagedEmbeddingProviderMetadata(
            provider_id=self.provider_id,
            model_name=self._model_name,
            endpoint=self._endpoint,
            dimensions=self._dimensions,
            revision="2026-04-11",
            metadata={},
        )

    def embed(self, texts: list[str]) -> list[list[float]]:
        response = httpx.post(
            self._endpoint,
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={"model": self._model_name, "input": texts},
            timeout=30.0,
        )
        response.raise_for_status()
        payload = response.json()
        return [list(map(float, item["embedding"])) for item in payload["data"]]
```

- [ ] **Step 7: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_embedding_local_provider.py \
  backend/tests/test_memory_embedding_remote_provider.py -q
```

Expected:

- PASS

- [ ] **Step 8: Commit**

```bash
git add backend/packages/harness/pyproject.toml \
  backend/packages/harness/nion/memory/embedding/settings.py \
  backend/packages/harness/nion/memory/embedding/settings_repository.py \
  backend/packages/harness/nion/memory/embedding/provider_factory.py \
  backend/packages/harness/nion/memory/embedding/local_provider.py \
  backend/packages/harness/nion/memory/embedding/remote_provider.py \
  backend/tests/test_memory_embedding_local_provider.py \
  backend/tests/test_memory_embedding_remote_provider.py
git commit -m "Land the real local and remote embedding providers"
```

## Task 2: Land the Local Vector Store and Full Rebuild Flow

**Files:**
- Modify: `backend/packages/harness/nion/memory/embedding/vector_store.py`
- Create: `backend/packages/harness/nion/memory/embedding/duckdb_store.py`
- Create: `backend/packages/harness/nion/memory/embedding/download_manager.py`
- Create: `backend/packages/harness/nion/memory/embedding/index_service.py`
- Create: `backend/tests/test_memory_vector_store_duckdb.py`
- Create: `backend/tests/test_memory_embedding_download_manager.py`
- Create: `backend/tests/test_memory_embedding_index_service.py`

- [ ] **Step 1: Write the failing store and rebuild tests**

```python
# backend/tests/test_memory_vector_store_duckdb.py
from nion.memory.embedding.models import EmbeddingModelFingerprint, VectorIndexSnapshot
from nion.memory.embedding.vector_store import (
    VectorStoreIndexMetadata,
    VectorStoreQuery,
    VectorStoreRecord,
)
from nion.memory.embedding.duckdb_store import DuckDBVectorStore


def test_duckdb_vector_store_upserts_and_searches(tmp_path):
    snapshot = VectorIndexSnapshot(
        provider_id="local-default",
        provider_kind="local_managed",
        fingerprint=EmbeddingModelFingerprint(
            provider_key="local_managed:local-default",
            model_key="bge-m3",
            dimensions=2,
            distance_metric="cosine",
            revision="2026-04-11",
        ),
    )
    store = DuckDBVectorStore(tmp_path / "vector" / "index.duckdb")
    store.rebuild(
        target=VectorStoreIndexMetadata(provider=snapshot, record_count=2),
        records=[
            VectorStoreRecord(record_id="mem:user:1", vector=[1.0, 0.0], payload={"domain": "user_model"}),
            VectorStoreRecord(record_id="mem:user:2", vector=[0.0, 1.0], payload={"domain": "user_model"}),
        ],
    )

    hits = store.search(
        VectorStoreQuery(vector=[0.9, 0.1], limit=1, filters={"domain": "user_model"})
    )
    assert hits[0].record_id == "mem:user:1"
```

```python
# backend/tests/test_memory_embedding_index_service.py
from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory_os.repository import MemoryOSRepository


def test_index_service_rebuilds_from_structured_memory_records(tmp_path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_role",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    service = MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo)

    result = service.rebuild_full_index()

    assert result["record_count"] == 1
    assert result["manifest"]["provider"]["model_key"] == "bge-m3"
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_vector_store_duckdb.py \
  backend/tests/test_memory_embedding_index_service.py -q
```

Expected:

- FAIL because the local vector store and rebuild service do not exist yet

- [ ] **Step 3: Refactor `VectorStoreQuery` to accept vectors**

Update `backend/packages/harness/nion/memory/embedding/vector_store.py`:

```python
class VectorStoreQuery(BaseModel):
    vector: list[float]
    limit: int = 10
    filters: dict[str, Any] = Field(default_factory=dict)
```

- [ ] **Step 4: Implement `DuckDBVectorStore`**

Create `backend/packages/harness/nion/memory/embedding/duckdb_store.py`:

```python
import json
import math
from pathlib import Path

import duckdb

from nion.memory.embedding.models import VectorIndexSnapshot
from nion.memory.embedding.vector_store import (
    VectorStore,
    VectorStoreIndexMetadata,
    VectorStoreQuery,
    VectorStoreRecord,
    VectorStoreSearchHit,
)


def _cosine(left: list[float], right: list[float]) -> float:
    numerator = sum(l * r for l, r in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return numerator / (left_norm * right_norm)


class DuckDBVectorStore(VectorStore):
    def __init__(self, db_path: Path):
        self._db_path = Path(db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._ensure_schema()

    def _ensure_schema(self) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute(
                \"\"\"\n                CREATE TABLE IF NOT EXISTS vectors (\n                    record_id TEXT PRIMARY KEY,\n                    vector_json TEXT NOT NULL,\n                    payload_json TEXT NOT NULL\n                )\n                \"\"\"\n            )
            conn.execute(
                \"\"\"\n                CREATE TABLE IF NOT EXISTS index_metadata (\n                    singleton INTEGER PRIMARY KEY,\n                    snapshot_json TEXT NOT NULL,\n                    record_count INTEGER NOT NULL\n                )\n                \"\"\"\n            )

    def get_index_metadata(self) -> VectorStoreIndexMetadata | None:
        with duckdb.connect(str(self._db_path)) as conn:
            row = conn.execute(
                \"SELECT snapshot_json, record_count FROM index_metadata WHERE singleton = 1\"
            ).fetchone()
        if row is None:
            return None
        snapshot = VectorIndexSnapshot.model_validate(json.loads(row[0]))
        return VectorStoreIndexMetadata(provider=snapshot, record_count=row[1])

    def upsert(self, records: list[VectorStoreRecord]) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            for record in records:
                conn.execute(
                    \"\"\"\n                    INSERT OR REPLACE INTO vectors(record_id, vector_json, payload_json)\n                    VALUES (?, ?, ?)\n                    \"\"\"\n                    ,
                    (
                        record.record_id,
                        json.dumps(record.vector),
                        json.dumps(record.payload, ensure_ascii=False),
                    ),
                )

    def delete(self, record_ids: list[str]) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            for record_id in record_ids:
                conn.execute(\"DELETE FROM vectors WHERE record_id = ?\", (record_id,))

    def search(self, query: VectorStoreQuery) -> list[VectorStoreSearchHit]:
        with duckdb.connect(str(self._db_path)) as conn:
            rows = conn.execute(
                \"SELECT record_id, vector_json, payload_json FROM vectors\"
            ).fetchall()
        hits: list[VectorStoreSearchHit] = []
        for record_id, vector_json, payload_json in rows:
            vector = json.loads(vector_json)
            payload = json.loads(payload_json)
            if any(payload.get(key) != value for key, value in query.filters.items()):
                continue
            hits.append(
                VectorStoreSearchHit(
                    record_id=record_id,
                    score=_cosine(query.vector, vector),
                    payload=payload,
                )
            )
        hits.sort(key=lambda item: item.score, reverse=True)
        return hits[: query.limit]

    def rebuild(self, *, target: VectorStoreIndexMetadata, records: list[VectorStoreRecord]) -> None:
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute(\"DELETE FROM vectors\")
            conn.execute(\"DELETE FROM index_metadata\")
        self.upsert(records)
        with duckdb.connect(str(self._db_path)) as conn:
            conn.execute(
                \"INSERT INTO index_metadata(singleton, snapshot_json, record_count) VALUES (1, ?, ?)\",
                (json.dumps(target.provider.model_dump(mode=\"json\")), target.record_count),
            )
```

- [ ] **Step 5: Implement the download manager and index service**

Create `backend/packages/harness/nion/memory/embedding/download_manager.py`:

```python
from pathlib import Path

from sentence_transformers import SentenceTransformer


class MemoryEmbeddingDownloadManager:
    def ensure_local_model(self, *, base_dir: Path, model_id: str, model_key: str) -> Path:
        model_dir = base_dir / "memory-os" / "indexes" / "vector" / "models" / model_key
        model_dir.mkdir(parents=True, exist_ok=True)
        SentenceTransformer(model_id, cache_folder=str(model_dir))
        return model_dir
```

Create `backend/packages/harness/nion/memory/embedding/index_service.py`:

```python
import json
from pathlib import Path
from typing import Any

from nion.memory.embedding.download_manager import MemoryEmbeddingDownloadManager
from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings import EmbeddingSystemSettings
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory.embedding.vector_store import VectorStoreIndexMetadata, VectorStoreRecord
from nion.memory_os.repository import MemoryOSRepository

STRUCTURED_VECTOR_DOMAINS = {"user_model", "relationship", "agent_self", "soul", "procedure"}


class MemoryEmbeddingIndexService:
    def __init__(
        self,
        *,
        base_dir: Path,
        repository: MemoryOSRepository,
        settings: EmbeddingSystemSettings | None = None,
    ) -> None:
        self._base_dir = Path(base_dir)
        self._repository = repository
        self._settings = settings or EmbeddingSettingsRepository(self._base_dir).load()
        self._provider = build_embedding_provider(base_dir=self._base_dir, settings=self._settings)
        self._store = DuckDBVectorStore(
            self._base_dir / "memory-os" / "indexes" / "vector" / "index.duckdb"
        )
        self._manager = MemoryEmbeddingDownloadManager()

    def rebuild_full_index(self) -> dict[str, Any]:
        if self._settings.mode == "local_managed":
            self._manager.ensure_local_model(
                base_dir=self._base_dir,
                model_id=self._settings.local_model_id,
                model_key=self._settings.local_model_key,
            )

        records = [
            row
            for domain in STRUCTURED_VECTOR_DOMAINS
            for row in self._repository.list_memory_records(domain=domain, status="active")
            if str(row["summary"]).strip()
        ]
        texts = [str(row["summary"]) for row in records]
        vectors = self._provider.embed(texts)
        self._store.rebuild(
            target=self._target_metadata(record_count=len(texts)),
            records=[
                VectorStoreRecord(
                    record_id=str(row["memory_id"]),
                    vector=vector,
                    payload={
                        "domain": str(row["domain"]),
                        "subtype": str(row["subtype"]),
                        "summary": str(row["summary"]),
                    },
                )
                for row, vector in zip(records, vectors, strict=True)
            ],
        )
        manifest = self._write_manifest(record_count=len(texts))
        return {"record_count": len(texts), "manifest": manifest}

    def _target_metadata(self, *, record_count: int) -> VectorStoreIndexMetadata:
        return VectorStoreIndexMetadata(
            provider=self._provider.metadata().to_index_snapshot(),
            record_count=record_count,
        )

    def _write_manifest(self, *, record_count: int) -> dict[str, Any]:
        vector_dir = self._base_dir / "memory-os" / "indexes" / "vector"
        vector_dir.mkdir(parents=True, exist_ok=True)
        payload = {
            "provider": self._provider.metadata().to_index_snapshot().model_dump(mode="json"),
            "record_count": record_count,
            "artifact_count": record_count,
        }
        (vector_dir / "manifest.json").write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return payload
```

- [ ] **Step 6: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_vector_store_duckdb.py \
  backend/tests/test_memory_embedding_download_manager.py \
  backend/tests/test_memory_embedding_index_service.py -q
```

Expected:

- PASS

- [ ] **Step 7: Commit**

```bash
git add backend/packages/harness/nion/memory/embedding/vector_store.py \
  backend/packages/harness/nion/memory/embedding/duckdb_store.py \
  backend/packages/harness/nion/memory/embedding/download_manager.py \
  backend/packages/harness/nion/memory/embedding/index_service.py \
  backend/tests/test_memory_vector_store_duckdb.py \
  backend/tests/test_memory_embedding_download_manager.py \
  backend/tests/test_memory_embedding_index_service.py
git commit -m "Land the local vector store and rebuild flow"
```

## Task 3: Connect Vector Search to a Real Production Caller

**Files:**
- Create: `backend/packages/harness/nion/memory/search_fusion/vector_search.py`
- Create: `backend/packages/harness/nion/memory/search_fusion/structured_search_service.py`
- Modify: `backend/packages/harness/nion/memory/search_fusion/service.py`
- Modify: `backend/packages/harness/nion/memory/runtime_engine/service.py`
- Create: `backend/tests/test_memory_vector_search.py`
- Create: `backend/tests/test_structured_memory_search_service.py`
- Modify: `backend/tests/test_memory_search_fusion.py`
- Modify: `backend/tests/test_runtime_memory_engine.py`

- [ ] **Step 1: Write the failing integration tests**

```python
# backend/tests/test_memory_vector_search.py
from nion.memory.embedding.index_service import MemoryEmbeddingIndexService
from nion.memory.search_fusion.vector_search import search_vector_memory
from nion.memory_os.repository import MemoryOSRepository


def test_vector_search_builds_real_vector_hits_from_index(tmp_path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem:user:role",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    service = MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo)
    service.rebuild_full_index()

    hits = search_vector_memory(
        base_dir=tmp_path,
        query_text="财务分析职责",
        limit=3,
        filters={"domain": "user_model"},
    )

    assert hits
    assert hits[0].candidate_id == "mem:user:role"
    assert hits[0].route == "vector"
```

```python
# backend/tests/test_structured_memory_search_service.py
def test_structured_memory_search_service_uses_vector_hits_in_runtime(tmp_path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem:user:role",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    MemoryEmbeddingIndexService(base_dir=tmp_path, repository=repo).rebuild_full_index()

    result = build_runtime_memory_context(
        repository=repo,
        query="经营分析负责人是谁",
        thread_id="thread-1",
        memory_read=True,
        base_dir=tmp_path,
    )

    assert result.sections.hot_memories == ["财务 BP"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_vector_search.py \
  backend/tests/test_structured_memory_search_service.py \
  backend/tests/test_memory_search_fusion.py \
  backend/tests/test_runtime_memory_engine.py -q
```

Expected:

- FAIL because there is no production vector search caller

- [ ] **Step 3: Implement `search_vector_memory`**

Create `backend/packages/harness/nion/memory/search_fusion/vector_search.py`:

```python
from pathlib import Path
from typing import Any

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.provider_factory import build_embedding_provider
from nion.memory.embedding.settings_repository import EmbeddingSettingsRepository
from nion.memory.embedding.vector_store import VectorStoreQuery
from nion.memory.search_fusion.models import SearchRouteHit


def search_vector_memory(
    *,
    base_dir: Path,
    query_text: str,
    limit: int,
    filters: dict[str, Any],
) -> list[SearchRouteHit]:
    settings = EmbeddingSettingsRepository(base_dir).load()
    provider = build_embedding_provider(base_dir=base_dir, settings=settings)
    query_vector = provider.embed([query_text])[0]
    store = DuckDBVectorStore(base_dir / "memory-os" / "indexes" / "vector" / "index.duckdb")
    results = store.search(VectorStoreQuery(vector=query_vector, limit=limit, filters=filters))
    return [
        SearchRouteHit(candidate_id=result.record_id, route="vector", score=result.score)
        for result in results
    ]
```

- [ ] **Step 4: Build a structured search service and wire runtime to it**

Create `backend/packages/harness/nion/memory/search_fusion/structured_search_service.py`:

```python
from pathlib import Path

from nion.memory.search_fusion.models import FusedSearchCandidate
from nion.memory.search_fusion.service import fuse_memory_search_hits
from nion.memory.search_fusion.vector_search import search_vector_memory
from nion.memory_os.repository import MemoryOSRepository


def search_structured_memory(
    *,
    repository: MemoryOSRepository,
    base_dir: Path,
    query: str,
    domain: str,
    limit: int,
) -> list[FusedSearchCandidate]:
    taxonomy_hits = []
    fts_hits = []
    link_hits = []
    vector_hits = search_vector_memory(
        base_dir=base_dir,
        query_text=query,
        limit=limit,
        filters={"domain": domain},
    )
    return fuse_memory_search_hits(
        taxonomy_hits=taxonomy_hits,
        fts_hits=fts_hits,
        link_hits=link_hits,
        vector_hits=vector_hits,
    )
```

Update `backend/packages/harness/nion/memory/runtime_engine/service.py` so `_collect_hot_memories(...)` first asks `search_structured_memory(...)` for `user_model`, then falls back to the existing lexical matching only when vector search returns nothing.

- [ ] **Step 5: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_vector_search.py \
  backend/tests/test_structured_memory_search_service.py \
  backend/tests/test_memory_search_fusion.py \
  backend/tests/test_runtime_memory_engine.py -q
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/packages/harness/nion/memory/search_fusion/vector_search.py \
  backend/packages/harness/nion/memory/search_fusion/structured_search_service.py \
  backend/packages/harness/nion/memory/search_fusion/service.py \
  backend/packages/harness/nion/memory/runtime_engine/service.py \
  backend/tests/test_memory_vector_search.py \
  backend/tests/test_structured_memory_search_service.py \
  backend/tests/test_memory_search_fusion.py \
  backend/tests/test_runtime_memory_engine.py
git commit -m "Connect vector search to the runtime memory mainline"
```

## Task 4: Turn `/api/memory/settings` Into a Real Product Surface

**Files:**
- Modify: `backend/app/gateway/routers/memory_settings.py`
- Modify: `backend/tests/test_memory_settings_router.py`
- Modify: `frontend/src/core/memory-settings/types.ts`
- Modify: `frontend/src/core/memory-settings/api.ts`
- Modify: `frontend/src/core/memory-settings/hooks.ts`
- Create: `frontend/src/components/workspace/settings/memory-embedding-panel.tsx`
- Create: `frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts`
- Modify: `frontend/src/components/workspace/settings/memory-settings-page.tsx`

- [ ] **Step 1: Write failing router and frontend tests**

```python
def test_memory_settings_router_supports_patch_download_and_rebuild(monkeypatch, tmp_path):
    monkeypatch.setenv("NION_HOME", str(tmp_path))

    with TestClient(create_app()) as client:
        patch = client.patch(
            "/api/memory/settings",
            json={
                "mode": "remote_managed",
                "remote_endpoint": "https://api.example.com/v1/embeddings",
                "remote_api_key": "secret",
                "remote_model_name": "text-embedding-3-large",
                "remote_dimensions": 3072,
            },
        )
        rebuild = client.post("/api/memory/settings/rebuild")

    assert patch.status_code == 200
    assert patch.json()["provider_mode"]["id"] == "remote_managed"
    assert rebuild.status_code == 200
    assert rebuild.json()["job"]["state"] == "completed"
```

```ts
void test("memory embedding panel exposes real mode selection and rebuild actions", async () => {
  const source = await readFile(new URL("./memory-embedding-panel.tsx", import.meta.url), "utf8");
  assert.match(source, /本地模式|远端模式/);
  assert.match(source, /重建索引|下载模型|切换模式/);
  assert.doesNotMatch(source, /只读展示 current provider mode/);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_memory_settings_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/settings/memory-embedding-panel.contract.test.ts
```

Expected:

- FAIL because `/api/memory/settings` is read-only and the panel does not exist as a real product control

- [ ] **Step 3: Add write routes**

Update `backend/app/gateway/routers/memory_settings.py`:

```python
class MemorySettingsPatchRequest(BaseModel):
    mode: Literal["local_managed", "remote_managed"] | None = None
    local_model_id: str | None = None
    local_model_key: str | None = None
    remote_endpoint: str | None = None
    remote_api_key: str | None = None
    remote_model_name: str | None = None
    remote_dimensions: int | None = None


@router.patch("")
async def patch_memory_settings(request: MemorySettingsPatchRequest) -> dict[str, Any]:
    repo = EmbeddingSettingsRepository(get_paths().base_dir)
    settings = repo.update(request.model_dump())
    provider = build_embedding_provider(base_dir=get_paths().base_dir, settings=settings)
    return read_memory_settings_snapshot(
        paths=get_paths(),
        provider=provider.metadata(),
        settings=settings,
    )


@router.post("/download")
async def download_memory_embedding_assets() -> dict[str, Any]:
    settings = EmbeddingSettingsRepository(get_paths().base_dir).load()
    manager = MemoryEmbeddingDownloadManager()
    model_dir = manager.ensure_local_model(
        base_dir=get_paths().base_dir,
        model_id=settings.local_model_id,
        model_key=settings.local_model_key,
    )
    provider = build_embedding_provider(base_dir=get_paths().base_dir, settings=settings)
    return {
        "action": "download",
        "model_dir": str(model_dir),
        "provider": provider.metadata().model_dump(mode="json"),
    }


@router.post("/rebuild")
async def rebuild_memory_vector_index() -> dict[str, Any]:
    settings = EmbeddingSettingsRepository(get_paths().base_dir).load()
    service = MemoryEmbeddingIndexService(
        base_dir=get_paths().base_dir,
        repository=get_memory_os_repository(),
        settings=settings,
    )
    result = service.rebuild_full_index()
    return {"action": "rebuild", "job": {"state": "completed", **result}}
```

- [ ] **Step 4: Rebuild the frontend panel as a real control surface**

Create `frontend/src/components/workspace/settings/memory-embedding-panel.tsx` with:

```tsx
function MemoryEmbeddingPanel() {
  const { settings } = useMemorySettings();
  const patchSettings = usePatchMemorySettings();
  const downloadMutation = useDownloadMemoryEmbeddingAssets();
  const rebuildMutation = useRebuildMemoryVectorIndex();

  async function downloadModel() {
    await downloadMutation.mutateAsync();
  }

  async function rebuildIndex() {
    await rebuildMutation.mutateAsync();
  }

  return (
    <section className="space-y-4 rounded-xl border bg-background/80 p-4 shadow-sm">
      <RadioGroup
        value={settings.provider_mode.id}
        onValueChange={(mode) => void patchSettings.mutateAsync({ mode })}
      >
        <RadioGroupItem value="local_managed" />
        <RadioGroupItem value="remote_managed" />
      </RadioGroup>
      <Button onClick={() => void downloadModel()}>下载模型</Button>
      <Button onClick={() => void rebuildIndex()}>重建索引</Button>
      <dl>
        <dt>当前模型</dt>
        <dd>{settings.active_fingerprint.model_key}</dd>
        <dt>下载状态</dt>
        <dd>{settings.download_status.detail}</dd>
        <dt>索引健康</dt>
        <dd>{settings.index_health.detail}</dd>
      </dl>
    </section>
  );
}
```

- [ ] **Step 5: Re-run tests**

Run:

```bash
backend/.venv/bin/python -m pytest backend/tests/test_memory_settings_router.py -q
cd frontend && pnpm exec node --test src/components/workspace/settings/memory-embedding-panel.contract.test.ts
pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/gateway/routers/memory_settings.py \
  backend/tests/test_memory_settings_router.py \
  frontend/src/core/memory-settings/types.ts \
  frontend/src/core/memory-settings/api.ts \
  frontend/src/core/memory-settings/hooks.ts \
  frontend/src/components/workspace/settings/memory-embedding-panel.tsx \
  frontend/src/components/workspace/settings/memory-embedding-panel.contract.test.ts \
  frontend/src/components/workspace/settings/memory-settings-page.tsx
git commit -m "Turn the embedding settings into a real product surface"
```

## Task 5: Product Acceptance

**Files:**
- Create/Modify: `artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/report.md`

- [ ] **Step 1: Run the vector-system regression bundle**

Run:

```bash
backend/.venv/bin/python -m pytest \
  backend/tests/test_memory_embedding_local_provider.py \
  backend/tests/test_memory_embedding_remote_provider.py \
  backend/tests/test_memory_vector_store_duckdb.py \
  backend/tests/test_memory_embedding_download_manager.py \
  backend/tests/test_memory_embedding_index_service.py \
  backend/tests/test_memory_vector_search.py \
  backend/tests/test_structured_memory_search_service.py \
  backend/tests/test_memory_search_fusion.py \
  backend/tests/test_memory_settings_router.py \
  backend/tests/test_runtime_memory_engine.py -q
```

Expected:

- PASS

- [ ] **Step 2: Run the frontend vector product tests**

Run:

```bash
cd frontend && pnpm exec node --test \
  src/components/workspace/settings/memory-embedding-panel.contract.test.ts

pnpm --dir frontend typecheck
```

Expected:

- PASS

- [ ] **Step 3: Capture dogfood evidence**

Verify manually:

1. 打开 `Settings > Memory`
2. 切到 `本地模式`
3. 点击 `下载模型`
4. 点击 `重建索引`
5. 在 Memory 搜索中输入一条结构化长期记忆语义近似 query，确认命中
6. 切到 `远端模式`
7. 配置远端 endpoint / model
8. 再次重建，确认远端模式可工作

Write the results to `artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11/report.md`.

- [ ] **Step 4: Commit**

```bash
git add artifacts/dogfood/electron-memory-soul-vector-closure-2026-04-11
git commit -m "Capture vector-system product-closure acceptance evidence"
```
