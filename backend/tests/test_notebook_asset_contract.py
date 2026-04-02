from nion.notebook.models import NotebookAsset, NotebookInboxItem, NotebookNote


def test_notebook_asset_has_copy_semantics() -> None:
    asset = NotebookAsset(
        asset_id="asset_1",
        title="report.html",
        relative_path="收件箱/report.html",
        absolute_path="/tmp/notebook/收件箱/report.html",
        source_kind="workspace_copy",
        mime_type="text/html",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
        file_size=18,
    )

    assert asset.source_kind == "workspace_copy"
    assert asset.relative_path == "收件箱/report.html"
    assert "source_url" not in asset.model_dump()


def test_notebook_inbox_item_can_target_note_or_asset() -> None:
    note_item = NotebookInboxItem(
        inbox_id="inbox_note_1",
        entry_type="note",
        note_id="note_1",
        title="会议总结",
        relative_path="收件箱/会议总结.md",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
        summary="同步结论与下一步动作",
    )
    asset_item = NotebookInboxItem(
        inbox_id="inbox_asset_1",
        entry_type="asset",
        asset_id="asset_1",
        title="report.html",
        relative_path="收件箱/report.html",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
        mime_type="text/html",
    )

    assert note_item.note_id == "note_1"
    assert note_item.asset_id is None
    assert asset_item.asset_id == "asset_1"
    assert asset_item.note_id is None


def test_notebook_note_contract_still_exists() -> None:
    note = NotebookNote(
        note_id="note_1",
        title="Roadmap",
        relative_path="收件箱/roadmap.md",
        absolute_path="/tmp/notebook/收件箱/roadmap.md",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
        content_hash="hash",
        body="body",
    )

    assert note.note_id == "note_1"
