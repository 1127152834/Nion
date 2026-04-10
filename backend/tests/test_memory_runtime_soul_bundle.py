from pathlib import Path

from nion.memory_os.models import UserOverrideRecord
from nion.memory.runtime_engine.models import RuntimeMemorySections
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


def _seed_stable_soul(repo: MemoryOSRepository, *, created_at: str) -> None:
    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "长期陪伴、克制稳定、结论先行。",
            "confidence": 1.0,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "agent_self_narrative_main",
            "domain": "agent_self",
            "subtype": "identity_narrative",
            "owner_type": "agent",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "先给结论，再补上下文。",
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "soul_rel_user_default",
            "domain": "soul",
            "subtype": "relationship_soul",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "保持低刺激、少施压、结论先行。",
            "confidence": 0.9,
            "created_at": created_at,
            "updated_at": created_at,
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_core_main",
            "canonical_key": "soul:layer:core:agent:main",
            "owner_type": "agent",
            "scope": "agent",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "长期陪伴、克制稳定、结论先行。",
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": {"layer": "core"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_core_main",
        summary="长期陪伴、克制稳定、结论先行。",
        evidence_ref=None,
        created_at=created_at,
        payload={"layer": "core"},
    )
    repo.save_memory_node(
        {
            "memory_id": "agent_self_narrative_main",
            "canonical_key": "soul:layer:identity_narrative:agent:main",
            "owner_type": "agent",
            "scope": "agent",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "先给结论，再补上下文。",
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": {"layer": "identity_narrative"},
        }
    )
    repo.append_memory_revision(
        memory_id="agent_self_narrative_main",
        summary="先给结论，再补上下文。",
        evidence_ref=None,
        created_at=created_at,
        payload={"layer": "identity_narrative"},
    )
    repo.save_memory_node(
        {
            "memory_id": "soul_rel_user_default",
            "canonical_key": "soul:layer:relationship_stance:user:default",
            "owner_type": "agent",
            "scope": "user",
            "node_type": "soul_layer",
            "status": "active",
            "summary": "保持低刺激、少施压、结论先行。",
            "created_at": created_at,
            "updated_at": created_at,
            "metadata": {"layer": "relationship_stance"},
        }
    )
    repo.append_memory_revision(
        memory_id="soul_rel_user_default",
        summary="保持低刺激、少施压、结论先行。",
        evidence_ref=None,
        created_at=created_at,
        payload={"layer": "relationship_stance"},
    )
    repo.save_user_override(
        UserOverrideRecord(
            override_id="override-values-and-boundaries",
            memory_id="soul_core_main",
            field_name="values_and_boundaries",
            value={"text": "不代替用户做最终判断。"},
            reason="test",
            created_at=created_at,
            updated_at=created_at,
        )
    )


def test_runtime_memory_sections_empty_factory_returns_explicit_soul_fields():
    sections = RuntimeMemorySections.empty()

    assert sections.core_identity is None
    assert sections.speech_style is None
    assert sections.values_and_boundaries is None
    assert sections.relationship_stance is None
    assert sections.adaptive_overlay is None
    assert sections.hot_memories == []
    assert sections.relevant_procedures == []
    assert sections.scoped_recall == []
    assert sections.verbatim_evidence == []


def test_build_runtime_memory_context_splits_stable_soul_and_overlay(tmp_path: Path):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _seed_stable_soul(repo, created_at="2026-04-10T00:00:00Z")
    MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path).write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n近期减少鼓励式措辞。\n",
        created_at="2026-04-10T00:10:00Z",
    )
    repo.save_memory_record(
        {
            "memory_id": "hot_01",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好直接表达，避免铺垫。",
            "confidence": 0.92,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="继续之前的财务周报",
        thread_id="thread-1",
        memory_read=True,
    )

    assert result.gated is False
    assert result.sections.core_identity == "长期陪伴、克制稳定、结论先行。"
    assert result.sections.speech_style == "先给结论，再补上下文。"
    assert result.sections.values_and_boundaries == "不代替用户做最终判断。"
    assert result.sections.relationship_stance == "保持低刺激、少施压、结论先行。"
    assert result.sections.adaptive_overlay == "近期减少鼓励式措辞。"
    assert result.sections.hot_memories == ["用户偏好直接表达，避免铺垫。"]


def test_build_runtime_memory_context_does_not_promote_internal_relationship_signal_to_stable_stance(
    tmp_path: Path,
):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "soul_core_main",
            "domain": "soul",
            "subtype": "core",
            "owner_type": "system",
            "scope": "agent",
            "memory_type": "semantic",
            "subject_id": "agent:main",
            "status": "active",
            "summary": "长期陪伴、克制稳定、结论先行。",
            "confidence": 1.0,
            "created_at": "2026-04-10T00:00:00Z",
            "updated_at": "2026-04-10T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/core/core_soul.md",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "rel_01",
            "domain": "relationship",
            "subtype": "initiative_policy",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好低打扰、少施压、结论先行的支持方式。",
            "confidence": 0.9,
            "created_at": "2026-04-10T00:00:00Z",
            "updated_at": "2026-04-10T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="继续之前的财务周报",
        thread_id="thread-1",
        memory_read=True,
    )

    assert result.sections.core_identity == "长期陪伴、克制稳定、结论先行。"
    assert result.sections.relationship_stance is None
