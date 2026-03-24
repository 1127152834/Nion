from nion.automation.delivery import (
    AutomationChannelDeliveryRequest,
    AutomationDeliveryService,
)
from nion.automation.models import AutomationExecutionOutput, AutomationJob


def _execution_output() -> AutomationExecutionOutput:
    return AutomationExecutionOutput(
        response_text="Delivered summary",
        artifacts=["/mnt/user-data/outputs/summary.md"],
        isolated_thread_id="automation-job-1-run-1",
    )


def test_local_delivery_returns_history_record():
    job = AutomationJob(
        id="job-1",
        name="Morning summary",
        prompt="Summarize",
        schedule_kind="interval",
        schedule_value="900",
        delivery_mode="local",
        delivery_targets=[],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )
    service = AutomationDeliveryService()

    results = service.deliver(job, _execution_output())

    assert results == [{"mode": "local", "status": "recorded"}]


def test_thread_delivery_updates_target_thread_state():
    calls = []

    class DummyThreadClient:
        def update_state(self, thread_id, values, *, as_node=None):
            calls.append((thread_id, values, as_node))

    job = AutomationJob(
        id="job-1",
        name="Morning summary",
        prompt="Summarize",
        schedule_kind="interval",
        schedule_value="900",
        delivery_mode="thread",
        delivery_targets=[{"kind": "thread", "thread_id": "thread-123"}],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )
    service = AutomationDeliveryService(thread_client=DummyThreadClient())

    results = service.deliver(job, _execution_output())

    assert results == [{"mode": "thread", "status": "delivered", "thread_id": "thread-123"}]
    assert calls[0][0] == "thread-123"
    assert calls[0][1]["messages"][0]["type"] == "ai"
    assert calls[0][1]["artifacts"] == ["/mnt/user-data/outputs/summary.md"]
    assert calls[0][2] == "automation"


def test_channel_delivery_publishes_channel_request():
    requests = []

    class DummyPublisher:
        def publish(self, request: AutomationChannelDeliveryRequest):
            requests.append(request)

    job = AutomationJob(
        id="job-1",
        name="Morning summary",
        prompt="Summarize",
        schedule_kind="interval",
        schedule_value="900",
        delivery_mode="channel",
        delivery_targets=[
            {
                "kind": "channel",
                "platform": "telegram",
                "chat_id": "chat-123",
            }
        ],
        created_at="2026-03-24T00:00:00Z",
        updated_at="2026-03-24T00:00:00Z",
    )
    service = AutomationDeliveryService(channel_publisher=DummyPublisher())

    results = service.deliver(job, _execution_output())

    assert results == [{"mode": "channel", "status": "delivered", "platform": "telegram", "chat_id": "chat-123"}]
    assert requests[0].platform == "telegram"
    assert requests[0].chat_id == "chat-123"
    assert requests[0].text == "Delivered summary"
