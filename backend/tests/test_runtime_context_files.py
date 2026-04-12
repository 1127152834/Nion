from nion.user_identity.models import UserIdentityProfile


def test_identity_file_round_trips_markdown(tmp_path) -> None:
    from nion.runtime_context.files.identity_file import IdentityDocumentStore

    store = IdentityDocumentStore(base_dir=tmp_path)
    content = "# Identity\n\n## Core\n- User name: 张天成\n"
    store.write(content)

    assert store.read() == content


def test_soul_file_round_trips_markdown(tmp_path) -> None:
    from nion.runtime_context.files.soul_file import SoulDocumentStore

    store = SoulDocumentStore(base_dir=tmp_path)
    content = "# Soul\n\n## Core Identity\n长期陪伴、克制稳定、结论先行。\n"
    store.write(content)

    assert store.read() == content


def test_memory_file_round_trips_markdown(tmp_path) -> None:
    from nion.runtime_context.files.memory_file import MemoryDocumentStore

    store = MemoryDocumentStore(base_dir=tmp_path)
    content = "# Active Memory\n\n- 先给结论\n"
    store.write(content)

    assert store.read() == content


def test_compile_identity_markdown_to_profile() -> None:
    from nion.runtime_context.files.compiler import compile_identity_document

    result = compile_identity_document(
        "# Identity\n\n## Core\n- User name: 张天成\n- Preferred address: 大哥\n"
    )

    assert isinstance(result, UserIdentityProfile)
    assert result.user_name == "张天成"
    assert result.preferred_address_for_user == "大哥"


def test_compile_soul_markdown_to_sections() -> None:
    from nion.runtime_context.files.compiler import compile_soul_document

    result = compile_soul_document(
        "# Soul\n\n## Core Identity\n长期陪伴\n\n## Speech Style\n先给结论\n"
    )

    assert result["core_identity"] == "长期陪伴"
    assert result["speech_style"] == "先给结论"
