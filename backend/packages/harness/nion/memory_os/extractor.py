from __future__ import annotations

import hashlib
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from langchain_core.messages import HumanMessage

from nion.memory.evidence_vault.models import EvidenceDocument
from nion.memory.extraction.models import MemoryProposal
from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory_os.clock import utcnow_z

from .models import CandidateRecord


def extract_candidates_from_exchange(
    *,
    messages: list[Any],
    thread_id: str,
) -> list[CandidateRecord]:
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=_human_evidence_documents(messages=messages, thread_id=thread_id)
    )
    return [_proposal_to_candidate(proposal=proposal, thread_id=thread_id) for proposal in proposals]


def _human_evidence_documents(*, messages: list[Any], thread_id: str) -> list[EvidenceDocument]:
    documents: list[EvidenceDocument] = []
    now = utcnow_z()
    for index, message in enumerate(messages):
        if not isinstance(message, HumanMessage):
            continue
        content = str(message.content).strip()
        if not content:
            continue
        evidence_id = f"compat_{hashlib.sha1(f'{thread_id}:{index}:{content}'.encode()).hexdigest()[:12]}"
        message_id = getattr(message, "id", None) or f"human-{index}"
        documents.append(
            EvidenceDocument(
                evidence_id=evidence_id,
                source_type="human_message",
                thread_id=thread_id,
                turn_id=str(message_id),
                actor="user",
                created_at=now,
                content_raw=content,
                content_normalized=content,
                artifact_uri=None,
                durability_scope="session_ephemeral",
                metadata={"compatibility_wrapper": True},
            )
        )
    return documents


def _proposal_to_candidate(*, proposal: MemoryProposal, thread_id: str) -> CandidateRecord:
    created_at = utcnow_z()
    expires_at = _expires_at(created_at=created_at, stability=proposal.estimated_stability)
    subtype_map = {
        "explicit_preference": "communication_preference",
        "user_name": "identity_name",
        "mutual_addressing": "mutual_addressing",
        "work_context": "work_context",
        "address_style": "address_style",
        "initiative_boundary": "initiative_policy",
        "learning_topic_hint": "topic",
    }
    return CandidateRecord(
        candidate_id=f"cand_{uuid.uuid4().hex[:10]}",
        proposed_domain=proposal.proposed_domain,
        proposed_subtype=subtype_map[proposal.proposed_kind],
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        summary=proposal.candidate_claim,
        raw_evidence_refs=list(proposal.supporting_evidence_ids) or [f"{thread_id}#latest_human"],
        confidence=proposal.estimated_confidence,
        status="candidate",
        created_at=created_at,
        expires_at=expires_at,
        producer="post_turn_extractor",
    )


def _expires_at(*, created_at: str, stability: str) -> str:
    ttl_by_stability = {
        "ephemeral": timedelta(days=1),
        "volatile": timedelta(days=7),
        "stable": timedelta(days=30),
        "core": timedelta(days=90),
    }
    created_at_dt = datetime.fromisoformat(created_at.replace("Z", "+00:00")).astimezone(UTC)
    expires_at_dt = created_at_dt + ttl_by_stability.get(stability, timedelta(days=7))
    return expires_at_dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")
