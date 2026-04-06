from collections import defaultdict
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query

from database import accounts_collection, bills_collection, transactions_collection
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _normalize_scope(scope: Optional[str]) -> Optional[str]:
    if not scope:
        return None
    normalized = scope.lower().strip()
    if normalized in {"general", "geral", "all"}:
        return None
    if normalized in {"personal", "pessoal"}:
        return "personal"
    if normalized in {"business", "empresa"}:
        return "business"
    return None


def _period_days(period: str) -> int:
    mapping = {
        "7d": 7,
        "30d": 30,
        "60d": 60,
        "90d": 90,
        "6m": 180,
        "12m": 365,
    }
    return mapping.get(period, 30)


def _safe_date(value):
    if isinstance(value, datetime):
        return value
    if value:
        try:
            return datetime.fromisoformat(str(value))
        except ValueError:
            return None
    return None


async def _filtered_transactions(workspace_id: str, scope: Optional[str], start_date: Optional[datetime] = None):
    query = {"workspace_id": workspace_id}
    if scope:
        query["account_scope"] = scope
    if start_date:
        query["date"] = {"$gte": start_date}
    return await transactions_collection.find(query).sort("date", 1).to_list(5000)


@router.get("/overview")
async def report_overview(
    workspace_id: str = Query(...),
    period: str = Query("30d"),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    start_date = datetime.utcnow() - timedelta(days=_period_days(period))
    transactions = await _filtered_transactions(workspace_id, scope, start_date)

    income = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "income")
    expenses = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "expense")
    average_monthly = (income - expenses) / max(_period_days(period) / 30, 1)

    return {
        "period": period,
        "account_scope": scope or "general",
        "kpis": {
            "total_income": round(income, 2),
            "total_expenses": round(expenses, 2),
            "profit_or_loss": round(income - expenses, 2),
            "average_monthly": round(average_monthly, 2),
            "transactions_count": len(transactions),
        },
    }


@router.get("/monthly")
async def monthly_report(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    months: int = Query(6, ge=1, le=18),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    start_date = datetime.utcnow() - timedelta(days=months * 31)
    transactions = await _filtered_transactions(workspace_id, scope, start_date)

    grouped = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for item in transactions:
        month_key = (_safe_date(item.get("date")) or datetime.utcnow()).strftime("%Y-%m")
        amount = float(item.get("amount", 0))
        if item.get("type") == "income":
            grouped[month_key]["income"] += amount
        else:
            grouped[month_key]["expenses"] += amount

    results = []
    for month_key in sorted(grouped.keys()):
        income = grouped[month_key]["income"]
        expenses = grouped[month_key]["expenses"]
        results.append(
            {
                "month": month_key,
                "income": round(income, 2),
                "expenses": round(expenses, 2),
                "balance": round(income - expenses, 2),
            }
        )

    return {"months": results}


@router.get("/by-category")
async def report_by_category(
    workspace_id: str = Query(...),
    period: str = Query("30d"),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    start_date = datetime.utcnow() - timedelta(days=_period_days(period))
    transactions = await _filtered_transactions(workspace_id, scope, start_date)

    grouped = defaultdict(lambda: {"income": 0.0, "expenses": 0.0})
    for item in transactions:
        category = item.get("category") or "Geral"
        amount = float(item.get("amount", 0))
        if item.get("type") == "income":
            grouped[category]["income"] += amount
        else:
            grouped[category]["expenses"] += amount

    rows = []
    for category, totals in sorted(grouped.items(), key=lambda pair: pair[1]["expenses"], reverse=True):
        rows.append(
            {
                "category": category,
                "income": round(totals["income"], 2),
                "expenses": round(totals["expenses"], 2),
                "balance": round(totals["income"] - totals["expenses"], 2),
            }
        )
    return {"categories": rows}


@router.get("/by-account")
async def report_by_account(
    workspace_id: str = Query(...),
    period: str = Query("30d"),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    start_date = datetime.utcnow() - timedelta(days=_period_days(period))
    transactions = await _filtered_transactions(workspace_id, scope, start_date)
    accounts = await accounts_collection.find({"workspace_id": workspace_id}).to_list(500)
    account_lookup = {account["id"]: account for account in accounts}

    grouped = defaultdict(lambda: {"income": 0.0, "expenses": 0.0, "count": 0})
    for item in transactions:
        account = account_lookup.get(item.get("account_id"))
        account_name = account.get("name") if account else "Sem conta vinculada"
        amount = float(item.get("amount", 0))
        grouped[account_name]["count"] += 1
        if item.get("type") == "income":
            grouped[account_name]["income"] += amount
        else:
            grouped[account_name]["expenses"] += amount

    rows = []
    for account_name, totals in grouped.items():
        rows.append(
            {
                "account": account_name,
                "income": round(totals["income"], 2),
                "expenses": round(totals["expenses"], 2),
                "balance": round(totals["income"] - totals["expenses"], 2),
                "transactions_count": totals["count"],
            }
        )

    rows.sort(key=lambda item: item["balance"], reverse=True)
    return {"accounts": rows}


@router.get("/cashflow")
async def cashflow_report(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    transactions = await _filtered_transactions(workspace_id, scope)

    open_bill_query = {
        "workspace_id": workspace_id,
        "status": {"$in": ["pending", "overdue"]},
    }
    if scope:
        open_bill_query["account_scope"] = scope
    open_bills = await bills_collection.find(open_bill_query).to_list(2000)

    current_balance = 0.0
    for item in transactions:
        amount = float(item.get("amount", 0))
        current_balance += amount if item.get("type") == "income" else -amount

    forecasts = []
    for days in (30, 60, 90):
        limit_date = datetime.utcnow() + timedelta(days=days)
        projected_income = 0.0
        projected_expenses = 0.0
        for bill in open_bills:
            due_date = _safe_date(bill.get("due_date"))
            if not due_date or due_date > limit_date:
                continue
            amount = float(bill.get("amount", 0))
            if bill.get("type") == "receivable":
                projected_income += amount
            else:
                projected_expenses += amount
        projected_balance = current_balance + projected_income - projected_expenses
        forecasts.append(
            {
                "days": days,
                "projected_income": round(projected_income, 2),
                "projected_expenses": round(projected_expenses, 2),
                "projected_balance": round(projected_balance, 2),
                "negative_alert": projected_balance < 0,
            }
        )

    evolution = []
    grouped = defaultdict(float)
    for item in transactions:
        month_key = (_safe_date(item.get("date")) or datetime.utcnow()).strftime("%Y-%m")
        amount = float(item.get("amount", 0))
        grouped[month_key] += amount if item.get("type") == "income" else -amount

    running_balance = 0.0
    for month_key in sorted(grouped.keys()):
        running_balance += grouped[month_key]
        evolution.append({"month": month_key, "balance": round(running_balance, 2)})

    return {
        "current_balance": round(current_balance, 2),
        "forecasts": forecasts,
        "evolution": evolution,
    }
