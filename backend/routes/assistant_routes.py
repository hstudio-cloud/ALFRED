import logging
import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from pydantic import BaseModel
from bson import ObjectId

from agent import AgentOrchestrator
from ai_service import AlfredAI
from database import chat_messages_collection, db
from models import ChatMessage, ChatMessageCreate
from routes.auth_routes import get_current_user
from services.nano_orchestrator_service import NanoOrchestratorService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])

load_dotenv(Path(__file__).parent.parent / ".env")
ai = AlfredAI(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY"))
orchestrator = AgentOrchestrator(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or "")
nano_orchestrator = NanoOrchestratorService()


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


class AssistantOrchestrateRequest(BaseModel):
    message: str


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

        # New path: dedicated orchestrator with tool-calling and structured tool metadata.
        orchestrated = await nano_orchestrator.orchestrate(
            message=message_data.content,
            user=current_user,
            workspace=workspace,
        )
        safe_actions = []
        safe_executed_actions = []
        safe_tool_results = _sanitize_json_payload(orchestrated.get("tool_results", {}))
        assistant_content = orchestrated.get("message", "")
        intent_label = orchestrated.get("intent", "general_chat")
        followup_needed = bool(orchestrated.get("followup_needed", False))
        used_tools = orchestrated.get("used_tools", [])

        assistant_message = ChatMessage(
            user_id=current_user["id"],
            role="assistant",
            content=assistant_content,
            metadata={
                "actions": safe_actions,
                "executed_actions": safe_executed_actions,
                "intent": intent_label,
                "tool_results": safe_tool_results,
                "followup_needed": followup_needed,
                "missing_fields": [],
                "agent_metadata": {"used_tools": used_tools, "mode": "orchestrate_v1"},
                "workspace_id": workspace["id"],
            },
        )
        await chat_messages_collection.insert_one(assistant_message.dict())
        return {
            "message": assistant_message.dict(),
            "actions": safe_actions,
            "executed_actions": safe_executed_actions,
            "intent": intent_label,
            "tool_results": safe_tool_results,
            "followup_needed": followup_needed,
            "missing_fields": [],
            "workspace_id": workspace["id"],
            "used_tools": used_tools,
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error processing assistant message: %s", exc)
        # Compatibility fallback: legacy orchestrator path.
        try:
            workspace = await _resolve_workspace(current_user)
            if not workspace:
                raise HTTPException(status_code=400, detail="Crie ou acesse um workspace antes de usar o Nano.")

            conversation_context = await _load_conversation_context(current_user["id"])
            agent_result = await orchestrator.handle_message(
                user=current_user,
                workspace=workspace,
                message=message_data.content,
                conversation_history=conversation_context,
            )
            safe_actions = _sanitize_json_payload(agent_result.actions)
            safe_executed_actions = _sanitize_json_payload(agent_result.executed_actions)
            safe_tool_results = _sanitize_json_payload(agent_result.tool_results)

            assistant_message = ChatMessage(
                user_id=current_user["id"],
                role="assistant",
                content=agent_result.message,
                metadata={
                    "actions": safe_actions,
                    "executed_actions": safe_executed_actions,
                    "intent": agent_result.intent,
                    "tool_results": safe_tool_results,
                    "followup_needed": agent_result.followup_needed,
                    "missing_fields": agent_result.missing_fields,
                    "agent_metadata": _sanitize_json_payload(agent_result.metadata),
                    "workspace_id": workspace["id"],
                    "fallback_mode": "legacy_orchestrator",
                },
            )
            await chat_messages_collection.insert_one(assistant_message.dict())
            return {
                "message": assistant_message.dict(),
                "actions": safe_actions,
                "executed_actions": safe_executed_actions,
                "intent": agent_result.intent,
                "tool_results": safe_tool_results,
                "followup_needed": agent_result.followup_needed,
                "missing_fields": agent_result.missing_fields,
                "workspace_id": workspace["id"],
            }
        except Exception as fallback_exc:
            logger.error("Legacy fallback failed: %s", fallback_exc)
            raise HTTPException(status_code=500, detail="Erro ao processar comando do Nano")


@router.post("/orchestrate")
async def assistant_orchestrate(payload: AssistantOrchestrateRequest, current_user: dict = Depends(get_current_user)):
    try:
        workspace = await _resolve_workspace(current_user)
        if not workspace:
            raise HTTPException(status_code=400, detail="Crie ou acesse um workspace antes de usar o Nano.")

        result = await nano_orchestrator.orchestrate(
            message=payload.message,
            user=current_user,
            workspace=workspace,
        )
        return {
            "intent": result.get("intent", "general_chat"),
            "used_tools": result.get("used_tools", []),
            "tool_results": _sanitize_json_payload(result.get("tool_results", {})),
            "message": result.get("message", ""),
            "followup_needed": bool(result.get("followup_needed", False)),
        }
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Error in /assistant/orchestrate: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao orquestrar comando do Nano")


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
    messages = await chat_messages_collection.find(
        {"user_id": current_user["id"]},
        {"_id": 0},
    ).sort("created_at", -1).limit(50).to_list(50)
    messages.reverse()
    safe_messages = [_sanitize_json_payload(msg) for msg in messages]
    return [ChatMessage(**msg) for msg in safe_messages]


@router.delete("/clear")
async def clear_assistant_history(current_user: dict = Depends(get_current_user)):
    await chat_messages_collection.delete_many({"user_id": current_user["id"]})
    return {"message": "Historico limpo com sucesso"}
