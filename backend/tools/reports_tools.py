from collections import defaultdict
from datetime import datetime
from typing import Any, Dict

from database import transactions_collection


async def get_top_categories(workspace_id: str) -> Dict[str, Any]:
    start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    rows = await transactions_collection.find(
        {"workspace_id": workspace_id, "type": "expense", "date": {"$gte": start}}
    ).to_list(3000)
    grouped = defaultdict(float)
    for row in rows:
        grouped[row.get("category") or "Geral"] += float(row.get("amount", 0))
    top = sorted(grouped.items(), key=lambda item: item[1], reverse=True)[:5]
    return {"items": [{"category": c, "amount": round(v, 2)} for c, v in top], "month_start": start.isoformat()}

