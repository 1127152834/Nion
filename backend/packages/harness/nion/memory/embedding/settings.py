from __future__ import annotations

from pydantic import BaseModel, Field


class EmbeddingSystemSettings(BaseModel):
    mode: str = "remote_managed"
    remote_endpoint: str = ""
    remote_api_key: str = ""
    remote_model_name: str = "text-embedding-3-large"
    remote_dimensions: int = 3072
    distance_metric: str = "cosine"
    last_rebuild_at: str = ""
    health_state: str = "idle"
    health_detail: str = ""
    active_fingerprint: str = ""
    extra: dict[str, str] = Field(default_factory=dict)
