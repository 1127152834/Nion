from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.agents.lead_agent.prompt import _get_memory_context
from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.memory_os.models import UserOverrideRecord
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


def test_prompt_memory_context_includes_stable_soul_and_overlay(tmp_path: Path, monkeypatch):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _seed_stable_soul(repo, created_at="2026-04-10T00:00:00Z")
    MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path).write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n近期减少鼓励式措辞。\n",
        created_at="2026-04-10T00:10:00Z",
    )

    monkeypatch.setenv("NION_HOME", str(tmp_path))
    result = _get_memory_context(thread_id="thread-1", memory_read=True)

    assert "Core Identity" in result
    assert "Speech Style" in result
    assert "Values and Boundaries" in result
    assert "Relationship Stance" in result
    assert "Adaptive Overlay" in result
    assert "长期陪伴、克制稳定、结论先行。" in result
    assert "近期减少鼓励式措辞。" in result


def test_continuity_middleware_injects_same_runtime_soul_bundle(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _seed_stable_soul(repo, created_at="2026-04-10T00:00:00Z")
    MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path).write_active_overlay(
        body="# Active Soul Overlay\n\n## Expression Adjustments\n近期减少鼓励式措辞。\n",
        created_at="2026-04-10T00:10:00Z",
    )

    middleware = ContinuityMiddleware(base_dir=tmp_path)
    update = middleware.before_model(
        {"messages": [HumanMessage(content="继续帮我写财务周报", id="h-1")]},
        Runtime(context={"thread_id": "thread-1"}),
    )

    assert update is not None
    injected = update["messages"][0]
    assert isinstance(injected, SystemMessage)
    content = str(injected.content)
    assert "Core Identity" in content
    assert "Speech Style" in content
    assert "Values and Boundaries" in content
    assert "Relationship Stance" in content
    assert "Adaptive Overlay" in content
