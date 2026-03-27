from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Literal

NotebookAssistAction = Literal[
    "summarize",
    "rewrite",
    "expand",
    "checklist",
    "action_items",
]

NotebookAssistKind = Literal["rewrite", "derived"]
NotebookAssistScope = Literal["whole_note", "selection", "paragraph"]
NotebookAssistApplyMode = Literal[
    "replace",
    "insert",
    "replace_selection",
    "insert_after_selection",
]


@dataclass(frozen=True)
class NotebookAssistSpec:
    label: str
    kind: NotebookAssistKind
    recommended_mode: NotebookAssistApplyMode
    available_modes: tuple[NotebookAssistApplyMode, ...]
    instruction: str


@dataclass(frozen=True)
class NotebookAssistPreviewResult:
    action: NotebookAssistAction
    action_label: str
    kind: NotebookAssistKind
    scope: NotebookAssistScope
    source_excerpt: str
    source_start: int | None
    source_end: int | None
    recommended_mode: NotebookAssistApplyMode
    available_modes: list[NotebookAssistApplyMode]
    content: str
    original_content: str


ASSIST_SPECS: dict[NotebookAssistAction, NotebookAssistSpec] = {
    "summarize": NotebookAssistSpec(
        label="生成摘要",
        kind="derived",
        recommended_mode="insert",
        available_modes=("insert", "replace"),
        instruction=(
            "请将整篇笔记整理成结构化 Markdown 摘要。"
            "输出应包含一句话总结、核心要点、关键决定、未决问题。"
        ),
    ),
    "rewrite": NotebookAssistSpec(
        label="重写润色",
        kind="rewrite",
        recommended_mode="replace",
        available_modes=("replace", "insert"),
        instruction=(
            "请在不改变原意的前提下重写这篇笔记，让结构更清晰、表达更自然。"
            "直接返回改写后的 Markdown 正文。"
        ),
    ),
    "expand": NotebookAssistSpec(
        label="扩展内容",
        kind="rewrite",
        recommended_mode="insert",
        available_modes=("insert",),
        instruction=(
            "请基于现有内容补充必要背景、细节和后续动作，保持与原文一致的意图。"
            "直接返回可插入笔记的 Markdown 内容。"
        ),
    ),
    "checklist": NotebookAssistSpec(
        label="生成清单",
        kind="derived",
        recommended_mode="insert",
        available_modes=("insert", "replace"),
        instruction=(
            "请把这篇笔记转成一份可执行的 Markdown 清单。"
            "保留主要主题，并把清晰动作转成复选框。"
        ),
    ),
    "action_items": NotebookAssistSpec(
        label="提取行动项",
        kind="derived",
        recommended_mode="insert",
        available_modes=("insert", "replace"),
        instruction=(
            "请从这篇笔记里提取明确的行动项。"
            "输出 Markdown，优先列出任务、负责人线索、时间线索；没有就不要编造。"
        ),
    ),
}


def build_assist_preview(
    *,
    title: str,
    body: str,
    action: NotebookAssistAction,
    scope: NotebookAssistScope,
    selection_start: int | None,
    selection_end: int | None,
    options: dict[str, str | None] | None,
    model: Any,
) -> NotebookAssistPreviewResult:
    spec = ASSIST_SPECS[action]
    stripped_title = title.strip() or "Untitled note"
    stripped_body = body.strip()
    source_text, source_start, source_end = _resolve_scope_text(
        body=body,
        scope=scope,
        selection_start=selection_start,
        selection_end=selection_end,
    )
    prompt_scope = {
        "selection": "当前选中内容",
        "paragraph": "当前段落",
        "whole_note": "整篇笔记",
    }[scope]
    recommended_mode, available_modes = _resolve_apply_modes(action=action, scope=scope)
    prompt_options = _format_prompt_options(options)

    prompt = (
        "你是一个谨慎的中文笔记协作助手。\n"
        "你正在处理用户自己的 Markdown 笔记。\n"
        "只返回最终 Markdown 内容，不要解释，不要加代码围栏，不要提到你自己。\n\n"
        f"当前动作：{spec.label}\n"
        f"作用范围：{prompt_scope}\n"
        f"{prompt_options}"
        f"任务要求：{spec.instruction}\n\n"
        f"笔记标题：{stripped_title}\n"
        "待处理内容如下：\n"
        "<note>\n"
        f"{source_text or stripped_body or '（空白笔记）'}\n"
        "</note>\n"
    )
    response = model.invoke(prompt)
    content = _normalize_generated_markdown(_extract_response_text(getattr(response, "content", response)))
    if not content:
        raise ValueError("Notebook assist returned empty content.")

    return NotebookAssistPreviewResult(
        action=action,
        action_label=spec.label,
        kind=spec.kind,
        scope=scope,
        source_excerpt=_build_source_excerpt(source_text),
        source_start=source_start,
        source_end=source_end,
        recommended_mode=recommended_mode,
        available_modes=list(available_modes),
        content=content,
        original_content=body,
    )


def apply_assist_content(
    *,
    original_body: str,
    generated_content: str,
    mode: NotebookAssistApplyMode,
    selection_start: int | None = None,
    selection_end: int | None = None,
) -> str:
    if mode == "replace":
        return generated_content
    if mode == "replace_selection":
        start, end = _normalize_selection_range(
            body=original_body,
            selection_start=selection_start,
            selection_end=selection_end,
        )
        return f"{original_body[:start]}{generated_content}{original_body[end:]}".rstrip()
    if mode == "insert_after_selection":
        _start, end = _normalize_selection_range(
            body=original_body,
            selection_start=selection_start,
            selection_end=selection_end,
        )
        insert_prefix = "" if original_body[end:end + 1] in {"", "\n"} else "\n"
        return f"{original_body[:end]}{insert_prefix}\n{generated_content}{original_body[end:]}".rstrip()
    return f"{original_body.rstrip()}\n\n---\n\n{generated_content}".rstrip()


def _extract_response_text(content: object) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
                continue
            if isinstance(block, dict) and block.get("type") in {"text", "output_text"}:
                text = block.get("text")
                if isinstance(text, str):
                    parts.append(text)
        return "\n".join(parts)
    if content is None:
        return ""
    return str(content)


def _normalize_generated_markdown(text: str) -> str:
    stripped = text.strip()
    if not stripped:
        return ""

    if stripped.startswith("```"):
        lines = stripped.splitlines()
        if len(lines) >= 3 and lines[0].startswith("```") and lines[-1].startswith("```"):
            stripped = "\n".join(lines[1:-1]).strip()

    return stripped


def _resolve_scope_text(
    *,
    body: str,
    scope: NotebookAssistScope,
    selection_start: int | None,
    selection_end: int | None,
) -> tuple[str, int | None, int | None]:
    if scope == "selection":
        start, end = _normalize_selection_range(
            body=body,
            selection_start=selection_start,
            selection_end=selection_end,
        )
        return body[start:end], start, end
    if scope == "paragraph":
        start, end = _paragraph_range(
            body=body,
            cursor_position=_resolve_cursor_position(
                body=body,
                selection_start=selection_start,
                selection_end=selection_end,
            ),
        )
        return body[start:end], start, end
    return body, None, None


def _normalize_selection_range(
    *,
    body: str,
    selection_start: int | None,
    selection_end: int | None,
) -> tuple[int, int]:
    if selection_start is None or selection_end is None:
        raise ValueError("Selection range is required for selection-scoped notebook assist.")
    start = max(0, selection_start)
    end = min(len(body), selection_end)
    if end <= start:
        raise ValueError("Selection range must contain at least one character.")
    return start, end


def _resolve_apply_modes(
    *,
    action: NotebookAssistAction,
    scope: NotebookAssistScope,
) -> tuple[NotebookAssistApplyMode, tuple[NotebookAssistApplyMode, ...]]:
    spec = ASSIST_SPECS[action]
    if scope == "selection" and action == "rewrite":
        return "replace_selection", ("replace_selection", "insert_after_selection")
    if scope in {"selection", "paragraph"} and action == "rewrite":
        return "replace_selection", ("replace_selection", "insert_after_selection")
    if scope in {"selection", "paragraph"} and action == "expand":
        return "insert_after_selection", ("insert_after_selection",)
    return spec.recommended_mode, spec.available_modes


def _build_source_excerpt(text: str, limit: int = 140) -> str:
    compact = " ".join(text.strip().split())
    if len(compact) <= limit:
        return compact
    return f"{compact[:limit - 3]}..."


def _resolve_cursor_position(
    *,
    body: str,
    selection_start: int | None,
    selection_end: int | None,
) -> int:
    if selection_start is None and selection_end is None:
        raise ValueError("Cursor or selection range is required for paragraph-scoped notebook assist.")
    cursor = selection_start if selection_start is not None else selection_end
    assert cursor is not None
    return max(0, min(len(body), cursor))


def _paragraph_range(*, body: str, cursor_position: int) -> tuple[int, int]:
    start = body.rfind("\n\n", 0, cursor_position)
    start = 0 if start == -1 else start + 2
    end = body.find("\n\n", cursor_position)
    end = len(body) if end == -1 else end
    return start, end


def _format_prompt_options(options: dict[str, str | None] | None) -> str:
    if not options:
        return ""

    lines: list[str] = []
    rewrite_tone = (options.get("rewrite_tone") or "").strip()
    expansion_intent = (options.get("expansion_intent") or "").strip()
    if rewrite_tone:
        lines.append(f"重写风格：{_map_rewrite_tone_label(rewrite_tone)}")
    if expansion_intent:
        lines.append(f"补充方向：{_map_expansion_intent_label(expansion_intent)}")
    if not lines:
        return ""
    return "\n".join(lines) + "\n"


def _map_rewrite_tone_label(value: str) -> str:
    return {
        "clear": "更清晰",
        "formal": "更正式",
        "concise": "更简洁",
    }.get(value, value)


def _map_expansion_intent_label(value: str) -> str:
    return {
        "background": "补背景",
        "details": "补细节",
        "examples": "补例子",
        "next_steps": "补下一步",
    }.get(value, value)
