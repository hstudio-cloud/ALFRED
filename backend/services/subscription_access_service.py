from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional


ACTIVE_STATUSES = {"active", "trialing"}
GRACE_STATUSES = {"past_due"}


def _to_datetime(value: Any) -> Optional[datetime]:
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


def normalize_subscription_status(provider: str, raw_status: str | None) -> str:
    status = (raw_status or "").strip().lower()
    provider_name = (provider or "").strip().lower()

    if provider_name == "stripe":
        mapping = {
            "trialing": "trialing",
            "active": "active",
            "past_due": "past_due",
            "unpaid": "unpaid",
            "canceled": "canceled",
            "incomplete": "pending",
            "incomplete_expired": "expired",
            "paused": "past_due",
        }
        return mapping.get(status, status or "inactive")

    if provider_name == "asaas":
        mapping = {
            "pending": "pending",
            "received": "active",
            "confirmed": "active",
            "overdue": "past_due",
            "refunded": "canceled",
            "refund_requested": "past_due",
            "received_in_cash": "active",
            "deleted": "canceled",
        }
        return mapping.get(status, status or "inactive")

    return status or "inactive"


def build_access_snapshot(subscription: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not subscription:
        return {
            "has_access": False,
            "status": "inactive",
            "reason": "no_subscription",
            "grace_period": False,
        }

    normalized_status = normalize_subscription_status(
        str(subscription.get("provider") or ""),
        str(subscription.get("status") or ""),
    )
    now = datetime.now(timezone.utc)
    current_period_end = _to_datetime(subscription.get("current_period_end"))
    trial_end = _to_datetime(subscription.get("trial_end"))

    if normalized_status in ACTIVE_STATUSES:
        if current_period_end and current_period_end < now and normalized_status != "trialing":
            return {
                "has_access": False,
                "status": "expired",
                "reason": "period_ended",
                "grace_period": False,
            }
        if normalized_status == "trialing" and trial_end and trial_end < now:
            return {
                "has_access": False,
                "status": "expired",
                "reason": "trial_ended",
                "grace_period": False,
            }
        return {
            "has_access": True,
            "status": normalized_status,
            "reason": "subscription_ok",
            "grace_period": False,
        }

    if normalized_status in GRACE_STATUSES:
        return {
            "has_access": True,
            "status": normalized_status,
            "reason": "payment_grace_period",
            "grace_period": True,
        }

    return {
        "has_access": False,
        "status": normalized_status or "inactive",
        "reason": "subscription_not_active",
        "grace_period": False,
    }
