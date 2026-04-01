from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
import logging

from routes.auth_routes import get_current_user
from routes.workspace_access import verify_workspace_access
from database import (
    tasks_collection,
    habits_collection,
    projects_collection,
    transactions_collection,
    bills_collection,
    reminders_collection,
)
from models import DashboardStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        await verify_workspace_access(workspace_id, current_user)

        tasks_completed = await tasks_collection.count_documents({
            "workspace_id": workspace_id,
            "status": "completed"
        })
        tasks_pending = await tasks_collection.count_documents({
            "workspace_id": workspace_id,
            "status": {"$in": ["pending", "todo", "in_progress", "review"]}
        })

        habits = await habits_collection.find({"user_id": current_user["id"]}).to_list(1000)
        habits_active = len(habits)
        habits_streak_avg = sum(h.get("streak", 0) for h in habits) / max(len(habits), 1)

        projects_active = await projects_collection.count_documents({
            "user_id": current_user["id"],
            "status": "active"
        })

        transactions = await transactions_collection.find({"workspace_id": workspace_id}).to_list(1000)
        income = sum(t["amount"] for t in transactions if t["type"] == "income")
        expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        finances_balance = income - expenses

        total_tasks = tasks_completed + tasks_pending
        productivity_score = int((tasks_completed / total_tasks) * 100) if total_tasks > 0 else 0

        return DashboardStats(
            tasks_completed=tasks_completed,
            tasks_pending=tasks_pending,
            habits_active=habits_active,
            habits_streak_avg=round(habits_streak_avg, 1),
            projects_active=projects_active,
            finances_balance=finances_balance,
            productivity_score=productivity_score
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")


@router.get("/insights")
async def get_insights(
    workspace_id: str = Query(...),
    current_user: dict = Depends(get_current_user),
):
    try:
        stats = await get_dashboard_stats(workspace_id=workspace_id, current_user=current_user)
        insights = []

        if stats.tasks_pending > 10:
            insights.append({
                "type": "warning",
                "message": f"Você tem {stats.tasks_pending} tarefas pendentes. Vale revisar prioridades operacionais."
            })

        if stats.finances_balance < 0:
            insights.append({
                "type": "warning",
                "message": f"O saldo consolidado está negativo em R$ {abs(stats.finances_balance):.2f}."
            })

        upcoming_bills = await bills_collection.count_documents({
            "workspace_id": workspace_id,
            "status": "pending",
            "due_date": {"$lte": datetime.utcnow() + timedelta(days=7)}
        })
        if upcoming_bills:
            insights.append({
                "type": "info",
                "message": f"Há {upcoming_bills} conta(s) vencendo nos próximos 7 dias."
            })

        active_reminders = await reminders_collection.count_documents({
            "workspace_id": workspace_id,
            "is_active": True
        })
        if active_reminders:
            insights.append({
                "type": "success",
                "message": f"{active_reminders} lembrete(s) ativo(s) ajudam a manter sua rotina financeira em dia."
            })

        if stats.productivity_score >= 80:
            insights.append({
                "type": "success",
                "message": f"Boa execução: produtividade operacional em {stats.productivity_score}%."
            })

        return {"insights": insights}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar insights")
