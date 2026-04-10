import os
from typing import Any, Dict, List

import httpx


class WebSearchService:
    """Web search provider chain: Brave -> Tavily -> DuckDuckGo fallback."""

    def __init__(self) -> None:
        self.brave_api_key = (os.getenv("BRAVE_SEARCH_API_KEY") or "").strip()
        self.tavily_api_key = (os.getenv("TAVILY_API_KEY") or "").strip()

    async def search_web(self, query: str, limit: int = 5) -> Dict[str, Any]:
        clean_query = (query or "").strip()
        if not clean_query:
            return {"provider": "none", "items": []}

        if self.brave_api_key:
            brave_results = await self._search_brave(clean_query, limit)
            if brave_results.get("items"):
                return brave_results

        if self.tavily_api_key:
            tavily_results = await self._search_tavily(clean_query, limit)
            if tavily_results.get("items"):
                return tavily_results

        return await self._search_duckduckgo(clean_query, limit)

    async def _search_brave(self, query: str, limit: int) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=14) as client:
                response = await client.get(
                    "https://api.search.brave.com/res/v1/web/search",
                    params={"q": query, "count": min(max(limit, 1), 20), "country": "br"},
                    headers={
                        "Accept": "application/json",
                        "X-Subscription-Token": self.brave_api_key,
                    },
                )
                response.raise_for_status()
                body = response.json()
            entries = body.get("web", {}).get("results", []) or []
            return {
                "provider": "brave",
                "items": [
                    {
                        "title": item.get("title") or "Resultado",
                        "snippet": item.get("description") or "",
                        "url": item.get("url") or "",
                    }
                    for item in entries[:limit]
                ],
            }
        except Exception:
            return {"provider": "brave", "items": [], "error": "brave_unavailable"}

    async def _search_tavily(self, query: str, limit: int) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=14) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": self.tavily_api_key,
                        "query": query,
                        "search_depth": "advanced",
                        "max_results": min(max(limit, 1), 10),
                    },
                )
                response.raise_for_status()
                body = response.json()
            entries = body.get("results", []) or []
            return {
                "provider": "tavily",
                "items": [
                    {
                        "title": item.get("title") or "Resultado",
                        "snippet": item.get("content") or "",
                        "url": item.get("url") or "",
                    }
                    for item in entries[:limit]
                ],
            }
        except Exception:
            return {"provider": "tavily", "items": [], "error": "tavily_unavailable"}

    async def _search_duckduckgo(self, query: str, limit: int) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=12) as client:
                response = await client.get("https://duckduckgo.com/html/", params={"q": query})
                response.raise_for_status()
                html = response.text
        except Exception:
            return {"provider": "none", "items": [], "error": "web_search_unavailable"}

        items: List[Dict[str, Any]] = []
        chunks = html.split('class="result__a"')[1 : limit + 1]
        for chunk in chunks:
            try:
                href = chunk.split('href="', 1)[1].split('"', 1)[0]
                title = chunk.split(">", 1)[1].split("</a>", 1)[0]
                items.append({"title": title.strip(), "snippet": "", "url": href})
            except Exception:
                continue
        return {"provider": "duckduckgo", "items": items}

