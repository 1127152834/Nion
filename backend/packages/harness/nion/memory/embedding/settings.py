from __future__ import annotations

from pydantic import BaseModel, Field


class EmbeddingSystemSettings(BaseModel):
    mode: str = "local_managed"
    local_model_id: str = "BAAI/bge-m3"
    local_model_key: str = "bge-m3"
    remote_endpoint: str = ""
    remote_api_key: str = ""
    remote_model_name: str = "text-embedding-3-large"
    remote_dimensions: int = 3072
    distance_metric: str = "cosine"
    managed_model_cache_dir: str = ""
    last_rebuild_at: str = ""
    health_state: str = "idle"
    health_detail: str = ""
    download_state: str = "missing"
    download_detail: str = ""
    active_fingerprint: str = ""
    extra: dict[str, str] = Field(default_factory=dict)
