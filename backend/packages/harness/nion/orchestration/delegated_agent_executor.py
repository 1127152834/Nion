from __future__ import annotations

import uuid
from collections.abc import Generator
from typing import Callable

from nion.client import NionClient, StreamEvent
from nion.memory_os.clock import utcnow_z
from nion.orchestration.models import ChildRunMessage, ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


class DelegatedAgentExecutor:
    def __init__(
        self,
        *,
        repository: ChildRunRepository | None = None,
        client_factory: Callable[[str], NionClient] | None = None,
    ) -> None:
        self._repository = repository or ChildRunRepository()
        self._client_factory = client_factory or (
            lambda agent_name: NionClient(agent_name=agent_name, subagent_enabled=False)
        )

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

        client = self._client_factory(agent_name)
        final_text = ""

        try:
            for event in client.stream(
                prompt,
                thread_id=f"{parent_thread_id}-{child_run_id}",
                agent_name=agent_name,
                model_name=model_name,
                memory_write=False,
                session_mode="temporary_chat",
                subagent_enabled=False,
            ):
                if event.type == "messages-tuple":
                    message_type = event.data.get("type")
                    content = event.data.get("content")
                    if message_type in {"ai", "tool"} and isinstance(content, str) and content:
                        role = "ai" if message_type == "ai" else "tool"
                        record.messages.append(
                            ChildRunMessage(
                                role=role,
                                content=content,
                                created_at=utcnow_z(),
                            )
                        )
                        self._repository.save(record)
                        if role == "ai":
                            final_text = content
                            yield StreamEvent(
                                type="custom",
                                data={
                                    "type": "child_run_running",
                                    "child_run_id": child_run_id,
                                    "message": content,
                                },
                            )
                elif event.type == "tool-activity":
                    record.tool_activity_timeline.append(event.data)
                    self._repository.save(record)

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
        except Exception as exc:
            failed = record.model_copy(
                update={
                    "status": "failed",
                    "error": str(exc),
                    "finished_at": utcnow_z(),
                }
            )
            self._repository.save(failed)
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_failed",
                    "child_run_id": child_run_id,
                    "error": str(exc),
                },
            )
        finally:
            closed = self._repository.close(parent_thread_id, child_run_id)
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_closed",
                    "child_run_id": child_run_id,
                    "status": closed.status,
                },
            )
