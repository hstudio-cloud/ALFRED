from __future__ import annotations

from typing import Any, Dict, Optional

from database import nano_audit_logs_collection
from services.nano_audit_service import create_nano_audit_log


async def create_audit_entry(
    *,
    user_id: str,
    workspace_id: str,
    source_channel: str,
    event_type: str,
    status: str,
    risk_level: str = "low_risk",
    action_type: Optional[str] = None,
    message: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    return await create_nano_audit_log(
        user_id=user_id,
        workspace_id=workspace_id,
        source_channel=source_channel,
        event_type=event_type,
        status=status,
        risk_level=risk_level,
        action_type=action_type,
        message=message,
        metadata=metadata,
    )


async def list_audit_entries(*, workspace_id: str, limit: int = 100) -> list[dict]:
    return await nano_audit_logs_collection.find(
        {"workspace_id": workspace_id},
        {"_id": 0},
    ).sort("created_at", -1).to_list(limit)
