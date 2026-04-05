$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$adapterPython = $env:NANO_LOCAL_PYTHON
if (-not $adapterPython) {
    $adapterPython = Join-Path $root ".venv311\Scripts\python.exe"
}

if (-not (Test-Path $adapterPython)) {
    throw "Nao encontrei o Python dos adapters em $adapterPython. Crie uma venv Python 3.11 e ajuste NANO_LOCAL_PYTHON se necessario."
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "Aviso: ollama nao encontrado no PATH. O adapter de LLM vai precisar dele rodando." -ForegroundColor Yellow
}

Write-Host "Subindo Nano local stack..." -ForegroundColor Red

Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$adapterPython' -m uvicorn nano_services.llm_adapter:app --host 127.0.0.1 --port 8009 --reload"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$adapterPython' -m uvicorn nano_services.stt_adapter:app --host 127.0.0.1 --port 8010 --reload"
Start-Sleep -Seconds 1
Start-Process powershell -ArgumentList "-NoExit", "-Command", "& '$adapterPython' -m uvicorn nano_services.tts_adapter:app --host 127.0.0.1 --port 8011 --reload"

Write-Host "Adapters locais iniciados:" -ForegroundColor Green
Write-Host "LLM: http://127.0.0.1:8009/health"
Write-Host "STT: http://127.0.0.1:8010/health"
Write-Host "TTS: http://127.0.0.1:8011/health"
Write-Host ""
Write-Host "Agora ajuste seu .env do backend para self_hosted e suba a API principal." -ForegroundColor Yellow
