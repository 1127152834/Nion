from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class RetrievalSettingsModel(BaseModel):
    model_config = ConfigDict(validate_assignment=True)


class RetrievalEmbeddingProfile(RetrievalSettingsModel):
    mode: Literal["remote_managed"] = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "text-embedding-3-large"
    dimensions: int = Field(default=3072, ge=1)


class RetrievalRerankerProfile(RetrievalSettingsModel):
    mode: Literal["remote_managed"] = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "bge-reranker-large"


class RetrievalActiveProfile(RetrievalSettingsModel):
    embedding: RetrievalEmbeddingProfile = Field(default_factory=RetrievalEmbeddingProfile)
    reranker: RetrievalRerankerProfile = Field(default_factory=RetrievalRerankerProfile)


class RetrievalConsumerPolicy(RetrievalSettingsModel):
    allow_per_consumer_override: bool = False
    profile_version: int = Field(default=1, ge=1)


class RetrievalModelsSettings(RetrievalSettingsModel):
    active: RetrievalActiveProfile = Field(default_factory=RetrievalActiveProfile)
    consumer_policy: RetrievalConsumerPolicy = Field(default_factory=RetrievalConsumerPolicy)
