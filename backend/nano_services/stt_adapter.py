import logging
import os
import tempfile
from functools import lru_cache
from typing import Dict

from fastapi import FastAPI, File, Form, HTTPException, UploadFile


logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nano.stt_adapter")

app = FastAPI(title="Nano Local STT Adapter", version="1.0.0")

STT_MODEL = os.getenv("NANO_STT_MODEL", "base")
STT_DEVICE = os.getenv("NANO_STT_DEVICE", "cpu")
STT_COMPUTE_TYPE = os.getenv("NANO_STT_COMPUTE_TYPE", "int8")


@lru_cache(maxsize=1)
def get_whisper_model():
    try:
        from faster_whisper import WhisperModel
    except ImportError as exc:
        raise RuntimeError(
            "faster-whisper nao instalado. Instale as dependencias do stack local."
        ) from exc

    logger.info(
        "Loading faster-whisper model '%s' on device=%s compute_type=%s",
        STT_MODEL,
        STT_DEVICE,
        STT_COMPUTE_TYPE,
    )
    return WhisperModel(
        STT_MODEL,
        device=STT_DEVICE,
        compute_type=STT_COMPUTE_TYPE,
    )


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "provider": "faster_whisper",
        "model": STT_MODEL,
        "device": STT_DEVICE,
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    locale: str = Form("pt-BR"),
):
    try:
        model = get_whisper_model()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc))

    audio_bytes = await file.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Arquivo de audio vazio.")

    suffix = ".webm"
    if file.filename and "." in file.filename:
        suffix = f".{file.filename.split('.')[-1]}"

    language = locale.split("-")[0].lower()

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        segments, info = model.transcribe(
            tmp_path,
            language=language,
            vad_filter=True,
            beam_size=7,
            best_of=5,
            temperature=0.0,
            condition_on_previous_text=False,
            initial_prompt=(
                "Transcricao em portugues do Brasil para um assistente financeiro chamado Nano. "
                "Termos comuns: pix, boleto, cartao, credito, debito, despesa, receita, "
                "alimentacao, combustivel, fornecedor, empresa, pessoal, lembrete, vencimento, transferencia, "
                "movimentacao, cartao de credito, cartao de debito, aluguel, internet, impostos, salario, "
                "conta a pagar, conta a receber, gastos do mes, fluxo de caixa, categoria, fornecedores, "
                "assinatura, vencimento do cartao, conta pessoal, conta da empresa."
            ),
        )
        text = " ".join(segment.text.strip() for segment in segments).strip()

        return {
            "text": text,
            "language": getattr(info, "language", language),
            "provider": "faster_whisper",
            "model": STT_MODEL,
        }
    except Exception as exc:
        logger.error("STT adapter failed: %s", exc)
        raise HTTPException(status_code=500, detail="Erro ao transcrever audio localmente.")
    finally:
        try:
            if "tmp_path" in locals() and os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
