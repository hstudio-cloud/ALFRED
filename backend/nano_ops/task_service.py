from __future__ import annotations

from database import nano_tasks_collection


async def count_workspace_tasks(*, workspace_id: str) -> int:
    return await nano_tasks_collection.count_documents({"workspace_id": workspace_id})


async def list_workspace_tasks(*, workspace_id: str, status: str | None = None, limit: int = 100) -> list[dict]:
    query = {"workspace_id": workspace_id}
    if status:
        query["status"] = status
    return await nano_tasks_collection.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
