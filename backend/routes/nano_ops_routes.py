from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from database import nano_tasks_collection, pending_confirmations_collection, whatsapp_identities_collection
from models_extended import WhatsappIdentity
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access
from services.nano_automation_service import NanoAutomationService
from services.whatsapp_link_service import create_link_code, get_latest_link_code
from services.whatsapp_user_resolver import normalize_phone_number

router = APIRouter(prefix="/api/nano-ops", tags=["nano-ops"])
automation_service = NanoAutomationService()


class WhatsappLinkRequest(BaseModel):
    phone_number: str
    status: str = "linked"


def _serialize(document: dict) -> dict:
    payload = dict(document)
    payload.pop("_id", None)
    return payload


@router.get("/status")
async def get_nano_ops_status(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    identity = await whatsapp_identities_collection.find_one(
        {"workspace_id": workspace_id, "user_id": current_user["id"]},
        {"_id": 0},
    )
    pending_count = await pending_confirmations_collection.count_documents(
        {"workspace_id": workspace_id, "status": "pending"}
    )
    tasks_count = await nano_tasks_collection.count_documents({"workspace_id": workspace_id})
    return {
        "workspace_id": workspace_id,
        "whatsapp_connected": bool(identity and identity.get("status") == "linked"),
        "whatsapp_identity": identity,
        "pending_link_code": await get_latest_link_code(
            user_id=current_user["id"],
            workspace_id=workspace_id,
        ),
        "pending_confirmations": pending_count,
        "nano_tasks": tasks_count,
    }


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

    existing = await whatsapp_identities_collection.find_one(
        {"workspace_id": workspace_id, "user_id": current_user["id"]}
    )
    document = WhatsappIdentity(
        user_id=current_user["id"],
        workspace_id=workspace_id,
        phone_number=phone_number,
        status=payload.status,
    ).dict()
    if existing:
        document["id"] = existing["id"]
        document["created_at"] = existing.get("created_at") or document["created_at"]
        document["last_seen_at"] = existing.get("last_seen_at") or datetime.utcnow()
        await whatsapp_identities_collection.update_one(
            {"id": existing["id"]},
            {"$set": document},
        )
        return document

    await whatsapp_identities_collection.insert_one(document)
    return document


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
    query = {"workspace_id": workspace_id}
    if status:
        query["status"] = status
    items = await nano_tasks_collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items}


@router.get("/confirmations")
async def list_nano_confirmations(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await pending_confirmations_collection.find(
        {"workspace_id": workspace_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(100)
    return {"items": items}


@router.get("/automations")
async def list_nano_automations(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await automation_service.list_workspace_automations(workspace_id=workspace_id)
    return {"items": items}
