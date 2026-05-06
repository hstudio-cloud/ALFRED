from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from database import transactions_collection
from models import Transaction, TransactionCreate, TransactionUpdate
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


def _serialize(document: dict) -> dict:
    payload = dict(document)
    payload.pop("_id", None)
    return payload


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


def _period_start(period: Optional[str]) -> Optional[datetime]:
    if not period:
        return None
    mapping = {
        "7d": 7,
        "30d": 30,
        "60d": 60,
        "90d": 90,
        "6m": 180,
        "12m": 365,
    }
    days = mapping.get(period)
    if not days:
        return None
    return datetime.now(timezone.utc) - timedelta(days=days)


@router.get("")
async def list_transactions(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query(None),
    period: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    transaction_type: Optional[str] = Query(None),
    account_id: Optional[str] = Query(None),
    card_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    query = {"workspace_id": workspace_id}
    scope = _normalize_scope(account_scope)
    if scope:
        query["account_scope"] = scope
    if category:
        query["category"] = category
    if transaction_type:
        query["type"] = transaction_type
    if account_id:
        query["account_id"] = account_id
    if card_id:
        query["card_id"] = card_id
    if period_start := _period_start(period):
        query["date"] = {"$gte": period_start}
    if search:
        query["$or"] = [
            {"description": {"$regex": search, "$options": "i"}},
            {"category": {"$regex": search, "$options": "i"}},
        ]

    items = await transactions_collection.find(query).sort("date", -1).to_list(1000)
    return [_serialize(item) for item in items]


@router.post("")
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
        account_id=payload.account_id,
        card_id=payload.card_id,
        installment_number=payload.installment_number,
        installment_total=payload.installment_total,
        competency_date=payload.competency_date,
        date=payload.date or datetime.now(timezone.utc),
    )
    document = transaction.model_dump()
    document["workspace_id"] = workspace_id
    await transactions_collection.insert_one(document)
    return document


@router.put("/{transaction_id}")
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
        raise HTTPException(status_code=404, detail="Movimentacao nao encontrada")
    item = await transactions_collection.find_one({"id": transaction_id, "workspace_id": workspace_id})
    return _serialize(item)


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    result = await transactions_collection.delete_one({"id": transaction_id, "workspace_id": workspace_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Movimentacao nao encontrada")
    return {"deleted": True}
