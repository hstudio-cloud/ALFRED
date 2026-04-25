from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List, Optional

from database import (
    bills_collection,
    cards_collection,
    nano_automation_configs_collection,
    nano_tasks_collection,
    reminders_collection,
    transactions_collection,
)
from models_extended import NanoAutomationConfig, NanoAutomationConfigUpdate


AUTOMATION_DEFAULTS: List[Dict] = [
    {
        "id": "daily_summary",
        "title": "Resumo diario no WhatsApp",
        "description": "Envia fechamento rapido do dia no numero vinculado.",
        "trigger_hour": 8,
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "risk_level": "low_risk",
        "settings": {},
    },
    {
        "id": "bill_alert",
        "title": "Contas vencendo",
        "description": "Detecta contas pendentes e avisa no WhatsApp.",
        "trigger_hour": 8,
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "risk_level": "low_risk",
        "settings": {"days_ahead": 2},
    },
    {
        "id": "high_spend",
        "title": "Gastos altos",
        "description": "Aponta despesas elevadas para revisao.",
        "trigger_hour": 10,
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "risk_level": "medium_risk",
        "settings": {"threshold": 1000},
    },
    {
        "id": "weekly_review",
        "title": "Revisao semanal",
        "description": "Consolida movimento, saldo e pontos de atencao.",
        "trigger_hour": 9,
        "weekdays": [0],
        "risk_level": "low_risk",
        "settings": {},
    },
    {
        "id": "card_reminder",
        "title": "Lembrete de cartao",
        "description": "Avisa sobre fechamento e vencimento da fatura.",
        "trigger_hour": 9,
        "weekdays": [0, 1, 2, 3, 4, 5, 6],
        "risk_level": "low_risk",
        "settings": {"days_ahead": 3},
    },
]


class NanoAutomationService:
    def __init__(self) -> None:
        self._defaults_by_id = {item["id"]: item for item in AUTOMATION_DEFAULTS}

    async def list_workspace_automations(self, *, workspace_id: str) -> List[Dict]:
        now = datetime.utcnow()
        next_week = now + timedelta(days=7)
        configs = await nano_automation_configs_collection.find(
            {"workspace_id": workspace_id},
            {"_id": 0},
        ).to_list(100)
        config_map = {item["automation_key"]: item for item in configs}

        pending_bills = await bills_collection.count_documents(
            {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
        )
        upcoming_reminders = await reminders_collection.count_documents(
            {"workspace_id": workspace_id, "is_active": True, "remind_at": {"$gte": now, "$lte": next_week}}
        )
        recent_tasks = await nano_tasks_collection.count_documents(
            {"workspace_id": workspace_id, "created_at": {"$gte": now - timedelta(days=7)}}
        )
        high_expenses = await transactions_collection.count_documents(
            {
                "workspace_id": workspace_id,
                "type": "expense",
                "amount": {"$gte": 1000},
                "date": {"$gte": now - timedelta(days=30)},
            }
        )
        active_cards = await cards_collection.count_documents({"workspace_id": workspace_id, "active": True})
        signal_map = {
            "daily_summary": recent_tasks,
            "bill_alert": pending_bills,
            "high_spend": high_expenses,
            "weekly_review": upcoming_reminders,
            "card_reminder": active_cards,
        }

        items: List[Dict] = []
        for default in AUTOMATION_DEFAULTS:
            merged = self._merge_with_config(default, config_map.get(default["id"]))
            merged["signal"] = signal_map.get(default["id"], 0)
            merged["status"] = "enabled" if merged["enabled"] else "disabled"
            items.append(merged)
        return items

    async def update_workspace_automation(
        self,
        *,
        workspace_id: str,
        user_id: str,
        automation_key: str,
        payload: NanoAutomationConfigUpdate,
    ) -> Dict:
        default = self._defaults_by_id.get(automation_key)
        if not default:
            raise ValueError("Automacao nao encontrada.")

        existing = await nano_automation_configs_collection.find_one(
            {"workspace_id": workspace_id, "automation_key": automation_key},
            {"_id": 0},
        )
        base = self._merge_with_config(default, existing)
        update_data = payload.dict(exclude_none=True)

        if "trigger_hour" in update_data:
            trigger_hour = int(update_data["trigger_hour"])
            if trigger_hour < 0 or trigger_hour > 23:
                raise ValueError("trigger_hour precisa ficar entre 0 e 23.")
            update_data["trigger_hour"] = trigger_hour

        if "weekdays" in update_data:
            weekdays = [int(day) for day in update_data["weekdays"]]
            if any(day < 0 or day > 6 for day in weekdays):
                raise ValueError("weekdays precisa usar valores entre 0 e 6.")
            update_data["weekdays"] = weekdays

        settings = {**(base.get("settings") or {}), **(update_data.pop("settings", {}) or {})}
        document = NanoAutomationConfig(
            id=(existing or {}).get("id") or base["config_id"],
            workspace_id=workspace_id,
            user_id=user_id,
            automation_key=automation_key,
            title=base["title"],
            description=base["description"],
            source_channel=base["source_channel"],
            enabled=bool(update_data.get("enabled", base["enabled"])),
            trigger_hour=int(update_data.get("trigger_hour", base["trigger_hour"])),
            weekdays=update_data.get("weekdays", base["weekdays"]),
            risk_level=base["risk_level"],
            settings=settings,
            last_run_at=(existing or {}).get("last_run_at"),
            created_at=(existing or {}).get("created_at") or datetime.utcnow(),
            updated_at=datetime.utcnow(),
        ).dict()

        await nano_automation_configs_collection.update_one(
            {"workspace_id": workspace_id, "automation_key": automation_key},
            {"$set": document},
            upsert=True,
        )
        return self._merge_with_config(default, document)

    async def mark_automation_run(self, *, workspace_id: str, automation_key: str, ran_at: Optional[datetime] = None) -> None:
        await nano_automation_configs_collection.update_one(
            {"workspace_id": workspace_id, "automation_key": automation_key},
            {"$set": {"last_run_at": ran_at or datetime.utcnow(), "updated_at": datetime.utcnow()}},
        )

    async def get_workspace_automation_map(self, *, workspace_id: str) -> Dict[str, Dict]:
        items = await self.list_workspace_automations(workspace_id=workspace_id)
        return {item["id"]: item for item in items}

    def _merge_with_config(self, default: Dict, config: Optional[Dict]) -> Dict:
        config = config or {}
        return {
            "id": default["id"],
            "config_id": config.get("id") or default["id"],
            "title": default["title"],
            "description": default["description"],
            "source_channel": config.get("source_channel") or "whatsapp",
            "enabled": bool(config.get("enabled", True)),
            "trigger_hour": int(config.get("trigger_hour", default["trigger_hour"])),
            "weekdays": config.get("weekdays") or list(default["weekdays"]),
            "risk_level": config.get("risk_level") or default["risk_level"],
            "settings": {**default.get("settings", {}), **(config.get("settings") or {})},
            "last_run_at": config.get("last_run_at"),
            "created_at": config.get("created_at"),
            "updated_at": config.get("updated_at"),
        }
