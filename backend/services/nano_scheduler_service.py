from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from database import (
    accounts_collection,
    automation_logs_collection,
    bills_collection,
    reminders_collection,
    whatsapp_identities_collection,
)
from services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)


class NanoSchedulerService:
    def __init__(self, interval_seconds: int = 60):
        self.interval_seconds = interval_seconds
        self._task: Optional[asyncio.Task] = None
        self._running = False

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

        if now.hour >= 8:
            await self._maybe_send_daily_summary(identity, dedupe_key=f"daily_summary:{workspace_id}:{today_key}")
            await self._maybe_send_due_bills(identity, dedupe_key=f"due_bills:{workspace_id}:{today_key}")
            await self._maybe_send_due_reminders(identity, dedupe_key=f"due_reminders:{workspace_id}:{today_key}")

        if now.weekday() == 0 and now.hour >= 9:
            await self._maybe_send_weekly_review(identity, dedupe_key=f"weekly_review:{workspace_id}:{week_key}")

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
            f"Resumo diário do Nano: {open_bills} conta(s) pendente(s) e "
            f"{active_reminders} lembrete(s) ativo(s). Quer que eu liste as prioridades de hoje?"
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
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
            f"Você tem {len(reminders)} lembrete(s) nas próximas 24h. "
            "Se quiser, eu organizo a agenda financeira de hoje agora."
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="reminder_alert",
            payload={"reminders_count": len(reminders)},
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
            f"Revisão semanal do Nano: {account_count} conta(s) mapeada(s) e {open_bills} pendência(s) aberta(s). "
            "Quer um resumo executivo da semana?"
        )
        await self._send_text(phone_number=identity["phone_number"], text=text)
        await self._save_log(
            workspace_id=workspace_id,
            dedupe_key=dedupe_key,
            automation_type="weekly_review",
            payload={"open_bills": open_bills, "accounts": account_count},
        )
