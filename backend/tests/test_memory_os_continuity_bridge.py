from pathlib import Path

from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.runtime import Runtime

from nion.agents.middlewares.continuity_middleware import ContinuityMiddleware
from nion.memory_os.repository import MemoryOSRepository


def test_continuity_middleware_injects_memory_os_context_when_available(tmp_path: Path):
    repo = MemoryOSRepository(tmp_path / "memory-os" / "index.sqlite3")
    repo.save_memory_record(
        {
            "memory_id": "mem_01",
            "domain": "procedure",
            "subtype": "reporting",
            "owner_type": "agent",
            "scope": "user",
            "memory_type": "procedural",
            "subject_id": "user:default",
            "status": "active",
            "summary": "财务汇报默认使用结论/风险/动作三段式。",
            "confidence": 0.95,
            "created_at": "2026-04-04T00:00:00Z",
            "updated_at": "2026-04-04T00:00:00Z",
            "provenance": {"source_type": "test"},
        }
    )

    middleware = ContinuityMiddleware(base_dir=tmp_path)
    update = middleware.before_model(
        {"messages": [HumanMessage(content="继续帮我写财务周报", id="h-1")]},
        Runtime(context={"thread_id": "thread-1"}),
    )

    assert update is not None
    injected = update["messages"][0]
    assert isinstance(injected, SystemMessage)
    assert "三段式" in str(injected.content)
