from .types import ExecutionPlan, IntentClassification, PlanStep


class Planner:
    """Converts intent into an executable plan of tool calls."""

    def create_plan(self, intent: IntentClassification, message: str) -> ExecutionPlan:
        plan = ExecutionPlan(
            intent=intent,
            followup_needed=bool(intent.missing_fields),
            missing_fields=list(intent.missing_fields),
        )

        if intent.label == "followup_missing_data":
            plan.steps.append(
                PlanStep(
                    name="ask_missing_data",
                    meta={"missing_fields": intent.missing_fields, "original_message": message},
                )
            )
            return plan

        if intent.label == "system_action":
            if intent.entities.get("section"):
                plan.steps.append(
                    PlanStep(
                        name="navigate_section",
                        tool="workspace_tools.navigate_to_section",
                        tool_input={
                            "section": intent.entities.get("section"),
                            "label": intent.entities.get("section"),
                        },
                    )
                )
                return plan

            plan.steps.append(
                PlanStep(
                    name="execute_system_actions",
                    tool="assistant_action_service.execute_from_text",
                    tool_input={"message": message},
                )
            )
            return plan

        if intent.label == "system_query":
            plan.steps.extend(
                [
                    PlanStep(name="fetch_agenda", tool="reminder_tools.get_agenda_today"),
                    PlanStep(name="fetch_open_bills", tool="finance_tools.get_open_bills"),
                    PlanStep(name="fetch_recent_transactions", tool="finance_tools.get_recent_transactions"),
                ]
            )
            return plan

        if intent.label == "financial_analysis":
            plan.steps.extend(
                [
                    PlanStep(name="month_expenses", tool="finance_tools.get_month_expenses"),
                    PlanStep(name="cashflow_forecast", tool="finance_tools.get_cashflow_forecast"),
                    PlanStep(name="top_categories", tool="reports_tools.get_top_categories"),
                ]
            )
            return plan

        if intent.label == "web_research":
            plan.steps.extend(
                [
                    PlanStep(name="web_search", tool="web_tools.web_search", tool_input={"query": message}),
                    PlanStep(name="date_time", tool="utility_tools.current_date_time"),
                ]
            )
            if intent.entities.get("compare_with_balance"):
                plan.steps.append(
                    PlanStep(
                        name="account_balances",
                        tool="account_tools.get_account_balances",
                        tool_input={"scope": intent.entities.get("scope")},
                    )
                )
            return plan

        if intent.label == "memory_recall":
            plan.steps.append(PlanStep(name="read_memory", tool="memory_manager.recall_relevant"))
            return plan

        plan.steps.append(PlanStep(name="direct_response"))
        return plan
