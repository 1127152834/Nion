from __future__ import annotations

import uuid
from collections.abc import Generator

from nion.client import NionClient, StreamEvent
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunMessage, ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


class DelegatedAgentExecutor:
    def __init__(
        self,
        *,
        repository: ChildRunRepository | None = None,
        client_factory=None,
    ) -> None:
        self._repository = repository or ChildRunRepository()
        self._client_factory = client_factory or (
            lambda **kwargs: NionClient(agent_name=kwargs["agent_name"], subagent_enabled=False)
        )

    def _append_message(
        self,
        record: ChildRunRecord,
        *,
        role: str,
        content: str,
    ) -> ChildRunRecord:
        updated = record.model_copy(
            update={
                "messages": [
                    *record.messages,
                    ChildRunMessage(
                        role=role,
                        content=content,
                        created_at=utcnow_z(),
                    ),
                ]
            }
        )
        self._repository.save(updated)
        return updated

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
        record = self._repository.save(record)
        record = self._append_message(record, role="human", content=prompt)
        yield StreamEvent(
            type="custom",
            data={
                "type": "child_run_created",
                "child_run_id": child_run_id,
                "agent_name": agent_name,
            },
        )

        client = self._client_factory(agent_name=agent_name)
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
                    record = self._append_message(record, role="ai", content=content)
                    yield StreamEvent(
                        type="custom",
                        data={
                            "type": "child_run_running",
                            "child_run_id": child_run_id,
                            "message": content,
                        },
                    )
            elif event.type == "messages-tuple" and event.data.get("type") == "tool":
                content = event.data.get("content", "")
                if isinstance(content, str) and content:
                    record = self._append_message(record, role="tool", content=content)

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
