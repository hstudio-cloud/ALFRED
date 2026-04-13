from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from services.assistant_action_service import AssistantActionService
from services.llm_service import LLMService
from tools import (
    current_date_time,
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

        intent = self.intent_classifier.classify(message, base_context)
        plan = self.planner.create_plan(intent, message)

        if plan.followup_needed:
            followup_text = await self.llm.ask_for_missing_data(message, plan.missing_fields)
            return AgentResult(
                message=followup_text,
                intent=intent.label,
                followup_needed=True,
                missing_fields=plan.missing_fields,
                metadata={"plan": self._plan_debug(plan)},
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

        # Fast-path: when we already executed real actions/tools, prefer a deterministic
        # grounded response to reduce latency and avoid generic replies.
        if normalized_executed_actions or tool_results:
            response_text = self._build_grounded_summary(
                intent_label=intent.label,
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
            metadata={"plan": self._plan_debug(plan), "intent_confidence": intent.confidence},
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
        if executed_actions:
            messages = [item.get("message") for item in executed_actions if item.get("message")]
            if messages:
                return "\n".join(messages)

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
            return f"Perfeito. Registrei uma {tx_type} de R$ {amount:,.2f} em {category}."

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

        if "month_expenses" in tool_results:
            data = tool_results.get("month_expenses") or {}
            total = float(data.get("total_expenses", 0) or 0)
            count = int(data.get("count", 0) or 0)
            return f"Neste mes, suas despesas somam R$ {total:,.2f} em {count} movimentacoes."

        if "open_finance_summary" in tool_results:
            data = tool_results.get("open_finance_summary") or {}
            connections = int(data.get("connections_count", 0) or 0)
            accounts = int(data.get("accounts_count", 0) or 0)
            balance = float(data.get("balance_total", 0) or 0)
            institutions = data.get("institutions") or []
            institutions_text = ", ".join(institutions[:3]) if institutions else "nenhuma instituicao"
            return (
                f"Open Finance conectado em {connections} conexoes e {accounts} contas. "
                f"Saldo consolidado importado: R$ {balance:,.2f}. Instituicoes: {institutions_text}."
            )

        if intent_label == "general_chat":
            return (
                fallback_response
                or "Estou com voce. Posso responder, analisar seus dados e executar a proxima etapa por aqui."
            )

        return fallback_response or "Conclui seu pedido com os dados disponiveis no sistema."

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
