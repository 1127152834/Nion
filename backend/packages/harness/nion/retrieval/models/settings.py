from __future__ import annotations

from pydantic import BaseModel, Field


class RetrievalEmbeddingProfile(BaseModel):
    mode: str = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "text-embedding-3-large"
    dimensions: int = 3072


class RetrievalRerankerProfile(BaseModel):
    mode: str = "remote_managed"
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "bge-reranker-large"


class RetrievalActiveProfile(BaseModel):
    embedding: RetrievalEmbeddingProfile = Field(default_factory=RetrievalEmbeddingProfile)
    reranker: RetrievalRerankerProfile = Field(default_factory=RetrievalRerankerProfile)


class RetrievalConsumerPolicy(BaseModel):
    allow_per_consumer_override: bool = False
    profile_version: int = 1


class RetrievalModelsSettings(BaseModel):
    active: RetrievalActiveProfile = Field(default_factory=RetrievalActiveProfile)
    consumer_policy: RetrievalConsumerPolicy = Field(default_factory=RetrievalConsumerPolicy)
