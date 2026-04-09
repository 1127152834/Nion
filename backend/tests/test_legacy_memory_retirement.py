from nion.agents.memory.queue import MemoryUpdateQueue, get_memory_queue
from nion.agents.memory.updater import MemoryUpdater


def test_legacy_memory_queue_is_explicitly_compatibility_only() -> None:
    queue = get_memory_queue()

    assert isinstance(queue, MemoryUpdateQueue)
    assert getattr(queue, "primary_path_enabled", None) is False
    assert "compatibility" in (queue.retirement_notice or "").lower()


def test_legacy_memory_updater_is_explicitly_compatibility_only() -> None:
    updater = MemoryUpdater()

    assert getattr(updater, "primary_path_enabled", None) is False
    assert "canonical memory os" in (updater.retirement_notice or "").lower()
