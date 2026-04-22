from typing import Optional

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from routes.auth_routes import get_current_user
from services.billing_webhook_service import process_stripe_event
from services.billing_service import create_checkout, create_stripe_portal, get_subscription_state
from services.stripe_service import construct_webhook_event


router = APIRouter(prefix="/api/billing", tags=["billing"])


class BillingCheckoutRequest(BaseModel):
    workspace_id: Optional[str] = None
    plan_code: str = "starter"
    payment_method: str = "credit_card"
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None
    price_id: Optional[str] = None


class BillingPortalRequest(BaseModel):
    workspace_id: Optional[str] = None
    return_url: Optional[str] = None


@router.get("/subscription")
async def get_billing_subscription(
    workspace_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return await get_subscription_state(current_user=current_user, workspace_id=workspace_id)


@router.post("/checkout")
async def billing_checkout(
    payload: BillingCheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    return await create_checkout(
        current_user=current_user,
        workspace_id=payload.workspace_id,
        plan_code=payload.plan_code,
        payment_method=payload.payment_method,
        success_url=payload.success_url,
        cancel_url=payload.cancel_url,
        price_id=payload.price_id,
    )


@router.post("/stripe/customer-portal")
async def billing_stripe_customer_portal(
    payload: BillingPortalRequest,
    current_user: dict = Depends(get_current_user),
):
    return await create_stripe_portal(
        current_user=current_user,
        workspace_id=payload.workspace_id,
        return_url=payload.return_url,
    )


@router.post("/checkout-session")
async def legacy_checkout_session(
    payload: BillingCheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    payload.payment_method = "credit_card"
    return await billing_checkout(payload, current_user)


@router.post("/portal-session")
async def legacy_portal_session(
    payload: BillingPortalRequest,
    current_user: dict = Depends(get_current_user),
):
    return await billing_stripe_customer_portal(payload, current_user)


@router.post("/webhook")
async def legacy_stripe_webhook(request: Request):
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")
    event = construct_webhook_event(payload, signature)
    return await process_stripe_event(event)
