from __future__ import annotations


UNTITLED_THREAD_TITLE = "Untitled"


def normalize_thread_title_candidate(title: str | None) -> str | None:
    if title is None:
        return None

    trimmed = title.strip()
    return trimmed or None


def is_placeholder_thread_title(title: str | None) -> bool:
    normalized = normalize_thread_title_candidate(title)
    return normalized is None or normalized == UNTITLED_THREAD_TITLE


def resolve_preferred_thread_title(
    *,
    current_title: str | None,
    incoming_title: str | None,
) -> str | None:
    normalized_current = normalize_thread_title_candidate(current_title)
    normalized_incoming = normalize_thread_title_candidate(incoming_title)

    if normalized_incoming is None:
        return normalized_current

    if is_placeholder_thread_title(normalized_incoming) and not is_placeholder_thread_title(
        normalized_current
    ):
        return normalized_current

    return normalized_incoming
