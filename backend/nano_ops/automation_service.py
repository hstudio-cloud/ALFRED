from __future__ import annotations

from typing import Dict, List

from models_extended import NanoAutomationConfigUpdate
from services.nano_automation_service import NanoAutomationService

automation_service = NanoAutomationService()


async def get_workspace_automations(*, workspace_id: str) -> List[Dict]:
    return await automation_service.list_workspace_automations(workspace_id=workspace_id)


async def update_workspace_automation(
    *,
    workspace_id: str,
    user_id: str,
    automation_key: str,
    payload: NanoAutomationConfigUpdate,
) -> Dict:
    return await automation_service.update_workspace_automation(
        workspace_id=workspace_id,
        user_id=user_id,
        automation_key=automation_key,
        payload=payload,
    )
