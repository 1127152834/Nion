from __future__ import annotations

from langchain_core.messages import AIMessage, HumanMessage

from nion.memory.evidence_vault.models import EvidenceDocument
from nion.memory.extraction.service import extract_memory_proposals_from_evidence
from nion.memory_os.extractor import extract_candidates_from_exchange


def _evidence_document(*, evidence_id: str, turn_id: str, content: str) -> EvidenceDocument:
    return EvidenceDocument(
        evidence_id=evidence_id,
        source_type="human_message",
        thread_id="thread-1",
        turn_id=turn_id,
        actor="user",
        created_at="2026-04-08T00:00:00Z",
        content_raw=content,
        content_normalized=content,
        artifact_uri=f"memory://evidence/{evidence_id}",
    )


def test_extract_memory_proposals_from_evidence_covers_supported_signal_types():
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=[
            _evidence_document(
                evidence_id="ev_pref",
                turn_id="turn-pref",
                content="以后请直接一点，先给结论，再展开细节。",
            ),
            _evidence_document(
                evidence_id="ev_work",
                turn_id="turn-work",
                content="我这周主要在推进支付风控迁移，还要补齐告警排查。",
            ),
            _evidence_document(
                evidence_id="ev_address",
                turn_id="turn-address",
                content="你称呼我老张就行，不用太正式。",
            ),
            _evidence_document(
                evidence_id="ev_boundary",
                turn_id="turn-boundary",
                content="不要替我拍板做决定，但可以主动提醒我风险。",
            ),
            _evidence_document(
                evidence_id="ev_learning",
                turn_id="turn-learning",
                content="最近我在补知识图谱检索和 RAG 评测方法，后面可能会继续追这个主题。",
            ),
        ]
    )

    kinds = {proposal.proposed_kind for proposal in proposals}

    assert kinds == {
        "explicit_preference",
        "work_context",
        "address_style",
        "initiative_boundary",
        "learning_topic_hint",
    }

    preference = next(proposal for proposal in proposals if proposal.proposed_kind == "explicit_preference")
    assert preference.proposed_domain == "user_model"
    assert preference.supporting_evidence_ids == ["ev_pref"]
    assert preference.candidate_payload["style"] == "conclusion_first"
    assert "explicit_user_statement" in preference.judge_hints

    work_context = next(proposal for proposal in proposals if proposal.proposed_kind == "work_context")
    assert work_context.proposed_domain == "user_model"
    assert work_context.supporting_evidence_ids == ["ev_work"]
    assert "支付风控迁移" in work_context.candidate_claim

    address_style = next(proposal for proposal in proposals if proposal.proposed_kind == "address_style")
    assert address_style.proposed_domain == "relationship"
    assert address_style.candidate_payload["preferred_address"] == "老张"
    assert address_style.candidate_payload["formality"] == "casual"

    boundary = next(proposal for proposal in proposals if proposal.proposed_kind == "initiative_boundary")
    assert boundary.proposed_domain == "relationship"
    assert boundary.candidate_payload["allow_proactive_warning"] is True
    assert boundary.candidate_payload["allow_decision_making"] is False

    learning = next(proposal for proposal in proposals if proposal.proposed_kind == "learning_topic_hint")
    assert learning.proposed_domain == "learning"
    assert learning.candidate_payload["topic"] == "知识图谱检索和 RAG 评测方法"
    assert learning.estimated_stability == "volatile"


def test_extract_memory_proposals_from_evidence_ignores_non_user_and_empty_content():
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=[
            _evidence_document(evidence_id="ev_empty", turn_id="turn-empty", content="   "),
            EvidenceDocument(
                evidence_id="ev_ai",
                source_type="assistant_message",
                thread_id="thread-1",
                turn_id="turn-ai",
                actor="assistant",
                created_at="2026-04-08T00:00:00Z",
                content_raw="我可以帮你总结。",
                content_normalized="我可以帮你总结。",
                artifact_uri="memory://evidence/ev_ai",
            ),
        ]
    )

    assert proposals == []


def test_extract_memory_proposals_from_evidence_extracts_user_identity_contract():
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=[
            _evidence_document(
                evidence_id="ev_identity",
                turn_id="turn-identity",
                content="我叫张天成，你以后叫我大哥，我叫你小老弟。",
            )
        ]
    )

    by_kind = {proposal.proposed_kind: proposal for proposal in proposals}

    assert "user_name" in by_kind
    assert "mutual_addressing" in by_kind

    user_name = by_kind["user_name"]
    assert user_name.proposed_domain == "user_model"
    assert user_name.candidate_payload["user_name"] == "张天成"
    assert user_name.supporting_evidence_ids == ["ev_identity"]

    mutual_addressing = by_kind["mutual_addressing"]
    assert mutual_addressing.proposed_domain == "relationship"
    assert mutual_addressing.candidate_payload == {
        "preferred_address_for_user": "大哥",
        "assistant_self_name": "小老弟",
        "mutual_addressing_rule": "你叫我大哥，我叫你小老弟",
    }
    assert mutual_addressing.supporting_evidence_ids == ["ev_identity"]


def test_extract_memory_proposals_from_evidence_extracts_stable_soul_and_extended_identity_signals():
    proposals = extract_memory_proposals_from_evidence(
        evidence_documents=[
            _evidence_document(
                evidence_id="ev_soul",
                turn_id="turn-soul",
                content=(
                    "我是财务 BP，时区是 Asia/Shanghai。"
                    "以后你回答冷静一点，先给结论，别太热情。"
                    "你以后不要替我拍板，关系上低刺激一点，少施压。"
                ),
            )
        ]
    )

    by_kind = {proposal.proposed_kind: proposal for proposal in proposals}

    assert by_kind["user_role"].candidate_payload == {"user_role": "财务 BP"}
    assert by_kind["timezone"].candidate_payload == {"timezone": "Asia/Shanghai"}
    assert by_kind["soul_speech_style"].candidate_payload == {
        "speech_style": "冷静、先给结论、少热情。"
    }
    assert by_kind["soul_values_and_boundaries"].candidate_payload == {
        "values_and_boundaries": "不替用户拍板。"
    }
    assert by_kind["soul_relationship_stance"].candidate_payload == {
        "relationship_stance": "低刺激、少施压。"
    }


def test_memory_os_extractor_is_thin_compatibility_wrapper_over_extraction_service():
    candidates = extract_candidates_from_exchange(
        messages=[
            HumanMessage(content="以后请直接一点，先给结论。"),
            AIMessage(content="明白。"),
            HumanMessage(content="你称呼我老张就行。"),
            HumanMessage(content="不要替我拍板，但可以主动提醒风险。"),
        ],
        thread_id="thread-1",
    )

    by_subtype = {candidate.proposed_subtype: candidate for candidate in candidates}

    assert set(by_subtype) == {
        "communication_preference",
        "address_style",
        "initiative_policy",
    }
    assert by_subtype["communication_preference"].raw_evidence_refs != ["thread-1#latest_human"]
    assert by_subtype["communication_preference"].raw_evidence_refs
    assert all(ref.startswith("compat_") for ref in by_subtype["communication_preference"].raw_evidence_refs)
    assert by_subtype["communication_preference"].producer == "post_turn_extractor"
    assert by_subtype["address_style"].proposed_domain == "relationship"
    assert by_subtype["initiative_policy"].proposed_domain == "relationship"
    assert by_subtype["communication_preference"].expires_at > by_subtype["communication_preference"].created_at
