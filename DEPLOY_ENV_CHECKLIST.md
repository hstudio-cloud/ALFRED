# Nano IA Deploy Environment Checklist

## Diagnostico

- O frontend atual e `Create React App` com `craco`, nao Vite.
- O frontend deve ser publicado como projeto Vercel separado com `Root Directory=frontend`.
- O backend FastAPI ja possui adaptador ASGI para Vercel em `backend/api/index.py`, entao a API HTTP pode rodar no Vercel.
- O backend nao e a opcao ideal para Vercel se as automacoes agendadas precisarem funcionar em producao, porque `backend/server.py` sobe `NanoSchedulerService` no `lifespan`, e isso depende de processo vivo.
- Estado atual aplicado:
  - Frontend em producao: `https://frontend-two-xi-71.vercel.app`
  - Backend ativo em producao: `https://nano-ia-api.onrender.com`
  - Projeto `backend` removido do Vercel para evitar dupla origem em producao
- Recomendacao:
  - Frontend: Vercel
  - Backend: Render, Railway ou Fly.io se `NANO_AUTOMATION_SCHEDULER_ENABLED=true`
  - Backend no Vercel so e aceitavel com `NANO_AUTOMATION_SCHEDULER_ENABLED=false`

## Separacao de projetos no Vercel

### Frontend

- Root Directory: `frontend`
- Install Command: `yarn install --frozen-lockfile`
- Build Command: `yarn build`
- Output Directory: `build`
- Arquivo de deploy: `frontend/vercel.json`

### Backend

- Root Directory: `backend`
- Entry point serverless: `api/index.py`
- Arquivo de deploy: `backend/vercel.json`
- Dependencias de runtime: `backend/requirements.txt`
- Observacao: no Vercel, definir `NANO_AUTOMATION_SCHEDULER_ENABLED=false`

## Backend no Render

- Arquivo seguro para o Nano IA: `render.backend.yaml`
- Motivo: evita provisionar frontend extra e evita conflitar com qualquer outro blueprint ja existente da conta.
- Tipo recomendado: `Web Service`
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/health`
- Em Render, manter:
  - `NANO_AUTOMATION_SCHEDULER_ENABLED=true`
  - `OPEN_FINANCE_ENABLED=false`
  - `SEED_ADMIN_ENABLED=false`

## Variaveis de ambiente

Legenda:

- Obrigatoria: sem ela a feature principal quebra
- Opcional: existe fallback, modo degradado ou uso apenas em integracoes especificas
- Ambientes: `Production`, `Preview`, `Development`

## Backend - obrigatorias

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `MONGO_URL` | Obrigatoria | Production, Preview, Development | `backend/server.py`, `backend/database.py` | `mongodb+srv://USER:<PASSWORD>@cluster.mongodb.net/?retryWrites=true&w=majority` | Conexao com MongoDB |
| `DB_NAME` | Obrigatoria | Production, Preview, Development | `backend/server.py`, `backend/database.py` | `nano_ia_prod` | Nome do banco |
| `JWT_SECRET` | Obrigatoria | Production, Preview, Development | `backend/auth.py` | `troque-por-um-segredo-longo-e-aleatorio` | Nome preferido no codigo |
| `JWT_SECRET_KEY` | Opcional | Production, Preview, Development | `backend/auth.py` | `troque-por-um-segredo-longo-e-aleatorio` | Alias suportado |
| `SECRET_KEY` | Opcional | Production, Preview, Development | `backend/auth.py` | `troque-por-um-segredo-longo-e-aleatorio` | Alias legado |
| `CORS_ALLOW_ALL` | Obrigatoria | Production, Preview, Development | `backend/server.py` | `false` | Em producao manter `false` |
| `CORS_ORIGINS` | Obrigatoria | Production, Preview, Development | `backend/server.py` | `https://nano-ia-frontend.vercel.app,https://nanoia.com.br` | Lista separada por virgula |
| `CORS_ORIGIN_REGEX` | Opcional | Production, Preview | `backend/server.py` | `^https://.*\\.vercel\\.app$` | Permite previews do Vercel |
| `FRONTEND_URL` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `https://nano-ia-frontend.vercel.app` | Fallback de redirect no Stripe |
| `APP_URL` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `https://nanoia.com.br` | Alias alternativo |
| `SEED_ADMIN_ENABLED` | Opcional | Production, Preview, Development | `backend/server.py` | `false` | Em producao manter `false` |

## Backend - IA

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `OPENAI_API_KEY` | Obrigatoria para IA hospedada | Production, Preview, Development | `backend/routes/assistant_routes.py`, `backend/routes/chat_routes.py`, `backend/services/llm_service.py`, `backend/nano_ai/voice.py`, `backend/services/workspace_document_service.py`, `backend/services/payroll_document_service.py` | `sk-proj-xxxxxxxx` | Chave principal de IA |
| `EMERGENT_LLM_KEY` | Opcional | Production, Preview, Development | Mesmos fluxos de IA como fallback | `emergent-xxxxxxxx` | Compatibilidade com deploys antigos |
| `OPENAI_BASE_URL` | Opcional | Production, Preview, Development | `backend/services/llm_service.py`, `backend/nano_ai/model_provider.py`, `backend/services/workspace_document_service.py`, `backend/services/payroll_document_service.py` | `https://api.openai.com/v1` | OpenAI, OpenRouter ou gateway compativel |
| `OPENAI_TEXT_MODEL` | Obrigatoria para IA hospedada | Production, Preview, Development | `backend/services/llm_service.py`, `backend/nano_ai/model_provider.py`, `backend/services/workspace_document_service.py`, `backend/services/payroll_document_service.py` | `gpt-4o-mini` | Modelo principal |
| `OPENAI_DOCUMENT_MODEL` | Opcional | Production, Preview, Development | `backend/services/workspace_document_service.py`, `backend/services/payroll_document_service.py` | `gpt-4.1-mini` | OCR e extracao documental |
| `OPENAI_VISION_MODEL` | Opcional | Production, Preview, Development | `backend/services/workspace_document_service.py` | `gpt-4.1-mini` | Fallback de leitura de imagem |
| `OPENAI_VOICE_MODEL` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `gpt-4o-mini-tts` | Sintese de voz |
| `OPENAI_VOICE_NAME` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `onyx` | Voz usada na sintese |
| `OPENAI_VOICE_INSTRUCTIONS` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `Fale em portugues do Brasil com tom executivo.` | Prompt de voz |
| `OPENAI_TRANSCRIBE_MODEL` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `gpt-4o-transcribe` | STT hospedado |
| `OPENAI_TRANSCRIBE_PROMPT` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `Transcreva em pt-BR com ortografia correta.` | Prompt de transcricao |
| `OPENROUTER_SITE_URL` | Opcional | Production, Preview | `backend/services/llm_service.py`, `backend/services/workspace_document_service.py`, `backend/services/payroll_document_service.py` | `https://nanoia.com.br` | Header opcional |
| `OPENROUTER_APP_NAME` | Opcional | Production, Preview | Mesmos arquivos acima | `Nano IA` | Header opcional |
| `NANO_LLM_PROVIDER` | Opcional | Production, Preview, Development | `backend/nano_ai/model_provider.py` | `auto` | `auto`, `openai`, `self_hosted`, `none` |
| `NANO_FORCE_RULE_BASED` | Opcional | Production, Preview, Development | `backend/nano_ai/model_provider.py` | `false` | Desliga LLM |
| `NANO_LLM_URL` | Opcional | Production, Preview, Development | `backend/nano_ai/model_provider.py` | `https://llm-interno.exemplo.com/api/chat` | Endpoint self-hosted |
| `NANO_LLM_AUTH_TOKEN` | Opcional | Production, Preview, Development | `backend/nano_ai/model_provider.py` | `token-interno-exemplo` | Token do self-hosted |
| `NANO_LLM_TIMEOUT` | Opcional | Production, Preview, Development | `backend/nano_ai/model_provider.py` | `60` | Timeout em segundos |
| `NANO_VOICE_PROVIDER` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `auto` | `auto`, `openai`, `self_hosted`, `browser_fallback` |
| `NANO_TTS_URL` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `https://voz.exemplo.com/tts` | TTS self-hosted |
| `NANO_STT_URL` | Opcional | Production, Preview, Development | `backend/nano_ai/voice.py` | `https://voz.exemplo.com/stt` | STT self-hosted |

## Backend - pagamentos

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `STRIPE_SECRET_KEY` | Obrigatoria para Stripe | Production, Preview, Development | `backend/services/stripe_service.py` | `sk_live_xxxxx` | Chave secreta do Stripe |
| `STRIPE_WEBHOOK_SECRET` | Obrigatoria para Stripe | Production, Preview | `backend/services/stripe_service.py` | `whsec_xxxxx` | Validacao do webhook |
| `STRIPE_PRICE_ID_STARTER` | Obrigatoria para plano Starter via Stripe | Production, Preview | `backend/services/stripe_service.py` | `price_starter_xxxxx` | Pode coexistir com `STRIPE_DEFAULT_PRICE_ID` |
| `STRIPE_PRICE_ID_PRO` | Obrigatoria se plano Pro existir | Production, Preview | `backend/services/stripe_service.py` | `price_pro_xxxxx` | Lida dinamicamente |
| `STRIPE_PRICE_ID_BUSINESS` | Obrigatoria se plano Business existir | Production, Preview | `backend/services/stripe_service.py` | `price_business_xxxxx` | Lida dinamicamente |
| `STRIPE_DEFAULT_PRICE_ID` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `price_default_xxxxx` | Fallback de plano |
| `STRIPE_CHECKOUT_SUCCESS_URL` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `https://nano-ia-frontend.vercel.app/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}` | Se ausente usa `FRONTEND_URL` ou `APP_URL` |
| `STRIPE_CHECKOUT_CANCEL_URL` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `https://nano-ia-frontend.vercel.app/billing?checkout=cancelled` | Se ausente usa `FRONTEND_URL` ou `APP_URL` |
| `STRIPE_CUSTOMER_PORTAL_RETURN_URL` | Opcional | Production, Preview | `backend/services/stripe_service.py` | `https://nano-ia-frontend.vercel.app/billing` | Retorno do portal Stripe |
| `ASAAS_API_KEY` | Obrigatoria para Asaas | Production, Preview, Development | `backend/services/asaas_service.py` | `asaas_live_xxxxx` | Chave de API do Asaas |
| `ASAAS_BASE_URL` | Opcional | Production, Preview, Development | `backend/services/asaas_service.py` | `https://api.asaas.com/v3` | Nome realmente usado no codigo |
| `ASAAS_API_URL` | Opcional | Production, Preview, Development | `backend/services/asaas_service.py` | `https://api.asaas.com/v3` | Alias suportado |
| `ASAAS_WEBHOOK_TOKEN` | Obrigatoria para validar webhook Asaas | Production, Preview | `backend/services/asaas_service.py` | `asaas-webhook-token` | Nome realmente usado no codigo |
| `ASAAS_WEBHOOK_SECRET` | Opcional | Production, Preview | `backend/services/asaas_service.py` | `asaas-webhook-token` | Alias suportado |
| `BILLING_DEFAULT_AMOUNT` | Opcional | Production, Preview, Development | `backend/services/billing_service.py` | `49.90` | Fallback PIX/Boleto |
| `BILLING_PLAN_STARTER_AMOUNT` | Opcional | Production, Preview, Development | `backend/services/billing_service.py` | `49.90` | Preco por plano |
| `BILLING_PLAN_PRO_AMOUNT` | Opcional | Production, Preview, Development | `backend/services/billing_service.py` | `99.90` | Preco por plano |
| `BILLING_PLAN_BUSINESS_AMOUNT` | Opcional | Production, Preview, Development | `backend/services/billing_service.py` | `199.90` | Preco por plano |

## Backend - WhatsApp

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `WHATSAPP_PROVIDER` | Opcional | Production, Preview, Development | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `meta_cloud` | `meta_cloud` ou `generic` |
| `WHATSAPP_PROVIDER_URL` | Obrigatoria para provider generico | Production, Preview, Development | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `https://provedor.exemplo.com/messages` | Para Meta Cloud o fluxo usa `WHATSAPP_META_PHONE_NUMBER_ID` |
| `WHATSAPP_PROVIDER_TOKEN` | Obrigatoria | Production, Preview, Development | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `token-whatsapp` | Token do provider |
| `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Obrigatoria | Production, Preview | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `nano-whatsapp-verify` | Verificacao do GET webhook |
| `WHATSAPP_WEBHOOK_SECRET` | Opcional | Production, Preview | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `nano-whatsapp-secret` | Fallback para verify/signature |
| `WHATSAPP_APP_SECRET` | Obrigatoria para validar assinatura Meta | Production, Preview | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `meta-app-secret` | Assinatura do POST webhook |
| `WHATSAPP_META_PHONE_NUMBER_ID` | Obrigatoria para Meta Cloud API | Production, Preview, Development | `backend/services/whatsappService.py`, `backend/nano_ops/whatsapp_channel.py` | `123456789012345` | Ativa modo Meta Cloud automaticamente |

## Backend - Open Finance

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `OPEN_FINANCE_PROVIDER` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy` | `pluggy` e `belvo` sao suportados |
| `OPEN_FINANCE_ENABLED` | Obrigatoria para controlar a feature | Production, Preview, Development | `backend/routes/open_finance_routes.py` | `false` | Mantem todas as rotas de Open Finance como indisponiveis quando `false` |
| `OPEN_FINANCE_BASE_URL` | Obrigatoria para Open Finance real | Production, Preview, Development | `backend/services/open_finance_service.py` | `https://api.pluggy.ai` | Nome generico realmente usado |
| `OPEN_FINANCE_CLIENT_ID` | Obrigatoria para Open Finance real | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy-client-id` | Nome generico realmente usado |
| `OPEN_FINANCE_CLIENT_SECRET` | Obrigatoria para Open Finance real | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy-client-secret` | Nome generico realmente usado |
| `OPEN_FINANCE_API_KEY` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy-api-key` | Cache/uso alternativo |
| `OPEN_FINANCE_WEBHOOK_SECRET` | Opcional | Production, Preview | `backend/routes/open_finance_routes.py`, `backend/services/open_finance_service.py` | `open-finance-webhook-secret` | Se ausente, webhook aceita sem segredo |
| `OPEN_FINANCE_SANDBOX` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `true` | Controla sandbox |
| `OPEN_FINANCE_CALLBACK_URL` | Opcional | Production, Preview | `backend/services/open_finance_service.py` | `https://nano-ia-backend.vercel.app/api/open-finance/webhook` | Callback/webhook do provider |
| `PLUGGY_CLIENT_ID` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy-client-id` | Alias suportado |
| `PLUGGY_CLIENT_SECRET` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `pluggy-client-secret` | Alias suportado |
| `PLUGGY_API_URL` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `https://api.pluggy.ai` | Alias suportado |
| `BELVO_SECRET_ID` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `belvo-secret-id` | Alias suportado |
| `BELVO_SECRET_PASSWORD` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `belvo-secret-password` | Alias suportado |
| `BELVO_API_URL` | Opcional | Production, Preview, Development | `backend/services/open_finance_service.py` | `https://api.belvo.com` | Alias suportado |

## Backend - automacoes

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `NANO_AUTOMATION_SCHEDULER_ENABLED` | Obrigatoria para definir o modo de deploy | Production, Preview, Development | `backend/server.py` | `false` | No Vercel, manter `false` |
| `NANO_AUTOMATION_INTERVAL_SECONDS` | Opcional | Production, Preview, Development | `backend/server.py` | `60` | Intervalo do scheduler |

## Frontend

| Variavel | Status | Ambientes | Onde e usada | Exemplo seguro | Observacoes |
| --- | --- | --- | --- | --- | --- |
| `REACT_APP_API_BASE_URL` | Obrigatoria | Production, Preview, Development | `frontend/src/config/env.js` | `https://nano-ia-backend.vercel.app/api` | Nome recomendado no frontend atual |
| `REACT_APP_BACKEND_URL` | Opcional | Production, Preview, Development | `frontend/src/config/env.js` | `https://nano-ia-backend.vercel.app` | Alias legado; monta `/api` automaticamente |
| `REACT_APP_VOICE_BACKEND_URL` | Opcional | Production, Preview, Development | `frontend/src/config/env.js` | `https://nano-voice.exemplo.com` | Backend dedicado de voz, se existir |
| `REACT_APP_VOICE_PROVIDER` | Opcional | Production, Preview, Development | `frontend/src/config/env.js` | `browser-fallback` | `browser-fallback`, `realtime`, `minimax` etc |
| `REACT_APP_OPEN_FINANCE_ENABLED` | Obrigatoria para controlar a feature no frontend | Production, Preview, Development | `frontend/src/config/env.js` | `false` | Quando `false`, o painel mostra Open Finance como indisponivel |
| `VITE_API_BASE_URL` | Nao aplicavel no frontend atual | Production, Preview, Development | Nao lida pelo CRA atual | `https://nano-ia-backend.vercel.app/api` | So funcionaria se o projeto migrasse para Vite |
| `VITE_APP_URL` | Nao aplicavel no frontend atual | Production, Preview, Development | Nao lida pelo CRA atual | `https://nano-ia-frontend.vercel.app` | O projeto nao usa Vite hoje |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Nao usada no codigo atual | Production, Preview, Development | Nao encontrada no frontend | `pk_live_xxxxx` | Nao existe uso client-side hoje |
| `VITE_PLUGGY_CONNECT_URL` | Nao usada no codigo atual | Production, Preview, Development | Nao encontrada no frontend | `https://connect.pluggy.ai` | O widget usa token retornado pelo backend |

## Valores recomendados por ambiente

### Production

- Frontend: `REACT_APP_API_BASE_URL=https://SEU-BACKEND/api`
- Frontend: `REACT_APP_OPEN_FINANCE_ENABLED=false`
- Backend:
  - `CORS_ALLOW_ALL=false`
  - `CORS_ORIGINS=https://SEU-FRONTEND.vercel.app,https://SEU-DOMINIO.com.br`
  - `NANO_AUTOMATION_SCHEDULER_ENABLED=false` se backend ficar no Vercel
  - `SEED_ADMIN_ENABLED=false`

### Preview

- Frontend: `REACT_APP_API_BASE_URL=https://preview-backend.exemplo.com/api`
- Backend:
  - `CORS_ALLOW_ALL=false`
  - `CORS_ORIGINS=https://preview-frontend.exemplo.com`
  - `CORS_ORIGIN_REGEX=^https://.*\\.vercel\\.app$`
  - `SEED_ADMIN_ENABLED=false`

### Development

- Frontend: `REACT_APP_API_BASE_URL=http://localhost:8000/api`
- Backend:
  - `CORS_ALLOW_ALL=true`
  - `MONGO_URL=mongodb://localhost:27017`
  - `DB_NAME=nano_ia_dev`

## Admin padrao

- O backend cria admin automaticamente apenas se `SEED_ADMIN_ENABLED=true` em `backend/server.py`
- Em producao, manter `SEED_ADMIN_ENABLED=false`
- Se precisarem criar um admin temporario, habilitar so durante a criacao inicial e desligar em seguida

## Webhooks e callbacks que precisam ser atualizados

- Stripe: `https://NOVO-BACKEND/api/webhooks/stripe`
- Asaas: `https://NOVO-BACKEND/api/webhooks/asaas`
- WhatsApp: `https://NOVO-BACKEND/api/whatsapp/webhook`
- WhatsApp health check: `https://NOVO-BACKEND/api/whatsapp/health`
- Open Finance webhook/callback: `https://NOVO-BACKEND/api/open-finance/webhook`
- Open Finance callback funcional da UI: conferir `OPEN_FINANCE_CALLBACK_URL`

## Checklist de testes apos configuracao

- `GET /api/health` responde `200` com `{"status":"ok"}`
- login funciona
- dashboard carrega
- chat do Nano responde
- criar despesa funciona
- criar lembrete funciona
- billing status funciona
- `POST /api/webhooks/stripe` nao retorna `404`
- `POST /api/webhooks/asaas` nao retorna `404`
- `GET /api/whatsapp/health` responde `200`
- `GET /api/whatsapp/webhook` valida token corretamente
- CORS nao bloqueia o frontend

## Passo a passo manual no Vercel

### Frontend

1. Criar ou relinkar um projeto Vercel apontando para o repositorio `hstudio-cloud/ALFRED`.
2. Definir `Root Directory` como `frontend`.
3. Confirmar:
   - Install Command: `yarn install --frozen-lockfile`
   - Build Command: `yarn build`
   - Output Directory: `build`
4. Adicionar `REACT_APP_API_BASE_URL` com a URL final do backend.

### Backend

1. Criar um segundo projeto Vercel apontando para o mesmo repositorio.
2. Definir `Root Directory` como `backend`.
3. Confirmar que `backend/vercel.json` esta sendo usado.
4. Adicionar manualmente todas as variaveis do backend no painel do Vercel.
5. Se o backend ficar no Vercel, definir `NANO_AUTOMATION_SCHEDULER_ENABLED=false`.

## Chaves para colar manualmente no Vercel

- `MONGO_URL`
- `JWT_SECRET` ou `JWT_SECRET_KEY`
- `OPENAI_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ASAAS_API_KEY`
- `ASAAS_WEBHOOK_TOKEN` ou `ASAAS_WEBHOOK_SECRET`
- `WHATSAPP_PROVIDER_TOKEN`
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `OPEN_FINANCE_CLIENT_ID` e `OPEN_FINANCE_CLIENT_SECRET` ou aliases do provider

Nao commitar `.env` ou valores reais dessas chaves no repositorio.
