from nion.memory.runtime_engine.models import RuntimeMemoryResult, RuntimeMemorySections


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
