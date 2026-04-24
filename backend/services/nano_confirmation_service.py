from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from database import pending_confirmations_collection
from models_extended import PendingConfirmation


CONFIRM_WORDS = {"confirmo", "sim", "pode", "pode prosseguir", "confirmar", "ok", "pode executar"}
REJECT_WORDS = {"nao", "não", "cancela", "cancelar", "parar"}


def normalize_confirmation_text(text: str) -> str:
    return " ".join((text or "").strip().lower().split())


def is_confirmation_message(text: str) -> bool:
    normalized = normalize_confirmation_text(text)
    return normalized in CONFIRM_WORDS


def is_rejection_message(text: str) -> bool:
    normalized = normalize_confirmation_text(text)
    return normalized in REJECT_WORDS


async def create_pending_confirmation(
    *,
    user_id: str,
    workspace_id: str,
    action: Dict[str, Any],
    source_channel: str,
    expires_in_minutes: int = 30,
) -> Dict[str, Any]:
    record = PendingConfirmation(
        user_id=user_id,
        workspace_id=workspace_id,
        action=action,
        source_channel=source_channel,
        expires_at=datetime.utcnow() + timedelta(minutes=expires_in_minutes),
    )
    await pending_confirmations_collection.insert_one(record.dict())
    return record.dict()


async def get_latest_pending_confirmation(*, user_id: str, workspace_id: str) -> Optional[Dict[str, Any]]:
    now = datetime.utcnow()
    record = await pending_confirmations_collection.find_one(
        {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "status": "pending",
        },
        sort=[("created_at", -1)],
    )
    if not record:
        return None
    if record.get("expires_at") and record["expires_at"] < now:
        await pending_confirmations_collection.update_one(
            {"id": record["id"]},
            {"$set": {"status": "expired", "updated_at": now}},
        )
        record["status"] = "expired"
        return None
    return record


async def mark_confirmation_status(confirmation_id: str, status: str) -> None:
    await pending_confirmations_collection.update_one(
        {"id": confirmation_id},
        {"$set": {"status": status, "updated_at": datetime.utcnow()}},
    )


async def list_pending_confirmations(*, workspace_id: str, limit: int = 20) -> List[Dict[str, Any]]:
    items = await pending_confirmations_collection.find(
        {"workspace_id": workspace_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(limit)
    return items
