from pathlib import Path

import pytest

from nion.runtime_profile import RuntimeProfileRepository, RuntimeProfileValidationError


def test_runtime_profile_defaults_to_sandbox(tmp_path):
    repository = RuntimeProfileRepository(base_dir=tmp_path)

    profile = repository.read("thread-123")

    assert profile["execution_mode"] == "sandbox"
    assert profile["host_workdir"] is None
    assert profile["locked"] is False


def test_runtime_profile_allows_web_host_mode_without_host_directory(tmp_path):
    repository = RuntimeProfileRepository(base_dir=tmp_path)

    profile = repository.update(
        "thread-123",
        execution_mode="host",
        host_workdir=None,
    )

    assert profile["execution_mode"] == "host"
    assert profile["host_workdir"] is None


def test_runtime_profile_rejects_rebinding_host_directory(tmp_path):
    repository = RuntimeProfileRepository(base_dir=tmp_path)
    first_dir = tmp_path / "host-a"
    second_dir = tmp_path / "host-b"
    first_dir.mkdir()
    second_dir.mkdir()

    repository.update(
        "thread-123",
        execution_mode="host",
        host_workdir=str(first_dir),
    )

    with pytest.raises(RuntimeProfileValidationError, match="already bound"):
        repository.update(
            "thread-123",
            execution_mode="host",
            host_workdir=str(second_dir),
        )


def test_runtime_profile_resolves_virtual_path_against_explicit_host_workdir(tmp_path):
    repository = RuntimeProfileRepository(base_dir=tmp_path)
    host_dir = tmp_path / "host-dir"
    host_dir.mkdir()

    resolved = repository.resolve_host_virtual_path(
        "/mnt/user-data/workspace/demo.txt",
        str(host_dir),
    )

    assert resolved == host_dir / "demo.txt"

