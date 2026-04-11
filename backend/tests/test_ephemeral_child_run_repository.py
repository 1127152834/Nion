from __future__ import annotations

from nion.orchestration.models import ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


def test_child_run_repository_round_trips_record(tmp_path) -> None:
    repo = ChildRunRepository(base_dir=tmp_path)
    record = ChildRunRecord(
        child_run_id="child-1",
        parent_thread_id="thread-1",
        agent_name="research-agent",
        title="Research Agent",
        status="created",
        description="Collect source material",
    )

    repo.save(record)

    loaded = repo.list_for_thread("thread-1")

    assert [item.child_run_id for item in loaded] == ["child-1"]
    assert loaded[0].agent_name == "research-agent"


def test_closing_child_run_removes_it_from_open_listing(tmp_path) -> None:
    repo = ChildRunRepository(base_dir=tmp_path)
    record = ChildRunRecord(
        child_run_id="child-2",
        parent_thread_id="thread-1",
        agent_name="writer-agent",
        title="Writer Agent",
        status="running",
        description="Summarize research",
    )

    repo.save(record)
    repo.close("thread-1", "child-2")

    assert repo.list_open_for_thread("thread-1") == []
    assert repo.get("thread-1", "child-2").status == "closed"
