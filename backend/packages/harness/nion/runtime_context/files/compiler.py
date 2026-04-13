from __future__ import annotations

from nion.user_identity.models import UserIdentityProfile


def _extract_section(document: str, heading: str) -> str:
    marker = f"## {heading}"
    if marker not in document:
        return ""
    section = document.split(marker, maxsplit=1)[1]
    next_heading_idx = section.find("\n## ")
    if next_heading_idx >= 0:
        section = section[:next_heading_idx]
    return section.strip()


def compile_identity_document(document: str) -> UserIdentityProfile:
    core = _extract_section(document, "Core")
    user_name = ""
    preferred_address_for_user = ""

    for line in core.splitlines():
        line = line.strip()
        if line.startswith("- User name:"):
            user_name = line.removeprefix("- User name:").strip()
        if line.startswith("- Preferred address:"):
            preferred_address_for_user = line.removeprefix("- Preferred address:").strip()

    return UserIdentityProfile(
        user_name=user_name,
        preferred_address_for_user=preferred_address_for_user,
    )


def compile_soul_document(document: str) -> dict[str, str]:
    return {
        "core_identity": _extract_section(document, "Core Identity"),
        "speech_style": _extract_section(document, "Speech Style"),
        "values_and_boundaries": _extract_section(document, "Values And Boundaries"),
        "relationship_stance": _extract_section(document, "Relationship Stance"),
    }
