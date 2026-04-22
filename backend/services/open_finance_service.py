from __future__ import annotations

import asyncio
import json
import os
import urllib.request
import urllib.error
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

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
        self.api_key = os.getenv("OPEN_FINANCE_API_KEY", "").strip()
        self.webhook_secret = os.getenv("OPEN_FINANCE_WEBHOOK_SECRET", "").strip()

    async def create_connect_token(
        self,
        *,
        user_id: str,
        workspace_id: str,
        callback_url: str | None = None,
        item_id: str | None = None,
    ) -> Dict[str, Any]:
        payload = {
            "provider": self.provider,
            "mode": "sandbox" if os.getenv("OPEN_FINANCE_SANDBOX", "true").lower() == "true" else "production",
            "callback_url": callback_url or os.getenv("OPEN_FINANCE_CALLBACK_URL", "").strip(),
            "workspace_id": workspace_id,
            "user_id": user_id,
            "item_id": item_id,
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

    async def fetch_connection_snapshot(
        self,
        *,
        provider: str,
        item_id: str,
    ) -> Dict[str, Any]:
        provider_name = (provider or self.provider or "pluggy").strip().lower()
        if provider_name == "pluggy":
            return await self._pluggy_fetch_connection_snapshot(item_id=item_id)
        return {"accounts": [], "transactions": []}

    async def _pluggy_create_connect_token(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = f"{self.base_url.rstrip('/')}/connect_token"
        request_body = {
            "clientUserId": payload["user_id"],
            "products": ["ACCOUNTS", "TRANSACTIONS"],
        }
        if payload.get("callback_url"):
            request_body["webhookUrl"] = payload["callback_url"]
        if payload.get("item_id"):
            request_body["itemId"] = payload["item_id"]
        api_key = await self._pluggy_get_api_key()
        if not api_key:
            return {
                "provider": "pluggy",
                "connect_token": None,
                "connect_url": None,
                "configured": False,
                "message": "Pluggy nao retornou uma API key valida para abrir o fluxo de conexao.",
            }
        response = await self._http_post_json(
            endpoint,
            request_body,
            headers={"X-API-KEY": api_key},
        )
        if response.get("error") == "http_403":
            refreshed_api_key = await self._pluggy_get_api_key(force_refresh=True)
            if refreshed_api_key and refreshed_api_key != api_key:
                response = await self._http_post_json(
                    endpoint,
                    request_body,
                    headers={"X-API-KEY": refreshed_api_key},
                )

        if response.get("error"):
            return {
                "provider": "pluggy",
                "connect_token": None,
                "connect_url": None,
                "configured": False,
                "message": self._extract_provider_error_message(
                    response,
                    default="Pluggy recusou a criacao do token de conexao.",
                ),
                "raw": response,
            }

        return {
            "provider": "pluggy",
            "connect_token": response.get("accessToken") or response.get("connectToken"),
            "connect_url": response.get("connectUrl"),
            "configured": True,
            "raw": response,
        }

    async def _pluggy_fetch_connection_snapshot(self, *, item_id: str) -> Dict[str, Any]:
        api_key = await self._pluggy_get_api_key()
        if not api_key:
            return {"accounts": [], "transactions": [], "item": {}}

        item = await self._http_get_json(
            f"{self.base_url.rstrip('/')}/items/{item_id}",
            headers={"X-API-KEY": api_key},
        )
        if item.get("error"):
            return item
        accounts_response = await self._http_get_json(
            f"{self.base_url.rstrip('/')}/accounts?{urlencode({'itemId': item_id, 'pageSize': 500})}",
            headers={"X-API-KEY": api_key},
        )
        if accounts_response.get("error"):
            return accounts_response
        raw_accounts = accounts_response.get("results") or accounts_response.get("accounts") or []

        transactions: List[Dict[str, Any]] = []
        for account in raw_accounts:
            account_id = account.get("id")
            if not account_id:
                continue
            page = 1
            total_pages = 1
            while page <= total_pages:
                transaction_response = await self._http_get_json(
                    f"{self.base_url.rstrip('/')}/transactions?{urlencode({'accountId': account_id, 'pageSize': 500, 'page': page})}",
                    headers={"X-API-KEY": api_key},
                )
                if transaction_response.get("error"):
                    return transaction_response
                results = transaction_response.get("results") or transaction_response.get("transactions") or []
                transactions.extend(results)
                total_pages = int(transaction_response.get("totalPages") or 1)
                page += 1

        return {
            "item": item,
            "accounts": [self._normalize_pluggy_account(account) for account in raw_accounts],
            "transactions": [
                self._normalize_pluggy_transaction(transaction)
                for transaction in transactions
            ],
        }

    def _normalize_pluggy_account(self, account: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": account.get("id"),
            "external_account_id": account.get("id"),
            "type": (account.get("type") or "BANK").lower(),
            "subtype": account.get("subtype"),
            "name": account.get("name") or account.get("marketingName") or "Conta externa",
            "number_masked": account.get("number"),
            "balance_current": account.get("balance") or 0,
            "balance_available": (
                account.get("creditData", {}).get("availableCreditLimit")
                if (account.get("type") or "").upper() == "CREDIT"
                else account.get("bankData", {}).get("closingBalance", account.get("balance") or 0)
            ),
            "currency": account.get("currencyCode") or "BRL",
            "metadata": account,
        }

    def _normalize_pluggy_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        tx_type = (transaction.get("type") or "").lower()
        if tx_type not in {"credit", "debit"}:
            tx_type = "credit" if float(transaction.get("amount") or 0) >= 0 else "debit"

        return {
            "id": transaction.get("id"),
            "external_transaction_id": transaction.get("id"),
            "external_account_id": transaction.get("accountId"),
            "description": transaction.get("description") or transaction.get("descriptionRaw") or "Transacao externa",
            "amount": transaction.get("amount") or 0,
            "type": tx_type,
            "category_raw": transaction.get("category"),
            "date": transaction.get("date"),
            "metadata": transaction,
        }

    async def _pluggy_get_api_key(self, force_refresh: bool = False) -> str:
        if self.api_key and not force_refresh:
            return self.api_key

        endpoint = f"{self.base_url.rstrip('/')}/auth"
        response = await self._http_post_json(
            endpoint,
            {"clientId": self.client_id, "clientSecret": self.client_secret},
            headers={},
        )
        api_key = (
            response.get("apiKey")
            or response.get("accessToken")
            or response.get("access_token")
            or ""
        )
        if api_key:
            self.api_key = api_key
        return api_key

    def _extract_provider_error_message(
        self,
        response: Dict[str, Any],
        *,
        default: str,
    ) -> str:
        body = response.get("body")
        if isinstance(body, str) and body:
            try:
                parsed_body = json.loads(body)
            except json.JSONDecodeError:
                parsed_body = {}
            if isinstance(parsed_body, dict):
                return (
                    parsed_body.get("message")
                    or parsed_body.get("codeDescription")
                    or parsed_body.get("error")
                    or default
                )
        return response.get("error") or default

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

    async def _http_get_json(self, url: str, headers: Dict[str, str]) -> Dict[str, Any]:
        def _request() -> Dict[str, Any]:
            req = urllib.request.Request(
                url,
                headers=headers,
                method="GET",
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
