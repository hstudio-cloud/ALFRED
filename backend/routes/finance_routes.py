from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import logging

from database import (
    transactions_collection,
    categories_collection,
    bills_collection,
    reminders_collection,
    subscriptions_collection,
)
from models import Transaction, TransactionCreate
from models_extended import (
    FinancialCategory,
    FinancialCategoryCreate,
    FinancialCategoryUpdate,
    Bill,
    BillCreate,
    BillUpdate,
    ReminderFinancial,
    ReminderFinancialCreate,
    ReminderFinancialUpdate,
    SaasSubscription,
    SaasSubscriptionUpdate,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/finances", tags=["finances"])


def _parse_period(period: str):
    today = datetime.utcnow()
    if period == "7d":
        return today - timedelta(days=7)
    if period == "30d":
        return today - timedelta(days=30)
    if period == "90d":
        return today - timedelta(days=90)
    if period == "year":
        return today - timedelta(days=365)
    return None


@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    account_scope: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        query = {"workspace_id": workspace_id}
        if account_scope:
            query["account_scope"] = account_scope
        if transaction_type:
            query["type"] = transaction_type

        transactions = await transactions_collection.find(query).sort("date", -1).to_list(1000)
        return [Transaction(**t) for t in transactions]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar transações")


@router.post("/transactions", response_model=Transaction)
async def create_transaction(
    transaction_data: TransactionCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        payload = transaction_data.dict()
        transaction = Transaction(
            user_id=current_user["id"],
            **payload
        )
        doc = transaction.dict()
        doc["workspace_id"] = workspace_id
        await transactions_collection.insert_one(doc)
        return transaction
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar transação")


@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        result = await transactions_collection.delete_one(
            {"id": transaction_id, "workspace_id": workspace_id}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        return {"message": "Transação deletada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar transação")


@router.get("/summary")
async def get_summary(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        transactions = await transactions_collection.find({"workspace_id": workspace_id}).to_list(1000)

        income = sum(t["amount"] for t in transactions if t["type"] == "income")
        expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        balance = income - expenses

        categories = {}
        payment_methods = {}
        account_scopes = {
            "personal": {"income": 0, "expense": 0, "balance": 0},
            "business": {"income": 0, "expense": 0, "balance": 0},
        }

        for t in transactions:
            cat = t["category"]
            payment_method = t.get("payment_method", "other")
            account_scope = t.get("account_scope", "personal")

            if cat not in categories:
                categories[cat] = {"income": 0, "expense": 0}
            categories[cat][t["type"]] += t["amount"]

            if payment_method not in payment_methods:
                payment_methods[payment_method] = {"income": 0, "expense": 0}
            payment_methods[payment_method][t["type"]] += t["amount"]

            if account_scope not in account_scopes:
                account_scopes[account_scope] = {"income": 0, "expense": 0, "balance": 0}
            account_scopes[account_scope][t["type"]] += t["amount"]

        for scope in account_scopes.values():
            scope["balance"] = scope["income"] - scope["expense"]

        top_expense_categories = sorted(
            [
                {"category": category, "amount": totals["expense"]}
                for category, totals in categories.items()
                if totals["expense"] > 0
            ],
            key=lambda item: item["amount"],
            reverse=True
        )[:5]

        upcoming_bills = await bills_collection.count_documents(
            {
                "workspace_id": workspace_id,
                "status": "pending",
                "due_date": {"$lte": datetime.utcnow() + timedelta(days=7)}
            }
        )

        active_reminders = await reminders_collection.count_documents(
            {"workspace_id": workspace_id, "is_active": True}
        )

        return {
            "income": income,
            "expenses": expenses,
            "balance": balance,
            "categories": categories,
            "payment_methods": payment_methods,
            "account_scopes": account_scopes,
            "top_expense_categories": top_expense_categories,
            "transactions_count": len(transactions),
            "upcoming_bills": upcoming_bills,
            "active_reminders": active_reminders,
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting financial summary: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar resumo financeiro")


@router.get("/categories", response_model=List[FinancialCategory])
async def get_categories(workspace_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    try:
        await verify_workspace_access(workspace_id, current_user)
        categories = await categories_collection.find({"workspace_id": workspace_id}).sort("name", 1).to_list(500)
        return [FinancialCategory(**item) for item in categories]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting categories: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar categorias")


@router.post("/categories", response_model=FinancialCategory)
async def create_category(
    category_data: FinancialCategoryCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        category = FinancialCategory(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            **category_data.dict()
        )
        await categories_collection.insert_one(category.dict())
        return category
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating category: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar categoria")


@router.put("/categories/{category_id}", response_model=FinancialCategory)
async def update_category(
    category_id: str,
    category_data: FinancialCategoryUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        update_data = {k: v for k, v in category_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        await categories_collection.update_one(
            {"id": category_id, "workspace_id": workspace_id},
            {"$set": update_data}
        )
        category = await categories_collection.find_one({"id": category_id, "workspace_id": workspace_id})
        if not category:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return FinancialCategory(**category)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating category: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar categoria")


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        result = await categories_collection.delete_one({"id": category_id, "workspace_id": workspace_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Categoria não encontrada")
        return {"message": "Categoria removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting category: {e}")
        raise HTTPException(status_code=500, detail="Erro ao remover categoria")


@router.get("/bills", response_model=List[Bill])
async def get_bills(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        query = {"workspace_id": workspace_id}
        if status:
            query["status"] = status
        bills = await bills_collection.find(query).sort("due_date", 1).to_list(1000)
        for bill in bills:
            if bill.get("status") == "pending" and bill.get("due_date") < datetime.utcnow():
                bill["status"] = "overdue"
        return [Bill(**item) for item in bills]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting bills: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar contas")


@router.post("/bills", response_model=Bill)
async def create_bill(
    bill_data: BillCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        bill = Bill(workspace_id=workspace_id, user_id=current_user["id"], **bill_data.dict())
        await bills_collection.insert_one(bill.dict())
        return bill
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating bill: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar conta")


@router.put("/bills/{bill_id}", response_model=Bill)
async def update_bill(
    bill_id: str,
    bill_data: BillUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        update_data = {k: v for k, v in bill_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        await bills_collection.update_one(
            {"id": bill_id, "workspace_id": workspace_id},
            {"$set": update_data}
        )
        bill = await bills_collection.find_one({"id": bill_id, "workspace_id": workspace_id})
        if not bill:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        return Bill(**bill)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating bill: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar conta")


@router.delete("/bills/{bill_id}")
async def delete_bill(
    bill_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        result = await bills_collection.delete_one({"id": bill_id, "workspace_id": workspace_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Conta não encontrada")
        return {"message": "Conta removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting bill: {e}")
        raise HTTPException(status_code=500, detail="Erro ao remover conta")


@router.get("/reminders", response_model=List[ReminderFinancial])
async def get_reminders(workspace_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    try:
        await verify_workspace_access(workspace_id, current_user)
        reminders = await reminders_collection.find({"workspace_id": workspace_id}).sort("remind_at", 1).to_list(1000)
        return [ReminderFinancial(**item) for item in reminders]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting reminders: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar lembretes")


@router.post("/reminders", response_model=ReminderFinancial)
async def create_reminder(
    reminder_data: ReminderFinancialCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        reminder = ReminderFinancial(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            **reminder_data.dict()
        )
        await reminders_collection.insert_one(reminder.dict())
        return reminder
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar lembrete")


@router.put("/reminders/{reminder_id}", response_model=ReminderFinancial)
async def update_reminder(
    reminder_id: str,
    reminder_data: ReminderFinancialUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        update_data = {k: v for k, v in reminder_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        await reminders_collection.update_one(
            {"id": reminder_id, "workspace_id": workspace_id},
            {"$set": update_data}
        )
        reminder = await reminders_collection.find_one({"id": reminder_id, "workspace_id": workspace_id})
        if not reminder:
            raise HTTPException(status_code=404, detail="Lembrete não encontrado")
        return ReminderFinancial(**reminder)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar lembrete")


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        result = await reminders_collection.delete_one({"id": reminder_id, "workspace_id": workspace_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Lembrete não encontrado")
        return {"message": "Lembrete removido com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting reminder: {e}")
        raise HTTPException(status_code=500, detail="Erro ao remover lembrete")


@router.get("/reports/summary")
async def get_report_summary(
    workspace_id: str = Query(...),
    period: str = Query("30d"),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        start_date = _parse_period(period)
        transaction_query = {"workspace_id": workspace_id}
        bill_query = {"workspace_id": workspace_id}
        if start_date:
            transaction_query["date"] = {"$gte": start_date}
            bill_query["created_at"] = {"$gte": start_date}

        transactions = await transactions_collection.find(transaction_query).to_list(1000)
        bills = await bills_collection.find(bill_query).to_list(1000)

        income = sum(t["amount"] for t in transactions if t["type"] == "income")
        expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        payables = sum(b["amount"] for b in bills if b["type"] == "payable" and b["status"] in ["pending", "overdue"])
        receivables = sum(b["amount"] for b in bills if b["type"] == "receivable" and b["status"] in ["pending", "overdue"])

        by_category = {}
        for item in transactions:
            category = item.get("category", "Geral")
            by_category.setdefault(category, {"income": 0, "expense": 0})
            by_category[category][item["type"]] += item["amount"]

        savings_opportunity = 0
        top_expenses = sorted(
            [
                {"category": name, "amount": data["expense"]}
                for name, data in by_category.items()
                if data["expense"] > 0
            ],
            key=lambda x: x["amount"],
            reverse=True
        )
        if top_expenses:
            savings_opportunity = round(top_expenses[0]["amount"] * 0.1, 2)

        return {
            "period": period,
            "income": income,
            "expenses": expenses,
            "balance": income - expenses,
            "payables_open": payables,
            "receivables_open": receivables,
            "transactions_count": len(transactions),
            "bills_count": len(bills),
            "by_category": by_category,
            "top_expenses": top_expenses[:5],
            "savings_suggestion": {
                "estimated_value": savings_opportunity,
                "message": "A maior categoria de despesa pode ser o primeiro alvo de economia."
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report summary: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")


@router.get("/automation/insights")
async def get_automation_insights(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)
        transactions = await transactions_collection.find({"workspace_id": workspace_id}).to_list(500)
        bills = await bills_collection.find({"workspace_id": workspace_id}).to_list(500)

        insights = []
        overdue_bills = [bill for bill in bills if bill.get("status") == "overdue" or (bill.get("status") == "pending" and bill.get("due_date") < datetime.utcnow())]
        if overdue_bills:
            insights.append({
                "label": "Contas em atraso",
                "severity": "warning",
                "message": f"Você tem {len(overdue_bills)} conta(s) em atraso ou vencendo fora do prazo."
            })

        recurring_candidates = {}
        for transaction in transactions:
            key = (transaction.get("description") or transaction.get("category"), transaction.get("amount"))
            recurring_candidates[key] = recurring_candidates.get(key, 0) + 1
        repeated = [k for k, count in recurring_candidates.items() if count >= 3]
        if repeated:
            insights.append({
                "label": "Rotinas detectadas",
                "severity": "info",
                "message": "O Alfred encontrou gastos repetidos que podem virar categoria fixa ou conta recorrente."
            })

        negative_scopes = []
        summary = await get_summary(workspace_id=workspace_id, current_user=current_user)
        for scope, data in summary["account_scopes"].items():
            if data["balance"] < 0:
                negative_scopes.append(scope)
        if negative_scopes:
            insights.append({
                "label": "Escopo negativo",
                "severity": "warning",
                "message": f"O saldo está negativo em: {', '.join(negative_scopes)}."
            })

        if not insights:
            insights.append({
                "label": "Operação saudável",
                "severity": "success",
                "message": "Sem riscos críticos detectados agora. Continue alimentando a base para mais automações."
            })

        return {"insights": insights}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating automation insights: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar insights automáticos")


@router.get("/saas/subscription", response_model=SaasSubscription)
async def get_subscription(workspace_id: str = Query(...), current_user: dict = Depends(get_current_user)):
    try:
        await verify_workspace_access(workspace_id, current_user)
        subscription = await subscriptions_collection.find_one({"workspace_id": workspace_id})
        if not subscription:
            default = SaasSubscription(
                workspace_id=workspace_id,
                trial_ends_at=datetime.utcnow() + timedelta(days=14)
            )
            await subscriptions_collection.insert_one(default.dict())
            return default
        return SaasSubscription(**subscription)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting subscription: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar assinatura")


@router.put("/saas/subscription", response_model=SaasSubscription)
async def update_subscription(
    subscription_data: SaasSubscriptionUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        workspace = await verify_workspace_access(workspace_id, current_user)
        if workspace.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Apenas o dono pode alterar a assinatura")

        await get_subscription(workspace_id=workspace_id, current_user=current_user)
        update_data = {k: v for k, v in subscription_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        await subscriptions_collection.update_one(
            {"workspace_id": workspace_id},
            {"$set": update_data}
        )
        updated = await subscriptions_collection.find_one({"workspace_id": workspace_id})
        return SaasSubscription(**updated)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating subscription: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar assinatura")
