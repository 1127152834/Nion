from __future__ import annotations

from fastapi import APIRouter, Request, Response, status

router = APIRouter(prefix="/api/daemon", tags=["daemon"])


@router.post("/stop", status_code=status.HTTP_202_ACCEPTED)
async def stop_daemon(request: Request) -> Response:
    callback = request.app.state.daemon_shutdown_callback
    if callback is not None:
        result = callback()
        if result is not None:
            await result
    return Response(status_code=status.HTTP_202_ACCEPTED)
