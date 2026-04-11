from __future__ import annotations

import re

from pydantic import BaseModel

MENTION_RE = re.compile(r"@(?P<agent>[A-Za-z0-9-]+)")


class MentionedAgentStep(BaseModel):
    agent_name: str
    ordinal: int


def parse_agent_mentions(text: str) -> list[MentionedAgentStep]:
    return [
        MentionedAgentStep(agent_name=match.group("agent"), ordinal=index)
        for index, match in enumerate(MENTION_RE.finditer(text), start=1)
    ]
