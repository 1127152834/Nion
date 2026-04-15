from __future__ import annotations

from pydantic import BaseModel, Field


class EmbeddingSystemSettings(BaseModel):
    mode: str = "remote_managed"
    local_model_id: str = ""
    local_model_name: str = ""
    local_dimensions: int = 0
    local_onnx_path: str = ""
    local_tokenizer_path: str = ""
    local_config_path: str = ""
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
