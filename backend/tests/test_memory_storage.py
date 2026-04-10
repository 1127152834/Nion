from __future__ import annotations

from unittest.mock import MagicMock, patch

from nion.config.memory_config import MemoryConfig, set_memory_config


def test_get_memory_storage_uses_configured_storage_class():
    import nion.agents.memory.storage as storage_module
    from nion.agents.memory.storage import FileMemoryStorage, get_memory_storage

    storage_module._storage_instance = None
    set_memory_config(
        MemoryConfig(
            storage_class="nion.compat_memory.storage.FileMemoryStorage"
        )
    )

    try:
        storage = get_memory_storage()
        assert isinstance(storage, FileMemoryStorage)
    finally:
        storage_module._storage_instance = None


def test_file_memory_storage_uses_agent_specific_path(tmp_path):
    from nion.agents.memory.storage import FileMemoryStorage

    def _mock_get_paths():
        mock_paths = MagicMock()
        mock_paths.agent_memory_file.return_value = (
            tmp_path / "agents" / "code-reviewer" / "memory.json"
        )
        mock_paths.base_dir = tmp_path
        mock_paths.memory_file = tmp_path / "memory.json"
        return mock_paths

    with (
        patch("nion.agents.memory.storage.get_paths", side_effect=_mock_get_paths),
        patch(
            "nion.agents.memory.storage.get_memory_config",
            return_value=MemoryConfig(storage_path=""),
        ),
    ):
        storage = FileMemoryStorage()
        path = storage._get_memory_file_path("code-reviewer")

    assert path == tmp_path / "agents" / "code-reviewer" / "memory.json"
