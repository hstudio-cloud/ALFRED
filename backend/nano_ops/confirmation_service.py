from __future__ import annotations

from typing import Dict, Optional

from database import pending_confirmations_collection
from services.nano_confirmation_service import (
    get_latest_pending_confirmation,
    list_pending_confirmations,
)


async def get_pending_confirmation_snapshot(*, user_id: str, workspace_id: str) -> Optional[Dict]:
    return await get_latest_pending_confirmation(user_id=user_id, workspace_id=workspace_id)


async def list_pending_confirmations_for_workspace(*, workspace_id: str, limit: int = 100) -> list[dict]:
    return await list_pending_confirmations(workspace_id=workspace_id, limit=limit)


async def count_pending_confirmations(*, workspace_id: str) -> int:
    return await pending_confirmations_collection.count_documents(
        {"workspace_id": workspace_id, "status": "pending"}
    )
