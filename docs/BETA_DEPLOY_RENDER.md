# Nano beta no ar com Render

Este projeto ja esta preparado para publicar o beta em duas partes:

- `nano-api`: backend FastAPI
- `nano-app`: frontend React estatico

## Arquivos criados

- `render.yaml`
- `backend/.python-version`
- `backend/.env.production.example`
- `frontend/.env.production.example`

## Arquitetura recomendada para o beta

- Frontend em `Render Static Site`
- Backend em `Render Web Service`
- Banco em `MongoDB Atlas`
- Voz em `browser_fallback` no beta
- IA de texto em `auto`

Esse modo e o mais seguro para vender beta rapidamente, porque:

- nao depende dos adapters locais `127.0.0.1`
- nao exige subir Ollama, STT e TTS em nuvem agora
- permite publicar o produto primeiro e evoluir a IA depois

## Antes de publicar

1. Rotacione as credenciais locais expostas durante o desenvolvimento:
   - chave da OpenAI
   - usuario/senha do Mongo Atlas
2. Confirme o banco final de producao.
3. Se for vender, crie pelo menos:
   - pagina de privacidade
   - termos de uso
   - email de suporte

## Como subir no Render

1. Faça push do repositório para o GitHub.
2. No Render, clique em `New > Blueprint`.
3. Conecte este repositório.
4. O Render vai ler `render.yaml` e criar:
   - `nano-api`
   - `nano-app`
5. Preencha o valor de `MONGO_URL`.
6. Se quiser respostas mais inteligentes no beta, preencha `OPENAI_API_KEY`.

## URLs esperadas

- Frontend: `https://nano-app.onrender.com`
- Backend: `https://nano-api.onrender.com`

## Variaveis importantes

### Backend

- `MONGO_URL`
- `DB_NAME`
- `CORS_ORIGINS`
- `OPENAI_API_KEY` (opcional)
- `NANO_LLM_PROVIDER=auto`
- `NANO_VOICE_PROVIDER=browser_fallback`

### Frontend

- `REACT_APP_BACKEND_URL`

No blueprint, o frontend ja recebe automaticamente a URL publica do backend.

## Observacao sobre voz no beta

Para um beta pago, o recomendado agora e:

- texto do Nano funcionando 100%
- voz como recurso beta com fallback do navegador

Nao e recomendado publicar o beta dependendo dos adapters locais de voz e modelo local.
Isso pode entrar depois em uma segunda fase, com infraestrutura dedicada.

## Health check

O backend expõe:

- `GET /api/health`

Esse endpoint pode ser usado pelo Render para health checks e monitoramento.
