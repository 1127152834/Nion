from nion.openviking.notebook_projection import project_notebook_note


def test_project_notebook_note_preserves_note_identity_and_path():
    resource = project_notebook_note(
        note_id="note_123",
        title="Roadmap",
        source_relative_path="projects/alpha/roadmap.md",
        content_hash="hash-1",
        updated_at="2026-03-29T00:00:00Z",
    )

    assert resource.resource_uri == "viking://resources/notebook/projects/alpha/roadmap"
    assert resource.note_id == "note_123"
    assert resource.source_relative_path == "projects/alpha/roadmap.md"
