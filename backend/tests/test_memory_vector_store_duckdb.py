from __future__ import annotations

from nion.memory.embedding.duckdb_store import DuckDBVectorStore
from nion.memory.embedding.models import EmbeddingModelFingerprint, VectorIndexSnapshot
from nion.memory.embedding.vector_store import (
    VectorStoreIndexMetadata,
    VectorStoreQuery,
    VectorStoreRecord,
)


def test_duckdb_vector_store_upserts_and_searches(tmp_path) -> None:
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
            VectorStoreRecord(
                record_id="mem:user:1",
                vector=[1.0, 0.0],
                payload={"domain": "user_model"},
            ),
            VectorStoreRecord(
                record_id="mem:user:2",
                vector=[0.0, 1.0],
                payload={"domain": "user_model"},
            ),
        ],
    )

    hits = store.search(
        VectorStoreQuery(vector=[0.9, 0.1], limit=1, filters={"domain": "user_model"})
    )
    metadata = store.get_index_metadata()

    assert hits[0].record_id == "mem:user:1"
    assert metadata is not None
    assert metadata.record_count == 2
    assert metadata.provider.fingerprint.model_key == "bge-m3"

