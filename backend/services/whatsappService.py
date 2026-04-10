import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


async def send_whatsapp_message(*, to: str, text: str) -> dict:
    """
    Send message through provider API when configured.
    If provider credentials are missing, returns simulated success.
    """
    provider_url = os.getenv("WHATSAPP_PROVIDER_URL", "").strip()
    provider_token = os.getenv("WHATSAPP_PROVIDER_TOKEN", "").strip()

    if not provider_url or not provider_token:
        logger.warning("WhatsApp provider not configured, simulating response")
        return {"ok": True, "simulated": True, "to": to}

    payload = {"to": to, "message": text}
    headers = {"Authorization": f"Bearer {provider_token}"}
    async with httpx.AsyncClient(timeout=20.0) as client:
        response = await client.post(provider_url, json=payload, headers=headers)
        response.raise_for_status()
        return {"ok": True, "provider_response": response.json()}


def verify_whatsapp_signature(signature: Optional[str]) -> bool:
    """
    Signature verification placeholder.
    Add official provider signature validation here.
    """
    expected = os.getenv("WHATSAPP_WEBHOOK_SECRET", "").strip()
    if not expected:
        return True
    return signature == expected
