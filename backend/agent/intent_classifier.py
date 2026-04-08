import re
from typing import Any, Dict

from .types import IntentClassification


class IntentClassifier:
    """Rule-first intent classifier with deterministic fallbacks."""

    _ACTION_HINTS = (
        "criar despesa",
        "crie uma despesa",
        "registrar despesa",
        "registrar receita",
        "criar receita",
        "registrar pix",
        "criar conta",
        "criar lembrete",
        "agendar",
        "cadastrar funcionario",
        "registrar ponto",
        "abrir",
        "ir para",
        "navegar",
    )
    _QUERY_HINTS = (
        "quanto gastei",
        "saldo",
        "tem algo para minha agenda",
        "agenda hoje",
        "contas abertas",
        "gastos do mes",
        "me mostre",
        "qual",
        "quais",
    )
    _ANALYSIS_HINTS = (
        "analise",
        "analisar",
        "comparar",
        "projecao",
        "previsao",
        "fluxo de caixa",
        "categoria",
        "lucro",
        "faturamento",
    )
    _WEB_HINTS = ("pesquisar", "procura na internet", "web", "noticia", "preco do")
    _MEMORY_HINTS = ("lembra", "lembrar", "ultima vez", "que eu pedi")

    def classify(self, message: str, context: Dict[str, Any]) -> IntentClassification:
        text = (message or "").strip().lower()
        entities = self._extract_entities(text)

        if not text:
            return IntentClassification(
                label="followup_missing_data",
                confidence=0.99,
                entities=entities,
                missing_fields=["message"],
                needs_context=False,
                requires_tool=False,
            )

        if any(h in text for h in self._WEB_HINTS):
            return IntentClassification(
                label="web_research",
                confidence=0.85,
                entities=entities,
                requires_tool=True,
            )

        if any(h in text for h in self._ACTION_HINTS):
            missing = []
            if "despesa" in text or "receita" in text:
                if entities.get("amount") is None:
                    missing.append("amount")
                if not entities.get("category"):
                    missing.append("category")
            return IntentClassification(
                label="followup_missing_data" if missing else "system_action",
                confidence=0.88 if not missing else 0.91,
                entities=entities,
                requires_tool=True,
                missing_fields=missing,
            )

        if any(h in text for h in self._ANALYSIS_HINTS):
            return IntentClassification(
                label="financial_analysis",
                confidence=0.82,
                entities=entities,
                requires_tool=True,
            )

        if any(h in text for h in self._QUERY_HINTS):
            return IntentClassification(
                label="system_query",
                confidence=0.78,
                entities=entities,
                requires_tool=True,
            )

        if any(h in text for h in self._MEMORY_HINTS):
            return IntentClassification(
                label="memory_recall",
                confidence=0.73,
                entities=entities,
                requires_tool=True,
            )

        if len(text.split()) <= 2:
            return IntentClassification(
                label="unknown",
                confidence=0.45,
                entities=entities,
                requires_tool=False,
            )

        _ = context
        return IntentClassification(
            label="general_chat",
            confidence=0.7,
            entities=entities,
            requires_tool=False,
        )

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        amount = None
        amount_match = re.search(r"(\d+[.,]?\d*)\s*(reais|real|r\$)?", text)
        if amount_match:
            raw = amount_match.group(1).replace(".", "").replace(",", ".")
            try:
                amount = float(raw)
            except ValueError:
                amount = None

        category = None
        category_match = re.search(
            r"(em|de)\s+(alimentacao|combustivel|moradia|saude|lazer|educacao|transporte|geral)",
            text,
        )
        if category_match:
            category = category_match.group(2).capitalize()

        scope = "business" if any(t in text for t in ("empresa", "negocio")) else "personal"
        if "geral" in text:
            scope = "general"

        section_map = {
            "dashboard": "overview",
            "visao geral": "overview",
            "movimentacoes": "transactions",
            "bancos": "banks",
            "contas": "banks",
            "cartoes": "cards",
            "contatos": "contacts",
            "relatorios": "reports",
            "empresa": "company",
            "perfil": "profile",
            "configuracoes": "settings",
            "funcionarios": "employees",
            "clientes": "clients",
            "tarefas": "tasks",
            "assistente": "assistant",
            "chat": "assistant",
        }
        section = None
        for key, value in section_map.items():
            if key in text:
                section = value
                break

        return {
            "amount": amount,
            "category": category,
            "scope": scope,
            "section": section,
            "compare_with_balance": any(token in text for token in ("comparar com meu saldo", "comparar com o saldo", "cabe no meu saldo")),
            "period": "month" if any(token in text for token in ("mes", "mês")) else None,
        }
        if entities.get("section"):
            return IntentClassification(
                label="system_action",
                confidence=0.9,
                entities=entities,
                requires_tool=True,
            )
