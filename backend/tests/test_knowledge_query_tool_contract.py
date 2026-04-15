from pathlib import Path

from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.knowledge.page_store import KnowledgePageStore
from nion.threads.service import ThreadService
from nion.threads.service import should_force_knowledge_query_for_request
from nion.tools.builtins.knowledge_tools import query_knowledge_base_tool


def test_builtin_tools_export_knowledge_query_tool() -> None:
    source = (
        Path(__file__).resolve().parents[1]
        / "packages"
        / "harness"
        / "nion"
        / "tools"
        / "builtins"
        / "__init__.py"
    ).read_text(encoding="utf-8")

    assert "query_knowledge_base_tool" in source


def test_query_knowledge_base_tool_reads_compiled_pages(tmp_path, monkeypatch) -> None:
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    import nion.config.paths as paths_module

    paths_module._paths = None
    KnowledgePageStore(base_dir=tmp_path).write_page(
        page_id="concept:roadmap",
        page_type="concept",
        title="Roadmap",
        body="## Summary\nRoadmap summary\n",
        sources=["source:notebook_note:note_1"],
        compiled_from=[{"source_id": "source:notebook_note:note_1", "content_hash": "abc123"}],
        last_compiled_at="2026-04-13T10:00:00Z",
    )

    payload = query_knowledge_base_tool.invoke({"question": "roadmap"})

    assert "Roadmap summary" in payload
    assert "concept:roadmap" in payload


def test_prompt_always_guides_knowledge_questions_to_query_tool() -> None:
    prompt = apply_prompt_template(cli_tools_enabled=False)

    assert "query_knowledge_base" in prompt
    assert "compiled knowledge base" in prompt


def test_knowledge_intent_forces_knowledge_query_for_this_turn() -> None:
    assert should_force_knowledge_query_for_request("查一下知识库里关于 roadmap 的内容") is True
    assert should_force_knowledge_query_for_request("知识图谱里 Alpha 和 Roadmap 什么关系") is True
    assert should_force_knowledge_query_for_request("这篇笔记内容是什么") is False


def test_thread_service_injects_knowledge_query_overlay_for_knowledge_questions(monkeypatch):
    captured: dict[str, object] = {}

    class FakeClient:
        def stream(
            self,
            message,
            *,
            thread_id=None,
            human_message_payload=None,
            **kwargs,
        ):
            del message, thread_id, human_message_payload
            captured["kwargs"] = kwargs
            yield from ()

    service = ThreadService(client=FakeClient())
    request = service._build_request_for_test(  # noqa: SLF001
        text="查一下知识库里 roadmap 的结论",
        context={"thread_id": "thread-1"},
    )
    list(service.stream("thread-1", request))

    overlay = str(captured["kwargs"]["additional_system_prompt"])
    assert "query_knowledge_base" in overlay
