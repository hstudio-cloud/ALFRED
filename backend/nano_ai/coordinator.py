from typing import Any, Dict, List, Optional

from .brain import NanoBrain
from .gateway import NanoGateway
from .model_provider import resolve_model_provider
from .specialists import (
    FinanceOperationsSpecialist,
    InsightSpecialist,
    ProductivitySpecialist,
    ReminderSpecialist,
)
from .types import NanoAction


class NanoCoordinator:
    """Coordinates domain specialists and optional model generation."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or ""
        self.model_provider = resolve_model_provider(api_key=self.api_key)
        self.gateway = NanoGateway()
        self.brain = NanoBrain(
            finance_engine=self.gateway.finance_engine,
            memory_manager=self.gateway.memory_manager,
        )
        self.system_message = """Voce e Nano, um assistente de gestao financeira claro, confiavel e proativo.

Como o Nano deve soar:
- fale em portugues do Brasil
- use frases curtas, naturais e profissionais
- confirme rapidamente o que entendeu
- evite linguagem tecnica desnecessaria
- fale como um assistente financeiro premium, nao como um log de sistema

O que o Nano faz:
- registrar receitas e despesas
- criar contas a pagar e a receber
- criar lembretes financeiros
- identificar categoria, metodo de pagamento e escopo pessoal ou empresa
- analisar gastos, riscos e oportunidades de economia

Regras de entendimento:
- trate erros pequenos de transcricao como normais
- prefira a interpretacao financeira mais provavel
- quando a frase estiver vaga, assuma o minimo necessario e deixe isso claro
- se faltar um dado realmente importante, peca so esse dado
- sempre que fizer sentido, diferencie conta pessoal e conta da empresa

Regras de resposta:
- destaque primeiro o que foi entendido
- depois diga o que foi feito ou o que falta
- se houver classificacao automatica, mencione isso de forma leve
- quando detectar contexto de vencimento, sugira lembrete
- quando detectar gasto recorrente, sugira recorrencia
- nunca invente fatos, valores ou historicos"""
        self.specialists = [
            FinanceOperationsSpecialist(),
            ReminderSpecialist(),
            InsightSpecialist(),
            ProductivitySpecialist(),
        ]

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        memory_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        actions, specialists_used = self._collect_actions(message)
        response = await self._generate_response(
            user_id=user_id,
            message=message,
            actions=actions,
            specialists_used=specialists_used,
            conversation_history=conversation_history or [],
            memory_profile=memory_profile or {},
        )
        return {
            "response": response,
            "actions": [self._action_to_dict(action) for action in actions],
            "specialists_used": specialists_used,
        }

    def _collect_actions(self, message: str) -> tuple[List[NanoAction], List[str]]:
        actions: List[NanoAction] = []
        specialists_used: List[str] = []

        for specialist in self.specialists:
            specialist_actions = specialist.detect(message)
            if specialist_actions:
                specialists_used.append(specialist.name)
                actions.extend(specialist_actions)

        validated = self.gateway.finance_engine.validate_actions(actions)
        return validated, specialists_used

    async def _generate_response(
        self,
        user_id: str,
        message: str,
        actions: List[NanoAction],
        specialists_used: List[str],
        conversation_history: List[Dict[str, str]],
        memory_profile: Dict[str, Any],
    ) -> str:
        fallback_response = self.gateway.finance_engine.fallback_reply(actions)
        if self.model_provider is None:
            return fallback_response

        context = self.brain.build_prompt_context(
            message=message,
            actions=actions,
            conversation_history=conversation_history,
            memory_profile=memory_profile,
        )

        try:
            generated = await self.model_provider.generate_reply(
                user_id=user_id,
                system_message=self.system_message,
                prompt_context=context,
                specialists_used=specialists_used,
                actions=actions,
            )
            return generated or fallback_response
        except Exception:
            return fallback_response

    def _action_to_dict(self, action: NanoAction) -> Dict[str, Any]:
        data = dict(action.data)
        if action.assumptions and "assumptions" not in data:
            data["assumptions"] = list(action.assumptions)
        return {
            "type": action.type,
            "data": data,
            "confidence": action.confidence,
            "specialist": self._resolve_specialist_for_action(action.type),
        }

    def _resolve_specialist_for_action(self, action_type: str) -> str:
        mapping = {
            "create_transaction": "finance_operations",
            "create_bill": "finance_operations",
            "create_reminder": "reminders",
            "analyze_spending": "insights",
            "create_task": "productivity",
            "create_habit": "productivity",
        }
        return mapping.get(action_type, "coordinator")
