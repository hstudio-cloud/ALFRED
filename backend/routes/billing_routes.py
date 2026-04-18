import logging
import os
from datetime import datetime, timezone
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from database import db, subscriptions_collection
from routes.auth_routes import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/billing", tags=["billing"])

STRIPE_API_VERSION = "2026-02-25.clover"


class BillingCheckoutRequest(BaseModel):
    workspace_id: Optional[str] = None
    plan_key: Optional[str] = "starter"
    price_id: Optional[str] = None
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class BillingPortalRequest(BaseModel):
    workspace_id: Optional[str] = None
    return_url: Optional[str] = None


async def _resolve_workspace(current_user: dict, workspace_id: Optional[str] = None) -> dict:
    query = {"$or": [{"owner_id": current_user["id"]}, {"members": current_user["id"]}]}
    if workspace_id:
        query["id"] = workspace_id

    workspace = await db.workspaces.find_one(query)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace nao encontrado para este usuario.")
    return workspace


def _get_stripe_module():
    secret_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if not secret_key:
        raise HTTPException(status_code=503, detail="Stripe nao configurado no backend.")

    stripe.api_key = secret_key
    stripe.api_version = STRIPE_API_VERSION
    return stripe


def _resolve_price_id(plan_key: Optional[str], explicit_price_id: Optional[str]) -> str:
    if explicit_price_id:
        return explicit_price_id

    normalized_plan = (plan_key or "starter").strip().lower().replace("-", "_")
    env_candidates = [
        f"STRIPE_PRICE_ID_{normalized_plan.upper()}",
        "STRIPE_DEFAULT_PRICE_ID",
    ]
    for env_key in env_candidates:
        value = (os.getenv(env_key) or "").strip()
        if value:
            return value

    raise HTTPException(
        status_code=400,
        detail="Nao encontrei um Price ID do Stripe para esse plano.",
    )


def _resolve_checkout_urls(success_url: Optional[str], cancel_url: Optional[str]) -> tuple[str, str]:
    resolved_success = (
        success_url
        or (os.getenv("STRIPE_CHECKOUT_SUCCESS_URL") or "").strip()
        or "https://frontend-six-woad-fz102b0vy8.vercel.app/dashboard?billing=success&session_id={CHECKOUT_SESSION_ID}"
    )
    resolved_cancel = (
        cancel_url
        or (os.getenv("STRIPE_CHECKOUT_CANCEL_URL") or "").strip()
        or "https://frontend-six-woad-fz102b0vy8.vercel.app/dashboard?billing=cancelled"
    )
    return resolved_success, resolved_cancel


def _resolve_portal_return_url(return_url: Optional[str]) -> str:
    return (
        return_url
        or (os.getenv("STRIPE_CUSTOMER_PORTAL_RETURN_URL") or "").strip()
        or "https://frontend-six-woad-fz102b0vy8.vercel.app/dashboard?billing=portal"
    )


def _to_datetime(value) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except Exception:
        return None


def _value(source, key: str, default=None):
    if source is None:
        return default
    if isinstance(source, dict):
        return source.get(key, default)
    return getattr(source, key, default)


async def _get_subscription_record(workspace_id: str) -> Optional[dict]:
    return await subscriptions_collection.find_one({"workspace_id": workspace_id})


async def _upsert_subscription_record(workspace_id: str, payload: dict) -> dict:
    update_payload = {**payload, "workspace_id": workspace_id, "updated_at": datetime.now(timezone.utc)}
    await subscriptions_collection.update_one(
        {"workspace_id": workspace_id},
        {"$set": update_payload},
        upsert=True,
    )
    record = await subscriptions_collection.find_one({"workspace_id": workspace_id}, {"_id": 0})
    return record or update_payload


def _extract_subscription_payload(subscription_obj, extras: Optional[dict] = None) -> dict:
    extras = extras or {}
    items = _value(subscription_obj, "items")
    items_data = _value(items, "data", []) if items else []
    first_item = None
    if items_data:
        first_item = items_data[0]
    price = _value(first_item, "price") if first_item else None
    recurring = _value(price, "recurring") if price else None

    return {
        "status": _value(subscription_obj, "status"),
        "stripe_customer_id": _value(subscription_obj, "customer"),
        "stripe_subscription_id": _value(subscription_obj, "id"),
        "stripe_price_id": _value(price, "id"),
        "plan_name": extras.get("plan_name") or extras.get("plan_key") or _value(price, "lookup_key") or _value(price, "nickname") or "Starter",
        "billing_cycle": _value(recurring, "interval") or extras.get("billing_cycle") or "month",
        "price": ((_value(price, "unit_amount", 0) or 0) / 100) if price else extras.get("price", 0.0),
        "trial_ends_at": _to_datetime(_value(subscription_obj, "trial_end")),
        "cancel_at_period_end": bool(_value(subscription_obj, "cancel_at_period_end", False)),
        "current_period_end": _to_datetime(_value(subscription_obj, "current_period_end")),
    }


def _customer_name(current_user: dict) -> str:
    return (current_user.get("name") or "Cliente Nano").strip()


@router.get("/subscription")
async def get_billing_subscription(
    workspace_id: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    workspace = await _resolve_workspace(current_user, workspace_id)
    record = await _get_subscription_record(workspace["id"])
    if not record:
        return {
            "workspace_id": workspace["id"],
            "status": "inactive",
            "plan_name": "Starter",
            "billing_cycle": "month",
            "price": 0.0,
        }
    record.pop("_id", None)
    return record


@router.post("/checkout-session")
async def create_checkout_session(
    payload: BillingCheckoutRequest,
    current_user: dict = Depends(get_current_user),
):
    stripe_mod = _get_stripe_module()
    workspace = await _resolve_workspace(current_user, payload.workspace_id)
    record = await _get_subscription_record(workspace["id"])

    customer_id = record.get("stripe_customer_id") if record else None
    if not customer_id:
        customer = stripe_mod.Customer.create(
            email=current_user["email"],
            name=_customer_name(current_user),
            metadata={
                "workspace_id": workspace["id"],
                "user_id": current_user["id"],
            },
        )
        customer_id = customer.id

    plan_key = (payload.plan_key or "starter").strip().lower()
    price_id = _resolve_price_id(plan_key, payload.price_id)
    success_url, cancel_url = _resolve_checkout_urls(payload.success_url, payload.cancel_url)

    session = stripe_mod.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        billing_address_collection="auto",
        client_reference_id=workspace["id"],
        metadata={
            "workspace_id": workspace["id"],
            "user_id": current_user["id"],
            "plan_key": plan_key,
        },
        subscription_data={
            "metadata": {
                "workspace_id": workspace["id"],
                "user_id": current_user["id"],
                "plan_key": plan_key,
            }
        },
    )

    await _upsert_subscription_record(
        workspace["id"],
        {
            "stripe_customer_id": customer_id,
            "stripe_checkout_session_id": session.id,
            "stripe_price_id": price_id,
            "plan_name": plan_key,
            "status": "checkout_pending",
        },
    )

    return {
        "checkout_url": session.url,
        "session_id": session.id,
        "workspace_id": workspace["id"],
        "price_id": price_id,
        "customer_id": customer_id,
    }


@router.post("/portal-session")
async def create_customer_portal_session(
    payload: BillingPortalRequest,
    current_user: dict = Depends(get_current_user),
):
    stripe_mod = _get_stripe_module()
    workspace = await _resolve_workspace(current_user, payload.workspace_id)
    record = await _get_subscription_record(workspace["id"])

    if not record or not record.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="Nao existe cliente Stripe vinculado a este workspace.")

    portal = stripe_mod.billing_portal.Session.create(
        customer=record["stripe_customer_id"],
        return_url=_resolve_portal_return_url(payload.return_url),
    )
    return {"portal_url": portal.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    stripe_mod = _get_stripe_module()
    webhook_secret = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook do Stripe nao configurado.")

    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    try:
        event = stripe_mod.Webhook.construct_event(payload, signature, webhook_secret)
    except Exception as exc:
        logger.error("Stripe webhook signature error: %s", exc)
        raise HTTPException(status_code=400, detail="Webhook do Stripe invalido.")

    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed":
        if data_object.get("mode") == "subscription":
            workspace_id = (data_object.get("metadata") or {}).get("workspace_id") or data_object.get("client_reference_id")
            if workspace_id:
                await _upsert_subscription_record(
                    workspace_id,
                    {
                        "status": "checkout_completed",
                        "stripe_customer_id": data_object.get("customer"),
                        "stripe_checkout_session_id": data_object.get("id"),
                        "stripe_subscription_id": data_object.get("subscription"),
                        "plan_name": (data_object.get("metadata") or {}).get("plan_key") or "starter",
                    },
                )

    elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        metadata = data_object.get("metadata") or {}
        workspace_id = metadata.get("workspace_id")
        if workspace_id:
            await _upsert_subscription_record(
                workspace_id,
                _extract_subscription_payload(data_object, {"plan_key": metadata.get("plan_key")}),
            )

    elif event_type == "invoice.paid":
        subscription_id = data_object.get("subscription")
        if subscription_id:
            existing = await subscriptions_collection.find_one({"stripe_subscription_id": subscription_id})
            if existing:
                await _upsert_subscription_record(
                    existing["workspace_id"],
                    {
                        "status": "active",
                        "stripe_customer_id": data_object.get("customer"),
                        "stripe_subscription_id": subscription_id,
                        "last_invoice_id": data_object.get("id"),
                    },
                )

    elif event_type == "invoice.payment_failed":
        subscription_id = data_object.get("subscription")
        if subscription_id:
            existing = await subscriptions_collection.find_one({"stripe_subscription_id": subscription_id})
            if existing:
                await _upsert_subscription_record(
                    existing["workspace_id"],
                    {
                        "status": "past_due",
                        "stripe_customer_id": data_object.get("customer"),
                        "stripe_subscription_id": subscription_id,
                        "last_invoice_id": data_object.get("id"),
                    },
                )

    return {"received": True, "event_type": event_type}
