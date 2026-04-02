import logging
import os
import re
import unicodedata
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx
from openai import AsyncOpenAI


logger = logging.getLogger(__name__)


class AlfredAI:
    """Alfred AI Assistant - interpreta comandos financeiros e conversa com contexto."""

    def __init__(self, api_key: Optional[str]):
        self.api_key = api_key or ""
        self.client = AsyncOpenAI(api_key=self.api_key) if self.api_key else None
        self.text_model = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")
        self.voice_model = os.getenv("OPENAI_VOICE_MODEL", "gpt-4o-mini-tts")
        self.voice_name = os.getenv("OPENAI_VOICE_NAME", "alloy")
        self.system_message = """Voce e Alfred, um assistente financeiro sofisticado, prestativo e objetivo.

Seu papel:
- conversar de forma natural em portugues do Brasil
- entender pedidos financeiros, operacionais e de rotina
- confirmar rapidamente o que foi entendido
- responder com clareza, calma e tom executivo
- ser direto, sem floreios longos

Capacidades do Alfred:
- registrar receitas e despesas
- criar contas a pagar e a receber
- criar lembretes e acompanhamentos
- identificar categoria, metodo de pagamento e escopo pessoal ou empresa
- analisar gastos e sugerir economia

Regras de resposta:
- responda em pt-BR
- mantenha respostas curtas, naturais e confiantes
- quando houver acao executada, reconheca o pedido e destaque o resultado
- quando faltar dado importante, diga exatamente o que falta
- se houver memoria do usuario, use isso para personalizar sem inventar fatos"""

    async def process_message(
        self,
        user_id: str,
        message: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        memory_profile: Optional[Dict[str, Any]] = None,
    ) -> dict:
        """Processa a mensagem do usuario e retorna resposta + acoes detectadas."""
        actions = self._detect_actions(message)
        response = await self._generate_response(
            user_id=user_id,
            message=message,
            actions=actions,
            conversation_history=conversation_history or [],
            memory_profile=memory_profile or {},
        )
        return {
            "response": response,
            "actions": actions,
        }

    async def synthesize_speech(self, text: str) -> Optional[bytes]:
        """Gera audio TTS com voz da OpenAI quando ha chave configurada."""
        cleaned = (text or "").strip()
        if not cleaned or not self.api_key:
            return None

        payload = {
            "model": self.voice_model,
            "voice": self.voice_name,
            "input": cleaned[:4000],
            "format": "mp3",
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                response = await client.post(
                    "https://api.openai.com/v1/audio/speech",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    json=payload,
                )
                response.raise_for_status()
                return response.content
        except Exception as exc:
            logger.error("Error synthesizing speech: %s", exc)
            return None

    async def _generate_response(
        self,
        user_id: str,
        message: str,
        actions: List[Dict[str, Any]],
        conversation_history: List[Dict[str, str]],
        memory_profile: Dict[str, Any],
    ) -> str:
        fallback_response = self._build_fallback_response(actions)
        if self.client is None:
            return fallback_response

        action_summary = self._summarize_actions(actions)
        memory_summary = self._summarize_memory(memory_profile)
        history_summary = self._summarize_history(conversation_history)

        prompt = f"""Mensagem atual do usuario:
{message}

Acoes detectadas localmente:
{action_summary}

Memoria conhecida do usuario:
{memory_summary}

Historico recente:
{history_summary}

Responda como Alfred em ate 4 frases curtas. Se houver acao detectada, confirme o que entendeu e prepare o usuario para a execucao."""

        try:
            response = await self.client.responses.create(
                model=self.text_model,
                input=[
                    {"role": "system", "content": self.system_message},
                    {"role": "user", "content": prompt},
                ],
                user=user_id,
            )
            output_text = getattr(response, "output_text", "") or ""
            cleaned = output_text.strip()
            return cleaned or fallback_response
        except Exception as exc:
            logger.error("Error in OpenAI response generation: %s", exc)
            return fallback_response

    def _build_fallback_response(self, actions: List[Dict[str, Any]]) -> str:
        if not actions:
            return "Entendi. Posso te ajudar a registrar gastos, criar contas, lembretes ou analisar seus numeros."

        main_action = actions[0]["type"]
        fallback_map = {
            "create_transaction": "Entendi. Vou registrar essa movimentacao financeira para voce.",
            "create_bill": "Entendi. Vou criar essa conta e organizar o vencimento.",
            "create_reminder": "Entendi. Vou criar esse lembrete para voce.",
            "analyze_spending": "Entendi. Vou analisar seus gastos e montar um resumo objetivo.",
            "create_task": "Entendi. Vou transformar isso em uma tarefa.",
            "create_habit": "Entendi. Vou registrar isso como habito.",
        }
        return fallback_map.get(main_action, "Entendi. Vou cuidar disso agora.")

    def _summarize_actions(self, actions: List[Dict[str, Any]]) -> str:
        if not actions:
            return "Nenhuma acao estruturada detectada."
        lines = []
        for action in actions:
            lines.append(f"- {action.get('type')}: {action.get('data', {})}")
        return "\n".join(lines)

    def _summarize_history(self, conversation_history: List[Dict[str, str]]) -> str:
        if not conversation_history:
            return "Sem historico recente."
        lines = []
        for item in conversation_history[-6:]:
            role = item.get("role", "user")
            content = (item.get("content") or "").strip().replace("\n", " ")
            if len(content) > 220:
                content = f"{content[:217]}..."
            lines.append(f"{role}: {content}")
        return "\n".join(lines)

    def _summarize_memory(self, memory_profile: Dict[str, Any]) -> str:
        if not memory_profile:
            return "Nenhuma preferencia persistida."

        preferences = memory_profile.get("preferences", {})
        recents = memory_profile.get("recent_patterns", [])
        facts = []

        if preferences.get("payment_method"):
            facts.append(f"metodo favorito: {preferences['payment_method']}")
        if preferences.get("account_scope"):
            facts.append(f"escopo mais comum: {preferences['account_scope']}")
        if preferences.get("category"):
            facts.append(f"categoria frequente: {preferences['category']}")
        if preferences.get("voice_greeting_style"):
            facts.append(f"estilo de voz: {preferences['voice_greeting_style']}")
        if recents:
            facts.append(f"padroes recentes: {', '.join(recents[-4:])}")

        return "; ".join(facts) if facts else "Nenhuma preferencia persistida."

    def _normalize_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text)
        normalized = normalized.encode("ascii", "ignore").decode("ascii")
        return normalized.lower()

    def _clean_command_prefix(self, message: str) -> str:
        text = message.strip()
        text = re.sub(r"^\s*alfred[\s,:-]*", "", text, flags=re.IGNORECASE)
        return text.strip()

    def _detect_payment_method(self, message_lower: str) -> str:
        if "pix" in message_lower:
            return "pix"
        if any(word in message_lower for word in ["cartao", "credito", "debito"]):
            return "card"
        if "boleto" in message_lower:
            return "boleto"
        if any(word in message_lower for word in ["transferencia", "ted", "doc"]):
            return "transfer"
        if any(word in message_lower for word in ["dinheiro", "especie"]):
            return "cash"
        return "other"

    def _detect_account_scope(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["empresa", "pj", "cnpj", "negocio", "corporativo"]):
            return "business"
        if any(word in message_lower for word in ["pessoal", "pf", "casa", "familia"]):
            return "personal"
        return "personal"

    def _detect_category(self, message_lower: str) -> str:
        category_map = {
            "Alimentacao": ["alimentacao", "mercado", "restaurante", "lanche", "ifood", "comida", "supermercado"],
            "Transporte": ["uber", "99", "gasolina", "combustivel", "onibus", "transporte"],
            "Moradia": ["aluguel", "condominio", "luz", "agua", "internet", "casa"],
            "Equipe": ["folha", "salario", "freelancer", "colaborador", "equipe"],
            "Impostos": ["imposto", "tributo", "das", "simples nacional", "taxa"],
            "Marketing": ["anuncio", "trafego", "meta ads", "google ads", "marketing"],
            "Vendas": ["cliente", "venda", "fatura", "cobranca", "recebimento"],
            "Assinaturas": ["assinatura", "software", "saas", "mensalidade", "plano"],
            "Saude": ["farmacia", "medico", "consulta", "exame", "saude"],
            "Cartao": ["cartao", "credito", "debito"],
            "Pix": ["pix"],
        }

        for category, keywords in category_map.items():
            if any(word in message_lower for word in keywords):
                return category
        return "Geral"

    def _extract_amount(self, message_lower: str):
        patterns = [
            r"(?:r\$|rs)\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)",
            r"\b(?:de|valor|total|por)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)\s*(?:reais?|real)?\b",
            r"(?<![\/\-])(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})|\d+(?:,\d{1,2})?)\s*(?:reais?|real)\b(?![\/\-])",
        ]
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if not match:
                continue
            value_str = match.group(1)
            if not value_str:
                continue
            normalized = value_str.replace(".", "").replace(",", ".")
            try:
                value = float(normalized)
            except ValueError:
                continue
            if value > 0:
                return value
        return None

    def _extract_datetime(self, original_message: str):
        message_lower = self._normalize_text(original_message)
        now = datetime.utcnow()

        if "depois de amanha" in message_lower:
            return (now + timedelta(days=2)).replace(hour=9, minute=0, second=0, microsecond=0)
        if "amanha" in message_lower:
            return (now + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
        if "hoje" in message_lower:
            return now.replace(hour=18, minute=0, second=0, microsecond=0)
        if "semana que vem" in message_lower:
            return (now + timedelta(days=7)).replace(hour=9, minute=0, second=0, microsecond=0)
        if "mes que vem" in message_lower:
            return (now + timedelta(days=30)).replace(hour=9, minute=0, second=0, microsecond=0)

        date_match = re.search(r"\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b", message_lower)
        if date_match:
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            year_part = date_match.group(3)
            year = int(year_part) if year_part else now.year
            if year < 100:
                year += 2000
            try:
                parsed = datetime(year, month, day, 9, 0, 0)
                if not year_part and parsed < now:
                    parsed = datetime(year + 1, month, day, 9, 0, 0)
                return parsed
            except ValueError:
                return None

        return None

    def _extract_period(self, message_lower: str) -> str:
        if any(keyword in message_lower for keyword in ["hoje", "dia de hoje"]):
            return "7d"
        if any(keyword in message_lower for keyword in ["semana", "7 dias"]):
            return "7d"
        if any(keyword in message_lower for keyword in ["90 dias", "trimestre", "3 meses"]):
            return "90d"
        if any(keyword in message_lower for keyword in ["ano", "12 meses"]):
            return "year"
        return "30d"

    def _build_transaction_title(self, message_lower: str, transaction_type: str, category: str) -> str:
        if "pix" in message_lower and transaction_type == "income":
            return f"Recebimento via Pix - {category}"
        if "pix" in message_lower and transaction_type == "expense":
            return f"Pagamento via Pix - {category}"
        if transaction_type == "income":
            return f"Receita - {category}"
        return f"Despesa - {category}"

    def _extract_transaction_type(self, message_lower: str):
        income_keywords = ["recebi", "ganhei", "entrada", "receita", "faturamento", "venda", "recebimento"]
        expense_keywords = ["gastei", "paguei", "comprei", "despesa", "gasto", "saida", "custo"]

        if any(word in message_lower for word in income_keywords):
            return "income"
        if any(word in message_lower for word in expense_keywords):
            return "expense"
        if "pix" in message_lower and "cliente" in message_lower:
            return "income"
        if "pix" in message_lower:
            return "expense"
        return None

    def _extract_bill_type(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["receber", "recebimento", "cobrar", "cliente", "fatura"]):
            return "receivable"
        return "payable"

    def _extract_reminder_title(self, cleaned_message: str, message_lower: str) -> str:
        title = re.sub(
            r"(?i)\b(criar|crie|cria|adicione|registrar|registre|lembrete|lembrar|lembre[- ]?me|nao esquecer|nao me deixe esquecer|avise)\b",
            "",
            cleaned_message,
        ).strip(" ,.-:")
        if not title:
            return "Lembrete financeiro"

        date_tokens = [
            "amanha", "hoje", "depois de amanha", "semana que vem", "mes que vem"
        ]
        for token in date_tokens:
            title = re.sub(rf"(?i)\b{re.escape(token)}\b", "", title).strip(" ,.-:")

        title = re.sub(r"\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)^de\s+", "", title).strip(" ,.-:")
        return title or "Lembrete financeiro"

    def _build_bill_title(self, cleaned_message: str, category: str, bill_type: str) -> str:
        candidate = re.sub(
            r"(?i)\b(criar|crie|cria|registrar|registre|nova|novo|conta|a pagar|a receber|pagar|receber)\b",
            "",
            cleaned_message,
        ).strip(" ,.-:")
        candidate = re.sub(r"(?i)\bde\s+\d+(?:[.,]\d{1,2})?\s*(?:reais?|real)\b", "", candidate).strip(" ,.-:")
        candidate = re.sub(r"(?i)\bpara\s+(?:hoje|amanha|depois de amanha|semana que vem|mes que vem)\b", "", candidate).strip(" ,.-:")
        candidate = re.sub(r"\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b", "", candidate).strip(" ,.-:")
        candidate = re.sub(r"(?i)^de\s+", "", candidate).strip(" ,.-:")
        if candidate:
            return candidate.title()
        prefix = "Conta a receber" if bill_type == "receivable" else "Conta a pagar"
        return f"{prefix} - {category}"

    def _detect_actions(self, message: str) -> list:
        """Detecta acoes que devem ser executadas com base na mensagem."""
        cleaned_message = self._clean_command_prefix(message)
        message_lower = self._normalize_text(cleaned_message)
        actions = []

        if any(word in message_lower for word in ["tarefa", "fazer", "preciso", "tenho que", "devo"]):
            priority = "medium"
            if any(word in message_lower for word in ["urgente", "importante", "prioritario"]):
                priority = "high"
            elif any(word in message_lower for word in ["depois", "quando puder"]):
                priority = "low"

            actions.append({
                "type": "create_task",
                "data": {
                    "priority": priority,
                    "detected": True,
                },
            })

        if any(word in message_lower for word in ["habito", "todo dia", "diariamente", "rotina"]):
            actions.append({
                "type": "create_habit",
                "data": {
                    "frequency": "daily",
                    "detected": True,
                },
            })

        reminder_keywords = ["lembrar", "lembre-me", "lembrete", "nao esquecer", "avise"]
        if any(word in message_lower for word in reminder_keywords):
            remind_at = self._extract_datetime(cleaned_message)
            missing_fields = []
            assumptions = []
            if remind_at is None:
                remind_at = (datetime.utcnow() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
                assumptions.append("Data do lembrete assumida para amanha as 09:00.")

            actions.append({
                "type": "create_reminder",
                "data": {
                    "title": self._extract_reminder_title(cleaned_message, message_lower),
                    "description": cleaned_message,
                    "remind_at": remind_at.isoformat(),
                    "missing_fields": missing_fields,
                    "assumptions": assumptions,
                    "detected": True,
                },
            })

        bill_keywords = ["criar conta", "crie uma conta", "conta a pagar", "conta a receber", "registrar conta", "registrar boleto"]
        if any(keyword in message_lower for keyword in bill_keywords):
            amount = self._extract_amount(message_lower)
            due_date = self._extract_datetime(cleaned_message)
            bill_type = self._extract_bill_type(message_lower)
            category = self._detect_category(message_lower)
            payment_method = self._detect_payment_method(message_lower)
            account_scope = self._detect_account_scope(message_lower)
            assumptions = []
            missing_fields = []

            if due_date is None:
                due_date = (datetime.utcnow() + timedelta(days=7)).replace(hour=9, minute=0, second=0, microsecond=0)
                assumptions.append("Vencimento assumido para daqui a 7 dias.")
            if category == "Geral":
                assumptions.append("Categoria assumida como Geral por falta de contexto suficiente.")
            if payment_method == "other":
                assumptions.append("Metodo de pagamento mantido como outro por falta de detalhe.")
            if account_scope == "personal" and not any(word in message_lower for word in ["pessoal", "empresa", "pj", "pf", "negocio", "casa", "familia"]):
                assumptions.append("Escopo assumido como pessoal por nao haver indicacao explicita.")

            if amount is None:
                missing_fields.append("amount")

            actions.append({
                "type": "create_bill",
                "data": {
                    "title": self._build_bill_title(cleaned_message, category, bill_type),
                    "amount": amount,
                    "type": bill_type,
                    "due_date": due_date.isoformat(),
                    "category": category,
                    "payment_method": payment_method,
                    "account_scope": account_scope,
                    "description": cleaned_message,
                    "recurring": any(word in message_lower for word in ["todo mes", "mensal", "recorrente", "todo mes"]),
                    "missing_fields": missing_fields,
                    "assumptions": assumptions,
                    "detected": True,
                },
            })

        transaction_keywords = [
            "gastar", "gastei", "comprei", "paguei", "despesa", "recebi", "ganhei",
            "receita", "salario", "pix", "registrar pix", "registrar despesa", "criar despesa",
        ]
        if any(word in message_lower for word in transaction_keywords):
            transaction_type = self._extract_transaction_type(message_lower)
            amount = self._extract_amount(message_lower)
            category = self._detect_category(message_lower)
            payment_method = self._detect_payment_method(message_lower)
            account_scope = self._detect_account_scope(message_lower)
            missing_fields = []
            assumptions = []
            if transaction_type is None:
                missing_fields.append("type")
            if amount is None:
                missing_fields.append("amount")
            if category == "Geral":
                assumptions.append("Categoria assumida como Geral por falta de contexto suficiente.")
            if payment_method == "other":
                assumptions.append("Metodo de pagamento mantido como outro por falta de detalhe.")
            if account_scope == "personal" and not any(word in message_lower for word in ["pessoal", "empresa", "pj", "pf", "negocio", "casa", "familia"]):
                assumptions.append("Escopo assumido como pessoal por nao haver indicacao explicita.")

            if transaction_type is not None:
                actions.append({
                    "type": "create_transaction",
                    "data": {
                        "title": self._build_transaction_title(message_lower, transaction_type, category),
                        "type": transaction_type,
                        "category": category,
                        "amount": amount,
                        "description": cleaned_message,
                        "payment_method": payment_method,
                        "account_scope": account_scope,
                        "date": datetime.utcnow().isoformat(),
                        "missing_fields": missing_fields,
                        "assumptions": assumptions,
                        "detected": True,
                    },
                })

        analysis_keywords = [
            "analisar gastos", "analise meus gastos", "analisar despesas", "como estou gastando",
            "onde estou gastando", "quero analisar", "resuma meus gastos", "analisar financeiro",
        ]
        if any(keyword in message_lower for keyword in analysis_keywords):
            actions.append({
                "type": "analyze_spending",
                "data": {
                    "period": self._extract_period(message_lower),
                    "detected": True,
                },
            })

        return actions
