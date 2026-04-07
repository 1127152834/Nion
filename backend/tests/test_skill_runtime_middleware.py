from types import SimpleNamespace

from langchain_core.messages import ToolMessage

from nion.agents.middlewares.skill_runtime_middleware import SkillRuntimeMiddleware


class _FakeRequest:
    def __init__(self, *, tools, model, model_settings=None, state=None):
        self.tools = tools
        self.model = model
        self.model_settings = model_settings or {}
        self.state = state or {}

    def override(self, **kwargs):
        return _FakeRequest(
            tools=kwargs.get("tools", self.tools),
            model=kwargs.get("model", self.model),
            model_settings=kwargs.get("model_settings", self.model_settings),
            state=kwargs.get("state", self.state),
        )


def test_skill_runtime_middleware_filters_tools_to_allowed_skill_lane() -> None:
    middleware = SkillRuntimeMiddleware()
    request = _FakeRequest(
        tools=[
            SimpleNamespace(name="read_file"),
            SimpleNamespace(name="bash"),
            SimpleNamespace(name="web_search"),
        ],
        model=SimpleNamespace(name="default-model"),
        state={
            "active_skill": {
                "name": "planner",
                "allowed_tools": ["read_file", "bash"],
            }
        },
    )

    filtered = middleware._apply_skill_runtime(request)

    assert [tool.name for tool in filtered.tools] == ["read_file", "bash"]


def test_skill_runtime_middleware_overrides_model_settings_from_active_skill() -> None:
    middleware = SkillRuntimeMiddleware()
    replacement_model = SimpleNamespace(name="skill-model")
    request = _FakeRequest(
        tools=[SimpleNamespace(name="read_file")],
        model=SimpleNamespace(name="default-model"),
        model_settings={"temperature": 0},
        state={
            "active_skill": {
                "name": "planner",
                "model": "gpt-5.2",
                "effort": "high",
            }
        },
    )

    middleware._resolve_model_override = lambda model_name: replacement_model

    overridden = middleware._apply_skill_runtime(request)

    assert overridden.model is replacement_model
    assert overridden.model_settings["reasoning_effort"] == "high"
