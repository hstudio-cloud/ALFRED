from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List

from services.assistant_action_service import AssistantActionService
from services.llm_service import LLMService
from tools import (
    current_date_time,
    get_account_balances,
    get_agenda_today,
    get_cashflow,
    get_month_expenses,
    get_open_bills,
    get_payroll_summary,
    get_recent_transactions,
    get_workspace_summary,
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

        response_text = await self.llm.generate_response(
            message=message,
            context=base_context,
            tool_results=tool_results,
            intent=intent,
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
