# Contratos API - Alfred Backend

## Dados Mockados (a serem substituídos)

### Frontend Mock Data (`/app/frontend/src/data/mock.js`)
- Dados estáticos de hero, scenarios, platforms, timeline
- Tabs de produto e categorias
- Dados de pricing
- Esses dados permanecerão mockados (conteúdo estático do site)

### Dados que serão dinâmicos (backend)
- Usuários e autenticação
- Tarefas do usuário
- Hábitos e streaks
- Projetos
- Lembretes
- Transações financeiras
- Mensagens do chat IA
- Estatísticas e insights do dashboard

## API Endpoints a Implementar

### 1. Autenticação (`/api/auth`)
```
POST   /api/auth/register       - Registrar novo usuário
POST   /api/auth/login          - Login (email + senha)
POST   /api/auth/logout         - Logout
GET    /api/auth/me             - Obter usuário atual
PUT    /api/auth/profile        - Atualizar perfil
```

### 2. Chat IA (`/api/chat`)
```
POST   /api/chat/message        - Enviar mensagem para IA
GET    /api/chat/history        - Histórico de conversas
DELETE /api/chat/clear          - Limpar histórico
```

### 3. Tarefas (`/api/tasks`)
```
GET    /api/tasks               - Listar todas as tarefas
POST   /api/tasks               - Criar tarefa
GET    /api/tasks/:id           - Obter tarefa específica
PUT    /api/tasks/:id           - Atualizar tarefa
DELETE /api/tasks/:id           - Deletar tarefa
PATCH  /api/tasks/:id/complete  - Marcar como completa
```

### 4. Hábitos (`/api/habits`)
```
GET    /api/habits              - Listar hábitos
POST   /api/habits              - Criar hábito
GET    /api/habits/:id          - Obter hábito específico
PUT    /api/habits/:id          - Atualizar hábito
DELETE /api/habits/:id          - Deletar hábito
POST   /api/habits/:id/check    - Marcar dia como completo
```

### 5. Projetos (`/api/projects`)
```
GET    /api/projects            - Listar projetos
POST   /api/projects            - Criar projeto
GET    /api/projects/:id        - Obter projeto específico
PUT    /api/projects/:id        - Atualizar projeto
DELETE /api/projects/:id        - Deletar projeto
```

### 6. Lembretes (`/api/reminders`)
```
GET    /api/reminders           - Listar lembretes
POST   /api/reminders           - Criar lembrete
GET    /api/reminders/:id       - Obter lembrete específico
PUT    /api/reminders/:id       - Atualizar lembrete
DELETE /api/reminders/:id       - Deletar lembrete
```

### 7. Finanças (`/api/finances`)
```
GET    /api/finances/transactions    - Listar transações
POST   /api/finances/transactions    - Criar transação
GET    /api/finances/summary         - Resumo financeiro
PUT    /api/finances/transactions/:id - Atualizar transação
DELETE /api/finances/transactions/:id - Deletar transação
```

### 8. Dashboard (`/api/dashboard`)
```
GET    /api/dashboard/stats     - Estatísticas gerais (tarefas, hábitos, etc)
GET    /api/dashboard/insights  - Insights e análises IA
```

## Modelos de Dados (MongoDB)

### User
```python
{
  "email": str,
  "password": str (hashed),
  "name": str,
  "role": str (admin/user),
  "created_at": datetime,
  "settings": {
    "notifications": bool,
    "theme": str
  }
}
```

### Task
```python
{
  "user_id": ObjectId,
  "title": str,
  "description": str,
  "priority": str (low/medium/high),
  "status": str (pending/completed),
  "due_date": datetime,
  "completed_at": datetime,
  "created_at": datetime
}
```

### Habit
```python
{
  "user_id": ObjectId,
  "name": str,
  "description": str,
  "frequency": str (daily/weekly),
  "streak": int,
  "completed_dates": [datetime],
  "created_at": datetime
}
```

### Project
```python
{
  "user_id": ObjectId,
  "name": str,
  "description": str,
  "status": str (active/completed/archived),
  "tasks": [ObjectId],
  "deadline": datetime,
  "created_at": datetime
}
```

### Reminder
```python
{
  "user_id": ObjectId,
  "title": str,
  "description": str,
  "remind_at": datetime,
  "is_active": bool,
  "created_at": datetime
}
```

### Transaction
```python
{
  "user_id": ObjectId,
  "type": str (income/expense),
  "category": str,
  "amount": float,
  "description": str,
  "date": datetime,
  "created_at": datetime
}
```

### ChatMessage
```python
{
  "user_id": ObjectId,
  "role": str (user/assistant),
  "content": str,
  "created_at": datetime,
  "metadata": {
    "actions_taken": [str]  # tarefas criadas, lembretes, etc
  }
}
```

## Integração Frontend & Backend

### 1. Criar Context/Hook para Auth
- Criar `AuthContext.jsx` para gerenciar estado de autenticação
- Proteger rotas que precisam de login
- Armazenar token JWT no localStorage

### 2. Criar páginas novas
- `/login` - Página de login
- `/register` - Página de registro  
- `/dashboard` - Dashboard do usuário (app principal)
- `/chat` - Interface de chat com IA
- `/tasks` - Gerenciamento de tarefas
- `/habits` - Gerenciamento de hábitos
- `/projects` - Gerenciamento de projetos
- `/reminders` - Gerenciamento de lembretes
- `/finances` - Controle financeiro

### 3. Substituir mock data
- Dashboard stats virão de `/api/dashboard/stats`
- Chat messages virão de `/api/chat/history`
- Todas as listas virão de suas respectivas APIs

### 4. IA Integration
- Usar Emergent LLM Key (OpenAI ou Anthropic)
- IA processará mensagens e executará ações:
  - Criar tarefas automaticamente
  - Criar lembretes
  - Adicionar transações
  - Analisar hábitos
  - Gerar insights

## Conta Admin Inicial

```python
Email: admin@alfred.com
Senha: Admin@123456
Role: admin
```

## Fluxo de Implementação

1. ✅ Instalar dependências necessárias (emergent integrations para LLM)
2. ✅ Criar modelos MongoDB
3. ✅ Implementar autenticação JWT
4. ✅ Criar endpoints CRUD
5. ✅ Integrar IA conversacional
6. ✅ Criar conta admin
7. ✅ Criar dashboard frontend
8. ✅ Integrar frontend com backend
9. ✅ Testar funcionalidades

## Notas Importantes

- A landing page (/) permanece estática com mock data
- O app principal (/dashboard) será dinâmico com dados reais
- JWT token expira em 7 dias
- Senhas hasheadas com bcrypt
- IA entende português e processa comandos naturalmente
