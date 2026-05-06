from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from models_extended import NanoAutomationConfigUpdate
from nano_ops import (
    build_whatsapp_status,
    get_workspace_automations,
    link_whatsapp_number as link_whatsapp_identity,
    list_audit_entries,
    list_pending_confirmations_for_workspace,
    list_workspace_tasks,
    update_workspace_automation,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access
from services.whatsapp_link_service import create_link_code
from services.whatsapp_user_resolver import normalize_phone_number

router = APIRouter(prefix="/api/nano-ops", tags=["nano-ops"])


class WhatsappLinkRequest(BaseModel):
    phone_number: str
    status: str = "linked"


class NanoAutomationUpdateRequest(NanoAutomationConfigUpdate):
    pass


@router.get("/status")
async def get_nano_ops_status(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    return await build_whatsapp_status(workspace_id=workspace_id, user_id=current_user["id"])


@router.post("/whatsapp/link")
async def link_whatsapp_number(
    payload: WhatsappLinkRequest,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    phone_number = normalize_phone_number(payload.phone_number)
    if not phone_number:
        raise HTTPException(status_code=400, detail="Numero de telefone invalido.")
    return await link_whatsapp_identity(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        phone_number=phone_number,
        status=payload.status,
    )


@router.post("/whatsapp/link-code")
async def create_whatsapp_link_code(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    record = await create_link_code(user_id=current_user["id"], workspace_id=workspace_id)
    return record


@router.get("/tasks")
async def list_nano_tasks(
    workspace_id: str = Query(...),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await list_workspace_tasks(workspace_id=workspace_id, status=status, limit=100)
    return {"items": items}


@router.get("/confirmations")
async def list_nano_confirmations(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await list_pending_confirmations_for_workspace(workspace_id=workspace_id, limit=100)
    return {"items": items}


@router.get("/automations")
async def list_nano_automations(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await get_workspace_automations(workspace_id=workspace_id)
    return {"items": items}


@router.patch("/automations/{automation_id}")
async def update_nano_automation(
    automation_id: str,
    payload: NanoAutomationUpdateRequest,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    try:
        item = await update_workspace_automation(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            automation_key=automation_id,
            payload=payload,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return item


@router.get("/audits")
async def list_nano_audits(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await list_audit_entries(workspace_id=workspace_id, limit=100)
    return {"items": items}
