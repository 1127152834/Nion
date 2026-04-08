from __future__ import annotations

from nion.memory.extraction.models import MemoryProposal
from nion.memory.governance.service import apply_memory_governance_decision
from nion.memory.judge.models import MemoryJudgeDecision
from nion.memory_os.repository import MemoryOSRepository


def judge_memory_proposals(
    repository: MemoryOSRepository,
    proposals: list[MemoryProposal],
    *,
    created_at: str,
) -> list[MemoryJudgeDecision]:
    decisions: list[MemoryJudgeDecision] = []
    for proposal in proposals:
        target_node = repository.get_memory_node_by_canonical_key(_canonical_key(proposal))
        if target_node is None:
            action = "accept"
            rationale = "No canonical memory exists for this proposal."
        elif _is_frozen_or_overridden(repository, target_node.memory_id):
            action = "defer"
            rationale = "Canonical memory is frozen or pinned by a user override."
        elif proposal.change_type == "reinforce":
            action = "reinforce_existing"
            rationale = "Existing canonical memory is reinforced by repeated evidence."
        elif proposal.change_type == "revise":
            action = "accept_as_revision"
            rationale = "Proposal revises an existing canonical memory."
        elif proposal.change_type == "expire":
            action = "reject"
            rationale = "Expiry proposals require a separate archival flow."
        else:
            action = "accept"
            rationale = "Proposal is accepted into the canonical memory ledger."

        decisions.append(
            apply_memory_governance_decision(
                repository,
                proposal=proposal,
                action=action,
                target_memory_id=None if target_node is None else target_node.memory_id,
                rationale=rationale,
                created_at=created_at,
                decided_by="memory_judge",
            )
        )
    return decisions


def _canonical_key(proposal: MemoryProposal) -> str:
    canonical_key = str(proposal.candidate_payload.get("canonical_key") or "").strip()
    if not canonical_key:
        raise ValueError("proposal.candidate_payload.canonical_key is required")
    return canonical_key


def _is_frozen_or_overridden(repository: MemoryOSRepository, memory_id: str) -> bool:
    node = repository.get_memory_node(memory_id)
    if node is None:
        return False
    if bool(node.metadata.get("frozen")):
        return True
    return len(repository.list_user_overrides(memory_id=memory_id)) > 0
