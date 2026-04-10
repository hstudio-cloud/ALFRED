from typing import Any, Dict

from database import (
    accounts_collection,
    bills_collection,
    reminders_collection,
    transactions_collection,
)


async def get_workspace_summary(workspace_id: str, user_id: str | None = None) -> Dict[str, Any]:
    base_query: Dict[str, Any] = {"workspace_id": workspace_id}
    if user_id:
        base_query["user_id"] = user_id

    tx_count = await transactions_collection.count_documents(base_query)
    accounts_count = await accounts_collection.count_documents({"workspace_id": workspace_id})
    open_bills_count = await bills_collection.count_documents(
        {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
    )
    reminders_count = await reminders_collection.count_documents(
        {"workspace_id": workspace_id, "is_active": True}
    )

    return {
        "transactions": tx_count,
        "accounts": accounts_count,
        "open_bills": open_bills_count,
        "active_reminders": reminders_count,
    }

