from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from nion.prompt_runtime import PromptBuildContext, PromptSection


@dataclass(slots=True)
class SessionPromptSectionProvider:
    memory_context: str
    provider_id: str = "prompt.session"

    def build(self, context: PromptBuildContext) -> list[PromptSection]:
        sections: list[PromptSection] = []
        if self.memory_context:
            sections.append(
                PromptSection(
                    key="dynamic.memory",
                    title=None,
                    content=self.memory_context,
                    scope="session_dynamic",
                    layer="extension",
                    order=20,
                )
            )

        sections.append(
            PromptSection(
                key="dynamic.current_date",
                title=None,
                content=f"<current_date>{datetime.now().strftime('%Y-%m-%d, %A')}</current_date>",
                scope="session_dynamic",
                layer="extension",
                order=80,
            )
        )
        return sections
