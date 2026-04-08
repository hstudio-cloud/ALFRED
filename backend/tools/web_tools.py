import os
from typing import Any, Dict, List

import httpx


async def web_search(query: str) -> Dict[str, Any]:
    """Web search adapter with provider fallback.

    Supported providers:
    - TAVILY_API_KEY (priority)
    - SERPAPI_API_KEY
    - DuckDuckGo HTML fallback (no key)
    """
    query = (query or "").strip()
    if not query:
        return {"items": []}

    tavily_key = os.getenv("TAVILY_API_KEY", "").strip()
    serpapi_key = os.getenv("SERPAPI_API_KEY", "").strip()

    if tavily_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.post(
                    "https://api.tavily.com/search",
                    json={
                        "api_key": tavily_key,
                        "query": query,
                        "search_depth": "advanced",
                        "max_results": 5,
                    },
                )
                response.raise_for_status()
                body = response.json()
            results = body.get("results") or []
            return {
                "provider": "tavily",
                "items": [
                    {
                        "title": item.get("title"),
                        "url": item.get("url"),
                        "snippet": item.get("content"),
                    }
                    for item in results
                ],
            }
        except Exception:
            pass

    if serpapi_key:
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                response = await client.get(
                    "https://serpapi.com/search.json",
                    params={
                        "engine": "google",
                        "q": query,
                        "api_key": serpapi_key,
                        "hl": "pt-br",
                        "gl": "br",
                    },
                )
                response.raise_for_status()
                body = response.json()
            organic = body.get("organic_results") or []
            return {
                "provider": "serpapi",
                "items": [
                    {
                        "title": item.get("title"),
                        "url": item.get("link"),
                        "snippet": item.get("snippet"),
                    }
                    for item in organic[:5]
                ],
            }
        except Exception:
            pass

    url = "https://duckduckgo.com/html/"
    params = {"q": query}
    try:
        async with httpx.AsyncClient(timeout=12) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            html = response.text
    except Exception:
        return {"items": [], "provider": "none", "error": "web_search_unavailable"}

    items: List[Dict[str, Any]] = []
    marker = 'class="result__a"'
    chunks = html.split(marker)[1:6]
    for chunk in chunks:
        try:
            href_part = chunk.split('href="', 1)[1]
            href = href_part.split('"', 1)[0]
            title = chunk.split(">", 1)[1].split("</a>", 1)[0]
            items.append({"title": title.strip(), "url": href})
        except Exception:
            continue
    return {"items": items, "provider": "duckduckgo"}


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
