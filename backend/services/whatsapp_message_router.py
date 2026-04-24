from __future__ import annotations

from typing import Any, Dict

from services.nano_channel_router import route_channel_message


async def route_whatsapp_message(
    *,
    user: Dict[str, Any],
    workspace: Dict[str, Any],
    content: str,
    contact_name: str | None = None,
) -> Dict[str, Any]:
    return await route_channel_message(
        user=user,
        workspace=workspace,
        content=content,
        source_channel="whatsapp",
        contact_name=contact_name,
        persist_history=True,
    )
