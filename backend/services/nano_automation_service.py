from __future__ import annotations

from datetime import datetime, timedelta
from typing import Dict, List

from database import bills_collection, nano_tasks_collection, reminders_collection, transactions_collection


class NanoAutomationService:
    async def list_workspace_automations(self, *, workspace_id: str) -> List[Dict]:
        now = datetime.utcnow()
        next_week = now + timedelta(days=7)
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
        return [
            {
                "id": "daily_summary",
                "title": "Resumo diario no WhatsApp",
                "description": "Envia fechamento rapido do dia no numero vinculado.",
                "status": "available",
                "signal": recent_tasks,
            },
            {
                "id": "bill_alert",
                "title": "Contas vencendo",
                "description": "Detecta contas pendentes e avisa no WhatsApp.",
                "status": "available",
                "signal": pending_bills,
            },
            {
                "id": "high_spend",
                "title": "Gastos altos",
                "description": "Aponta despesas elevadas para revisao.",
                "status": "available",
                "signal": high_expenses,
            },
            {
                "id": "weekly_review",
                "title": "Revisao semanal",
                "description": "Consolida movimento, saldo e pontos de atencao.",
                "status": "available",
                "signal": upcoming_reminders,
            },
            {
                "id": "card_reminder",
                "title": "Lembrete de cartao",
                "description": "Avisa sobre fechamento e vencimento da fatura.",
                "status": "planned",
                "signal": 0,
            },
        ]
