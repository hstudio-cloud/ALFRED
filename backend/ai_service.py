import logging
from typing import Any, Dict, List, Optional

from nano_ai import NanoCoordinator
from nano_ai.types import NanoVoiceRequest


logger = logging.getLogger(__name__)


class AlfredAI:
    """Compatibility wrapper for the current backend chat contract.

    The routes still import `AlfredAI`, but orchestration now lives inside the
    Nano architecture. This keeps the existing API stable while moving domain
    intelligence into specialists coordinated by `NanoCoordinator`.
    """

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key or ""
        self.coordinator = NanoCoordinator(api_key=self.api_key)

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        memory_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Process a chat turn through the NanoCoordinator."""
        return await self.coordinator.process_message(
            user_id=user_id,
            message=message,
            conversation_history=conversation_history or [],
            memory_profile=memory_profile or {},
        )

    async def execute_actions(
        self,
        workspace_id: str,
        current_user: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Run validated Nano actions through the shared gateway."""
        return await self.coordinator.gateway.execute_actions(
            workspace_id=workspace_id,
            current_user=current_user,
            actions=actions,
        )

    async def load_memory_profile(self, user_id: str) -> Dict[str, Any]:
        """Load persisted Nano memory for the current user."""
        return await self.coordinator.gateway.load_memory_profile(user_id)

    async def persist_memory_profile(
        self,
        user_id: str,
        actions: List[Dict[str, Any]],
        message: str = "",
    ) -> None:
        """Persist inferred preferences and recent patterns through Nano."""
        await self.coordinator.gateway.persist_memory_profile(
            user_id=user_id,
            actions=actions,
            message=message,
        )

    def compose_assistant_reply(
        self,
        workspace_name: str,
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        """Keep reply composition centralized in the Nano execution layer."""
        return self.coordinator.gateway.compose_assistant_reply(
            workspace_name=workspace_name,
            executed_actions=executed_actions,
            fallback_response=fallback_response,
        )

    async def synthesize_speech(
        self,
        text: str,
        locale: str = "pt-BR",
        voice_mode: str = "default",
        speed: float = 1.0,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[bytes]:
        """Generate TTS audio through the active Nano voice provider."""
        try:
            return await self.coordinator.gateway.synthesize_voice(
                NanoVoiceRequest(
                    text=text,
                    locale=locale,
                    voice_mode=voice_mode,
                    speed=speed,
                    metadata=metadata or {},
                )
            )
        except Exception as exc:
            logger.error("Error synthesizing speech: %s", exc)
            return None

    async def transcribe_audio(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        """Transcribe speech using the active Nano voice provider."""
        try:
            return await self.coordinator.gateway.transcribe_voice(
                audio_bytes=audio_bytes,
                locale=locale,
                mime_type=mime_type,
            )
        except Exception as exc:
            logger.error("Error transcribing audio: %s", exc)
            return ""

    def get_voice_provider_name(self) -> str:
        """Expose the current voice provider for diagnostics and UI."""
        return self.coordinator.gateway.voice_manager.provider.name

    def get_model_provider_name(self) -> str:
        """Expose the current text model provider for diagnostics and UI."""
        provider = self.coordinator.model_provider
        return provider.name if provider is not None else "rule_based"

    def get_model_name(self) -> str:
        """Return the active model identifier when available."""
        provider = self.coordinator.model_provider
        if provider is None:
            return "nano_rules"
        return (
            getattr(provider, "text_model", None)
            or getattr(provider, "model_name", None)
            or getattr(provider, "endpoint_url", None)
            or provider.name
        )
