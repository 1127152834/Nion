from __future__ import annotations

from typing import Any

from langchain.agents import AgentState
from langchain.agents.middleware import AgentMiddleware
from langchain_core.messages import HumanMessage
from langgraph.runtime import Runtime

from nion.config.paths import Paths, get_paths
from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory.soul.console_service import patch_soul_setting_value
from nion.memory_os.clock import utcnow_z
from nion.memory_os.extractor import _human_evidence_documents
from nion.memory_os.repository import MemoryOSRepository
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
        self._memory_repo = MemoryOSRepository(self._paths.memory_os_index_db_file)

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
        patch = self._build_identity_patch(proposals)
        if patch:
            self._service.apply_patch(patch)
        self._apply_soul_patch(proposals)
        return None

    def _latest_human_message(self, messages: list[Any]) -> HumanMessage | None:
        for message in reversed(messages):
            if isinstance(message, HumanMessage):
                return message
        return None

    def _build_identity_patch(self, proposals) -> dict[str, object]:
        patch: dict[str, object] = {}
        for proposal in proposals:
            if proposal.proposed_kind == "user_name":
                patch["user_name"] = proposal.candidate_payload["user_name"]
            elif proposal.proposed_kind == "mutual_addressing":
                patch.update(proposal.candidate_payload)
            elif proposal.proposed_kind == "address_style":
                patch["preferred_address_for_user"] = proposal.candidate_payload["preferred_address"]
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
            elif proposal.proposed_kind == "initiative_boundary":
                boundaries: list[str] = []
                if proposal.candidate_payload.get("allow_decision_making") is False:
                    boundaries.append("不要替我拍板")
                elif proposal.candidate_payload.get("allow_decision_making") is True:
                    boundaries.append("可以替我拍板")
                if proposal.candidate_payload.get("allow_proactive_warning") is False:
                    boundaries.append("不要主动提醒")
                elif proposal.candidate_payload.get("allow_proactive_warning") is True:
                    boundaries.append("可以主动提醒")
                if boundaries:
                    patch["interaction_boundaries"] = boundaries
            elif proposal.proposed_kind == "user_role":
                patch["user_role"] = proposal.candidate_payload["user_role"]
            elif proposal.proposed_kind == "timezone":
                patch["timezone"] = proposal.candidate_payload["timezone"]
        return patch

    def _apply_soul_patch(self, proposals) -> None:
        created_at = utcnow_z()
        for proposal in proposals:
            if proposal.proposed_kind == "soul_speech_style":
                patch_soul_setting_value(
                    self._memory_repo,
                    field="speech_style",
                    value=proposal.candidate_payload["speech_style"],
                    created_at=created_at,
                )
            elif proposal.proposed_kind == "soul_values_and_boundaries":
                patch_soul_setting_value(
                    self._memory_repo,
                    field="values_and_boundaries",
                    value=proposal.candidate_payload["values_and_boundaries"],
                    created_at=created_at,
                )
            elif proposal.proposed_kind == "soul_relationship_stance":
                patch_soul_setting_value(
                    self._memory_repo,
                    field="relationship_stance",
                    value=proposal.candidate_payload["relationship_stance"],
                    created_at=created_at,
                )
