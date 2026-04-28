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
        self.voice_name = os.getenv("OPENAI_VOICE_NAME", "onyx")
        self.transcribe_model = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")
        self.voice_instructions = os.getenv(
            "OPENAI_VOICE_INSTRUCTIONS",
            (
                "Fale em portugues do Brasil com voz grave, encorpada, sofisticada e segura, "
                "com presenca de um assistente executivo premium de tecnologia, sem soar robótico. "
                "Use diccao muito clara, pausas naturais, ritmo calmo e tom confiante. "
                "Leia valores monetarios de forma natural e sem soletrar digitos desnecessariamente."
            ),
        ).strip()
        self.transcribe_prompt = os.getenv(
            "OPENAI_TRANSCRIBE_PROMPT",
            (
                "Transcreva em portugues do Brasil com ortografia correta. "
                "Contexto: assistente financeiro Nano IA. "
                "Preserve termos como Nano, Pix, Open Finance, categoria, farmacia, remedios, "
                "alimentacao, combustivel, despesas, receitas, lembretes, cartao, boleto e fluxo de caixa."
            ),
        ).strip()

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
        if self.voice_instructions:
            payload["instructions"] = self.voice_instructions[:1000]

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
        if self.transcribe_prompt:
            files["prompt"] = (None, self.transcribe_prompt[:1000])

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
        self.fallback_provider = self._resolve_fallback_provider(self.provider_name, self.provider)

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

    def _resolve_fallback_provider(self, provider_name: str, primary: VoiceProviderBase) -> Optional[VoiceProviderBase]:
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
        if not api_key:
            return None

        # Se o modo principal nao for OpenAI, deixamos OpenAI como fallback premium.
        if primary.name != "openai":
            return OpenAIVoiceProvider(api_key=api_key)
        return None

    async def synthesize(self, request: NanoVoiceRequest) -> Optional[bytes]:
        try:
            primary_audio = await self.provider.synthesize(request)
            if primary_audio:
                return primary_audio
        except Exception as exc:
            logger.error("Voice synth failed via %s: %s", self.provider.name, exc)

        if self.fallback_provider is not None:
            try:
                logger.info("Voice synth fallback: switching from %s to %s", self.provider.name, self.fallback_provider.name)
                fallback_audio = await self.fallback_provider.synthesize(request)
                if fallback_audio:
                    return fallback_audio
            except Exception as exc:
                logger.error("Voice synth fallback failed via %s: %s", self.fallback_provider.name, exc)
        return None

    async def transcribe(self, audio_bytes: bytes, locale: str = "pt-BR", mime_type: str = "audio/webm") -> str:
        try:
            primary_text = await self.provider.transcribe(audio_bytes, locale=locale, mime_type=mime_type)
            if primary_text:
                return primary_text
        except Exception as exc:
            logger.error("Voice transcription failed via %s: %s", self.provider.name, exc)

        if self.fallback_provider is not None:
            try:
                logger.info(
                    "Voice transcription fallback: switching from %s to %s",
                    self.provider.name,
                    self.fallback_provider.name,
                )
                fallback_text = await self.fallback_provider.transcribe(
                    audio_bytes=audio_bytes,
                    locale=locale,
                    mime_type=mime_type,
                )
                return fallback_text or ""
            except Exception as exc:
                logger.error("Voice transcription fallback failed via %s: %s", self.fallback_provider.name, exc)
        return ""
