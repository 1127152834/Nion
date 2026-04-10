"""Local transcript recall provider."""

from nion.recall.local_archive import LocalRecallArchive
from nion.recall.models import (
    ContinuityRequest,
    ContinuitySourceResult,
    ProviderHealth,
    RecallQueryItem,
    RecallQueryRequest,
    RecallQueryResult,
)


class LocalTranscriptRecallProvider:
    """Query the local transcript archive and normalize results."""

    def __init__(self, archive: LocalRecallArchive):
        self._archive = archive

    def query(self, request: RecallQueryRequest) -> RecallQueryResult:
        results = self._archive.search_thread(
            request.thread_id,
            request.query,
            request.max_items,
        )
        if not results:
            return RecallQueryResult(
                items=[
                    RecallQueryItem(
                        source="local",
                        kind="no_match",
                        score=0.0,
                        summary=f"No matching local recall found for thread {request.thread_id}.",
                        thread_id=request.thread_id,
                        uri=f"local://thread/{request.thread_id}/no-match",
                    )
                ]
            )

        items = [
            RecallQueryItem(
                source="local",
                kind="transcript_match",
                score=max(0.0, 1.0 - (index * 0.05)),
                summary=result.snippet,
                thread_id=result.thread_id,
                uri=f"local://thread/{result.thread_id}/messages/{index}",
            )
            for index, result in enumerate(results)
        ]
        return RecallQueryResult(items=items)

    def continuity(self, request: ContinuityRequest) -> ContinuitySourceResult:
        result = self.query(
            RecallQueryRequest(
                thread_id=request.thread_id,
                query=request.user_message,
                agent_name=request.agent_name,
                max_items=request.max_items,
                sources=["local"],
            )
        )
        summary = "\n".join(f"- {item.summary}" for item in result.items if item.kind != "no_match")
        return ContinuitySourceResult(
            source="local",
            summary=summary,
            items=result.items,
        )

    def health(self) -> ProviderHealth:
        return ProviderHealth(provider="local_transcript", ok=True, enabled=True)
