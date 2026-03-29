from nion.openviking.resource_store import OpenVikingResourceStore


def test_resource_store_upserts_notebook_note_identity(tmp_path):
    store = OpenVikingResourceStore(
        resources_db_file=tmp_path / "resources.sqlite3",
    )

    store.upsert_notebook_note(
        resource_uri="viking://resources/notebook/projects/alpha/roadmap",
        note_id="note_123",
        title="Roadmap",
        source_relative_path="projects/alpha/roadmap.md",
        content_hash="hash-1",
        updated_at="2026-03-29T00:00:00Z",
    )

    rows = store.list_resources()
    assert len(rows) == 1
    assert rows[0].note_id == "note_123"
    assert rows[0].source_relative_path == "projects/alpha/roadmap.md"
