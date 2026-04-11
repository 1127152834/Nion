from __future__ import annotations

import uuid
from collections.abc import Generator

from nion.client import NionClient, StreamEvent
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


class DelegatedAgentExecutor:
    def __init__(self, *, repository: ChildRunRepository | None = None) -> None:
        self._repository = repository or ChildRunRepository()

    def stream(
        self,
        *,
        parent_thread_id: str,
        agent_name: str,
        prompt: str,
        model_name: str | None = None,
    ) -> Generator[StreamEvent, None, None]:
        child_run_id = f"child-{uuid.uuid4().hex[:8]}"
        record = ChildRunRecord(
            child_run_id=child_run_id,
            parent_thread_id=parent_thread_id,
            agent_name=agent_name,
            title=agent_name,
            status="running",
            description=prompt,
            started_at=utcnow_z(),
        )
        self._repository.save(record)
        yield StreamEvent(
            type="custom",
            data={
                "type": "child_run_created",
                "child_run_id": child_run_id,
                "agent_name": agent_name,
            },
        )

        client = NionClient(agent_name=agent_name, subagent_enabled=False)
        final_text = ""
        for event in client.stream(
            prompt,
            thread_id=f"{parent_thread_id}-{child_run_id}",
            agent_name=agent_name,
            model_name=model_name,
            memory_write=False,
            session_mode="temporary_chat",
        ):
            if event.type == "messages-tuple" and event.data.get("type") == "ai":
                content = event.data.get("content", "")
                if isinstance(content, str) and content:
                    final_text = content
                    yield StreamEvent(
                        type="custom",
                        data={
                            "type": "child_run_running",
                            "child_run_id": child_run_id,
                            "message": content,
                        },
                    )

        completed = record.model_copy(
            update={
                "status": "completed",
                "result": final_text,
                "finished_at": utcnow_z(),
            }
        )
        self._repository.save(completed)
        yield StreamEvent(
            type="custom",
            data={
                "type": "child_run_completed",
                "child_run_id": child_run_id,
                "result": final_text,
            },
        )
        self._repository.close(parent_thread_id, child_run_id)
        yield StreamEvent(
            type="custom",
            data={
                "type": "child_run_closed",
                "child_run_id": child_run_id,
            },
        )
