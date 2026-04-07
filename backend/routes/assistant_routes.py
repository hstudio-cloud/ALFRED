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
from database import chat_messages_collection, db
from models import ChatMessage, ChatMessageCreate
from routes.auth_routes import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])

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


class AssistantVoiceRequest(BaseModel):
    text: str
    locale: str = "pt-BR"
    voice_mode: str = "default"
    speed: float = 1.0
    metadata: dict = {}


class AssistantVoiceStatusResponse(BaseModel):
    provider: str
    premium_available: bool
    transcription_available: bool
    llm_provider: str
    llm_model: str
    voice_provider: str
    runtime_mode: str


async def _resolve_workspace(current_user: dict) -> Optional[dict]:
    workspaces = await db.workspaces.find(
        {"$or": [{"owner_id": current_user["id"]}, {"members": current_user["id"]}]}
    ).sort("created_at", 1).to_list(1)
    return workspaces[0] if workspaces else None


async def _load_conversation_context(user_id: str) -> list:
    messages = await chat_messages_collection.find({"user_id": user_id}).sort("created_at", -1).limit(8).to_list(8)
    messages.reverse()
    return [{"role": item.get("role", "user"), "content": item.get("content", "")} for item in messages]


@router.post("/message")
async def assistant_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    try:
        user_message = ChatMessage(user_id=current_user["id"], role="user", content=message_data.content)
        await chat_messages_collection.insert_one(user_message.dict())

        workspace = await _resolve_workspace(current_user)
        if not workspace:
            raise HTTPException(status_code=400, detail="Crie ou acesse um workspace antes de usar o Nano.")

        ai_response = await ai.process_message(
            current_user["id"],
            message_data.content,
            conversation_history=await _load_conversation_context(current_user["id"]),
            memory_profile=await ai.load_memory_profile(current_user["id"]),
        )
        executed_actions = await ai.execute_actions(workspace["id"], current_user, ai_response["actions"])
        safe_actions = _sanitize_json_payload(ai_response["actions"])
        safe_executed_actions = _sanitize_json_payload(executed_actions)
        await ai.persist_memory_profile(current_user["id"], ai_response["actions"], message_data.content)

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
        logger.error("Error processing assistant message: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao processar comando do Nano")


@router.post("/speech")
async def assistant_speech(payload: AssistantVoiceRequest, current_user: dict = Depends(get_current_user)):
    audio_bytes = await ai.synthesize_speech(
        payload.text,
        locale=payload.locale,
        voice_mode=payload.voice_mode,
        speed=payload.speed,
        metadata=payload.metadata,
    )
    if audio_bytes is None:
        raise HTTPException(status_code=503, detail="Sintese de voz indisponivel no momento.")
    media_type = "audio/wav" if ai.get_voice_provider_name() == "self_hosted" else "audio/mpeg"
    return Response(content=audio_bytes, media_type=media_type)


@router.post("/transcribe")
async def assistant_transcribe(
    audio: UploadFile = File(...),
    locale: str = Form("pt-BR"),
    current_user: dict = Depends(get_current_user),
):
    audio_bytes = await audio.read()
    transcript = await ai.transcribe_audio(
        audio_bytes=audio_bytes,
        locale=locale,
        mime_type=audio.content_type or "audio/webm",
    )
    return {"text": transcript, "provider": ai.get_voice_provider_name()}


@router.get("/voice-status", response_model=AssistantVoiceStatusResponse)
async def assistant_voice_status(current_user: dict = Depends(get_current_user)):
    provider = ai.get_voice_provider_name()
    llm_provider = ai.get_model_provider_name()
    llm_model = ai.get_model_name()
    runtime_mode = "self_hosted" if provider == "self_hosted" and llm_provider == "self_hosted" else "hybrid"
    if provider == "browser_fallback" and llm_provider == "rule_based":
        runtime_mode = "local_fallback"
    elif provider == "openai" or llm_provider == "openai":
        runtime_mode = "hosted"

    return AssistantVoiceStatusResponse(
        provider=provider,
        premium_available=provider in {"openai", "self_hosted"},
        transcription_available=provider in {"openai", "self_hosted"},
        llm_provider=llm_provider,
        llm_model=llm_model,
        voice_provider=provider,
        runtime_mode=runtime_mode,
    )


@router.get("/history", response_model=List[ChatMessage])
async def assistant_history(current_user: dict = Depends(get_current_user)):
    messages = await chat_messages_collection.find({"user_id": current_user["id"]}).sort("created_at", -1).limit(50).to_list(50)
    messages.reverse()
    return [ChatMessage(**msg) for msg in messages]


@router.delete("/clear")
async def clear_assistant_history(current_user: dict = Depends(get_current_user)):
    await chat_messages_collection.delete_many({"user_id": current_user["id"]})
    return {"message": "Historico limpo com sucesso"}
