from __future__ import annotations

import os
from typing import Optional

import stripe
from fastapi import HTTPException


STRIPE_API_VERSION = "2026-02-25.clover"


def _default_frontend_url() -> str:
    return (
        (os.getenv("FRONTEND_URL") or "").strip()
        or (os.getenv("APP_URL") or "").strip()
        or "https://frontend-six-woad-fz102b0vy8.vercel.app"
    ).rstrip("/")


def get_stripe_client():
    secret_key = (os.getenv("STRIPE_SECRET_KEY") or "").strip()
    if not secret_key:
        raise HTTPException(status_code=503, detail="Stripe nao configurado no backend.")

    stripe.api_key = secret_key
    stripe.api_version = STRIPE_API_VERSION
    return stripe


def resolve_price_id(plan_code: Optional[str], explicit_price_id: Optional[str] = None) -> str:
    if explicit_price_id:
        return explicit_price_id

    normalized_plan = (plan_code or "starter").strip().lower().replace("-", "_")
    for env_key in (f"STRIPE_PRICE_ID_{normalized_plan.upper()}", "STRIPE_DEFAULT_PRICE_ID"):
        value = (os.getenv(env_key) or "").strip()
        if value:
            return value

    raise HTTPException(status_code=400, detail="Nao encontrei um Price ID do Stripe para esse plano.")


def resolve_checkout_urls(success_url: Optional[str], cancel_url: Optional[str]) -> tuple[str, str]:
    frontend_url = _default_frontend_url()
    resolved_success = (
        success_url
        or (os.getenv("STRIPE_CHECKOUT_SUCCESS_URL") or "").strip()
        or f"{frontend_url}/billing?checkout=success&session_id={{CHECKOUT_SESSION_ID}}"
    )
    resolved_cancel = (
        cancel_url
        or (os.getenv("STRIPE_CHECKOUT_CANCEL_URL") or "").strip()
        or f"{frontend_url}/billing?checkout=cancelled"
    )
    return resolved_success, resolved_cancel


def resolve_portal_return_url(return_url: Optional[str]) -> str:
    return (
        return_url
        or (os.getenv("STRIPE_CUSTOMER_PORTAL_RETURN_URL") or "").strip()
        or f"{_default_frontend_url()}/billing"
    )


def create_checkout_session(
    *,
    customer_id: str,
    workspace_id: str,
    user_id: str,
    plan_code: str,
    price_id: str,
    success_url: str,
    cancel_url: str,
):
    stripe_client = get_stripe_client()
    return stripe_client.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        allow_promotion_codes=True,
        billing_address_collection="auto",
        phone_number_collection={"enabled": False},
        payment_method_collection="always",
        client_reference_id=workspace_id,
        metadata={
            "workspace_id": workspace_id,
            "user_id": user_id,
            "plan_code": plan_code,
        },
        subscription_data={
            "metadata": {
                "workspace_id": workspace_id,
                "user_id": user_id,
                "plan_code": plan_code,
            }
        },
    )


def create_customer(*, email: str, name: str, workspace_id: str, user_id: str):
    stripe_client = get_stripe_client()
    return stripe_client.Customer.create(
        email=email,
        name=name,
        metadata={"workspace_id": workspace_id, "user_id": user_id},
    )


def create_customer_portal_session(*, customer_id: str, return_url: str):
    stripe_client = get_stripe_client()
    return stripe_client.billing_portal.Session.create(customer=customer_id, return_url=return_url)


def construct_webhook_event(payload: bytes, signature: str):
    stripe_client = get_stripe_client()
    webhook_secret = (os.getenv("STRIPE_WEBHOOK_SECRET") or "").strip()
    if not webhook_secret:
        raise HTTPException(status_code=503, detail="Webhook do Stripe nao configurado.")
    try:
        return stripe_client.Webhook.construct_event(payload, signature, webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Webhook do Stripe invalido.") from exc
