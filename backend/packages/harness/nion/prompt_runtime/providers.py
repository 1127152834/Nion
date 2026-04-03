from __future__ import annotations

from typing import Protocol

from .models import PromptBuildContext, PromptSection


class PromptSectionProvider(Protocol):
    provider_id: str

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        ...
