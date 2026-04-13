import os
import json
from typing import Any, Dict, List

from openai import AsyncOpenAI

from agent.types import IntentClassification


class LLMService:
    """LLM helper with safe deterministic fallback."""

    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("EMERGENT_LLM_KEY") or ""
        base_url = os.getenv("OPENAI_BASE_URL") or None
        self.model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")
        self.client = AsyncOpenAI(api_key=api_key, base_url=base_url) if api_key else None

    async def classify_intent(self, message: str, context: Dict[str, Any]) -> Dict[str, Any]:
        _ = context
        if not self.client:
            return {}
        prompt = (
            "Classifique a intencao em: system_action, system_query, financial_analysis, "
            "general_chat, web_research, memory_recall, followup_missing_data, unknown. "
            "Retorne JSON puro com label e confidence.\nMensagem:\n"
            f"{message}"
        )
        try:
            response = await self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": "Voce classifica intencao de assistente financeiro."},
                    {"role": "user", "content": prompt},
                ],
            )
            text = (getattr(response, "output_text", "") or "").strip()
            return {"raw": text}
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
            "Voce e Nano, um assistente de alto nivel para financas, operacao e perguntas gerais. "
            "Responda em portugues do Brasil, com clareza, iniciativa e inteligencia pratica. "
            "Se a pergunta for aberta, entregue uma resposta util de verdade em vez de redirecionar o usuario de volta. "
            "Se houver acoes executadas, confirme o resultado objetivo. "
            "Quando fizer sentido, proponha 1 proximo passo curto."
        )
        user_prompt = (
            f"Mensagem do usuario:\n{message}\n\n"
            f"Intent:\n{intent.label}\n\n"
            f"Contexto:\n{context}\n\n"
            f"Resultados de tools:\n{tool_results}\n\n"
            f"Acoes executadas:\n{executed_actions}\n\n"
            f"Fallback:\n{fallback_response}\n"
        )
        try:
            response = await self.client.responses.create(
                model=self.model,
                input=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            )
            text = (getattr(response, "output_text", "") or "").strip()
            return text or self._fallback_answer(message, intent, tool_results, executed_actions, fallback_response)
        except Exception:
            return self._fallback_answer(message, intent, tool_results, executed_actions, fallback_response)

    async def ask_for_missing_data(self, message: str, missing_fields: List[str]) -> str:
        if self.client:
            try:
                prompt = (
                    "Escreva uma pergunta curta e cordial pedindo apenas os campos faltantes.\n"
                    f"Mensagem original: {message}\nCampos faltantes: {missing_fields}"
                )
                response = await self.client.responses.create(
                    model=self.model,
                    input=[
                        {"role": "system", "content": "Voce pede dados faltantes de forma objetiva."},
                        {"role": "user", "content": prompt},
                    ],
                )
                text = (getattr(response, "output_text", "") or "").strip()
                if text:
                    return text
            except Exception:
                pass
        missing = ", ".join(missing_fields)
        return f"Para concluir, preciso de: {missing}. Pode me informar?"

    async def summarize_search_results(self, results: Dict[str, Any]) -> str:
        if self.client:
            try:
                response = await self.client.responses.create(
                    model=self.model,
                    input=[
                        {"role": "system", "content": "Resuma pesquisas em 3-5 linhas objetivas."},
                        {"role": "user", "content": f"Resultados:\n{results}"},
                    ],
                )
                text = (getattr(response, "output_text", "") or "").strip()
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
        if intent.label in {"system_query", "financial_analysis"} and tool_results:
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

    async def select_tools(
        self,
        *,
        message: str,
        intent: str,
        tools: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Use LLM tool-calling to decide which tools to execute."""
        if not self.client or not tools:
            return []

        system_prompt = (
            "Voce e o orquestrador do Nano IA. "
            "Escolha ferramentas apenas quando houver ganho claro. "
            "Se o pedido for conversa geral, nao chame ferramenta."
        )
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": f"Intento classificado: {intent}\nPedido: {message}",
                    },
                ],
                tools=tools,
                tool_choice="auto",
            )
            choice = response.choices[0].message
            selected = []
            for tool_call in (choice.tool_calls or []):
                raw_args = tool_call.function.arguments or "{}"
                try:
                    args = json.loads(raw_args)
                except Exception:
                    args = {}
                selected.append(
                    {
                        "name": tool_call.function.name,
                        "arguments": args,
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
    ) -> str:
        if not self.client:
            return self._fallback_tool_response(intent=intent, tool_results=tool_results)
        try:
            response = await self.client.responses.create(
                model=self.model,
                input=[
                    {
                        "role": "system",
                        "content": (
                            "Voce e Nano IA. Responda em pt-BR, direto, claro e util. "
                            "Confirme a acao e destaque o principal resultado."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Pedido: {message}\nIntent: {intent}\nResultados das tools: {tool_results}"
                        ),
                    },
                ],
            )
            text = (getattr(response, "output_text", "") or "").strip()
            if text:
                return text
            return self._fallback_tool_response(intent=intent, tool_results=tool_results)
        except Exception:
            return self._fallback_tool_response(intent=intent, tool_results=tool_results)

    def _fallback_tool_response(self, *, intent: str, tool_results: Dict[str, Any]) -> str:
        if intent == "general_chat":
            return (
                "Estou com voce. Posso responder perguntas, analisar seu financeiro, "
                "consultar sua agenda e executar tarefas no sistema agora."
            )
        if not tool_results:
            if intent in {"system_action", "system_query", "financial_analysis"}:
                return (
                    "Entendi seu pedido, mas nao consegui dados suficientes para executar com seguranca. "
                    "Pode me passar mais detalhes (valor, categoria, data ou conta)?"
                )
            if intent == "web_research":
                return "Tentei pesquisar agora, mas a busca externa falhou temporariamente. Posso tentar de novo em seguida."
            return "Entendi. Pode me passar um pouco mais de contexto que eu resolvo para voce."
        if intent in {"system_action", "system_query", "financial_analysis"}:
            return "Conclui seu pedido com dados reais do sistema e deixei tudo registrado."
        if intent == "web_research":
            return "Pesquisei na web e trouxe resultados atualizados para voce."
        return "Conclui seu pedido com sucesso."
