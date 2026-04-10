import re
from typing import Optional

from database import db, users_collection


def _normalize_phone(raw_phone: str) -> str:
    return re.sub(r"\D", "", raw_phone or "")


async def resolve_user_workspace_by_phone(phone_number: str) -> Optional[dict]:
    """
    Resolve the user/workspace context by phone number.
    The phone can be stored in users.phone, profile.phone or settings.phone.
    """
    normalized = _normalize_phone(phone_number)
    if not normalized:
        return None

    user = await users_collection.find_one(
        {
            "$or": [
                {"phone": {"$regex": normalized[-8:]}},
                {"profile.phone": {"$regex": normalized[-8:]}},
                {"settings.phone": {"$regex": normalized[-8:]}},
            ]
        }
    )
    if not user:
        return None

    workspace = await db.workspaces.find_one(
        {"$or": [{"owner_id": user["id"]}, {"members": user["id"]}]}
    )
    if not workspace:
        return None

    return {"user": user, "workspace": workspace}
