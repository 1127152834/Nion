from __future__ import annotations

from nion.orchestration.mention_parser import parse_agent_mentions


def test_parse_agent_mentions_preserves_chain_order() -> None:
    steps = parse_agent_mentions("@agent-1 搜索资料，然后交给 @agent-2 总结，再交给 @agent-3 排版")

    assert [step.agent_name for step in steps] == ["agent-1", "agent-2", "agent-3"]
