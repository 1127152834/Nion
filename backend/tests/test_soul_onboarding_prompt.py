from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.memory_os.compat import finalize_legacy_cutover


def test_prompt_includes_soul_onboarding_guidance_when_soul_not_initialized(
    monkeypatch,
    tmp_path,
):
    monkeypatch.setenv("NION_HOME", str(tmp_path))
    finalize_legacy_cutover()

    prompt = apply_prompt_template()

    assert "soul onboarding" in prompt.lower()
    assert "initialize_soul_profile" in prompt
