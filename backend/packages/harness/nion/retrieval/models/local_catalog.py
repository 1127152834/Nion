from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class LocalModelAsset:
    role: Literal["onnx", "tokenizer", "config"]
    source_file: str
    required: bool = True


@dataclass(frozen=True)
class LocalModelSpec:
    model_id: str
    family: Literal["embedding", "rerank"]
    display_name: str
    locale: str
    source_model_id: str
    source_file: str
    assets: tuple[LocalModelAsset, ...]
    approx_size_bytes: int
    license: str
    dimension: int | None = None


LOCAL_MODEL_SPECS: tuple[LocalModelSpec, ...] = (
    LocalModelSpec(
        model_id="zh-embedding-lite",
        family="embedding",
        display_name="Jina Embeddings v2 Base ZH (INT8)",
        locale="zh-CN",
        source_model_id="jinaai/jina-embeddings-v2-base-zh",
        source_file="onnx/model_quantized.onnx",
        assets=(
            LocalModelAsset(role="onnx", source_file="onnx/model_quantized.onnx"),
            LocalModelAsset(role="tokenizer", source_file="tokenizer.json"),
            LocalModelAsset(role="config", source_file="config.json"),
        ),
        approx_size_bytes=154 * 1024 * 1024,
        license="apache-2.0",
        dimension=768,
    ),
    LocalModelSpec(
        model_id="zh-rerank-lite",
        family="rerank",
        display_name="Jina Reranker v2 Base Multilingual (Quantized)",
        locale="zh-CN",
        source_model_id="jinaai/jina-reranker-v2-base-multilingual",
        source_file="onnx/model_quantized.onnx",
        assets=(
            LocalModelAsset(role="onnx", source_file="onnx/model_quantized.onnx"),
            LocalModelAsset(role="tokenizer", source_file="tokenizer.json"),
            LocalModelAsset(role="config", source_file="config.json"),
        ),
        approx_size_bytes=279_577_152,
        license="apache-2.0",
    ),
    LocalModelSpec(
        model_id="en-embedding-lite",
        family="embedding",
        display_name="BGE Small EN v1.5 (ONNX)",
        locale="en-US",
        source_model_id="BAAI/bge-small-en-v1.5",
        source_file="onnx/model.onnx",
        assets=(
            LocalModelAsset(role="onnx", source_file="onnx/model.onnx"),
            LocalModelAsset(role="tokenizer", source_file="tokenizer.json"),
            LocalModelAsset(role="config", source_file="config.json"),
        ),
        approx_size_bytes=127 * 1024 * 1024,
        license="mit",
        dimension=384,
    ),
    LocalModelSpec(
        model_id="en-rerank-lite",
        family="rerank",
        display_name="Jina Reranker v1 Tiny EN (INT8)",
        locale="en-US",
        source_model_id="jinaai/jina-reranker-v1-tiny-en",
        source_file="onnx/model_int8.onnx",
        assets=(
            LocalModelAsset(role="onnx", source_file="onnx/model_int8.onnx"),
            LocalModelAsset(role="tokenizer", source_file="tokenizer.json"),
            LocalModelAsset(role="config", source_file="config.json"),
        ),
        approx_size_bytes=32 * 1024 * 1024,
        license="apache-2.0",
    ),
)


RECOMMENDED_PROFILES = (
    {
        "profile_id": "zh-local-default",
        "label": "中文本地推荐",
        "mode": "local",
        "embedding_model_id": "zh-embedding-lite",
        "reranker_model_id": "zh-rerank-lite",
    },
    {
        "profile_id": "en-local-default",
        "label": "English Local Default",
        "mode": "local",
        "embedding_model_id": "en-embedding-lite",
        "reranker_model_id": "en-rerank-lite",
    },
    {
        "profile_id": "api-default",
        "label": "API 默认组合",
        "mode": "remote",
        "embedding_model_id": None,
        "reranker_model_id": None,
    },
)
