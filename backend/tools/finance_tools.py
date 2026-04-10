from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from database import bills_collection, transactions_collection


def _normalize_scope(scope: Optional[str]) -> Optional[str]:
    if not scope:
        return None
    scope = scope.lower().strip()
    if scope in {"general", "geral", "all"}:
        return None
    if scope in {"personal", "pessoal"}:
        return "personal"
    if scope in {"business", "empresa"}:
        return "business"
    return None


async def get_recent_transactions(workspace_id: str, scope: Optional[str] = None, limit: int = 8) -> Dict[str, Any]:
    query = {"workspace_id": workspace_id}
    normalized = _normalize_scope(scope)
    if normalized:
        query["account_scope"] = normalized
    items = await transactions_collection.find(query).sort("date", -1).limit(limit).to_list(limit)
    for item in items:
        item.pop("_id", None)
    return {"items": items}


async def get_open_bills(workspace_id: str, scope: Optional[str] = None) -> Dict[str, Any]:
    query = {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
    normalized = _normalize_scope(scope)
    if normalized:
        query["account_scope"] = normalized
    items = await bills_collection.find(query).sort("due_date", 1).to_list(100)
    for item in items:
        item.pop("_id", None)
    return {"items": items, "count": len(items)}


async def get_month_expenses(workspace_id: str, scope: Optional[str] = None) -> Dict[str, Any]:
    start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    query = {"workspace_id": workspace_id, "type": "expense", "date": {"$gte": start}}
    normalized = _normalize_scope(scope)
    if normalized:
        query["account_scope"] = normalized
    rows = await transactions_collection.find(query).to_list(2000)
    total = sum(float(row.get("amount", 0)) for row in rows)
    return {"month_start": start.isoformat(), "total_expenses": round(total, 2), "count": len(rows)}


async def get_cashflow_forecast(workspace_id: str, scope: Optional[str] = None) -> Dict[str, Any]:
    normalized = _normalize_scope(scope)
    tx_query = {"workspace_id": workspace_id}
    bill_query = {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
    if normalized:
        tx_query["account_scope"] = normalized
        bill_query["account_scope"] = normalized

    transactions = await transactions_collection.find(tx_query).to_list(4000)
    current_balance = 0.0
    for tx in transactions:
        amount = float(tx.get("amount", 0))
        current_balance += amount if tx.get("type") == "income" else -amount

    bills = await bills_collection.find(bill_query).to_list(2000)
    forecasts = []
    now = datetime.utcnow()
    for days in (30, 60, 90):
        until = now + timedelta(days=days)
        projected_income = 0.0
        projected_expenses = 0.0
        for bill in bills:
            due = bill.get("due_date")
            if isinstance(due, str):
                try:
                    due = datetime.fromisoformat(due)
                except ValueError:
                    continue
            if not due or due > until:
                continue
            amount = float(bill.get("amount", 0))
            if bill.get("type") == "receivable":
                projected_income += amount
            else:
                projected_expenses += amount
        balance = current_balance + projected_income - projected_expenses
        forecasts.append(
            {
                "days": days,
                "projected_income": round(projected_income, 2),
                "projected_expenses": round(projected_expenses, 2),
                "projected_balance": round(balance, 2),
                "negative_alert": balance < 0,
            }
        )

    return {"current_balance": round(current_balance, 2), "forecasts": forecasts}


async def get_cashflow(workspace_id: str, scope: Optional[str] = None) -> Dict[str, Any]:
    # Alias semantico para manter o contrato de tools do agente.
    return await get_cashflow_forecast(workspace_id=workspace_id, scope=scope)
