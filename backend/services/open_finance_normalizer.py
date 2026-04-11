from __future__ import annotations

import re
import unicodedata
from typing import Dict


def _normalize(value: str) -> str:
    base = unicodedata.normalize("NFKD", value or "")
    no_accents = "".join(ch for ch in base if not unicodedata.combining(ch))
    lowered = no_accents.lower().strip()
    lowered = re.sub(r"[^a-z0-9\s]", " ", lowered)
    lowered = re.sub(r"\s+", " ", lowered).strip()
    return lowered


class OpenFinanceNormalizer:
    """Normalize provider categories/descriptions into Nano categories."""

    CATEGORY_RULES: Dict[str, str] = {
        "ifood": "Alimentacao",
        "uber eats": "Alimentacao",
        "restaurante": "Alimentacao",
        "mercado": "Alimentacao",
        "supermercado": "Alimentacao",
        "gasolina": "Combustivel",
        "posto": "Combustivel",
        "shell": "Combustivel",
        "ipiranga": "Combustivel",
        "aluguel": "Moradia",
        "energia": "Moradia",
        "agua": "Moradia",
        "internet": "Moradia",
        "farmacia": "Saude",
        "hospital": "Saude",
        "clinica": "Saude",
        "netflix": "Lazer",
        "spotify": "Lazer",
        "cinema": "Lazer",
        "escola": "Educacao",
        "faculdade": "Educacao",
        "curso": "Educacao",
        "onibus": "Transporte",
        "taxi": "Transporte",
        "uber": "Transporte",
        "99": "Transporte",
        "fornecedor": "Fornecedores",
        "pix recebido": "Receitas",
        "salario": "Receitas",
    }

    @classmethod
    def normalize_category(cls, category_raw: str | None, description: str | None) -> str:
        raw = _normalize(category_raw or "")
        desc = _normalize(description or "")
        text = f"{raw} {desc}".strip()
        if not text:
            return "Geral"

        for needle, mapped in cls.CATEGORY_RULES.items():
            if needle in text:
                return mapped
        return "Geral"

