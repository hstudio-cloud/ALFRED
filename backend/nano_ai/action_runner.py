from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from database import (
    bills_collection,
    categories_collection,
    reminders_collection,
    transactions_collection,
)
from models import Transaction
from models_extended import Bill, FinancialCategory, ReminderFinancial


class NanoActionRunner:
    """Executes validated Nano actions against the current backend data model."""

    @staticmethod
    def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value)
        except ValueError:
            return None

    @staticmethod
    def _format_brl(value: float) -> str:
        return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

    @staticmethod
    def _format_datetime_label(value: Optional[datetime]) -> str:
        if not value:
            return "-"
        return value.strftime("%d/%m/%Y %H:%M")

    async def _ensure_category_exists(
        self,
        workspace_id: str,
        user_id: str,
        category_name: str,
        kind: str,
        account_scope: str,
    ) -> None:
        existing = await categories_collection.find_one(
            {"workspace_id": workspace_id, "name": category_name}
        )
        if existing:
            return

        category = FinancialCategory(
            workspace_id=workspace_id,
            user_id=user_id,
            name=category_name,
            kind=kind,
            account_scope=account_scope if account_scope in {"personal", "business"} else "both",
        )
        await categories_collection.insert_one(category.dict())

    async def _execute_transaction_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = data.get("missing_fields", [])
        if missing_fields:
            return {
                "type": "create_transaction",
                "status": "needs_input",
                "message": f"Faltaram dados para registrar a movimentacao: {', '.join(missing_fields)}.",
                "data": data,
            }

        await self._ensure_category_exists(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            category_name=data["category"],
            kind=data["type"],
            account_scope=data.get("account_scope", "personal"),
        )

        transaction = Transaction(
            user_id=current_user["id"],
            type=data["type"],
            category=data["category"],
            amount=float(data["amount"]),
            description=data.get("description"),
            payment_method=data.get("payment_method", "other"),
            account_scope=data.get("account_scope", "personal"),
            date=self._parse_iso_datetime(data.get("date")) or datetime.utcnow(),
        )
        payload = transaction.dict()
        payload["workspace_id"] = workspace_id
        await transactions_collection.insert_one(payload)

        label = "receita" if transaction.type == "income" else "despesa"
        scope_label = "empresa" if transaction.account_scope == "business" else "pessoal"
        payment_label = {
            "pix": "via Pix",
            "card": "no cartao",
            "boleto": "por boleto",
            "transfer": "por transferencia",
            "cash": "em dinheiro",
            "other": "sem metodo informado",
        }.get(transaction.payment_method, "sem metodo informado")
        return {
            "type": "create_transaction",
            "status": "executed",
            "message": (
                f"Registrei uma {label} de {self._format_brl(transaction.amount)} em "
                f"{transaction.category}, {payment_label}, no financeiro {scope_label}."
            ),
            "data": transaction.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_bill_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        missing_fields = data.get("missing_fields", [])
        if missing_fields:
            return {
                "type": "create_bill",
                "status": "needs_input",
                "message": f"Faltaram dados para criar a conta: {', '.join(missing_fields)}.",
                "data": data,
            }

        await self._ensure_category_exists(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            category_name=data["category"],
            kind="both" if data["type"] == "receivable" else "expense",
            account_scope=data.get("account_scope", "business"),
        )

        bill = Bill(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            title=data["title"],
            amount=float(data["amount"]),
            type=data["type"],
            due_date=self._parse_iso_datetime(data.get("due_date")) or datetime.utcnow(),
            category=data["category"],
            payment_method=data.get("payment_method", "other"),
            account_scope=data.get("account_scope", "business"),
            description=data.get("description"),
            recurring=bool(data.get("recurring")),
        )
        await bills_collection.insert_one(bill.dict())

        label = "Conta a receber" if bill.type == "receivable" else "Conta a pagar"
        return {
            "type": "create_bill",
            "status": "executed",
            "message": (
                f"Criei a {label.lower()} {bill.title} no valor de {self._format_brl(bill.amount)} "
                f"com vencimento em {self._format_datetime_label(bill.due_date)}."
            ),
            "data": bill.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_reminder_action(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        data = action.get("data", {})
        remind_at = self._parse_iso_datetime(data.get("remind_at")) or datetime.utcnow()

        reminder = ReminderFinancial(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            title=data.get("title") or "Lembrete financeiro",
            remind_at=remind_at,
            description=data.get("description"),
        )
        await reminders_collection.insert_one(reminder.dict())

        return {
            "type": "create_reminder",
            "status": "executed",
            "message": f"Deixei o lembrete {reminder.title} agendado para {self._format_datetime_label(reminder.remind_at)}.",
            "data": reminder.dict(),
            "assumptions": data.get("assumptions", []),
        }

    async def _execute_analysis_action(
        self,
        workspace_id: str,
        action: Dict[str, Any],
    ) -> Dict[str, Any]:
        period = action.get("data", {}).get("period", "30d")
        day_map = {"7d": 7, "30d": 30, "90d": 90, "year": 365}
        days = day_map.get(period, 30)
        start_date = datetime.utcnow() - timedelta(days=days)

        transactions = await transactions_collection.find(
            {"workspace_id": workspace_id, "date": {"$gte": start_date}}
        ).to_list(1000)

        income = sum(item["amount"] for item in transactions if item["type"] == "income")
        expenses = sum(item["amount"] for item in transactions if item["type"] == "expense")
        balance = income - expenses

        category_totals: Dict[str, float] = {}
        for item in transactions:
            if item["type"] != "expense":
                continue
            category = item.get("category", "Geral")
            category_totals[category] = category_totals.get(category, 0.0) + item["amount"]

        top_categories = sorted(
            category_totals.items(),
            key=lambda entry: entry[1],
            reverse=True,
        )[:3]

        highlights = []
        if top_categories:
            highlights.append(
                "Maiores categorias: " + ", ".join(
                    f"{name} ({self._format_brl(amount)})" for name, amount in top_categories
                ) + "."
            )
        if expenses > income and expenses > 0:
            highlights.append("Seu periodo terminou com mais saidas do que entradas.")
        elif expenses > 0:
            highlights.append("As entradas ainda cobrem as saidas no periodo analisado.")
        else:
            highlights.append("Ainda nao encontrei despesas suficientes para uma analise mais profunda.")

        return {
            "type": "analyze_spending",
            "status": "executed",
            "message": (
                f"Analisei os ultimos {days} dias: entradas de {self._format_brl(income)}, "
                f"saidas de {self._format_brl(expenses)} e saldo de {self._format_brl(balance)}. "
                + " ".join(highlights)
            ),
            "data": {
                "period": period,
                "days": days,
                "income": income,
                "expenses": expenses,
                "balance": balance,
                "top_categories": top_categories,
            },
        }

    async def execute_actions(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        results = []
        for action in actions:
            action_type = action.get("type")
            if action_type == "create_transaction":
                results.append(await self._execute_transaction_action(workspace_id, current_user, action))
            elif action_type == "create_bill":
                results.append(await self._execute_bill_action(workspace_id, current_user, action))
            elif action_type == "create_reminder":
                results.append(await self._execute_reminder_action(workspace_id, current_user, action))
            elif action_type == "analyze_spending":
                results.append(await self._execute_analysis_action(workspace_id, action))
        return results

    def compose_assistant_reply(
        self,
        workspace_name: str,
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        if not executed_actions:
            return fallback_response

        lines = [fallback_response.strip()]
        assumptions: List[str] = []
        executed_messages: List[str] = []
        follow_up = None

        for item in executed_actions:
            status = item.get("status")
            if status == "executed":
                executed_messages.append(item["message"])
            elif status == "needs_input":
                follow_up = f"Para eu concluir, preciso de mais um detalhe: {item['message']}"

            for assumption in item.get("assumptions", []):
                assumptions.append(assumption)

        if executed_messages:
            lines.append("")
            lines.extend(f"- {message}" for message in executed_messages)

        if assumptions:
            unique_assumptions = list(dict.fromkeys(assumptions))
            lines.append("")
            lines.append("Assumi o seguinte para agilizar:")
            lines.extend(f"- {assumption}" for assumption in unique_assumptions)

        if follow_up:
            lines.append("")
            lines.append(follow_up)
        elif executed_messages:
            lines.append("")
            lines.append(f"Se quiser, eu posso continuar organizando o financeiro de {workspace_name}.")

        return "\n".join(lines)
