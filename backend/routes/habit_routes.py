from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Habit, HabitCreate, HabitUpdate
from database import habits_collection
from routes.auth_routes import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/habits", tags=["habits"])

@router.get("", response_model=List[Habit])
async def get_habits(current_user: dict = Depends(get_current_user)):
    """Listar todos os hábitos"""
    try:
        habits = await habits_collection.find({"user_id": current_user["id"]}).to_list(1000)
        return [Habit(**habit) for habit in habits]
    except Exception as e:
        logger.error(f"Error getting habits: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar hábitos")

@router.post("", response_model=Habit)
async def create_habit(habit_data: HabitCreate, current_user: dict = Depends(get_current_user)):
    """Criar novo hábito"""
    try:
        habit = Habit(
            user_id=current_user["id"],
            **habit_data.dict()
        )
        await habits_collection.insert_one(habit.dict())
        return habit
    except Exception as e:
        logger.error(f"Error creating habit: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar hábito")

@router.post("/{habit_id}/check", response_model=Habit)
async def check_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    """Marcar hábito como completo hoje"""
    try:
        habit = await habits_collection.find_one({"id": habit_id, "user_id": current_user["id"]})
        if not habit:
            raise HTTPException(status_code=404, detail="Hábito não encontrado")
        
        today = datetime.utcnow().date()
        completed_dates = habit.get("completed_dates", [])
        
        # Check if already completed today
        if any(d.date() == today for d in completed_dates):
            raise HTTPException(status_code=400, detail="Hábito já marcado hoje")
        
        # Add today to completed dates
        completed_dates.append(datetime.utcnow())
        
        # Update streak
        streak = habit.get("streak", 0) + 1
        
        await habits_collection.update_one(
            {"id": habit_id},
            {"$set": {"completed_dates": completed_dates, "streak": streak}}
        )
        
        updated_habit = await habits_collection.find_one({"id": habit_id})
        return Habit(**updated_habit)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking habit: {e}")
        raise HTTPException(status_code=500, detail="Erro ao marcar hábito")

@router.delete("/{habit_id}")
async def delete_habit(habit_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar hábito"""
    try:
        result = await habits_collection.delete_one({"id": habit_id, "user_id": current_user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Hábito não encontrado")
        return {"message": "Hábito deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting habit: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar hábito")
