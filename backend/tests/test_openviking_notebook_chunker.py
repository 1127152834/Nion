from nion.openviking.chunker import chunk_notebook_markdown


def test_chunk_notebook_markdown_prefers_heading_and_paragraph_boundaries():
    text = "# Alpha\n\nOne paragraph.\n\n## Next\n\nSecond paragraph."

    chunks = chunk_notebook_markdown(text)

    assert len(chunks) >= 2
    assert chunks[0].heading_path == ["Alpha"]
    assert "One paragraph" in chunks[0].text
    assert chunks[-1].heading_path == ["Alpha", "Next"]
