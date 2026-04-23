import json
import os
import re
from typing import Any, Dict, List

from openai import AsyncOpenAI

from agent.types import IntentClassification


class LLMService:
    """OpenAI-compatible LLM helper for OpenRouter/Ollama with safe fallbacks."""

    _ALLOWED_INTENTS = {
        "system_action",
        "system_query",
        "knowledge_lookup",
        "financial_analysis",
        "general_chat",
        "web_research",
        "memory_recall",
        "followup_missing_data",
        "unknown",
    }

    def __init__(self):
        api_key = (os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or "").strip()
        base_url = (os.getenv("OPENAI_BASE_URL") or "").strip() or None
        self.model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini").strip()

        default_headers: Dict[str, str] = {}
        if base_url and "openrouter.ai" in base_url:
            site_url = (os.getenv("OPENROUTER_SITE_URL") or "").strip()
            app_name = (os.getenv("OPENROUTER_APP_NAME") or "Nano IA").strip()
            if site_url:
                default_headers["HTTP-Referer"] = site_url
            if app_name:
                default_headers["X-Title"] = app_name

        if api_key or base_url:
            self.client = AsyncOpenAI(
                api_key=api_key or "ollama",
                base_url=base_url,
                default_headers=default_headers or None,
            )
        else:
            self.client = None

    @property
    def available(self) -> bool:
        return self.client is not None

    async def classify_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        if not self.client:
            return {}

        history = context.get("conversation_history") or []
        memory = context.get("memory") or {}
        recent_assistant = next(
            (
                item.get("content", "")
                for item in reversed(history)
                if isinstance(item, dict) and item.get("role") == "assistant"
            ),
            "",
        )
        prompt = (
            "Classifique a intencao do pedido para o Nano.\n"
            "Labels permitidos: system_action, system_query, knowledge_lookup, financial_analysis, "
            "general_chat, web_research, memory_recall, followup_missing_data, unknown.\n"
            "Voce deve sempre preferir a label mais especifica. Evite unknown quando houver qualquer sinal util.\n"
            "Use system_action para criar/editar/registrar/executar algo no sistema.\n"
            "Use system_query para consultas operacionais como agenda, contas, saldos ou historico.\n"
            "Use financial_analysis para diagnostico financeiro, melhoria, cortes, planejamento e aconselhamento.\n"
            "Use followup_missing_data quando o usuario estiver respondendo a uma pergunta anterior pedindo um campo faltante.\n"
            "Retorne JSON puro com:\n"
            "{"
            '"label":"...",'
            '"confidence":0.0,'
            '"requires_tool":true,'
            '"suggested_tool":"..." ou null,'
            '"missing_fields":["..."],'
            '"entities":{}'
            "}\n"
            f"Mensagem: {message}\n"
            f"Ultima resposta do assistente: {recent_assistant}\n"
            f"Historico recente: {history[-4:]}\n"
            f"Memoria relevante: {memory}"
        )

        try:
            text = await self._chat_text(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce classifica intencoes de um assistente financeiro brasileiro. "
                            "Responda apenas JSON valido, sem markdown, sem comentarios. "
                            "Nao use labels fora da lista permitida."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                max_tokens=320,
            )
            payload = self._extract_json_object(text)
            if not payload:
                return {}
            label = self._normalize_intent_label(payload.get("label"))
            if label not in self._ALLOWED_INTENTS:
                return {}
            return {
                "label": label,
                "confidence": self._coerce_confidence(payload.get("confidence")),
                "requires_tool": bool(payload.get("requires_tool", False)),
                "suggested_tool": payload.get("suggested_tool"),
                "missing_fields": self._coerce_str_list(payload.get("missing_fields")),
                "entities": payload.get("entities") if isinstance(payload.get("entities"), dict) else {},
            }
        except Exception:
            return {}

    async def generate_response(
        self,
        message: str,
        context: Dict[str, Any],
        tool_results: Dict[str, Any],
        intent: IntentClassification,
        executed_actions: List[Dict[str, Any]] | None = None,
        fallback_response: str = "",
    ) -> str:
        executed_actions = executed_actions or []
        if not self.client:
            return self._fallback_answer(message, intent, tool_results, executed_actions, fallback_response)

        system_prompt = (
            "Voce e Nano, assistente financeiro e operacional do usuario. "
            "Responda em portugues do Brasil, com clareza, utilidade e senso pratico. "
            "Nunca escreva em ingles, chines ou qualquer outro idioma. "
            "Nunca misture idiomas. Nunca devolva caracteres corrompidos. "
            "Se houver dados reais de tools ou acoes executadas, use isso como verdade principal. "
            "Evite respostas vazias, vagas ou muito genericas."
        )
        user_prompt = (
            f"Mensagem do usuario:\n{message}\n\n"
            f"Intent:\n{intent.label}\n\n"
            f"Contexto:\n{context}\n\n"
            f"Resultados de tools:\n{tool_results}\n\n"
            f"Acoes executadas:\n{executed_actions}\n\n"
            f"Fallback local:\n{fallback_response}\n"
        )
        try:
            text = await self._chat_text(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.2,
                max_tokens=700,
            )
            text = self._normalize_text_response(text)
            if self._looks_like_low_quality_output(text):
                return self._fallback_answer(
                    message,
                    intent,
                    tool_results,
                    executed_actions,
                    fallback_response,
                )
            return text or self._fallback_answer(
                message,
                intent,
                tool_results,
                executed_actions,
                fallback_response,
            )
        except Exception:
            return self._fallback_answer(message, intent, tool_results, executed_actions, fallback_response)

    async def ask_for_missing_data(self, message: str, missing_fields: List[str]) -> str:
        if self.client:
            try:
                text = await self._chat_text(
                    messages=[
                        {
                            "role": "system",
                            "content": "Voce pede dados faltantes de forma objetiva, cordial e curta.",
                        },
                        {
                            "role": "user",
                            "content": (
                                "Escreva uma pergunta curta pedindo apenas os campos faltantes.\n"
                                f"Mensagem original: {message}\n"
                                f"Campos faltantes: {missing_fields}"
                            ),
                        },
                    ],
                    temperature=0.1,
                    max_tokens=120,
                )
                if text:
                    return text
            except Exception:
                pass
        missing = ", ".join(missing_fields)
        return f"Para concluir, preciso de: {missing}. Pode me informar?"

    async def summarize_search_results(self, results: Dict[str, Any]) -> str:
        if self.client:
            try:
                text = await self._chat_text(
                    messages=[
                        {
                            "role": "system",
                            "content": "Resuma resultados de pesquisa em 3 a 5 linhas objetivas, priorizando utilidade.",
                        },
                        {"role": "user", "content": f"Resultados:\n{results}"},
                    ],
                    temperature=0.1,
                    max_tokens=220,
                )
                if text:
                    return text
            except Exception:
                pass
        items = results.get("items") or []
        if not items:
            return "Nao encontrei resultados confiaveis nesta busca."
        top = items[:3]
        lines = [f"- {item.get('title', 'Resultado')}" for item in top]
        return "Resumo rapido da pesquisa:\n" + "\n".join(lines)

    async def select_tools(
        self,
        *,
        message: str,
        intent: str,
        tools: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Ask the model to choose tools in JSON, keeping compatibility with OpenAI-style specs."""
        if not self.client or not tools:
            return []

        catalog: List[Dict[str, Any]] = []
        allowed_names = set()
        for tool in tools:
            function = tool.get("function") or {}
            name = function.get("name")
            if not name:
                continue
            allowed_names.add(name)
            catalog.append(
                {
                    "name": name,
                    "description": function.get("description", ""),
                    "parameters": function.get("parameters", {}),
                }
            )

        if not catalog:
            return []

        prompt = (
            "Escolha as ferramentas mais uteis para atender o pedido do Nano.\n"
            "Voce deve montar um plano curto, pragmático e aderente ao pedido.\n"
            "Retorne JSON puro no formato:\n"
            '{"steps":[{"name":"tool_name","arguments":{}}]}\n'
            "Se nenhuma ferramenta for necessaria, retorne {\"steps\":[]}.\n"
            "Mantenha apenas tools do catalogo e preserve a ordem ideal de execucao.\n"
            f"Intent: {intent}\n"
            f"Pedido: {message}\n"
            f"Catalogo: {catalog}"
        )

        try:
            text = await self._chat_text(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce seleciona tools para um assistente financeiro e responde apenas JSON valido. "
                            "Nao use markdown. Nao invente nomes de tools. "
                            "Se o pedido pedir criar ou registrar algo, priorize tools de acao."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
                max_tokens=500,
            )
            payload = self._extract_json_object(text) or {}
            raw_steps = payload.get("steps")
            if not isinstance(raw_steps, list):
                return []

            selected = []
            for raw_step in raw_steps:
                if not isinstance(raw_step, dict):
                    continue
                name = str(raw_step.get("name") or "").strip()
                if name not in allowed_names:
                    continue
                arguments = raw_step.get("arguments")
                selected.append(
                    {
                        "name": name,
                        "arguments": arguments if isinstance(arguments, dict) else {},
                    }
                )
            return selected
        except Exception:
            return []

    async def respond_with_tool_results(
        self,
        *,
        message: str,
        intent: str,
        tool_results: Dict[str, Any],
        executed_actions: List[Dict[str, Any]] | None = None,
        fallback_response: str = "",
    ) -> str:
        executed_actions = executed_actions or []
        if not self.client:
            return self._fallback_tool_response(
                intent=intent,
                tool_results=tool_results,
                executed_actions=executed_actions,
                fallback_response=fallback_response,
            )
        try:
            text = await self._chat_text(
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "Voce e Nano IA. Responda em pt-BR, direto, claro e util. "
                            "Baseie a resposta estritamente em resultados reais de tools e acoes executadas. "
                            "Evite inventar dados e evite respostas genericas. "
                            "Nunca use markdown pesado quando uma resposta simples resolver. "
                            "Nunca escreva em outro idioma."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Pedido: {message}\n"
                            f"Intent: {intent}\n"
                            f"Resultados das tools: {tool_results}\n"
                            f"Acoes executadas: {executed_actions}\n"
                            f"Fallback local: {fallback_response}"
                        ),
                    },
                ],
                temperature=0.15,
                max_tokens=500,
            )
            if text:
                text = self._normalize_text_response(text)
                if not self._looks_like_low_quality_output(text):
                    return text
        except Exception:
            pass
        return self._fallback_tool_response(
            intent=intent,
            tool_results=tool_results,
            executed_actions=executed_actions,
            fallback_response=fallback_response,
        )

    async def _chat_text(
        self,
        *,
        messages: List[Dict[str, str]],
        temperature: float = 0.1,
        max_tokens: int = 500,
    ) -> str:
        if not self.client:
            return ""
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        choice = response.choices[0].message
        content = choice.content
        if isinstance(content, str):
            return self._normalize_text_response(content)
        if isinstance(content, list):
            parts: List[str] = []
            for item in content:
                if isinstance(item, str):
                    parts.append(item)
                    continue
                if isinstance(item, dict) and item.get("type") == "text":
                    parts.append(str(item.get("text") or ""))
            return self._normalize_text_response("\n".join(part for part in parts if part))
        return ""

    def _extract_json_object(self, text: str) -> Dict[str, Any]:
        raw = self._normalize_text_response(text)
        if not raw:
            return {}
        candidates = [raw]
        fenced = re.findall(r"```(?:json)?\s*(\{.*?\})\s*```", raw, flags=re.DOTALL)
        candidates.extend(fenced)
        brace_match = re.search(r"(\{.*\})", raw, flags=re.DOTALL)
        if brace_match:
            candidates.append(brace_match.group(1))

        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                if isinstance(parsed, dict):
                    return parsed
            except Exception:
                continue
        return {}

    @staticmethod
    def _normalize_intent_label(value: Any) -> str:
        label = str(value or "").strip().lower()
        aliases = {
            "action": "system_action",
            "system-action": "system_action",
            "system_action_request": "system_action",
            "query": "system_query",
            "system-query": "system_query",
            "knowledge": "knowledge_lookup",
            "analysis": "financial_analysis",
            "financial_advice": "financial_analysis",
            "chat": "general_chat",
            "general": "general_chat",
            "research": "web_research",
            "memory": "memory_recall",
            "followup": "followup_missing_data",
            "follow_up_missing_data": "followup_missing_data",
        }
        return aliases.get(label, label)

    @staticmethod
    def _coerce_confidence(value: Any) -> float:
        try:
            return max(0.0, min(float(value), 1.0))
        except Exception:
            return 0.0

    @staticmethod
    def _coerce_str_list(value: Any) -> List[str]:
        if not isinstance(value, list):
            return []
        return [str(item).strip() for item in value if str(item).strip()]

    @staticmethod
    def _normalize_text_response(text: Any) -> str:
        raw = str(text or "").strip()
        if not raw:
            return ""
        raw = raw.replace("\r\n", "\n").replace("\r", "\n")
        replacements = {
            "Ã¡": "á",
            "Ã£": "ã",
            "Ã§": "ç",
            "Ã©": "é",
            "Ãª": "ê",
            "Ã­": "í",
            "Ã³": "ó",
            "Ãµ": "õ",
            "Ãº": "ú",
            "Ã ": "à",
            "MÃªs": "Mês",
            "SituaÃ§Ã£o": "Situação",
            "RecomendaÃ§Ãµes": "Recomendações",
            "visÃ£o": "visão",
            "nÃ£o": "não",
            "vÃª": "vê",
            "você terÃ¡": "você terá",
            "TransaÃ§Ãµes": "Transações",
            "CombustÃ­vel": "Combustível",
            "orÃ§amento": "orçamento",
            "dÃ­vidas": "dívidas",
            "previsÃµes": "previsões",
        }
        for broken, fixed in replacements.items():
            raw = raw.replace(broken, fixed)
        raw = re.sub(r"\n{3,}", "\n\n", raw)
        return raw.strip()

    @staticmethod
    def _looks_like_low_quality_output(text: str) -> bool:
        candidate = (text or "").strip()
        if not candidate:
            return True
        lower = candidate.lower()
        if "```" in candidate:
            return True
        if any(token in candidate for token in ["Ã", "â", "â", "è´¢"]):
            return True
        if re.search(r"[\u4e00-\u9fff\u3040-\u30ff]", candidate):
            return True
        generic_fragments = (
            "posso responder perguntas gerais",
            "estou com voce",
            "posso responder, analisar",
        )
        if any(fragment in lower for fragment in generic_fragments) and len(candidate) < 220:
            return True
        return False

    def _fallback_answer(
        self,
        message: str,
        intent: IntentClassification,
        tool_results: Dict[str, Any],
        executed_actions: List[Dict[str, Any]],
        fallback_response: str,
    ) -> str:
        if executed_actions:
            executed_lines = [action.get("message") for action in executed_actions if action.get("message")]
            if executed_lines:
                return "\n".join(executed_lines)
        if intent.label in {"system_query", "financial_analysis", "knowledge_lookup"} and tool_results:
            return f"Entendi. Aqui esta o que encontrei: {tool_results}"
        if intent.label == "web_research":
            return f"Pesquisei isso para voce. {tool_results.get('web_summary', '')}".strip()
        if intent.label == "general_chat":
            return (
                "Estou com voce. Posso responder perguntas gerais, analisar seu financeiro, "
                "organizar sua agenda e executar tarefas no sistema. Me diga o objetivo ou a duvida."
            )
        return fallback_response or (
            "Entendi seu pedido. Posso registrar movimentacoes, analisar seu financeiro, "
            "consultar agenda e pesquisar na web quando voce pedir."
        )

    def _fallback_tool_response(
        self,
        *,
        intent: str,
        tool_results: Dict[str, Any],
        executed_actions: List[Dict[str, Any]] | None = None,
        fallback_response: str = "",
    ) -> str:
        executed_actions = executed_actions or []
        if executed_actions:
            executed_lines = [item.get("message") for item in executed_actions if item.get("message")]
            if executed_lines:
                return "\n".join(executed_lines)
        if intent == "general_chat":
            return (
                "Estou com voce. Posso responder perguntas, analisar seu financeiro, "
                "consultar sua agenda e executar tarefas no sistema agora."
            )
        if not tool_results:
            if intent in {"system_action", "system_query", "financial_analysis"}:
                return (
                    fallback_response
                    or "Entendi seu pedido, mas nao consegui dados suficientes para executar com seguranca. "
                    "Pode me passar mais detalhes?"
                )
            if intent == "web_research":
                return "Tentei pesquisar agora, mas a busca externa falhou temporariamente. Posso tentar de novo em seguida."
            return "Entendi. Pode me passar um pouco mais de contexto que eu resolvo para voce."
        if intent in {"system_action", "system_query", "financial_analysis", "knowledge_lookup"}:
            return "Conclui seu pedido com dados reais do sistema e deixei tudo registrado."
        if intent == "web_research":
            return "Pesquisei na web e trouxe resultados atualizados para voce."
        return "Conclui seu pedido com sucesso."
