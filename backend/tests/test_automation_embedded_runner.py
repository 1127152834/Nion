from types import SimpleNamespace

from nion.automation.executor import EmbeddedAutomationRunner
from nion.client import StreamEvent


class DummyClient:
    def stream(self, prompt: str, *, thread_id: str, **kwargs):
        assert prompt == "hello"
        assert thread_id == "thread-1"
        yield StreamEvent(
            type="values",
            data={
                "messages": [
                    {
                        "type": "ai",
                        "content": "embedded response",
                        "id": "ai-1",
                    }
                ],
                "artifacts": ["/mnt/user-data/outputs/report.md"],
            },
        )


def test_embedded_automation_runner_accepts_nion_client() -> None:
    runner = EmbeddedAutomationRunner(client=DummyClient())  # type: ignore[arg-type]
    result = runner.run(
        prompt="hello",
        thread_id="thread-1",
        context={"surface": "automation"},
        config={"recursion_limit": 10},
    )

    assert result.response_text == "embedded response"
    assert result.artifacts == ["/mnt/user-data/outputs/report.md"]
