from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from database import payments_collection, subscriptions_collection
from services.billing_service import mark_asaas_subscription_paid, upsert_subscription_record
from services.subscription_access_service import normalize_subscription_status


def _to_datetime_from_timestamp(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except Exception:
        return None


def _to_datetime_from_iso(value: Any) -> Optional[datetime]:
    if not value:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None
    return None


async def process_stripe_event(event: Dict[str, Any]) -> Dict[str, Any]:
    event_type = event["type"]
    data_object = event["data"]["object"]

    if event_type == "checkout.session.completed" and data_object.get("mode") == "subscription":
        workspace_id = (data_object.get("metadata") or {}).get("workspace_id") or data_object.get("client_reference_id")
        if workspace_id:
            await upsert_subscription_record(
                workspace_id,
                {
                    "user_id": (data_object.get("metadata") or {}).get("user_id"),
                    "plan_code": (data_object.get("metadata") or {}).get("plan_code") or "starter",
                    "provider": "stripe",
                    "payment_method": "credit_card",
                    "provider_customer_id": data_object.get("customer"),
                    "provider_subscription_id": data_object.get("subscription"),
                    "provider_checkout_id": data_object.get("id"),
                    "status": "checkout_completed",
                },
            )

    elif event_type in {"customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"}:
        metadata = data_object.get("metadata") or {}
        workspace_id = metadata.get("workspace_id")
        if workspace_id:
            items = ((data_object.get("items") or {}).get("data") or [])
            first_item = items[0] if items else {}
            price = first_item.get("price") or {}
            await upsert_subscription_record(
                workspace_id,
                {
                    "user_id": metadata.get("user_id"),
                    "plan_code": metadata.get("plan_code") or price.get("lookup_key") or "starter",
                    "provider": "stripe",
                    "payment_method": "credit_card",
                    "provider_customer_id": data_object.get("customer"),
                    "provider_subscription_id": data_object.get("id"),
                    "provider_checkout_id": data_object.get("latest_invoice"),
                    "status": normalize_subscription_status("stripe", data_object.get("status")),
                    "current_period_end": _to_datetime_from_timestamp(data_object.get("current_period_end")),
                    "trial_end": _to_datetime_from_timestamp(data_object.get("trial_end")),
                    "cancel_at_period_end": bool(data_object.get("cancel_at_period_end", False)),
                },
            )

    elif event_type in {"invoice.paid", "invoice.payment_failed"}:
        subscription_id = data_object.get("subscription")
        if subscription_id:
            existing = await subscriptions_collection.find_one({"provider_subscription_id": subscription_id}, {"_id": 0})
            if existing:
                invoice_status = "paid" if event_type == "invoice.paid" else "failed"
                await upsert_subscription_record(
                    existing["workspace_id"],
                    {
                        "user_id": existing["user_id"],
                        "plan_code": existing.get("plan_code", "starter"),
                        "provider": "stripe",
                        "payment_method": "credit_card",
                        "provider_customer_id": data_object.get("customer"),
                        "provider_subscription_id": subscription_id,
                        "status": "active" if event_type == "invoice.paid" else "past_due",
                    },
                )
                stripe_invoice_id = data_object.get("id")
                await payments_collection.update_one(
                    {"provider": "stripe", "provider_payment_id": stripe_invoice_id},
                    {
                        "$set": {
                            "subscription_id": existing["id"],
                            "provider": "stripe",
                            "provider_payment_id": stripe_invoice_id,
                            "amount": float((data_object.get("amount_paid") or data_object.get("amount_due") or 0) / 100),
                            "currency": str(data_object.get("currency") or "BRL").upper(),
                            "status": invoice_status,
                            "paid_at": _to_datetime_from_timestamp(data_object.get("status_transitions", {}).get("paid_at")),
                            "due_date": _to_datetime_from_timestamp(data_object.get("due_date")),
                            "invoice_url": data_object.get("hosted_invoice_url") or data_object.get("invoice_pdf"),
                            "raw_payload": data_object,
                            "updated_at": datetime.now(timezone.utc),
                        },
                        "$setOnInsert": {
                            "id": f"stripe-{stripe_invoice_id}",
                            "created_at": datetime.now(timezone.utc),
                            "pix_qr_code": None,
                            "pix_payload": None,
                        },
                    },
                    upsert=True,
                )

    return {"received": True, "event_type": event_type}


async def process_asaas_event(payload: Dict[str, Any]) -> Dict[str, Any]:
    event_type = str(payload.get("event") or "").strip()
    payment = payload.get("payment") or {}
    payment_id = payment.get("id")
    if not payment_id:
        return {"received": True, "event_type": event_type, "ignored": True}

    payment_record = await payments_collection.find_one({"provider_payment_id": payment_id}, {"_id": 0})
    if not payment_record:
        return {"received": True, "event_type": event_type, "ignored": True}

    await payments_collection.update_one(
        {"provider_payment_id": payment_id},
        {
            "$set": {
                "status": normalize_subscription_status("asaas", payment.get("status")),
                "paid_at": _to_datetime_from_iso(payment.get("clientPaymentDate")) or _to_datetime_from_iso(payment.get("paymentDate")),
                "due_date": _to_datetime_from_iso(payment.get("dueDate")),
                "invoice_url": payment.get("invoiceUrl") or payment.get("bankSlipUrl"),
                "raw_payload": payload,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    subscription = await subscriptions_collection.find_one({"id": payment_record["subscription_id"]}, {"_id": 0})
    if not subscription:
        return {"received": True, "event_type": event_type, "ignored": True}

    if event_type in {"PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_RECEIVED_IN_CASH"}:
        await mark_asaas_subscription_paid(subscription, payment)
    elif event_type == "PAYMENT_OVERDUE":
        await upsert_subscription_record(
            subscription["workspace_id"],
            {
                "user_id": subscription["user_id"],
                "plan_code": subscription.get("plan_code", "starter"),
                "provider": "asaas",
                "payment_method": subscription.get("payment_method", "pix"),
                "provider_customer_id": subscription.get("provider_customer_id"),
                "provider_checkout_id": payment_id,
                "status": "past_due",
            },
        )
    elif event_type in {"PAYMENT_DELETED", "PAYMENT_REFUNDED"}:
        await upsert_subscription_record(
            subscription["workspace_id"],
            {
                "user_id": subscription["user_id"],
                "plan_code": subscription.get("plan_code", "starter"),
                "provider": "asaas",
                "payment_method": subscription.get("payment_method", "pix"),
                "provider_customer_id": subscription.get("provider_customer_id"),
                "provider_checkout_id": payment_id,
                "status": "canceled",
            },
        )

    return {"received": True, "event_type": event_type}
