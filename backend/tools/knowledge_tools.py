import re
from typing import Any, Dict


async def search_internal_knowledge(query: str) -> Dict[str, Any]:
    text = (query or "").strip().lower()
    if not text:
        return {"items": [], "source": "internal_knowledge"}

    kb = [
        {
            "title": "Registrar despesa e receita",
            "keywords": ["despesa", "receita", "registrar", "movimentacao"],
            "content": "Use comandos como 'criar despesa de 80 em combustivel' ou 'registrar receita de 1200'.",
        },
        {
            "title": "Agenda e lembretes",
            "keywords": ["agenda", "lembrete", "vencimento", "hoje"],
            "content": "Pergunte 'o que temos para hoje?' para listar seus lembretes ativos do dia.",
        },
        {
            "title": "Fluxo de caixa e previsao",
            "keywords": ["fluxo de caixa", "previsao", "saldo", "30", "60", "90"],
            "content": "O Nano calcula fluxo atual e projecao futura considerando contas pendentes e movimentacoes.",
        },
        {
            "title": "Escopos pessoal, empresa e geral",
            "keywords": ["pessoal", "empresa", "geral", "escopo"],
            "content": "Pessoal para PF, empresa para PJ e geral para visao consolidada.",
        },
    ]

    scored = []
    for item in kb:
        score = 0
        for keyword in item["keywords"]:
            if re.search(rf"\b{re.escape(keyword)}\b", text):
                score += 1
        if score > 0:
            scored.append({"score": score, **item})

    scored.sort(key=lambda row: row["score"], reverse=True)
    items = [{"title": row["title"], "content": row["content"]} for row in scored[:5]]
    return {"items": items, "source": "internal_knowledge"}

