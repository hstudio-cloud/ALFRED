import logging
import os
from pathlib import Path

from dotenv import load_dotenv

from agent import AgentOrchestrator
from database import chat_messages_collection
from models import ChatMessage

logger = logging.getLogger(__name__)
load_dotenv(Path(__file__).parent.parent / ".env")

_orchestrator = AgentOrchestrator(
    api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
)


async def route_whatsapp_message(*, user: dict, workspace: dict, content: str) -> dict:
    """
    Route WhatsApp incoming text through the same Nano orchestrator.
    """
    conversation = await (
        chat_messages_collection.find({"user_id": user["id"]})
        .sort("created_at", -1)
        .limit(8)
        .to_list(8)
    )
    conversation.reverse()
    context = [{"role": item.get("role", "user"), "content": item.get("content", "")} for item in conversation]

    user_message = ChatMessage(user_id=user["id"], role="user", content=content)
    await chat_messages_collection.insert_one(user_message.dict())

    result = await _orchestrator.handle_message(
        user=user,
        workspace=workspace,
        message=content,
        conversation_history=context,
    )

    assistant_message = ChatMessage(
        user_id=user["id"],
        role="assistant",
        content=result.message,
        metadata={
            "intent": result.intent,
            "tool_results": result.tool_results,
            "actions": result.actions,
            "executed_actions": result.executed_actions,
            "source": "whatsapp",
            "workspace_id": workspace.get("id"),
        },
    )
    await chat_messages_collection.insert_one(assistant_message.dict())
    logger.info("WhatsApp routed with intent=%s", result.intent)

    return {
        "reply": result.message,
        "intent": result.intent,
        "used_tools": list((result.tool_results or {}).keys()),
        "actions": result.actions or [],
    }
