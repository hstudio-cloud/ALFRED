from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models_extended import Workspace, WorkspaceCreate, WorkspaceUpdate
from database import db
from routes.auth_routes import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])

workspaces_collection = db.workspaces

@router.get("", response_model=List[Workspace])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    """Listar workspaces do usuário"""
    try:
        # Get workspaces where user is owner or member
        workspaces = await workspaces_collection.find({
            "$or": [
                {"owner_id": current_user["id"]},
                {"members": current_user["id"]}
            ]
        }).to_list(1000)
        return [Workspace(**ws) for ws in workspaces]
    except Exception as e:
        logger.error(f"Error getting workspaces: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar empresas")

@router.post("", response_model=Workspace)
async def create_workspace(workspace_data: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    """Criar novo workspace"""
    try:
        workspace = Workspace(
            **workspace_data.dict(),
            owner_id=current_user["id"],
            members=[current_user["id"]]
        )
        await workspaces_collection.insert_one(workspace.dict())
        return workspace
    except Exception as e:
        logger.error(f"Error creating workspace: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar empresa")

@router.get("/{workspace_id}", response_model=Workspace)
async def get_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Obter workspace específico"""
    try:
        workspace = await workspaces_collection.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        # Check if user has access
        if current_user["id"] not in workspace.get("members", []) and workspace.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Acesso negado")
        
        return Workspace(**workspace)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting workspace: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar empresa")

@router.put("/{workspace_id}", response_model=Workspace)
async def update_workspace(workspace_id: str, workspace_data: WorkspaceUpdate, current_user: dict = Depends(get_current_user)):
    """Atualizar workspace"""
    try:
        workspace = await workspaces_collection.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        # Only owner can update
        if workspace.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Apenas o dono pode atualizar")
        
        update_data = {k: v for k, v in workspace_data.dict().items() if v is not None}
        if update_data:
            await workspaces_collection.update_one(
                {"id": workspace_id},
                {"$set": update_data}
            )
        
        updated_workspace = await workspaces_collection.find_one({"id": workspace_id})
        return Workspace(**updated_workspace)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating workspace: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar empresa")

@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Deletar workspace"""
    try:
        workspace = await workspaces_collection.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        # Only owner can delete
        if workspace.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Apenas o dono pode deletar")
        
        await workspaces_collection.delete_one({"id": workspace_id})
        return {"message": "Empresa deletada com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting workspace: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar empresa")

@router.post("/{workspace_id}/members/{user_email}")
async def add_member(workspace_id: str, user_email: str, current_user: dict = Depends(get_current_user)):
    """Adicionar membro ao workspace"""
    try:
        workspace = await workspaces_collection.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Empresa não encontrada")
        
        # Only owner can add members
        if workspace.get("owner_id") != current_user["id"]:
            raise HTTPException(status_code=403, detail="Apenas o dono pode adicionar membros")
        
        # Find user by email
        from database import users_collection
        user = await users_collection.find_one({"email": user_email})
        if not user:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        
        # Add to members if not already
        if user["id"] not in workspace.get("members", []):
            await workspaces_collection.update_one(
                {"id": workspace_id},
                {"$push": {"members": user["id"]}}
            )
        
        return {"message": "Membro adicionado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error adding member: {e}")
        raise HTTPException(status_code=500, detail="Erro ao adicionar membro")
