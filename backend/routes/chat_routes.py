import logging
import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from bson import ObjectId

from ai_service import AlfredAI
from database import (
    chat_messages_collection,
    db,
)
from models import ChatMessage, ChatMessageCreate
from routes.auth_routes import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

load_dotenv(Path(__file__).parent.parent / ".env")
ai = AlfredAI(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY"))


def _sanitize_json_payload(value):
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, dict):
        return {key: _sanitize_json_payload(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_sanitize_json_payload(item) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_json_payload(item) for item in value]
    return value


class SpeechRequest(BaseModel):
    text: str
    locale: str = "pt-BR"
    voice_mode: str = "default"
    speed: float = 1.0
    metadata: dict = {}


class VoiceStatusResponse(BaseModel):
    provider: str
    premium_available: bool
    transcription_available: bool
    llm_provider: str
    llm_model: str
    voice_provider: str
    runtime_mode: str


async def _resolve_workspace(current_user: dict) -> Optional[dict]:
    workspaces = await db.workspaces.find(
        {
            "$or": [
                {"owner_id": current_user["id"]},
                {"members": current_user["id"]},
            ]
        }
    ).sort("created_at", 1).to_list(1)
    return workspaces[0] if workspaces else None


async def _load_conversation_context(user_id: str) -> list:
    messages = await chat_messages_collection.find(
        {"user_id": user_id}
    ).sort("created_at", -1).limit(8).to_list(8)
    messages.reverse()
    return [
        {
            "role": item.get("role", "user"),
            "content": item.get("content", ""),
        }
        for item in messages
    ]
@router.post("/message", response_model=dict)
async def send_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Enviar mensagem para o Nano AI."""
    try:
        user_message = ChatMessage(
            user_id=current_user["id"],
            role="user",
            content=message_data.content,
        )
        await chat_messages_collection.insert_one(user_message.dict())

        workspace = await _resolve_workspace(current_user)
        if not workspace:
            raise HTTPException(
                status_code=400,
                detail="Crie ou acesse um workspace antes de usar o assistente Nano.",
            )

        conversation_history = await _load_conversation_context(current_user["id"])
        memory_profile = await ai.load_memory_profile(current_user["id"])

        ai_response = await ai.process_message(
            current_user["id"],
            message_data.content,
            conversation_history=conversation_history,
            memory_profile=memory_profile,
        )
        executed_actions = await ai.execute_actions(workspace["id"], current_user, ai_response["actions"])
        safe_actions = _sanitize_json_payload(ai_response["actions"])
        safe_executed_actions = _sanitize_json_payload(executed_actions)
        await ai.persist_memory_profile(
            current_user["id"],
            ai_response["actions"],
            message_data.content,
        )
        assistant_content = ai.compose_assistant_reply(
            workspace_name=workspace.get("name", "principal"),
            executed_actions=executed_actions,
            fallback_response=ai_response["response"],
        )

        assistant_message = ChatMessage(
            user_id=current_user["id"],
            role="assistant",
            content=assistant_content,
            metadata={
                "actions": safe_actions,
                "executed_actions": safe_executed_actions,
                "workspace_id": workspace["id"],
            },
        )
        await chat_messages_collection.insert_one(assistant_message.dict())

        return {
            "message": assistant_message.dict(),
            "actions": safe_actions,
            "executed_actions": safe_executed_actions,
            "workspace_id": workspace["id"],
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error sending message: {exc}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar mensagem: {str(exc)}")


@router.post("/speech")
async def synthesize_speech(payload: SpeechRequest, current_user: dict = Depends(get_current_user)):
    """Gera audio de resposta com voz mais natural quando a OpenAI estiver configurada."""
    try:
        audio_bytes = await ai.synthesize_speech(
            payload.text,
            locale=payload.locale,
            voice_mode=payload.voice_mode,
            speed=payload.speed,
            metadata=payload.metadata,
        )
        if audio_bytes is None:
            raise HTTPException(
                status_code=503,
                detail="Sintese de voz premium indisponivel. Configure OPENAI_API_KEY para habilitar.",
            )
        media_type = "audio/wav" if ai.get_voice_provider_name() == "self_hosted" else "audio/mpeg"
        return Response(content=audio_bytes, media_type=media_type)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating speech: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao gerar audio")


@router.post("/transcribe", response_model=dict)
async def transcribe_audio(
    audio: UploadFile = File(...),
    locale: str = Form("pt-BR"),
    current_user: dict = Depends(get_current_user),
):
    """Transcreve audio no backend usando o provider de voz configurado."""
    try:
        audio_bytes = await audio.read()
        if not audio_bytes:
            raise HTTPException(status_code=400, detail="Arquivo de audio vazio.")

        transcript = await ai.transcribe_audio(
            audio_bytes=audio_bytes,
            locale=locale,
            mime_type=audio.content_type or "audio/webm",
        )
        if not transcript:
            return {
                "text": "",
                "provider": ai.get_voice_provider_name(),
                "reason": "empty_transcript",
            }

        return {
            "text": transcript,
            "provider": ai.get_voice_provider_name(),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error transcribing audio: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao transcrever audio")


@router.get("/voice-status", response_model=VoiceStatusResponse)
async def get_voice_status(current_user: dict = Depends(get_current_user)):
    """Exibe o provider de voz atual do Nano para diagnostico e fallback."""
    provider = ai.get_voice_provider_name()
    llm_provider = ai.get_model_provider_name()
    llm_model = ai.get_model_name()
    runtime_mode = "self_hosted" if provider == "self_hosted" and llm_provider == "self_hosted" else "hybrid"
    if provider == "browser_fallback" and llm_provider == "rule_based":
        runtime_mode = "local_fallback"
    elif provider == "openai" or llm_provider == "openai":
        runtime_mode = "hosted"

    return VoiceStatusResponse(
        provider=provider,
        premium_available=provider in {"openai", "self_hosted"},
        transcription_available=provider in {"openai", "self_hosted"},
        llm_provider=llm_provider,
        llm_model=llm_model,
        voice_provider=provider,
        runtime_mode=runtime_mode,
    )


@router.get("/history", response_model=List[ChatMessage])
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Obter historico de chat."""
    try:
        messages = await chat_messages_collection.find(
            {"user_id": current_user["id"]},
            {"_id": 0},
        ).sort("created_at", -1).limit(50).to_list(50)
        messages.reverse()
        return [ChatMessage(**msg) for msg in messages]
    except Exception as exc:
        logger.error(f"Error getting chat history: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao buscar historico")


@router.delete("/clear")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Limpar historico de chat."""
    try:
        await chat_messages_collection.delete_many({"user_id": current_user["id"]})
        return {"message": "Historico limpo com sucesso"}
    except Exception as exc:
        logger.error(f"Error clearing chat history: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao limpar historico")
