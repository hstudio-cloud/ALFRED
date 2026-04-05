import logging
import os
from typing import Any, Dict, List

from fastapi import FastAPI, HTTPException
from openai import AsyncOpenAI
from pydantic import BaseModel


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nano.llm_adapter")


class GenerateRequest(BaseModel):
    user_id: str
    system_message: str
    context: str
    specialists_used: List[str] = []
    actions: List[Dict[str, Any]] = []
    response_style: Dict[str, Any] = {}


class GenerateResponse(BaseModel):
    text: str
    provider: str
    model: str


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5:3b")
OLLAMA_API_KEY = os.getenv("OLLAMA_API_KEY", "ollama")

client = AsyncOpenAI(
    base_url=OLLAMA_BASE_URL,
    api_key=OLLAMA_API_KEY,
)

app = FastAPI(title="Nano Local LLM Adapter", version="1.0.0")


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "provider": "ollama_openai_compatible",
        "model": OLLAMA_MODEL,
    }


@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest) -> GenerateResponse:
    specialist_summary = ", ".join(request.specialists_used) if request.specialists_used else "nenhum especialista especifico"
    style = request.response_style or {}
    max_sentences = style.get("max_sentences", 4)
    locale = style.get("locale", "pt-BR")
    tone = style.get("tone", "executivo, claro e objetivo")

    prompt = f"""{request.context}

Especialistas acionados:
{specialist_summary}

Idioma:
{locale}

Tom esperado:
{tone}

Instrucoes adicionais:
- assuma que a mensagem pode vir de voz com pequenas falhas de transcricao
- priorize termos financeiros provaveis em portugues do Brasil
- se houver acoes detectadas, use essas acoes como fonte principal da resposta
- so peca esclarecimento quando faltar um dado realmente necessario

Responda como Nano em no maximo {max_sentences} frases curtas. Se houver acao detectada, confirme o que entendeu e prepare o usuario para a execucao."""

    try:
        response = await client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": request.system_message},
                {"role": "user", "content": prompt},
            ],
            temperature=0.35,
        )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise HTTPException(status_code=502, detail="Modelo local nao retornou texto.")
        return GenerateResponse(
            text=text,
            provider="ollama_openai_compatible",
            model=OLLAMA_MODEL,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("LLM adapter failed: %s", exc)
        raise HTTPException(
            status_code=503,
            detail=(
                "Nao consegui gerar resposta no modelo local. "
                "Verifique se o Ollama esta rodando e se o modelo foi baixado."
            ),
        )
