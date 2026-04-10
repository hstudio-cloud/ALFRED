from typing import Any, Dict

import httpx

from services.web_search_service import WebSearchService

_web_search_service = WebSearchService()


async def search_web(query: str) -> Dict[str, Any]:
    return await _web_search_service.search_web(query=query, limit=5)


async def web_search(query: str) -> Dict[str, Any]:
    # Backward-compatible alias used in current agent planner.
    return await search_web(query=query)


async def web_fetch(url: str) -> Dict[str, Any]:
    if not url:
        return {"content": "", "error": "missing_url"}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(url)
            response.raise_for_status()
            text = response.text[:5000]
        return {"content": text}
    except Exception:
        return {"content": "", "error": "fetch_unavailable"}

