from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from nano_ops.whatsapp_channel import handle_incoming_whatsapp_message
from services.whatsapp_service import (
    extract_whatsapp_message,
    verify_whatsapp_signature,
    verify_whatsapp_webhook,
)

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])


class WhatsAppWebhookPayload(BaseModel):
    from_: str | None = Field(default=None, alias="from")
    phone: str | None = None
    text: str | None = None
    message: str | None = None

    def to_payload(self) -> dict:
        return {
            "from": self.from_ or self.phone,
            "text": self.text or self.message,
        }


@router.get("/health")
async def whatsapp_health():
    return {"status": "ok", "service": "whatsapp-webhook"}


@router.get("/webhook", response_class=PlainTextResponse)
async def whatsapp_webhook_verify(
    hub_mode: str | None = Query(default=None, alias="hub.mode"),
    hub_verify_token: str | None = Query(default=None, alias="hub.verify_token"),
    hub_challenge: str | None = Query(default=None, alias="hub.challenge"),
):
    if not verify_whatsapp_webhook(hub_mode, hub_verify_token):
        raise HTTPException(status_code=403, detail="Webhook verification failed")
    return hub_challenge or ""


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    x_signature: str | None = Header(default=None, alias="x-hub-signature-256"),
):
    raw_body = await request.body()
    if not verify_whatsapp_signature(x_signature, raw_body):
        raise HTTPException(status_code=401, detail="Assinatura de webhook invalida")

    payload = await request.json()
    raw_payload = payload if isinstance(payload, dict) else WhatsAppWebhookPayload.model_validate(payload).to_payload()
    incoming = extract_whatsapp_message(raw_payload)
    sender = incoming.get("from") or ""
    message_text = incoming.get("text") or ""
    if not sender or not message_text:
        return {"ok": True, "ignored": True, "reason": "no_supported_message"}

    return await handle_incoming_whatsapp_message(
        sender=sender,
        message_text=message_text,
        incoming=incoming,
    )
