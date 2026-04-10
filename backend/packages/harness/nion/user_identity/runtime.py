"""Runtime helpers for always-on user identity injection."""

from pathlib import Path

from nion.config.paths import Paths, get_paths
from nion.user_identity.repository import UserIdentityRepository


def build_runtime_user_identity_summary(base_dir: str | Path | None = None) -> str | None:
    resolved_base_dir = Paths(base_dir).base_dir if base_dir is not None else get_paths().base_dir
    profile = UserIdentityRepository(resolved_base_dir).load()
    parts: list[str] = []

    if profile.user_name:
        parts.append(f"用户姓名：{profile.user_name}")
    if profile.preferred_address_for_user:
        parts.append(f"称呼用户：{profile.preferred_address_for_user}")
    if profile.assistant_self_name:
        parts.append(f"助手自称：{profile.assistant_self_name}")
    if profile.mutual_addressing_rule:
        parts.append(f"互称规则：{profile.mutual_addressing_rule}")
    if profile.communication_style_preferences:
        parts.append("沟通偏好：" + " / ".join(profile.communication_style_preferences))

    return "\n".join(parts) or None
