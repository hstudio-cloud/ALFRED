from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import Task, TaskCreate, TaskUpdate
from database import tasks_collection
from routes.auth_routes import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.get("", response_model=List[Task])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    """Listar todas as tarefas do usuário"""
    try:
        tasks = await tasks_collection.find({"user_id": current_user["id"]}).to_list(1000)
        return [Task(**task) for task in tasks]
    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar tarefas")

@router.post("", response_model=Task)
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    """Criar nova tarefa"""
    try:
        task = Task(
            user_id=current_user["id"],
            **task_data.dict()
        )
        await tasks_collection.insert_one(task.dict())
        return task
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar tarefa")

@router.get("/{task_id}", response_model=Task)
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Obter tarefa específica"""
    try:
        task = await tasks_collection.find_one({"id": task_id, "user_id": current_user["id"]})
        if not task:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        return Task(**task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar tarefa")

@router.put("/{task_id}", response_model=Task)
async def update_task(task_id: str, task_data: TaskUpdate, current_user: dict = Depends(get_current_user)):
    """Atualizar tarefa"""
    try:
        task = await tasks_collection.find_one({"id": task_id, "user_id": current_user["id"]})
        if not task:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        update_data = {k: v for k, v in task_data.dict().items() if v is not None}
        if update_data:
            await tasks_collection.update_one(
                {"id": task_id},
                {"$set": update_data}
            )
        
        updated_task = await tasks_collection.find_one({"id": task_id})
        return Task(**updated_task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar tarefa")

@router.delete("/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar tarefa"""
    try:
        result = await tasks_collection.delete_one({"id": task_id, "user_id": current_user["id"]})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        return {"message": "Tarefa deletada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar tarefa")

@router.patch("/{task_id}/complete", response_model=Task)
async def complete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Marcar tarefa como completa"""
    try:
        from datetime import datetime
        
        task = await tasks_collection.find_one({"id": task_id, "user_id": current_user["id"]})
        if not task:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        await tasks_collection.update_one(
            {"id": task_id},
            {"$set": {"status": "completed", "completed_at": datetime.utcnow()}}
        )
        
        updated_task = await tasks_collection.find_one({"id": task_id})
        return Task(**updated_task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao completar tarefa")
