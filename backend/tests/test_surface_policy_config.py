from nion.config.surface_policy_config import SurfacePolicyConfig, SurfaceRule


def test_surface_policy_returns_empty_rule_for_unknown_surface():
    cfg = SurfacePolicyConfig()

    rule = cfg.get_rule("missing")

    assert rule.allowed_groups is None
    assert rule.denied_tools == []


def test_surface_policy_prefers_explicit_allowlist():
    cfg = SurfacePolicyConfig(
        rules={
            "workspace": SurfaceRule(allowed_groups=["web", "bash"]),
            "channel": SurfaceRule(allowed_groups=["web"], denied_tools=["bash"]),
        }
    )

    assert cfg.rules["workspace"].allowed_groups == ["web", "bash"]
    assert cfg.rules["channel"].denied_tools == ["bash"]


def test_surface_policy_aliases_bridge_to_channel_when_bridge_missing():
    cfg = SurfacePolicyConfig(
        rules={
            "channel": SurfaceRule(
                allowed_groups=["web"],
                denied_tools=["bash"],
            )
        }
    )

    rule = cfg.get_rule("bridge")

    assert rule == cfg.rules["channel"]
