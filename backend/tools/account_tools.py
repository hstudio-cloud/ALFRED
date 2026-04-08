from typing import Any, Dict, Optional

from database import accounts_collection, transactions_collection


def _normalize_scope(scope: Optional[str]) -> Optional[str]:
    if not scope:
        return None
    scope = scope.lower().strip()
    if scope in {"general", "geral", "all"}:
        return None
    if scope in {"personal", "pessoal"}:
        return "personal"
    if scope in {"business", "empresa"}:
        return "business"
    return None


async def get_account_balances(workspace_id: str, scope: Optional[str] = None) -> Dict[str, Any]:
    query = {"workspace_id": workspace_id}
    normalized = _normalize_scope(scope)
    if normalized:
        query["account_scope"] = normalized
    accounts = await accounts_collection.find(query).to_list(500)

    results = []
    for account in accounts:
        account_id = account.get("id")
        tx = await transactions_collection.find({"workspace_id": workspace_id, "account_id": account_id}).to_list(4000)
        variation = 0.0
        for item in tx:
            amount = float(item.get("amount", 0))
            variation += amount if item.get("type") == "income" else -amount
        initial_balance = float(account.get("initial_balance", 0))
        account.pop("_id", None)
        results.append(
            {
                "id": account_id,
                "name": account.get("name"),
                "scope": account.get("account_scope"),
                "balance": round(initial_balance + variation, 2),
            }
        )
    return {"items": results, "count": len(results)}

