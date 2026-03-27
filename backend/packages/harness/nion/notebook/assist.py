from __future__ import annotations

from typing import Literal

NotebookAssistAction = Literal[
    "summarize",
    "rewrite",
    "expand",
    "checklist",
    "action_items",
]


def build_assist_preview(*, title: str, body: str, action: NotebookAssistAction) -> str:
    stripped_title = title.strip() or "Untitled note"
    stripped_body = body.strip()

    if action == "summarize":
        return f"**摘要：**\n\n该文档围绕《{stripped_title}》展开，主要内容为：{_first_sentence(stripped_body)}"
    if action == "rewrite":
        return "\n".join(f"> {line}" if line else "" for line in stripped_body.splitlines())
    if action == "expand":
        return (
            f"{stripped_body}\n\n---\n\n"
            "补充说明：\n"
            "1. 增加必要背景上下文\n"
            "2. 明确关键假设和后续动作\n"
            "3. 保持原意不变，仅增强可读性"
        )
    if action == "checklist":
        lines = [line.strip("- ").strip() for line in stripped_body.splitlines() if line.strip()]
        return "\n".join(f"- [ ] {line}" for line in lines[:6]) or "- [ ] 待补充事项"
    return "### 提取的行动项\n- [ ] 梳理当前笔记中的关键行动项\n- [ ] 确认责任人和截止时间"


def apply_assist_content(*, original_body: str, generated_content: str, mode: Literal["replace", "insert"]) -> str:
    if mode == "replace":
        return generated_content
    return f"{original_body.rstrip()}\n\n---\n\n{generated_content}".rstrip()


def _first_sentence(body: str) -> str:
    compact = " ".join(body.split())
    if not compact:
        return "暂无内容。"
    if len(compact) <= 60:
        return compact
    return compact[:57] + "..."
