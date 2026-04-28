from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from database import nano_activities_collection
from models_extended import NanoActivity, NanoActivityCreate, NanoActivityUpdate
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access
from services.nano_activity_service import (
    compute_next_activity_occurrence,
    normalize_activity_recurrence,
    normalize_activity_scope,
    normalize_reminder_minutes,
    normalize_weekdays,
)

router = APIRouter(prefix="/api/activities", tags=["activities"])


def _serialize(document: dict) -> dict:
    payload = dict(document)
    payload.pop("_id", None)
    payload["account_scope"] = normalize_activity_scope(payload.get("account_scope"))
    payload["recurrence"] = normalize_activity_recurrence(payload.get("recurrence"))
    payload["weekdays"] = normalize_weekdays(payload.get("weekdays"), payload["recurrence"])
    payload["reminder_minutes_before"] = normalize_reminder_minutes(
        payload.get("reminder_minutes_before")
    )
    payload["next_occurrence_at"] = compute_next_activity_occurrence(payload)
    return payload


def _normalize_payload(payload: dict) -> dict:
    normalized = dict(payload)
    normalized["account_scope"] = normalize_activity_scope(normalized.get("account_scope"))
    normalized["recurrence"] = normalize_activity_recurrence(normalized.get("recurrence"))
    normalized["weekdays"] = normalize_weekdays(
        normalized.get("weekdays"),
        normalized["recurrence"],
    )
    normalized["reminder_minutes_before"] = normalize_reminder_minutes(
        normalized.get("reminder_minutes_before")
    )
    return normalized


@router.get("")
async def list_activities(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    query = {"workspace_id": workspace_id}
    if account_scope:
        query["account_scope"] = normalize_activity_scope(account_scope)
    items = await nano_activities_collection.find(query).sort("start_at", 1).to_list(500)
    return {"items": [_serialize(item) for item in items]}


@router.post("")
async def create_activity(
    payload: NanoActivityCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    activity_data = _normalize_payload(payload.dict())
    activity = NanoActivity(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        **activity_data,
    )
    await nano_activities_collection.insert_one(activity.dict())
    return _serialize(activity.dict())


@router.put("/{activity_id}")
async def update_activity(
    activity_id: str,
    payload: NanoActivityUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    existing = await nano_activities_collection.find_one(
        {"id": activity_id, "workspace_id": workspace_id}
    )
    if not existing:
        raise HTTPException(status_code=404, detail="Atividade nao encontrada.")

    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada.")

    merged = dict(existing)
    merged.update(update_data)
    merged = _normalize_payload(merged)
    merged["updated_at"] = datetime.utcnow()

    await nano_activities_collection.update_one(
        {"id": activity_id, "workspace_id": workspace_id},
        {"$set": merged},
    )
    updated = await nano_activities_collection.find_one(
        {"id": activity_id, "workspace_id": workspace_id}
    )
    return _serialize(updated)


@router.delete("/{activity_id}")
async def delete_activity(
    activity_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    result = await nano_activities_collection.delete_one(
        {"id": activity_id, "workspace_id": workspace_id}
    )
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Atividade nao encontrada.")
    return {"deleted": True}
