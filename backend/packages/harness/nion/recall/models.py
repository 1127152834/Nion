from dataclasses import dataclass


@dataclass(slots=True)
class RecallTurn:
    role: str
    content: str
    source_message_id: str | None = None


@dataclass(slots=True)
class RecallSearchResult:
    thread_id: str
    agent_name: str
    role: str
    snippet: str
    created_at: str
