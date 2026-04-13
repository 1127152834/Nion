from __future__ import annotations

from nion.memory.search_fusion.models import SearchRouteHit
from nion.memory.search_fusion.structured_search_service import StructuredMemorySearchService
from nion.memory_os.repository import MemoryOSRepository


def test_structured_memory_search_service_prefers_vector_hits_before_lexical_fallback(
    tmp_path,
    monkeypatch,
) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem:user:finance",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )
    monkeypatch.setattr(
        "nion.memory.search_fusion.structured_search_service.search_vector_memory",
        lambda *, base_dir, query, filters, limit: [
            SearchRouteHit(candidate_id="mem:user:finance", route="vector", score=0.91)
        ],
    )

    service = StructuredMemorySearchService(base_dir=tmp_path, repository=repo)

    summaries = service.search(query="预算协同岗位", domain="user_model", limit=1)

    assert summaries == ["财务 BP"]


def test_structured_memory_search_service_falls_back_to_lexical_when_vector_search_times_out(
    tmp_path,
    monkeypatch,
) -> None:
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem:user:finance",
            "domain": "user_model",
            "subtype": "user_role",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "semantic",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务 BP",
            "confidence": 0.9,
            "created_at": "2026-04-11T00:00:00Z",
            "updated_at": "2026-04-11T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    monkeypatch.setattr(
        "nion.memory.search_fusion.structured_search_service.search_vector_memory",
        lambda *, base_dir, query, filters, limit: [],
    )

    service = StructuredMemorySearchService(base_dir=tmp_path, repository=repo)

    summaries = service.search(query="财务", domain="user_model", limit=1)

    assert summaries == ["财务 BP"]
