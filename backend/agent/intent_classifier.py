import re
import unicodedata
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
        "agende",
        "agendar reuniao",
        "marque uma reuniao",
        "compr",
        "comprei",
        "paguei",
        "recebi",
        "ganhei",
        "criar conta",
        "criar lembrete",
        "agendar",
        "tenho uma reuniao",
        "tenho reuniao",
        "tenho compromisso",
        "marcar reuniao",
        "agendar reuniao",
        "cadastrar funcionario",
        "registrar ponto",
        "abra",
        "abre",
        "abrir",
        "ir para",
        "navegar",
    )
    _QUERY_HINTS = (
        "quanto gastei",
        "saldo",
        "tem algo para minha agenda",
        "agenda hoje",
        "agenda de hoje",
        "o que temos pra hoje",
        "o que temos para hoje",
        "o que tem pra hoje",
        "o que tem para hoje",
        "bom dia nano",
        "contas abertas",
        "gastos do mes",
        "me mostre",
        "qual",
        "quais",
        "quanto tenho no total",
        "quanto entrou esta semana",
        "contas conectadas",
        "maiores despesas",
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
    _WEB_HINTS = (
        "pesquisar",
        "procura na internet",
        "web",
        "noticia",
        "noticia de hoje",
        "preco do",
        "restaurantes em",
        "cotacao",
        "tempo em",
    )
    _KNOWLEDGE_HINTS = (
        "como funciona o nano",
        "o que o nano faz",
        "manual do nano",
        "documentacao do nano",
        "como usar o nano",
    )
    _MEMORY_HINTS = ("lembra", "lembrar", "ultima vez", "que eu pedi")

    def classify(self, message: str, context: Dict[str, Any]) -> IntentClassification:
        raw_text = (message or "").strip()
        text = self._normalize_text(raw_text)
        entities = self._extract_entities(text)

        if not text:
            return IntentClassification(
                label="followup_missing_data",
                confidence=0.99,
                entities=entities,
                missing_fields=["message"],
                needs_context=False,
                requires_tool=False,
                suggested_tool=None,
            )

        if any(h in text for h in self._WEB_HINTS):
            return IntentClassification(
                label="web_research",
                confidence=0.85,
                entities=entities,
                requires_tool=True,
                suggested_tool="search_web",
            )

        if any(h in text for h in self._KNOWLEDGE_HINTS):
            return IntentClassification(
                label="knowledge_lookup",
                confidence=0.82,
                entities=entities,
                requires_tool=True,
                suggested_tool="search_internal_knowledge",
            )

        # Frases naturais de agenda devem virar acao real (nao chat generico).
        if any(token in text for token in ("tenho", "marque", "agenda", "compromisso", "reuniao")) and (
            re.search(r"\bhoje\b|\bamanha\b|\b\d{1,2}[:h]\d{0,2}\b|\bas\b\s*\d{1,2}\b", text)
            or "reuniao" in text
        ):
            return IntentClassification(
                label="system_action",
                confidence=0.9,
                entities=entities,
                requires_tool=True,
                suggested_tool="create_reminder",
            )

        # Navigation commands like "abra bancos" should be actions even if no other hint matched.
        if entities.get("section") and re.search(r"\b(abra|abre|abrir|ir para|navegar)\b", text):
            return IntentClassification(
                label="system_action",
                confidence=0.93,
                entities=entities,
                requires_tool=True,
                suggested_tool="navigate_to_section",
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
                suggested_tool="create_transaction" if "despesa" in text or "receita" in text else "create_reminder",
            )

        if any(h in text for h in self._ANALYSIS_HINTS):
            return IntentClassification(
                label="financial_analysis",
                confidence=0.82,
                entities=entities,
                requires_tool=True,
                suggested_tool="get_cashflow",
            )

        if any(h in text for h in self._QUERY_HINTS):
            return IntentClassification(
                label="system_query",
                confidence=0.78,
                entities=entities,
                requires_tool=True,
                suggested_tool="get_month_expenses",
            )

        if any(h in text for h in self._MEMORY_HINTS):
            return IntentClassification(
                label="memory_recall",
                confidence=0.73,
                entities=entities,
                requires_tool=True,
                suggested_tool="recall_memory",
            )

        if len(text.split()) <= 2:
            return IntentClassification(
                label="unknown",
                confidence=0.45,
                entities=entities,
                requires_tool=False,
                suggested_tool=None,
            )

        _ = context
        return IntentClassification(
            label="general_chat",
            confidence=0.7,
            entities=entities,
            requires_tool=False,
            suggested_tool=None,
        )

    def _extract_entities(self, text: str) -> Dict[str, Any]:
        amount = None
        amount_patterns = [
            r"(?:r\$\s*)?(\d+[.,]?\d{0,2})\s*(?:reais|real|r\$)\b",
            r"\b(?:despesa|receita|pix|paguei|comprei|ganhei|recebi|gastei)\b[^\d]{0,20}(\d+[.,]?\d{0,2})\b(?!\s*h)",
        ]
        for pattern in amount_patterns:
            amount_match = re.search(pattern, text)
            if not amount_match:
                continue
            raw = amount_match.group(1).replace(".", "").replace(",", ".")
            try:
                amount = float(raw)
                break
            except ValueError:
                amount = None

        category = None
        category_match = re.search(
            r"(em|de)\s+(alimentacao|combustivel|moradia|saude|lazer|educacao|transporte|geral)",
            text,
        )
        if category_match:
            category = category_match.group(2).capitalize()
        elif "mercado" in text:
            category = "Alimentacao"

        scope = "business" if any(t in text for t in ("empresa", "negocio")) else "personal"
        if "geral" in text:
            scope = "general"

        section_map = {
            "dashboard": "overview",
            "visao geral": "overview",
            "painel": "overview",
            "movimentacoes": "transactions",
            "movimentacao": "transactions",
            "transacoes": "transactions",
            "transacao": "transactions",
            "bancos": "banks",
            "banco": "banks",
            "contas": "banks",
            "conta": "banks",
            "cartoes": "cards",
            "cartao": "cards",
            "contatos": "contacts",
            "contato": "contacts",
            "relatorios": "reports",
            "relatorio": "reports",
            "empresa": "company",
            "perfil": "profile",
            "configuracoes": "settings",
            "configuracao": "settings",
            "funcionarios": "employees",
            "funcionario": "employees",
            "clientes": "clients",
            "cliente": "clients",
            "tarefas": "tasks",
            "tarefa": "tasks",
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
            "compare_with_balance": any(
                token in text
                for token in (
                    "comparar com meu saldo",
                    "comparar com o saldo",
                    "cabe no meu saldo",
                )
            ),
            "period": "month" if any(token in text for token in ("mes", "meses")) else None,
        }

    @staticmethod
    def _normalize_text(text: str) -> str:
        base = unicodedata.normalize("NFKD", text or "")
        without_accents = "".join(ch for ch in base if not unicodedata.combining(ch))
        return without_accents.lower().strip()
