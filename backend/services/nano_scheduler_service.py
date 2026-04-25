from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from database import (
    accounts_collection,
    automation_logs_collection,
    bills_collection,
    cards_collection,
    nano_tasks_collection,
    reminders_collection,
    transactions_collection,
    whatsapp_identities_collection,
)
from models_extended import NanoTask
from services.nano_audit_service import create_nano_audit_log
from services.nano_automation_service import NanoAutomationService
from services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)


class NanoSchedulerService:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False
        self._automation_service = NanoAutomationService()

    async def start(self) -> None:
        if self._task and not self._task.done():
            return
        self._running = True
        self._task = asyncio.create_task(self._run_loop())
        logger.info("Nano scheduler started")

    async def stop(self) -> None:
        self._running = False
        if self._task and not self._task.done():
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("Nano scheduler stopped")

    async def _run_loop(self) -> None:
        while self._running:
            try:
                await self.run_once()
            except Exception:
                logger.exception("Nano scheduler cycle failed")
            await asyncio.sleep(self.interval_seconds)

    async def run_once(self) -> None:
        identities = await whatsapp_identities_collection.find(
            {"status": "linked"},
            {"_id": 0},
        ).to_list(500)
        for identity in identities:
            await self._process_identity(identity)

    async def _process_identity(self, identity: dict) -> None:
        workspace_id = identity.get("workspace_id")
        phone_number = identity.get("phone_number")
        if not workspace_id or not phone_number:
            return

        now = datetime.utcnow()
        today_key = now.strftime("%Y-%m-%d")
        week_key = f"{now.year}-W{now.isocalendar().week:02d}"
        automation_map = await self._automation_service.get_workspace_automation_map(
            workspace_id=workspace_id
        )

        if self._should_run(automation_map.get("daily_summary"), now):
            await self._maybe_send_daily_summary(
                identity,
                dedupe_key=f"daily_summary:{workspace_id}:{today_key}",
            )
            await self._maybe_send_due_reminders(
                identity,
                dedupe_key=f"due_reminders:{workspace_id}:{today_key}",
            )
        if self._should_run(automation_map.get("bill_alert"), now):
            await self._maybe_send_due_bills(
                identity,
                dedupe_key=f"bill_alert:{workspace_id}:{today_key}",
            )
        if self._should_run(automation_map.get("high_spend"), now):
            await self._maybe_send_high_spend_alert(
                identity,
                dedupe_key=f"high_spend:{workspace_id}:{today_key}",
            )
        if self._should_run(automation_map.get("card_reminder"), now):
            await self._maybe_send_card_reminder(
                identity,
                dedupe_key=f"card_reminder:{workspace_id}:{today_key}",
            )
        if self._should_run(automation_map.get("weekly_review"), now):
            await self._maybe_send_weekly_review(
                identity,
                dedupe_key=f"weekly_review:{workspace_id}:{week_key}",
            )

    def _should_run(self, config: Optional[dict], now: datetime) -> bool:
        if not config or not config.get("enabled"):
            return False
        weekdays = config.get("weekdays") or []
        if weekdays and now.weekday() not in weekdays:
            return False
        return now.hour >= int(config.get("trigger_hour", 8))

    async def _has_log(self, dedupe_key: str) -> bool:
        found = await automation_logs_collection.find_one({"dedupe_key": dedupe_key})
        return bool(found)

    async def _save_log(self, *, workspace_id: str, dedupe_key: str, automation_type: str, payload: dict) -> None:
        await automation_logs_collection.insert_one(
            {
                "workspace_id": workspace_id,
                "automation_type": automation_type,
                "dedupe_key": dedupe_key,
                "payload": payload,
                "created_at": datetime.utcnow(),
            }
        )
        await self._automation_service.mark_automation_run(
            workspace_id=workspace_id,
            automation_key=automation_type,
            ran_at=datetime.utcnow(),
        )

    async def _save_task(
        self,
        *,
        identity: dict,
        title: str,
        automation_type: str,
        payload: dict,
    ) -> None:
        task = NanoTask(
            user_id=identity["user_id"],
            workspace_id=identity["workspace_id"],
            source_channel="whatsapp",
            title=title,
            type="automation",
            status="completed",
            risk_level="low_risk",
            requires_confirmation=False,
            metadata={
                "automation_type": automation_type,
                "scheduler": True,
                **payload,
            },
        )
        await nano_tasks_collection.insert_one(task.dict())
        await create_nano_audit_log(
            user_id=identity["user_id"],
            workspace_id=identity["workspace_id"],
            source_channel="whatsapp",
            event_type="automation_sent",
            status="completed",
            risk_level="low_risk",
            action_type=automation_type,
            message=title,
            metadata={"scheduler": True, **payload},
        )

    async def _send_text(self, *, phone_number: str, text: str) -> None:
        await send_whatsapp_message(to=phone_number, text=text)

    async def _maybe_send_daily_summary(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        open_bills = await bills_collection.count_documents(
            {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
        )
        active_reminders = await reminders_collection.count_documents(
            {"workspace_id": workspace_id, "is_active": True}
        )
        if open_bills == 0 and active_reminders == 0:
            return
        text = (
            f"Resumo diario do Nano: {open_bills} conta(s) pendente(s) e "
            f"{active_reminders} lembrete(s) ativo(s). Quer que eu liste as prioridades de hoje?"
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="daily_summary",
            payload={"open_bills": open_bills, "active_reminders": active_reminders},
        )
        await self._save_task(
            identity=identity,
            title="Resumo diario enviado no WhatsApp",
            automation_type="daily_summary",
            payload={"open_bills": open_bills, "active_reminders": active_reminders},
        )

    async def _maybe_send_due_bills(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        upcoming_limit = datetime.utcnow() + timedelta(days=2)
        bills = await bills_collection.find(
            {
                "workspace_id": workspace_id,
                "status": {"$in": ["pending", "overdue"]},
                "due_date": {"$lte": upcoming_limit},
            },
            {"_id": 0},
        ).to_list(10)
        if not bills:
            return
        total = sum(float(item.get("amount") or 0) for item in bills)
        text = (
            f"Nano detectou {len(bills)} conta(s) vencendo ou vencida(s), somando R$ {total:.2f}. "
            "Se quiser, eu listo agora e monto a prioridade de pagamento."
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="bill_alert",
            payload={"bills_count": len(bills), "total": total},
        )
        await self._save_task(
            identity=identity,
            title="Alerta de contas enviado no WhatsApp",
            automation_type="bill_alert",
            payload={"bills_count": len(bills), "total": total},
        )

    async def _maybe_send_high_spend_alert(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        threshold = 1000
        expenses = await transactions_collection.find(
            {
                "workspace_id": workspace_id,
                "type": "expense",
                "amount": {"$gte": threshold},
                "date": {"$gte": datetime.utcnow() - timedelta(days=7)},
            },
            {"_id": 0},
        ).to_list(5)
        if not expenses:
            return
        total = sum(float(item.get("amount") or 0) for item in expenses)
        text = (
            f"Nano detectou {len(expenses)} gasto(s) alto(s) nos ultimos 7 dias, somando R$ {total:.2f}. "
            "Se quiser, eu resumo onde estao os maiores desvios."
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="high_spend",
            payload={"expenses_count": len(expenses), "total": total, "threshold": threshold},
        )
        await self._save_task(
            identity=identity,
            title="Alerta de gastos altos enviado no WhatsApp",
            automation_type="high_spend",
            payload={"expenses_count": len(expenses), "total": total, "threshold": threshold},
        )

    async def _maybe_send_due_reminders(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        now = datetime.utcnow()
        upcoming_limit = now + timedelta(hours=24)
        reminders = await reminders_collection.find(
            {
                "workspace_id": workspace_id,
                "is_active": True,
                "remind_at": {"$gte": now, "$lte": upcoming_limit},
            },
            {"_id": 0},
        ).to_list(10)
        if not reminders:
            return
        text = (
            f"Voce tem {len(reminders)} lembrete(s) nas proximas 24h. "
            "Se quiser, eu organizo a agenda financeira de hoje agora."
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="reminder_alert",
            payload={"reminders_count": len(reminders)},
        )
        await self._save_task(
            identity=identity,
            title="Alerta de lembretes enviado no WhatsApp",
            automation_type="reminder_alert",
            payload={"reminders_count": len(reminders)},
        )

    async def _maybe_send_card_reminder(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        today = datetime.utcnow()
        cards = await cards_collection.find(
            {"workspace_id": workspace_id, "active": True},
            {"_id": 0},
        ).to_list(50)
        relevant_cards = []
        for card in cards:
            due_day = int(card.get("due_day") or 0)
            closing_day = int(card.get("closing_day") or 0)
            if due_day and 0 <= due_day - today.day <= 3:
                relevant_cards.append(
                    {"name": card.get("name") or "Cartao", "kind": "vencimento", "day": due_day}
                )
            elif closing_day and 0 <= closing_day - today.day <= 3:
                relevant_cards.append(
                    {"name": card.get("name") or "Cartao", "kind": "fechamento", "day": closing_day}
                )
        if not relevant_cards:
            return
        labels = ", ".join(
            f"{item['name']} ({item['kind']} dia {item['day']})" for item in relevant_cards[:3]
        )
        text = f"Nano identificou cartao com data proxima: {labels}. Quer que eu organize a fatura e o caixa previsto?"
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="card_reminder",
            payload={"cards": relevant_cards[:5]},
        )
        await self._save_task(
            identity=identity,
            title="Lembrete de cartao enviado no WhatsApp",
            automation_type="card_reminder",
            payload={"cards": relevant_cards[:5]},
        )

    async def _maybe_send_weekly_review(self, identity: dict, *, dedupe_key: str) -> None:
        if await self._has_log(dedupe_key):
            return
        workspace_id = identity["workspace_id"]
        open_bills = await bills_collection.count_documents(
            {"workspace_id": workspace_id, "status": {"$in": ["pending", "overdue"]}}
        )
        accounts = await accounts_collection.find({"workspace_id": workspace_id}, {"_id": 0}).to_list(100)
        account_count = len(accounts)
        text = (
            f"Revisao semanal do Nano: {account_count} conta(s) mapeada(s) e {open_bills} pendencia(s) aberta(s). "
            "Quer um resumo executivo da semana?"
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="weekly_review",
            payload={"open_bills": open_bills, "accounts": account_count},
        )
        await self._save_task(
            identity=identity,
            title="Revisao semanal enviada no WhatsApp",
            automation_type="weekly_review",
            payload={"open_bills": open_bills, "accounts": account_count},
        )
