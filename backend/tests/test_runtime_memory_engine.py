from pathlib import Path

from nion.memory.runtime_engine.models import RuntimeMemoryResult, RuntimeMemorySections
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore


def test_runtime_memory_sections_empty_factory_returns_all_layers_cleared():
    sections = RuntimeMemorySections.empty()

    assert sections.constitution is None
    assert sections.relationship_stance is None
    assert sections.identity_narrative is None
    assert sections.hot_memories == []
    assert sections.relevant_procedures == []
    assert sections.scoped_recall == []
    assert sections.verbatim_evidence == []


def test_runtime_memory_sections_include_expected_layers():
    sections = RuntimeMemorySections(
        constitution="core",
        relationship_stance="stance",
        identity_narrative="narrative",
        hot_memories=["m1"],
        relevant_procedures=["p1"],
        scoped_recall=["r1"],
        verbatim_evidence=["e1"],
    )

    assert sections.constitution == "core"
    assert sections.relationship_stance == "stance"
    assert sections.identity_narrative == "narrative"
    assert sections.hot_memories == ["m1"]
    assert sections.relevant_procedures == ["p1"]
    assert sections.scoped_recall == ["r1"]
    assert sections.verbatim_evidence == ["e1"]


def test_runtime_memory_result_empty_factory_marks_gated_no_read_session():
    result = RuntimeMemoryResult.empty(
        query="帮我继续之前的话题",
        thread_id="thread-1",
        gating_reason="memory_read_disabled",
    )

    assert result.query == "帮我继续之前的话题"
    assert result.thread_id == "thread-1"
    assert result.sections == RuntimeMemorySections.empty()
    assert result.gated is True
    assert result.gating_reason == "memory_read_disabled"


def test_search_plan_builds_minimal_intent_and_depth():
    from nion.memory.runtime_engine.search_plan import build_runtime_search_plan

    plan = build_runtime_search_plan("继续上次的财务周报，按之前那种三段式")

    assert plan.query == "继续上次的财务周报，按之前那种三段式"
    assert plan.intent in {"continuity", "targeted_recall"}
    assert plan.depth in {"deep", "standard"}


def test_build_runtime_memory_context_assembles_all_required_sections(tmp_path: Path):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    store = MemoryOSSoulArtifactStore(repository=repo, base_dir=tmp_path)
    store.write_core_soul(
        body="# Core Soul\n\n## Identity\n稳定、克制、长期主义。\n",
        created_at="2026-04-06T00:00:00Z",
    )
    store.write_identity_narrative(
        body="# Identity Narrative\n\n## Who I Am\n我是长期陪伴型助手。\n",
        created_at="2026-04-06T00:00:00Z",
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
            "summary": "面对当前用户时，保持低刺激、少施压、结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-06T00:00:00Z",
            "updated_at": "2026-04-06T00:00:00Z",
            "artifact_uri": "nion://memory-os/artifacts/soul/relationship/relationship_soul.md",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "proc_01",
            "domain": "procedure",
            "subtype": "reporting",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "procedural",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务汇报默认使用结论/风险/动作三段式。",
            "confidence": 0.95,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
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
    repo.save_memory_record(
        {
            "memory_id": "recall_01",
            "domain": "episode",
            "subtype": "recent_context",
            "owner_type": "agent",
            "scope": "thread",
            "memory_type": "episodic",
            "subject_id": "thread-1",
            "status": "active",
            "summary": "上次已经用三段式写过财务周报。",
            "confidence": 0.88,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "quote_01",
            "domain": "evidence",
            "subtype": "verbatim_quote",
            "owner_type": "agent",
            "scope": "thread",
            "memory_type": "evidence",
            "subject_id": "thread-1",
            "status": "active",
            "summary": "用户原话：\"按之前那种三段式\"。",
            "confidence": 0.9,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="继续上次的财务周报，按之前那种三段式",
        thread_id="thread-1",
        memory_read=True,
    )

    assert result.gated is False
    assert result.gating_reason is None
    assert result.sections.constitution == "稳定、克制、长期主义。"
    assert result.sections.relationship_stance == "面对当前用户时，保持低刺激、少施压、结论先行。"
    assert result.sections.identity_narrative == "我是长期陪伴型助手。"
    assert result.sections.hot_memories == ["用户偏好直接表达，避免铺垫。"]
    assert result.sections.relevant_procedures == ["财务汇报默认使用结论/风险/动作三段式。"]
    assert result.sections.scoped_recall == ["上次已经用三段式写过财务周报。"]
    assert result.sections.verbatim_evidence == ['用户原话："按之前那种三段式"。']


def test_build_runtime_memory_context_returns_gated_empty_result_when_memory_read_disabled(
    tmp_path: Path,
):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    result = build_runtime_memory_context(
        repository=repo,
        query="继续之前的话题",
        thread_id="thread-1",
        memory_read=False,
    )

    assert result == RuntimeMemoryResult.empty(
        query="继续之前的话题",
        thread_id="thread-1",
        gating_reason="memory_read_disabled",
    )


def test_build_runtime_memory_context_does_not_fallback_to_latest_on_unmatched_chinese_query(
    tmp_path: Path,
):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "hot_02",
            "domain": "user_model",
            "subtype": "communication_preference",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "用户偏好结论先行。",
            "confidence": 0.9,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    repo.save_memory_record(
        {
            "memory_id": "proc_02",
            "domain": "procedure",
            "subtype": "reporting",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "procedural",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务汇报默认使用三段式。",
            "confidence": 0.95,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="和宠物绝育有关的安排",
        thread_id="thread-1",
        memory_read=True,
    )

    assert result.sections.hot_memories == []
    assert result.sections.relevant_procedures == []
