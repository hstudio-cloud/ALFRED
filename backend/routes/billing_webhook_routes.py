from fastapi import APIRouter, Header, HTTPException, Request

from services.asaas_service import verify_webhook_signature
from services.billing_webhook_service import process_asaas_event, process_stripe_event
from services.stripe_service import construct_webhook_event


router = APIRouter(prefix="/api/webhooks", tags=["billing-webhooks"])


@router.post("/stripe")
async def stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    event = construct_webhook_event(payload, signature)
    return await process_stripe_event(event)


@router.post("/asaas")
async def asaas_webhook(
    request: Request,
    asaas_access_token: str | None = Header(default=None),
):
    if not verify_webhook_signature(asaas_access_token):
        raise HTTPException(status_code=401, detail="Assinatura do webhook Asaas invalida.")
    payload = await request.json()
    return await process_asaas_event(payload)
