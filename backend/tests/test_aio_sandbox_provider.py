"""Tests for AioSandboxProvider ACP workspace mounts."""

from __future__ import annotations

import importlib

from nion.config.paths import Paths


def test_ensure_thread_dirs_creates_acp_workspace(tmp_path):
    paths = Paths(base_dir=tmp_path)
    paths.ensure_thread_dirs("thread-1")

    assert (tmp_path / "threads" / "thread-1" / "acp-workspace").exists()


def test_get_thread_mounts_includes_acp_workspace(tmp_path, monkeypatch):
    aio_mod = importlib.import_module("nion.community.aio_sandbox.aio_sandbox_provider")
    monkeypatch.setattr(aio_mod, "get_paths", lambda: Paths(base_dir=tmp_path))

    mounts = aio_mod.AioSandboxProvider._get_thread_mounts("thread-3")
    container_paths = {mount[1]: (mount[0], mount[2]) for mount in mounts}

    assert "/mnt/acp-workspace" in container_paths
    host_path, read_only = container_paths["/mnt/acp-workspace"]
    assert host_path == str(tmp_path / "threads" / "thread-3" / "acp-workspace")
    assert read_only is True
