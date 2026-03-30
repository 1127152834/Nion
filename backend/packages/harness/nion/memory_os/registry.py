from __future__ import annotations

from nion.memory_os.builtin_provider import BuiltinMemoryProviderFamily
from nion.memory_os.mem0_provider import Mem0MemoryProviderFamily
from nion.memory_os.openviking_provider import OpenVikingMemoryProviderFamily


def build_memory_os_registry():
    return {
        "builtin": BuiltinMemoryProviderFamily(),
        "mem0": Mem0MemoryProviderFamily(),
        "openviking": OpenVikingMemoryProviderFamily(),
    }
