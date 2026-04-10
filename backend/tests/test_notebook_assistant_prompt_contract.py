from nion.agents.lead_agent.prompt import apply_prompt_template
from nion.config.builtin_agents import NOTEBOOK_ASSISTANT


def test_notebook_chat_builtin_agent_has_non_empty_soul() -> None:
    assert NOTEBOOK_ASSISTANT.soul.strip()


def test_notebook_chat_prompt_declares_notebook_specific_identity() -> None:
    prompt = apply_prompt_template(agent_name="notebook-chat")

    assert "笔记助手" in prompt
    assert "当前笔记" in prompt
    assert "当用户问“你叫什么 / 你是谁”时" in prompt
    assert "不能回答成通用的 Nion 2.0 身份介绍" in prompt


def test_notebook_chat_prompt_with_current_note_requires_note_grounded_answers() -> None:
    prompt = apply_prompt_template(
        agent_name="notebook-chat",
        notebook_context={
            "note_id": "note_1",
            "note_title": "搜索阿斯顿",
            "note_relative_path": "AI学习/工作/搜索.md",
            "note_body": "我叫张天成，哈哈哈你是谁啊阿斯顿",
            "selection_text": "",
            "selection_start": None,
            "selection_end": None,
            "session_id": "session-1",
        },
    )

    assert "<current_notebook_note>" in prompt
    assert "搜索阿斯顿" in prompt
    assert "我叫张天成，哈哈哈你是谁啊阿斯顿" in prompt
    assert "当用户问“这篇笔记讲了什么”时，直接总结当前 note 内容" in prompt
    assert "不能回答成通用的 Nion 2.0 身份介绍" in prompt
    assert "不要去列上传文件" in prompt
