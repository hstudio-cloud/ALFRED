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
from services.nano_channel_router import route_channel_message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/assistant", tags=["assistant"])

load_dotenv(Path(__file__).parent.parent / ".env")
ai = AlfredAI(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY"))
orchestrator = AgentOrchestrator(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or "")


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


def _model_dump(instance):
    if hasattr(instance, "model_dump"):
        return instance.model_dump()
    return instance.dict()


def _coerce_tool_results_map(value):
    if isinstance(value, dict):
        return value
    return {}


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
    message: str | None = None
    content: str | None = None


async def _resolve_workspace(current_user: dict) -> Optional[dict]:
    workspaces = await db.workspaces.find(
        {"$or": [{"owner_id": current_user["id"]}, {"members": current_user["id"]}]}
    ).sort("created_at", 1).to_list(1)
    return workspaces[0] if workspaces else None


async def _load_conversation_context(user_id: str) -> list:
    messages = await chat_messages_collection.find({"user_id": user_id}).sort("created_at", -1).limit(8).to_list(8)
    messages.reverse()
    return [
        {
            "role": item.get("role", "user"),
            "content": item.get("content", ""),
            "metadata": _sanitize_json_payload(item.get("metadata") or {}),
        }
        for item in messages
    ]


async def _legacy_orchestrator_fallback(*, content: str, current_user: dict):
    workspace = await _resolve_workspace(current_user)
    if not workspace:
        raise HTTPException(status_code=400, detail="Crie ou acesse um workspace antes de usar o Nano.")

    conversation_context = await _load_conversation_context(current_user["id"])
    agent_result = await orchestrator.handle_message(
        user=current_user,
        workspace=workspace,
        message=content,
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
    payload = _model_dump(assistant_message)
    await chat_messages_collection.insert_one(payload)
    return {
        "message": payload,
        "actions": safe_actions,
        "executed_actions": safe_executed_actions,
        "intent": agent_result.intent,
        "tool_results": safe_tool_results,
        "followup_needed": agent_result.followup_needed,
        "missing_fields": agent_result.missing_fields,
        "workspace_id": workspace["id"],
    }


async def _build_safe_assistant_failure_response(*, content: str, current_user: dict, detail: str):
    workspace = await _resolve_workspace(current_user)
    workspace_id = workspace["id"] if workspace else None
    message_payload = {
        "id": str(ObjectId()),
        "user_id": current_user["id"],
        "role": "assistant",
        "content": detail,
        "metadata": {
            "intent": "orchestration_error",
            "actions": [],
            "executed_actions": [],
            "tool_results": {},
            "execution_status": "failed",
            "workspace_id": workspace_id,
        },
    }
    return {
        "intent": "orchestration_error",
        "used_tools": [],
        "tool_results": {},
        "message": _sanitize_json_payload(message_payload),
        "followup_needed": False,
        "missing_fields": [],
        "actions": [],
        "executed_actions": [],
        "execution_status": "failed",
        "workspace_id": workspace_id,
        "risk_level": "low_risk",
        "requires_confirmation": False,
    }


@router.post("/message")
async def assistant_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    try:
        return await _process_orchestrated_message(
            content=message_data.content,
            current_user=current_user,
            persist_history=True,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error processing assistant message: %s", exc)
        # Compatibility fallback: legacy orchestrator path.
        try:
            return await _legacy_orchestrator_fallback(
                content=message_data.content,
                current_user=current_user,
            )
        except Exception as fallback_exc:
            logger.exception("Legacy fallback failed: %s", fallback_exc)
            return await _build_safe_assistant_failure_response(
                content=message_data.content,
                current_user=current_user,
                detail="Encontrei uma falha temporaria no Nano. O chat por texto continua disponivel.",
            )


@router.post("/orchestrate")
async def assistant_orchestrate(payload: AssistantOrchestrateRequest, current_user: dict = Depends(get_current_user)):
    try:
        content = (payload.content or payload.message or "").strip()
        if not content:
            raise HTTPException(status_code=400, detail="Mensagem vazia para orquestracao.")
        return await _process_orchestrated_message(
            content=content,
            current_user=current_user,
            persist_history=True,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Error in /assistant/orchestrate: %s", exc)
        try:
            return await _legacy_orchestrator_fallback(
                content=(payload.content or payload.message or "").strip(),
                current_user=current_user,
            )
        except Exception as fallback_exc:
            logger.exception("Legacy fallback failed in /assistant/orchestrate: %s", fallback_exc)
            return await _build_safe_assistant_failure_response(
                content=(payload.content or payload.message or "").strip(),
                current_user=current_user,
                detail="Encontrei uma falha temporaria no Nano. Me envie o valor e a categoria de forma mais direta que eu tento de novo.",
            )


async def _process_orchestrated_message(
    *,
    content: str,
    current_user: dict,
    persist_history: bool,
):
    workspace = await _resolve_workspace(current_user)
    if not workspace:
        raise HTTPException(status_code=400, detail="Crie ou acesse um workspace antes de usar o Nano.")
    routed = await route_channel_message(
        user=current_user,
        workspace=workspace,
        content=content,
        source_channel="web_chat",
        persist_history=persist_history,
    )
    safe_actions = _sanitize_json_payload(routed.get("actions") or [])
    safe_executed_actions = _sanitize_json_payload(routed.get("executed_actions") or [])
    safe_tool_results = _coerce_tool_results_map(_sanitize_json_payload(routed.get("tool_results") or {}))
    used_tools = list(safe_tool_results.keys())
    execution_status = "awaiting_confirmation" if routed.get("requires_confirmation") else "executed"

    message_payload = routed.get("assistant_message") or {
        "role": "assistant",
        "content": routed.get("reply") or "",
        "metadata": {
            "actions": safe_actions,
            "executed_actions": safe_executed_actions,
            "intent": routed.get("intent"),
            "tool_results": safe_tool_results,
            "workspace_id": workspace["id"],
            "execution_status": execution_status,
            "risk_level": routed.get("risk_level"),
            "requires_confirmation": routed.get("requires_confirmation", False),
        },
    }
    message_payload = _sanitize_json_payload(message_payload)

    return {
        "intent": routed.get("intent"),
        "used_tools": used_tools,
        "tool_results": safe_tool_results,
        "message": message_payload,
        "followup_needed": bool(routed.get("followup_needed")),
        "missing_fields": list(routed.get("missing_fields") or []),
        "actions": safe_actions,
        "executed_actions": safe_executed_actions,
        "execution_status": execution_status,
        "workspace_id": workspace["id"],
        "risk_level": routed.get("risk_level"),
        "requires_confirmation": routed.get("requires_confirmation", False),
    }


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
