from __future__ import annotations

from nion.config.memory_config import MemoryConfig


def test_memory_config_defaults_to_explicit_compat_storage_class():
    config = MemoryConfig()

    assert config.storage_class == "nion.compat_memory.storage.FileMemoryStorage"


def test_memory_config_accepts_storage_class():
    config = MemoryConfig(
        storage_class="nion.compat_memory.storage.FileMemoryStorage"
    )

    assert config.storage_class == "nion.compat_memory.storage.FileMemoryStorage"
