from pydantic import BaseModel, Field


class SurfaceRule(BaseModel):
    allowed_groups: list[str] | None = Field(default=None)
    denied_groups: list[str] = Field(default_factory=list)
    allowed_tools: list[str] | None = Field(default=None)
    denied_tools: list[str] = Field(default_factory=list)


class SurfacePolicyConfig(BaseModel):
    rules: dict[str, SurfaceRule] = Field(default_factory=dict)

    def get_rule(self, surface: str) -> SurfaceRule:
        rule = self.rules.get(surface)
        if rule is not None:
            return rule
        if surface == "bridge":
            channel_rule = self.rules.get("channel")
            if channel_rule is not None:
                return channel_rule
        return SurfaceRule()
