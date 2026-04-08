from __future__ import annotations

from nion.memory.runtime_engine.models import RuntimeMemoryResult, RuntimeMemorySections
from nion.memory.runtime_engine.search_plan import RuntimeMemorySearchPlan, build_runtime_search_plan
from nion.memory_os.context_pack import MemoryContextPack, MemoryContextPackItem
from nion.memory_os.repository import MemoryOSRepository


def build_runtime_memory_context(
    *,
    repository: MemoryOSRepository,
    query: str,
    thread_id: str,
    memory_read: bool = True,
) -> RuntimeMemoryResult:
    if not memory_read:
        return RuntimeMemoryResult.empty(
            query=query,
            thread_id=thread_id,
            gating_reason="memory_read_disabled",
        )

    plan = build_runtime_search_plan(query)
    sections = RuntimeMemorySections(
        constitution=_latest_summary(repository, domain="soul", subtype="core"),
        relationship_stance=_latest_summary(
            repository,
            domain="soul",
            subtype="relationship_soul",
        ),
        identity_narrative=_latest_summary(
            repository,
            domain="agent_self",
            subtype="identity_narrative",
        ),
        hot_memories=_collect_hot_memories(repository, plan=plan),
        relevant_procedures=_collect_relevant_procedures(repository, plan=plan),
        scoped_recall=_collect_scoped_recall(repository, thread_id=thread_id, plan=plan),
        verbatim_evidence=_collect_verbatim_evidence(repository, thread_id=thread_id, plan=plan),
    )
    return RuntimeMemoryResult(query=query, thread_id=thread_id, sections=sections)


def runtime_memory_to_context_pack(result: RuntimeMemoryResult) -> MemoryContextPack:
    items: list[MemoryContextPackItem] = []
    sections = result.sections

    for title, content in (
        ("Constitution", sections.constitution),
        ("Relationship Stance", sections.relationship_stance),
        ("Identity Narrative", sections.identity_narrative),
    ):
        if content:
            items.append(
                MemoryContextPackItem(
                    source_kind="runtime_memory",
                    title=title,
                    content=content,
                )
            )

    for title, entries in (
        ("Hot Memories", sections.hot_memories),
        ("Relevant Procedures", sections.relevant_procedures),
        ("Scoped Recall", sections.scoped_recall),
        ("Verbatim Evidence", sections.verbatim_evidence),
    ):
        if entries:
            items.append(
                MemoryContextPackItem(
                    source_kind="runtime_memory",
                    title=title,
                    content="\n".join(f"- {entry}" for entry in entries),
                )
            )

    return MemoryContextPack(items=items)


def _latest_summary(
    repository: MemoryOSRepository,
    *,
    domain: str,
    subtype: str,
) -> str | None:
    for row in repository.list_memory_records(domain=domain, status="active"):
        if row["subtype"] == subtype:
            summary = str(row["summary"]).strip()
            return summary or None
    return None


def _collect_hot_memories(
    repository: MemoryOSRepository,
    *,
    plan: RuntimeMemorySearchPlan,
) -> list[str]:
    limit = 2 if plan.depth == "deep" else 1
    return _collect_matching_summaries(
        repository.list_memory_records(domain="user_model", status="active"),
        query=plan.query,
        limit=limit,
    )


def _collect_relevant_procedures(
    repository: MemoryOSRepository,
    *,
    plan: RuntimeMemorySearchPlan,
) -> list[str]:
    limit = 2 if plan.depth == "deep" else 1
    return _collect_matching_summaries(
        repository.list_memory_records(domain="procedure", status="active"),
        query=plan.query,
        limit=limit,
    )


def _collect_scoped_recall(
    repository: MemoryOSRepository,
    *,
    thread_id: str,
    plan: RuntimeMemorySearchPlan,
) -> list[str]:
    rows = repository.list_memory_records(domain="episode", status="active")
    scoped_rows = [row for row in rows if str(row.get("subject_id")) == thread_id]
    limit = 3 if plan.depth == "deep" else 1
    return _collect_matching_summaries(scoped_rows, query=plan.query, limit=limit)


def _collect_verbatim_evidence(
    repository: MemoryOSRepository,
    *,
    thread_id: str,
    plan: RuntimeMemorySearchPlan,
) -> list[str]:
    rows = repository.list_memory_records(domain="evidence", status="active")
    scoped_rows = [row for row in rows if str(row.get("subject_id")) == thread_id]
    return _collect_matching_summaries(scoped_rows, query=plan.query, limit=2)


def _collect_matching_summaries(
    rows: list[dict[str, object]],
    *,
    query: str,
    limit: int,
) -> list[str]:
    tokens = [token for token in query.lower().split() if token]
    matches: list[str] = []
    fallbacks: list[str] = []

    for row in rows:
        summary = str(row["summary"]).strip()
        if not summary:
            continue
        haystack = summary.lower()
        if _matches_query(haystack, tokens=tokens, query=query.lower()):
            matches.append(summary)
        else:
            fallbacks.append(summary)

    selected = matches or fallbacks
    return selected[:limit]


def _matches_query(haystack: str, *, tokens: list[str], query: str) -> bool:
    normalized_query = query.strip()
    if normalized_query and normalized_query in haystack:
        return True
    if any(token in haystack for token in tokens if len(token) >= 2):
        return True
    return False
