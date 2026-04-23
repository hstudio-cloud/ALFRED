import base64
import json
import os
import re
import unicodedata
from typing import Any, Dict

from openai import AsyncOpenAI


class WorkspaceDocumentService:
    """Extrai e normaliza dados de cartão CNPJ a partir de uma imagem."""

    def __init__(self):
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
        base_url = (os.getenv("OPENAI_BASE_URL") or "").strip() or None
        self.model = (
            os.getenv("OPENAI_DOCUMENT_MODEL")
            or os.getenv("OPENAI_VISION_MODEL")
            or os.getenv("OPENAI_TEXT_MODEL")
            or "gpt-4.1-mini"
        ).strip()

        default_headers: Dict[str, str] = {}
        if base_url and "openrouter.ai" in base_url:
            site_url = (os.getenv("OPENROUTER_SITE_URL") or "").strip()
            app_name = (os.getenv("OPENROUTER_APP_NAME") or "Nano IA").strip()
            if site_url:
                default_headers["HTTP-Referer"] = site_url
            if app_name:
                default_headers["X-Title"] = app_name

        self.client = AsyncOpenAI(
            api_key=api_key or "ollama",
            base_url=base_url,
            default_headers=default_headers or None,
        )

    async def extract_cnpj_card(self, *, file_bytes: bytes, mime_type: str) -> Dict[str, Any]:
        data_url = self._to_data_url(file_bytes, mime_type)
        prompt = (
            "Leia este cartao CNPJ brasileiro e extraia apenas os dados que realmente estiverem visiveis. "
            "Responda apenas JSON valido, sem markdown. "
            "Campos esperados: legal_name, trade_name, cnpj, opening_date, status, legal_nature, "
            "main_activity, address_street, address_number, address_complement, neighborhood, city, state, cep. "
            "Nao invente dados. Se um campo nao estiver visivel, retorne string vazia."
        )

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Voce extrai dados de documentos empresariais brasileiros. "
                        "Responda somente JSON valido. "
                        "Priorize precisao e nunca invente informacoes."
                    ),
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": data_url}},
                    ],
                },
            ],
            temperature=0,
            max_tokens=900,
        )

        content = response.choices[0].message.content
        if isinstance(content, list):
            text = "\n".join(
                item.get("text", "")
                for item in content
                if isinstance(item, dict) and item.get("type") == "text"
            )
        else:
            text = str(content or "")

        payload = self._extract_json_object(text)
        if not payload:
            raise ValueError("Nao consegui extrair dados estruturados do cartao CNPJ.")
        return self._normalize_payload(payload)

    @staticmethod
    def build_workspace_update(*, current_workspace: dict, extracted: Dict[str, Any]) -> Dict[str, Any]:
        legal_name = extracted.get("legal_name") or ""
        trade_name = extracted.get("trade_name") or ""
        preferred_name = trade_name or legal_name or current_workspace.get("name") or ""

        address_line = " ".join(
            part
            for part in [
                extracted.get("address_street") or "",
                extracted.get("address_number") or "",
            ]
            if part
        ).strip()

        description_parts = [
            part
            for part in [
                extracted.get("main_activity") or "",
                extracted.get("legal_nature") or "",
            ]
            if part
        ]
        description = " • ".join(description_parts) or current_workspace.get("description") or ""

        existing_settings = current_workspace.get("settings") or {}
        existing_profile = existing_settings.get("company_profile") or {}

        company_profile = {
            **existing_profile,
            "document_type": "cnpj",
            "document": extracted.get("cnpj") or existing_profile.get("document") or "",
            "legal_name": legal_name or existing_profile.get("legal_name") or "",
            "trade_name": trade_name or existing_profile.get("trade_name") or "",
            "opening_date": extracted.get("opening_date") or existing_profile.get("opening_date") or "",
            "status": extracted.get("status") or existing_profile.get("status") or "",
            "legal_nature": extracted.get("legal_nature") or existing_profile.get("legal_nature") or "",
            "main_activity": extracted.get("main_activity") or existing_profile.get("main_activity") or "",
            "address": address_line or existing_profile.get("address") or "",
            "complement": extracted.get("address_complement") or existing_profile.get("complement") or "",
            "neighborhood": extracted.get("neighborhood") or existing_profile.get("neighborhood") or "",
            "city": extracted.get("city") or existing_profile.get("city") or "",
            "state": extracted.get("state") or existing_profile.get("state") or "",
            "cep": extracted.get("cep") or existing_profile.get("cep") or "",
            "business_type": existing_profile.get("business_type") or WorkspaceDocumentService._infer_business_type(extracted),
            "tax_regime": existing_profile.get("tax_regime") or "simples",
            "phone": existing_profile.get("phone") or "",
            "website": existing_profile.get("website") or "",
        }

        return {
            "name": preferred_name,
            "subdomain": WorkspaceDocumentService._slugify(preferred_name) or current_workspace.get("subdomain") or "",
            "description": description,
            "settings": {
                **existing_settings,
                "company_profile": company_profile,
            },
        }

    @staticmethod
    def _to_data_url(file_bytes: bytes, mime_type: str) -> str:
        encoded = base64.b64encode(file_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{encoded}"

    @staticmethod
    def _extract_json_object(text: str) -> Dict[str, Any]:
        raw = (text or "").strip()
        if not raw:
            return {}
        candidates = [raw]
        fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.DOTALL)
        candidates.extend(fenced)
        brace_match = re.search(r"(\{.*\})", raw, flags=re.DOTALL)
        if brace_match:
            candidates.append(brace_match.group(1))

        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue
        return {}

    @staticmethod
    def _normalize_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
        cnpj = WorkspaceDocumentService._format_cnpj(payload.get("cnpj"))
        state = str(payload.get("state") or "").strip().upper()[:2]
        cep = WorkspaceDocumentService._format_cep(payload.get("cep"))
        normalized = {
            "legal_name": str(payload.get("legal_name") or "").strip(),
            "trade_name": str(payload.get("trade_name") or "").strip(),
            "cnpj": cnpj,
            "opening_date": str(payload.get("opening_date") or "").strip(),
            "status": str(payload.get("status") or "").strip(),
            "legal_nature": str(payload.get("legal_nature") or "").strip(),
            "main_activity": str(payload.get("main_activity") or "").strip(),
            "address_street": str(payload.get("address_street") or "").strip(),
            "address_number": str(payload.get("address_number") or "").strip(),
            "address_complement": str(payload.get("address_complement") or "").strip(),
            "neighborhood": str(payload.get("neighborhood") or "").strip(),
            "city": str(payload.get("city") or "").strip(),
            "state": state,
            "cep": cep,
        }
        return normalized

    @staticmethod
    def _format_cnpj(value: Any) -> str:
        digits = re.sub(r"\D", "", str(value or ""))
        if len(digits) != 14:
            return str(value or "").strip()
        return f"{digits[0:2]}.{digits[2:5]}.{digits[5:8]}/{digits[8:12]}-{digits[12:14]}"

    @staticmethod
    def _format_cep(value: Any) -> str:
        digits = re.sub(r"\D", "", str(value or ""))
        if len(digits) != 8:
            return str(value or "").strip()
        return f"{digits[:5]}-{digits[5:]}"

    @staticmethod
    def _infer_business_type(extracted: Dict[str, Any]) -> str:
        source = " ".join(
            [
                str(extracted.get("main_activity") or ""),
                str(extracted.get("legal_nature") or ""),
            ]
        ).lower()
        if any(term in source for term in ["loja", "varejo", "comercio", "comércio"]):
            return "comercio"
        if any(term in source for term in ["industria", "industrial", "fabrica", "fábrica"]):
            return "industria"
        if any(term in source for term in ["software", "tecnologia", "digital", "internet"]):
            return "digital"
        return "servicos"

    @staticmethod
    def _slugify(value: str) -> str:
        text = unicodedata.normalize("NFKD", value or "").encode("ascii", "ignore").decode("ascii")
        text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower()).strip("-")
        return text[:40]
