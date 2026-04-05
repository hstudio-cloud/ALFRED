import re
import unicodedata
from datetime import datetime, timedelta
from typing import List, Optional

from .types import NanoAction


class SpecialistBase:
    name = "specialist"

    speech_corrections = {
        "alfre": "alfred",
        "nanu": "nano",
        "nanno": "nano",
        "piks": "pix",
        "pics": "pix",
        "piques": "pix",
        "pecs": "pix",
        "despeza": "despesa",
        "despezas": "despesas",
        "boleta": "boleto",
        "boleta": "boleto",
        "cartaum": "cartao",
        "cartao": "cartao",
        "cradito": "credito",
        "debto": "debito",
        "alimen tacao": "alimentacao",
        "alimentasao": "alimentacao",
        "combustiveu": "combustivel",
        "combustive": "combustivel",
        "conbustivel": "combustivel",
        "empreza": "empresa",
        "fornecedo": "fornecedor",
        "lembrenti": "lembrete",
        "lembrate": "lembrete",
        "vensimento": "vencimento",
        "transferensia": "transferencia",
    }

    def detect(self, message: str) -> List[NanoAction]:
        return []

    def normalize_text(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", text)
        normalized = normalized.encode("ascii", "ignore").decode("ascii")
        normalized = normalized.lower()
        normalized = re.sub(r"\s+", " ", normalized).strip()
        for wrong, right in self.speech_corrections.items():
            normalized = re.sub(rf"\b{re.escape(wrong)}\b", right, normalized)
        return normalized

    def clean_command_prefix(self, message: str) -> str:
        text = message.strip()
        text = re.sub(r"^\s*(alfred|nano)[\s,:-]*", "", text, flags=re.IGNORECASE)
        return text.strip()

    def extract_amount(self, message_lower: str) -> Optional[float]:
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

        word_patterns = [
            r"\b(?:de|valor|total|por)\s+([a-z\s]+?)\s*(?:reais?|real)\b",
            r"\b([a-z\s]+?)\s*(?:reais?|real)\b",
        ]
        for pattern in word_patterns:
            match = re.search(pattern, message_lower)
            if not match:
                continue
            parsed = self.parse_number_words(match.group(1))
            if parsed is not None and parsed > 0:
                return float(parsed)
        return None

    def parse_number_words(self, text: str) -> Optional[int]:
        units = {
            "zero": 0,
            "um": 1,
            "uma": 1,
            "dois": 2,
            "duas": 2,
            "tres": 3,
            "quatro": 4,
            "cinco": 5,
            "seis": 6,
            "sete": 7,
            "oito": 8,
            "nove": 9,
        }
        teens = {
            "dez": 10,
            "onze": 11,
            "doze": 12,
            "treze": 13,
            "catorze": 14,
            "quatorze": 14,
            "quinze": 15,
            "dezesseis": 16,
            "dezessete": 17,
            "dezoito": 18,
            "dezenove": 19,
        }
        tens = {
            "vinte": 20,
            "trinta": 30,
            "quarenta": 40,
            "cinquenta": 50,
            "sessenta": 60,
            "setenta": 70,
            "oitenta": 80,
            "noventa": 90,
        }
        hundreds = {
            "cem": 100,
            "cento": 100,
            "duzentos": 200,
            "trezentos": 300,
            "quatrocentos": 400,
            "quinhentos": 500,
            "seiscentos": 600,
            "setecentos": 700,
            "oitocentos": 800,
            "novecentos": 900,
        }

        tokens = [
            token for token in re.split(r"\s+", self.normalize_text(text))
            if token and token not in {"e", "reais", "real"}
        ]
        if not tokens:
            return None

        total = 0
        current = 0
        matched_any = False

        for token in tokens:
            if token in units:
                current += units[token]
                matched_any = True
            elif token in teens:
                current += teens[token]
                matched_any = True
            elif token in tens:
                current += tens[token]
                matched_any = True
            elif token in hundreds:
                current += hundreds[token]
                matched_any = True
            elif token == "mil":
                current = max(1, current) * 1000
                total += current
                current = 0
                matched_any = True
            else:
                return None

        if not matched_any:
            return None
        return total + current

    def extract_datetime(self, original_message: str) -> Optional[datetime]:
        message_lower = self.normalize_text(original_message)
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

    def detect_payment_method(self, message_lower: str) -> str:
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

    def detect_account_scope(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["empresa", "pj", "cnpj", "negocio", "corporativo", "fornecedor", "cliente", "funcionario", "colaborador"]):
            return "business"
        if any(word in message_lower for word in ["pessoal", "pf", "casa", "familia"]):
            return "personal"
        return "personal"

    def detect_category(self, message_lower: str) -> str:
        category_map = {
            "Alimentacao": ["alimentacao", "mercado", "restaurante", "lanche", "ifood", "comida", "supermercado"],
            "Combustivel": ["gasolina", "etanol", "diesel", "combustivel", "posto"],
            "Transporte": ["uber", "99", "onibus", "transporte", "passagem", "taxi"],
            "Moradia": ["aluguel", "condominio", "luz", "agua", "internet", "casa"],
            "Equipe": ["folha", "salario", "freelancer", "colaborador", "equipe"],
            "Impostos": ["imposto", "tributo", "das", "simples nacional", "taxa"],
            "Marketing": ["anuncio", "trafego", "meta ads", "google ads", "marketing"],
            "Vendas": ["cliente", "venda", "fatura", "cobranca", "recebimento"],
            "Assinaturas": ["assinatura", "software", "saas", "mensalidade", "plano"],
            "Saude": ["farmacia", "medico", "consulta", "exame", "saude"],
            "Cartao": ["cartao", "credito", "debito"],
            "Pix": ["pix"],
            "Educacao": ["curso", "faculdade", "escola", "educacao"],
            "Lazer": ["cinema", "viagem", "lazer", "hotel", "show"],
        }
        for category, keywords in category_map.items():
            if any(word in message_lower for word in keywords):
                return category
        return "Geral"


class FinanceOperationsSpecialist(SpecialistBase):
    name = "finance_operations"

    def extract_transaction_type(self, message_lower: str) -> Optional[str]:
        income_keywords = ["recebi", "ganhei", "entrada", "receita", "faturamento", "venda", "recebimento", "caiu", "entrou"]
        expense_keywords = ["gastei", "paguei", "comprei", "despesa", "gasto", "saida", "custo", "debitei", "foi cobrado"]

        if any(word in message_lower for word in income_keywords):
            return "income"
        if any(word in message_lower for word in expense_keywords):
            return "expense"
        if "pix" in message_lower and "cliente" in message_lower:
            return "income"
        if "pix" in message_lower:
            return "expense"
        return None

    def extract_bill_type(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["receber", "recebimento", "cobrar", "cliente", "fatura"]):
            return "receivable"
        return "payable"

    def build_transaction_title(self, message_lower: str, transaction_type: str, category: str) -> str:
        if "pix" in message_lower and transaction_type == "income":
            return f"Recebimento via Pix - {category}"
        if "pix" in message_lower and transaction_type == "expense":
            return f"Pagamento via Pix - {category}"
        if transaction_type == "income":
            return f"Receita - {category}"
        return f"Despesa - {category}"

    def build_bill_title(self, cleaned_message: str, category: str, bill_type: str) -> str:
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

    def detect(self, message: str) -> List[NanoAction]:
        cleaned_message = self.clean_command_prefix(message)
        message_lower = self.normalize_text(cleaned_message)
        actions: List[NanoAction] = []

        bill_keywords = [
            "criar conta", "crie uma conta", "conta a pagar", "conta a receber",
            "registrar conta", "registrar boleto", "adicionar conta", "nova conta",
            "vencimento", "fatura", "boleto"
        ]
        if any(keyword in message_lower for keyword in bill_keywords):
            amount = self.extract_amount(message_lower)
            due_date = self.extract_datetime(cleaned_message)
            bill_type = self.extract_bill_type(message_lower)
            category = self.detect_category(message_lower)
            payment_method = self.detect_payment_method(message_lower)
            account_scope = self.detect_account_scope(message_lower)
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

            actions.append(
                NanoAction(
                    type="create_bill",
                    data={
                        "title": self.build_bill_title(cleaned_message, category, bill_type),
                        "amount": amount,
                        "type": bill_type,
                        "due_date": due_date.isoformat(),
                        "category": category,
                        "payment_method": payment_method,
                        "account_scope": account_scope,
                        "description": cleaned_message,
                        "recurring": any(word in message_lower for word in ["todo mes", "mensal", "recorrente"]),
                        "missing_fields": missing_fields,
                        "assumptions": assumptions,
                        "detected": True,
                    },
                    assumptions=assumptions,
                    confidence=0.88,
                )
            )

        transaction_keywords = [
            "gastar", "gastei", "comprei", "paguei", "despesa", "recebi", "ganhei",
            "receita", "salario", "pix", "registrar pix", "registrar despesa", "criar despesa",
            "adicionar despesa", "lancar despesa", "registrar receita", "criar receita",
        ]
        if any(word in message_lower for word in transaction_keywords):
            transaction_type = self.extract_transaction_type(message_lower)
            amount = self.extract_amount(message_lower)
            category = self.detect_category(message_lower)
            payment_method = self.detect_payment_method(message_lower)
            account_scope = self.detect_account_scope(message_lower)
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
                actions.append(
                    NanoAction(
                        type="create_transaction",
                        data={
                            "title": self.build_transaction_title(message_lower, transaction_type, category),
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
                        assumptions=assumptions,
                        confidence=0.9,
                    )
                )

        return actions


class ReminderSpecialist(SpecialistBase):
    name = "reminders"

    def extract_reminder_title(self, cleaned_message: str) -> str:
        title = re.sub(
            r"(?i)\b(criar|crie|cria|adicione|registrar|registre|lembrete|lembrar|lembre[- ]?me|nao esquecer|nao me deixe esquecer|avise)\b",
            "",
            cleaned_message,
        ).strip(" ,.-:")
        if not title:
            return "Lembrete financeiro"

        for token in ["amanha", "hoje", "depois de amanha", "semana que vem", "mes que vem"]:
            title = re.sub(rf"(?i)\b{re.escape(token)}\b", "", title).strip(" ,.-:")

        title = re.sub(r"\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)^de\s+", "", title).strip(" ,.-:")
        return title or "Lembrete financeiro"

    def detect(self, message: str) -> List[NanoAction]:
        cleaned_message = self.clean_command_prefix(message)
        message_lower = self.normalize_text(cleaned_message)
        reminder_keywords = ["lembrar", "lembre-me", "lembrete", "nao esquecer", "avise"]
        if not any(word in message_lower for word in reminder_keywords):
            return []

        remind_at = self.extract_datetime(cleaned_message)
        assumptions = []
        if remind_at is None:
            remind_at = (datetime.utcnow() + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
            assumptions.append("Data do lembrete assumida para amanha as 09:00.")

        return [
            NanoAction(
                type="create_reminder",
                data={
                    "title": self.extract_reminder_title(cleaned_message),
                    "description": cleaned_message,
                    "remind_at": remind_at.isoformat(),
                    "missing_fields": [],
                    "assumptions": assumptions,
                    "detected": True,
                },
                assumptions=assumptions,
                confidence=0.86,
            )
        ]


class ProductivitySpecialist(SpecialistBase):
    name = "productivity"

    def detect(self, message: str) -> List[NanoAction]:
        message_lower = self.normalize_text(self.clean_command_prefix(message))
        actions: List[NanoAction] = []

        if any(word in message_lower for word in ["tarefa", "fazer", "preciso", "tenho que", "devo"]):
            priority = "medium"
            if any(word in message_lower for word in ["urgente", "importante", "prioritario"]):
                priority = "high"
            elif any(word in message_lower for word in ["depois", "quando puder"]):
                priority = "low"
            actions.append(
                NanoAction(
                    type="create_task",
                    data={"priority": priority, "detected": True},
                    confidence=0.72,
                )
            )

        if any(word in message_lower for word in ["habito", "todo dia", "diariamente", "rotina"]):
            actions.append(
                NanoAction(
                    type="create_habit",
                    data={"frequency": "daily", "detected": True},
                    confidence=0.68,
                )
            )

        return actions


class InsightSpecialist(SpecialistBase):
    name = "insights"

    def extract_period(self, message_lower: str) -> str:
        if any(keyword in message_lower for keyword in ["hoje", "dia de hoje", "semana", "7 dias"]):
            return "7d"
        if any(keyword in message_lower for keyword in ["90 dias", "trimestre", "3 meses"]):
            return "90d"
        if any(keyword in message_lower for keyword in ["ano", "12 meses"]):
            return "year"
        return "30d"

    def detect(self, message: str) -> List[NanoAction]:
        message_lower = self.normalize_text(self.clean_command_prefix(message))
        analysis_keywords = [
            "analisar gastos", "analise meus gastos", "analisar despesas", "como estou gastando",
            "onde estou gastando", "quero analisar", "resuma meus gastos", "analisar financeiro",
            "gastos do mes", "despesas do mes", "fluxo de caixa", "como esta meu financeiro",
        ]
        if not any(keyword in message_lower for keyword in analysis_keywords):
            return []

        return [
            NanoAction(
                type="analyze_spending",
                data={"period": self.extract_period(message_lower), "detected": True},
                confidence=0.84,
            )
        ]
