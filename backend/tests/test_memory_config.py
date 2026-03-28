from __future__ import annotations

from nion.config.memory_config import MemoryConfig


def test_memory_config_accepts_storage_class():
    config = MemoryConfig(
        storage_class="nion.agents.memory.storage.FileMemoryStorage"
    )

    assert config.storage_class == "nion.agents.memory.storage.FileMemoryStorage"
