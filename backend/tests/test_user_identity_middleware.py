from langchain_core.messages import AIMessage, HumanMessage
from langgraph.runtime import Runtime

from nion.agents.lead_agent.agent import _build_middlewares
from nion.agents.middlewares.user_identity_middleware import UserIdentityMiddleware
from nion.user_identity.repository import UserIdentityRepository


def _runtime(thread_id: str) -> Runtime:
    return Runtime(context={"thread_id": thread_id})


def test_user_identity_middleware_applies_explicit_name_addressing_and_style(
    tmp_path,
) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(
                content="我叫张天成，你以后叫我大哥，我叫你小老弟。以后请先给结论，直接一点。",
                id="h-1",
            )
        ]
    }

    update = middleware.before_agent(state, _runtime("thread-1"))
    profile = UserIdentityRepository(tmp_path).load()

    assert update is None
    assert profile.user_name == "张天成"
    assert profile.preferred_address_for_user == "大哥"
    assert profile.assistant_self_name == "小老弟"
    assert profile.mutual_addressing_rule == "你叫我大哥，我叫你小老弟"
    assert profile.communication_style_preferences == ["先给结论", "直接一点"]


def test_user_identity_middleware_only_reads_latest_human_message(tmp_path) -> None:
    middleware = UserIdentityMiddleware(base_dir=tmp_path)
    state = {
        "messages": [
            HumanMessage(content="我叫张天成，你以后叫我大哥。", id="h-old"),
            AIMessage(content="记住了。", id="ai-old"),
            HumanMessage(content="继续刚才的财务周报。", id="h-new"),
        ]
    }

    middleware.before_agent(state, _runtime("thread-1"))
    profile = UserIdentityRepository(tmp_path).load()

    assert profile.user_name == ""
    assert profile.preferred_address_for_user == ""


def test_lead_agent_registers_user_identity_middleware_before_continuity() -> None:
    middlewares = _build_middlewares(
        {"configurable": {}},
        model_name=None,
        agent_name="lead_agent",
    )
    names = [type(middleware).__name__ for middleware in middlewares]

    assert "UserIdentityMiddleware" in names
    assert "ContinuityMiddleware" in names
    assert names.index("UserIdentityMiddleware") < names.index("ContinuityMiddleware")
