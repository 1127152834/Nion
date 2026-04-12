from __future__ import annotations

import re

from pydantic import BaseModel

MENTION_RE = re.compile(r"@(?P<agent>[A-Za-z0-9-]+)")


class MentionedAgentStep(BaseModel):
    agent_name: str
    ordinal: int
    instruction: str = ""


def _clean_instruction_segment(text: str) -> str:
    cleaned = text.strip(" ，。；;:\n\t")
    cleaned = re.sub(r"^(然后|再|接着)?\s*(交给|给)?\s*", "", cleaned)
    cleaned = re.sub(r"(，|。)?\s*(然后|再|接着)?\s*(交给|给)\s*$", "", cleaned)
    return cleaned.strip(" ，。；;:\n\t")


def parse_agent_mentions(text: str) -> list[MentionedAgentStep]:
    matches = list(MENTION_RE.finditer(text))
    steps: list[MentionedAgentStep] = []
    for index, match in enumerate(matches, start=1):
        next_match = matches[index] if index < len(matches) else None
        segment = text[match.end() : next_match.start() if next_match else len(text)]
        steps.append(
            MentionedAgentStep(
                agent_name=match.group("agent"),
                ordinal=index,
                instruction=_clean_instruction_segment(segment),
            )
        )
    return steps
