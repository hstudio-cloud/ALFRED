from typing import Any, Dict, List

from .types import NanoAction, NanoActionResult


class NanoFinanceEngine:
    """Financial execution boundary for Nano.

    LLMs or parsers may suggest actions, but only this engine should validate,
    normalize, and eventually execute finance-facing operations.
    """

    def validate_actions(self, actions: List[NanoAction]) -> List[NanoAction]:
        validated: List[NanoAction] = []
        for action in actions:
            normalized = NanoAction(
                type=action.type,
                data=dict(action.data),
                assumptions=list(action.assumptions),
                confidence=action.confidence,
            )
            validated.append(normalized)
        return validated

    def summarize_actions(self, actions: List[NanoAction]) -> str:
        if not actions:
            return "Nenhuma acao estruturada detectada."
        return "\n".join(f"- {action.type}: {action.data}" for action in actions)

    def fallback_reply(self, actions: List[NanoAction]) -> str:
        if not actions:
            return (
                "Entendi. Posso registrar uma movimentacao, criar uma conta, "
                "montar um lembrete ou analisar seus gastos."
            )

        fallback_map = {
            "create_transaction": "Perfeito. Vou registrar essa movimentacao agora.",
            "create_bill": "Perfeito. Vou criar essa conta e deixar o vencimento organizado.",
            "create_reminder": "Perfeito. Vou deixar esse lembrete preparado.",
            "analyze_spending": "Perfeito. Vou analisar seus gastos e resumir os pontos principais.",
            "create_task": "Perfeito. Vou transformar isso em uma tarefa.",
            "create_habit": "Perfeito. Vou registrar isso como habito.",
        }
        return fallback_map.get(actions[0].type, "Perfeito. Vou cuidar disso agora.")

    def preview_results(self, actions: List[NanoAction]) -> List[NanoActionResult]:
        """Temporary preview mode.

        Until all routes move here, this provides a predictable contract for UI
        and service-layer integration tests.
        """

        return [
            NanoActionResult(
                type=action.type,
                ok=True,
                message=f"Aguardando execucao real para {action.type}.",
                payload=dict(action.data),
            )
            for action in actions
        ]
