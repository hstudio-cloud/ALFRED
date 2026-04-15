from __future__ import annotations

from typing import Any, Dict, List


_REQUIRED_FIELDS_BY_ACTION = {
    "navigate": ["section", "route"],
    "create_category": ["name"],
    "create_transaction": ["type", "amount", "category"],
    "create_bill": ["title", "amount", "due_date", "type"],
    "create_reminder": ["title", "remind_at"],
    "filter_report": ["period"],
}


def validate_action_payload(action: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and enrich action payload with schema metadata.

    This is intentionally non-throwing to preserve backward compatibility.
    """
    action_type = (action.get("type") or "").strip()
    data = action.get("data") or {}
    required = _REQUIRED_FIELDS_BY_ACTION.get(action_type, [])
    missing_fields: List[str] = [field for field in required if data.get(field) in (None, "", [])]

    action["schema"] = {
        "required_fields": required,
        "missing_fields": missing_fields,
        "valid": len(missing_fields) == 0,
    }

    if missing_fields and action.get("status") == "executed":
        action["status"] = "needs_input"
        action["message"] = action.get("message") or f"Faltam dados para concluir: {', '.join(missing_fields)}."
    return action


def validate_actions(actions: List[Dict[str, Any]] | None) -> List[Dict[str, Any]]:
    return [validate_action_payload(dict(action or {})) for action in (actions or [])]
