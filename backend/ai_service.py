from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from datetime import datetime
import json
import re

class AlfredAI:
    """Alfred AI Assistant - Processa comandos em linguagem natural"""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.system_message = """Você é Alfred, um assistente pessoal inteligente e prestativo.
        
Sua função é ajudar o usuário a organizar sua vida através de conversas naturais.

Você pode:
- Criar tarefas com prioridades e prazos
- Criar hábitos diários ou semanais
- Criar projetos
- Criar lembretes
- Registrar transações financeiras (receitas e despesas)
- Analisar dados e fornecer insights

Quando o usuário pedir para criar algo, você deve:
1. Confirmar que entendeu
2. Extrair as informações relevantes
3. Responder de forma amigável em português

Sempre seja educado, prestativo e objetivo nas respostas."""
    
    async def process_message(self, user_id: str, message: str) -> dict:
        """Processa uma mensagem do usuário e retorna a resposta + ações"""
        
        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"user_{user_id}",
                system_message=self.system_message
            ).with_model("openai", "gpt-5.1")
            
            user_message = UserMessage(text=message)
            response = await chat.send_message(user_message)
            
            # Handle None or invalid response
            if response is None:
                response = "Desculpe, não consegui processar sua mensagem no momento."
            elif not isinstance(response, str):
                response = str(response) if response else "Resposta inválida recebida."
            
            # Detectar ações baseado no conteúdo da mensagem
            actions = self._detect_actions(message)
            
            return {
                "response": response,
                "actions": actions
            }
        except Exception as e:
            # Log the error and return a fallback response
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error in AI processing: {e}")
            
            # Still detect actions even if AI fails
            actions = self._detect_actions(message)
            
            return {
                "response": "Desculpe, houve um problema ao processar sua mensagem. Mas detectei algumas ações que posso ajudar.",
                "actions": actions
            }
    
    def _detect_actions(self, message: str) -> list:
        """Detecta ações que devem ser executadas baseado na mensagem"""
        message_lower = message.lower()
        actions = []
        
        # Detectar criação de tarefas
        if any(word in message_lower for word in ['tarefa', 'fazer', 'preciso', 'tenho que', 'devo']):
            # Extrair prioridade
            priority = 'medium'
            if any(word in message_lower for word in ['urgente', 'importante', 'prioritário']):
                priority = 'high'
            elif any(word in message_lower for word in ['depois', 'quando puder']):
                priority = 'low'
            
            actions.append({
                'type': 'create_task',
                'data': {
                    'priority': priority,
                    'detected': True
                }
            })
        
        # Detectar criação de hábitos
        if any(word in message_lower for word in ['hábito', 'todo dia', 'diariamente', 'rotina']):
            actions.append({
                'type': 'create_habit',
                'data': {
                    'frequency': 'daily',
                    'detected': True
                }
            })
        
        # Detectar lembretes
        if any(word in message_lower for word in ['lembrar', 'lembre-me', 'não esquecer', 'avise']):
            actions.append({
                'type': 'create_reminder',
                'data': {
                    'detected': True
                }
            })
        
        # Detectar transações financeiras
        if any(word in message_lower for word in ['gastar', 'gastei', 'comprei', 'paguei', 'despesa']):
            actions.append({
                'type': 'create_transaction',
                'data': {
                    'type': 'expense',
                    'detected': True
                }
            })
        elif any(word in message_lower for word in ['recebi', 'ganhei', 'receita', 'salário']):
            actions.append({
                'type': 'create_transaction',
                'data': {
                    'type': 'income',
                    'detected': True
                }
            })
        
        return actions
