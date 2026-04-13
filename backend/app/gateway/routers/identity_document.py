from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from nion.config.paths import get_paths
from nion.runtime_context.files.compiler import compile_identity_document
from nion.user_identity.repository import UserIdentityRepository
from nion.user_identity.service import UserIdentityService

router = APIRouter(prefix="/api/identity/document", tags=["memory"])


class MarkdownDocumentResponse(BaseModel):
    document: str


class MarkdownDocumentUpdateRequest(BaseModel):
    document: str


def _default_identity_markdown() -> str:
    return (
        "# Identity\n\n"
        "## Core\n"
        "- User name: \n"
        "- Preferred address: \n"
        "- Assistant self name: \n"
        "- Mutual addressing: \n"
    )


def _document_path():
    return get_paths().base_dir / "runtime-context" / "identity" / "IDENTITY.md"


def _read_document() -> str:
    path = _document_path()
    if path.exists():
        return path.read_text(encoding="utf-8")

    profile = UserIdentityRepository(get_paths().base_dir).load()
    if not profile.user_name and not profile.preferred_address_for_user:
        return _default_identity_markdown()
    return (
        "# Identity\n\n"
        "## Core\n"
        f"- User name: {profile.user_name}\n"
        f"- Preferred address: {profile.preferred_address_for_user}\n"
        f"- Assistant self name: {profile.assistant_self_name}\n"
        f"- Mutual addressing: {profile.mutual_addressing_rule}\n"
    )


def _write_document(document: str) -> str:
    path = _document_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(document, encoding="utf-8")
    return document


def _service() -> UserIdentityService:
    return UserIdentityService(UserIdentityRepository(get_paths().base_dir))


@router.get("", response_model=MarkdownDocumentResponse)
async def get_identity_document() -> MarkdownDocumentResponse:
    return MarkdownDocumentResponse(document=_read_document())


@router.put("", response_model=MarkdownDocumentResponse)
async def put_identity_document(
    request: MarkdownDocumentUpdateRequest,
) -> MarkdownDocumentResponse:
    document = _write_document(request.document)
    _service().replace_profile(compile_identity_document(document))
    return MarkdownDocumentResponse(document=document)
