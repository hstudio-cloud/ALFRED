from __future__ import annotations

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from dotenv import load_dotenv

from agent import AgentOrchestrator
from database import chat_messages_collection, nano_tasks_collection
from models import ChatMessage
from models_extended import NanoTask
from services.assistant_action_service import AssistantActionService
from services.nano_audit_service import create_nano_audit_log
from services.nano_confirmation_service import (
    create_pending_confirmation,
    get_latest_pending_confirmation,
    is_confirmation_message,
    is_rejection_message,
    mark_confirmation_status,
)
from services.nano_risk_service import evaluate_execution_policy

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).parent.parent / ".env")

_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
_orchestrator = AgentOrchestrator(api_key=_api_key)
_action_service = AssistantActionService(api_key=_api_key)


def _build_action_failure_reply(executed_actions: List[Dict[str, Any]], fallback_reply: str) -> str:
    failure_messages = [
        item.get("message")
        for item in executed_actions
        if item.get("status") in {"failed", "needs_input"} and item.get("message")
    ]
    if failure_messages:
        return " ".join(failure_messages[:2])
    return fallback_reply or "Encontrei uma falha ao executar essa tarefa. Posso tentar de novo com um pedido mais especifico."


def _serialize(document: Dict[str, Any]) -> Dict[str, Any]:
    payload = dict(document)
    payload.pop("_id", None)
    return payload


async def _load_conversation_context(*, user_id: str, workspace_id: str) -> List[Dict[str, Any]]:
    messages = await (
        chat_messages_collection.find(
            {
                "user_id": user_id,
                "$or": [
                    {"metadata.workspace_id": workspace_id},
                    {"metadata.workspace_id": {"$exists": False}},
                ],
            }
        )
        .sort("created_at", -1)
        .limit(8)
        .to_list(8)
    )
    messages.reverse()
    return [
        {
            "role": item.get("role", "user"),
            "content": item.get("content", ""),
            "metadata": item.get("metadata") or {},
        }
        for item in messages
    ]


async def _store_message(
    *,
    user_id: str,
    role: str,
    content: str,
    workspace_id: str,
    source_channel: str,
    metadata: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    message = ChatMessage(
        user_id=user_id,
        role=role,
        content=content,
        metadata={
            **(metadata or {}),
            "workspace_id": workspace_id,
            "source_channel": source_channel,
        },
    )
    payload = message.dict()
    await chat_messages_collection.insert_one(payload)
    return payload


async def _register_task(
    *,
    user_id: str,
    workspace_id: str,
    source_channel: str,
    title: str,
    task_type: str,
    status: str,
    risk_level: str,
    requires_confirmation: bool,
    metadata: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    task = NanoTask(
        user_id=user_id,
        workspace_id=workspace_id,
        source_channel=source_channel,
        title=title,
        type=task_type,
        status=status,
        risk_level=risk_level,
        requires_confirmation=requires_confirmation,
        metadata=metadata or {},
    )
    payload = task.dict()
    await nano_tasks_collection.insert_one(payload)
    return payload


def _build_confirmation_prompt(actions: List[Dict[str, Any]], reason: str | None) -> str:
    first = actions[0] if actions else {}
    action_message = first.get("message") or "Essa acao precisa de confirmacao."
    if reason:
        return f"{action_message}\n{reason}\nResponda 'confirmo' para continuar."
    return f"{action_message}\nResponda 'confirmo' para continuar."


async def route_channel_message(
    *,
    user: Dict[str, Any],
    workspace: Dict[str, Any],
    content: str,
    source_channel: str,
    contact_name: str | None = None,
    persist_history: bool = True,
) -> Dict[str, Any]:
    user_id = user["id"]
    workspace_id = workspace["id"]
    normalized_content = (content or "").strip()
    assistant_message_payload: Dict[str, Any] | None = None

    pending = await get_latest_pending_confirmation(user_id=user_id, workspace_id=workspace_id)
    if pending:
        # This branch resolves a previously blocked high-risk action.
        if is_confirmation_message(normalized_content):
            action_payload = pending.get("action") or {}
            actions = action_payload.get("actions") if isinstance(action_payload.get("actions"), list) else []
            executed_actions = []
            if actions:
                executed_actions = await _action_service.execute_actions(
                    workspace_id=workspace_id,
                    current_user=user,
                    actions=actions,
                )
            await mark_confirmation_status(pending["id"], "executed")
            reply = "Confirmacao recebida. Executei a acao pendente."
            if executed_actions and executed_actions[0].get("message"):
                reply = f"{reply} {executed_actions[0]['message']}"
            await _register_task(
                user_id=user_id,
                workspace_id=workspace_id,
                source_channel=source_channel,
                title="Confirmacao executada",
                task_type="followup",
                status="completed",
                risk_level="high_risk",
                requires_confirmation=False,
                metadata={"pending_confirmation_id": pending["id"], "executed_actions": executed_actions},
            )
            await create_nano_audit_log(
                user_id=user_id,
                workspace_id=workspace_id,
                source_channel=source_channel,
                event_type="confirmation_executed",
                status="completed",
                risk_level="high_risk",
                action_type=(actions[0] or {}).get("type") if actions else None,
                message=normalized_content,
                metadata={"pending_confirmation_id": pending["id"], "executed_actions": executed_actions},
            )
            if persist_history:
                assistant_message_payload = await _store_message(
                    user_id=user_id,
                    role="assistant",
                    content=reply,
                    workspace_id=workspace_id,
                    source_channel=source_channel,
                    metadata={"executed_actions": executed_actions, "intent": "confirmation_execution"},
                )
            return {
                "reply": reply,
                "intent": "confirmation_execution",
                "actions": actions,
                "executed_actions": executed_actions,
                "used_tools": [],
                "risk_level": "high_risk",
                "requires_confirmation": False,
                "assistant_message": assistant_message_payload,
            }
        if is_rejection_message(normalized_content):
            await mark_confirmation_status(pending["id"], "canceled")
            await create_nano_audit_log(
                user_id=user_id,
                workspace_id=workspace_id,
                source_channel=source_channel,
                event_type="confirmation_canceled",
                status="canceled",
                risk_level="high_risk",
                message=normalized_content,
                metadata={"pending_confirmation_id": pending["id"]},
            )
            reply = "Confirmacao cancelada. Nao executei a acao pendente."
            if persist_history:
                assistant_message_payload = await _store_message(
                    user_id=user_id,
                    role="assistant",
                    content=reply,
                    workspace_id=workspace_id,
                    source_channel=source_channel,
                    metadata={"intent": "confirmation_canceled"},
                )
            return {
                "reply": reply,
                "intent": "confirmation_canceled",
                "actions": [],
                "executed_actions": [],
                "used_tools": [],
                "risk_level": "high_risk",
                "requires_confirmation": False,
                "assistant_message": assistant_message_payload,
            }

    conversation_context = await _load_conversation_context(user_id=user_id, workspace_id=workspace_id)
    if persist_history:
        await _store_message(
            user_id=user_id,
            role="user",
            content=normalized_content,
            workspace_id=workspace_id,
            source_channel=source_channel,
            metadata={"contact_name": contact_name},
        )

    agent_result = await _orchestrator.handle_message(
        user=user,
        workspace=workspace,
        message=normalized_content,
        conversation_history=conversation_context,
        execute_actions=False,
        source_channel=source_channel,
    )

    risk_policy = evaluate_execution_policy(
        agent_result.actions or [],
        intent_confidence=float((agent_result.metadata or {}).get("intent_confidence") or 0),
        user_message=normalized_content,
    )
    if agent_result.actions:
        await create_nano_audit_log(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            event_type="action_planned",
            status="planned",
            risk_level=risk_policy["risk_level"],
            action_type=(agent_result.actions[0] or {}).get("type"),
            message=normalized_content,
            metadata={"actions": agent_result.actions, "agent_metadata": agent_result.metadata},
        )
    executed_actions = list(agent_result.executed_actions or [])
    reply = agent_result.message

    if agent_result.actions and risk_policy["requires_confirmation"]:
        pending_record = await create_pending_confirmation(
            user_id=user_id,
            workspace_id=workspace_id,
            action={
                "message": normalized_content,
                "actions": agent_result.actions,
                "agent_metadata": agent_result.metadata,
            },
            source_channel=source_channel,
        )
        reply = _build_confirmation_prompt(agent_result.actions, risk_policy.get("reason"))
        await _register_task(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            title=f"Confirmar: {normalized_content[:80]}",
            task_type="followup",
            status="awaiting_confirmation",
            risk_level=risk_policy["risk_level"],
            requires_confirmation=True,
            metadata={"pending_confirmation_id": pending_record["id"], "actions": agent_result.actions},
        )
        await create_nano_audit_log(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            event_type="confirmation_requested",
            status="awaiting_confirmation",
            risk_level=risk_policy["risk_level"],
            action_type=(agent_result.actions[0] or {}).get("type"),
            message=normalized_content,
            metadata={"pending_confirmation_id": pending_record["id"], "actions": agent_result.actions},
        )
    elif agent_result.actions:
        executed_actions = await _action_service.execute_actions(
            workspace_id=workspace_id,
            current_user=user,
            actions=agent_result.actions,
        )
        if executed_actions:
            if any(item.get("status") in {"failed", "needs_input"} for item in executed_actions):
                reply = _build_action_failure_reply(executed_actions, reply)
            elif executed_actions[0].get("message"):
                reply = executed_actions[0]["message"]
        await _register_task(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            title=normalized_content[:100],
            task_type="automation" if source_channel == "whatsapp" else "followup",
            status="canceled" if any(item.get("status") == "failed" for item in executed_actions) else "completed",
            risk_level=risk_policy["risk_level"],
            requires_confirmation=False,
            metadata={"declared_actions": agent_result.actions, "executed_actions": executed_actions},
        )
        await create_nano_audit_log(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            event_type="action_executed",
            status="failed" if any(item.get("status") == "failed" for item in executed_actions) else "completed",
            risk_level=risk_policy["risk_level"],
            action_type=(agent_result.actions[0] or {}).get("type"),
            message=normalized_content,
            metadata={"declared_actions": agent_result.actions, "executed_actions": executed_actions},
        )
    else:
        await _register_task(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            title=normalized_content[:100],
            task_type="report_summary" if agent_result.tool_results else "followup",
            status="completed",
            risk_level=risk_policy["risk_level"],
            requires_confirmation=False,
            metadata={"intent": agent_result.intent, "used_tools": list((agent_result.tool_results or {}).keys())},
        )
        await create_nano_audit_log(
            user_id=user_id,
            workspace_id=workspace_id,
            source_channel=source_channel,
            event_type="report_served",
            status="completed",
            risk_level=risk_policy["risk_level"],
            message=normalized_content,
            metadata={"intent": agent_result.intent, "used_tools": list((agent_result.tool_results or {}).keys())},
        )

    if persist_history:
        assistant_message_payload = await _store_message(
            user_id=user_id,
            role="assistant",
            content=reply,
            workspace_id=workspace_id,
            source_channel=source_channel,
            metadata={
                "intent": agent_result.intent,
                "tool_results": agent_result.tool_results,
                "actions": agent_result.actions,
                "executed_actions": executed_actions,
                "risk_level": risk_policy["risk_level"],
                "requires_confirmation": risk_policy["requires_confirmation"],
                "agent_metadata": agent_result.metadata,
                "execution_status": "awaiting_confirmation" if risk_policy["requires_confirmation"] else "executed",
            },
        )

    logger.info(
        "Nano routed channel=%s intent=%s risk=%s confirmation=%s",
        source_channel,
        agent_result.intent,
        risk_policy["risk_level"],
        risk_policy["requires_confirmation"],
    )
    return {
        "reply": reply,
        "intent": agent_result.intent,
        "actions": agent_result.actions or [],
        "executed_actions": executed_actions,
        "used_tools": list((agent_result.tool_results or {}).keys()),
        "tool_results": agent_result.tool_results or {},
        "risk_level": risk_policy["risk_level"],
        "requires_confirmation": risk_policy["requires_confirmation"],
        "metadata": {"agent": agent_result.metadata, "source_channel": source_channel},
        "assistant_message": assistant_message_payload,
    }
