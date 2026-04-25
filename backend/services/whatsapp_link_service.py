from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Optional

from database import whatsapp_identities_collection, whatsapp_link_codes_collection
from models_extended import WhatsappIdentity, WhatsappLinkCode
from services.whatsapp_user_resolver import normalize_phone_number


def _generate_code() -> str:
    return f"{random.randint(0, 999999):06d}"


async def create_link_code(*, user_id: str, workspace_id: str, expires_in_minutes: int = 10) -> dict:
    now = datetime.utcnow()
    await whatsapp_link_codes_collection.update_many(
        {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "status": "pending",
        },
        {"$set": {"status": "canceled", "updated_at": now}},
    )
    record = WhatsappLinkCode(
        user_id=user_id,
        workspace_id=workspace_id,
        code=_generate_code(),
        expires_at=now + timedelta(minutes=expires_in_minutes),
    )
    await whatsapp_link_codes_collection.insert_one(record.dict())
    return record.dict()


async def get_latest_link_code(*, user_id: str, workspace_id: str) -> Optional[dict]:
    record = await whatsapp_link_codes_collection.find_one(
        {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "status": "pending",
        },
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not record:
        return None
    if record.get("expires_at") and record["expires_at"] < datetime.utcnow():
        await whatsapp_link_codes_collection.update_one(
            {"id": record["id"]},
            {"$set": {"status": "expired", "updated_at": datetime.utcnow()}},
        )
        return None
    return record


async def consume_link_code(*, code: str, phone_number: str) -> Optional[dict]:
    now = datetime.utcnow()
    record = await whatsapp_link_codes_collection.find_one(
        {"code": str(code).strip(), "status": "pending"},
        {"_id": 0},
        sort=[("created_at", -1)],
    )
    if not record:
        return None
    if record.get("expires_at") and record["expires_at"] < now:
        await whatsapp_link_codes_collection.update_one(
            {"id": record["id"]},
            {"$set": {"status": "expired", "updated_at": now}},
        )
        return None

    normalized_phone = normalize_phone_number(phone_number)
    identity = await whatsapp_identities_collection.find_one(
        {"workspace_id": record["workspace_id"], "user_id": record["user_id"]}
    )
    payload = WhatsappIdentity(
        user_id=record["user_id"],
        workspace_id=record["workspace_id"],
        phone_number=normalized_phone,
        status="linked",
    ).dict()
    if identity:
      payload["id"] = identity["id"]
      payload["created_at"] = identity.get("created_at") or payload["created_at"]
      payload["last_seen_at"] = now
      await whatsapp_identities_collection.update_one(
          {"id": identity["id"]},
          {"$set": payload},
      )
    else:
      await whatsapp_identities_collection.insert_one(payload)

    await whatsapp_link_codes_collection.update_one(
        {"id": record["id"]},
        {
            "$set": {
                "status": "linked",
                "phone_number": normalized_phone,
                "updated_at": now,
            }
        },
    )
    return {"link_code": record, "identity": payload}
