from __future__ import annotations

from typing import Literal, TypeAlias

MEMORY_DOMAINS = (
    "recall",
    "user_model",
    "relationship",
    "knowledge_projection",
    "agent_self",
    "procedure",
    "soul",
    "learning",
    "automation_projection",
)
MemoryDomain: TypeAlias = Literal[
    "recall",
    "user_model",
    "relationship",
    "knowledge_projection",
    "agent_self",
    "procedure",
    "soul",
    "learning",
    "automation_projection",
]

MEMORY_OWNER_TYPES = ("user", "agent", "shared", "system")
MemoryOwnerType: TypeAlias = Literal["user", "agent", "shared", "system"]

MEMORY_SCOPES = ("thread", "session", "user", "agent", "workspace", "project")
MemoryScope: TypeAlias = Literal["thread", "session", "user", "agent", "workspace", "project"]

MEMORY_TYPES = ("working", "episodic", "semantic", "procedural")
MemoryType: TypeAlias = Literal["working", "episodic", "semantic", "procedural"]

MEMORY_STATUSES = (
    "candidate",
    "active",
    "warm",
    "cold",
    "archived",
    "invalidated",
    "purged",
    "superseded",
)
MemoryStatus: TypeAlias = Literal[
    "candidate",
    "active",
    "warm",
    "cold",
    "archived",
    "invalidated",
    "purged",
    "superseded",
]

MEMORY_ACTION_LEVELS = ("AUTO", "SUGGEST", "CONFIRM", "FORBID")
MemoryActionLevel: TypeAlias = Literal["AUTO", "SUGGEST", "CONFIRM", "FORBID"]
