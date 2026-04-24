from __future__ import annotations

import re
from typing import Optional

from database import db, users_collection, whatsapp_identities_collection


def normalize_phone_number(raw_phone: str) -> str:
    return re.sub(r"\D", "", raw_phone or "")


async def resolve_user_workspace_by_phone(phone_number: str) -> Optional[dict]:
    normalized = normalize_phone_number(phone_number)
    if not normalized:
        return None

    identity = await whatsapp_identities_collection.find_one(
        {
            "phone_number": normalized,
            "status": {"$in": ["linked", "pending"]},
        },
        {"_id": 0},
    )
    if identity:
        user = await users_collection.find_one({"id": identity["user_id"]}, {"_id": 0})
        workspace = await db.workspaces.find_one({"id": identity["workspace_id"]}, {"_id": 0})
        if user and workspace:
            return {"user": user, "workspace": workspace, "identity": identity}

    user = await users_collection.find_one(
        {
            "$or": [
                {"phone": {"$regex": normalized[-8:]}},
                {"profile.phone": {"$regex": normalized[-8:]}},
                {"settings.phone": {"$regex": normalized[-8:]}},
            ]
        },
        {"_id": 0},
    )
    if not user:
        return None

    workspace = await db.workspaces.find_one(
        {"$or": [{"owner_id": user["id"]}, {"members": user["id"]}]},
        {"_id": 0},
    )
    if not workspace:
        return None

    return {"user": user, "workspace": workspace, "identity": None}
