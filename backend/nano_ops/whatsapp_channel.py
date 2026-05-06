from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from database import whatsapp_identities_collection
from models_extended import WhatsappIdentity
from nano_ops.audit_service import create_audit_entry
from nano_ops.confirmation_service import count_pending_confirmations
from nano_ops.task_service import count_workspace_tasks
from services.whatsapp_link_service import consume_link_code, get_latest_link_code
from services.whatsapp_message_router import route_whatsapp_message
from services.whatsapp_service import send_whatsapp_message
from services.whatsapp_user_resolver import normalize_phone_number, resolve_user_workspace_by_phone


def _provider_snapshot() -> dict:
    provider = (
        os.getenv("WHATSAPP_PROVIDER", "").strip().lower()
        or ("meta_cloud" if os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip() else "generic")
    )
    missing_env = []
    if provider == "meta_cloud":
        if not os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip():
            missing_env.append("WHATSAPP_WEBHOOK_VERIFY_TOKEN")
        if not os.getenv("WHATSAPP_APP_SECRET", "").strip():
            missing_env.append("WHATSAPP_APP_SECRET")
        if not os.getenv("WHATSAPP_PROVIDER_TOKEN", "").strip():
            missing_env.append("WHATSAPP_PROVIDER_TOKEN")
        if not os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip():
            missing_env.append("WHATSAPP_META_PHONE_NUMBER_ID")
    else:
        if not os.getenv("WHATSAPP_PROVIDER_URL", "").strip():
            missing_env.append("WHATSAPP_PROVIDER_URL")
        if not os.getenv("WHATSAPP_PROVIDER_TOKEN", "").strip():
            missing_env.append("WHATSAPP_PROVIDER_TOKEN")
        if not os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip():
            missing_env.append("WHATSAPP_WEBHOOK_VERIFY_TOKEN")

    return {
        "provider": provider,
        "webhook_verify_ready": bool(
            os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip()
            or os.getenv("WHATSAPP_WEBHOOK_SECRET", "").strip()
        ),
        "signature_ready": bool(
            os.getenv("WHATSAPP_APP_SECRET", "").strip()
            or os.getenv("WHATSAPP_WEBHOOK_SECRET", "").strip()
        ),
        "outbound_ready": bool(
            os.getenv("WHATSAPP_PROVIDER_TOKEN", "").strip()
            and (
                os.getenv("WHATSAPP_PROVIDER_URL", "").strip()
                or os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip()
            )
        ),
        "missing_env": missing_env,
        "ready": len(missing_env) == 0,
    }


async def build_whatsapp_status(*, workspace_id: str, user_id: str) -> Dict[str, Any]:
    identity = await whatsapp_identities_collection.find_one(
        {"workspace_id": workspace_id, "user_id": user_id},
        {"_id": 0},
    )
    return {
        "whatsapp_setup": {
            **_provider_snapshot(),
            "linked_phone_saved": bool(identity and identity.get("phone_number")),
        },
        "workspace_id": workspace_id,
        "whatsapp_connected": bool(identity and identity.get("status") == "linked"),
        "whatsapp_identity": identity,
        "pending_link_code": await get_latest_link_code(user_id=user_id, workspace_id=workspace_id),
        "pending_confirmations": await count_pending_confirmations(workspace_id=workspace_id),
        "nano_tasks": await count_workspace_tasks(workspace_id=workspace_id),
    }


async def link_whatsapp_number(
    *,
    workspace_id: str,
    user_id: str,
    phone_number: str,
    status: str = "linked",
) -> Dict[str, Any]:
    normalized_phone = normalize_phone_number(phone_number)
    existing = await whatsapp_identities_collection.find_one(
        {"workspace_id": workspace_id, "user_id": user_id}
    )
    document = WhatsappIdentity(
        user_id=user_id,
        workspace_id=workspace_id,
        phone_number=normalized_phone,
        status=status,
    ).dict()
    if existing:
        document["id"] = existing["id"]
        document["created_at"] = existing.get("created_at") or document["created_at"]
        document["last_seen_at"] = existing.get("last_seen_at") or datetime.now(timezone.utc)
        await whatsapp_identities_collection.update_one({"id": existing["id"]}, {"$set": document})
    else:
        await whatsapp_identities_collection.insert_one(document)

    await create_audit_entry(
        user_id=user_id,
        workspace_id=workspace_id,
        source_channel="whatsapp",
        event_type="whatsapp_linked",
        status=status,
        message=normalized_phone,
        metadata={"phone_number": normalized_phone},
    )
    return document


async def handle_incoming_whatsapp_message(
    *,
    sender: str,
    message_text: str,
    incoming: Dict[str, Any],
) -> Dict[str, Any]:
    resolved = await resolve_user_workspace_by_phone(sender)
    if not resolved or not resolved.get("identity"):
        linked = await consume_link_code(code=message_text, phone_number=sender)
        if linked:
            reply = "Numero vinculado com sucesso ao Nano. Pode me enviar comandos financeiros por aqui."
            delivery = await send_whatsapp_message(to=sender, text=reply)
            await create_audit_entry(
                user_id=linked["identity"]["user_id"],
                workspace_id=linked["identity"]["workspace_id"],
                source_channel="whatsapp",
                event_type="whatsapp_link_code_consumed",
                status="linked",
                message=message_text,
                metadata={"phone_number": sender},
            )
            return {"ok": True, "resolved": True, "linked": True, "reply": reply, "delivery": delivery}

        reply = "Nao encontrei este numero vinculado ao Nano. Gere um codigo no painel e envie esse codigo aqui para conectar o WhatsApp."
        delivery = await send_whatsapp_message(to=sender, text=reply)
        return {"ok": True, "resolved": False, "reply": reply, "delivery": delivery}

    identity = resolved["identity"]
    await whatsapp_identities_collection.update_one(
        {"id": identity["id"]},
        {"$set": {"last_seen_at": datetime.now(timezone.utc), "status": "linked"}},
    )
    await create_audit_entry(
        user_id=resolved["user"]["id"],
        workspace_id=resolved["workspace"]["id"],
        source_channel="whatsapp",
        event_type="whatsapp_message_received",
        status="received",
        message=message_text,
        metadata={
            "phone_number": sender,
            "contact_name": incoming.get("profile_name"),
            "message_id": incoming.get("message_id"),
        },
    )

    routed = await route_whatsapp_message(
        user=resolved["user"],
        workspace=resolved["workspace"],
        content=message_text,
        contact_name=incoming.get("profile_name"),
    )
    delivery = await send_whatsapp_message(to=sender, text=routed["reply"])
    await create_audit_entry(
        user_id=resolved["user"]["id"],
        workspace_id=resolved["workspace"]["id"],
        source_channel="whatsapp",
        event_type="whatsapp_message_replied",
        status="completed",
        risk_level=routed.get("risk_level", "low_risk"),
        action_type=(routed.get("actions") or [{}])[0].get("type") if routed.get("actions") else None,
        message=routed["reply"],
        metadata={
            "phone_number": sender,
            "intent": routed.get("intent"),
            "requires_confirmation": routed.get("requires_confirmation"),
            "used_tools": routed.get("used_tools", []),
        },
    )
    return {
        "ok": True,
        "resolved": True,
        "intent": routed.get("intent"),
        "risk_level": routed.get("risk_level"),
        "requires_confirmation": routed.get("requires_confirmation"),
        "used_tools": routed.get("used_tools", []),
        "delivery": delivery,
    }
