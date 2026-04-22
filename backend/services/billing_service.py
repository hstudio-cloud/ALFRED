from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from fastapi import HTTPException

from database import db, payments_collection, subscriptions_collection
from models_billing import PaymentRecord, SubscriptionRecord
from services.asaas_service import create_boleto_charge, create_pix_charge, ensure_customer
from services.stripe_service import (
    create_checkout_session,
    create_customer,
    create_customer_portal_session,
    resolve_checkout_urls,
    resolve_portal_return_url,
    resolve_price_id,
)
from services.subscription_access_service import build_access_snapshot, normalize_subscription_status


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


async def resolve_workspace(current_user: dict, workspace_id: Optional[str] = None) -> dict:
    query = {"$or": [{"owner_id": current_user["id"]}, {"members": current_user["id"]}]}
    if workspace_id:
        query["id"] = workspace_id
    workspace = await db.workspaces.find_one(query)
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace nao encontrado para este usuario.")
    return workspace


async def get_subscription_by_workspace(workspace_id: str) -> Optional[dict]:
    return await subscriptions_collection.find_one({"workspace_id": workspace_id}, {"_id": 0})


async def get_latest_payment(subscription_id: str) -> Optional[dict]:
    return await payments_collection.find_one(
        {"subscription_id": subscription_id},
        {"_id": 0},
        sort=[("created_at", -1)],
    )


async def upsert_subscription_record(workspace_id: str, payload: Dict[str, Any]) -> dict:
    existing = await subscriptions_collection.find_one({"workspace_id": workspace_id}, {"_id": 0})
    base = existing or {}
    now = _utc_now()
    merged = {
        **base,
        **payload,
        "workspace_id": workspace_id,
        "updated_at": now,
    }
    if not base:
        seed = SubscriptionRecord(
            user_id=payload["user_id"],
            workspace_id=workspace_id,
            plan_code=payload.get("plan_code", "starter"),
            provider=payload.get("provider", "stripe"),
            payment_method=payload.get("payment_method", "credit_card"),
        )
        merged.setdefault("id", seed.id)
        merged.setdefault("created_at", now)
    await subscriptions_collection.update_one({"workspace_id": workspace_id}, {"$set": merged}, upsert=True)
    return await subscriptions_collection.find_one({"workspace_id": workspace_id}, {"_id": 0})


async def create_payment_record(payload: Dict[str, Any]) -> dict:
    payment = PaymentRecord(**payload)
    await payments_collection.insert_one(payment.model_dump())
    return await payments_collection.find_one({"id": payment.id}, {"_id": 0})


def _customer_name(current_user: dict) -> str:
    return (current_user.get("name") or "Cliente Nano").strip()


def _extract_user_contact(current_user: dict) -> Dict[str, str]:
    profile = current_user.get("profile") or {}
    settings = current_user.get("settings") or {}
    phone = current_user.get("phone") or profile.get("phone") or settings.get("phone") or ""
    cpf = current_user.get("cpf") or profile.get("cpf") or settings.get("cpf") or ""
    return {"phone": str(phone).strip(), "cpf_cnpj": str(cpf).strip()}


def _plan_amount(plan_code: str) -> float:
    normalized = (plan_code or "starter").strip().lower().replace("-", "_")
    raw = (os.getenv(f"BILLING_PLAN_{normalized.upper()}_AMOUNT") or os.getenv("BILLING_DEFAULT_AMOUNT") or "49.90").strip()
    try:
        return float(raw.replace(",", "."))
    except ValueError:
        return 49.90


async def create_checkout(
    *,
    current_user: dict,
    workspace_id: Optional[str],
    plan_code: str,
    payment_method: str,
    success_url: Optional[str] = None,
    cancel_url: Optional[str] = None,
    price_id: Optional[str] = None,
) -> Dict[str, Any]:
    workspace = await resolve_workspace(current_user, workspace_id)
    method = (payment_method or "credit_card").strip().lower()
    normalized_plan = (plan_code or "starter").strip().lower()
    existing = await get_subscription_by_workspace(workspace["id"])

    if method == "credit_card":
        customer_id = existing.get("provider_customer_id") if existing and existing.get("provider") == "stripe" else None
        if not customer_id:
            customer = create_customer(
                email=current_user["email"],
                name=_customer_name(current_user),
                workspace_id=workspace["id"],
                user_id=current_user["id"],
            )
            customer_id = customer.id

        resolved_price_id = resolve_price_id(normalized_plan, price_id)
        resolved_success, resolved_cancel = resolve_checkout_urls(success_url, cancel_url)
        session = create_checkout_session(
            customer_id=customer_id,
            workspace_id=workspace["id"],
            user_id=current_user["id"],
            plan_code=normalized_plan,
            price_id=resolved_price_id,
            success_url=resolved_success,
            cancel_url=resolved_cancel,
        )
        subscription = await upsert_subscription_record(
            workspace["id"],
            {
                "user_id": current_user["id"],
                "plan_code": normalized_plan,
                "provider": "stripe",
                "payment_method": method,
                "provider_customer_id": customer_id,
                "provider_checkout_id": session.id,
                "status": "checkout_pending",
                "cancel_at_period_end": False,
            },
        )
        return {
            "provider": "stripe",
            "payment_method": method,
            "checkout_url": session.url,
            "session_id": session.id,
            "subscription": subscription,
        }

    if method not in {"pix", "boleto"}:
        raise HTTPException(status_code=400, detail="Metodo de pagamento invalido.")

    contact = _extract_user_contact(current_user)
    customer = await ensure_customer(
        name=_customer_name(current_user),
        email=current_user["email"],
        phone=contact["phone"],
        cpf_cnpj=contact["cpf_cnpj"],
        external_reference=f"workspace:{workspace['id']}:user:{current_user['id']}",
    )
    amount = _plan_amount(normalized_plan)
    description = f"Assinatura Nano - plano {normalized_plan}"
    external_reference = f"nano:{workspace['id']}:{normalized_plan}:{method}"

    if method == "pix":
        provider_payload = await create_pix_charge(
            customer_id=customer["id"],
            amount=amount,
            due_date=None,
            description=description,
            external_reference=external_reference,
        )
        payment_data = provider_payload["payment"]
        pix_data = provider_payload.get("pix") or {}
    else:
        provider_payload = await create_boleto_charge(
            customer_id=customer["id"],
            amount=amount,
            due_date=None,
            description=description,
            external_reference=external_reference,
        )
        payment_data = provider_payload["payment"]
        pix_data = {}

    subscription = await upsert_subscription_record(
        workspace["id"],
        {
            "user_id": current_user["id"],
            "plan_code": normalized_plan,
            "provider": "asaas",
            "payment_method": method,
            "provider_customer_id": customer["id"],
            "provider_checkout_id": payment_data.get("id"),
            "status": normalize_subscription_status("asaas", payment_data.get("status")),
            "cancel_at_period_end": False,
        },
    )

    payment = await create_payment_record(
        {
            "subscription_id": subscription["id"],
            "provider": "asaas",
            "provider_payment_id": payment_data.get("id"),
            "amount": float(payment_data.get("value") or amount),
            "currency": "BRL",
            "status": normalize_subscription_status("asaas", payment_data.get("status")),
            "due_date": datetime.fromisoformat(payment_data["dueDate"]).replace(tzinfo=timezone.utc)
            if payment_data.get("dueDate")
            else None,
            "invoice_url": payment_data.get("invoiceUrl") or payment_data.get("bankSlipUrl"),
            "pix_qr_code": pix_data.get("encodedImage"),
            "pix_payload": pix_data.get("payload"),
            "raw_payload": provider_payload,
        }
    )

    return {
        "provider": "asaas",
        "payment_method": method,
        "subscription": subscription,
        "payment": payment,
    }


async def create_stripe_portal(*, current_user: dict, workspace_id: Optional[str], return_url: Optional[str]) -> Dict[str, Any]:
    workspace = await resolve_workspace(current_user, workspace_id)
    subscription = await get_subscription_by_workspace(workspace["id"])
    if not subscription or subscription.get("provider") != "stripe" or not subscription.get("provider_customer_id"):
        raise HTTPException(status_code=400, detail="Nao existe cliente Stripe vinculado a este workspace.")
    portal = create_customer_portal_session(
        customer_id=subscription["provider_customer_id"],
        return_url=resolve_portal_return_url(return_url),
    )
    return {"portal_url": portal.url}


async def get_subscription_state(*, current_user: dict, workspace_id: Optional[str]) -> Dict[str, Any]:
    workspace = await resolve_workspace(current_user, workspace_id)
    subscription = await get_subscription_by_workspace(workspace["id"])
    if not subscription:
        return {
            "workspace_id": workspace["id"],
            "subscription": None,
            "latest_payment": None,
            "access": build_access_snapshot(None),
        }

    latest_payment = await get_latest_payment(subscription["id"])
    return {
        "workspace_id": workspace["id"],
        "subscription": subscription,
        "latest_payment": latest_payment,
        "access": build_access_snapshot(subscription),
    }


async def mark_asaas_subscription_paid(subscription: dict, payment_payload: dict) -> dict:
    paid_at = _utc_now()
    return await upsert_subscription_record(
        subscription["workspace_id"],
        {
            "user_id": subscription["user_id"],
            "plan_code": subscription.get("plan_code", "starter"),
            "provider": "asaas",
            "payment_method": subscription.get("payment_method", "pix"),
            "provider_customer_id": subscription.get("provider_customer_id"),
            "provider_subscription_id": subscription.get("provider_subscription_id"),
            "provider_checkout_id": payment_payload.get("id") or subscription.get("provider_checkout_id"),
            "status": "active",
            "current_period_end": paid_at + timedelta(days=30),
            "cancel_at_period_end": False,
        },
    )
