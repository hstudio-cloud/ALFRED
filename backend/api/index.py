from typing import Any

from server import app as base_app


class PrefixASGIApp:
    """Normalize Vercel function paths so FastAPI keeps the /api prefix routes."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope: dict[str, Any], receive, send):
        if scope.get("type") in {"http", "websocket"}:
            path = scope.get("path", "") or ""
            if not path.startswith("/api"):
                prefixed = f"/api{path}" if path.startswith("/") else f"/api/{path}"
                scope = {**scope, "path": prefixed}
        await self.app(scope, receive, send)


# Vercel Python runtime looks for a module-level ASGI app named `app`.
app = PrefixASGIApp(base_app)
