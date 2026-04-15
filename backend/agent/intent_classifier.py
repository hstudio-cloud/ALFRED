import re
import unicodedata
from typing import Any, Dict

from .types import IntentClassification


class IntentClassifier:
    """Rule-first intent classifier with deterministic fallbacks."""

    _ACTION_HINTS = (
        "criar categoria",
        "crie uma categoria",
        "crie categoria",
        "nova categoria",
        "categoria chamada",
        "categoria com o nome",
        "adicionar categoria",
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
        "alguma sugestao",
        "alguma recomendacao",
        "o que voce recomenda",
        "o que me recomenda",
        "me da uma sugestao",
        "me de uma sugestao",
        "como melhorar",
        "como posso melhorar",
    )
    _ANALYSIS_HINTS = (
        "analise",
        "analisar",
        "comparar",
        "projecao",
        "previsao",
        "fluxo de caixa",
        "por categoria",
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
        "quem e",
        "quem foi",
        "o que e",
        "explique",
        "me fale sobre",
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

        if entities.get("create_category_name"):
            return IntentClassification(
                label="system_action",
                confidence=0.94,
                entities=entities,
                requires_tool=True,
                suggested_tool="create_category",
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

        # Comandos financeiros em linguagem natural como
        # "preciso que voce gere uma despesa de 500 em alimentacao"
        # devem virar acao mesmo sem bater exatamente nos gatilhos acima.
        if (
            any(token in text for token in ("despesa", "receita", "gasto", "gastei", "paguei", "recebi", "ganhei"))
            and entities.get("amount") is not None
        ):
            missing = []
            if ("despesa" in text or "receita" in text) and not entities.get("category"):
                missing.append("category")
            return IntentClassification(
                label="followup_missing_data" if missing else "system_action",
                confidence=0.9 if not missing else 0.92,
                entities=entities,
                requires_tool=True,
                missing_fields=missing,
                suggested_tool="create_transaction",
            )

        if any(h in text for h in self._ANALYSIS_HINTS):
            return IntentClassification(
                label="financial_analysis",
                confidence=0.82,
                entities=entities,
                requires_tool=True,
                suggested_tool="get_cashflow",
            )

        if any(h in text for h in ("sugestao", "sugestoes", "recomendacao", "recomendacoes")):
            return IntentClassification(
                label="financial_analysis",
                confidence=0.8,
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
            r"(?:r\$\s*)?(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\s*(?:reais|real|r\$)\b",
            r"\b(?:despesa|receita|pix|paguei|comprei|ganhei|recebi|gastei|adiciona|adicione|registrar|registre|lancar|lance)\b[^\d]{0,24}(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?)\b(?!\s*h)",
        ]
        for pattern in amount_patterns:
            amount_match = re.search(pattern, text)
            if not amount_match:
                continue
            raw = amount_match.group(1)
            try:
                amount = self._parse_amount(raw)
                break
            except ValueError:
                amount = None

        create_category_name = self._extract_category_creation_name(text)

        category = None
        category_match = re.search(
            r"(em|de)\s+(alimentacao|combustivel|moradia|saude|lazer|educacao|transporte|geral)",
            text,
        )
        if category_match:
            category = category_match.group(2).capitalize()
        elif "mercado" in text:
            category = "Alimentacao"
        else:
            free_category_match = re.search(
                r"\b(?:em|na|no)\s+([a-z][a-z\s]{2,40}?)(?=\s+(?:de\b|do\b|da\b|com\b|para\b|hoje\b|amanha\b|ontem\b|no financeiro\b|na conta\b)|$)",
                text,
            )
            if free_category_match:
                category = self._beautify_label(free_category_match.group(1))

        if create_category_name and any(
            token in text
            for token in ("despesa", "receita", "gasto", "gastei", "paguei", "recebi", "ganhei", "adiciona", "registre")
        ):
            category = create_category_name

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
            "create_category_name": create_category_name,
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
    def _parse_amount(raw: str) -> float:
        text = str(raw or "").strip()
        if not text:
            raise ValueError("empty amount")

        last_dot = text.rfind(".")
        last_comma = text.rfind(",")
        normalized = text

        if last_dot >= 0 and last_comma >= 0:
            normalized = text.replace(",", "") if last_dot > last_comma else text.replace(".", "").replace(",", ".")
        elif last_comma >= 0:
            decimals = len(text) - last_comma - 1
            normalized = text.replace(",", "") if decimals == 3 else text.replace(".", "").replace(",", ".")
        elif last_dot >= 0:
            dot_count = text.count(".")
            decimals = len(text) - last_dot - 1
            if dot_count > 1:
                normalized = text[:last_dot].replace(".", "") + "." + text[last_dot + 1 :]
            elif decimals == 3:
                normalized = text.replace(".", "")

        return float(normalized)

    def _extract_category_creation_name(self, text: str) -> str | None:
        patterns = [
            r"\b(?:criar|crie|adicionar|adicione)\s+(?:uma\s+)?(?:nova\s+)?categoria(?:\s+chamada|\s+com\s+o\s+nome)?\s+([a-z0-9][a-z0-9\s]{1,50}?)(?=\s+(?:e\s+(?:adicion|registr|lanc|gere)|com\s+r\$|de\s+r\$|r\$)|$)",
            r"\bcategoria\s+chamada\s+([a-z0-9][a-z0-9\s]{1,50}?)(?=\s+(?:e\s+(?:adicion|registr|lanc|gere)|com\s+r\$|de\s+r\$|r\$)|$)",
        ]
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return self._beautify_label(match.group(1))
        return None

    @staticmethod
    def _beautify_label(value: str | None) -> str | None:
        text = " ".join((value or "").split()).strip()
        if not text:
            return None
        return " ".join(part.capitalize() for part in text.split())

    @staticmethod
    def _normalize_text(text: str) -> str:
        base = unicodedata.normalize("NFKD", text or "")
        without_accents = "".join(ch for ch in base if not unicodedata.combining(ch))
        return without_accents.lower().strip()
