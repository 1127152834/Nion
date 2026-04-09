from __future__ import annotations

import pytest

from nion.memory.embedding.custom_compatible import (
    CustomCompatibleEmbeddingProviderMetadata,
)
from nion.memory.embedding.local_managed import LocalManagedEmbeddingProviderMetadata
from nion.memory.embedding.models import (
    EmbeddingModelFingerprint,
    VectorIndexSnapshot,
)
from nion.memory.embedding.provider import EmbeddingProvider
from nion.memory.embedding.remote_managed import RemoteManagedEmbeddingProviderMetadata
from nion.memory.embedding.vector_store import (
    VectorStoreIndexMetadata,
    VectorStoreQuery,
    VectorStoreRecord,
    VectorStoreSearchHit,
    build_rebuild_plan,
)


def test_embedding_model_fingerprint_is_stable_and_ignores_display_fields() -> None:
    left = EmbeddingModelFingerprint(
        provider_key="managed/local",
        model_key="bge-small",
        dimensions=384,
        distance_metric="cosine",
        revision="2026-04-09",
        display_name="BGE Small",
        metadata={"region": "cn", "owner": "memory"},
    )
    right = EmbeddingModelFingerprint(
        provider_key="managed/local",
        model_key="bge-small",
        dimensions=384,
        distance_metric="cosine",
        revision="2026-04-09",
        display_name="Different Label",
        metadata={"owner": "memory", "region": "cn"},
    )

    assert left.identity_payload() == {
        "dimensions": 384,
        "distance_metric": "cosine",
        "metadata": {"owner": "memory", "region": "cn"},
        "model_key": "bge-small",
        "provider_key": "managed/local",
        "revision": "2026-04-09",
    }
    assert left.fingerprint == right.fingerprint


def test_provider_metadata_shapes_are_explicit_and_machine_readable() -> None:
    local = LocalManagedEmbeddingProviderMetadata(
        provider_id="local-default",
        model_name="bge-m3",
        dimensions=1024,
        metadata={"bundle": "desktop"},
    )
    remote = RemoteManagedEmbeddingProviderMetadata(
        provider_id="remote-default",
        model_name="text-embedding-3-large",
        endpoint="https://api.example.com/v1/embeddings",
        dimensions=3072,
        metadata={"region": "us-east-1"},
    )
    custom = CustomCompatibleEmbeddingProviderMetadata(
        provider_id="custom-openai-like",
        model_name="foo-embed",
        protocol="openai_compatible",
        base_url="https://embed.example.com",
        dimensions=1536,
        metadata={"tenant": "internal"},
    )

    assert local.provider_kind == "local_managed"
    assert local.managed is True
    assert local.fingerprint.provider_key == "local_managed:local-default"
    assert local.fingerprint.metadata["bundle"] == "desktop"

    assert remote.provider_kind == "remote_managed"
    assert remote.managed is True
    assert remote.fingerprint.provider_key == "remote_managed:remote-default"
    assert remote.fingerprint.metadata["endpoint"] == "https://api.example.com/v1/embeddings"

    assert custom.provider_kind == "custom_compatible"
    assert custom.managed is False
    assert custom.fingerprint.provider_key == "custom_compatible:custom-openai-like"
    assert custom.fingerprint.metadata["protocol"] == "openai_compatible"
    assert custom.fingerprint.metadata["base_url"] == "https://embed.example.com"


def test_embedding_provider_protocol_supports_common_runtime_surface() -> None:
    class StubProvider:
        provider_id = "stub"

        def metadata(self) -> LocalManagedEmbeddingProviderMetadata:
            return LocalManagedEmbeddingProviderMetadata(
                provider_id="stub",
                model_name="bge-small",
                dimensions=384,
            )

        def embed(self, texts: list[str]) -> list[list[float]]:
            return [[float(len(text))] for text in texts]

    provider: EmbeddingProvider = StubProvider()

    assert provider.provider_id == "stub"
    assert provider.metadata().fingerprint.model_key == "bge-small"
    assert provider.embed(["a", "abcd"]) == [[1.0], [4.0]]


def test_build_rebuild_plan_marks_store_for_rebuild_without_making_it_truth_source() -> None:
    current = VectorIndexSnapshot(
        provider_id="remote-default",
        provider_kind="remote_managed",
        fingerprint=EmbeddingModelFingerprint(
            provider_key="remote_managed:remote-default",
            model_key="text-embedding-3-large",
            dimensions=3072,
            distance_metric="cosine",
            revision="2026-04-09",
        ),
    )
    target_same = VectorStoreIndexMetadata(
        provider=current,
        record_count=128,
    )
    target_changed = VectorStoreIndexMetadata(
        provider=VectorIndexSnapshot(
            provider_id="remote-default",
            provider_kind="remote_managed",
            fingerprint=EmbeddingModelFingerprint(
                provider_key="remote_managed:remote-default",
                model_key="text-embedding-3-large",
                dimensions=1536,
                distance_metric="cosine",
                revision="2026-04-10",
            ),
        ),
        record_count=128,
    )

    same_plan = build_rebuild_plan(current=current, target=target_same)
    changed_plan = build_rebuild_plan(current=current, target=target_changed)

    assert same_plan.requires_rebuild is False
    assert same_plan.reason == "fingerprint_match"
    assert same_plan.authoritative_snapshot is target_same.provider
    assert same_plan.store_snapshot is current

    assert changed_plan.requires_rebuild is True
    assert changed_plan.reason == "fingerprint_changed"
    assert changed_plan.authoritative_snapshot is target_changed.provider
    assert changed_plan.store_snapshot is current


def test_build_rebuild_plan_keeps_provider_authoritative_even_when_store_matches() -> None:
    current = VectorIndexSnapshot(
        provider_id="remote-default",
        provider_kind="remote_managed",
        fingerprint=EmbeddingModelFingerprint(
            provider_key="remote_managed:remote-default",
            model_key="text-embedding-3-large",
            dimensions=3072,
            distance_metric="cosine",
            revision="2026-04-09",
        ),
        metadata={"cache_revision": "store-copy"},
    )
    target = VectorStoreIndexMetadata(
        provider=VectorIndexSnapshot(
            provider_id="remote-default",
            provider_kind="remote_managed",
            fingerprint=EmbeddingModelFingerprint(
                provider_key="remote_managed:remote-default",
                model_key="text-embedding-3-large",
                dimensions=3072,
                distance_metric="cosine",
                revision="2026-04-09",
            ),
            metadata={"cache_revision": "provider-authority"},
        ),
        record_count=128,
    )

    plan = build_rebuild_plan(current=current, target=target)

    assert plan.requires_rebuild is False
    assert plan.authoritative_snapshot is target.provider
    assert plan.store_snapshot is current
    assert plan.authoritative_snapshot.metadata["cache_revision"] == "provider-authority"


def test_vector_store_query_models_capture_rebuild_aware_inputs() -> None:
    query = VectorStoreQuery(
        text="财务 BP 的表达方式",
        limit=5,
        filters={"domain": "user_model"},
    )
    record = VectorStoreRecord(
        record_id="mem:user:work",
        vector=[0.1, 0.2, 0.3],
        payload={"summary": "负责财务 BP"},
    )
    hit = VectorStoreSearchHit(
        record_id="mem:user:work",
        score=0.88,
        payload={"summary": "负责财务 BP"},
    )

    assert query.limit == 5
    assert query.filters == {"domain": "user_model"}
    assert record.payload["summary"] == "负责财务 BP"
    assert hit.score == 0.88


def test_embedding_model_fingerprint_rejects_non_json_metadata() -> None:
    with pytest.raises(Exception):
        EmbeddingModelFingerprint(
            provider_key="managed/local",
            model_key="bge-small",
            dimensions=384,
            metadata={"bad": {1, 2, 3}},
        )


def test_vector_index_snapshot_requires_consistent_provider_identity() -> None:
    with pytest.raises(Exception, match="provider_key"):
        VectorIndexSnapshot(
            provider_id="remote-default",
            provider_kind="remote_managed",
            fingerprint=EmbeddingModelFingerprint(
                provider_key="local_managed:remote-default",
                model_key="text-embedding-3-large",
                dimensions=3072,
                distance_metric="cosine",
            ),
        )
