from pathlib import Path

import pytest

from nion.uploads.manager import (
    PathTraversalError,
    delete_file_safe,
    normalize_filename,
    upload_artifact_url,
)


def test_normalize_filename_rejects_backslash():
    with pytest.raises(ValueError, match="backslash"):
        normalize_filename(r"..\\evil.txt")


def test_upload_artifact_url_percent_encodes_filename():
    assert upload_artifact_url("thread-1", "hello world?.txt").endswith(
        "/api/threads/thread-1/artifacts/mnt/user-data/uploads/hello%20world%3F.txt"
    )


def test_delete_file_safe_rejects_path_traversal(tmp_path: Path):
    uploads_dir = tmp_path / "uploads"
    uploads_dir.mkdir()

    with pytest.raises(PathTraversalError):
        delete_file_safe(uploads_dir, "../escape.txt")
