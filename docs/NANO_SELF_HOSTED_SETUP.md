# Nano Self-Hosted Stack

Esta stack deixa o Nano com LLM, STT e TTS locais.

## Arquitetura

- `nano_services/llm_adapter.py`
  - recebe o payload padrao do Nano em `/generate`
  - usa um servidor OpenAI-compatible local, com foco em `Ollama`
- `nano_services/stt_adapter.py`
  - recebe audio em `/transcribe`
  - usa `faster-whisper`
- `nano_services/tts_adapter.py`
  - recebe texto em `/speak`
  - usa `pyttsx3` por padrao no Windows
  - aceita `Coqui TTS` como opcional para voz mais premium

## Portas padrao

- LLM: `8009`
- STT: `8010`
- TTS: `8011`

## Setup rapido

0. Use uma venv separada com Python `3.11` para os adapters locais.

Observacao importante:
- o backend principal hoje esta em Python `3.13`
- `faster-whisper` e o stack local de voz funcionam melhor em Python `3.11`
- por isso o caminho certo e rodar `LLM/STT/TTS` em uma venv separada

Exemplo:

```powershell
cd backend
py -3.11 -m venv .venv311
.venv311\Scripts\activate
python -V
```

1. Instale o stack local adicional nessa venv:

```powershell
cd backend
.venv311\Scripts\activate
pip install -r requirements-nano-local.txt
```

2. Instale o Ollama e baixe um modelo:

```powershell
ollama pull qwen2.5:1.5b
```

3. Copie as variaveis:

```powershell
Copy-Item .env.nano-local.example .env.nano-local
```

4. Ajuste seu `.env` principal ou replique as variaveis do exemplo:

```env
NANO_LLM_PROVIDER=self_hosted
NANO_VOICE_PROVIDER=self_hosted
NANO_LLM_URL=http://127.0.0.1:8009/generate
NANO_STT_URL=http://127.0.0.1:8010/transcribe
NANO_TTS_URL=http://127.0.0.1:8011/speak
```

5. Suba os adapters:

```powershell
.\start-nano-local.ps1
```

Se a sua venv Python 3.11 estiver em outro caminho:

```powershell
$env:NANO_LOCAL_PYTHON="C:\caminho\para\python.exe"
.\start-nano-local.ps1
```

6. Suba a API principal normalmente.

## Contratos

### LLM

`POST /generate`

```json
{
  "user_id": "123",
  "system_message": "...",
  "context": "...",
  "specialists_used": ["finance_operations"],
  "actions": [
    {
      "type": "create_transaction",
      "data": {},
      "assumptions": [],
      "confidence": 0.9
    }
  ],
  "response_style": {
    "locale": "pt-BR",
    "max_sentences": 4,
    "tone": "executivo, claro, objetivo"
  }
}
```

Resposta:

```json
{
  "text": "Perfeito. Vou registrar essa despesa agora.",
  "provider": "ollama_openai_compatible",
  "model": "qwen2.5:1.5b"
}
```

### STT

`POST /transcribe`

- multipart
- campo `file`
- campo `locale`

Resposta:

```json
{
  "text": "crie uma despesa de 120 reais com combustivel",
  "language": "pt",
  "provider": "faster_whisper",
  "model": "small"
}
```

### TTS

`POST /speak`

```json
{
  "text": "Perfeito. Vou registrar essa despesa agora.",
  "locale": "pt-BR",
  "voice_mode": "default",
  "speed": 1.0,
  "metadata": {}
}
```

Resposta:

- audio bruto `audio/wav`

## Observacoes

- no setup atual do projeto, o TTS local mais simples e funcional e `pyttsx3`
- para voz mais premium, depois voce pode instalar `Coqui TTS` e trocar `NANO_TTS_BACKEND=coqui`
- `tts_models/pt/cv/vits` e uma base mais simples para comecar com Coqui
- para voz ainda mais premium com clonagem, depois voce pode trocar para `XTTS v2`, mas nesse caso o ideal e configurar `NANO_TTS_SPEAKER_WAV`
- Se quiser mais throughput no LLM, no futuro vale migrar de `Ollama` para `vLLM` mantendo o mesmo contrato.
