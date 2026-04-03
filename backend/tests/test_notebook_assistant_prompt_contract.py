from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.config.builtin_agents import NOTEBOOK_ASSISTANT


def test_notebook_chat_builtin_agent_has_non_empty_soul() -> None:
    assert NOTEBOOK_ASSISTANT.soul.strip()


def test_notebook_chat_prompt_declares_notebook_specific_identity() -> None:
    prompt = apply_prompt_template(agent_name="notebook-chat")

    assert "笔记助手" in prompt
    assert "当前笔记" in prompt
    assert "必须以当前笔记内容为依据" in prompt
    assert "不能退化成通用助手" in prompt
