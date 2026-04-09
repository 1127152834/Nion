from __future__ import annotations

from fastapi import APIRouter

from nion.config.paths import get_paths
from nion.memory.runtime_trace.store import MemoryLedgerStore

router = APIRouter(prefix="/api/memory/ledger", tags=["memory"])


@router.get("")
async def get_memory_ledger() -> dict[str, object]:
    store = MemoryLedgerStore(get_paths().memory_os_index_db_file)
    return {
        "nodes": store.list_nodes(),
        "current_revisions": store.list_current_revisions(),
    }
