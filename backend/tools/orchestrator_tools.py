import re
from datetime import datetime
from typing import Any, Dict, Optional

from database import categories_collection, reminders_collection, transactions_collection
from models import Transaction
from models_extended import FinancialCategory, ReminderFinancial

from .finance_tools import get_cashflow_forecast, get_month_expenses
from .web_tools import web_search


def _normalize_scope(scope: Optional[str]) -> str:
    normalized = (scope or "").strip().lower()
    if normalized in {"business", "empresa"}:
        return "business"
    if normalized in {"general", "geral", "all"}:
        return "general"
    return "personal"


def _normalize_label(value: Optional[str], fallback: str) -> str:
    text = " ".join((value or "").split()).strip()
    if not text:
        return fallback
    return " ".join(part.capitalize() for part in text.split())


async def create_transaction(
    *,
    workspace_id: str,
    user_id: str,
    amount: float,
    category: str,
    transaction_type: str = "expense",
    description: Optional[str] = None,
    payment_method: str = "other",
    account_scope: str = "personal",
) -> Dict[str, Any]:
    tx_type = "income" if transaction_type in {"income", "receita"} else "expense"
    scope = _normalize_scope(account_scope)

    transaction = Transaction(
        user_id=user_id,
        type=tx_type,
        category=(category or "Geral").strip().capitalize(),
        amount=float(amount),
        description=description,
        payment_method=(payment_method or "other").lower(),
        account_scope="personal" if scope == "general" else scope,
        date=datetime.utcnow(),
    )
    payload = transaction.dict()
    payload["workspace_id"] = workspace_id
    await transactions_collection.insert_one(payload)
    return payload


async def create_category(
    *,
    workspace_id: str,
    user_id: str,
    name: str,
    kind: str = "expense",
    color: str = "#ef4444",
    icon: Optional[str] = None,
    account_scope: str = "both",
) -> Dict[str, Any]:
    normalized_name = _normalize_label(name, "Geral")
    scope = (account_scope or "both").strip().lower()
    if scope not in {"personal", "business", "both"}:
        scope = "both"
    normalized_kind = (kind or "expense").strip().lower()
    if normalized_kind not in {"income", "expense", "both"}:
        normalized_kind = "expense"

    existing = await categories_collection.find_one(
        {
            "workspace_id": workspace_id,
            "name": {"$regex": rf"^{re.escape(normalized_name)}$", "$options": "i"},
        }
    )
    if existing:
        return {"status": "exists", **existing}

    category = FinancialCategory(
        workspace_id=workspace_id,
        user_id=user_id,
        name=normalized_name,
        kind=normalized_kind,
        color=color or "#ef4444",
        icon=icon,
        account_scope=scope,
    )
    payload = category.dict()
    await categories_collection.insert_one(payload)
    payload["status"] = "created"
    return payload


async def create_reminder(
    *,
    workspace_id: str,
    user_id: str,
    title: str,
    remind_at: str,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    parsed_date = _parse_datetime(remind_at)
    reminder = ReminderFinancial(
        workspace_id=workspace_id,
        user_id=user_id,
        title=(title or "Lembrete").strip(),
        remind_at=parsed_date,
        description=description,
    )
    payload = reminder.dict()
    await reminders_collection.insert_one(payload)
    return payload


async def get_cashflow(
    *,
    workspace_id: str,
    account_scope: Optional[str] = None,
) -> Dict[str, Any]:
    return await get_cashflow_forecast(workspace_id=workspace_id, scope=account_scope)


async def search_web(query: str) -> Dict[str, Any]:
    return await web_search(query)


async def search_internal_knowledge(query: str) -> Dict[str, Any]:
    text = (query or "").strip().lower()
    if not text:
        return {"items": [], "source": "internal_knowledge"}

    knowledge_base = [
        {
            "title": "Como registrar despesa",
            "keywords": ["despesa", "gasto", "registrar"],
            "content": "No Nano voce pode criar despesa por chat: 'criar despesa de 80 em combustivel'.",
        },
        {
            "title": "Como criar lembrete",
            "keywords": ["lembrete", "agenda", "vencimento"],
            "content": "Use 'criar lembrete pagar internet dia 10 as 09:00' para gerar um lembrete financeiro.",
        },
        {
            "title": "Fluxo de caixa e previsao",
            "keywords": ["fluxo", "caixa", "previsao", "saldo"],
            "content": "O Nano projeta saldo em 30, 60 e 90 dias com base em contas abertas e recorrencias.",
        },
        {
            "title": "Escopos pessoal, empresa e geral",
            "keywords": ["pessoal", "empresa", "geral", "escopo"],
            "content": "Use escopo pessoal para PF, empresa para PJ, e geral para consolidado.",
        },
    ]

    scored = []
    for item in knowledge_base:
        score = 0
        for keyword in item["keywords"]:
            if re.search(rf"\b{re.escape(keyword)}\b", text):
                score += 1
        if item["title"].lower() in text:
            score += 2
        if score > 0:
            scored.append({"score": score, **item})

    scored.sort(key=lambda row: row["score"], reverse=True)
    items = [{"title": row["title"], "content": row["content"]} for row in scored[:5]]
    return {"items": items, "source": "internal_knowledge"}


def _parse_datetime(value: str) -> datetime:
    if isinstance(value, datetime):
        return value
    text = (value or "").strip()
    if not text:
        return datetime.utcnow()
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        pass

    patterns = ["%d/%m/%Y %H:%M", "%d/%m/%Y", "%Y-%m-%d %H:%M", "%Y-%m-%d"]
    for fmt in patterns:
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            continue
    return datetime.utcnow()
