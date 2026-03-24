from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Transaction, TransactionCreate, TransactionUpdate
from database import transactions_collection
from routes.auth_routes import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/finances", tags=["finances"])

@router.get("/transactions", response_model=List[Transaction])
async def get_transactions(current_user: dict = Depends(get_current_user)):
    """Listar todas as transações"""
    try:
        transactions = await transactions_collection.find(
            {"user_id": current_user["id"]}
        ).sort("date", -1).to_list(1000)
        return [Transaction(**t) for t in transactions]
    except Exception as e:
        logger.error(f"Error getting transactions: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar transações")

@router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    """Criar nova transação"""
    try:
        transaction = Transaction(
            user_id=current_user["id"],
            **transaction_data.dict()
        )
        await transactions_collection.insert_one(transaction.dict())
        return transaction
    except Exception as e:
        logger.error(f"Error creating transaction: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar transação")

@router.get("/summary")
async def get_summary(current_user: dict = Depends(get_current_user)):
    """Obter resumo financeiro"""
    try:
        transactions = await transactions_collection.find({"user_id": current_user["id"]}).to_list(1000)
        
        income = sum(t["amount"] for t in transactions if t["type"] == "income")
        expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        balance = income - expenses
        
        # Category breakdown
        categories = {}
        for t in transactions:
            cat = t["category"]
            if cat not in categories:
                categories[cat] = {"income": 0, "expense": 0}
            categories[cat][t["type"]] += t["amount"]
        
        return {
            "income": income,
            "expenses": expenses,
            "balance": balance,
            "categories": categories
        }
    except Exception as e:
        logger.error(f"Error getting financial summary: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar resumo financeiro")

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar transação"""
    try:
        result = await transactions_collection.delete_one(
            {"id": transaction_id, "user_id": current_user["id"]}
        )
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Transação não encontrada")
        return {"message": "Transação deletada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting transaction: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar transação")
