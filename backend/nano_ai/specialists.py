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
        "na no": "nano",
        "nanoo": "nano",
        "piks": "pix",
        "pics": "pix",
        "piques": "pix",
        "pecs": "pix",
        "pixi": "pix",
        "despeza": "despesa",
        "despezas": "despesas",
        "dispesa": "despesa",
        "dispeza": "despesa",
        "boleta": "boleto",
        "boleta": "boleto",
        "cartaum": "cartao",
        "cartao": "cartao",
        "cradito": "credito",
        "debto": "debito",
        "debitoo": "debito",
        "alimen tacao": "alimentacao",
        "alimentasao": "alimentacao",
        "alimetacao": "alimentacao",
        "combustiveu": "combustivel",
        "combustive": "combustivel",
        "conbustivel": "combustivel",
        "combustivelo": "combustivel",
        "empreza": "empresa",
        "fornecedo": "fornecedor",
        "fornecedora": "fornecedor",
        "lembrenti": "lembrete",
        "lembrate": "lembrete",
        "lembra te": "lembrete",
        "vensimento": "vencimento",
        "transferensia": "transferencia",
        "trasferencia": "transferencia",
        "trasnferencia": "transferencia",
        "movimentasao": "movimentacao",
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
        parsed_base: Optional[datetime] = None
        default_hour = 9
        default_minute = 0

        def extract_time_parts(text: str) -> Optional[tuple[int, int]]:
            contextual = re.search(r"\b(?:as|a|às)\s*(\d{1,2})(?:[:h](\d{1,2}))?\b", text)
            if contextual:
                hour = int(contextual.group(1))
                minute = int(contextual.group(2) or 0)
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return hour, minute

            compact = re.search(r"\b(\d{1,2})h(\d{1,2})?\b", text)
            if compact:
                hour = int(compact.group(1))
                minute = int(compact.group(2) or 0)
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return hour, minute

            clock = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
            if clock:
                hour = int(clock.group(1))
                minute = int(clock.group(2))
                if 0 <= hour <= 23 and 0 <= minute <= 59:
                    return hour, minute
            return None

        if "depois de amanha" in message_lower:
            parsed_base = now + timedelta(days=2)
        elif "amanha" in message_lower:
            parsed_base = now + timedelta(days=1)
        elif "hoje" in message_lower:
            parsed_base = now
            default_hour = 18
        elif "semana que vem" in message_lower:
            parsed_base = now + timedelta(days=7)
        elif "mes que vem" in message_lower:
            parsed_base = now + timedelta(days=30)

        date_match = re.search(r"\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b", message_lower)
        if date_match:
            day = int(date_match.group(1))
            month = int(date_match.group(2))
            year_part = date_match.group(3)
            year = int(year_part) if year_part else now.year
            if year < 100:
                year += 2000
            try:
                parsed = datetime(year, month, day, default_hour, default_minute, 0)
                if not year_part and parsed < now:
                    parsed = datetime(year + 1, month, day, default_hour, default_minute, 0)
                parsed_base = parsed
            except ValueError:
                return None

        if parsed_base is None:
            return None

        time_parts = extract_time_parts(message_lower)
        hour, minute = time_parts if time_parts else (default_hour, default_minute)
        return parsed_base.replace(hour=hour, minute=minute, second=0, microsecond=0)

    def detect_payment_method(self, message_lower: str) -> str:
        if "pix" in message_lower:
            return "pix"
        if any(word in message_lower for word in ["cartao", "credito", "debito", "visa", "master", "elo"]):
            return "card"
        if "boleto" in message_lower:
            return "boleto"
        if any(word in message_lower for word in ["transferencia", "ted", "doc"]):
            return "transfer"
        if any(word in message_lower for word in ["dinheiro", "especie"]):
            return "cash"
        return "other"

    def detect_account_scope(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["empresa", "pj", "cnpj", "negocio", "corporativo", "fornecedor", "cliente", "funcionario", "colaborador", "escritorio", "operacao"]):
            return "business"
        if any(word in message_lower for word in ["pessoal", "pf", "casa", "familia", "particular"]):
            return "personal"
        return "personal"

    def detect_category(self, message_lower: str) -> str:
        category_map = {
            "Alimentacao": ["alimentacao", "mercado", "restaurante", "lanche", "ifood", "comida", "supermercado"],
            "Combustivel": ["gasolina", "etanol", "diesel", "combustivel", "posto"],
            "Transporte": ["uber", "99", "onibus", "transporte", "passagem", "taxi"],
            "Moradia": ["aluguel", "condominio", "luz", "agua", "internet", "casa"],
            "Fornecedores": ["fornecedor", "compra de estoque", "insumo", "materia prima"],
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
            "Servicos": ["servico", "manutencao", "consultoria", "agencia"],
        }
        for category, keywords in category_map.items():
            if any(word in message_lower for word in keywords):
                return category
        return "Geral"


class FinanceOperationsSpecialist(SpecialistBase):
    name = "finance_operations"

    def extract_transaction_type(self, message_lower: str) -> Optional[str]:
        income_keywords = ["recebi", "ganhei", "entrada", "receita", "faturamento", "venda", "recebimento", "caiu", "entrou", "deposito", "pagamento recebido"]
        expense_keywords = ["gastei", "paguei", "comprei", "despesa", "gasto", "saida", "custo", "debitei", "foi cobrado", "transferi", "pagar"]

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

        analysis_question_hints = [
            "quanto gastei",
            "quanto eu gastei",
            "quanto saiu",
            "quanto entrou",
            "me mostre",
            "mostrar gastos",
            "gastos do mes",
            "despesas do mes",
            "resumo financeiro",
            "fluxo de caixa",
            "como esta meu financeiro",
            "analisar gastos",
            "analise meus gastos",
        ]
        explicit_write_hints = [
            "criar",
            "crie",
            "cria",
            "registrar",
            "registre",
            "lancar",
            "lance",
            "adicionar",
            "adicione",
            "paguei",
            "comprei",
            "recebi",
        ]
        if any(hint in message_lower for hint in analysis_question_hints) and not any(
            hint in message_lower for hint in explicit_write_hints
        ):
            return []

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
                        "recurring": any(word in message_lower for word in ["todo mes", "mensal", "recorrente", "todo dia", "todo ano"]),
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


class NavigationSpecialist(SpecialistBase):
    name = "navigation"

    section_map = {
        "assistant": ["nano ia", "assistente", "chat", "ia", "conversa", "nano"],
        "overview": ["dashboard", "painel", "visao geral", "inicio", "home do painel", "resumo"],
        "transactions": ["movimentacoes", "movimentacao", "transacoes", "transacao", "lancamentos", "entradas", "saidas"],
        "banks": ["bancos", "banco", "contas bancarias", "conta bancaria", "instituicoes"],
        "cards": ["cartoes", "cartao", "fatura", "faturas", "limite"],
        "contacts": ["contatos", "clientes", "fornecedores", "pagadores"],
        "employees": ["funcionarios", "funcionario", "colaboradores", "colaborador", "folha", "ponto"],
        "reports": ["relatorios", "relatorio", "analises", "dre", "fluxo de caixa"],
        "company": ["empresa", "configuracoes da empresa", "workspace", "dados da empresa"],
        "profile": ["perfil", "usuario", "minha conta"],
        "settings": ["configuracoes", "ajustes", "categorias", "preferencias"],
    }

    def detect(self, message: str) -> List[NanoAction]:
        message_lower = self.normalize_text(self.clean_command_prefix(message))
        if not any(word in message_lower for word in ["abrir", "abre", "ir para", "vai para", "mostra", "mostrar", "acesse", "acessar", "entrar em", "navegar"]):
            return []

        for section_id, aliases in self.section_map.items():
            if any(alias in message_lower for alias in aliases):
                return [
                    NanoAction(
                        type="navigate",
                        data={
                            "section": section_id,
                            "label": aliases[0].title(),
                            "detected": True,
                        },
                        confidence=0.82,
                    )
                ]
        return []


class AgendaSpecialist(SpecialistBase):
    name = "agenda"

    def detect(self, message: str) -> List[NanoAction]:
        message_lower = self.normalize_text(self.clean_command_prefix(message))
        agenda_keywords = [
            "agenda",
            "compromisso",
            "compromissos",
            "calendario",
            "programacao",
            "tenho algo",
            "tem algo",
            "o que tenho",
            "o que eu tenho",
            "meus lembretes",
            "lembretes de hoje",
            "contas de hoje",
            "tarefas de hoje",
        ]
        date_keywords = ["hoje", "dia de hoje", "para hoje", "agora"]

        if not any(keyword in message_lower for keyword in agenda_keywords):
            return []

        period = "today" if any(keyword in message_lower for keyword in date_keywords) else "upcoming"
        return [
            NanoAction(
                type="check_agenda",
                data={
                    "period": period,
                    "detected": True,
                },
                confidence=0.86,
            )
        ]


class ReminderSpecialist(SpecialistBase):
    name = "reminders"

    def extract_reminder_title(self, cleaned_message: str) -> str:
        title = re.sub(
            r"(?i)\b(criar|crie|cria|adicione|registrar|registre|lembrete|lembrar|lembre[- ]?me|nao esquecer|nao me deixe esquecer|avise|agendar|agende|marcar|marque)\b",
            "",
            cleaned_message,
        ).strip(" ,.-:")
        if not title:
            return "Lembrete financeiro"

        for token in ["amanha", "hoje", "depois de amanha", "semana que vem", "mes que vem"]:
            title = re.sub(rf"(?i)\b{re.escape(token)}\b", "", title).strip(" ,.-:")

        title = re.sub(r"(?i)\b(pra mim|para mim)\b", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)\b(?:as|a|às)\s*\d{1,2}(?::\d{2}|h\d{0,2})?\b", "", title).strip(" ,.-:")
        title = re.sub(r"\b\d{1,2}h\d{0,2}\b", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)\btenho\s+(uma|um)\b", "", title).strip(" ,.-:")
        title = re.sub(r"\b\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?\b", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)^de\s+", "", title).strip(" ,.-:")
        title = re.sub(r"\s+", " ", title).strip(" ,.-:")
        return title or "Lembrete financeiro"

    def detect(self, message: str) -> List[NanoAction]:
        cleaned_message = self.clean_command_prefix(message)
        message_lower = self.normalize_text(cleaned_message)
        reminder_keywords = ["lembrar", "lembre-me", "lembrete", "nao esquecer", "avise", "agendar", "agende", "marcar", "marque"]
        agenda_context_keywords = ["reuniao", "compromisso", "consulta", "evento", "agenda"]
        agenda_query_keywords = ["tem algo", "tenho algo", "o que tenho", "o que eu tenho", "minha agenda", "meus compromissos", "agenda hoje"]
        has_intent = any(word in message_lower for word in reminder_keywords)
        has_context = any(word in message_lower for word in agenda_context_keywords)
        remind_at = self.extract_datetime(cleaned_message)

        if not has_intent and any(keyword in message_lower for keyword in agenda_query_keywords):
            return []

        if not has_intent and not (has_context and remind_at is not None):
            return []

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


class ActivitySpecialist(SpecialistBase):
    name = "activities"

    weekday_map = {
        "segunda": 0,
        "terca": 1,
        "quarta": 2,
        "quinta": 3,
        "sexta": 4,
        "sabado": 5,
        "domingo": 6,
    }

    def _extract_title(self, cleaned_message: str) -> str:
        title = re.sub(
            r"(?i)\b(registre|registrar|crie|criar|adicione|adicionar|nova|novo|uma|um|atividade|lembrete|quero|eu quero|nano)\b",
            "",
            cleaned_message,
        ).strip(" ,.-:")
        title = re.sub(r"(?i)\b(a partir de|apartir de)\b.*$", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)\btodos?\b.*$", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)\bno mesmo horario\b.*$", "", title).strip(" ,.-:")
        title = re.sub(r"(?i)\bas\s+\d{1,2}(?::\d{2}|h\d{0,2})?\b.*$", "", title).strip(" ,.-:")
        title = re.sub(r"\s+", " ", title).strip(" ,.-:")
        return title or "Atividade"

    def _extract_weekdays(self, message_lower: str) -> list[int]:
        weekdays = [
            day_number
            for day_name, day_number in self.weekday_map.items()
            if re.search(rf"\b{day_name}\b", message_lower)
        ]
        if "dia util" in message_lower or "dias uteis" in message_lower:
            return [0, 1, 2, 3, 4]
        return sorted(set(weekdays))

    def _extract_recurrence(self, message_lower: str) -> str:
        if "dias uteis" in message_lower or "todo dia util" in message_lower:
            return "weekdays"
        if "todos os dias" in message_lower or "todo dia" in message_lower:
            return "daily"
        if "toda semana" in message_lower or "semanal" in message_lower:
            return "weekly"
        weekdays = self._extract_weekdays(message_lower)
        if len(weekdays) > 1:
            return "custom"
        return "once"

    def _extract_reminder_minutes(self, message_lower: str) -> int:
        if any(token in message_lower for token in ["30 minutos antes", "meia hora antes"]):
            return 30
        if "1 hora antes" in message_lower or "uma hora antes" in message_lower:
            return 60
        return 60

    def _next_named_weekday(self, message_lower: str, hour: int, minute: int) -> Optional[datetime]:
        now = datetime.utcnow()
        for day_name, day_number in self.weekday_map.items():
            if not re.search(rf"\b{day_name}\b", message_lower):
                continue
            delta = (day_number - now.weekday()) % 7
            if delta == 0:
                delta = 7
            return (now + timedelta(days=delta)).replace(
                hour=hour,
                minute=minute,
                second=0,
                microsecond=0,
            )
        return None

    def _extract_start_at(self, cleaned_message: str) -> Optional[datetime]:
        parsed = self.extract_datetime(cleaned_message)
        if parsed:
            return parsed
        message_lower = self.normalize_text(cleaned_message)
        time_match = re.search(r"\b(?:as|a)\s*(\d{1,2})(?:[:h](\d{1,2}))?\b", message_lower)
        hour = int(time_match.group(1)) if time_match else 9
        minute = int(time_match.group(2) or 0) if time_match else 0
        if "segunda" in message_lower or "terca" in message_lower or "quarta" in message_lower or "quinta" in message_lower or "sexta" in message_lower or "sabado" in message_lower or "domingo" in message_lower:
            return self._next_named_weekday(message_lower, hour, minute)
        return None

    def detect(self, message: str) -> List[NanoAction]:
        cleaned_message = self.clean_command_prefix(message)
        message_lower = self.normalize_text(cleaned_message)
        intent_keywords = [
            "atividade",
            "rotina",
            "academia",
            "treino",
            "estudar",
            "estudo",
            "caminhada",
            "corrida",
        ]
        create_keywords = [
            "registr",
            "criar",
            "crie",
            "adicionar",
            "adicione",
            "agendar",
            "agende",
        ]
        if not any(keyword in message_lower for keyword in intent_keywords):
            return []
        if not any(keyword in message_lower for keyword in create_keywords):
            return []

        start_at = self._extract_start_at(cleaned_message)
        missing_fields = []
        assumptions = []
        if start_at is None:
            missing_fields.append("start_at")
        recurrence = self._extract_recurrence(message_lower)
        weekdays = self._extract_weekdays(message_lower)
        if recurrence == "weekdays" and not weekdays:
            weekdays = [0, 1, 2, 3, 4]
        if recurrence == "once" and not weekdays and "todo" in message_lower:
            recurrence = "daily"
            assumptions.append("Recorrencia assumida como diaria.")

        return [
            NanoAction(
                type="create_activity",
                data={
                    "title": self._extract_title(cleaned_message),
                    "description": cleaned_message,
                    "account_scope": self.detect_account_scope(message_lower),
                    "start_at": start_at.isoformat() if start_at else None,
                    "recurrence": recurrence,
                    "weekdays": weekdays,
                    "reminder_minutes_before": self._extract_reminder_minutes(message_lower),
                    "notify_web": True,
                    "notify_whatsapp": True,
                    "missing_fields": missing_fields,
                    "assumptions": assumptions,
                    "detected": True,
                },
                assumptions=assumptions,
                confidence=0.83,
            )
        ]


class PayrollSpecialist(SpecialistBase):
    name = "payroll"

    def _extract_cpf(self, text: str) -> Optional[str]:
        match = re.search(r"\b(\d{3}\.?\d{3}\.?\d{3}-?\d{2})\b", text)
        if not match:
            return None
        return match.group(1)

    def _extract_inss_percent(self, message_lower: str) -> Optional[float]:
        patterns = [
            r"inss\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*%",
            r"(\d+(?:[.,]\d+)?)\s*%\s*(?:de\s*)?inss",
        ]
        for pattern in patterns:
            match = re.search(pattern, message_lower)
            if not match:
                continue
            try:
                return float(match.group(1).replace(",", "."))
            except ValueError:
                continue
        return None

    def _extract_name(self, cleaned_message: str) -> Optional[str]:
        patterns = [
            r"nome\s+([a-zA-ZÀ-ÿ\s]{3,})",
            r"funcionario\s+([a-zA-ZÀ-ÿ\s]{3,})",
            r"colaborador\s+([a-zA-ZÀ-ÿ\s]{3,})",
        ]
        for pattern in patterns:
            match = re.search(pattern, cleaned_message, flags=re.IGNORECASE)
            if not match:
                continue
            name = match.group(1)
            name = re.split(r"\b(cpf|funcao|cargo|salario|clt|carteira|contrato|inss)\b", name, flags=re.IGNORECASE)[0]
            name = re.sub(r"\s+", " ", name).strip(" ,.-:")
            if len(name) >= 3:
                return name.title()
        return None

    def _extract_role(self, cleaned_message: str) -> Optional[str]:
        match = re.search(
            r"(?:funcao|cargo)\s+(?:de\s+)?([a-zA-ZÀ-ÿ0-9\s]{2,})",
            cleaned_message,
            flags=re.IGNORECASE,
        )
        if not match:
            return None
        role = re.split(r"\b(cpf|salario|clt|carteira|contrato|inss)\b", match.group(1), flags=re.IGNORECASE)[0]
        role = re.sub(r"\s+", " ", role).strip(" ,.-:")
        return role.title() if role else None

    def _extract_month(self, message_lower: str) -> Optional[str]:
        direct = re.search(r"\b(\d{4})-(\d{2})\b", message_lower)
        if direct:
            return f"{direct.group(1)}-{direct.group(2)}"

        slash = re.search(r"\b(\d{1,2})\/(\d{4})\b", message_lower)
        if slash:
            month = int(slash.group(1))
            if 1 <= month <= 12:
                return f"{slash.group(2)}-{month:02d}"
        return None

    def detect(self, message: str) -> List[NanoAction]:
        cleaned_message = self.clean_command_prefix(message)
        message_lower = self.normalize_text(cleaned_message)
        actions: List[NanoAction] = []

        employee_keywords = [
            "cadastrar funcionario",
            "cadastrar colaborador",
            "novo funcionario",
            "novo colaborador",
            "criar funcionario",
            "registrar funcionario",
            "registrar colaborador",
        ]
        attendance_keywords = [
            "marcar presenca",
            "registrar presenca",
            "registrar ponto",
            "marcar ponto",
            "marcar falta",
            "registrar falta",
            "funcionario faltou",
            "colaborador faltou",
        ]
        report_keywords = [
            "relatorio de presenca",
            "relatorio de falta",
            "folha de pagamento",
            "calcular folha",
            "fechamento da folha",
            "resumo da folha",
            "pagamento do mes",
            "relatorio de ponto",
        ]

        if any(keyword in message_lower for keyword in employee_keywords):
            employee_type = "contract" if any(token in message_lower for token in ["contrato", "terceirizado"]) else "clt"
            payment_cycle = "biweekly" if any(token in message_lower for token in ["quinzena", "quinzenal"]) else "monthly"
            amount = self.extract_amount(message_lower)
            data = {
                "name": self._extract_name(cleaned_message),
                "cpf": self._extract_cpf(cleaned_message),
                "role": self._extract_role(cleaned_message),
                "salary": amount,
                "employee_type": employee_type,
                "payment_cycle": payment_cycle,
                "inss_percent": self._extract_inss_percent(message_lower),
                "notes": cleaned_message,
                "detected": True,
            }
            missing_fields = [field for field in ["name", "cpf", "role", "salary"] if not data.get(field)]
            data["missing_fields"] = missing_fields
            actions.append(
                NanoAction(
                    type="create_employee",
                    data=data,
                    confidence=0.9,
                )
            )

        if any(keyword in message_lower for keyword in attendance_keywords):
            status = "absent" if any(token in message_lower for token in ["falta", "faltou", "ausente"]) else "present"
            attendance_date = self.extract_datetime(cleaned_message) or datetime.utcnow()
            employee_reference = self._extract_cpf(cleaned_message) or self._extract_name(cleaned_message)
            missing_fields = [] if employee_reference else ["employee_reference"]
            actions.append(
                NanoAction(
                    type="register_attendance",
                    data={
                        "employee_reference": employee_reference,
                        "status": status,
                        "date": attendance_date.isoformat(),
                        "notes": cleaned_message,
                        "missing_fields": missing_fields,
                        "detected": True,
                    },
                    confidence=0.88,
                )
            )

        if any(keyword in message_lower for keyword in report_keywords):
            employee_type = None
            if any(token in message_lower for token in ["carteira", "clt"]):
                employee_type = "clt"
            elif any(token in message_lower for token in ["contrato", "terceirizado"]):
                employee_type = "contract"

            payment_cycle = None
            if any(token in message_lower for token in ["quinzena", "quinzenal"]):
                payment_cycle = "biweekly"
            elif "mensal" in message_lower:
                payment_cycle = "monthly"

            actions.append(
                NanoAction(
                    type="generate_payroll_report",
                    data={
                        "month": self._extract_month(message_lower),
                        "employee_type": employee_type,
                        "payment_cycle": payment_cycle,
                        "detected": True,
                    },
                    confidence=0.86,
                )
            )

        return actions


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
            "mostrar gastos", "resumo financeiro", "resumir financeiro", "meu resultado",
            "quanto gastei", "quanto eu gastei", "quanto saiu", "quanto entrou",
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
