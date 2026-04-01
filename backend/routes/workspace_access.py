from fastapi import HTTPException
from database import db


async def verify_workspace_access(workspace_id: str, current_user: dict):
    workspace = await db.workspaces.find_one({"id": workspace_id})
    if not workspace:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if current_user["id"] not in workspace.get("members", []) and workspace.get("owner_id") != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")

    return workspace
