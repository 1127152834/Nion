from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.memory.soul.console_service import (
    build_soul_settings_payload,
    patch_soul_setting_value,
)
from nion.runtime_context.files.compiler import compile_soul_document
from nion.memory_os.clock import utcnow_z
from nion.memory_os.repository import MemoryOSRepository

router = APIRouter(prefix="/api/soul/document", tags=["memory"])


class MarkdownDocumentResponse(BaseModel):
    document: str


class MarkdownDocumentUpdateRequest(BaseModel):
    document: str


def _repo() -> MemoryOSRepository:
    return MemoryOSRepository(get_paths().memory_os_index_db_file)


def _default_soul_markdown() -> str:
    settings = build_soul_settings_payload(_repo(), now_z=utcnow_z())
    return (
        "# Soul\n\n"
        f"## Core Identity\n{settings['core_identity']}\n\n"
        f"## Speech Style\n{settings['speech_style']}\n\n"
        f"## Values And Boundaries\n{settings['values_and_boundaries']}\n\n"
        f"## Relationship Stance\n{settings['relationship_stance']}\n"
    )


def _document_path():
    return get_paths().base_dir / "runtime-context" / "soul" / "SOUL.md"


def _read_document() -> str:
    path = _document_path()
    if path.exists():
        return path.read_text(encoding="utf-8")
    return _default_soul_markdown()


def _write_document(document: str) -> str:
    path = _document_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(document, encoding="utf-8")
    return document


@router.get("", response_model=MarkdownDocumentResponse)
async def get_soul_document() -> MarkdownDocumentResponse:
    return MarkdownDocumentResponse(document=_read_document())


@router.put("", response_model=MarkdownDocumentResponse)
async def put_soul_document(
    request: MarkdownDocumentUpdateRequest,
) -> MarkdownDocumentResponse:
    document = _write_document(request.document)
    compiled = compile_soul_document(document)
    created_at = utcnow_z()
    for field, value in compiled.items():
        if value.strip():
            patch_soul_setting_value(
                _repo(),
                field=field,
                value=value,
                created_at=created_at,
            )
    return MarkdownDocumentResponse(document=document)
