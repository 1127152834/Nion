from nion.openviking.chunk_store import OpenVikingChunkStore


def test_chunk_store_can_search_notebook_chunks(tmp_path):
    store = OpenVikingChunkStore(chunks_db_file=tmp_path / "chunks.sqlite3")
    store.replace_resource_chunks(
        resource_uri="viking://resources/notebook/projects/alpha/roadmap",
        note_id="note_123",
        title="Roadmap",
        source_relative_path="projects/alpha/roadmap.md",
        updated_at="2026-03-29T00:00:00Z",
        chunks=[
            {
                "chunk_index": 0,
                "text": "Alpha launch depends on onboarding quality.",
                "heading_path": ["Roadmap"],
                "char_start": 0,
                "char_end": 42,
            }
        ],
    )

    results = store.search("onboarding quality", limit=3)
    assert len(results) == 1
    assert results[0].resource_uri == "viking://resources/notebook/projects/alpha/roadmap"


def test_chunk_store_handles_fts_special_characters_without_crashing(tmp_path):
    store = OpenVikingChunkStore(chunks_db_file=tmp_path / "chunks.sqlite3")
    store.replace_resource_chunks(
        resource_uri="viking://resources/notebook/projects/alpha/debug",
        note_id="note_debug",
        title="Debug",
        source_relative_path="projects/alpha/debug.md",
        updated_at="2026-03-31T00:00:00Z",
        chunks=[
            {
                "chunk_index": 0,
                "text": "Debugging checklist for project chat flows.",
                "heading_path": ["Debug"],
                "char_start": 0,
                "char_end": 41,
            }
        ],
    )

    results = store.search("[project] chat", limit=3)

    assert isinstance(results, list)
