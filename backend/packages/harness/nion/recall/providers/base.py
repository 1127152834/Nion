"""Provider protocol for recall sources."""

from typing import Protocol

from nion.recall.models import ContinuityRequest, ContinuitySourceResult, ProviderHealth, RecallQueryRequest, RecallQueryResult


class RecallProvider(Protocol):
    def query(self, request: RecallQueryRequest) -> RecallQueryResult: ...

    def continuity(self, request: ContinuityRequest) -> ContinuitySourceResult: ...

    def health(self) -> ProviderHealth: ...
