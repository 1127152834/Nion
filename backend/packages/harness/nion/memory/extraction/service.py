from __future__ import annotations

import re
import uuid
from collections.abc import Iterable

from nion.memory.evidence_vault.models import EvidenceDocument
from nion.memory.extraction.models import MemoryProposal


def extract_memory_proposals_from_evidence(
    *,
    evidence_documents: Iterable[EvidenceDocument],
) -> list[MemoryProposal]:
    proposals: list[MemoryProposal] = []
    for evidence in evidence_documents:
        if evidence.actor != "user" or evidence.source_type != "human_message":
            continue
        content = evidence.content_normalized.strip()
        if not content:
            continue
        proposals.extend(_extract_from_content(content=content, evidence_id=evidence.evidence_id))
    return proposals


def _extract_from_content(*, content: str, evidence_id: str) -> list[MemoryProposal]:
    proposals: list[MemoryProposal] = []

    user_name = _extract_user_name(content=content, evidence_id=evidence_id)
    if user_name is not None:
        proposals.append(user_name)

    mutual_addressing = _extract_mutual_addressing(content=content, evidence_id=evidence_id)
    if mutual_addressing is not None:
        proposals.append(mutual_addressing)

    preference = _extract_explicit_preference(content=content, evidence_id=evidence_id)
    if preference is not None:
        proposals.append(preference)

    work_context = _extract_work_context(content=content, evidence_id=evidence_id)
    if work_context is not None:
        proposals.append(work_context)

    address_style = _extract_address_style(content=content, evidence_id=evidence_id)
    if address_style is not None:
        proposals.append(address_style)

    initiative_boundary = _extract_initiative_boundary(content=content, evidence_id=evidence_id)
    if initiative_boundary is not None:
        proposals.append(initiative_boundary)

    learning_topic = _extract_learning_topic_hint(content=content, evidence_id=evidence_id)
    if learning_topic is not None:
        proposals.append(learning_topic)

    return proposals


def _extract_user_name(*, content: str, evidence_id: str) -> MemoryProposal | None:
    match = re.search(r"(?:我叫|我的名字叫|我的名字是)([^，。！？；\s]{1,16})", content)
    if match is None:
        return None
    user_name = _clean_fragment(match.group(1))
    if not user_name:
        return None
    return _proposal(
        proposed_domain="user_model",
        proposed_kind="user_name",
        candidate_claim=f"用户姓名：{user_name}",
        candidate_payload={"user_name": user_name},
        supporting_evidence_ids=[evidence_id],
        estimated_stability="core",
        estimated_salience=0.94,
        estimated_confidence=0.98,
        change_type="new",
        judge_hints=["explicit_user_statement", "user_identity_signal"],
    )


def _extract_mutual_addressing(*, content: str, evidence_id: str) -> MemoryProposal | None:
    match = _match_mutual_addressing(content=content)
    if match is None:
        return None

    preferred_address_for_user, assistant_self_name = match
    rule = f"你叫我{preferred_address_for_user}，我叫你{assistant_self_name}"
    return _proposal(
        proposed_domain="relationship",
        proposed_kind="mutual_addressing",
        candidate_claim=rule,
        candidate_payload={
            "preferred_address_for_user": preferred_address_for_user,
            "assistant_self_name": assistant_self_name,
            "mutual_addressing_rule": rule,
        },
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.92,
        estimated_confidence=0.97,
        change_type="new",
        judge_hints=["explicit_user_statement", "mutual_addressing_signal"],
    )


def _extract_explicit_preference(*, content: str, evidence_id: str) -> MemoryProposal | None:
    preference_hints: list[str] = []
    if any(token in content for token in ("直接一点", "直接些", "直接就好")):
        preference_hints.append("direct")
    if any(token in content for token in ("先给结论", "先说结论", "结论先行")):
        preference_hints.append("conclusion_first")
    if not preference_hints:
        return None

    style = "conclusion_first" if "conclusion_first" in preference_hints else "direct"
    return _proposal(
        proposed_domain="user_model",
        proposed_kind="explicit_preference",
        candidate_claim=content,
        candidate_payload={
            "style": style,
            "preference_hints": preference_hints,
        },
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.76,
        estimated_confidence=0.92,
        change_type="new",
        judge_hints=["explicit_user_statement", "preference_signal"],
    )


def _extract_work_context(*, content: str, evidence_id: str) -> MemoryProposal | None:
    for pattern in (
        r"(?:我这周主要在|最近主要在|现在主要在)([^。！？]+)",
        r"(?:正在推进|在推进|负责)([^。！？]+)",
    ):
        match = re.search(pattern, content)
        if match is None:
            continue
        focus = _clean_fragment(match.group(1))
        if not focus:
            continue
        claim = f"当前工作重心：{focus}"
        return _proposal(
            proposed_domain="user_model",
            proposed_kind="work_context",
            candidate_claim=claim,
            candidate_payload={"current_focus": focus},
            supporting_evidence_ids=[evidence_id],
            estimated_stability="volatile",
            estimated_salience=0.72,
            estimated_confidence=0.83,
            change_type="new",
            judge_hints=["explicit_user_statement", "work_context_signal"],
        )
    return None


def _extract_address_style(*, content: str, evidence_id: str) -> MemoryProposal | None:
    if _match_mutual_addressing(content=content) is not None:
        return None
    match = re.search(r"(?:称呼我|叫我)([^，。！；\s]{1,12})", content)
    if match is None:
        return None
    preferred_address = _clean_fragment(match.group(1))
    preferred_address = re.sub(r"(就行|即可|就好|好了?)$", "", preferred_address)
    if not preferred_address:
        return None
    formality = "casual" if any(token in content for token in ("就行", "不用太正式", "别太正式")) else "neutral"
    return _proposal(
        proposed_domain="relationship",
        proposed_kind="address_style",
        candidate_claim=content,
        candidate_payload={
            "preferred_address": preferred_address,
            "formality": formality,
        },
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.7,
        estimated_confidence=0.9,
        change_type="new",
        judge_hints=["explicit_user_statement", "address_preference_signal"],
    )


def _extract_initiative_boundary(*, content: str, evidence_id: str) -> MemoryProposal | None:
    allow_decision_making = None
    if any(token in content for token in ("不要替我拍板", "不要替我做决定", "别替我做决定")):
        allow_decision_making = False
    elif any(token in content for token in ("你可以替我拍板", "你来替我做决定")):
        allow_decision_making = True

    allow_proactive_warning = None
    if any(token in content for token in ("可以主动提醒", "主动提醒我风险", "可以主动催我")):
        allow_proactive_warning = True
    elif "不要主动提醒" in content:
        allow_proactive_warning = False

    if allow_decision_making is None and allow_proactive_warning is None:
        return None

    payload = {}
    if allow_decision_making is not None:
        payload["allow_decision_making"] = allow_decision_making
    if allow_proactive_warning is not None:
        payload["allow_proactive_warning"] = allow_proactive_warning

    return _proposal(
        proposed_domain="relationship",
        proposed_kind="initiative_boundary",
        candidate_claim=content,
        candidate_payload=payload,
        supporting_evidence_ids=[evidence_id],
        estimated_stability="stable",
        estimated_salience=0.78,
        estimated_confidence=0.91,
        change_type="new",
        judge_hints=["explicit_user_statement", "initiative_boundary_signal"],
    )


def _extract_learning_topic_hint(*, content: str, evidence_id: str) -> MemoryProposal | None:
    for pattern in (
        r"(?:最近我在补|最近在补|我在补|最近我在学|最近在学|我在学)([^。！？]+)",
        r"(?:后面可能会继续追|还会继续研究)([^。！？]+)",
    ):
        match = re.search(pattern, content)
        if match is None:
            continue
        topic = _clean_fragment(match.group(1))
        topic = re.split(r"[，,](?:后面可能会继续追|还会继续研究)", topic, maxsplit=1)[0]
        if not topic:
            continue
        return _proposal(
            proposed_domain="learning",
            proposed_kind="learning_topic_hint",
            candidate_claim=f"最近在跟进学习主题：{topic}",
            candidate_payload={"topic": topic},
            supporting_evidence_ids=[evidence_id],
            estimated_stability="volatile",
            estimated_salience=0.68,
            estimated_confidence=0.84,
            change_type="new",
            judge_hints=["explicit_user_statement", "learning_signal"],
        )
    return None


def _proposal(**kwargs: object) -> MemoryProposal:
    return MemoryProposal(proposal_id=f"prop_{uuid.uuid4().hex[:12]}", **kwargs)


def _match_mutual_addressing(*, content: str) -> tuple[str, str] | None:
    match = re.search(
        r"你(?:以后)?(?:就)?叫我([^，。！？；\s]{1,12})[，,、\s]*我(?:就)?叫你([^，。！？；\s]{1,12})",
        content,
    )
    if match is None:
        return None

    preferred_address_for_user = _clean_fragment(match.group(1))
    assistant_self_name = _clean_fragment(match.group(2))
    preferred_address_for_user = re.sub(r"(就行|即可|就好|好了?)$", "", preferred_address_for_user)
    assistant_self_name = re.sub(r"(就行|即可|就好|好了?)$", "", assistant_self_name)
    if not preferred_address_for_user or not assistant_self_name:
        return None
    return preferred_address_for_user, assistant_self_name


def _clean_fragment(value: str) -> str:
    return value.strip("，。！？；：:、 \n\t")
