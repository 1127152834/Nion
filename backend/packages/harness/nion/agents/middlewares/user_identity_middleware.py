from __future__ import annotations

from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory_os.extractor import _human_evidence_documents
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService

_PREFERENCE_LABELS = {
    "conclusion_first": "先给结论",
    "direct": "直接一点",
}
_PREFERENCE_ORDER = {
    "先给结论": 0,
    "直接一点": 1,
}


class UserIdentityMiddleware(AgentMiddleware[AgentState]):
    def __init__(self, base_dir: str | None = None) -> None:
        super().__init__()
        self._paths = Paths(base_dir) if base_dir else get_paths()
        self._service = UserIdentityService(UserIdentityRepository(self._paths.base_dir))

    def before_agent(self, state: AgentState, runtime: Runtime) -> dict | None:
        thread_id = runtime.context.get("thread_id") if runtime.context else None
        latest_human = self._latest_human_message(state.get("messages", []))
        if not thread_id or latest_human is None:
            return None

        proposals = extract_memory_proposals_from_evidence(
            evidence_documents=_human_evidence_documents(
                messages=[latest_human],
                thread_id=thread_id,
            )
        )
        patch = self._build_patch(proposals)
        if patch:
            self._service.apply_patch(patch)
        return None

    def _latest_human_message(self, messages: list[Any]) -> HumanMessage | None:
        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                return message
        return None

    def _build_patch(self, proposals) -> dict[str, object]:
        patch: dict[str, object] = {}
        for proposal in proposals:
            if proposal.proposed_kind == "user_name":
                patch["user_name"] = proposal.candidate_payload["user_name"]
            elif proposal.proposed_kind == "mutual_addressing":
                patch.update(proposal.candidate_payload)
            elif proposal.proposed_kind == "explicit_preference":
                preference_labels = [
                    _PREFERENCE_LABELS.get(token, str(token))
                    for token in proposal.candidate_payload.get("preference_hints", [])
                ]
                preference_labels = [label for label in preference_labels if label]
                if preference_labels:
                    preference_labels = sorted(
                        dict.fromkeys(preference_labels),
                        key=lambda label: _PREFERENCE_ORDER.get(label, 99),
                    )
                    patch["communication_style_preferences"] = list(
                        preference_labels
                    )
        return patch
