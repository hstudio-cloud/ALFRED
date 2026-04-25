from __future__ import annotations

from typing import Any, Dict, List


LOW_RISK_TYPES = {
    "create_transaction",
    "create_reminder",
    "check_agenda",
    "generate_payroll_report",
    "analyze_spending",
}

MEDIUM_RISK_TYPES = {
    "create_bill",
    "create_category",
    "register_attendance",
    "create_employee",
    "filter_report",
}

HIGH_RISK_TYPES = {
    "delete_transaction",
    "delete_bill",
    "delete_reminder",
    "delete_category",
    "cancel_plan",
    "start_payment",
    "send_charge",
}

HIGH_RISK_KEYWORDS = {
    "delete",
    "remove",
    "cancel",
    "charge",
    "payment",
    "cobranca",
    "cobrança",
    "plano",
    "billing",
    "sensitive",
}


def classify_action_risk(action: Dict[str, Any]) -> str:
    action_type = str(action.get("type") or "").strip().lower()
    message = str(action.get("message") or "").strip().lower()
    data = action.get("data") if isinstance(action.get("data"), dict) else {}
    data_blob = " ".join(str(value).lower() for value in data.values())

    if action_type in HIGH_RISK_TYPES:
        return "high_risk"
    if action_type in LOW_RISK_TYPES:
        return "low_risk"
    if action_type in MEDIUM_RISK_TYPES:
        return "medium_risk"
    if any(keyword in f"{action_type} {message} {data_blob}" for keyword in HIGH_RISK_KEYWORDS):
        return "high_risk"
    return "medium_risk"


def evaluate_execution_policy(
    actions: List[Dict[str, Any]],
    *,
    intent_confidence: float = 0.0,
    user_message: str = "",
) -> Dict[str, Any]:
    normalized_message = str(user_message or "").strip().lower()
    if any(
        keyword in normalized_message
        for keyword in [
            "apaga",
            "apagar",
            "delete",
            "excluir",
            "cancelar plano",
            "cancela plano",
            "iniciar pagamento",
            "cobrança",
            "cobranca",
            "enviar cobrança",
            "enviar cobranca",
            "alterar dados sensíveis",
            "alterar dados sensiveis",
        ]
    ):
        return {
            "risk_level": "high_risk",
            "requires_confirmation": True,
            "reason": "Pedido sensivel detectado. Preciso de confirmacao explicita antes de executar.",
        }

    if not actions:
        return {
            "risk_level": "low_risk",
            "requires_confirmation": False,
            "reason": None,
        }

    risk_levels = [classify_action_risk(action) for action in actions]
    if "high_risk" in risk_levels:
        return {
            "risk_level": "high_risk",
            "requires_confirmation": True,
            "reason": "Acao sensivel detectada. Preciso de confirmacao explicita antes de executar.",
        }

    if "medium_risk" in risk_levels:
        requires_confirmation = intent_confidence < 0.75
        return {
            "risk_level": "medium_risk",
            "requires_confirmation": requires_confirmation,
            "reason": (
                "Acao operacional com ambiguidade. Preciso confirmar antes de executar."
                if requires_confirmation
                else None
            ),
        }

    return {
        "risk_level": "low_risk",
        "requires_confirmation": False,
        "reason": None,
    }
