from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import ChatMessage, ChatMessageCreate
from database import chat_messages_collection
from routes.auth_routes import get_current_user
from ai_service import AlfredAI
import os
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/chat", tags=["chat"])

# Initialize AI - load environment first
from dotenv import load_dotenv
from pathlib import Path
load_dotenv(Path(__file__).parent.parent / '.env')
ai = AlfredAI(api_key=os.getenv("EMERGENT_LLM_KEY"))

@router.post("/message", response_model=dict)
async def send_message(message_data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    """Enviar mensagem para o Alfred AI"""
    try:
        # Save user message
        user_message = ChatMessage(
            user_id=current_user["id"],
            role="user",
            content=message_data.content
        )
        await chat_messages_collection.insert_one(user_message.dict())
        
        # Process with AI
        ai_response = await ai.process_message(current_user["id"], message_data.content)
        
        # Save AI response
        assistant_message = ChatMessage(
            user_id=current_user["id"],
            role="assistant",
            content=ai_response["response"],
            metadata={"actions": ai_response["actions"]}
        )
        await chat_messages_collection.insert_one(assistant_message.dict())
        
        return {
            "message": assistant_message.dict(),
            "actions": ai_response["actions"]
        }
    except Exception as e:
        logger.error(f"Error sending message: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao enviar mensagem: {str(e)}")

@router.get("/history", response_model=List[ChatMessage])
async def get_chat_history(current_user: dict = Depends(get_current_user)):
    """Obter histórico de chat"""
    try:
        messages = await chat_messages_collection.find(
            {"user_id": current_user["id"]}
        ).sort("created_at", -1).limit(50).to_list(50)
        
        # Reverse to show oldest first
        messages.reverse()
        return [ChatMessage(**msg) for msg in messages]
    except Exception as e:
        logger.error(f"Error getting chat history: {e}")
        raise HTTPException(status_code=500, detail="Erro ao buscar histórico")

@router.delete("/clear")
async def clear_history(current_user: dict = Depends(get_current_user)):
    """Limpar histórico de chat"""
    try:
        await chat_messages_collection.delete_many({"user_id": current_user["id"]})
        return {"message": "Histórico limpo com sucesso"}
    except Exception as e:
        logger.error(f"Error clearing chat history: {e}")
        raise HTTPException(status_code=500, detail="Erro ao limpar histórico")
