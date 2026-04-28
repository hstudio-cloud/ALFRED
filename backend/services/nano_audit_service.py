from __future__ import annotations

from typing import Any, Dict, Optional

from bson import ObjectId

from database import nano_audit_logs_collection
from models_extended import NanoAuditLog


def _sanitize_json_payload(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {key: _sanitize_json_payload(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_json_payload(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_json_payload(item) for item in value]
    return value


async def create_nano_audit_log(
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
    record = NanoAuditLog(
        user_id=user_id,
        workspace_id=workspace_id,
        source_channel=source_channel,
        event_type=event_type,
        status=status,
        risk_level=risk_level,
        action_type=action_type,
        message=message,
        metadata=_sanitize_json_payload(metadata or {}),
    ).dict()
    await nano_audit_logs_collection.insert_one(record)
    return record
