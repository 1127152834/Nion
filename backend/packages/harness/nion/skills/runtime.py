from __future__ import annotations

from typing import Any


def normalize_active_skill(payload: dict[str, Any] | None) -> dict[str, Any] | None:
    if not isinstance(payload, dict):
        return None

    hooks = payload.get("hooks")
    normalized_hooks = [item.strip() for item in hooks if isinstance(item, str) and item.strip()] if isinstance(hooks, list) else []

    return {
        "name": payload.get("name"),
        "allowed_tools": payload.get("allowed_tools") if isinstance(payload.get("allowed_tools"), list) else [],
        "model": payload.get("model") if isinstance(payload.get("model"), str) else None,
        "effort": payload.get("effort") if isinstance(payload.get("effort"), str) else None,
        "user_invocable": payload.get("user_invocable") if isinstance(payload.get("user_invocable"), bool) else None,
        "hooks": normalized_hooks,
        "context": payload.get("context") if isinstance(payload.get("context"), str) else "direct",
        "activation_content": payload.get("activation_content") if isinstance(payload.get("activation_content"), str) else None,
    }


def matches_skill_hook(active_skill: dict[str, Any] | None, event_name: str) -> bool:
    skill = normalize_active_skill(active_skill)
    if skill is None:
        return False
    return event_name in skill["hooks"]


def build_skill_hook_side_effects(active_skill: dict[str, Any] | None, event_name: str) -> dict[str, Any] | None:
    skill = normalize_active_skill(active_skill)
    if skill is None or not matches_skill_hook(skill, event_name):
        return None
    return {
        "skill_name": skill["name"],
        "skill_hooks": skill["hooks"],
        "skill_context": skill["context"],
    }


def merge_skill_hook_side_effects(
    hook_event: dict[str, Any],
    active_skill: dict[str, Any] | None,
    event_name: str,
) -> dict[str, Any]:
    side_effects = build_skill_hook_side_effects(active_skill, event_name)
    if side_effects is None:
        return hook_event

    merged = dict(hook_event)
    existing_side_effects = merged.get("side_effects")
    if isinstance(existing_side_effects, dict):
        merged["side_effects"] = {
            **existing_side_effects,
            **side_effects,
        }
    else:
        merged["side_effects"] = side_effects
    return merged
