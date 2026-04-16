import logging

from fastapi import HTTPException

from services.whatsappMessageRouter import route_whatsapp_message
from services.whatsappService import (
    extract_whatsapp_message,
    send_whatsapp_message,
    verify_whatsapp_signature,
)
from services.whatsappUserResolver import resolve_user_workspace_by_phone

logger = logging.getLogger(__name__)


async def _send_reply_safe(*, to: str, text: str) -> dict:
    try:
        return await send_whatsapp_message(to=to, text=text)
    except Exception as exc:
        logger.exception("WhatsApp reply failed for %s", to)
        return {"ok": False, "error": str(exc)}


async def handle_incoming_whatsapp(payload: dict, signature: str | None = None) -> dict:
    if not verify_whatsapp_signature(signature):
        raise HTTPException(status_code=401, detail="Assinatura de webhook invalida")

    incoming = extract_whatsapp_message(payload)
    sender = incoming.get("from") or ""
    message_text = incoming.get("text") or ""
    if not sender or not message_text:
        return {"ok": True, "ignored": True, "reason": "no_supported_message"}

    resolved = await resolve_user_workspace_by_phone(sender)
    if not resolved:
        fallback_reply = (
            "Nao encontrei seu cadastro no Nano. Peca para o admin vincular este telefone ao workspace."
        )
        delivery = await _send_reply_safe(to=sender, text=fallback_reply)
        return {"ok": True, "resolved": False, "reply": fallback_reply, "delivery": delivery}

    routed = await route_whatsapp_message(
        user=resolved["user"],
        workspace=resolved["workspace"],
        content=message_text,
    )
    delivery = await _send_reply_safe(to=sender, text=routed["reply"])

    return {
        "ok": True,
        "resolved": True,
        "provider": incoming.get("provider"),
        "intent": routed.get("intent"),
        "used_tools": routed.get("used_tools", []),
        "delivery": delivery,
    }
