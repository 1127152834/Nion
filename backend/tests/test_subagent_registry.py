from nion.subagents.registry import get_available_subagent_names


def test_get_available_subagent_names_hides_bash_when_host_bash_disallowed(monkeypatch):
    monkeypatch.setattr(
        "nion.subagents.registry.is_host_bash_allowed",
        lambda: False,
    )

    names = get_available_subagent_names()

    assert "general-purpose" in names
    assert "bash" not in names
