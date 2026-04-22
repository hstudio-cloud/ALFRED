import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from models_open_finance import (
    OpenFinanceConnectCallbackRequest,
    OpenFinanceConnectTokenRequest,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access
from services.open_finance_service import OpenFinanceService
from services.open_finance_sync_service import OpenFinanceSyncService

router = APIRouter(prefix="/api/open-finance", tags=["open-finance"])
open_finance_service = OpenFinanceService()
open_finance_sync_service = OpenFinanceSyncService()


class OpenFinanceSyncRequest(BaseModel):
    payload: Dict[str, Any] = Field(default_factory=dict)


def _verify_open_finance_webhook_secret(secret: str | None) -> bool:
    expected = (os.getenv("OPEN_FINANCE_WEBHOOK_SECRET") or "").strip()
    if not expected:
        return True
    return (secret or "").strip() == expected


@router.post("/connect/token")
async def create_connect_token(
    payload: OpenFinanceConnectTokenRequest,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    return await open_finance_service.create_connect_token(
        user_id=current_user["id"],
        workspace_id=workspace_id,
        callback_url=payload.callback_url,
        item_id=payload.item_id,
    )


@router.post("/connect/callback")
async def connect_callback(
    payload: OpenFinanceConnectCallbackRequest,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    connection = await open_finance_service.save_connection(
        user_id=current_user["id"],
        workspace_id=workspace_id,
        provider=payload.provider,
        item_id=payload.item_id,
        consent_id=payload.consent_id,
        institution_name=payload.institution_name,
        status=payload.status,
    )
    sync_result = await open_finance_sync_service.sync_connection(
        workspace_id=workspace_id,
        connection_id=connection["id"],
        provider_payload=payload.metadata,
    )
    return {"connection": connection, "sync": sync_result}


@router.post("/webhook")
async def open_finance_webhook(
    request: Request,
    x_open_finance_webhook_secret: Optional[str] = Header(
        default=None,
        alias="X-Open-Finance-Webhook-Secret",
    ),
):
    if not _verify_open_finance_webhook_secret(x_open_finance_webhook_secret):
        raise HTTPException(status_code=401, detail="Webhook secret invalido.")

    payload = await request.json()
    event_name = (
        payload.get("event")
        or payload.get("type")
        or payload.get("eventName")
        or ""
    )
    item_id = (
        payload.get("itemId")
        or payload.get("item_id")
        or payload.get("item", {}).get("id")
        or payload.get("data", {}).get("item", {}).get("id")
        or payload.get("resource", {}).get("itemId")
    )
    provider = (payload.get("provider") or "pluggy").strip().lower()

    if not item_id:
        return {"received": True, "ignored": True, "reason": "missing_item_id"}

    lowered_event = event_name.lower()
    if any(
        marker in lowered_event
        for marker in ["deleted", "error", "login_failed", "waiting_user_input"]
    ):
        status = "error" if "error" in lowered_event or "failed" in lowered_event else "deleted"
        result = await open_finance_sync_service.update_connection_status_by_item_id(
            provider=provider,
            item_id=item_id,
            status=status,
            metadata=payload,
        )
        return {"received": True, "event": event_name, "result": result}

    result = await open_finance_sync_service.sync_by_item_id(
        provider=provider,
        item_id=item_id,
        provider_payload=payload,
    )
    return {"received": True, "event": event_name, "result": result}


@router.get("/connections")
async def list_connections(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    return await open_finance_service.list_connections(workspace_id=workspace_id)


@router.post("/connections/{connection_id}/sync")
async def sync_connection(
    connection_id: str,
    body: OpenFinanceSyncRequest,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    result = await open_finance_sync_service.sync_connection(
        workspace_id=workspace_id,
        connection_id=connection_id,
        provider_payload=body.payload or {},
    )
    if not result.get("ok"):
        raise HTTPException(status_code=404, detail="Conexao nao encontrada.")
    return result


@router.get("/accounts")
async def list_external_accounts(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    return await open_finance_service.list_accounts(workspace_id=workspace_id)


@router.get("/transactions")
async def list_external_transactions(
    workspace_id: str = Query(...),
    account_id: Optional[str] = Query(None),
    limit: int = Query(200, ge=1, le=5000),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    return await open_finance_service.list_transactions(
        workspace_id=workspace_id,
        account_id=account_id,
        limit=limit,
    )


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    deleted = await open_finance_service.delete_connection(
        workspace_id=workspace_id,
        connection_id=connection_id,
    )
    if not deleted:
        raise HTTPException(status_code=404, detail="Conexao nao encontrada.")
    return {"ok": True}
