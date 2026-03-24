from fastapi import APIRouter, HTTPException, Depends
from routes.auth_routes import get_current_user
from database import tasks_collection, habits_collection, projects_collection, transactions_collection
from models import DashboardStats
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    """Obter estatísticas do dashboard"""
    try:
        # Tasks stats
        tasks_completed = await tasks_collection.count_documents({
            "user_id": current_user["id"],
            "status": "completed"
        })
        tasks_pending = await tasks_collection.count_documents({
            "user_id": current_user["id"],
            "status": "pending"
        })
        
        # Habits stats
        habits = await habits_collection.find({"user_id": current_user["id"]}).to_list(1000)
        habits_active = len(habits)
        habits_streak_avg = sum(h.get("streak", 0) for h in habits) / max(len(habits), 1)
        
        # Projects stats
        projects_active = await projects_collection.count_documents({
            "user_id": current_user["id"],
            "status": "active"
        })
        
        # Finance stats
        transactions = await transactions_collection.find({"user_id": current_user["id"]}).to_list(1000)
        income = sum(t["amount"] for t in transactions if t["type"] == "income")
        expenses = sum(t["amount"] for t in transactions if t["type"] == "expense")
        finances_balance = income - expenses
        
        # Productivity score (simple calculation)
        total_tasks = tasks_completed + tasks_pending
        if total_tasks > 0:
            productivity_score = int((tasks_completed / total_tasks) * 100)
        else:
            productivity_score = 0
        
        return DashboardStats(
            tasks_completed=tasks_completed,
            tasks_pending=tasks_pending,
            habits_active=habits_active,
            habits_streak_avg=round(habits_streak_avg, 1),
            projects_active=projects_active,
            finances_balance=finances_balance,
            productivity_score=productivity_score
        )
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")

@router.get("/insights")
async def get_insights(current_user: dict = Depends(get_current_user)):
    """Obter insights e análises"""
    try:
        # Get stats
        stats = await get_dashboard_stats(current_user)
        
        insights = []
        
        # Task insights
        if stats.tasks_pending > 10:
            insights.append({
                "type": "warning",
                "message": f"Você tem {stats.tasks_pending} tarefas pendentes. Que tal priorizar as mais importantes?"
            })
        
        # Habit insights
        if stats.habits_streak_avg > 7:
            insights.append({
                "type": "success",
                "message": f"Parabéns! Sua média de streak é {stats.habits_streak_avg} dias. Continue assim!"
            })
        
        # Productivity insights
        if stats.productivity_score >= 80:
            insights.append({
                "type": "success",
                "message": f"Excelente! Sua produtividade está em {stats.productivity_score}%"
            })
        elif stats.productivity_score < 50:
            insights.append({
                "type": "info",
                "message": "Sua produtividade pode melhorar. Que tal definir metas menores?"
            })
        
        # Finance insights
        if stats.finances_balance < 0:
            insights.append({
                "type": "warning",
                "message": f"Atenção! Você está com saldo negativo de R$ {abs(stats.finances_balance):.2f}"
            })
        
        return {"insights": insights}
    except Exception as e:
        logger.error(f"Error getting insights: {e}")
        raise HTTPException(status_code=500, detail="Erro ao gerar insights")
