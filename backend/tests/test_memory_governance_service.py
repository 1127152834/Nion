from __future__ import annotations

from pathlib import Path

from nion.memory.extraction.models import MemoryProposal
from nion.memory.governance.service import apply_memory_governance_decision
from nion.memory.judge.service import judge_memory_proposals
from nion.memory_os.repository import MemoryOSRepository


def _proposal(
    *,
    proposal_id: str,
    canonical_key: str,
    change_type: str,
    candidate_claim: str,
) -> MemoryProposal:
    return MemoryProposal(
        proposal_id=proposal_id,
        proposed_domain="user_model",
        proposed_kind="preference",
        candidate_claim=candidate_claim,
        candidate_payload={
            "canonical_key": canonical_key,
            "owner_type": "user",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:main",
        },
        supporting_evidence_ids=[f"evidence://{proposal_id}"],
        estimated_stability="stable",
        estimated_salience=0.8,
        estimated_confidence=0.9,
        change_type=change_type,
        judge_hints=["explicit_user_statement"],
    )


def _bootstrap_existing_memory(
    repo: MemoryOSRepository,
    *,
    memory_id: str,
    canonical_key: str,
    summary: str,
    frozen: bool = False,
) -> None:
    repo.save_memory_node(
        {
            "memory_id": memory_id,
            "canonical_key": canonical_key,
            "owner_type": "user",
            "scope": "user",
            "node_type": "preference",
            "status": "active",
            "summary": summary,
            "created_at": "2026-04-09T00:00:00Z",
            "updated_at": "2026-04-09T00:00:00Z",
            "metadata": {"frozen": frozen},
        }
    )
    repo.save_memory_revision(
        {
            "revision_id": f"{memory_id}:rev:1",
            "memory_id": memory_id,
            "revision_number": 1,
            "summary": summary,
            "evidence_ref": "evidence://initial",
            "created_at": "2026-04-09T00:00:00Z",
            "payload": {"canonical_key": canonical_key},
        }
    )


def test_judge_accepts_new_memory_and_persists_node_revision_and_decision(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")

    [decision] = judge_memory_proposals(
        repo,
        [
            _proposal(
                proposal_id="prop-new",
                canonical_key="user:writing_style",
                change_type="new",
                candidate_claim="用户偏好结论先行。",
            )
        ],
        created_at="2026-04-09T01:00:00Z",
    )

    node = repo.get_memory_node_by_canonical_key("user:writing_style")
    revisions = repo.list_memory_revisions(memory_id=node.memory_id)
    decisions = repo.list_memory_decisions(memory_id=node.memory_id)

    assert decision.action == "accept"
    assert node is not None
    assert node.summary == "用户偏好结论先行。"
    assert len(revisions) == 1
    assert revisions[0].revision_number == 1
    assert revisions[0].summary == "用户偏好结论先行。"
    assert len(decisions) == 1
    assert decisions[0].decision_type == "accept"
    assert decisions[0].revision_id == revisions[0].revision_id


def test_governance_accepts_revision_for_existing_memory(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _bootstrap_existing_memory(
        repo,
        memory_id="mem-writing-style",
        canonical_key="user:writing_style",
        summary="用户偏好结论先行。",
    )

    decision = apply_memory_governance_decision(
        repo,
        proposal=_proposal(
            proposal_id="prop-revise",
            canonical_key="user:writing_style",
            change_type="revise",
            candidate_claim="用户偏好先给结论，再补背景。",
        ),
        action="accept_as_revision",
        target_memory_id="mem-writing-style",
        rationale="Explicit user correction",
        created_at="2026-04-09T02:00:00Z",
    )

    node = repo.get_memory_node("mem-writing-style")
    revisions = repo.list_memory_revisions(memory_id="mem-writing-style")

    assert decision.action == "accept_as_revision"
    assert node is not None
    assert node.summary == "用户偏好先给结论，再补背景。"
    assert [revision.revision_number for revision in revisions] == [2, 1]
    assert revisions[0].summary == "用户偏好先给结论，再补背景。"


def test_governance_reinforces_existing_memory_with_new_revision(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _bootstrap_existing_memory(
        repo,
        memory_id="mem-tone",
        canonical_key="user:tone",
        summary="用户偏好克制、少鼓励式措辞。",
    )

    decision = apply_memory_governance_decision(
        repo,
        proposal=_proposal(
            proposal_id="prop-reinforce",
            canonical_key="user:tone",
            change_type="reinforce",
            candidate_claim="用户再次强调不要过度鼓励。",
        ),
        action="reinforce_existing",
        target_memory_id="mem-tone",
        rationale="Repeated explicit preference",
        created_at="2026-04-09T03:00:00Z",
    )

    node = repo.get_memory_node("mem-tone")
    revisions = repo.list_memory_revisions(memory_id="mem-tone")

    assert decision.action == "reinforce_existing"
    assert node is not None
    assert node.summary == "用户偏好克制、少鼓励式措辞。"
    assert [revision.revision_number for revision in revisions] == [2, 1]
    assert revisions[0].summary == "用户偏好克制、少鼓励式措辞。"
    assert revisions[0].payload["reinforced_by"] == "prop-reinforce"


def test_judge_rejects_expire_proposal_and_persists_decision_only(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _bootstrap_existing_memory(
        repo,
        memory_id="mem-schedule",
        canonical_key="user:meeting_window",
        summary="用户通常上午有空。",
    )

    [decision] = judge_memory_proposals(
        repo,
        [
            _proposal(
                proposal_id="prop-expire",
                canonical_key="user:meeting_window",
                change_type="expire",
                candidate_claim="原有时间窗信息已经失效。",
            )
        ],
        created_at="2026-04-09T04:00:00Z",
    )

    decisions = repo.list_memory_decisions(memory_id="mem-schedule")
    revisions = repo.list_memory_revisions(memory_id="mem-schedule")

    assert decision.action == "reject"
    assert decisions[0].decision_type == "reject"
    assert decisions[0].revision_id is None
    assert [revision.revision_number for revision in revisions] == [1]


def test_judge_defers_when_memory_is_frozen_or_user_overridden(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _bootstrap_existing_memory(
        repo,
        memory_id="mem-language",
        canonical_key="user:language",
        summary="用户偏好中文交流。",
        frozen=True,
    )
    repo.save_user_override(
        {
            "override_id": "override-language-summary",
            "memory_id": "mem-language",
            "field_name": "summary",
            "value": {"value": "用户偏好中文交流。"},
            "reason": "user pinned preference",
            "created_at": "2026-04-09T00:10:00Z",
            "updated_at": "2026-04-09T00:10:00Z",
        }
    )

    [decision] = judge_memory_proposals(
        repo,
        [
            _proposal(
                proposal_id="prop-language-revise",
                canonical_key="user:language",
                change_type="revise",
                candidate_claim="用户最近更偏好英文交流。",
            )
        ],
        created_at="2026-04-09T05:00:00Z",
    )

    node = repo.get_memory_node("mem-language")
    decisions = repo.list_memory_decisions(memory_id="mem-language")
    revisions = repo.list_memory_revisions(memory_id="mem-language")

    assert decision.action == "defer"
    assert node is not None
    assert node.summary == "用户偏好中文交流。"
    assert decisions[0].decision_type == "defer"
    assert [revision.revision_number for revision in revisions] == [1]


def test_governance_service_defers_direct_mutation_when_memory_is_locked(tmp_path: Path) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    _bootstrap_existing_memory(
        repo,
        memory_id="mem-format",
        canonical_key="user:format",
        summary="用户偏好短段落。",
        frozen=True,
    )

    decision = apply_memory_governance_decision(
        repo,
        proposal=_proposal(
            proposal_id="prop-format-revise",
            canonical_key="user:format",
            change_type="revise",
            candidate_claim="用户偏好一行一要点。",
        ),
        action="accept_as_revision",
        target_memory_id="mem-format",
        rationale="Direct governance call",
        created_at="2026-04-09T06:00:00Z",
    )

    node = repo.get_memory_node("mem-format")
    decisions = repo.list_memory_decisions(memory_id="mem-format")
    revisions = repo.list_memory_revisions(memory_id="mem-format")

    assert decision.action == "defer"
    assert node is not None
    assert node.summary == "用户偏好短段落。"
    assert decisions[0].decision_type == "defer"
    assert [revision.revision_number for revision in revisions] == [1]
