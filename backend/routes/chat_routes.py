import logging
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from ai_service import AlfredAI
from database import (
    bills_collection,
    categories_collection,
    chat_messages_collection,
    db,
    reminders_collection,
    transactions_collection,
    user_memories_collection,
)
from models import ChatMessage, ChatMessageCreate, Transaction
from models_extended import Bill, FinancialCategory, ReminderFinancial
from routes.auth_routes import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

load_dotenv(Path(__file__).parent.parent / ".env")
ai = AlfredAI(api_key=os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY"))


class SpeechRequest(BaseModel):
    text: str


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


async def _load_memory_profile(user_id: str) -> dict:
    memory = await user_memories_collection.find_one({"user_id": user_id})
    if not memory:
        return {}
    memory.pop("_id", None)
    return memory


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


async def _update_user_memory(user_id: str, actions: list, message: str):
    if not actions:
        return

    preferences = {}
    recent_patterns = []

    for action in actions:
        data = action.get("data", {})
        action_type = action.get("type")
        if data.get("payment_method") and data["payment_method"] != "other":
            preferences["payment_method"] = data["payment_method"]
        if data.get("account_scope"):
            preferences["account_scope"] = data["account_scope"]
        if data.get("category") and data["category"] != "Geral":
            preferences["category"] = data["category"]
        if action_type:
            recent_patterns.append(action_type)

    update_doc = {
        "$set": {
            "user_id": user_id,
            "preferences.voice_greeting_style": "senhor",
            "updated_at": datetime.utcnow(),
        },
        "$push": {
            "recent_patterns": {
                "$each": recent_patterns or ["conversation"],
                "$slice": -10,
            }
        },
    }

    for key, value in preferences.items():
        update_doc["$set"][f"preferences.{key}"] = value

    if message:
        update_doc["$set"]["last_user_message"] = message

    await user_memories_collection.update_one(
        {"user_id": user_id},
        update_doc,
        upsert=True,
    )


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return None


def _format_brl(value: float) -> str:
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


def _format_datetime_label(value: Optional[datetime]) -> str:
    if not value:
        return "-"
    return value.strftime("%d/%m/%Y %H:%M")


async def _ensure_category_exists(
    workspace_id: str,
    user_id: str,
    category_name: str,
    kind: str,
    account_scope: str,
):
    existing = await categories_collection.find_one(
        {"workspace_id": workspace_id, "name": category_name}
    )
    if existing:
        return

    category = FinancialCategory(
        workspace_id=workspace_id,
        user_id=user_id,
        name=category_name,
        kind=kind,
        account_scope=account_scope if account_scope in {"personal", "business"} else "both",
    )
    await categories_collection.insert_one(category.dict())


async def _execute_transaction_action(workspace_id: str, current_user: dict, action: dict) -> dict:
    data = action.get("data", {})
    missing_fields = data.get("missing_fields", [])
    if missing_fields:
        return {
            "type": "create_transaction",
            "status": "needs_input",
            "message": f"Faltaram dados para registrar a movimentacao: {', '.join(missing_fields)}.",
            "data": data,
        }

    await _ensure_category_exists(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        category_name=data["category"],
        kind=data["type"],
        account_scope=data.get("account_scope", "personal"),
    )

    transaction = Transaction(
        user_id=current_user["id"],
        type=data["type"],
        category=data["category"],
        amount=float(data["amount"]),
        description=data.get("description"),
        payment_method=data.get("payment_method", "other"),
        account_scope=data.get("account_scope", "personal"),
        date=_parse_iso_datetime(data.get("date")) or datetime.utcnow(),
    )
    payload = transaction.dict()
    payload["workspace_id"] = workspace_id
    await transactions_collection.insert_one(payload)

    label = "receita" if transaction.type == "income" else "despesa"
    return {
        "type": "create_transaction",
        "status": "executed",
        "message": (
            f"{label.title()} criada: {_format_brl(transaction.amount)} em {transaction.category}, "
            f"via {transaction.payment_method} no escopo {transaction.account_scope}."
        ),
        "data": transaction.dict(),
        "assumptions": data.get("assumptions", []),
    }


async def _execute_bill_action(workspace_id: str, current_user: dict, action: dict) -> dict:
    data = action.get("data", {})
    missing_fields = data.get("missing_fields", [])
    if missing_fields:
        return {
            "type": "create_bill",
            "status": "needs_input",
            "message": f"Faltaram dados para criar a conta: {', '.join(missing_fields)}.",
            "data": data,
        }

    await _ensure_category_exists(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        category_name=data["category"],
        kind="both" if data["type"] == "receivable" else "expense",
        account_scope=data.get("account_scope", "business"),
    )

    bill = Bill(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        title=data["title"],
        amount=float(data["amount"]),
        type=data["type"],
        due_date=_parse_iso_datetime(data.get("due_date")) or datetime.utcnow(),
        category=data["category"],
        payment_method=data.get("payment_method", "other"),
        account_scope=data.get("account_scope", "business"),
        description=data.get("description"),
        recurring=bool(data.get("recurring")),
    )
    await bills_collection.insert_one(bill.dict())

    label = "Conta a receber" if bill.type == "receivable" else "Conta a pagar"
    return {
        "type": "create_bill",
        "status": "executed",
        "message": (
            f"{label} criada: {bill.title} no valor de {_format_brl(bill.amount)} "
            f"com vencimento em {_format_datetime_label(bill.due_date)}."
        ),
        "data": bill.dict(),
        "assumptions": data.get("assumptions", []),
    }


async def _execute_reminder_action(workspace_id: str, current_user: dict, action: dict) -> dict:
    data = action.get("data", {})
    remind_at = _parse_iso_datetime(data.get("remind_at")) or datetime.utcnow()

    reminder = ReminderFinancial(
        workspace_id=workspace_id,
        user_id=current_user["id"],
        title=data.get("title") or "Lembrete financeiro",
        remind_at=remind_at,
        description=data.get("description"),
    )
    await reminders_collection.insert_one(reminder.dict())

    return {
        "type": "create_reminder",
        "status": "executed",
        "message": (
            f"Lembrete criado: {reminder.title} para {_format_datetime_label(reminder.remind_at)}."
        ),
        "data": reminder.dict(),
        "assumptions": data.get("assumptions", []),
    }


async def _execute_analysis_action(workspace_id: str, action: dict) -> dict:
    period = action.get("data", {}).get("period", "30d")
    day_map = {"7d": 7, "30d": 30, "90d": 90, "year": 365}
    days = day_map.get(period, 30)
    start_date = datetime.utcnow() - timedelta(days=days)

    transactions = await transactions_collection.find(
        {"workspace_id": workspace_id, "date": {"$gte": start_date}}
    ).to_list(1000)

    income = sum(item["amount"] for item in transactions if item["type"] == "income")
    expenses = sum(item["amount"] for item in transactions if item["type"] == "expense")
    balance = income - expenses

    category_totals = {}
    for item in transactions:
        if item["type"] != "expense":
            continue
        category = item.get("category", "Geral")
        category_totals[category] = category_totals.get(category, 0) + item["amount"]

    top_categories = sorted(
        category_totals.items(),
        key=lambda entry: entry[1],
        reverse=True,
    )[:3]

    highlights = []
    if top_categories:
        highlights.append(
            "Maiores categorias: " + ", ".join(
                f"{name} ({_format_brl(amount)})" for name, amount in top_categories
            ) + "."
        )
    if expenses > income and expenses > 0:
        highlights.append("Seu periodo terminou com mais saidas do que entradas.")
    elif expenses > 0:
        highlights.append("As entradas ainda cobrem as saidas no periodo analisado.")
    else:
        highlights.append("Ainda nao encontrei despesas suficientes para uma analise mais profunda.")

    return {
        "type": "analyze_spending",
        "status": "executed",
        "message": (
            f"Analise concluida dos ultimos {days} dias: entradas de {_format_brl(income)}, "
            f"saidas de {_format_brl(expenses)} e saldo de {_format_brl(balance)}. "
            + " ".join(highlights)
        ),
        "data": {
            "period": period,
            "days": days,
            "income": income,
            "expenses": expenses,
            "balance": balance,
            "top_categories": top_categories,
        },
    }


async def _execute_actions(workspace_id: str, current_user: dict, actions: list) -> list:
    results = []
    for action in actions:
        action_type = action.get("type")
        if action_type == "create_transaction":
            results.append(await _execute_transaction_action(workspace_id, current_user, action))
        elif action_type == "create_bill":
            results.append(await _execute_bill_action(workspace_id, current_user, action))
        elif action_type == "create_reminder":
            results.append(await _execute_reminder_action(workspace_id, current_user, action))
        elif action_type == "analyze_spending":
            results.append(await _execute_analysis_action(workspace_id, action))
    return results


def _compose_assistant_reply(workspace_name: str, executed_actions: list, fallback_response: str) -> str:
    if not executed_actions:
        return fallback_response

    lines = [fallback_response.strip(), "", f"Executei isso no Alfred para o workspace {workspace_name}:"]
    assumptions = []

    for item in executed_actions:
        status = item.get("status")
        if status == "executed":
            lines.append(f"- {item['message']}")
            data = item.get("data", {})
            details = []
            if data.get("category"):
                details.append(f"categoria: {data['category']}")
            if data.get("payment_method"):
                details.append(f"metodo: {data['payment_method']}")
            if data.get("account_scope"):
                details.append(f"escopo: {data['account_scope']}")
            if details:
                lines.append(f"  Como classifiquei: {', '.join(details)}.")
        elif status == "needs_input":
            lines.append(f"- Nao consegui concluir: {item['message']}")

        for assumption in item.get("assumptions", []):
            assumptions.append(assumption)

    if assumptions:
        lines.append("Suposicoes que usei:")
        for assumption in assumptions:
            lines.append(f"- {assumption}")

    return "\n".join(lines)


@router.post("/message", response_model=dict)
async def send_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Enviar mensagem para o Alfred AI."""
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
                detail="Crie ou acesse um workspace antes de usar o assistente Alfred.",
            )

        conversation_history = await _load_conversation_context(current_user["id"])
        memory_profile = await _load_memory_profile(current_user["id"])

        ai_response = await ai.process_message(
            current_user["id"],
            message_data.content,
            conversation_history=conversation_history,
            memory_profile=memory_profile,
        )
        executed_actions = await _execute_actions(workspace["id"], current_user, ai_response["actions"])
        await _update_user_memory(current_user["id"], ai_response["actions"], message_data.content)
        assistant_content = _compose_assistant_reply(
            workspace_name=workspace.get("name", "principal"),
            executed_actions=executed_actions,
            fallback_response=ai_response["response"],
        )

        assistant_message = ChatMessage(
            user_id=current_user["id"],
            role="assistant",
            content=assistant_content,
            metadata={
                "actions": ai_response["actions"],
                "executed_actions": executed_actions,
                "workspace_id": workspace["id"],
            },
        )
        await chat_messages_collection.insert_one(assistant_message.dict())

        return {
            "message": assistant_message.dict(),
            "actions": ai_response["actions"],
            "executed_actions": executed_actions,
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
        audio_bytes = await ai.synthesize_speech(payload.text)
        if audio_bytes is None:
            raise HTTPException(
                status_code=503,
                detail="Sintese de voz premium indisponivel. Configure OPENAI_API_KEY para habilitar.",
            )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except HTTPException:
        raise
    except Exception as exc:
        logger.error(f"Error generating speech: {exc}")
        raise HTTPException(status_code=500, detail="Erro ao gerar audio")


@router.get("/history", response_model=List[ChatMessage])
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Obter historico de chat."""
    try:
        messages = await chat_messages_collection.find(
            {"user_id": current_user["id"]}
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
