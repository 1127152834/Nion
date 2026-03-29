from nion.openviking.autodream_store import AutoDreamStore
from nion.openviking.autodream_models import DreamEntry


def test_autodream_store_writes_markdown_journal_entry(tmp_path):
    store = AutoDreamStore(base_dir=tmp_path)
    entry = DreamEntry(
        dream_id="dream_1",
        started_at="2026-03-30T00:00:00Z",
        ended_at="2026-03-30T00:05:00Z",
        time_window_start="2026-03-29T00:00:00Z",
        time_window_end="2026-03-30T00:00:00Z",
        summary="Consolidated notebook and recall learnings.",
        what_i_did=["Reviewed notebook retrieval work."],
        what_i_learned=["Notebook retrieval should stay provenance-rich."],
        what_changed=["Continuity now includes notebook resource context."],
        what_i_plan_to_change=["Add richer context assembly next."],
        what_i_changed=["Introduced a context assembler."],
        stale_items=["Old recall-only assumptions."],
        agent_memory_updates=["Keep notebook provenance explicit."],
        user_memory_candidates=[],
        action_proposals=["Draft next context assembly task."],
        sources=["recall", "notebook", "agent-memory"],
    )

    path = store.write_entry(entry)
    content = path.read_text(encoding="utf-8")

    assert "# AutoDream:" in content
    assert "Reviewed notebook retrieval work." in content
    assert "Keep notebook provenance explicit." in content
