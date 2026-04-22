from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List
import uuid

from database import (
    open_finance_accounts_collection,
    open_finance_connections_collection,
    open_finance_transactions_collection,
)
from services.open_finance_normalizer import OpenFinanceNormalizer
from services.open_finance_service import OpenFinanceService


class OpenFinanceSyncService:
    """
    Synchronize accounts/transactions from aggregator payloads into Nano storage.
    V1 supports both:
    - real provider payload (future)
    - manual payload from callback/sandbox for quick validation
    """

    def __init__(self) -> None:
        self.open_finance_service = OpenFinanceService()

    async def sync_connection(
        self,
        *,
        workspace_id: str,
        connection_id: str,
        provider_payload: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        connection = await open_finance_connections_collection.find_one(
            {"id": connection_id, "workspace_id": workspace_id}
        )
        if not connection:
            return {"ok": False, "error": "connection_not_found"}

        normalized_payload = self._normalize_provider_payload(provider_payload or {})
        if (
            not normalized_payload.get("accounts")
            and not normalized_payload.get("transactions")
            and connection.get("item_id")
        ):
            provider_snapshot = await self.open_finance_service.fetch_connection_snapshot(
                provider=connection.get("provider") or "pluggy",
                item_id=connection["item_id"],
            )
            if provider_snapshot.get("error"):
                return {
                    "ok": False,
                    "error": provider_snapshot.get("error"),
                    "details": provider_snapshot.get("body"),
                }
            normalized_payload = self._normalize_provider_payload(provider_snapshot)

        accounts = normalized_payload.get("accounts", [])
        transactions = normalized_payload.get("transactions", [])

        upserted_accounts = 0
        upserted_transactions = 0

        for account in accounts:
            now_iso = datetime.now(timezone.utc).isoformat()
            external_account_id = str(account.get("external_account_id") or account.get("id") or "")
            if not external_account_id:
                continue

            doc = {
                "id": account.get("id") or str(uuid.uuid4()),
                "connection_id": connection_id,
                "workspace_id": workspace_id,
                "external_account_id": external_account_id,
                "type": account.get("type", "bank"),
                "subtype": account.get("subtype"),
                "name": account.get("name", "Conta externa"),
                "number_masked": account.get("number_masked"),
                "balance_current": float(account.get("balance_current", 0) or 0),
                "balance_available": float(account.get("balance_available", 0) or 0),
                "currency": account.get("currency", "BRL"),
                "source": "open_finance",
                "metadata": account.get("metadata", {}),
                "updated_at": now_iso,
            }
            await open_finance_accounts_collection.update_one(
                {
                    "workspace_id": workspace_id,
                    "connection_id": connection_id,
                    "external_account_id": external_account_id,
                },
                {"$set": doc, "$setOnInsert": {"created_at": now_iso}},
                upsert=True,
            )
            upserted_accounts += 1

        for item in transactions:
            now_iso = datetime.now(timezone.utc).isoformat()
            external_transaction_id = str(item.get("external_transaction_id") or item.get("id") or "")
            external_account_id = str(item.get("external_account_id") or item.get("account_id") or "")
            if not external_transaction_id or not external_account_id:
                continue

            date_value = item.get("date") or now_iso
            if isinstance(date_value, datetime):
                date_iso = date_value.isoformat()
            else:
                date_iso = str(date_value)

            description = item.get("description", "").strip()
            category_raw = item.get("category_raw")
            category_normalized = OpenFinanceNormalizer.normalize_category(category_raw, description)

            amount = float(item.get("amount", 0) or 0)
            tx_type = item.get("type")
            if not tx_type:
                tx_type = "credit" if amount >= 0 else "debit"

            doc = {
                "id": item.get("id") or str(uuid.uuid4()),
                "connection_id": connection_id,
                "workspace_id": workspace_id,
                "external_transaction_id": external_transaction_id,
                "external_account_id": external_account_id,
                "description": description or "Transacao externa",
                "amount": amount,
                "type": tx_type,
                "category_raw": category_raw,
                "category_normalized": category_normalized,
                "date": date_iso,
                "source": "open_finance",
                "metadata": item.get("metadata", {}),
                "updated_at": now_iso,
            }
            await open_finance_transactions_collection.update_one(
                {
                    "workspace_id": workspace_id,
                    "connection_id": connection_id,
                    "external_transaction_id": external_transaction_id,
                },
                {"$set": doc, "$setOnInsert": {"created_at": now_iso}},
                upsert=True,
            )
            upserted_transactions += 1

        await open_finance_connections_collection.update_one(
            {"id": connection_id, "workspace_id": workspace_id},
            {
                "$set": {
                    "status": "connected",
                    "last_sync_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        return {
            "ok": True,
            "connection_id": connection_id,
            "accounts_synced": upserted_accounts,
            "transactions_synced": upserted_transactions,
        }

    async def sync_by_item_id(
        self,
        *,
        provider: str,
        item_id: str,
        provider_payload: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        if not item_id:
            return {"ok": False, "error": "missing_item_id"}

        connection = await open_finance_connections_collection.find_one(
            {
                "provider": (provider or "pluggy").strip().lower(),
                "item_id": item_id,
            }
        )
        if not connection:
            return {"ok": False, "error": "connection_not_found"}

        return await self.sync_connection(
            workspace_id=connection["workspace_id"],
            connection_id=connection["id"],
            provider_payload=provider_payload,
        )

    async def update_connection_status_by_item_id(
        self,
        *,
        provider: str,
        item_id: str,
        status: str,
        metadata: Dict[str, Any] | None = None,
    ) -> Dict[str, Any]:
        if not item_id:
            return {"ok": False, "error": "missing_item_id"}

        connection = await open_finance_connections_collection.find_one(
            {
                "provider": (provider or "pluggy").strip().lower(),
                "item_id": item_id,
            }
        )
        if not connection:
            return {"ok": False, "error": "connection_not_found"}

        now_iso = datetime.now(timezone.utc).isoformat()
        await open_finance_connections_collection.update_one(
            {"id": connection["id"]},
            {
                "$set": {
                    "status": status,
                    "updated_at": now_iso,
                    "webhook_metadata": metadata or {},
                }
            },
        )
        return {"ok": True, "connection_id": connection["id"], "status": status}

    def _normalize_provider_payload(self, payload: Dict[str, Any]) -> Dict[str, List[Dict[str, Any]]]:
        if not payload:
            return {"accounts": [], "transactions": []}

        # Supports raw payload with explicit arrays.
        if isinstance(payload.get("accounts"), list) or isinstance(payload.get("transactions"), list):
            return {
                "accounts": payload.get("accounts") or [],
                "transactions": payload.get("transactions") or [],
            }

        # Provider-like fallback shapes.
        data = payload.get("data", {})
        return {
            "accounts": data.get("accounts") or [],
            "transactions": data.get("transactions") or [],
        }
