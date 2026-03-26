from __future__ import annotations

from typing import Any

import yaml


def split_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    if not text.startswith("---\n"):
        return {}, text

    marker = "\n---\n"
    end_index = text.find(marker, 4)
    if end_index < 0:
        return {}, text

    raw_frontmatter = text[4:end_index]
    body = text[end_index + len(marker) :]
    parsed = yaml.safe_load(raw_frontmatter) or {}
    if not isinstance(parsed, dict):
        return {}, text
    return parsed, body


def render_frontmatter(frontmatter: dict[str, Any], body: str) -> str:
    serialized = yaml.safe_dump(
        frontmatter,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False,
    ).strip()
    normalized_body = body.rstrip("\n")
    return f"---\n{serialized}\n---\n\n{normalized_body}\n"
