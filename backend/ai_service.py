import logging
import re
import unicodedata
from datetime import datetime, timedelta

try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
except ImportError:
    LlmChat = None
    UserMessage = None


logger = logging.getLogger(__name__)


class AlfredAI:
    """Alfred AI Assistant - interpreta comandos financeiros em linguagem natural."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.system_message = """Voce e Alfred, um assistente inteligente para pagamentos, gestao financeira e rotina operacional.

Sua funcao e ajudar o usuario a controlar o dia a dia financeiro com conversas naturais.

Voce pode:
- Registrar receitas e despesas
- Criar contas a pagar e a receber
- Criar lembretes e acompanhamentos
- Identificar categoria, metodo de pagamento e escopo pessoal ou empresa
- Analisar gastos e sugerir economia

Quando o usuario pedir para criar algo:
1. Confirme rapidamente o que entendeu
2. Destaque as classificacoes principais
3. Responda de forma objetiva e util

Se faltar um detalhe importante, faca uma suposicao razoavel e deixe isso explicito."""

    async def process_message(self, user_id: str, message: str) -> dict:
        """Processa a mensagem do usuario e retorna resposta + acoes detectadas."""
        actions = self._detect_actions(message)

        try:
            if LlmChat is None or UserMessage is None:
                return {
                    "response": "Interpretei sua mensagem e preparei as acoes financeiras correspondentes.",
                    "actions": actions,
                }

            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"user_{user_id}",
                system_message=self.system_message,
            ).with_model("openai", "gpt-5.1")

            response = await chat.send_message(UserMessage(text=message))
            if response is None:
                response = "Interpretei sua mensagem e preparei as acoes financeiras correspondentes."
            elif not isinstance(response, str):
                response = str(response)

            return {
                "response": response,
                "actions": actions,
            }
        except Exception as exc:
            logger.error(f"Error in AI processing: {exc}")
            return {
                "response": "Interpretei sua mensagem localmente e preparei as acoes correspondentes.",
                "actions": actions,
            }

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
            assumptions = []
            missing_fields = []

            if due_date is None:
                due_date = (datetime.utcnow() + timedelta(days=7)).replace(hour=9, minute=0, second=0, microsecond=0)
                assumptions.append("Vencimento assumido para daqui a 7 dias.")

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
                    "payment_method": self._detect_payment_method(message_lower),
                    "account_scope": self._detect_account_scope(message_lower),
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
            missing_fields = []
            if transaction_type is None:
                missing_fields.append("type")
            if amount is None:
                missing_fields.append("amount")

            if transaction_type is not None:
                actions.append({
                    "type": "create_transaction",
                    "data": {
                        "title": self._build_transaction_title(message_lower, transaction_type, category),
                        "type": transaction_type,
                        "category": category,
                        "amount": amount,
                        "description": cleaned_message,
                        "payment_method": self._detect_payment_method(message_lower),
                        "account_scope": self._detect_account_scope(message_lower),
                        "date": datetime.utcnow().isoformat(),
                        "missing_fields": missing_fields,
                        "assumptions": [],
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
