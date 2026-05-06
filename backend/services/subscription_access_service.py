from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional


ACTIVE_STATUSES = {"active", "trialing"}
GRACE_STATUSES = {"past_due"}
PLAN_FEATURES = {
    "starter": {
        "dashboard",
        "chat_basic",
    },
    "trial": {
        "dashboard",
        "chat_basic",
    },
    "pro": {
        "dashboard",
        "chat_basic",
        "whatsapp",
        "automations",
        "reports",
    },
    "business": {
        "dashboard",
        "chat_basic",
        "whatsapp",
        "automations",
        "reports",
        "multiworkspace",
        "open_finance",
        "team",
    },
}


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


def normalize_plan_code(plan_code: str | None) -> str:
    normalized = (plan_code or "starter").strip().lower().replace("-", "_")
    return normalized or "starter"


def get_plan_features(plan_code: str | None) -> set[str]:
    normalized = normalize_plan_code(plan_code)
    return set(PLAN_FEATURES.get(normalized, PLAN_FEATURES["starter"]))


def build_feature_access_map(subscription: Optional[Dict[str, Any]]) -> Dict[str, bool]:
    if not subscription:
        features = get_plan_features("starter")
        return {feature: False for feature in sorted(features)}

    features = get_plan_features(subscription.get("plan_code"))
    access = build_access_snapshot(subscription)
    return {
        feature: bool(access["has_access"])
        for feature in sorted(features)
    }


def can_access_feature(subscription: Optional[Dict[str, Any]], feature_key: str) -> bool:
    normalized_feature = (feature_key or "").strip().lower().replace("-", "_")
    if not normalized_feature:
        return False
    access = build_access_snapshot(subscription)
    if not access["has_access"]:
        return False
    return normalized_feature in get_plan_features((subscription or {}).get("plan_code"))


def build_access_snapshot(subscription: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    if not subscription:
        return {
            "has_access": False,
            "status": "inactive",
            "reason": "no_subscription",
            "grace_period": False,
            "plan_code": "starter",
            "features": {},
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
                "plan_code": normalize_plan_code(subscription.get("plan_code")),
                "features": {},
            }
        if normalized_status == "trialing" and trial_end and trial_end < now:
            return {
                "has_access": False,
                "status": "expired",
                "reason": "trial_ended",
                "grace_period": False,
                "plan_code": normalize_plan_code(subscription.get("plan_code")),
                "features": {},
            }
        return {
            "has_access": True,
            "status": normalized_status,
            "reason": "subscription_ok",
            "grace_period": False,
            "plan_code": normalize_plan_code(subscription.get("plan_code")),
            "features": {
                feature: True
                for feature in sorted(get_plan_features(subscription.get("plan_code")))
            },
        }

    if normalized_status in GRACE_STATUSES:
        return {
            "has_access": True,
            "status": normalized_status,
            "reason": "payment_grace_period",
            "grace_period": True,
            "plan_code": normalize_plan_code(subscription.get("plan_code")),
            "features": {
                feature: True
                for feature in sorted(get_plan_features(subscription.get("plan_code")))
            },
        }

    return {
        "has_access": False,
        "status": normalized_status or "inactive",
        "reason": "subscription_not_active",
        "grace_period": False,
        "plan_code": normalize_plan_code((subscription or {}).get("plan_code")),
        "features": {},
    }
