from pathlib import Path

from nion.memory.runtime_engine.models import RuntimeMemoryResult, RuntimeMemorySections
from nion.memory_os.repository import MemoryOSRepository
from nion.memory_os.soul_artifacts import MemoryOSSoulArtifactStore
from nion.user_identity.models import UserIdentityProfile
from nion.user_identity.repository import UserIdentityRepository


def test_runtime_memory_sections_empty_factory_returns_all_layers_cleared():
    sections = RuntimeMemorySections.empty()

    assert sections.user_identity_profile is None
    assert sections.core_identity is None
    assert sections.speech_style is None
    assert sections.values_and_boundaries is None
    assert sections.relationship_stance is None
    assert sections.adaptive_overlay is None
    assert sections.active_memory_document is None
    assert sections.hot_memories == []
    assert sections.relevant_procedures == []
    assert sections.scoped_recall == []
    assert sections.verbatim_evidence == []


def test_runtime_memory_sections_include_expected_layers():
    sections = RuntimeMemorySections(
        user_identity_profile="identity",
        core_identity="core",
        speech_style="speech",
        values_and_boundaries="values",
        relationship_stance="stance",
        adaptive_overlay="overlay",
        active_memory_document="memory-doc",
        hot_memories=["m1"],
        relevant_procedures=["p1"],
        scoped_recall=["r1"],
        verbatim_evidence=["e1"],
    )

    assert sections.user_identity_profile == "identity"
    assert sections.core_identity == "core"
    assert sections.speech_style == "speech"
    assert sections.values_and_boundaries == "values"
    assert sections.relationship_stance == "stance"
    assert sections.adaptive_overlay == "overlay"
    assert sections.active_memory_document == "memory-doc"
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
    assert result.sections.core_identity == "稳定、克制、长期主义。"
    assert result.sections.speech_style == "我是长期陪伴型助手。"
    assert result.sections.values_and_boundaries == "稳定、克制、长期主义。"
    assert result.sections.relationship_stance == "面对当前用户时，保持低刺激、少施压、结论先行。"
    assert result.sections.adaptive_overlay is None
    assert result.sections.hot_memories == ["用户偏好直接表达，避免铺垫。"]
    assert result.sections.relevant_procedures == ["财务汇报默认使用结论/风险/动作三段式。"]
    assert result.sections.scoped_recall == ["上次已经用三段式写过财务周报。"]
    assert result.sections.verbatim_evidence == ['用户原话："按之前那种三段式"。']


def test_build_runtime_memory_context_includes_user_identity_profile_even_without_query_match(
    tmp_path: Path,
):
    from nion.memory.runtime_engine.service import build_runtime_memory_context
    from nion.runtime_context.files.memory_file import MemoryDocumentStore

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    MemoryDocumentStore(tmp_path).write("# Active Memory\n\n- 先给结论\n")
    UserIdentityRepository(tmp_path).save(
        UserIdentityProfile(
            user_name="张天成",
            preferred_address_for_user="大哥",
            assistant_self_name="小老弟",
            mutual_addressing_rule="你叫我大哥，我叫你小老弟",
            communication_style_preferences=["结论先行", "少施压"],
        )
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="你知道我叫啥不",
        thread_id="thread-1",
        memory_read=True,
        base_dir=tmp_path,
    )

    assert result.sections.user_identity_profile is not None
    assert "用户姓名：张天成" in result.sections.user_identity_profile
    assert "称呼用户：大哥" in result.sections.user_identity_profile
    assert "助手自称：小老弟" in result.sections.user_identity_profile
    assert result.sections.active_memory_document == "# Active Memory\n\n- 先给结论"


def test_runtime_memory_to_context_pack_places_user_identity_before_soul_layers():
    from nion.memory.runtime_engine.service import runtime_memory_to_context_pack

    pack = runtime_memory_to_context_pack(
        RuntimeMemoryResult(
            query="继续",
            thread_id="thread-1",
            sections=RuntimeMemorySections(
                user_identity_profile="用户姓名：张天成",
                core_identity="长期陪伴、克制稳定、结论先行。",
                speech_style="先给结论，再补上下文。",
            ),
        )
    )

    assert [item.title for item in pack.items[:3]] == [
        "User Identity",
        "Core Identity",
        "Speech Style",
    ]


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


def test_build_runtime_memory_context_uses_vector_hits_for_hot_memories_when_lexical_misses(
    tmp_path: Path,
    monkeypatch,
):
    from nion.memory.runtime_engine.service import build_runtime_memory_context

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
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
    monkeypatch.setattr(
        "nion.memory.runtime_engine.service.search_structured_memory",
        lambda *, base_dir, repository, query, domain, limit: ["用户偏好直接表达，避免铺垫。"],
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="偏好冷启动写法",
        thread_id="thread-1",
        memory_read=True,
        base_dir=tmp_path,
    )

    assert result.sections.hot_memories == ["用户偏好直接表达，避免铺垫。"]
    assert result.sections.relevant_procedures == []


def test_build_runtime_memory_context_degrades_when_vector_search_raises(
    tmp_path: Path,
    monkeypatch,
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
            "summary": "用户偏好直接表达，避免铺垫。",
            "confidence": 0.92,
            "created_at": "2026-04-05T00:00:00Z",
            "updated_at": "2026-04-05T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    monkeypatch.setattr(
        "nion.memory.runtime_engine.service.search_structured_memory",
        lambda **kwargs: (_ for _ in ()).throw(TimeoutError("embedding stalled")),
    )

    result = build_runtime_memory_context(
        repository=repo,
        query="直接表达偏好",
        thread_id="thread-1",
        memory_read=True,
        base_dir=tmp_path,
    )

    assert isinstance(result.sections.hot_memories, list)
