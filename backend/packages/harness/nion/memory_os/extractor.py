from __future__ import annotations

import uuid
from typing import Any

from langchain_core.messages import HumanMessage

from .models import CandidateRecord


def _human_text(messages: list[Any]) -> str:
    texts: list[str] = []
    for message in messages:
        if isinstance(message, HumanMessage):
            texts.append(str(message.content))
    return "\n".join(texts)


def extract_candidates_from_exchange(
    *,
    messages: list[Any],
    thread_id: str,
) -> list[CandidateRecord]:
    text = _human_text(messages)
    candidates: list[CandidateRecord] = []
    if not text.strip():
        return candidates

    created_at = "2026-04-04T00:00:00Z"
    expires_at = "2026-04-18T00:00:00Z"

    if "直接" in text or "先给结论" in text:
        candidates.append(
            CandidateRecord(
                candidate_id=f"cand_{uuid.uuid4().hex[:10]}",
                proposed_domain="user_model",
                proposed_subtype="communication_preference",
                owner_type="agent",
                scope="user",
                memory_type="semantic",
                summary=text.strip(),
                raw_evidence_refs=[f"{thread_id}#latest_human"],
                confidence=0.8,
                status="candidate",
                created_at=created_at,
                expires_at=expires_at,
                producer="post_turn_extractor",
            )
        )

    if "不要太主动" in text or "可以提醒我" in text:
        candidates.append(
            CandidateRecord(
                candidate_id=f"cand_{uuid.uuid4().hex[:10]}",
                proposed_domain="relationship",
                proposed_subtype="initiative_policy",
                owner_type="agent",
                scope="user",
                memory_type="semantic",
                summary=text.strip(),
                raw_evidence_refs=[f"{thread_id}#latest_human"],
                confidence=0.8,
                status="candidate",
                created_at=created_at,
                expires_at=expires_at,
                producer="post_turn_extractor",
            )
        )

    return candidates
