from dataclasses import dataclass, field


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


@dataclass(slots=True)
class RecallQueryRequest:
    thread_id: str
    query: str
    max_items: int = 5
    agent_name: str | None = None
    sources: list[str] = field(default_factory=list)


@dataclass(slots=True)
class RecallQueryItem:
    source: str
    kind: str
    score: float
    summary: str
    thread_id: str
    uri: str


@dataclass(slots=True)
class RecallQueryResult:
    items: list[RecallQueryItem]


@dataclass(slots=True)
class ContinuityRequest:
    thread_id: str
    user_message: str
    agent_name: str | None = None
    max_items: int = 5


@dataclass(slots=True)
class ContinuitySourceResult:
    source: str
    summary: str
    items: list[RecallQueryItem]


@dataclass(slots=True)
class ProviderHealth:
    provider: str
    ok: bool
    enabled: bool
