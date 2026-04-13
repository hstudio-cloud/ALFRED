from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
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
