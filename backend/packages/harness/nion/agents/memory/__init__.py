"""Memory module for Nion.

This module provides a global memory mechanism that:
- Stores user context and conversation history in memory.json
- Uses LLM to summarize and extract facts from conversations
- Injects relevant memory into system prompts for personalized responses
"""

from nion.agents.memory.prompt import (
    FACT_EXTRACTION_PROMPT,
    MEMORY_UPDATE_PROMPT,
    format_conversation_for_update,
    format_memory_for_injection,
)
from nion.agents.memory.queue import (
    ConversationContext,
    MemoryUpdateQueue,
    get_memory_queue,
    reset_memory_queue,
)
from nion.agents.memory.storage import (
    FileMemoryStorage,
    MemoryStorage,
    get_memory_storage,
)
from nion.agents.memory.updater import (
    MemoryUpdater,
    clear_memory_data,
    create_memory_fact,
    delete_memory_fact,
    get_memory_data,
    import_memory_data,
    reload_memory_data,
    update_memory_fact,
    update_memory_from_conversation,
)

__all__ = [
    # Prompt utilities
    "MEMORY_UPDATE_PROMPT",
    "FACT_EXTRACTION_PROMPT",
    "format_memory_for_injection",
    "format_conversation_for_update",
    # Queue
    "ConversationContext",
    "MemoryUpdateQueue",
    "get_memory_queue",
    "reset_memory_queue",
    # Storage
    "MemoryStorage",
    "FileMemoryStorage",
    "get_memory_storage",
    # Updater
    "MemoryUpdater",
    "clear_memory_data",
    "create_memory_fact",
    "delete_memory_fact",
    "get_memory_data",
    "import_memory_data",
    "reload_memory_data",
    "update_memory_fact",
    "update_memory_from_conversation",
]
