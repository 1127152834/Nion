from __future__ import annotations

from nion.agents.lead_agent.agent import _build_middlewares


def test_lead_agent_middlewares_no_longer_inline_title_generation() -> None:
    middlewares = _build_middlewares({"configurable": {}}, model_name="test-model")
    middleware_names = [type(middleware).__name__ for middleware in middlewares]

    assert "TitleMiddleware" not in middleware_names
