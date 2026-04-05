from typing import Any, Dict, List, Optional

from .action_runner import NanoActionRunner
from .brain import NanoBrain
from .finance_engine import NanoFinanceEngine
from .memory import NanoMemoryManager
from .types import NanoAction, NanoReply, NanoVoiceRequest
from .voice import NanoVoiceManager


class NanoGateway:
    """Single internal entrypoint for Nano AI features.

    Routes should progressively call this gateway instead of spreading
    orchestration logic across multiple files.
    """

    def __init__(
        self,
        brain: Optional[NanoBrain] = None,
        finance_engine: Optional[NanoFinanceEngine] = None,
        memory_manager: Optional[NanoMemoryManager] = None,
        action_runner: Optional[NanoActionRunner] = None,
        voice_manager: Optional[NanoVoiceManager] = None,
    ):
        self.finance_engine = finance_engine or NanoFinanceEngine()
        self.memory_manager = memory_manager or NanoMemoryManager()
        self.brain = brain or NanoBrain(
            finance_engine=self.finance_engine,
            memory_manager=self.memory_manager,
        )
        self.action_runner = action_runner or NanoActionRunner()
        self.voice_manager = voice_manager or NanoVoiceManager()

    async def handle_chat_turn(
        self,
        message: str,
        actions: List[NanoAction],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        memory_profile: Optional[Dict[str, Any]] = None,
    ) -> NanoReply:
        fallback_message = self.finance_engine.fallback_reply(actions)
        context = self.brain.build_prompt_context(
            message=message,
            actions=actions,
            conversation_history=conversation_history or [],
            memory_profile=memory_profile or {},
        )
        return self.brain.compose_reply(
            fallback_message=fallback_message,
            actions=actions,
            metadata={"prompt_context": context},
        )

    async def synthesize_voice(self, request: NanoVoiceRequest | str) -> Optional[bytes]:
        voice_request = request if isinstance(request, NanoVoiceRequest) else NanoVoiceRequest(text=request)
        return await self.voice_manager.synthesize(voice_request)

    async def transcribe_voice(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        return await self.voice_manager.transcribe(
            audio_bytes=audio_bytes,
            locale=locale,
            mime_type=mime_type,
        )

    async def load_memory_profile(self, user_id: str) -> Dict[str, Any]:
        return await self.memory_manager.load_profile(user_id)

    async def persist_memory_profile(
        self,
        user_id: str,
        actions: List[Dict[str, Any]],
        message: str = "",
    ) -> None:
        await self.memory_manager.persist_profile(
            user_id=user_id,
            actions=actions,
            message=message,
        )

    async def execute_actions(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        return await self.action_runner.execute_actions(
            workspace_id=workspace_id,
            current_user=current_user,
            actions=actions,
        )

    def compose_assistant_reply(
        self,
        workspace_name: str,
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        return self.action_runner.compose_assistant_reply(
            workspace_name=workspace_name,
            executed_actions=executed_actions,
            fallback_response=fallback_response,
        )
