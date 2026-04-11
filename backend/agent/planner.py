import re
import unicodedata
from datetime import datetime, timedelta

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

            parsed_reminder = self._extract_reminder_payload(message)
            if parsed_reminder:
                plan.steps.append(
                    PlanStep(
                        name="create_reminder",
                        tool="orchestrator_tools.create_reminder",
                        tool_input=parsed_reminder,
                    )
                )
                return plan

            parsed_transaction = self._extract_transaction_payload(message, intent)
            if parsed_transaction:
                plan.steps.append(
                    PlanStep(
                        name="create_transaction",
                        tool="orchestrator_tools.create_transaction",
                        tool_input=parsed_transaction,
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
                    PlanStep(name="open_finance_summary", tool="open_finance_tools.get_open_finance_summary"),
                    PlanStep(name="open_finance_week_income", tool="open_finance_tools.get_open_finance_week_income"),
                    PlanStep(name="open_finance_top_expenses", tool="open_finance_tools.get_open_finance_top_expenses"),
                ]
            )
            return plan

        if intent.label == "financial_analysis":
            plan.steps.extend(
                [
                    PlanStep(name="month_expenses", tool="finance_tools.get_month_expenses"),
                    PlanStep(name="cashflow_forecast", tool="finance_tools.get_cashflow"),
                    PlanStep(name="top_categories", tool="report_tools.get_top_categories"),
                    PlanStep(name="workspace_summary", tool="system_tools.get_workspace_summary"),
                    PlanStep(name="open_finance_summary", tool="open_finance_tools.get_open_finance_summary"),
                    PlanStep(name="open_finance_week_income", tool="open_finance_tools.get_open_finance_week_income"),
                    PlanStep(name="open_finance_top_expenses", tool="open_finance_tools.get_open_finance_top_expenses"),
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

        if intent.label == "knowledge_lookup":
            plan.steps.append(
                PlanStep(
                    name="knowledge_lookup",
                    tool="knowledge_tools.search_internal_knowledge",
                    tool_input={"query": message},
                )
            )
            return plan

        if intent.label == "memory_recall":
            plan.steps.append(PlanStep(name="read_memory", tool="memory_manager.recall_relevant"))
            return plan

        plan.steps.append(PlanStep(name="direct_response"))
        return plan

    def _extract_transaction_payload(self, message: str, intent: IntentClassification) -> dict:
        text = self._normalize_text(message)
        amount = intent.entities.get("amount")
        if amount is None:
            return {}

        tx_type = "expense"
        if any(token in text for token in ("receita", "ganhei", "ganho", "recebi", "lucro")):
            tx_type = "income"

        category = intent.entities.get("category") or "Geral"
        payment_method = "pix" if "pix" in text else "other"

        return {
            "amount": float(amount),
            "category": category,
            "transaction_type": tx_type,
            "payment_method": payment_method,
            "account_scope": intent.entities.get("scope") or "personal",
            "description": message.strip()[:140],
        }

    def _extract_reminder_payload(self, message: str) -> dict:
        text = self._normalize_text(message)
        if not any(
            token in text
            for token in ("lembrete", "agenda", "agende", "agendar", "reuniao", "marque", "compromisso")
        ):
            return {}

        title = "Lembrete financeiro"
        if "reuniao" in text or "compromisso" in text:
            title = "Reuniao"
        elif "pagar" in text:
            title = "Pagar conta"

        now = datetime.utcnow()
        day = now
        if "amanha" in text:
            day = now + timedelta(days=1)
        elif "hoje" in text:
            day = now

        date_match = re.search(r"(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", text)
        if date_match:
            d = int(date_match.group(1))
            m = int(date_match.group(2))
            y = int(date_match.group(3)) if date_match.group(3) else now.year
            if y < 100:
                y += 2000
            try:
                day = day.replace(year=y, month=m, day=d)
            except ValueError:
                pass

        hour = 9
        minute = 0
        time_match = re.search(r"\b(?:as)\s*(\d{1,2})(?::(\d{2}))?\s*h?\b", text)
        if not time_match:
            time_match = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
        if not time_match:
            time_match = re.search(r"\b(\d{1,2})h\b", text)
        if time_match:
            h = int(time_match.group(1))
            mm = int(time_match.group(2) or 0)
            if 0 <= h <= 23 and 0 <= mm <= 59:
                hour = h
                minute = mm

        remind_at = day.replace(hour=hour, minute=minute, second=0, microsecond=0).isoformat()
        return {
            "title": title,
            "remind_at": remind_at,
            "description": message.strip()[:200],
        }

    @staticmethod
    def _normalize_text(text: str) -> str:
        base = unicodedata.normalize("NFKD", text or "")
        without_accents = "".join(ch for ch in base if not unicodedata.combining(ch))
        return without_accents.lower().strip()
