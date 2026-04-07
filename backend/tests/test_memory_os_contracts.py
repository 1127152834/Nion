from nion.memory_os.contracts import (
    MEMORY_ACTION_LEVELS,
    MEMORY_DOMAINS,
    MEMORY_OWNER_TYPES,
    MEMORY_SCOPES,
    MEMORY_STATUSES,
    MEMORY_TYPES,
)
from nion.memory_os.models import CandidateRecord, MemoryRecord


def test_memory_os_contract_sets_are_stable():
    assert MEMORY_DOMAINS == (
        "recall",
        "user_model",
        "relationship",
        "knowledge_projection",
        "agent_self",
        "procedure",
        "soul",
        "learning",
        "automation_projection",
    )
    assert MEMORY_OWNER_TYPES == ("user", "agent", "shared", "system")
    assert MEMORY_SCOPES == ("thread", "session", "user", "agent", "workspace", "project")
    assert MEMORY_TYPES == ("working", "episodic", "semantic", "procedural")
    assert MEMORY_STATUSES == (
        "candidate",
        "active",
        "warm",
        "cold",
        "archived",
        "invalidated",
        "purged",
        "superseded",
    )
    assert MEMORY_ACTION_LEVELS == ("AUTO", "SUGGEST", "CONFIRM", "FORBID")


def test_memory_record_accepts_minimal_required_fields():
    record = MemoryRecord(
        memory_id="mem_01",
        domain="user_model",
        subtype="communication_preference",
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        subject_id="user:default",
        status="active",
        summary="用户偏好直接表达。",
        confidence=0.9,
        source_refs=["thread:abc#msg_1"],
        created_at="2026-04-04T00:00:00Z",
        updated_at="2026-04-04T00:00:00Z",
        provenance={"source_type": "conversation", "generated_by": "test"},
    )
    assert record.domain == "user_model"
    assert record.status == "active"


def test_candidate_record_requires_expiry_and_evidence():
    candidate = CandidateRecord(
        candidate_id="cand_01",
        proposed_domain="learning",
        proposed_subtype="topic",
        owner_type="agent",
        scope="user",
        memory_type="semantic",
        summary="用户反复询问财务表达。",
        raw_evidence_refs=["thread:abc#msg_2"],
        confidence=0.6,
        status="candidate",
        created_at="2026-04-04T00:00:00Z",
        expires_at="2026-04-18T00:00:00Z",
        producer="post_turn_extractor",
    )
    assert candidate.status == "candidate"
    assert candidate.raw_evidence_refs == ["thread:abc#msg_2"]
