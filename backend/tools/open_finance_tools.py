from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from database import (
    open_finance_accounts_collection,
    open_finance_connections_collection,
    open_finance_transactions_collection,
)


async def get_open_finance_summary(workspace_id: str) -> Dict[str, Any]:
    connections = await open_finance_connections_collection.find(
        {"workspace_id": workspace_id}, {"_id": 0}
    ).to_list(200)
    accounts = await open_finance_accounts_collection.find(
        {"workspace_id": workspace_id}, {"_id": 0}
    ).to_list(2000)

    balance_total = 0.0
    for account in accounts:
        balance_total += float(account.get("balance_current", 0) or 0)

    return {
        "connections_count": len(connections),
        "accounts_count": len(accounts),
        "balance_total": balance_total,
        "institutions": sorted(
            list(
                {
                    (item.get("institution_name") or "Instituicao")
                    for item in connections
                }
            )
        ),
    }


async def get_open_finance_week_income(workspace_id: str) -> Dict[str, Any]:
    start = datetime.now(timezone.utc) - timedelta(days=7)
    rows = await open_finance_transactions_collection.find(
        {"workspace_id": workspace_id, "date": {"$gte": start.isoformat()}}, {"_id": 0}
    ).to_list(5000)
    total_income = 0.0
    total_expense = 0.0
    for row in rows:
        amount = float(row.get("amount", 0) or 0)
        tx_type = str(row.get("type", "")).lower()
        if tx_type == "credit" or amount > 0:
            total_income += abs(amount)
        else:
            total_expense += abs(amount)
    return {
        "period_days": 7,
        "income": total_income,
        "expenses": total_expense,
        "net": total_income - total_expense,
        "transactions_count": len(rows),
    }


async def get_open_finance_top_expenses(workspace_id: str, limit: int = 5) -> List[Dict[str, Any]]:
    rows = await open_finance_transactions_collection.find(
        {"workspace_id": workspace_id}, {"_id": 0}
    ).to_list(5000)
    expenses = []
    for row in rows:
        amount = float(row.get("amount", 0) or 0)
        tx_type = str(row.get("type", "")).lower()
        if tx_type == "debit" or amount < 0:
            expenses.append({**row, "amount_abs": abs(amount)})
    expenses.sort(key=lambda item: item.get("amount_abs", 0), reverse=True)
    return expenses[: max(1, min(limit, 20))]

