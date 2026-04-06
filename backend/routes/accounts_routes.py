from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from database import accounts_collection, cards_collection, transactions_collection
from models_extended import (
    CreditCard,
    CreditCardCreate,
    CreditCardUpdate,
    FinancialAccount,
    FinancialAccountCreate,
    FinancialAccountUpdate,
)
from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access

router = APIRouter(prefix="/api/accounts", tags=["accounts"])


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


async def _account_balance(workspace_id: str, account_id: str) -> float:
    cursor = transactions_collection.find({"workspace_id": workspace_id, "account_id": account_id})
    balance = 0.0
    async for transaction in cursor:
        amount = float(transaction.get("amount", 0))
        balance += amount if transaction.get("type") == "income" else -amount
    return balance


async def _card_summary(workspace_id: str, card_id: str) -> dict:
    cursor = transactions_collection.find({"workspace_id": workspace_id, "card_id": card_id})
    invoice_amount = 0.0
    installments_open = 0
    async for transaction in cursor:
        amount = float(transaction.get("amount", 0))
        if transaction.get("type") == "expense":
            invoice_amount += amount
        if transaction.get("installment_total") and transaction.get("installment_number"):
            if int(transaction["installment_number"]) < int(transaction["installment_total"]):
                installments_open += 1
    return {
        "invoice_amount": round(invoice_amount, 2),
        "installments_open": installments_open,
    }


@router.get("")
async def list_accounts(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    query = {"workspace_id": workspace_id}
    scope = _normalize_scope(account_scope)
    if scope:
        query["account_scope"] = scope

    accounts = await accounts_collection.find(query).sort("created_at", 1).to_list(200)
    payload = []
    for account in accounts:
        item = _serialize(account)
        balance = await _account_balance(workspace_id, item["id"])
        item["balance"] = round(float(item.get("initial_balance", 0)) + balance, 2)
        payload.append(item)
    return payload


@router.post("")
async def create_account(
    payload: FinancialAccountCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    account = FinancialAccount(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        name=payload.name,
        institution=payload.institution,
        account_type=payload.account_type,
        account_scope=payload.account_scope,
        initial_balance=payload.initial_balance,
        color=payload.color,
        active=payload.active,
    )
    await accounts_collection.insert_one(account.dict())
    response = account.dict()
    response["balance"] = account.initial_balance
    return response


@router.put("/{account_id}")
async def update_account(
    account_id: str,
    payload: FinancialAccountUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada")
    update_data["updated_at"] = datetime.utcnow()
    result = await accounts_collection.update_one(
        {"id": account_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    account = await accounts_collection.find_one({"id": account_id, "workspace_id": workspace_id})
    item = _serialize(account)
    balance = await _account_balance(workspace_id, item["id"])
    item["balance"] = round(float(item.get("initial_balance", 0)) + balance, 2)
    return item


@router.delete("/{account_id}")
async def delete_account(
    account_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    linked_transactions = await transactions_collection.count_documents(
        {"workspace_id": workspace_id, "account_id": account_id}
    )
    if linked_transactions:
        raise HTTPException(
            status_code=409,
            detail="Essa conta possui movimentacoes vinculadas. Realoque ou exclua as movimentacoes antes.",
        )
    result = await accounts_collection.delete_one({"id": account_id, "workspace_id": workspace_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Conta nao encontrada")
    await cards_collection.update_many(
        {"workspace_id": workspace_id, "linked_account_id": account_id},
        {"$set": {"linked_account_id": None, "updated_at": datetime.utcnow()}},
    )
    return {"deleted": True}


@router.get("/summary")
async def accounts_summary(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    accounts = await list_accounts(workspace_id=workspace_id, current_user=current_user)
    cards = await list_cards(workspace_id=workspace_id, current_user=current_user)
    personal_balance = sum(item["balance"] for item in accounts if item.get("account_scope") == "personal")
    business_balance = sum(item["balance"] for item in accounts if item.get("account_scope") == "business")
    return {
        "accounts_count": len(accounts),
        "cards_count": len(cards),
        "personal_balance": round(personal_balance, 2),
        "business_balance": round(business_balance, 2),
        "general_balance": round(personal_balance + business_balance, 2),
        "accounts": accounts,
        "cards": cards,
    }


@router.get("/cards")
async def list_cards(
    workspace_id: str = Query(...),
    account_scope: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    query = {"workspace_id": workspace_id}
    scope = _normalize_scope(account_scope)
    if scope:
        query["account_scope"] = scope

    cards = await cards_collection.find(query).sort("created_at", 1).to_list(200)
    payload = []
    for card in cards:
        item = _serialize(card)
        item.update(await _card_summary(workspace_id, item["id"]))
        payload.append(item)
    return payload


@router.post("/cards")
async def create_card(
    payload: CreditCardCreate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    card = CreditCard(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        name=payload.name,
        institution=payload.institution,
        brand=payload.brand,
        account_scope=payload.account_scope,
        limit_amount=payload.limit_amount,
        closing_day=payload.closing_day,
        due_day=payload.due_day,
        color=payload.color,
        linked_account_id=payload.linked_account_id,
        active=payload.active,
    )
    await cards_collection.insert_one(card.dict())
    response = card.dict()
    response.update({"invoice_amount": 0.0, "installments_open": 0})
    return response


@router.put("/cards/{card_id}")
async def update_card(
    card_id: str,
    payload: CreditCardUpdate,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    update_data = {key: value for key, value in payload.dict(exclude_none=True).items()}
    if not update_data:
        raise HTTPException(status_code=400, detail="Nenhuma alteracao enviada")
    update_data["updated_at"] = datetime.utcnow()
    result = await cards_collection.update_one(
        {"id": card_id, "workspace_id": workspace_id},
        {"$set": update_data},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail="Cartao nao encontrado")
    card = await cards_collection.find_one({"id": card_id, "workspace_id": workspace_id})
    item = _serialize(card)
    item.update(await _card_summary(workspace_id, item["id"]))
    return item


@router.delete("/cards/{card_id}")
async def delete_card(
    card_id: str,
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    await verify_workspace_access(workspace_id, current_user)
    linked_transactions = await transactions_collection.count_documents(
        {"workspace_id": workspace_id, "card_id": card_id}
    )
    if linked_transactions:
        raise HTTPException(
            status_code=409,
            detail="Esse cartao possui movimentacoes vinculadas. Realoque ou exclua as movimentacoes antes.",
        )
    result = await cards_collection.delete_one({"id": card_id, "workspace_id": workspace_id})
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Cartao nao encontrado")
    return {"deleted": True}
