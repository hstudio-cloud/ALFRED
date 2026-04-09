import re
from datetime import datetime
from typing import Any, Dict, List

from tools.orchestrator_tools import (
    create_reminder,
    create_transaction,
    get_cashflow,
    search_internal_knowledge,
    search_web,
)
from tools.finance_tools import get_month_expenses
from tools.reminder_tools import get_agenda_today
from services.llm_service import LLMService


class NanoOrchestratorService:
    """Tool-first orchestration layer for Nano assistant."""

    def __init__(self):
        self.llm = LLMService()

    def classify_intent(self, message: str) -> str:
        text = (message or "").strip().lower()
        if not text:
            return "general_chat"

        if any(token in text for token in ("pesquise", "pesquisar", "procura na internet", "noticia", "preco")):
            return "web_research"
        if any(token in text for token in ("como funciona", "o que o nano", "manual", "documentacao", "sobre o nano")):
            return "knowledge_lookup"
        if any(token in text for token in ("criar", "registre", "registrar", "agende", "lembrete")):
            return "system_action"
        if any(
            token in text
            for token in (
                "quanto",
                "saldo",
                "gastos",
                "fluxo de caixa",
                "despesas do mes",
                "agenda hoje",
                "tem algo para minha agenda",
                "o que temos pra hoje",
                "o que temos para hoje",
                "lembretes de hoje",
            )
        ):
            return "system_query"
        return "general_chat"

    async def orchestrate(
        self,
        *,
        message: str,
        user: Dict[str, Any],
        workspace: Dict[str, Any],
    ) -> Dict[str, Any]:
        intent = self.classify_intent(message)
        tool_specs = self._tool_specs_for_intent(intent)
        requires_tool = intent in {"system_action", "system_query", "web_research", "knowledge_lookup"}
        selected_tools = await self.llm.select_tools(
            message=message,
            intent=intent,
            tools=tool_specs,
        )

        if not selected_tools:
            selected_tools = self._heuristic_tool_selection(message=message, intent=intent)
        # Critical rule: if action/query/research intent, never answer without at least one tool.
        if requires_tool and not selected_tools:
            selected_tools = self._force_default_tool_selection(intent=intent, message=message)

        tool_results: Dict[str, Any] = {}
        used_tools: List[str] = []
        tool_plan: List[Dict[str, Any]] = [
            {"tool": item.get("name"), "input": item.get("arguments") or {}}
            for item in selected_tools
            if item.get("name")
        ]
        followup_needed = False
        missing_fields: List[str] = []

        for item in selected_tools:
            tool_name = item.get("name")
            tool_args = item.get("arguments") or {}
            result = await self._execute_tool(
                tool_name=tool_name,
                tool_args=tool_args,
                message=message,
                user=user,
                workspace=workspace,
            )
            if result is None:
                continue
            used_tools.append(tool_name)
            tool_results[tool_name] = result
            if isinstance(result, dict) and result.get("error") == "missing_amount":
                followup_needed = True
                missing_fields.append("amount")
            if isinstance(result, dict) and result.get("error") == "missing_reminder_datetime":
                followup_needed = True
                missing_fields.append("remind_at")

        if followup_needed:
            reply = await self.llm.ask_for_missing_data(message, missing_fields or ["dados"])
        elif requires_tool:
            reply = self._build_tool_grounded_reply(intent=intent, tool_results=tool_results)
        else:
            reply = await self.llm.respond_with_tool_results(
                message=message,
                intent=intent,
                tool_results=tool_results,
            )
        if requires_tool and not tool_results:
            reply = (
                "Entendi seu pedido, mas nao consegui executar nenhuma acao agora. "
                "Pode repetir com mais contexto para eu concluir corretamente?"
            )

        return {
            "intent": intent,
            "used_tools": used_tools,
            "tool_plan": tool_plan,
            "tool_results": tool_results,
            "message": reply,
            "followup_needed": followup_needed,
        }

    def _tool_specs_for_intent(self, intent: str) -> List[Dict[str, Any]]:
        common = []
        if intent == "system_action":
            return [
                {
                    "type": "function",
                    "function": {
                        "name": "create_transaction",
                        "description": "Cria uma movimentacao financeira no sistema Nano.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "amount": {"type": "number"},
                                "category": {"type": "string"},
                                "transaction_type": {"type": "string"},
                                "description": {"type": "string"},
                                "payment_method": {"type": "string"},
                                "account_scope": {"type": "string"},
                            },
                            "required": ["amount", "category"],
                        },
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "create_reminder",
                        "description": "Cria um lembrete no Nano.",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "remind_at": {"type": "string"},
                                "description": {"type": "string"},
                            },
                            "required": ["title", "remind_at"],
                        },
                    },
                },
            ]
        if intent == "system_query":
            return [
                {
                    "type": "function",
                    "function": {
                        "name": "get_month_expenses",
                        "description": "Retorna total de despesas do mes atual.",
                        "parameters": {"type": "object", "properties": {"account_scope": {"type": "string"}}},
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_cashflow",
                        "description": "Retorna fluxo de caixa com previsao 30/60/90 dias.",
                        "parameters": {"type": "object", "properties": {"account_scope": {"type": "string"}}},
                    },
                },
                {
                    "type": "function",
                    "function": {
                        "name": "get_agenda_today",
                        "description": "Retorna os lembretes e compromissos do usuario para hoje.",
                        "parameters": {"type": "object", "properties": {}},
                    },
                },
            ]
        if intent == "web_research":
            return [
                {
                    "type": "function",
                    "function": {
                        "name": "search_web",
                        "description": "Pesquisa na web e retorna resultados relevantes.",
                        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
                    },
                }
            ]
        if intent == "knowledge_lookup":
            return [
                {
                    "type": "function",
                    "function": {
                        "name": "search_internal_knowledge",
                        "description": "Busca conhecimento interno do Nano (file_search interno).",
                        "parameters": {"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
                    },
                }
            ]
        return common

    def _heuristic_tool_selection(self, *, message: str, intent: str) -> List[Dict[str, Any]]:
        text = (message or "").lower()
        if intent == "system_action":
            if "lembrete" in text or "agenda" in text or "agendar" in text:
                return [{"name": "create_reminder", "arguments": self._extract_reminder_args(text)}]
            return [{"name": "create_transaction", "arguments": self._extract_transaction_args(text)}]
        if intent == "system_query":
            if "agenda" in text or "hoje" in text or "lembrete" in text:
                return [{"name": "get_agenda_today", "arguments": {}}]
            if "fluxo" in text or "caixa" in text or "previs" in text:
                return [{"name": "get_cashflow", "arguments": {}}]
            return [{"name": "get_month_expenses", "arguments": {}}]
        if intent == "web_research":
            return [{"name": "search_web", "arguments": {"query": message}}]
        if intent == "knowledge_lookup":
            return [{"name": "search_internal_knowledge", "arguments": {"query": message}}]
        return []

    def _force_default_tool_selection(self, *, intent: str, message: str) -> List[Dict[str, Any]]:
        if intent == "web_research":
            return [{"name": "search_web", "arguments": {"query": message}}]
        if intent == "knowledge_lookup":
            return [{"name": "search_internal_knowledge", "arguments": {"query": message}}]
        if intent == "system_query":
            if any(token in (message or "").lower() for token in ("agenda", "hoje", "lembrete")):
                return [{"name": "get_agenda_today", "arguments": {}}]
            return [{"name": "get_month_expenses", "arguments": {}}]
        if intent == "system_action":
            return [{"name": "create_transaction", "arguments": self._extract_transaction_args(message)}]
        return []

    async def _execute_tool(
        self,
        *,
        tool_name: str,
        tool_args: Dict[str, Any],
        message: str,
        user: Dict[str, Any],
        workspace: Dict[str, Any],
    ) -> Dict[str, Any] | None:
        workspace_id = workspace["id"]
        user_id = user["id"]

        if tool_name == "create_transaction":
            params = self._extract_transaction_args(message)
            params.update(tool_args)
            if float(params.get("amount", 0) or 0) <= 0:
                return {"error": "missing_amount"}
            return await create_transaction(
                workspace_id=workspace_id,
                user_id=user_id,
                amount=float(params.get("amount", 0)),
                category=params.get("category", "Geral"),
                transaction_type=params.get("transaction_type", "expense"),
                description=params.get("description"),
                payment_method=params.get("payment_method", "other"),
                account_scope=params.get("account_scope", "personal"),
            )

        if tool_name == "create_reminder":
            params = self._extract_reminder_args(message)
            params.update(tool_args)
            if not params.get("remind_at"):
                return {"error": "missing_reminder_datetime"}
            return await create_reminder(
                workspace_id=workspace_id,
                user_id=user_id,
                title=params.get("title", "Lembrete Nano"),
                remind_at=params.get("remind_at", ""),
                description=params.get("description"),
            )

        if tool_name == "get_month_expenses":
            return await get_month_expenses(
                workspace_id=workspace_id,
                scope=(tool_args or {}).get("account_scope"),
            )

        if tool_name == "get_cashflow":
            return await get_cashflow(
                workspace_id=workspace_id,
                account_scope=(tool_args or {}).get("account_scope"),
            )

        if tool_name == "get_agenda_today":
            return await get_agenda_today(
                workspace_id=workspace_id,
                user_id=user_id,
            )

        if tool_name == "search_web":
            query = (tool_args or {}).get("query") or message
            return await search_web(query=query)

        if tool_name == "search_internal_knowledge":
            query = (tool_args or {}).get("query") or message
            return await search_internal_knowledge(query=query)

        return None

    def _build_tool_grounded_reply(self, *, intent: str, tool_results: Dict[str, Any]) -> str:
        if intent == "web_research":
            results = tool_results.get("search_web", {}) or {}
            items = results.get("items") or []
            if not items:
                return "Pesquisei agora, mas nao encontrei resultados confiaveis. Posso refinar a busca com bairro ou tipo de local."
            top = items[:5]
            lines = ["Pesquisei agora e encontrei estes resultados reais:"]
            for idx, item in enumerate(top, start=1):
                title = item.get("title") or "Resultado"
                description = item.get("description") or item.get("snippet") or "Sem descricao."
                link = item.get("link") or item.get("url") or ""
                lines.append(f"{idx}. {title} - {description} ({link})")
            lines.append("Se quiser, eu filtro por melhor avaliacao, faixa de preco ou distancia.")
            return "\n".join(lines)

        if intent == "knowledge_lookup":
            results = tool_results.get("search_internal_knowledge", {}) or {}
            items = results.get("items") or []
            if not items:
                return "Consultei a base interna do Nano, mas nao achei essa informacao especifica. Posso te orientar com um fluxo padrao."
            lines = ["Consultei a base interna do Nano e encontrei:"]
            for idx, item in enumerate(items[:4], start=1):
                lines.append(f"{idx}. {item.get('title')}: {item.get('content')}")
            return "\n".join(lines)

        if intent == "system_query":
            if "get_agenda_today" in tool_results:
                result = tool_results["get_agenda_today"] or {}
                items = result.get("items") or []
                if not items:
                    return "Olhei sua agenda de hoje e, por enquanto, voce nao tem lembretes pendentes."
                lines = ["Verifiquei sua agenda de hoje. Voce tem:"]
                for idx, item in enumerate(items[:5], start=1):
                    remind_at = str(item.get("remind_at") or "")
                    hour = remind_at[11:16] if len(remind_at) >= 16 else "sem horario"
                    lines.append(f"{idx}. {item.get('title', 'Lembrete')} - {hour}")
                lines.append("Se quiser, eu ja posso criar ou ajustar algum desses lembretes.")
                return "\n".join(lines)
            if "get_cashflow" in tool_results:
                result = tool_results["get_cashflow"] or {}
                current = result.get("current_balance", 0)
                forecasts = result.get("forecasts") or []
                lines = [f"Consultei seu fluxo de caixa. Saldo atual: R$ {current:,.2f}."]
                for row in forecasts[:3]:
                    lines.append(
                        f"{row.get('days')} dias -> saldo projetado R$ {float(row.get('projected_balance', 0)):,.2f}"
                    )
                return "\n".join(lines)
            if "get_month_expenses" in tool_results:
                result = tool_results["get_month_expenses"] or {}
                return (
                    f"Consultei as despesas do mes: R$ {float(result.get('total_expenses', 0)):,.2f} "
                    f"em {int(result.get('count', 0))} movimentacoes."
                )

        if intent == "system_action":
            if "create_reminder" in tool_results:
                reminder = tool_results["create_reminder"] or {}
                return (
                    f"Lembrete criado com sucesso: {reminder.get('title', 'Lembrete')} "
                    f"para {reminder.get('remind_at', 'horario informado')}."
                )
            if "create_transaction" in tool_results:
                tx = tool_results["create_transaction"] or {}
                tx_type = "receita" if tx.get("type") == "income" else "despesa"
                return (
                    f"{tx_type.capitalize()} registrada com sucesso: R$ {float(tx.get('amount', 0)):,.2f} "
                    f"em {tx.get('category', 'Geral')}."
                )

        return "Acao executada com sucesso com base nos dados reais do sistema."

    def _extract_transaction_args(self, text: str) -> Dict[str, Any]:
        amount = 0.0
        amount_match = re.search(r"(\d+[.,]?\d*)", text)
        if amount_match:
            amount = float(amount_match.group(1).replace(".", "").replace(",", "."))
        category = "Geral"
        cat_match = re.search(r"(?:em|de)\s+([a-zA-ZÀ-ÿ ]{3,30})", text)
        if cat_match:
            category = cat_match.group(1).strip().split()[0].capitalize()
        transaction_type = "income" if any(token in text for token in ("receita", "ganho", "lucro")) else "expense"
        return {
            "amount": amount,
            "category": category,
            "transaction_type": transaction_type,
            "account_scope": "business" if "empresa" in text else "personal",
        }

    def _extract_reminder_args(self, text: str) -> Dict[str, Any]:
        title = "Lembrete financeiro"
        if "pagar" in text:
            title = "Pagar conta"
        if "reuniao" in text:
            title = "Reuniao"

        date_match = re.search(r"(\d{1,2}/\d{1,2}/\d{2,4})(?:\s+(\d{1,2}:\d{2}))?", text)
        if date_match:
            date_text = date_match.group(1)
            time_text = date_match.group(2) or "09:00"
            remind_at = f"{date_text} {time_text}"
        else:
            remind_at = datetime.utcnow().strftime("%d/%m/%Y 09:00")

        return {"title": title, "remind_at": remind_at}
