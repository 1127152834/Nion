from __future__ import annotations

from typing import Any


def normalize_message_content(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        text_parts: list[str] = []
        for block in content:
            if isinstance(block, dict) and block.get("type") == "text":
                text = str(block.get("text", "")).strip()
                if text:
                    text_parts.append(text)
        return "\n".join(text_parts).strip()
    return str(content).strip()
