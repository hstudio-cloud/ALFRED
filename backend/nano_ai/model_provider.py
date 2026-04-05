import os
from typing import Any, Dict, List, Optional

import httpx
from openai import AsyncOpenAI

from .types import NanoAction


class ModelProviderBase:
    name = "none"

    async def generate_reply(
        self,
        user_id: str,
        system_message: str,
        prompt_context: str,
        specialists_used: List[str],
        actions: List[NanoAction],
    ) -> str:
        _ = user_id, system_message, prompt_context, specialists_used, actions
        return ""


class OpenAIModelProvider(ModelProviderBase):
    name = "openai"

    def __init__(self, api_key: str, base_url: Optional[str] = None):
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url or None)
        self.text_model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")

    async def generate_reply(
        self,
        user_id: str,
        system_message: str,
        prompt_context: str,
        specialists_used: List[str],
        actions: List[NanoAction],
    ) -> str:
        specialist_summary = ", ".join(specialists_used) if specialists_used else "nenhum especialista especifico"
        prompt = f"""{prompt_context}

Especialistas acionados:
{specialist_summary}

Responda como Nano em ate 4 frases curtas. Se houver acao detectada, confirme o que entendeu e prepare o usuario para a execucao."""

        response = await self.client.responses.create(
            model=self.text_model,
            input=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": prompt},
            ],
            user=user_id,
        )
        return (getattr(response, "output_text", "") or "").strip()


class SelfHostedModelProvider(ModelProviderBase):
    name = "self_hosted"

    def __init__(
        self,
        endpoint_url: str,
        auth_token: str = "",
        timeout_seconds: int = 60,
        model_name: str = "nano_local",
    ):
        self.endpoint_url = endpoint_url
        self.auth_token = auth_token
        self.timeout_seconds = timeout_seconds
        self.model_name = model_name

    async def generate_reply(
        self,
        user_id: str,
        system_message: str,
        prompt_context: str,
        specialists_used: List[str],
        actions: List[NanoAction],
    ) -> str:
        payload: Dict[str, Any] = {
            "user_id": user_id,
            "system_message": system_message,
            "context": prompt_context,
            "specialists_used": specialists_used,
            "actions": [
                {
                    "type": action.type,
                    "data": action.data,
                    "assumptions": action.assumptions,
                    "confidence": action.confidence,
                }
                for action in actions
            ],
            "response_style": {
                "locale": "pt-BR",
                "max_sentences": 4,
                "tone": "executivo, claro, objetivo",
            },
        }

        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"

        async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
            response = await client.post(self.endpoint_url, json=payload, headers=headers)
            response.raise_for_status()
            body = response.json()
            return (body.get("text") or body.get("response") or "").strip()


def resolve_model_provider(api_key: str = "") -> Optional[ModelProviderBase]:
    provider_name = os.getenv("NANO_LLM_PROVIDER", "auto").strip().lower() or "auto"
    llm_url = os.getenv("NANO_LLM_URL", "").strip()
    llm_auth_token = os.getenv("NANO_LLM_AUTH_TOKEN", "").strip()
    llm_timeout = int(os.getenv("NANO_LLM_TIMEOUT", "60"))
    openai_base_url = os.getenv("OPENAI_BASE_URL", "").strip()

    resolved = provider_name
    if provider_name == "auto":
        if llm_url:
            resolved = "self_hosted"
        elif api_key:
            resolved = "openai"
        else:
            resolved = "none"

    if resolved == "self_hosted" and llm_url:
        return SelfHostedModelProvider(
            endpoint_url=llm_url,
            auth_token=llm_auth_token,
            timeout_seconds=llm_timeout,
            model_name=os.getenv("OLLAMA_MODEL", "nano_local"),
        )
    if resolved == "openai" and api_key:
        return OpenAIModelProvider(api_key=api_key, base_url=openai_base_url or None)
    return None
