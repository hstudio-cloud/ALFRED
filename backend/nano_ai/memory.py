from datetime import datetime
from typing import Any, Dict, List, Optional

from database import user_memories_collection


class NanoMemoryManager:
    """Owns persistent memory rules for users and workspaces.

    This layer should eventually be the only place that knows how
    Nano stores preferences, recent patterns, summaries, and inferred defaults.
    """

    def summarize_profile(self, memory_profile: Optional[Dict[str, Any]]) -> str:
        if not memory_profile:
            return "Nenhuma preferencia persistida."

        preferences = memory_profile.get("preferences", {})
        recents = memory_profile.get("recent_patterns", [])
        facts: List[str] = []

        if preferences.get("payment_method"):
            facts.append(f"metodo favorito: {preferences['payment_method']}")
        if preferences.get("account_scope"):
            facts.append(f"escopo mais comum: {preferences['account_scope']}")
        if preferences.get("category"):
            facts.append(f"categoria frequente: {preferences['category']}")
        if preferences.get("voice_greeting_style"):
            facts.append(f"estilo de voz: {preferences['voice_greeting_style']}")
        if recents:
            facts.append(f"padroes recentes: {', '.join(recents[-4:])}")

        return "; ".join(facts) if facts else "Nenhuma preferencia persistida."

    def build_update_payload(
        self,
        action_data: Dict[str, Any],
        existing_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Prepare a memory update from a successfully executed action.

        This is intentionally conservative: it only promotes fields that are
        useful for future personalization and categorization.
        """

        existing_profile = existing_profile or {}
        preferences = dict(existing_profile.get("preferences", {}))

        if action_data.get("payment_method"):
            preferences["payment_method"] = action_data["payment_method"]
        if action_data.get("account_scope"):
            preferences["account_scope"] = action_data["account_scope"]
        if action_data.get("category"):
            preferences["category"] = action_data["category"]

        return {
            **existing_profile,
            "preferences": preferences,
        }

    async def load_profile(self, user_id: str) -> Dict[str, Any]:
        profile = await user_memories_collection.find_one({"user_id": user_id})
        if not profile:
            return {}
        profile.pop("_id", None)
        return profile

    async def persist_profile(
        self,
        user_id: str,
        actions: List[Dict[str, Any]],
        message: str = "",
    ) -> None:
        if not actions:
            return

        preferences: Dict[str, Any] = {}
        recent_patterns: List[str] = []

        for action in actions:
            data = action.get("data", {})
            action_type = action.get("type")
            if data.get("payment_method") and data["payment_method"] != "other":
                preferences["payment_method"] = data["payment_method"]
            if data.get("account_scope"):
                preferences["account_scope"] = data["account_scope"]
            if data.get("category") and data["category"] != "Geral":
                preferences["category"] = data["category"]
            if action_type:
                recent_patterns.append(action_type)

        update_doc = {
            "$set": {
                "user_id": user_id,
                "preferences.voice_greeting_style": "senhor",
                "updated_at": datetime.utcnow(),
            },
            "$push": {
                "recent_patterns": {
                    "$each": recent_patterns or ["conversation"],
                    "$slice": -10,
                }
            },
        }

        for key, value in preferences.items():
            update_doc["$set"][f"preferences.{key}"] = value

        if message:
            update_doc["$set"]["last_user_message"] = message

        await user_memories_collection.update_one(
            {"user_id": user_id},
            update_doc,
            upsert=True,
        )
