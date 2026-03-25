from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from app.daemon.service import LocalDaemonService

router = APIRouter(prefix="/api/daemon/clients", tags=["daemon"])


class RegisterClientRequest(BaseModel):
    client_type: str
    client_id: str | None = None


class RegisterClientResponse(BaseModel):
    client_id: str
    client_type: str
    clients: dict[str, int] = Field(default_factory=dict)


class UnregisterClientResponse(BaseModel):
    accepted: bool
    should_exit: bool
    clients: dict[str, int] = Field(default_factory=dict)


def get_daemon_service(request: Request) -> LocalDaemonService:
    return request.app.state.daemon_service


@router.post("/register", response_model=RegisterClientResponse)
async def register_client(
    payload: RegisterClientRequest,
    request: Request,
) -> RegisterClientResponse:
    normalized_type = payload.client_type.strip().lower()
    if not normalized_type:
        raise HTTPException(status_code=400, detail="client_type must not be empty")

    client_id = payload.client_id or str(uuid4())
    service = get_daemon_service(request)
    return RegisterClientResponse.model_validate(
        service.register_client(client_id, normalized_type)
    )


@router.post("/{client_id}/heartbeat", status_code=status.HTTP_204_NO_CONTENT)
async def heartbeat_client(client_id: str, request: Request) -> Response:
    service = get_daemon_service(request)
    if not service.heartbeat_client(client_id):
        raise HTTPException(status_code=404, detail="client not found")
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.delete("/{client_id}", response_model=UnregisterClientResponse)
async def unregister_client(client_id: str, request: Request) -> UnregisterClientResponse:
    service = get_daemon_service(request)
    return UnregisterClientResponse.model_validate(service.unregister_client(client_id))
