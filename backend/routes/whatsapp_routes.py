from fastapi import APIRouter, Header
from pydantic import BaseModel, Field

from controllers.whatsappWebhookController import handle_incoming_whatsapp

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


@router.post("/webhook")
async def whatsapp_webhook(
    payload: WhatsAppWebhookPayload,
    x_signature: str | None = Header(default=None),
):
    return await handle_incoming_whatsapp(payload.to_payload(), signature=x_signature)
