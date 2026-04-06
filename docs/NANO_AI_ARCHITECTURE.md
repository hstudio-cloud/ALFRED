# Nano AI Architecture

## Objective
Build `Nano` as a product-owned intelligence layer for financial management, reducing direct dependency on any single third-party AI provider.

This means:
- the frontend talks only to Nano APIs
- business rules stay inside our backend
- memory, categorization, workflow execution, and financial reasoning are ours
- language, speech, and generation providers can be swapped over time

## Core Modules

### 1. Nano Brain
Responsibilities:
- orchestrate conversations
- decide when to ask, execute, or explain
- combine user message, memory, workspace context, and financial state
- normalize output into structured actions

Inputs:
- user message
- conversation history
- workspace context
- memory profile
- financial summary

Outputs:
- assistant reply
- structured actions
- assumptions
- confidence

### 2. Nano Memory
Responsibilities:
- persist user preferences
- persist workspace preferences
- track repeated categories, payment methods, and scope patterns
- store conversation summaries instead of raw long-term logs

Examples:
- preferred payment method
- usual category for a supplier
- default scope: personal or business
- preferred greeting style

### 3. Nano Voice
Responsibilities:
- speech-to-text provider abstraction
- text-to-speech provider abstraction
- wake word pipeline
- browser fallback support

Modes:
- `browser_fallback`
- `cloud_provider`
- `self_hosted_provider`

### 4. Nano Finance Engine
Responsibilities:
- execute financial actions safely
- classify transactions
- infer reminders and recurring bills
- generate alerts and projections
- validate whether requests are missing required fields

This is the real product core and should remain independent of the LLM.

### 5. Nano API Gateway
Responsibilities:
- expose stable routes for frontend and future mobile apps
- hide model/provider implementation details
- apply auth, rate limiting, auditing, and logging

Suggested routes:
- `POST /api/nano/chat`
- `POST /api/nano/voice/transcribe`
- `POST /api/nano/voice/speak`
- `GET /api/nano/memory`
- `POST /api/nano/actions/preview`

## Recommended Build Strategy

### Phase 1
- keep current local financial action parser
- add Nano AI module boundaries
- move memory, orchestration, and provider selection behind internal interfaces

### Phase 2
- keep third-party LLM as one provider
- add browser voice fallback and configurable provider selection
- persist richer memory and assumptions

### Phase 3
- add self-hosted models for text and voice
- use open-source STT/TTS/LLM where viable
- route everything through Nano Gateway

### Phase 4
- tune Nano with domain prompts, retrieval, and financial datasets
- add evaluation harness for finance-specific tasks
- reduce external provider usage to fallback only

## What “Nano Own AI” Really Means

There are three levels:

### Level A: Product-owned intelligence
Nano owns:
- workflow
- memory
- execution
- reasoning rules
- user experience

But still uses an external model underneath.

This is the fastest and most realistic short-term path.

### Level B: Provider-independent AI platform
Nano owns everything above and can switch between:
- OpenAI
- local model
- another hosted provider

This is the recommended medium-term architecture.

### Level C: Fully self-hosted AI stack
Nano owns:
- orchestration
- models in production
- speech stack
- inference infra

This is possible, but heavier in cost and operations.

## Recommended Provider Path

Short term:
- keep external provider support
- structure code to make providers swappable

Medium term:
- self-host speech
- self-host smaller finance-oriented conversation models

Long term:
- own complete Nano inference stack for text + voice + memory

## Safety Rules

- financial actions must always pass through Nano Finance Engine
- LLM output should never write directly to database
- all generated actions must be validated and normalized
- risky actions should be previewed or confirmed
- keep auditable action logs

## Repo Mapping

New backend package:
- `backend/nano_ai/brain.py`
- `backend/nano_ai/memory.py`
- `backend/nano_ai/voice.py`
- `backend/nano_ai/finance_engine.py`
- `backend/nano_ai/gateway.py`
- `backend/nano_ai/types.py`

Current migration target:
- progressively move logic from `backend/ai_service.py`
- keep routes stable while internal architecture changes

## Immediate Next Step

1. Make `ai_service.py` call Nano Brain instead of containing all logic directly.
2. Move financial action detection into Nano Finance Engine.
3. Move persistent preference handling into Nano Memory.
4. Move speech provider selection into Nano Voice.
5. Introduce Nano Gateway service as the single internal entrypoint.
