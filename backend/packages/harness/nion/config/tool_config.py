from pydantic import BaseModel, ConfigDict, Field


class ToolGroupConfig(BaseModel):
    """Config section for a tool group"""

    name: str = Field(
        ...,
        min_length=1,
        description="Unique name for the tool group",
    )
    model_config = ConfigDict(extra="allow")


class ToolConfig(BaseModel):
    """Config section for a tool"""

    name: str = Field(..., min_length=1, description="Unique name for the tool")
    group: str = Field(..., min_length=1, description="Group name for the tool")
    use: str = Field(
        ...,
        min_length=1,
        description="Variable name of the tool provider(e.g. nion.sandbox.tools:bash_tool)",
    )
    model_config = ConfigDict(extra="allow")
