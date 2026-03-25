from pydantic import BaseModel, Field


class DaemonConfig(BaseModel):
    allow_background_running: bool = Field(
        default=False,
        description="Keep the local daemon alive after Electron closes.",
    )
    host: str = Field(default="127.0.0.1")
    port: int = Field(default=43115)
    startup_timeout_seconds: int = Field(default=20, ge=1, le=120)
