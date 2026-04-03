from nion.threads.title_policy import (
    is_placeholder_thread_title,
    resolve_preferred_thread_title,
)


def test_resolve_preferred_thread_title_keeps_manual_title_over_untitled() -> None:
    assert (
        resolve_preferred_thread_title(
            current_title="手动重命名标题",
            incoming_title="Untitled",
        )
        == "手动重命名标题"
    )


def test_resolve_preferred_thread_title_accepts_real_generated_title() -> None:
    assert (
        resolve_preferred_thread_title(
            current_title="Untitled",
            incoming_title="代码总结",
        )
        == "代码总结"
    )


def test_is_placeholder_thread_title_matches_empty_and_untitled() -> None:
    assert is_placeholder_thread_title(None) is True
    assert is_placeholder_thread_title("") is True
    assert is_placeholder_thread_title("   ") is True
    assert is_placeholder_thread_title("Untitled") is True
    assert is_placeholder_thread_title("手动重命名标题") is False
