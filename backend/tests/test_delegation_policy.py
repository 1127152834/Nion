from nion.config.agents_config import AgentConfig, AgentDelegationConfig
from nion.orchestration.delegation_policy import build_delegated_execution_profile


def test_delegated_execution_profile_denies_direct_user_reply_by_default():
    agent = AgentConfig(
        name="research-agent",
        delegation=AgentDelegationConfig(
            allow_direct_user_reply=False,
            allow_memory_write=False,
            private_skills=["search-web", "rank-sources"],
            delegatable_private_skills=["search-web"],
        ),
    )

    profile = build_delegated_execution_profile(
        agent,
        caller_permissions={"web_search", "write_file"},
    )

    assert profile.allow_direct_user_reply is False
    assert profile.allow_memory_write is False
    assert profile.allowed_private_skills == ["search-web"]
