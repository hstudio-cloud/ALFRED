from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models_extended import TaskEnhanced, TaskUpdateEnhanced
from models import TaskCreate
from database import db
from routes.auth_routes import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/tasks-enhanced", tags=["tasks-enhanced"])

tasks_collection = db.tasks

async def verify_workspace_access(workspace_id: str, current_user: dict):
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user["id"] not in workspace.get("members", []) and workspace.get("owner_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return workspace

@router.get("", response_model=List[TaskEnhanced])
async def get_tasks_enhanced(
    workspace_id: str = Query(..., description="ID da empresa"),
    stage: Optional[str] = Query(None, description="Filtrar por estágio"),
    priority: Optional[str] = Query(None, description="Filtrar por prioridade"),
    current_user: dict = Depends(get_current_user)
):
    """Listar tarefas do workspace com filtros"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        query = {"workspace_id": workspace_id}
        
        if stage:
            query["stage"] = stage
        if priority:
            query["priority"] = priority
        
        tasks = await tasks_collection.find(query).sort("created_at", -1).to_list(1000)
        return [TaskEnhanced(**task) for task in tasks]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tasks: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar tarefas")

@router.post("", response_model=TaskEnhanced)
async def create_task_enhanced(
    workspace_id: str = Query(..., description="ID da empresa"),
    task_data: TaskCreate = None,
    current_user: dict = Depends(get_current_user)
):
    """Criar nova tarefa"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        task = TaskEnhanced(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            **task_data.dict()
        )
        await tasks_collection.insert_one(task.dict())
        return task
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar tarefa")

@router.put("/{task_id}", response_model=TaskEnhanced)
async def update_task_enhanced(
    task_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    task_data: TaskUpdateEnhanced = None,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar tarefa"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        task = await tasks_collection.find_one({"id": task_id, "workspace_id": workspace_id})
        if not task:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        update_data = {k: v for k, v in task_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        if update_data:
            await tasks_collection.update_one(
                {"id": task_id},
                {"$set": update_data}
            )
        
        updated_task = await tasks_collection.find_one({"id": task_id})
        return TaskEnhanced(**updated_task)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar tarefa")

@router.patch("/{task_id}/stage")
async def update_task_stage(
    task_id: str,
    stage: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Atualizar apenas o estágio da tarefa (para Kanban drag & drop)"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        task = await tasks_collection.find_one({"id": task_id, "workspace_id": workspace_id})
        if not task:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        await tasks_collection.update_one(
            {"id": task_id},
            {"$set": {"stage": stage, "updated_at": datetime.utcnow()}}
        )
        
        return {"message": "Estágio atualizado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating task stage: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar estágio")

@router.delete("/{task_id}")
async def delete_task_enhanced(
    task_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Deletar tarefa"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        result = await tasks_collection.delete_one({"id": task_id, "workspace_id": workspace_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Tarefa não encontrada")
        
        return {"message": "Tarefa deletada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting task: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar tarefa")

@router.get("/stats")
async def get_tasks_stats(
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Estatísticas das tarefas para gráficos"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        tasks = await tasks_collection.find({"workspace_id": workspace_id}).to_list(1000)
        
        # Stats por estágio
        stages = {"todo": 0, "in_progress": 0, "review": 0, "done": 0}
        for task in tasks:
            stage = task.get("stage", "todo")
            stages[stage] = stages.get(stage, 0) + 1
        
        # Stats por prioridade
        priorities = {"low": 0, "medium": 0, "high": 0, "urgent": 0}
        for task in tasks:
            priority = task.get("priority", "medium")
            priorities[priority] = priorities.get(priority, 0) + 1
        
        # Taxa de conclusão
        total = len(tasks)
        completed = sum(1 for t in tasks if t.get("status") == "completed")
        completion_rate = (completed / total * 100) if total > 0 else 0
        
        return {
            "stages": stages,
            "priorities": priorities,
            "total": total,
            "completed": completed,
            "completion_rate": round(completion_rate, 2)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting tasks stats: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar estatísticas")
