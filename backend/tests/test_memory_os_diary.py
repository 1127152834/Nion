from pathlib import Path

from nion.memory_os.diary import MemoryOSDiaryWriter


def test_diary_writer_creates_markdown_artifact(tmp_path: Path):
    writer = MemoryOSDiaryWriter(base_dir=tmp_path)
    path = writer.write_entry(
        thread_id="thread-1",
        summary="今天用户连续问了财务汇报结构。",
        repeated_needs=["财务汇报结构"],
    )

    body = Path(path).read_text(encoding="utf-8")
    assert "财务汇报结构" in body
