from __future__ import annotations

import uuid
from collections.abc import Generator
from typing import Callable

from nion.client import NionClient, StreamEvent
from nion.config.agents_config import AgentConfig, resolve_agent_config
from nion.memory_os.clock import utcnow_z
from nion.orchestration.delegation_policy import (
    DelegatedExecutionProfile,
    build_delegated_execution_profile,
)
from nion.orchestration.models import ChildRunMessage, ChildRunRecord
from nion.orchestration.repository import ChildRunRepository


class DelegatedAgentExecutor:
    def __init__(
        self,
        *,
        repository: ChildRunRepository | None = None,
        client_factory=None,
        agent_resolver: Callable[[str], AgentConfig | None] | None = None,
        profile_builder: Callable[..., DelegatedExecutionProfile] | None = None,
    ) -> None:
        self._repository = repository or ChildRunRepository()
        self._client_factory = client_factory or (
            lambda **kwargs: NionClient(agent_name=kwargs["agent_name"], subagent_enabled=False)
        )
        self._agent_resolver = agent_resolver or resolve_agent_config
        self._profile_builder = profile_builder or build_delegated_execution_profile

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
        caller_permissions: set[str] | None = None,
    ) -> Generator[StreamEvent, None, None]:
        agent_config = self._agent_resolver(agent_name)
        effective_permissions = caller_permissions or set(agent_config.tool_groups or []) if agent_config else set()
        profile = (
            self._profile_builder(
                agent_config,
                caller_permissions=effective_permissions,
            )
            if agent_config is not None
            else DelegatedExecutionProfile(agent_name=agent_name)
        )
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

        try:
            tool_groups_override = (
                sorted(set(agent_config.tool_groups or []) & set(profile.effective_permissions))
                if agent_config is not None and agent_config.tool_groups and profile.effective_permissions
                else (agent_config.tool_groups if agent_config is not None else None)
            )
            overlay = (
                profile.soul_overlay
                if not profile.allow_direct_user_reply
                else ""
            )
            client = self._client_factory(agent_name=agent_name)
            final_text = ""
            for event in client.stream(
                prompt,
                thread_id=f"{parent_thread_id}-{child_run_id}",
                agent_name=agent_name,
                model_name=model_name,
                requested_skills=profile.allowed_private_skills,
                tool_groups_override=tool_groups_override,
                additional_system_prompt=overlay,
                memory_write=profile.allow_memory_write,
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
            self._repository.close(parent_thread_id, child_run_id)
            yield StreamEvent(
                type="custom",
                data={
                    "type": "child_run_closed",
                    "child_run_id": child_run_id,
                },
            )
