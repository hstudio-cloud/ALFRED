from fastapi import APIRouter, Header, HTTPException, Query, Request
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field

from controllers.whatsappWebhookController import handle_incoming_whatsapp
from services.whatsappService import verify_whatsapp_webhook

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
    x_signature: str | None = Header(default=None),
):
    payload = await request.json()
    if isinstance(payload, dict):
        return await handle_incoming_whatsapp(payload, signature=x_signature)
    parsed = WhatsAppWebhookPayload.model_validate(payload)
    return await handle_incoming_whatsapp(parsed.to_payload(), signature=x_signature)
