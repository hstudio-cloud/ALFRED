# MiniMax TTS no Nano IA

Esta camada adiciona voz real ao Nano sem alterar a logica principal do chat.

## Arquitetura

- Frontend chama `REACT_APP_VOICE_BACKEND_URL/api/voice/speak`
- Servico Node/Express em `backend/voiceServer.js`
- Controller em `backend/controllers/voiceController.js`
- Provider MiniMax em `backend/services/minimaxTtsService.js`
- Configuracao em `backend/config/voiceConfig.js`

Se o MiniMax falhar, o frontend cai para o fluxo de voz atual e o chat continua respondendo em texto.

## Variaveis de ambiente

```env
VOICE_PROVIDER=minimax
VOICE_PORT=8012
VOICE_CORS_ORIGINS=http://localhost:3000
MINIMAX_API_KEY=
MINIMAX_GROUP_ID=
MINIMAX_TTS_MODEL=speech-02-hd
MINIMAX_VOICE_ID=English_expressive_narrator
MINIMAX_VOICE_SPEED=1
MINIMAX_VOICE_VOLUME=1
MINIMAX_VOICE_PITCH=0
```

No frontend:

```env
REACT_APP_VOICE_BACKEND_URL=http://localhost:8012
```

## Rodar local

```powershell
cd backend
npm install
npm run start:voice
```

Health check:

```text
http://localhost:8012/health
```

## Trocar a voz

Altere `MINIMAX_VOICE_ID` ou envie `voiceId` no body de `/api/voice/speak`.

Velocidade, volume e tom ficam centralizados em `backend/config/voiceConfig.js`.
