import logging
import os
import hmac
import hashlib
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


def _whatsapp_provider_name() -> str:
    explicit = os.getenv("WHATSAPP_PROVIDER", "").strip().lower()
    if explicit:
        return explicit
    if os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip():
        return "meta_cloud"
    return "generic"


def verify_whatsapp_webhook(subscription_mode: Optional[str], verify_token: Optional[str]) -> bool:
    expected = (
        os.getenv("WHATSAPP_WEBHOOK_VERIFY_TOKEN", "").strip()
        or os.getenv("WHATSAPP_WEBHOOK_SECRET", "").strip()
    )
    if not expected:
        return False
    return (subscription_mode or "").strip().lower() == "subscribe" and (verify_token or "").strip() == expected


def extract_whatsapp_message(payload: dict) -> dict:
    if not isinstance(payload, dict):
        return {}

    if payload.get("from") or payload.get("phone"):
        return {
            "from": payload.get("from") or payload.get("phone"),
            "text": payload.get("text") or payload.get("message") or "",
            "provider": "generic",
            "raw": payload,
        }

    entries = payload.get("entry") or []
    for entry in entries:
        for change in entry.get("changes") or []:
            value = change.get("value") or {}
            messages = value.get("messages") or []
            contacts = value.get("contacts") or []
            if not messages:
                continue
            message = messages[0] or {}
            sender = message.get("from") or ""
            text_body = ((message.get("text") or {}).get("body") or "").strip()
            profile_name = ((contacts[0] or {}).get("profile") or {}).get("name")
            if sender and text_body:
                return {
                    "from": sender,
                    "text": text_body,
                    "provider": "meta_cloud",
                    "profile_name": profile_name,
                    "message_id": message.get("id"),
                    "raw": payload,
                }
    return {}


async def send_whatsapp_message(*, to: str, text: str) -> dict:
    """
    Send message through provider API when configured.
    If provider credentials are missing, returns simulated success.
    """
    provider = _whatsapp_provider_name()
    provider_url = os.getenv("WHATSAPP_PROVIDER_URL", "").strip()
    provider_token = os.getenv("WHATSAPP_PROVIDER_TOKEN", "").strip()
    meta_phone_number_id = os.getenv("WHATSAPP_META_PHONE_NUMBER_ID", "").strip()

    if provider == "meta_cloud" and provider_token and meta_phone_number_id:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {
                "preview_url": False,
                "body": (text or "").strip()[:4096],
            },
        }
        headers = {
            "Authorization": f"Bearer {provider_token}",
            "Content-Type": "application/json",
        }
        url = provider_url or f"https://graph.facebook.com/v23.0/{meta_phone_number_id}/messages"
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            return {"ok": True, "provider": "meta_cloud", "provider_response": response.json()}

    if not provider_url or not provider_token:
        logger.warning("WhatsApp provider not configured, simulating response")
        return {"ok": True, "simulated": True, "to": to}

    payload = {"to": to, "message": text}
    headers = {"Authorization": f"Bearer {provider_token}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(provider_url, json=payload, headers=headers)
        response.raise_for_status()
        return {"ok": True, "provider_response": response.json()}


def verify_whatsapp_signature(signature: Optional[str], raw_body: bytes | None = None) -> bool:
    app_secret = (
        os.getenv("WHATSAPP_APP_SECRET", "").strip()
        or os.getenv("WHATSAPP_WEBHOOK_SECRET", "").strip()
    )
    if not app_secret:
        return True
    if not signature or not raw_body:
        return False

    normalized_signature = signature.strip()
    if normalized_signature.startswith("sha256="):
        digest = hmac.new(
            app_secret.encode("utf-8"),
            raw_body,
            hashlib.sha256,
        ).hexdigest()
        expected_signature = f"sha256={digest}"
        return hmac.compare_digest(normalized_signature, expected_signature)

    return hmac.compare_digest(normalized_signature, app_secret)
