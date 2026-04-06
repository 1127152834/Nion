from __future__ import annotations

import asyncio
from pathlib import Path

from nion.utils import file_conversion
from nion.config.app_config import get_app_config, reset_app_config
from nion.config.config_repository import ConfigRepository
from nion.config.extensions_config import reset_extensions_config


def test_pdf_conversion_uses_pymupdf4llm_first(monkeypatch, tmp_path: Path) -> None:
    source = tmp_path / "report.pdf"
    source.write_bytes(b"%PDF-1.7")
    calls: list[Path] = []

    def fake_pymupdf_convert(path: Path) -> str:
        calls.append(path)
        return "# Converted by PyMuPDF\n"

    def fail_markitdown_convert(_path: Path) -> str:
        raise AssertionError("markitdown should only be used as fallback")

    monkeypatch.setattr(file_conversion, "_convert_pdf_with_pymupdf4llm", fake_pymupdf_convert)
    monkeypatch.setattr(file_conversion, "_convert_with_markitdown", fail_markitdown_convert)

    md_path = asyncio.run(file_conversion.convert_file_to_markdown(source))

    assert md_path == source.with_suffix(".md")
    assert md_path.read_text(encoding="utf-8") == "# Converted by PyMuPDF\n"
    assert calls == [source]


def test_pdf_conversion_falls_back_to_markitdown_when_pymupdf4llm_fails(
    monkeypatch, tmp_path: Path
) -> None:
    source = tmp_path / "report.pdf"
    source.write_bytes(b"%PDF-1.7")

    def fail_pymupdf_convert(_path: Path) -> str:
        raise RuntimeError("pymupdf4llm failed")

    monkeypatch.setattr(file_conversion, "_convert_pdf_with_pymupdf4llm", fail_pymupdf_convert)
    monkeypatch.setattr(file_conversion, "_convert_with_markitdown", lambda _path: "fallback markdown")

    md_path = asyncio.run(file_conversion.convert_file_to_markdown(source))

    assert md_path == source.with_suffix(".md")
    assert md_path.read_text(encoding="utf-8") == "fallback markdown"


def test_large_file_conversion_runs_in_thread(monkeypatch, tmp_path: Path) -> None:
    source = tmp_path / "large.docx"
    source.write_bytes(b"0" * (file_conversion.DEFAULT_THREAD_OFFLOAD_THRESHOLD_BYTES + 1))
    observed: dict[str, object] = {}

    async def fake_to_thread(func, *args, **kwargs):
        observed["func"] = func
        observed["args"] = args
        observed["kwargs"] = kwargs
        return func(*args, **kwargs)

    monkeypatch.setattr(file_conversion.asyncio, "to_thread", fake_to_thread)
    monkeypatch.setattr(file_conversion, "_convert_with_markitdown", lambda _path: "large markdown")

    md_path = asyncio.run(file_conversion.convert_file_to_markdown(source))

    assert md_path == source.with_suffix(".md")
    assert md_path.read_text(encoding="utf-8") == "large markdown"
    assert observed == {
        "func": file_conversion._convert_document_to_markdown_text,
        "args": (source,),
        "kwargs": {},
    }


def test_extract_outline_supports_markdown_and_split_bold_headings(tmp_path: Path) -> None:
    md_path = tmp_path / "outline.md"
    md_path.write_text(
        "\n".join(
            [
                "# 项目概述",
                "正文",
                "## 实施计划",
                "**1** **实验设置**",
                "继续正文",
                "**2.1** **结果分析**",
                "**not a heading**",
            ]
        ),
        encoding="utf-8",
    )

    outline = file_conversion.extract_outline(md_path)

    assert outline == [
        {"level": 1, "title": "项目概述", "line": 1},
        {"level": 2, "title": "实施计划", "line": 3},
        {"level": 2, "title": "实验设置", "number": "1", "line": 4},
        {"level": 3, "title": "结果分析", "number": "2.1", "line": 6},
    ]
    assert outline[2]["title"] == "实验设置"
    assert outline[2]["line"] == 4


def test_app_config_loads_document_conversion_section_from_store(tmp_path: Path, monkeypatch) -> None:
    db_path = tmp_path / "config.db"
    extensions_path = tmp_path / "extensions_config.json"
    extensions_path.write_text('{"mcpServers": {}, "skills": {}}', encoding="utf-8")

    reset_app_config()
    reset_extensions_config()

    try:
        monkeypatch.setenv("NION_CONFIG_DB_PATH", str(db_path))
        monkeypatch.setenv("NION_EXTENSIONS_CONFIG_PATH", str(extensions_path))

        repository = ConfigRepository()
        config, version, _ = repository.read()
        config["document_conversion"] = {
            "thread_offload_threshold_bytes": 2048,
        }
        repository.write(config, version)

        app_config = get_app_config()

        assert app_config.document_conversion.thread_offload_threshold_bytes == 2048
    finally:
        reset_app_config()
        reset_extensions_config()
