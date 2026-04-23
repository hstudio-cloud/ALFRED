from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from services.assistant_action_service import AssistantActionService
from services.llm_service import LLMService
from tools import (
    current_date_time,
    create_category,
    get_account_balances,
    get_agenda_today,
    create_transaction,
    get_cashflow,
    get_month_expenses,
    get_open_bills,
    orchestrator_create_reminder,
    get_payroll_summary,
    get_recent_transactions,
    get_workspace_summary,
    get_open_finance_summary,
    get_open_finance_week_income,
    get_open_finance_top_expenses,
    search_internal_knowledge,
    get_top_categories,
    navigate_to_section,
    search_web,
    workspace_context,
)

from .intent_classifier import IntentClassifier
from .memory_manager import AgentMemoryManager
from .planner import Planner
from .types import AgentResult, ExecutionPlan, PlanStep
from .action_contract import normalize_declared_actions, normalize_executed_actions


class AgentOrchestrator:
    """Central orchestration layer for Nano agent decisions and execution."""

    def __init__(self, api_key: str = ""):
        self.intent_classifier = IntentClassifier()
        self.planner = Planner()
        self.memory = AgentMemoryManager()
        self.llm = LLMService()
        self.actions = AssistantActionService(api_key=api_key)

    async def handle_message(
        self,
        *,
        user: Dict[str, Any],
        workspace: Dict[str, Any],
        message: str,
        conversation_history: List[Dict[str, str]],
    ) -> AgentResult:
        memory_context = await self.memory.load(user["id"], workspace["id"])
        base_context = {
            "workspace": workspace_context(workspace),
            "conversation_history": conversation_history[-8:],
            "memory": memory_context,
            "now": datetime.utcnow().isoformat(),
        }

        intent, intent_source = await self._classify_with_fallback(
            message=message,
            base_context=base_context,
        )
        plan, plan_source = await self._plan_with_fallback(
            intent=intent,
            message=message,
        )

        if plan.followup_needed:
            followup_text = await self.llm.ask_for_missing_data(message, plan.missing_fields)
            return AgentResult(
                message=followup_text,
                intent=intent.label,
                followup_needed=True,
                missing_fields=plan.missing_fields,
                metadata={
                    "plan": self._plan_debug(plan),
                    "intent_source": intent_source,
                    "plan_source": plan_source,
                },
            )

        tool_results: Dict[str, Any] = {}
        actions: List[Dict[str, Any]] = []
        executed_actions: List[Dict[str, Any]] = []
        fallback_response = ""

        for step in plan.steps:
            result = await self._execute_step(
                step=step,
                user=user,
                workspace=workspace,
                message=message,
            )
            tool_results[step.name] = result

            if step.tool == "workspace_tools.navigate_to_section" and result.get("section"):
                executed_actions.append(
                    {
                        "type": "navigate",
                        "status": "executed",
                        "message": f"Abrindo {result.get('label') or result.get('section')}.",
                        "data": result,
                    }
                )

            if step.name == "execute_system_actions":
                actions = result.get("actions", [])
                fallback_response = result.get("fallback_response", "")
                if actions:
                    executed_actions = await self.actions.execute_actions(
                        workspace_id=workspace["id"],
                        current_user=user,
                        actions=actions,
                    )

        if intent.label == "web_research" and "web_search" in tool_results:
            tool_results["web_summary"] = await self.llm.summarize_search_results(tool_results["web_search"])

        normalized_actions = normalize_declared_actions(actions)
        normalized_executed_actions = normalize_executed_actions(executed_actions)

        if normalized_executed_actions or tool_results:
            response_text = await self.llm.respond_with_tool_results(
                message=message,
                intent=intent.label,
                tool_results=tool_results,
                executed_actions=normalized_executed_actions,
                fallback_response=fallback_response,
            )
        else:
            response_text = await self.llm.generate_response(
                message=message,
                context=base_context,
                tool_results=tool_results,
                intent=intent,
                executed_actions=normalized_executed_actions,
                fallback_response=fallback_response,
            )
        response_text = self._enforce_grounded_response(
            text=response_text,
            intent_label=intent.label,
            tool_results=tool_results,
            executed_actions=normalized_executed_actions,
            fallback_response=fallback_response,
        )

        await self.memory.remember(
            user_id=user["id"],
            workspace_id=workspace["id"],
            message=message,
            actions=normalized_executed_actions,
            metadata={"scope": intent.entities.get("scope")},
        )

        return AgentResult(
            message=response_text,
            intent=intent.label,
            tool_results=tool_results,
            actions=normalized_actions,
            executed_actions=normalized_executed_actions,
            followup_needed=False,
            missing_fields=[],
            metadata={
                "plan": self._plan_debug(plan),
                "intent_confidence": intent.confidence,
                "intent_source": intent_source,
                "plan_source": plan_source,
            },
        )

    async def _classify_with_fallback(
        self,
        *,
        message: str,
        base_context: Dict[str, Any],
    ) -> tuple[IntentClassification, str]:
        llm_payload = await self.llm.classify_intent(message, base_context)
        llm_intent = self._intent_from_llm_payload(llm_payload)
        if llm_intent and llm_intent.label != "unknown" and llm_intent.confidence >= 0.55:
            return llm_intent, "llm"
        return self.intent_classifier.classify(message, base_context), "fallback_rules"

    async def _plan_with_fallback(
        self,
        *,
        intent: IntentClassification,
        message: str,
    ) -> tuple[ExecutionPlan, str]:
        llm_plan = await self._create_llm_plan(intent=intent, message=message)
        if llm_plan and llm_plan.steps:
            return llm_plan, "llm"
        if llm_plan and llm_plan.followup_needed:
            return llm_plan, "llm"
        return self.planner.create_plan(intent, message), "fallback_planner"

    async def _create_llm_plan(
        self,
        *,
        intent: IntentClassification,
        message: str,
    ) -> ExecutionPlan | None:
        if intent.label == "followup_missing_data":
            return ExecutionPlan(
                intent=intent,
                followup_needed=True,
                missing_fields=list(intent.missing_fields),
                steps=[
                    PlanStep(
                        name="ask_missing_data",
                        meta={"missing_fields": intent.missing_fields, "original_message": message},
                    )
                ],
            )

        tool_specs = self._tool_specs_for_intent(intent)
        if not tool_specs:
            return None

        selected_tools = await self.llm.select_tools(
            message=message,
            intent=intent.label,
            tools=tool_specs,
        )
        if not selected_tools:
            return None

        plan = ExecutionPlan(
            intent=intent,
            followup_needed=bool(intent.missing_fields),
            missing_fields=list(intent.missing_fields),
        )

        for item in selected_tools:
            step = self._step_from_llm_selection(
                selected=item,
                intent=intent,
                message=message,
            )
            if step:
                plan.steps.append(step)

        return plan if plan.steps else None

    def _tool_specs_for_intent(self, intent: IntentClassification) -> List[Dict[str, Any]]:
        if intent.label == "system_action":
            return [
                self._tool_spec(
                    "create_transaction",
                    "Registrar uma receita ou despesa financeira no sistema.",
                    {
                        "amount": {"type": "number"},
                        "category": {"type": "string"},
                        "transaction_type": {"type": "string"},
                        "description": {"type": "string"},
                        "payment_method": {"type": "string"},
                        "account_scope": {"type": "string"},
                    },
                ),
                self._tool_spec(
                    "create_category",
                    "Criar uma nova categoria financeira no Nano.",
                    {
                        "name": {"type": "string"},
                        "kind": {"type": "string"},
                        "account_scope": {"type": "string"},
                    },
                ),
                self._tool_spec(
                    "create_reminder",
                    "Criar um lembrete ou compromisso com data e hora.",
                    {
                        "title": {"type": "string"},
                        "remind_at": {"type": "string"},
                        "description": {"type": "string"},
                    },
                ),
                self._tool_spec(
                    "navigate_to_section",
                    "Navegar para uma seção do painel, como bancos, cartoes ou relatorios.",
                    {
                        "section": {"type": "string"},
                        "label": {"type": "string"},
                    },
                ),
                self._tool_spec(
                    "execute_system_actions",
                    "Usar o fallback de parsing local para detectar acoes livres no texto.",
                    {},
                ),
            ]

        if intent.label == "system_query":
            return [
                self._tool_spec("fetch_agenda", "Consultar agenda e lembretes de hoje.", {}),
                self._tool_spec("fetch_open_bills", "Consultar contas abertas.", {}),
                self._tool_spec("fetch_recent_transactions", "Consultar movimentacoes recentes.", {}),
                self._tool_spec("month_expenses", "Consultar total de despesas do mes.", {}),
                self._tool_spec("cashflow_forecast", "Consultar fluxo de caixa e projecao.", {}),
                self._tool_spec("open_finance_summary", "Consultar resumo do Open Finance.", {}),
                self._tool_spec("open_finance_week_income", "Consultar entradas e saidas dos ultimos 7 dias.", {}),
                self._tool_spec("open_finance_top_expenses", "Consultar maiores despesas importadas do banco.", {}),
            ]

        if intent.label == "financial_analysis":
            return [
                self._tool_spec("month_expenses", "Consultar total de despesas do mes.", {}),
                self._tool_spec("cashflow_forecast", "Consultar fluxo de caixa e projecao.", {}),
                self._tool_spec("top_categories", "Consultar categorias com maior peso no periodo.", {}),
                self._tool_spec("workspace_summary", "Consultar resumo geral do workspace.", {}),
                self._tool_spec("open_finance_summary", "Consultar resumo do Open Finance.", {}),
                self._tool_spec("open_finance_week_income", "Consultar entradas e saidas dos ultimos 7 dias.", {}),
                self._tool_spec("open_finance_top_expenses", "Consultar maiores despesas importadas do banco.", {}),
            ]

        if intent.label == "web_research":
            return [
                self._tool_spec("web_search", "Pesquisar na web usando a cadeia Brave/Tavily/DuckDuckGo.", {"query": {"type": "string"}}),
                self._tool_spec("date_time", "Consultar data e hora atuais.", {}),
                self._tool_spec("account_balances", "Consultar saldos das contas para comparar com a pesquisa.", {"scope": {"type": "string"}}),
            ]

        if intent.label == "knowledge_lookup":
            return [
                self._tool_spec("knowledge_lookup", "Consultar a base interna de conhecimento do Nano.", {"query": {"type": "string"}})
            ]

        if intent.label == "memory_recall":
            return [
                self._tool_spec("read_memory", "Ler memoria recente do usuario no Nano.", {})
            ]

        return []

    def _step_from_llm_selection(
        self,
        *,
        selected: Dict[str, Any],
        intent: IntentClassification,
        message: str,
    ) -> PlanStep | None:
        name = str(selected.get("name") or "").strip()
        arguments = selected.get("arguments") if isinstance(selected.get("arguments"), dict) else {}

        if name == "create_transaction":
            payload = self.planner._extract_transaction_payload(message, intent)
            payload.update({k: v for k, v in arguments.items() if v not in (None, "")})
            return PlanStep(
                name="create_transaction",
                tool="orchestrator_tools.create_transaction",
                tool_input=payload,
            )

        if name == "create_category":
            payload = self.planner._extract_category_payload(message, intent)
            payload.update({k: v for k, v in arguments.items() if v not in (None, "")})
            return PlanStep(
                name="create_category",
                tool="orchestrator_tools.create_category",
                tool_input=payload,
            )

        if name == "create_reminder":
            payload = self.planner._extract_reminder_payload(message)
            payload.update({k: v for k, v in arguments.items() if v not in (None, "")})
            return PlanStep(
                name="create_reminder",
                tool="orchestrator_tools.create_reminder",
                tool_input=payload,
            )

        if name == "navigate_to_section":
            payload = {
                "section": arguments.get("section") or intent.entities.get("section"),
                "label": arguments.get("label") or intent.entities.get("section"),
            }
            if not payload["section"]:
                return None
            return PlanStep(
                name="navigate_section",
                tool="workspace_tools.navigate_to_section",
                tool_input=payload,
            )

        if name == "execute_system_actions":
            return PlanStep(
                name="execute_system_actions",
                tool="assistant_action_service.execute_from_text",
                tool_input={"message": message},
            )

        mapping = {
            "fetch_agenda": ("fetch_agenda", "reminder_tools.get_agenda_today"),
            "fetch_open_bills": ("fetch_open_bills", "finance_tools.get_open_bills"),
            "fetch_recent_transactions": ("fetch_recent_transactions", "finance_tools.get_recent_transactions"),
            "month_expenses": ("month_expenses", "finance_tools.get_month_expenses"),
            "cashflow_forecast": ("cashflow_forecast", "finance_tools.get_cashflow"),
            "top_categories": ("top_categories", "report_tools.get_top_categories"),
            "workspace_summary": ("workspace_summary", "system_tools.get_workspace_summary"),
            "open_finance_summary": ("open_finance_summary", "open_finance_tools.get_open_finance_summary"),
            "open_finance_week_income": ("open_finance_week_income", "open_finance_tools.get_open_finance_week_income"),
            "open_finance_top_expenses": ("open_finance_top_expenses", "open_finance_tools.get_open_finance_top_expenses"),
            "web_search": ("web_search", "web_tools.web_search"),
            "date_time": ("date_time", "utility_tools.current_date_time"),
            "account_balances": ("account_balances", "account_tools.get_account_balances"),
            "knowledge_lookup": ("knowledge_lookup", "knowledge_tools.search_internal_knowledge"),
            "read_memory": ("read_memory", "memory_manager.recall_relevant"),
        }
        if name not in mapping:
            return None
        step_name, tool_name = mapping[name]
        return PlanStep(name=step_name, tool=tool_name, tool_input=arguments)

    @staticmethod
    def _tool_spec(name: str, description: str, properties: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": name,
                "description": description,
                "parameters": {"type": "object", "properties": properties},
            },
        }

    @staticmethod
    def _intent_from_llm_payload(payload: Dict[str, Any]) -> IntentClassification | None:
        if not payload or not payload.get("label"):
            return None
        return IntentClassification(
            label=payload["label"],
            confidence=float(payload.get("confidence", 0) or 0),
            entities=payload.get("entities") or {},
            suggested_tool=payload.get("suggested_tool"),
            requires_tool=bool(payload.get("requires_tool", False)),
            missing_fields=list(payload.get("missing_fields") or []),
        )

    async def _execute_step(
        self,
        *,
        step: PlanStep,
        user: Dict[str, Any],
        workspace: Dict[str, Any],
        message: str,
    ) -> Dict[str, Any]:
        workspace_id = workspace["id"]
        user_id = user["id"]

        if step.name == "direct_response":
            return {"ok": True}

        if step.name == "ask_missing_data":
            return {"missing_fields": step.meta.get("missing_fields", [])}

        if step.tool == "assistant_action_service.execute_from_text":
            return await self.actions.detect_actions_from_text(user_id=user_id, message=message)

        if step.tool == "orchestrator_tools.create_transaction":
            payload = step.tool_input or {}
            return await create_transaction(
                workspace_id=workspace_id,
                user_id=user_id,
                amount=float(payload.get("amount", 0) or 0),
                category=payload.get("category", "Geral"),
                transaction_type=payload.get("transaction_type", "expense"),
                description=payload.get("description"),
                payment_method=payload.get("payment_method", "other"),
                account_scope=payload.get("account_scope", "personal"),
            )

        if step.tool == "orchestrator_tools.create_category":
            payload = step.tool_input or {}
            return await create_category(
                workspace_id=workspace_id,
                user_id=user_id,
                name=payload.get("name", "Geral"),
                kind=payload.get("kind", "expense"),
                color=payload.get("color", "#ef4444"),
                icon=payload.get("icon"),
                account_scope=payload.get("account_scope", "both"),
            )

        if step.tool == "orchestrator_tools.create_reminder":
            payload = step.tool_input or {}
            return await orchestrator_create_reminder(
                workspace_id=workspace_id,
                user_id=user_id,
                title=payload.get("title", "Lembrete"),
                remind_at=payload.get("remind_at", ""),
                description=payload.get("description"),
            )

        if step.tool == "reminder_tools.get_agenda_today":
            return await get_agenda_today(workspace_id=workspace_id, user_id=user_id)

        if step.tool == "finance_tools.get_open_bills":
            return await get_open_bills(workspace_id=workspace_id)

        if step.tool == "finance_tools.get_recent_transactions":
            return await get_recent_transactions(workspace_id=workspace_id)

        if step.tool == "finance_tools.get_month_expenses":
            return await get_month_expenses(workspace_id=workspace_id)

        if step.tool == "finance_tools.get_cashflow_forecast":
            return await get_cashflow(workspace_id=workspace_id)

        if step.tool == "finance_tools.get_cashflow":
            return await get_cashflow(workspace_id=workspace_id)

        if step.tool == "report_tools.get_top_categories":
            return await get_top_categories(workspace_id=workspace_id)

        if step.tool == "system_tools.get_workspace_summary":
            return await get_workspace_summary(workspace_id=workspace_id, user_id=user_id)

        if step.tool == "open_finance_tools.get_open_finance_summary":
            return await get_open_finance_summary(workspace_id=workspace_id)

        if step.tool == "open_finance_tools.get_open_finance_week_income":
            return await get_open_finance_week_income(workspace_id=workspace_id)

        if step.tool == "open_finance_tools.get_open_finance_top_expenses":
            return await get_open_finance_top_expenses(workspace_id=workspace_id)

        if step.tool == "account_tools.get_account_balances":
            return await get_account_balances(
                workspace_id=workspace_id,
                scope=step.tool_input.get("scope"),
            )

        if step.tool == "payroll_tools.get_payroll_summary":
            return await get_payroll_summary(workspace_id=workspace_id)

        if step.tool == "web_tools.web_search":
            return await search_web(step.tool_input.get("query") or message)

        if step.tool == "knowledge_tools.search_internal_knowledge":
            return await search_internal_knowledge(step.tool_input.get("query") or message)

        if step.tool == "utility_tools.current_date_time":
            return current_date_time()

        if step.tool == "memory_manager.recall_relevant":
            return await self.memory.recall_relevant(user_id=user_id, workspace_id=workspace_id)

        if step.tool == "workspace_tools.navigate_to_section":
            return navigate_to_section(
                step.tool_input.get("section", "overview"),
                step.tool_input.get("label"),
            )

        return {"error": "tool_not_implemented", "tool": step.tool}

    def _enforce_grounded_response(
        self,
        *,
        text: str,
        intent_label: str,
        tool_results: Dict[str, Any],
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        candidate = (text or "").strip()
        lower = candidate.lower()

        # Guardrail: never let empty/generic placeholders leak to UI.
        if (
            not candidate
            or "resultado: {}" in lower
            or "conclui o pedido. resultado" in lower
            or candidate in {"Conclui o pedido.", "Conclui o pedido. Resultado: {}"}
        ):
            return self._build_grounded_summary(
                intent_label=intent_label,
                tool_results=tool_results,
                executed_actions=executed_actions,
                fallback_response=fallback_response,
            )

        if intent_label in {"system_action", "system_query", "web_research", "financial_analysis"}:
            if "posso registrar" in lower and tool_results:
                return self._build_grounded_summary(
                    intent_label=intent_label,
                    tool_results=tool_results,
                    executed_actions=executed_actions,
                    fallback_response=fallback_response,
                )
        return candidate

    def _build_grounded_summary(
        self,
        *,
        intent_label: str,
        tool_results: Dict[str, Any],
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        if "create_category" in tool_results and "create_transaction" in tool_results:
            category = tool_results.get("create_category") or {}
            tx = tool_results.get("create_transaction") or {}
            category_name = category.get("name", "Nova categoria")
            tx_type = "receita" if tx.get("type") == "income" else "despesa"
            amount = float(tx.get("amount", 0) or 0)
            return (
                f"Perfeito. Deixei a categoria {category_name} pronta e registrei uma "
                f"{tx_type} de {self._format_brl(amount)} nela."
            )

        if executed_actions:
            messages = [item.get("message") for item in executed_actions if item.get("message")]
            if messages:
                return "\n".join(messages)

        if "create_category" in tool_results:
            item = tool_results.get("create_category") or {}
            category_name = item.get("name", "Nova categoria")
            if item.get("status") == "exists":
                return f"A categoria {category_name} ja estava disponivel no seu painel."
            return f"Perfeito. Criei a categoria {category_name} no seu painel."

        if "create_reminder" in tool_results:
            item = tool_results.get("create_reminder") or {}
            title = item.get("title", "Lembrete")
            remind_at = item.get("remind_at", "")
            when = remind_at[0:16].replace("T", " ") if isinstance(remind_at, str) else "horario informado"
            return f"Perfeito. Lembrete criado: {title} para {when}."

        if "create_transaction" in tool_results:
            tx = tool_results.get("create_transaction") or {}
            tx_type = "receita" if tx.get("type") == "income" else "despesa"
            amount = float(tx.get("amount", 0) or 0)
            category = tx.get("category", "Geral")
            return f"Perfeito. Registrei uma {tx_type} de {self._format_brl(amount)} em {category}."

        if "fetch_agenda" in tool_results:
            agenda = tool_results.get("fetch_agenda") or {}
            items = agenda.get("items") or []
            if not items:
                return "Olhei sua agenda de hoje e nao encontrei lembretes pendentes."
            lines = ["Hoje voce tem estes lembretes:"]
            for idx, item in enumerate(items[:5], start=1):
                remind_at = str(item.get("remind_at") or "")
                hour = remind_at[11:16] if len(remind_at) >= 16 else "sem horario"
                lines.append(f"{idx}. {item.get('title', 'Lembrete')} - {hour}")
            return "\n".join(lines)

        if "web_search" in tool_results:
            data = tool_results.get("web_search") or {}
            items = data.get("items") or []
            if not items:
                return "Fiz a busca, mas nao encontrei resultados confiaveis agora. Posso tentar com termos mais especificos."
            lines = ["Pesquisei na web e encontrei:"]
            for idx, item in enumerate(items[:4], start=1):
                title = item.get("title") or "Resultado"
                snippet = item.get("snippet") or item.get("description") or "Sem descricao."
                url = item.get("url") or item.get("link") or ""
                lines.append(f"{idx}. {title} - {snippet} ({url})")
            return "\n".join(lines)

        if intent_label == "financial_analysis":
            financial_summary = self._build_financial_analysis_summary(tool_results)
            if financial_summary:
                return financial_summary

        if "month_expenses" in tool_results:
            data = tool_results.get("month_expenses") or {}
            total = float(data.get("total_expenses", 0) or 0)
            count = int(data.get("count", 0) or 0)
            return f"Neste mes, suas despesas somam {self._format_brl(total)} em {count} movimentacoes."

        if "open_finance_summary" in tool_results:
            data = tool_results.get("open_finance_summary") or {}
            connections = int(data.get("connections_count", 0) or 0)
            accounts = int(data.get("accounts_count", 0) or 0)
            balance = float(data.get("balance_total", 0) or 0)
            institutions = data.get("institutions") or []
            institutions_text = ", ".join(institutions[:3]) if institutions else "nenhuma instituicao"
            return (
                f"Open Finance conectado em {connections} conexoes e {accounts} contas. "
                f"Saldo consolidado importado: {self._format_brl(balance)}. Instituicoes: {institutions_text}."
            )

        if intent_label == "general_chat":
            return (
                fallback_response
                or "Estou com voce. Posso responder, analisar seus dados e executar a proxima etapa por aqui."
            )

        return fallback_response or "Conclui seu pedido com os dados disponiveis no sistema."

    def _build_financial_analysis_summary(self, tool_results: Dict[str, Any]) -> str:
        month = tool_results.get("month_expenses") or {}
        cashflow = tool_results.get("cashflow_forecast") or tool_results.get("cashflow") or {}
        top_categories = (tool_results.get("top_categories") or {}).get("items") or []
        open_finance_week = tool_results.get("open_finance_week_income") or {}
        open_finance_summary = tool_results.get("open_finance_summary") or {}

        total_expenses = float(month.get("total_expenses", 0) or 0)
        expense_count = int(month.get("count", 0) or 0)
        current_balance = float(cashflow.get("current_balance", 0) or 0)
        forecasts = cashflow.get("forecasts") or []
        next_forecast = forecasts[0] if forecasts else {}
        projected_balance = float(next_forecast.get("projected_balance", 0) or 0)
        projected_expenses = float(next_forecast.get("projected_expenses", 0) or 0)
        open_finance_net = float(open_finance_week.get("net", 0) or 0)
        imported_balance = float(open_finance_summary.get("balance_total", 0) or 0)

        if not any([month, cashflow, top_categories, open_finance_week, open_finance_summary]):
            return ""

        lines = []
        if total_expenses or expense_count:
            average_expense = total_expenses / expense_count if expense_count else 0
            lines.append(
                f"No mes, voce ja saiu {self._format_brl(total_expenses)} em {expense_count} movimentacoes. "
                f"Ticket medio: {self._format_brl(average_expense)}."
            )

        if current_balance or projected_balance or projected_expenses:
            balance_line = (
                f"Seu caixa atual esta em {self._format_brl(current_balance)} "
                f"e a projecao de 30 dias aponta {self._format_brl(projected_balance)}."
            )
            if next_forecast.get("negative_alert"):
                balance_line += " Do jeito atual, voce corre risco de entrar no negativo."
            lines.append(balance_line)

        if imported_balance:
            lines.append(f"Pelas contas conectadas via Open Finance, o saldo consolidado hoje esta em {self._format_brl(imported_balance)}.")

        if open_finance_week:
            lines.append(
                f"Nos ultimos 7 dias, entraram {self._format_brl(open_finance_week.get('income', 0) or 0)} "
                f"e sairam {self._format_brl(open_finance_week.get('expenses', 0) or 0)}."
            )

        recommendations: List[str] = []
        if top_categories:
            lead = top_categories[0]
            recommendations.append(
                f"Revise primeiro a categoria {lead.get('category', 'Geral')}, que hoje puxa {self._format_brl(lead.get('amount', 0) or 0)} do seu mes."
            )
        if next_forecast.get("negative_alert"):
            recommendations.append(
                f"Corte ou reprograme pelo menos {self._format_brl(abs(projected_balance))} em saidas para evitar saldo negativo nos proximos 30 dias."
            )
        elif projected_expenses and current_balance and projected_expenses > current_balance * 0.8:
            recommendations.append("Suas saidas projetadas estao pressionando o caixa. Vale travar gastos variaveis e antecipar recebimentos.")
        if open_finance_week and open_finance_net < 0:
            recommendations.append("Nesta semana, seu fluxo ficou negativo. Priorize receitas recorrentes e reduza compras nao essenciais ate equilibrar o ciclo.")
        if not recommendations:
            recommendations.append("Seu financeiro esta estavel. O melhor proximo passo agora e organizar categorias recorrentes e revisar despesas variaveis para ganhar margem.")

        lines.append("Recomendacao do Nano:")
        for index, item in enumerate(recommendations[:3], start=1):
            lines.append(f"{index}. {item}")

        return "\n".join(lines)

    @staticmethod
    def _format_brl(amount: float) -> str:
        return f"R$ {float(amount or 0):,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    def _plan_debug(self, plan: ExecutionPlan) -> Dict[str, Any]:
        return {
            "intent": plan.intent.label,
            "steps": [
                {"name": step.name, "tool": step.tool, "tool_input": step.tool_input}
                for step in plan.steps
            ],
            "followup_needed": plan.followup_needed,
            "missing_fields": plan.missing_fields,
        }
