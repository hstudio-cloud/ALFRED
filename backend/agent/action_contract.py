from __future__ import annotations

from copy import deepcopy
from typing import Any, Dict, List

from .action_schemas import validate_actions

_CANONICAL_TYPES = {
    "navigate",
    "create_transaction",
    "create_bill",
    "create_reminder",
    "filter_report",
    "analyze_spending",
    "check_agenda",
    "create_employee",
    "register_attendance",
    "generate_payroll_report",
}

_SECTION_ROUTE_MAP = {
    "assistant": "/dashboard",
    "overview": "/dashboard",
    "transactions": "/dashboard",
    "accounts": "/dashboard",
    "banks": "/dashboard",
    "cards": "/dashboard",
    "contacts": "/dashboard",
    "reports": "/dashboard",
    "company": "/dashboard",
    "profile": "/dashboard",
    "settings": "/dashboard",
    "employees": "/dashboard",
    "clients": "/clients",
    "tasks": "/tasks",
}


def normalize_declared_actions(actions: List[Dict[str, Any]] | None) -> List[Dict[str, Any]]:
    normalized = [_normalize_action(action, source="declared") for action in (actions or [])]
    return validate_actions(normalized)


def normalize_executed_actions(actions: List[Dict[str, Any]] | None) -> List[Dict[str, Any]]:
    normalized = [_normalize_action(action, source="executed") for action in (actions or [])]
    return validate_actions(normalized)


def _normalize_action(action: Dict[str, Any], source: str) -> Dict[str, Any]:
    payload = deepcopy(action or {})
    action_type = (payload.get("type") or "unknown").strip()
    data = deepcopy(payload.get("data") or {})

    if action_type not in _CANONICAL_TYPES:
        action_type = action_type or "unknown"

    if action_type == "navigate":
        data = _normalize_navigation_data(data)
    elif action_type == "create_transaction":
        data.setdefault("entity", "transaction")
    elif action_type == "create_bill":
        data.setdefault("entity", "bill")
    elif action_type == "create_reminder":
        data.setdefault("entity", "reminder")
    elif action_type == "analyze_spending":
        data.setdefault("analysis", "spending")
    elif action_type == "generate_payroll_report":
        data.setdefault("analysis", "payroll")

    status = payload.get("status") or ("declared" if source == "declared" else "executed")
    normalized = {
        "type": action_type,
        "status": status,
        "message": payload.get("message"),
        "data": data,
        "confidence": payload.get("confidence"),
        "source": source,
        "meta": payload.get("meta") or {},
    }
    if payload.get("assumptions"):
        normalized["assumptions"] = payload.get("assumptions")
    return normalized


def _normalize_navigation_data(data: Dict[str, Any]) -> Dict[str, Any]:
    section = (data.get("section") or "").strip().lower()
    label = data.get("label") or section or "navegacao"
    route = data.get("route")

    if not route:
        route = _SECTION_ROUTE_MAP.get(section, "/dashboard")

    if section == "accounts":
        # Frontend today uses "banks" section name.
        section = "banks"

    return {
        **data,
        "section": section or "overview",
        "label": label,
        "route": route,
    }
