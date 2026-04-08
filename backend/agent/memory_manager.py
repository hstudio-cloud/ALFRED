from datetime import datetime
from typing import Any, Dict, List

from database import user_memories_collection


class AgentMemoryManager:
    """Layered memory: short-term chat + persisted user/workspace preferences."""

    async def load(self, user_id: str, workspace_id: str) -> Dict[str, Any]:
        profile = await user_memories_collection.find_one({"user_id": user_id}) or {}
        profile.pop("_id", None)

        prefs = profile.get("preferences") or {}
        workspace_prefs = (profile.get("workspace_preferences") or {}).get(workspace_id, {})
        recent_actions = profile.get("recent_actions") or []

        return {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "preferences": prefs,
            "workspace_preferences": workspace_prefs,
            "recent_actions": recent_actions[-15:],
        }

    async def remember(
        self,
        user_id: str,
        workspace_id: str,
        message: str,
        actions: List[Dict[str, Any]],
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        now = datetime.utcnow().isoformat()
        metadata = metadata or {}
        action_summaries = [
            {
                "type": action.get("type"),
                "status": action.get("status"),
                "at": now,
            }
            for action in actions
        ]

        update_doc = {
            "$setOnInsert": {"user_id": user_id},
            "$set": {"updated_at": now},
            "$push": {"recent_actions": {"$each": action_summaries, "$slice": -40}},
        }

        scope = metadata.get("scope")
        voice_id = metadata.get("voice_id")
        response_style = metadata.get("response_style")

        if scope:
            update_doc["$set"]["preferences.current_scope"] = scope
        if voice_id:
            update_doc["$set"][f"workspace_preferences.{workspace_id}.voice_id"] = voice_id
        if response_style:
            update_doc["$set"][f"workspace_preferences.{workspace_id}.response_style"] = response_style

        if message:
            update_doc["$set"][f"workspace_preferences.{workspace_id}.last_user_message"] = message

        await user_memories_collection.update_one({"user_id": user_id}, update_doc, upsert=True)

    async def recall_relevant(self, user_id: str, workspace_id: str) -> Dict[str, Any]:
        memory = await self.load(user_id, workspace_id)
        return {
            "current_scope": memory.get("preferences", {}).get("current_scope", "general"),
            "voice_id": memory.get("workspace_preferences", {}).get("voice_id"),
            "response_style": memory.get("workspace_preferences", {}).get("response_style", "concise"),
            "recent_actions": memory.get("recent_actions", [])[-8:],
        }

