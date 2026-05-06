from __future__ import annotations

import re
from typing import Optional

from database import db, users_collection, whatsapp_identities_collection


def normalize_phone_number(raw_phone: str) -> str:
    return re.sub(r"\D", "", raw_phone or "")


async def _load_workspace_identity(identity: dict) -> Optional[dict]:
    user = await users_collection.find_one({"id": identity["user_id"]}, {"_id": 0})
    workspace = await db.workspaces.find_one({"id": identity["workspace_id"]}, {"_id": 0})
    if user and workspace:
        return {"user": user, "workspace": workspace, "identity": identity, "resolution_source": "identity"}
    return None


async def resolve_user_workspace_by_phone(phone_number: str) -> Optional[dict]:
    normalized = normalize_phone_number(phone_number)
    if not normalized:
        return None

    identity = await whatsapp_identities_collection.find_one(
        {
            "phone_number": normalized,
            "status": "linked",
        },
        {"_id": 0},
    )
    if identity:
        return await _load_workspace_identity(identity)

    if len(normalized) < 8:
        return None

    matches = await users_collection.find(
        {
            "$or": [
                {"phone": {"$regex": f"{normalized[-8:]}$"}},
                {"profile.phone": {"$regex": f"{normalized[-8:]}$"}},
                {"settings.phone": {"$regex": f"{normalized[-8:]}$"}},
            ]
        },
        {"_id": 0},
    ).to_list(5)
    if len(matches) != 1:
        return None
    user = matches[0]

    workspace = await db.workspaces.find_one(
        {"$or": [{"owner_id": user["id"]}, {"members": user["id"]}]},
        {"_id": 0},
    )
    if not workspace:
        return None

    return {"user": user, "workspace": workspace, "identity": None, "resolution_source": "user_phone_fallback"}
