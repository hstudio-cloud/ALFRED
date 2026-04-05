import logging
import os
from typing import Optional

import httpx

from .types import NanoVoiceRequest


logger = logging.getLogger(__name__)


class VoiceProviderBase:
    name = "browser_fallback"

    async def synthesize(self, request: NanoVoiceRequest) -> Optional[bytes]:
        return None

    async def transcribe(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        _ = audio_bytes, locale, mime_type
        return ""


class BrowserFallbackVoiceProvider(VoiceProviderBase):
    """No-op backend provider.

    Used when voice should remain in the browser only.
    """

    name = "browser_fallback"


class OpenAIVoiceProvider(VoiceProviderBase):
    """Hosted voice provider backed by OpenAI APIs."""

    name = "openai"

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.voice_model = os.getenv("OPENAI_VOICE_MODEL", "gpt-4o-mini-tts")
        self.voice_name = os.getenv("OPENAI_VOICE_NAME", "alloy")
        self.transcribe_model = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-mini-transcribe")

    async def synthesize(self, request: NanoVoiceRequest) -> Optional[bytes]:
        cleaned = (request.text or "").strip()
        if not cleaned:
            return None

        payload = {
            "model": self.voice_model,
            "voice": self.voice_name,
            "input": cleaned[:4000],
            "format": "mp3",
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/speech",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.content

    async def transcribe(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        if not audio_bytes:
            return ""

        filename = self._filename_for_mime(mime_type)
        files = {
            "file": (filename, audio_bytes, mime_type),
            "model": (None, self.transcribe_model),
            "language": (None, locale.split("-")[0]),
        }

        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                "https://api.openai.com/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                files=files,
            )
            response.raise_for_status()
            payload = response.json()
            return (payload.get("text") or "").strip()

    @staticmethod
    def _filename_for_mime(mime_type: str) -> str:
        if "wav" in mime_type:
            return "audio.wav"
        if "mpeg" in mime_type or "mp3" in mime_type:
            return "audio.mp3"
        if "ogg" in mime_type:
            return "audio.ogg"
        if "mp4" in mime_type or "m4a" in mime_type:
            return "audio.m4a"
        return "audio.webm"


class SelfHostedVoiceProvider(VoiceProviderBase):
    """Adapter for self-hosted STT/TTS services.

    Expected contracts:
    - TTS endpoint: POST JSON {"text": "...", "locale": "pt-BR", "voice_mode": "...", "speed": 1.0}
      and returns raw audio bytes.
    - STT endpoint: POST multipart with file field "file" and optional "locale".
      and returns JSON {"text": "..."}.
    """

    name = "self_hosted"

    def __init__(self, tts_url: str, stt_url: str):
        self.tts_url = tts_url
        self.stt_url = stt_url

    async def synthesize(self, request: NanoVoiceRequest) -> Optional[bytes]:
        if not self.tts_url or not request.text.strip():
            return None

        payload = {
            "text": request.text.strip(),
            "locale": request.locale,
            "voice_mode": request.voice_mode,
            "speed": request.speed,
            "metadata": request.metadata,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(self.tts_url, json=payload)
            response.raise_for_status()
            return response.content

    async def transcribe(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        if not self.stt_url or not audio_bytes:
            return ""

        files = {
            "file": (OpenAIVoiceProvider._filename_for_mime(mime_type), audio_bytes, mime_type),
            "locale": (None, locale),
        }
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(self.stt_url, files=files)
            response.raise_for_status()
            payload = response.json()
            return (payload.get("text") or "").strip()


class NanoVoiceManager:
    """Provider-agnostic entrypoint for Nano voice.

    Resolution order:
    - explicit `NANO_VOICE_PROVIDER`
    - `auto`: self-hosted if both endpoints exist, otherwise OpenAI if key exists,
      otherwise browser fallback
    """

    def __init__(self, provider: Optional[str] = None):
        self.provider_name = provider or os.getenv("NANO_VOICE_PROVIDER", "auto")
        self.provider = self._resolve_provider(self.provider_name)

    def _resolve_provider(self, provider_name: str) -> VoiceProviderBase:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
        tts_url = os.getenv("NANO_TTS_URL", "").strip()
        stt_url = os.getenv("NANO_STT_URL", "").strip()

        resolved = provider_name
        if provider_name == "auto":
            if tts_url and stt_url:
                resolved = "self_hosted"
            elif api_key:
                resolved = "openai"
            else:
                resolved = "browser_fallback"

        if resolved == "self_hosted":
            return SelfHostedVoiceProvider(tts_url=tts_url, stt_url=stt_url)
        if resolved == "openai" and api_key:
            return OpenAIVoiceProvider(api_key=api_key)
        return BrowserFallbackVoiceProvider()

    async def synthesize(self, request: NanoVoiceRequest) -> Optional[bytes]:
        try:
            return await self.provider.synthesize(request)
        except Exception as exc:
            logger.error("Voice synth failed via %s: %s", self.provider.name, exc)
            return None

    async def transcribe(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        try:
            return await self.provider.transcribe(audio_bytes, locale=locale, mime_type=mime_type)
        except Exception as exc:
            logger.error("Voice transcription failed via %s: %s", self.provider.name, exc)
            return ""
