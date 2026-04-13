from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware
from nion.memory.soul.console_service import build_soul_settings_payload
from nion.memory_os.repository import MemoryOSRepository
from nion.runtime_context.files.identity_file import IdentityDocumentStore
from nion.runtime_context.files.soul_file import SoulDocumentStore


def _runtime(thread_id: str) -> Runtime:
    return Runtime(context={"thread_id": thread_id})


def test_chat_updates_stable_speech_style_from_explicit_long_term_instruction(
    tmp_path,
) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="以后你回答冷静一点，先给结论，别太热情。"),
            ]
        },
        _runtime("thread-1"),
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    settings = build_soul_settings_payload(repo, now_z="2026-04-11T00:00:00Z")

    assert settings["speech_style"] == "冷静、先给结论、少热情。"


def test_chat_updates_values_and_relationship_stance_from_explicit_long_term_instruction(
    tmp_path,
) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="你以后不要替我拍板，关系上低刺激一点，少施压。"),
            ]
        },
        _runtime("thread-1"),
    )

    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    settings = build_soul_settings_payload(repo, now_z="2026-04-11T00:00:00Z")

    assert settings["values_and_boundaries"] == "不替用户拍板。"
    assert settings["relationship_stance"] == "低刺激、少施压。"


def test_chat_updates_identity_document_file_from_explicit_identity_instruction(
    tmp_path,
) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="我叫张天成，你以后叫我大哥。"),
            ]
        },
        _runtime("thread-1"),
    )

    document = IdentityDocumentStore(tmp_path).read()

    assert "张天成" in document
    assert "大哥" in document


def test_chat_updates_soul_document_file_from_explicit_long_term_instruction(
    tmp_path,
) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)

    middleware.before_agent(
        {
            "messages": [
                HumanMessage(content="以后你回答冷静一点，先给结论，别太热情。"),
            ]
        },
        _runtime("thread-1"),
    )

    document = SoulDocumentStore(tmp_path).read()

    assert "冷静、先给结论、少热情。" in document
