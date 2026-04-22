from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException


def _base_url() -> str:
    return (os.getenv("ASAAS_BASE_URL") or "https://api-sandbox.asaas.com/v3").strip().rstrip("/")


def _headers() -> Dict[str, str]:
    api_key = (os.getenv("ASAAS_API_KEY") or "").strip()
    if not api_key:
        raise HTTPException(status_code=503, detail="Asaas nao configurado no backend.")
    return {
        "accept": "application/json",
        "content-type": "application/json",
        "access_token": api_key,
    }


def _iso_date(days_from_now: int = 0) -> str:
    target = datetime.now(timezone.utc) + timedelta(days=days_from_now)
    return target.date().isoformat()


async def _request(method: str, path: str, payload: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    async with httpx.AsyncClient(base_url=_base_url(), headers=_headers(), timeout=30.0) as client:
        response = await client.request(method, path, json=payload)
        if response.status_code >= 400:
            raise HTTPException(
                status_code=502,
                detail=f"Asaas retornou erro ao processar a cobranca: {response.text}",
            )
        return response.json()


async def ensure_customer(
    *,
    name: str,
    email: str,
    phone: str | None,
    cpf_cnpj: str | None,
    external_reference: str,
) -> Dict[str, Any]:
    existing = await _request("GET", f"/customers?externalReference={external_reference}")
    data = existing.get("data") or []
    if data:
        return data[0]

    customer_payload = {
        "name": name,
        "email": email,
        "mobilePhone": phone or "",
        "cpfCnpj": cpf_cnpj or "",
        "externalReference": external_reference,
        "notificationDisabled": False,
    }
    return await _request("POST", "/customers", customer_payload)


async def create_pix_charge(
    *,
    customer_id: str,
    amount: float,
    due_date: Optional[str],
    description: str,
    external_reference: str,
) -> Dict[str, Any]:
    payment = await _request(
        "POST",
        "/payments",
        {
            "customer": customer_id,
            "billingType": "PIX",
            "value": float(amount),
            "dueDate": due_date or _iso_date(0),
            "description": description,
            "externalReference": external_reference,
        },
    )
    qr_code = await _request("GET", f"/payments/{payment['id']}/pixQrCode")
    return {"payment": payment, "pix": qr_code}


async def create_boleto_charge(
    *,
    customer_id: str,
    amount: float,
    due_date: Optional[str],
    description: str,
    external_reference: str,
) -> Dict[str, Any]:
    payment = await _request(
        "POST",
        "/payments",
        {
            "customer": customer_id,
            "billingType": "BOLETO",
            "value": float(amount),
            "dueDate": due_date or _iso_date(3),
            "description": description,
            "externalReference": external_reference,
        },
    )
    return {"payment": payment}


def verify_webhook_signature(header_token: str | None) -> bool:
    expected = (os.getenv("ASAAS_WEBHOOK_TOKEN") or "").strip()
    if not expected:
        return True
    return (header_token or "").strip() == expected
