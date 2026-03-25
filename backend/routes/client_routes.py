from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from models_extended import Client, ClientCreate, ClientUpdate, ClientActivity
from database import db
from routes.auth_routes import get_current_user
from datetime import datetime
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/clients", tags=["clients"])

clients_collection = db.clients
activities_collection = db.client_activities

async def verify_workspace_access(workspace_id: str, current_user: dict):
    """Verificar se usuário tem acesso ao workspace"""
    from database import db
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    
    if current_user["id"] not in workspace.get("members", []) and workspace.get("owner_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return workspace

@router.get("", response_model=List[Client])
async def get_clients(
    workspace_id: str = Query(..., description="ID da empresa"),
    search: Optional[str] = Query(None, description="Buscar por nome, email ou telefone"),
    status: Optional[str] = Query(None, description="Filtrar por status"),
    current_user: dict = Depends(get_current_user)
):
    """Listar clientes do workspace"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        # Build query
        query = {"workspace_id": workspace_id}
        
        if search:
            query["$or"] = [
                {"name": {"$regex": search, "$options": "i"}},
                {"email": {"$regex": search, "$options": "i"}},
                {"phone": {"$regex": search, "$options": "i"}}
            ]
        
        if status:
            query["status"] = status
        
        clients = await clients_collection.find(query).sort("created_at", -1).to_list(1000)
        return [Client(**client) for client in clients]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting clients: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar clientes")

@router.post("", response_model=Client)
async def create_client(
    workspace_id: str = Query(..., description="ID da empresa"),
    client_data: ClientCreate = None,
    current_user: dict = Depends(get_current_user)
):
    """Criar novo cliente"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        client = Client(
            workspace_id=workspace_id,
            user_id=current_user["id"],
            **client_data.dict()
        )
        await clients_collection.insert_one(client.dict())
        
        # Log activity
        activity = ClientActivity(
            workspace_id=workspace_id,
            client_id=client.id,
            user_id=current_user["id"],
            activity_type="created",
            description=f"Cliente {client.name} foi criado"
        )
        await activities_collection.insert_one(activity.dict())
        
        return client
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating client: {e}")
        raise HTTPException(status_code=500, detail="Erro ao criar cliente")

@router.get("/{client_id}", response_model=Client)
async def get_client(
    client_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Obter cliente específico"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        client = await clients_collection.find_one({"id": client_id, "workspace_id": workspace_id})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        return Client(**client)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar cliente")

@router.put("/{client_id}", response_model=Client)
async def update_client(
    client_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    client_data: ClientUpdate = None,
    current_user: dict = Depends(get_current_user)
):
    """Atualizar cliente"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        client = await clients_collection.find_one({"id": client_id, "workspace_id": workspace_id})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        update_data = {k: v for k, v in client_data.dict().items() if v is not None}
        update_data["updated_at"] = datetime.utcnow()
        
        if update_data:
            await clients_collection.update_one(
                {"id": client_id},
                {"$set": update_data}
            )
            
            # Log activity
            activity = ClientActivity(
                workspace_id=workspace_id,
                client_id=client_id,
                user_id=current_user["id"],
                activity_type="updated",
                description=f"Cliente foi atualizado"
            )
            await activities_collection.insert_one(activity.dict())
        
        updated_client = await clients_collection.find_one({"id": client_id})
        return Client(**updated_client)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client: {e}")
        raise HTTPException(status_code=500, detail="Erro ao atualizar cliente")

@router.delete("/{client_id}")
async def delete_client(
    client_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Deletar cliente"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        result = await clients_collection.delete_one({"id": client_id, "workspace_id": workspace_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
        # Log activity
        activity = ClientActivity(
            workspace_id=workspace_id,
            client_id=client_id,
            user_id=current_user["id"],
            activity_type="deleted",
            description="Cliente foi deletado"
        )
        await activities_collection.insert_one(activity.dict())
        
        return {"message": "Cliente deletado com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting client: {e}")
        raise HTTPException(status_code=500, detail="Erro ao deletar cliente")

@router.get("/{client_id}/history", response_model=List[ClientActivity])
async def get_client_history(
    client_id: str,
    workspace_id: str = Query(..., description="ID da empresa"),
    current_user: dict = Depends(get_current_user)
):
    """Obter histórico de atividades do cliente"""
    try:
        await verify_workspace_access(workspace_id, current_user)
        
        activities = await activities_collection.find(
            {"client_id": client_id, "workspace_id": workspace_id}
        ).sort("created_at", -1).to_list(1000)
        
        return [ClientActivity(**activity) for activity in activities]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting client history: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar histórico")
