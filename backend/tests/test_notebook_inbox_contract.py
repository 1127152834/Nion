from nion.notebook.history import NotebookHistoryService
from nion.notebook.models import NotebookAsset


def test_new_note_defaults_to_inbox_directory(tmp_path) -> None:
    service = NotebookHistoryService(base_dir=tmp_path)

    note = service.create_note(
        directory="",
        title="聊天总结",
        body="总结内容",
        actor_type="user",
    )

    assert note.relative_path.startswith("收件箱/")


def test_user_specified_directory_bypasses_default_inbox(tmp_path) -> None:
    service = NotebookHistoryService(base_dir=tmp_path)

    note = service.create_note(
        directory="知识库/产品",
        title="Notebook 定义",
        body="Notebook 是知识库",
        actor_type="user",
    )

    assert note.relative_path == "知识库/产品/notebook-定义.md"


def test_inbox_list_returns_note_and_asset_entries(tmp_path) -> None:
    service = NotebookHistoryService(base_dir=tmp_path)
    note = service.create_note(
        directory="",
        title="快速记录",
        body="待整理",
        actor_type="user",
    )
    asset = NotebookAsset(
        asset_id="asset_1",
        title="report.html",
        relative_path="收件箱/report.html",
        absolute_path=str(tmp_path / "notebook" / "收件箱" / "report.html"),
        source_kind="workspace_copy",
        mime_type="text/html",
        created_at="2026-04-02T00:00:00Z",
        updated_at="2026-04-02T00:00:00Z",
    )

    items = service._service.build_inbox_items(notes=[note], assets=[asset])

    assert [item.entry_type for item in items] == ["note", "asset"]
    assert items[0].note_id == note.note_id
    assert items[1].asset_id == asset.asset_id
