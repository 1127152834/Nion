from __future__ import annotations

from nion.memory.extraction.models import MemoryProposal
from nion.memory.judge.models import MemoryJudgeDecision
from nion.memory_os.models import MemoryDecision, MemoryNode, MemoryRevision
from nion.memory_os.repository import MemoryOSRepository

SUPPORTED_GOVERNANCE_ACTIONS = (
    "accept",
    "accept_as_revision",
    "reinforce_existing",
    "reject",
    "defer",
)


def apply_memory_governance_decision(
    repository: MemoryOSRepository,
    *,
    proposal: MemoryProposal,
    action: str,
    target_memory_id: str | None = None,
    rationale: str,
    created_at: str,
    decided_by: str = "memory_governance",
) -> MemoryJudgeDecision:
    if action not in SUPPORTED_GOVERNANCE_ACTIONS:
        raise ValueError(f"unsupported governance action: {action}")

    canonical_key = _require_canonical_key(proposal)
    target_node = repository.get_memory_node(target_memory_id) if target_memory_id else None
    if target_node is None:
        target_node = repository.get_memory_node_by_canonical_key(canonical_key)
    if target_node is not None and _is_locked(repository, target_node.memory_id) and action != "defer":
        action = "defer"
        rationale = "Canonical memory is frozen or pinned by a user override."

    created_revision: MemoryRevision | None = None
    revision_id: str | None = None
    effective_target_memory_id: str | None = target_node.memory_id if target_node is not None else target_memory_id

    if action == "accept":
        if target_node is None:
            target_node = _create_memory_node(repository, proposal=proposal, created_at=created_at)
        effective_target_memory_id = target_node.memory_id
        created_revision = _create_revision(
            repository,
            proposal=proposal,
            memory_id=target_node.memory_id,
            created_at=created_at,
        )
        revision_id = created_revision.revision_id
        if target_node.summary != proposal.candidate_claim:
            repository.save_memory_node(
                target_node.model_copy(
                    update={"summary": proposal.candidate_claim, "updated_at": created_at}
                )
            )
    elif action == "accept_as_revision":
        if target_node is None:
            raise KeyError(canonical_key)
        created_revision = _create_revision(
            repository,
            proposal=proposal,
            memory_id=target_node.memory_id,
            created_at=created_at,
        )
        revision_id = created_revision.revision_id
        repository.save_memory_node(
            target_node.model_copy(
                update={"summary": proposal.candidate_claim, "updated_at": created_at}
            )
        )
        effective_target_memory_id = target_node.memory_id
    elif action == "reinforce_existing":
        if target_node is None:
            raise KeyError(canonical_key)
        created_revision = _create_revision(
            repository,
            proposal=proposal,
            memory_id=target_node.memory_id,
            created_at=created_at,
            summary=target_node.summary,
            extra_payload={"reinforced_by": proposal.proposal_id},
        )
        revision_id = created_revision.revision_id
        effective_target_memory_id = target_node.memory_id
    elif action in {"reject", "defer"}:
        if target_node is None:
            raise KeyError(canonical_key)
        effective_target_memory_id = target_node.memory_id

    if effective_target_memory_id is None:
        raise ValueError("effective target memory id is required")

    stored_decision = repository.save_memory_decision(
        MemoryDecision(
            decision_id=f"decision:{proposal.proposal_id}:{action}",
            memory_id=effective_target_memory_id,
            revision_id=revision_id,
            decision_type=action,
            rationale=rationale,
            created_at=created_at,
            decided_by=decided_by,
            metadata={
                "proposal_id": proposal.proposal_id,
                "change_type": proposal.change_type,
                "canonical_key": canonical_key,
            },
        )
    )

    return MemoryJudgeDecision(
        action=action,
        target_memory_id=effective_target_memory_id,
        target_revision_id=revision_id,
        rationale=rationale,
        created_revision=None if created_revision is None else created_revision.model_dump(),
        created_decision_id=stored_decision.decision_id,
        metadata=stored_decision.metadata,
    )


def _create_memory_node(
    repository: MemoryOSRepository,
    *,
    proposal: MemoryProposal,
    created_at: str,
) -> MemoryNode:
    canonical_key = _require_canonical_key(proposal)
    payload = proposal.candidate_payload
    return repository.save_memory_node(
        MemoryNode(
            memory_id=f"mem:{canonical_key}",
            canonical_key=canonical_key,
            owner_type=str(payload.get("owner_type") or "user"),
            scope=str(payload.get("scope") or "user"),
            node_type=proposal.proposed_kind,
            status="active",
            summary=proposal.candidate_claim,
            created_at=created_at,
            updated_at=created_at,
            metadata={
                "memory_type": payload.get("memory_type", "semantic"),
                "subject_id": payload.get("subject_id", "user:main"),
                "proposal_id": proposal.proposal_id,
            },
        )
    )


def _create_revision(
    repository: MemoryOSRepository,
    *,
    proposal: MemoryProposal,
    memory_id: str,
    created_at: str,
    summary: str | None = None,
    extra_payload: dict[str, object] | None = None,
) -> MemoryRevision:
    revision_number = repository.next_revision_number(memory_id)
    payload = {
        "proposal_id": proposal.proposal_id,
        "candidate_payload": proposal.candidate_payload,
        "supporting_evidence_ids": proposal.supporting_evidence_ids,
    }
    if extra_payload:
        payload.update(extra_payload)
    return repository.save_memory_revision(
        MemoryRevision(
            revision_id=f"{memory_id}:rev:{revision_number}",
            memory_id=memory_id,
            revision_number=revision_number,
            summary=summary or proposal.candidate_claim,
            evidence_ref=proposal.supporting_evidence_ids[0] if proposal.supporting_evidence_ids else None,
            created_at=created_at,
            payload=payload,
        )
    )


def _require_canonical_key(proposal: MemoryProposal) -> str:
    canonical_key = str(proposal.candidate_payload.get("canonical_key") or "").strip()
    if not canonical_key:
        raise ValueError("proposal.candidate_payload.canonical_key is required")
    return canonical_key


def _is_locked(repository: MemoryOSRepository, memory_id: str) -> bool:
    node = repository.get_memory_node(memory_id)
    if node is None:
        return False
    if bool(node.metadata.get("frozen")):
        return True
    return len(repository.list_user_overrides(memory_id=memory_id)) > 0
