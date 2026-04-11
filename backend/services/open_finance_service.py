from __future__ import annotations

import asyncio
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from database import (
    open_finance_connections_collection,
    open_finance_accounts_collection,
    open_finance_transactions_collection,
)
from models_open_finance import OpenFinanceConnection


class OpenFinanceService:
    """
    Provider-agnostic Open Finance integration layer.
    Supports Pluggy/Belvo-like flows and keeps adapters interchangeable.
    """

    def __init__(self) -> None:
        self.provider = os.getenv("OPEN_FINANCE_PROVIDER", "pluggy").strip().lower()
        self.base_url = os.getenv("OPEN_FINANCE_BASE_URL", "").strip()
        self.client_id = os.getenv("OPEN_FINANCE_CLIENT_ID", "").strip()
        self.client_secret = os.getenv("OPEN_FINANCE_CLIENT_SECRET", "").strip()
        self.webhook_secret = os.getenv("OPEN_FINANCE_WEBHOOK_SECRET", "").strip()

    async def create_connect_token(self, *, user_id: str, workspace_id: str, callback_url: str | None = None) -> Dict[str, Any]:
        payload = {
            "provider": self.provider,
            "mode": "sandbox" if os.getenv("OPEN_FINANCE_SANDBOX", "true").lower() == "true" else "production",
            "callback_url": callback_url or os.getenv("OPEN_FINANCE_CALLBACK_URL", "").strip(),
            "workspace_id": workspace_id,
            "user_id": user_id,
        }

        # If no credentials configured yet, still return an integration-friendly payload.
        if not self.base_url or not self.client_id or not self.client_secret:
            return {
                "provider": self.provider,
                "connect_token": f"demo-{workspace_id[:8]}-{user_id[:8]}",
                "connect_url": None,
                "sandbox": True,
                "configured": False,
                "message": "Open Finance provider ainda não configurado. Token demo gerado para fluxo de integração.",
            }

        if self.provider == "pluggy":
            return await self._pluggy_create_connect_token(payload)
        if self.provider == "belvo":
            return await self._belvo_create_connect_token(payload)

        return {
            "provider": self.provider,
            "connect_token": None,
            "connect_url": None,
            "configured": False,
            "message": "Provider de Open Finance não suportado nesta versão.",
        }

    async def save_connection(
        self,
        *,
        user_id: str,
        workspace_id: str,
        provider: str,
        item_id: str,
        consent_id: str | None,
        institution_name: str | None,
        status: str = "connected",
    ) -> Dict[str, Any]:
        provider_name = (provider or self.provider or "pluggy").strip().lower()
        existing = await open_finance_connections_collection.find_one(
            {"workspace_id": workspace_id, "item_id": item_id, "provider": provider_name}
        )
        if existing:
            update_doc = {
                "consent_id": consent_id or existing.get("consent_id"),
                "institution_name": institution_name or existing.get("institution_name", "Instituicao"),
                "status": status or existing.get("status", "connected"),
                "updated_at": datetime.now(timezone.utc),
            }
            await open_finance_connections_collection.update_one({"id": existing["id"]}, {"$set": update_doc})
            updated = await open_finance_connections_collection.find_one({"id": existing["id"]}, {"_id": 0})
            return updated or {}

        connection = OpenFinanceConnection(
            user_id=user_id,
            workspace_id=workspace_id,
            provider=provider_name,
            item_id=item_id,
            consent_id=consent_id,
            institution_name=institution_name or "Instituicao",
            status=status or "connected",
        )
        payload = connection.dict()
        payload["created_at"] = payload["created_at"].isoformat()
        await open_finance_connections_collection.insert_one(payload)
        return connection.dict()

    async def list_connections(self, *, workspace_id: str) -> List[Dict[str, Any]]:
        rows = (
            await open_finance_connections_collection.find({"workspace_id": workspace_id}, {"_id": 0})
            .sort("created_at", -1)
            .to_list(200)
        )
        return rows

    async def delete_connection(self, *, workspace_id: str, connection_id: str) -> bool:
        connection = await open_finance_connections_collection.find_one(
            {"id": connection_id, "workspace_id": workspace_id}
        )
        if not connection:
            return False

        await open_finance_connections_collection.delete_one({"id": connection_id, "workspace_id": workspace_id})
        await open_finance_accounts_collection.delete_many({"connection_id": connection_id, "workspace_id": workspace_id})
        await open_finance_transactions_collection.delete_many({"connection_id": connection_id, "workspace_id": workspace_id})
        return True

    async def list_accounts(self, *, workspace_id: str) -> List[Dict[str, Any]]:
        rows = (
            await open_finance_accounts_collection.find({"workspace_id": workspace_id}, {"_id": 0})
            .sort("updated_at", -1)
            .to_list(2000)
        )
        return rows

    async def list_transactions(
        self,
        *,
        workspace_id: str,
        limit: int = 200,
        account_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        query: Dict[str, Any] = {"workspace_id": workspace_id}
        if account_id:
            query["external_account_id"] = account_id
        rows = (
            await open_finance_transactions_collection.find(query, {"_id": 0})
            .sort("date", -1)
            .limit(max(1, min(limit, 5000)))
            .to_list(max(1, min(limit, 5000)))
        )
        return rows

    async def _pluggy_create_connect_token(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = f"{self.base_url.rstrip('/')}/connect_token"
        request_body = {
            "clientUserId": payload["user_id"],
            "products": ["ACCOUNTS", "TRANSACTIONS"],
            "webhookUrl": payload["callback_url"],
        }
        response = await self._http_post_json(
            endpoint,
            request_body,
            headers={
                "X-API-KEY": self.client_id,
                "X-API-SECRET": self.client_secret,
            },
        )
        return {
            "provider": "pluggy",
            "connect_token": response.get("accessToken") or response.get("connectToken"),
            "connect_url": response.get("connectUrl"),
            "configured": True,
            "raw": response,
        }

    async def _belvo_create_connect_token(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = f"{self.base_url.rstrip('/')}/token"
        response = await self._http_post_json(
            endpoint,
            {"user_id": payload["user_id"], "workspace_id": payload["workspace_id"]},
            headers={
                "X-API-KEY-ID": self.client_id,
                "X-API-KEY-SECRET": self.client_secret,
            },
        )
        return {
            "provider": "belvo",
            "connect_token": response.get("token") or response.get("access_token"),
            "connect_url": response.get("connect_url"),
            "configured": True,
            "raw": response,
        }

    async def _http_post_json(self, url: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
        def _request() -> Dict[str, Any]:
            req = urllib.request.Request(
                url,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json", **headers},
                method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=20) as response:
                    body = response.read().decode("utf-8")
                    return json.loads(body) if body else {}
            except urllib.error.HTTPError as exc:
                body = exc.read().decode("utf-8", errors="ignore")
                return {"error": f"http_{exc.code}", "body": body}
            except Exception as exc:
                return {"error": str(exc)}

        return await asyncio.to_thread(_request)

