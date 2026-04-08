from typing import Any, Dict, List, Optional

from nano_ai import NanoCoordinator


class AssistantActionService:
    """Bridges orchestrator action contract with existing Nano action runner."""

    def __init__(self, api_key: Optional[str] = None):
        self.coordinator = NanoCoordinator(api_key=api_key or "")

    async def detect_actions_from_text(self, user_id: str, message: str) -> Dict[str, Any]:
        parsed = await self.coordinator.process_message(
            user_id=user_id,
            message=message,
            conversation_history=[],
            memory_profile={},
        )
        return {
            "actions": parsed.get("actions", []),
            "fallback_response": parsed.get("response", ""),
            "specialists_used": parsed.get("specialists_used", []),
        }

    async def execute_actions(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        return await self.coordinator.gateway.execute_actions(
            workspace_id=workspace_id,
            current_user=current_user,
            actions=actions,
        )

