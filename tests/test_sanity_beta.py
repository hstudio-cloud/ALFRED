import asyncio
from datetime import datetime, timedelta, timezone
from pathlib import Path
import sys
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from models import TransactionCreate, UserLogin  # noqa: E402
from models_extended import ReminderFinancialCreate  # noqa: E402
from routes import auth_routes, dashboard_routes, finance_routes, transactions_routes  # noqa: E402
from services import nano_channel_router, subscription_access_service  # noqa: E402
from nano_ops import whatsapp_channel  # noqa: E402
from tools import open_finance_tools  # noqa: E402


class FakeCursor:
    def __init__(self, items):
        self.items = list(items)

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    async def to_list(self, limit):
        return list(self.items)[:limit]


class FakeCollection:
    def __init__(self, *, one=None, many=None, count=0):
        self.one = one
        self.many = list(many or [])
        self.count = count
        self.inserted = []

    async def find_one(self, *args, **kwargs):
        return self.one

    async def insert_one(self, payload):
        self.inserted.append(payload)
        return SimpleNamespace(inserted_id=payload.get("id"))

    async def count_documents(self, *args, **kwargs):
        return self.count

    def find(self, *args, **kwargs):
        return FakeCursor(self.many)


def run(coro):
    return asyncio.run(coro)


def test_login_sanity(monkeypatch):
    fake_user = {
        "id": "user-1",
        "email": "admin@nanoapp.com",
        "name": "Admin Nano",
        "password": "hashed",
        "created_at": datetime.now(timezone.utc),
    }
    monkeypatch.setattr(auth_routes, "users_collection", FakeCollection(one=fake_user))
    monkeypatch.setattr(auth_routes, "verify_password", lambda plain, hashed: plain == "123456" and hashed == "hashed")
    monkeypatch.setattr(auth_routes, "create_access_token", lambda data: "token-ok")

    result = run(auth_routes.login(UserLogin(email="admin@nanoapp.com", password="123456")))

    assert result["token"] == "token-ok"
    assert result["user"].email == "admin@nanoapp.com"


def test_dashboard_load_sanity(monkeypatch):
    monkeypatch.setattr(dashboard_routes, "verify_workspace_access", lambda workspace_id, current_user: asyncio.sleep(0))
    monkeypatch.setattr(dashboard_routes, "tasks_collection", FakeCollection(count=4))
    monkeypatch.setattr(dashboard_routes, "habits_collection", FakeCollection(many=[{"streak": 3}, {"streak": 5}]))
    monkeypatch.setattr(dashboard_routes, "projects_collection", FakeCollection(count=2))
    monkeypatch.setattr(
        dashboard_routes,
        "transactions_collection",
        FakeCollection(many=[{"type": "income", "amount": 1000}, {"type": "expense", "amount": 400}]),
    )

    result = run(
        dashboard_routes.get_dashboard_stats(
            workspace_id="ws-1",
            account_scope="general",
            current_user={"id": "user-1"},
        )
    )

    assert result.finances_balance == 600
    assert result.projects_active == 2


def test_create_expense_sanity(monkeypatch):
    inserted = FakeCollection()
    monkeypatch.setattr(transactions_routes, "verify_workspace_access", lambda workspace_id, current_user: asyncio.sleep(0))
    monkeypatch.setattr(transactions_routes, "transactions_collection", inserted)

    payload = TransactionCreate(
        type="expense",
        category="Operacional",
        amount=250.0,
        description="Internet",
        payment_method="pix",
        account_scope="business",
    )
    result = run(
        transactions_routes.create_transaction(
            payload,
            workspace_id="ws-1",
            current_user={"id": "user-1"},
        )
    )

    assert result["workspace_id"] == "ws-1"
    assert inserted.inserted[0]["amount"] == 250.0


def test_create_reminder_sanity(monkeypatch):
    inserted = FakeCollection()
    monkeypatch.setattr(finance_routes, "verify_workspace_access", lambda workspace_id, current_user: asyncio.sleep(0))
    monkeypatch.setattr(finance_routes, "reminders_collection", inserted)

    payload = ReminderFinancialCreate(
        title="Pagar fornecedor",
        remind_at=datetime.now(timezone.utc) + timedelta(days=1),
        description="Lembrete financeiro",
    )
    result = run(
        finance_routes.create_reminder(
            payload,
            workspace_id="ws-1",
            current_user={"id": "user-1"},
        )
    )

    assert result["workspace_id"] == "ws-1"
    assert inserted.inserted


def test_nano_agenda_question_sanity(monkeypatch):
    async def fake_load_context(**kwargs):
        return []

    async def fake_store(**kwargs):
        return {"content": kwargs["content"]}

    async def fake_register(**kwargs):
        return kwargs

    async def fake_audit(**kwargs):
        return kwargs

    async def fake_detect_actions(**kwargs):
        return {"actions": []}

    async def fake_handle_message(**kwargs):
        return SimpleNamespace(
            message="Sua agenda hoje tem 2 compromissos.",
            intent="agenda_summary",
            actions=[],
            executed_actions=[],
            tool_results={"calendar": {"count": 2}},
            followup_needed=False,
            missing_fields=[],
            metadata={"intent_confidence": 0.92},
        )

    monkeypatch.setattr(nano_channel_router, "_load_conversation_context", fake_load_context)
    monkeypatch.setattr(nano_channel_router, "_safe_store_message", fake_store)
    monkeypatch.setattr(nano_channel_router, "_safe_register_task", fake_register)
    monkeypatch.setattr(nano_channel_router, "_safe_create_audit_log", fake_audit)
    monkeypatch.setattr(nano_channel_router._action_service, "detect_actions_from_text", fake_detect_actions)
    monkeypatch.setattr(nano_channel_router._orchestrator, "handle_message", fake_handle_message)

    result = run(
        nano_channel_router.route_channel_message(
            user={"id": "user-1"},
            workspace={"id": "ws-1"},
            content="Qual minha agenda de hoje?",
            source_channel="web_chat",
        )
    )

    assert result["intent"] == "agenda_summary"
    assert "agenda" in result["reply"].lower()


def test_whatsapp_webhook_without_link_sanity(monkeypatch):
    async def fake_send_whatsapp_message(*, to, text):
        return {"ok": True, "to": to, "text": text}

    monkeypatch.setattr(whatsapp_channel, "resolve_user_workspace_by_phone", lambda phone: asyncio.sleep(0, result=None))
    monkeypatch.setattr(whatsapp_channel, "consume_link_code", lambda **kwargs: asyncio.sleep(0, result=None))
    monkeypatch.setattr(whatsapp_channel, "send_whatsapp_message", fake_send_whatsapp_message)

    result = run(
        whatsapp_channel.handle_incoming_whatsapp_message(
            sender="5511999999999",
            message_text="oi",
            incoming={"profile_name": "Cliente"},
        )
    )

    assert result["resolved"] is False
    assert "codigo" in result["reply"].lower()


def test_whatsapp_webhook_with_link_sanity(monkeypatch):
    resolved = {
        "user": {"id": "user-1"},
        "workspace": {"id": "ws-1"},
        "identity": {"id": "wa-1"},
    }

    async def fake_send_whatsapp_message(*, to, text):
        return {"ok": True, "to": to, "text": text}

    async def fake_route_whatsapp_message(**kwargs):
        return {
            "reply": "Despesa registrada com sucesso.",
            "intent": "create_expense",
            "risk_level": "low_risk",
            "requires_confirmation": False,
            "used_tools": ["finance"],
            "actions": [{"type": "create_transaction"}],
        }

    async def fake_update_one(*args, **kwargs):
        return None

    async def fake_audit(**kwargs):
        return kwargs

    monkeypatch.setattr(whatsapp_channel, "resolve_user_workspace_by_phone", lambda phone: asyncio.sleep(0, result=resolved))
    monkeypatch.setattr(whatsapp_channel, "route_whatsapp_message", fake_route_whatsapp_message)
    monkeypatch.setattr(whatsapp_channel, "send_whatsapp_message", fake_send_whatsapp_message)
    monkeypatch.setattr(whatsapp_channel, "create_audit_entry", fake_audit)
    monkeypatch.setattr(
        whatsapp_channel,
        "whatsapp_identities_collection",
        SimpleNamespace(update_one=fake_update_one),
    )

    result = run(
        whatsapp_channel.handle_incoming_whatsapp_message(
            sender="5511999999999",
            message_text="registra 50 de café",
            incoming={"profile_name": "Cliente"},
        )
    )

    assert result["resolved"] is True
    assert result["intent"] == "create_expense"


def test_pending_confirmation_sanity(monkeypatch):
    async def fake_pending(**kwargs):
        return {"id": "pending-1", "action": {"actions": [{"type": "create_transaction"}]}}

    async def fake_execute_actions(**kwargs):
        return [{"status": "completed", "message": "Despesa confirmada."}]

    async def fake_mark(*args, **kwargs):
        return None

    async def fake_store(**kwargs):
        return kwargs

    async def fake_register(**kwargs):
        return kwargs

    async def fake_audit(**kwargs):
        return kwargs

    monkeypatch.setattr(nano_channel_router, "get_latest_pending_confirmation", fake_pending)
    monkeypatch.setattr(nano_channel_router, "mark_confirmation_status", fake_mark)
    monkeypatch.setattr(nano_channel_router, "_safe_store_message", fake_store)
    monkeypatch.setattr(nano_channel_router, "_safe_register_task", fake_register)
    monkeypatch.setattr(nano_channel_router, "_safe_create_audit_log", fake_audit)
    monkeypatch.setattr(nano_channel_router._action_service, "execute_actions", fake_execute_actions)

    result = run(
        nano_channel_router.route_channel_message(
            user={"id": "user-1"},
            workspace={"id": "ws-1"},
            content="confirmo",
            source_channel="whatsapp",
        )
    )

    assert result["intent"] == "confirmation_execution"
    assert result["requires_confirmation"] is False


def test_billing_status_and_feature_gating_sanity():
    subscription = {
        "provider": "stripe",
        "status": "active",
        "plan_code": "business",
        "current_period_end": datetime.now(timezone.utc) + timedelta(days=10),
    }
    access = subscription_access_service.build_access_snapshot(subscription)

    assert access["has_access"] is True
    assert access["features"]["open_finance"] is True
    assert subscription_access_service.can_access_feature(subscription, "team") is True
    assert subscription_access_service.can_access_feature(subscription, "unknown_feature") is False


def test_open_finance_status_sanity(monkeypatch):
    monkeypatch.setattr(
        open_finance_tools,
        "open_finance_connections_collection",
        FakeCollection(many=[{"institution_name": "Banco A"}]),
    )
    monkeypatch.setattr(
        open_finance_tools,
        "open_finance_accounts_collection",
        FakeCollection(many=[{"balance_current": 1200.5}, {"balance_current": 299.5}]),
    )

    result = run(open_finance_tools.get_open_finance_summary("ws-1"))

    assert result["connections_count"] == 1
    assert result["balance_total"] == 1500.0
