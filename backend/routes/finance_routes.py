import logging
from calendar import monthrange
from datetime import datetime, timedelta
from io import BytesIO, StringIO
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from database import (
    bills_collection,
    categories_collection,
    reminders_collection,
    statement_imports_collection,
    transactions_collection,
)
from models import Transaction, TransactionCreate, TransactionUpdate
from models_extended import (
    AutomationInsight,
    Bill,
    BillCreate,
    BillUpdate,
    FinancialCategory,
    FinancialCategoryCreate,
    FinancialCategoryUpdate,
    ReminderFinancial,
    ReminderFinancialCreate,
    ReminderFinancialUpdate,
    StatementImport,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/finances", tags=["finances"])


def _serialize_document(document: dict) -> dict:
    payload = dict(document)
    payload.pop("_id", None)
    return payload


def _normalize_scope(account_scope: Optional[str]) -> Optional[str]:
    if not account_scope:
        return None
    normalized = account_scope.lower().strip()
    if normalized in {"geral", "general", "all"}:
        return None
    if normalized in {"pessoal", "personal"}:
        return "personal"
    if normalized in {"empresa", "business"}:
        return "business"
    return None


def _scope_label(account_scope: Optional[str]) -> str:
    normalized = _normalize_scope(account_scope)
    if normalized == "personal":
        return "pessoal"
    if normalized == "business":
        return "empresa"
    return "geral"


def _parse_period(period: str) -> timedelta:
    mapping = {
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "60d": timedelta(days=60),
        "90d": timedelta(days=90),
        "year": timedelta(days=365),
    }
    return mapping.get(period, timedelta(days=30))


def _safe_datetime(value) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return None


def _add_months(base_date: datetime, months: int, preferred_day: Optional[int] = None) -> datetime:
    month_index = base_date.month - 1 + months
    year = base_date.year + month_index // 12
    month = month_index % 12 + 1
    target_day = preferred_day or base_date.day
    last_day = monthrange(year, month)[1]
    return base_date.replace(year=year, month=month, day=min(target_day, last_day))


def _next_recurrence_date(due_date: datetime, recurrence_rule: Optional[str]) -> datetime:
    if not recurrence_rule:
        return _add_months(due_date, 1)

    rule = recurrence_rule.lower().strip()

    if "quinzen" in rule or "biweekly" in rule:
        return due_date + timedelta(days=15)
    if "seman" in rule or "weekly" in rule:
        return due_date + timedelta(days=7)
    if "anual" in rule or "yearly" in rule:
        return _add_months(due_date, 12)
    if "ultimo dia" in rule:
        next_month = _add_months(due_date.replace(day=1), 1)
        last_day = monthrange(next_month.year, next_month.month)[1]
        return next_month.replace(day=last_day)

    day_tokens = [token for token in rule.replace("/", " ").split() if token.isdigit()]
    target_day = int(day_tokens[0]) if day_tokens else due_date.day

    if "todo dia" in rule or "mensal" in rule or "monthly" in rule:
        return _add_months(due_date, 1, preferred_day=target_day)

    return _add_months(due_date, 1, preferred_day=target_day)


def _bill_status_for_read(bill: dict) -> dict:
    payload = _serialize_document(bill)
    due_date = _safe_datetime(payload.get("due_date"))
    if (
        payload.get("status") == "pending"
        and due_date
        and due_date < datetime.utcnow()
    ):
        payload["status"] = "overdue"
    return payload


def _monthly_category_totals(transactions: list[dict]) -> dict[str, float]:
    start_of_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    totals = {}
    for transaction in transactions:
        if transaction.get("type") != "expense":
            continue
        date_value = _safe_datetime(transaction.get("date")) or datetime.utcnow()
        if date_value < start_of_month:
            continue
        category = transaction.get("category") or "Geral"
        totals[category] = totals.get(category, 0) + float(transaction.get("amount", 0))
    return totals


def _project_balance(current_balance: float, open_bills: list[dict], days: int) -> dict:
    limit_date = datetime.utcnow() + timedelta(days=days)
    projected_income = 0.0
    projected_expenses = 0.0

    for bill in open_bills:
        due_date = _safe_datetime(bill.get("due_date"))
        if not due_date or due_date > limit_date:
            continue
        amount = float(bill.get("amount", 0))
        if bill.get("type") == "receivable":
            projected_income += amount
        else:
            projected_expenses += amount

    return {
        "days": days,
        "projected_balance": current_balance + projected_income - projected_expenses,
        "projected_income": projected_income,
        "projected_expenses": projected_expenses,
    }


def _infer_column(columns: list[str], aliases: list[str]) -> Optional[str]:
    normalized_map = {column.lower().strip(): column for column in columns}
    for alias in aliases:
        for column_name, original in normalized_map.items():
            if alias in column_name:
                return original
    return None


def _preview_statement_rows(dataframe) -> list[dict]:
    frame = dataframe.copy().fillna("")
    preview = frame.head(10).to_dict(orient="records")
    return [{str(key): value for key, value in row.items()} for row in preview]


@router.get("/transactions")
async def get_transactions(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    query = {"workspace_id": workspace_id}
    if scope:
        query["account_scope"] = scope
    items = await transactions_collection.find(query).sort("date", -1).to_list(500)
    return [_serialize_document(item) for item in items]


@router.post("/transactions")
async def create_transaction(
    payload: TransactionCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    transaction = Transaction(
        user_id=current_user["id"],
        type=payload.type,
        category=payload.category,
        amount=payload.amount,
        description=payload.description,
        payment_method=payload.payment_method,
        account_scope=payload.account_scope,
        date=payload.date or datetime.utcnow(),
    )
    document = transaction.dict()
    document["workspace_id"] = workspace_id
    await transactions_collection.insert_one(document)
    return document


@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada")
    result = await transactions_collection.update_one(
        {"id": transaction_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Transacao nao encontrada")
    updated = await transactions_collection.find_one({"id": transaction_id, "workspace_id": workspace_id})
    return _serialize_document(updated)


@router.get("/categories")
async def get_categories(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    query = {"workspace_id": workspace_id, "active": {"$ne": False}}
    if scope:
        query["$or"] = [{"account_scope": scope}, {"account_scope": "both"}]
    items = await categories_collection.find(query).sort("name", 1).to_list(200)
    return [_serialize_document(item) for item in items]


@router.post("/categories")
async def create_category(
    payload: FinancialCategoryCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    category = FinancialCategory(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        name=payload.name,
        kind=payload.kind,
        color=payload.color,
        icon=payload.icon,
        account_scope=payload.account_scope,
    )
    await categories_collection.insert_one(category.dict())
    return category.dict()


@router.put("/categories/{category_id}")
async def update_category(
    category_id: str,
    payload: FinancialCategoryUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    result = await categories_collection.update_one(
        {"id": category_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Categoria nao encontrada")
    item = await categories_collection.find_one({"id": category_id, "workspace_id": workspace_id})
    return _serialize_document(item)


@router.get("/bills")
async def get_bills(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    query = {"workspace_id": workspace_id}
    if scope:
        query["account_scope"] = scope
    items = await bills_collection.find(query).sort("due_date", 1).to_list(500)
    return [_bill_status_for_read(item) for item in items]


@router.post("/bills")
async def create_bill(
    payload: BillCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    bill = Bill(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        title=payload.title,
        amount=payload.amount,
        type=payload.type,
        due_date=payload.due_date,
        category=payload.category,
        payment_method=payload.payment_method,
        account_scope=payload.account_scope,
        description=payload.description,
        client_name=payload.client_name,
        recurring=payload.recurring,
        recurrence_rule=payload.recurrence_rule,
    )
    await bills_collection.insert_one(bill.dict())
    return bill.dict()


@router.put("/bills/{bill_id}")
async def update_bill(
    bill_id: str,
    payload: BillUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    result = await bills_collection.update_one(
        {"id": bill_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    item = await bills_collection.find_one({"id": bill_id, "workspace_id": workspace_id})
    return _bill_status_for_read(item)


@router.post("/bills/generate-recurring")
async def generate_recurring_bills(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)

    base_bills = await bills_collection.find(
        {"workspace_id": workspace_id, "recurring": True}
    ).to_list(500)

    created = 0
    horizon_limit = datetime.utcnow() + timedelta(days=45)

    for base_bill in base_bills:
        source_due = _safe_datetime(base_bill.get("due_date")) or datetime.utcnow()
        candidate_due = _next_recurrence_date(source_due, base_bill.get("recurrence_rule"))
        while candidate_due <= horizon_limit:
            exists = await bills_collection.find_one(
                {
                    "workspace_id": workspace_id,
                    "title": base_bill.get("title"),
                    "type": base_bill.get("type"),
                    "amount": base_bill.get("amount"),
                    "due_date": candidate_due,
                }
            )
            if not exists:
                new_bill = dict(base_bill)
                new_bill.pop("_id", None)
                new_bill["id"] = Bill(
                    workspace_id=workspace_id,
                    user_id=current_user["id"],
                    title=base_bill.get("title"),
                    amount=float(base_bill.get("amount", 0)),
                    type=base_bill.get("type", "payable"),
                    due_date=candidate_due,
                    category=base_bill.get("category", "Geral"),
                ).id
                new_bill["due_date"] = candidate_due
                new_bill["status"] = "pending"
                new_bill["created_at"] = datetime.utcnow()
                new_bill["updated_at"] = datetime.utcnow()
                await bills_collection.insert_one(new_bill)
                created += 1
            candidate_due = _next_recurrence_date(candidate_due, base_bill.get("recurrence_rule"))

    return {"created": created}


@router.get("/reminders")
async def get_reminders(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await reminders_collection.find({"workspace_id": workspace_id}).sort("remind_at", 1).to_list(500)
    return [_serialize_document(item) for item in items]


@router.post("/reminders")
async def create_reminder(
    payload: ReminderFinancialCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    reminder = ReminderFinancial(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        title=payload.title,
        remind_at=payload.remind_at,
        description=payload.description,
        linked_type=payload.linked_type,
        linked_id=payload.linked_id,
    )
    await reminders_collection.insert_one(reminder.dict())
    return reminder.dict()


@router.put("/reminders/{reminder_id}")
async def update_reminder(
    reminder_id: str,
    payload: ReminderFinancialUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    update_data["updated_at"] = datetime.utcnow()
    result = await reminders_collection.update_one(
        {"id": reminder_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Lembrete nao encontrado")
    item = await reminders_collection.find_one({"id": reminder_id, "workspace_id": workspace_id})
    return _serialize_document(item)


@router.get("/summary")
async def get_summary(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    transaction_query = {"workspace_id": workspace_id}
    bill_query = {"workspace_id": workspace_id}
    if scope:
        transaction_query["account_scope"] = scope
        bill_query["account_scope"] = scope

    transactions = await transactions_collection.find(transaction_query).to_list(2000)
    bills = await bills_collection.find(bill_query).to_list(1000)
    reminders = await reminders_collection.count_documents({"workspace_id": workspace_id, "is_active": True})

    income = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "income")
    expenses = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "expense")
    upcoming_limit = datetime.utcnow() + timedelta(days=7)
    upcoming_bills = 0
    for item in bills:
        due_date = _safe_datetime(item.get("due_date"))
        if item.get("status", "pending") == "pending" and due_date and due_date <= upcoming_limit:
            upcoming_bills += 1

    return {
        "account_scope": scope or "general",
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "transactions_count": len(transactions),
        "bills_count": len(bills),
        "upcoming_bills": upcoming_bills,
        "active_reminders": reminders,
    }


@router.get("/reports/summary")
async def get_report_summary(
    workspace_id: str = Query(...),
    period: str = Query("30d"),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    start_date = datetime.utcnow() - _parse_period(period)

    transaction_query = {"workspace_id": workspace_id, "date": {"$gte": start_date}}
    bill_query = {"workspace_id": workspace_id}
    if scope:
        transaction_query["account_scope"] = scope
        bill_query["account_scope"] = scope

    transactions = await transactions_collection.find(transaction_query).to_list(2000)
    bills = await bills_collection.find(bill_query).to_list(1000)

    income = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "income")
    expenses = sum(float(item.get("amount", 0)) for item in transactions if item.get("type") == "expense")

    category_totals = {}
    for item in transactions:
        if item.get("type") != "expense":
            continue
        category = item.get("category") or "Geral"
        category_totals[category] = category_totals.get(category, 0) + float(item.get("amount", 0))

    top_expenses = [
        {"category": category, "amount": amount}
        for category, amount in sorted(category_totals.items(), key=lambda pair: pair[1], reverse=True)[:5]
    ]

    payables_open = sum(
        float(item.get("amount", 0))
        for item in bills
        if item.get("type") == "payable" and item.get("status", "pending") in {"pending", "overdue"}
    )
    receivables_open = sum(
        float(item.get("amount", 0))
        for item in bills
        if item.get("type") == "receivable" and item.get("status", "pending") in {"pending", "overdue"}
    )

    if top_expenses:
        strongest = top_expenses[0]
        savings_message = (
            f"A categoria {strongest['category']} lidera suas saidas no recorte {period}. "
            f"Revise esse grupo primeiro para buscar economia mais rapida."
        )
        estimated_value = strongest["amount"] * 0.12
    else:
        savings_message = "Ainda nao ha volume suficiente para uma leitura forte de economia."
        estimated_value = 0.0

    return {
        "period": period,
        "account_scope": scope or "general",
        "income": income,
        "expenses": expenses,
        "balance": income - expenses,
        "transactions_count": len(transactions),
        "bills_count": len(bills),
        "payables_open": payables_open,
        "receivables_open": receivables_open,
        "top_expenses": top_expenses,
        "savings_suggestion": {
            "message": savings_message,
            "estimated_value": round(estimated_value, 2),
        },
    }


@router.get("/forecast")
async def get_forecast(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    summary = await get_summary(workspace_id=workspace_id, account_scope=account_scope, current_user=current_user)
    scope = _normalize_scope(account_scope)
    bill_query = {
        "workspace_id": workspace_id,
        "status": {"$in": ["pending", "overdue"]},
    }
    if scope:
        bill_query["account_scope"] = scope
    open_bills = await bills_collection.find(bill_query).to_list(1000)

    forecasts = [
        _project_balance(summary["balance"], open_bills, days)
        for days in (30, 60, 90)
    ]
    return {"account_scope": scope or "general", "forecasts": forecasts}


@router.get("/automation/insights")
async def get_automation_insights(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    scope = _normalize_scope(account_scope)
    scope_name = _scope_label(account_scope)

    transaction_query = {"workspace_id": workspace_id}
    bill_query = {"workspace_id": workspace_id}
    if scope:
        transaction_query["account_scope"] = scope
        bill_query["account_scope"] = scope

    transactions = await transactions_collection.find(transaction_query).to_list(2000)
    bills = await bills_collection.find(bill_query).to_list(1000)
    summary = await get_summary(workspace_id=workspace_id, account_scope=account_scope, current_user=current_user)
    forecast = await get_forecast(workspace_id=workspace_id, account_scope=account_scope, current_user=current_user)

    insights: list[AutomationInsight] = []

    overdue_bills = [
        bill for bill in bills
        if bill.get("status", "pending") == "pending"
        and (_safe_datetime(bill.get("due_date")) or datetime.utcnow()) < datetime.utcnow()
    ]
    overdue_total = sum(float(item.get("amount", 0)) for item in overdue_bills)
    if overdue_bills:
        insights.append(
            AutomationInsight(
                label="Risco de atraso financeiro",
                severity="warning",
                message=(
                    f"Voce tem {len(overdue_bills)} conta(s) vencida(s) na visao {scope_name}, "
                    f"somando R$ {overdue_total:.2f}. Priorize esse bloco agora para nao contaminar o caixa."
                ),
            )
        )

    monthly_categories = _monthly_category_totals(transactions)
    monthly_expenses_total = sum(monthly_categories.values())
    if monthly_categories and monthly_expenses_total > 0:
        top_category, top_category_value = max(monthly_categories.items(), key=lambda pair: pair[1])
        top_share = top_category_value / monthly_expenses_total
        if top_share >= 0.35:
            insights.append(
                AutomationInsight(
                    label="Categoria pressionando o mes",
                    severity="warning",
                    message=(
                        f"{top_category} ja consome {top_share * 100:.0f}% das despesas do mes na visao {scope_name}. "
                        f"Esse grupo esta forte demais e merece corte imediato ou renegociacao."
                    ),
                )
            )

    fixed_expenses = [
        bill for bill in bills
        if bill.get("type") == "payable" and bill.get("recurring")
    ]
    fixed_total = sum(float(item.get("amount", 0)) for item in fixed_expenses)
    if fixed_total and summary["expenses"] > 0:
        fixed_share = fixed_total / max(summary["expenses"], 1)
        if fixed_share >= 0.45:
            insights.append(
                AutomationInsight(
                    label="Custos fixos subindo",
                    severity="warning",
                    message=(
                        f"Os compromissos recorrentes representam {fixed_share * 100:.0f}% das saidas da visao {scope_name}. "
                        f"Isso reduz sua margem de manobra e pede revisao dos contratos mais pesados."
                    ),
                )
            )

    negative_forecast = next((item for item in forecast["forecasts"] if item["projected_balance"] < 0), None)
    if negative_forecast:
        insights.append(
            AutomationInsight(
                label="Risco de saldo negativo",
                severity="warning",
                message=(
                    f"Na projeção de {negative_forecast['days']} dias, o saldo pode ficar em "
                    f"R$ {negative_forecast['projected_balance']:.2f}. Segure novas despesas e antecipe entradas."
                ),
            )
        )

    next_seven_days = datetime.utcnow() + timedelta(days=7)
    urgent_upcoming = [
        bill for bill in bills
        if bill.get("status", "pending") == "pending"
        and (_safe_datetime(bill.get("due_date")) or next_seven_days) <= next_seven_days
    ]
    if len(urgent_upcoming) >= 3:
        urgent_total = sum(float(item.get("amount", 0)) for item in urgent_upcoming)
        insights.append(
            AutomationInsight(
                label="Semana carregada de vencimentos",
                severity="info",
                message=(
                    f"Ha {len(urgent_upcoming)} contas vencendo nos proximos 7 dias na visao {scope_name}, "
                    f"somando R$ {urgent_total:.2f}. Vale organizar a ordem dos pagamentos hoje."
                ),
            )
        )

    if not insights:
        insights.append(
            AutomationInsight(
                label="Operacao sob controle",
                severity="success",
                message=(
                    f"Nao apareceu nenhum risco forte na visao {scope_name}. O Alfred segue monitorando categorias, recorrencias e caixa."
                ),
            )
        )

    return {"insights": [item.dict() for item in insights]}


@router.post("/import-statement")
async def import_statement(
    file: UploadFile = File(...),
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query("general"),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)

    try:
        import pandas as pd
    except ModuleNotFoundError:
        raise HTTPException(
            status_code=503,
            detail="A leitura de extrato ainda nao esta disponivel neste ambiente porque a dependencia pandas nao foi instalada.",
        )

    raw_bytes = await file.read()
    extension = (file.filename or "").lower().split(".")[-1]
    scope = _normalize_scope(account_scope) or "general"

    if extension == "pdf":
        statement_import = StatementImport(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            file_name=file.filename or "extrato.pdf",
            file_type="pdf",
            status="pending_manual_review",
            account_scope=scope,
            row_count=0,
            preview_rows=[],
            notes="Leitura automatica de PDF iniciada. Nesta fase, o Alfred salva o arquivo como importacao pendente para revisao manual.",
        )
        await statement_imports_collection.insert_one(statement_import.dict())
        return statement_import.dict()

    try:
        if extension in {"xlsx", "xls"}:
            dataframe = pd.read_excel(BytesIO(raw_bytes))
        elif extension == "csv":
            decoded = None
            for encoding in ("utf-8", "latin-1"):
                try:
                    decoded = raw_bytes.decode(encoding)
                    break
                except UnicodeDecodeError:
                    continue
            if decoded is None:
                raise ValueError("Nao consegui decodificar o CSV")
            dataframe = pd.read_csv(StringIO(decoded), sep=None, engine="python")
        else:
            raise HTTPException(status_code=400, detail="Formato nao suportado. Envie CSV, XLSX, XLS ou PDF.")
    except HTTPException:
        raise
    except Exception as error:
        logger.error("Erro ao ler extrato: %s", error)
        raise HTTPException(status_code=400, detail="Nao consegui interpretar o arquivo enviado")

    preview_rows = _preview_statement_rows(dataframe)
    date_column = _infer_column(list(dataframe.columns), ["data", "date"])
    description_column = _infer_column(list(dataframe.columns), ["descricao", "hist", "memo", "description"])
    amount_column = _infer_column(list(dataframe.columns), ["valor", "amount", "debito", "credito"])

    notes = []
    if date_column:
        notes.append(f"coluna de data detectada: {date_column}")
    if description_column:
        notes.append(f"coluna de descricao detectada: {description_column}")
    if amount_column:
        notes.append(f"coluna de valor detectada: {amount_column}")

    statement_import = StatementImport(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        file_name=file.filename or f"extrato.{extension}",
        file_type=extension,
        status="parsed",
        account_scope=scope,
        row_count=len(dataframe.index),
        preview_rows=preview_rows,
        notes="; ".join(notes) or "Leitura inicial concluida. Revise o preview antes da importacao completa.",
    )
    await statement_imports_collection.insert_one(statement_import.dict())
    return statement_import.dict()


@router.get("/imports")
async def get_statement_imports(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    items = await statement_imports_collection.find({"workspace_id": workspace_id}).sort("created_at", -1).to_list(20)
    return [_serialize_document(item) for item in items]
