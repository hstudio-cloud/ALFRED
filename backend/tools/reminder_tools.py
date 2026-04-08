from datetime import datetime, timedelta
from typing import Any, Dict

from database import reminders_collection
from models_extended import ReminderFinancial


async def get_agenda_today(workspace_id: str, user_id: str) -> Dict[str, Any]:
    start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    items = await reminders_collection.find(
        {
            "workspace_id": workspace_id,
            "user_id": user_id,
            "is_active": True,
            "remind_at": {"$gte": start, "$lt": end},
        }
    ).sort("remind_at", 1).to_list(50)
    for item in items:
        item.pop("_id", None)
    return {"items": items, "count": len(items), "period": "today"}


async def create_reminder(
    workspace_id: str,
    user_id: str,
    title: str,
    remind_at: datetime,
    description: str | None = None,
) -> Dict[str, Any]:
    reminder = ReminderFinancial(
        workspace_id=workspace_id,
        user_id=user_id,
        title=title,
        remind_at=remind_at,
        description=description,
    )
    payload = reminder.dict()
    await reminders_collection.insert_one(payload)
    return payload

