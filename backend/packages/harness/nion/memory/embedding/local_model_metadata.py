from __future__ import annotations

import json
from pathlib import Path
from typing import Any

METADATA_FILENAME = "provider-metadata.json"


def resolve_sentence_embedding_dimensions(model: Any) -> int:
    getter = getattr(model, "get_sentence_embedding_dimension", None)
    if not callable(getter):
        raise ValueError("SentenceTransformer model does not expose embedding dimensions")

    dimensions = getter()
    if not isinstance(dimensions, int) or dimensions <= 0:
        raise ValueError("SentenceTransformer reported an invalid embedding dimension")
    return dimensions


def write_local_model_metadata(model_dir: Path, *, dimensions: int) -> None:
    model_dir.mkdir(parents=True, exist_ok=True)
    (model_dir / METADATA_FILENAME).write_text(
        json.dumps({"dimensions": dimensions}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def read_local_model_dimensions(model_dir: Path) -> int | None:
    metadata_path = Path(model_dir) / METADATA_FILENAME
    if not metadata_path.exists():
        return None
    try:
        payload = json.loads(metadata_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None
    dimensions = payload.get("dimensions")
    if isinstance(dimensions, int) and dimensions > 0:
        return dimensions
    return None
