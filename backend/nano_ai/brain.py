from typing import Any, Dict, List, Optional

from .finance_engine import NanoFinanceEngine
from .memory import NanoMemoryManager
from .types import NanoAction, NanoConversationTurn, NanoReply


class NanoBrain:
    """Conversation orchestrator for Nano.

    This layer should remain product-owned even when the underlying model
    provider changes.
    """

    def __init__(
        self,
        finance_engine: Optional[NanoFinanceEngine] = None,
        memory_manager: Optional[NanoMemoryManager] = None,
    ):
        self.finance_engine = finance_engine or NanoFinanceEngine()
        self.memory_manager = memory_manager or NanoMemoryManager()

    def summarize_history(self, conversation_history: List[Dict[str, str]]) -> str:
        if not conversation_history:
            return "Sem historico recente."

        lines = []
        for item in conversation_history[-6:]:
            role = item.get("role", "user")
            content = (item.get("content") or "").strip().replace("\n", " ")
            if len(content) > 220:
                content = f"{content[:217]}..."
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def build_prompt_context(
        self,
        message: str,
        actions: List[NanoAction],
        conversation_history: List[Dict[str, str]],
        memory_profile: Optional[Dict[str, Any]] = None,
    ) -> str:
        action_summary = self.finance_engine.summarize_actions(actions)
        memory_summary = self.memory_manager.summarize_profile(memory_profile)
        history_summary = self.summarize_history(conversation_history)

        return (
            "Mensagem atual do usuario:\n"
            f"{message}\n\n"
            "Acoes detectadas localmente:\n"
            f"{action_summary}\n\n"
            "Memoria conhecida do usuario:\n"
            f"{memory_summary}\n\n"
            "Historico recente:\n"
            f"{history_summary}"
        )

    def compose_reply(
        self,
        fallback_message: str,
        actions: List[NanoAction],
        metadata: Optional[Dict[str, Any]] = None,
    ) -> NanoReply:
        validated_actions = self.finance_engine.validate_actions(actions)
        return NanoReply(
            message=fallback_message,
            actions=validated_actions,
            metadata=metadata or {},
        )
