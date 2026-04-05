import logging
import os
import tempfile
from functools import lru_cache
from typing import Dict, Optional

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nano.tts_adapter")

app = FastAPI(title="Nano Local TTS Adapter", version="1.0.0")

TTS_BACKEND = os.getenv("NANO_TTS_BACKEND", "pyttsx3").strip().lower()
COQUI_MODEL = os.getenv("NANO_TTS_MODEL", "tts_models/pt/cv/vits")
COQUI_LANGUAGE = os.getenv("NANO_TTS_LANGUAGE", "pt")
COQUI_SPEAKER = os.getenv("NANO_TTS_SPEAKER", "").strip() or None
COQUI_SPEAKER_WAV = os.getenv("NANO_TTS_SPEAKER_WAV", "").strip() or None


class SpeakRequest(BaseModel):
    text: str
    locale: str = "pt-BR"
    voice_mode: str = "default"
    speed: float = 1.0
    metadata: Dict[str, str] = {}


def create_pyttsx3_engine():
    try:
        import pyttsx3
    except ImportError as exc:
        raise RuntimeError("pyttsx3 nao instalado na venv local.") from exc

    engine = pyttsx3.init()
    voices = engine.getProperty("voices")
    preferred = None
    for voice in voices:
        voice_name = (getattr(voice, "name", "") or "").lower()
        voice_id = (getattr(voice, "id", "") or "").lower()
        if "portuguese" in voice_name or "portuguese" in voice_id or "brazil" in voice_name:
            preferred = voice
            break
    if preferred:
        engine.setProperty("voice", preferred.id)
    return engine


@lru_cache(maxsize=1)
def get_coqui_tts_model():
    try:
        from TTS.api import TTS
    except ImportError as exc:
        raise RuntimeError("Coqui TTS nao instalado na venv local.") from exc

    logger.info("Loading Coqui TTS model '%s'", COQUI_MODEL)
    return TTS(model_name=COQUI_MODEL, progress_bar=False)


def build_coqui_kwargs(request: SpeakRequest, file_path: str) -> Dict[str, Optional[str]]:
    kwargs: Dict[str, Optional[str]] = {
        "text": request.text,
        "file_path": file_path,
    }

    language = (request.locale or "pt-BR").split("-")[0]
    if "xtts" in COQUI_MODEL.lower():
        kwargs["language"] = language
        if COQUI_SPEAKER_WAV:
            kwargs["speaker_wav"] = COQUI_SPEAKER_WAV
        elif COQUI_SPEAKER:
            kwargs["speaker"] = COQUI_SPEAKER
        else:
            raise RuntimeError("Modelo XTTS configurado sem speaker.")
    else:
        kwargs["language"] = language or COQUI_LANGUAGE
        if COQUI_SPEAKER:
            kwargs["speaker"] = COQUI_SPEAKER

    return kwargs


def synthesize_with_pyttsx3(request: SpeakRequest, file_path: str) -> None:
    engine = create_pyttsx3_engine()
    try:
        default_rate = engine.getProperty("rate")
        safe_rate = max(120, min(220, int(default_rate * request.speed)))
        engine.setProperty("rate", safe_rate)
        engine.save_to_file(request.text, file_path)
        engine.runAndWait()
    finally:
        try:
            engine.stop()
        except Exception:
            pass


def synthesize_with_coqui(request: SpeakRequest, file_path: str) -> None:
    tts = get_coqui_tts_model()
    kwargs = build_coqui_kwargs(request, file_path)
    tts.tts_to_file(**kwargs)


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "provider": TTS_BACKEND,
    }


@app.post("/speak")
async def speak(request: SpeakRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Texto vazio.")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
            tmp_path = tmp.name

        if TTS_BACKEND == "coqui":
            synthesize_with_coqui(request, tmp_path)
            provider = "coqui_tts"
        else:
            synthesize_with_pyttsx3(request, tmp_path)
            provider = "pyttsx3"

        with open(tmp_path, "rb") as audio_file:
            audio_bytes = audio_file.read()

        response = Response(content=audio_bytes, media_type="audio/wav")
        response.headers["X-Nano-TTS-Provider"] = provider
        return response
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        logger.error("TTS adapter failed: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao sintetizar fala localmente.")
    finally:
        try:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
