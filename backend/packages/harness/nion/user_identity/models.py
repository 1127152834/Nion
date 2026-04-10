from pydantic import BaseModel, Field


class UserIdentityProfile(BaseModel):
    version: str = "1.0"
    user_name: str = ""
    user_aliases: list[str] = Field(default_factory=list)
    preferred_address_for_user: str = ""
    assistant_self_name: str = ""
    mutual_addressing_rule: str = ""
    communication_style_preferences: list[str] = Field(default_factory=list)
    user_role: str = ""
    timezone: str = ""
    interaction_boundaries: list[str] = Field(default_factory=list)
    long_term_background_summary: str = ""
    updated_at: str = ""
