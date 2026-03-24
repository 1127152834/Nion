from dataclasses import dataclass, field
from typing import Protocol

from nion.automation.models import AutomationExecutionOutput, AutomationJob


class ThreadStateClient(Protocol):
    def update_state(self, thread_id: str, values: dict, *, as_node: str | None = None): ...


class ChannelPublisher(Protocol):
    def publish(self, request: "AutomationChannelDeliveryRequest") -> None: ...


@dataclass(slots=True)
class AutomationChannelDeliveryRequest:
    platform: str
    chat_id: str
    text: str
    artifacts: list[str] = field(default_factory=list)
    metadata: dict | None = None


class AutomationDeliveryService:
    def __init__(
        self,
        *,
        thread_client: ThreadStateClient | None = None,
        channel_publisher: ChannelPublisher | None = None,
    ):
        self._thread_client = thread_client
        self._channel_publisher = channel_publisher

    def deliver(self, job: AutomationJob, execution_output: AutomationExecutionOutput) -> list[dict]:
        if job.delivery_mode == "local" or not job.delivery_targets:
            return [{"mode": "local", "status": "recorded"}]

        results: list[dict] = []
        for target in job.delivery_targets:
            kind = target.get("kind")
            if kind == "thread":
                results.append(self._deliver_thread(target["thread_id"], execution_output))
            elif kind == "channel":
                results.append(self._deliver_channel(target["platform"], target["chat_id"], execution_output))
            elif kind == "local":
                results.append({"mode": "local", "status": "recorded"})
        return results

    def _deliver_thread(self, thread_id: str, execution_output: AutomationExecutionOutput) -> dict:
        if self._thread_client is None:
            return {"mode": "thread", "status": "unavailable", "thread_id": thread_id}

        self._thread_client.update_state(
            thread_id,
            {
                "messages": [
                    {
                        "type": "ai",
                        "content": execution_output.response_text,
                    }
                ],
                "artifacts": execution_output.artifacts,
            },
            as_node="automation",
        )
        return {"mode": "thread", "status": "delivered", "thread_id": thread_id}

    def _deliver_channel(self, platform: str, chat_id: str, execution_output: AutomationExecutionOutput) -> dict:
        if self._channel_publisher is None:
            return {"mode": "channel", "status": "unavailable", "platform": platform, "chat_id": chat_id}

        self._channel_publisher.publish(
            AutomationChannelDeliveryRequest(
                platform=platform,
                chat_id=chat_id,
                text=execution_output.response_text,
                artifacts=list(execution_output.artifacts),
                metadata={"isolated_thread_id": execution_output.isolated_thread_id},
            )
        )
        return {"mode": "channel", "status": "delivered", "platform": platform, "chat_id": chat_id}
