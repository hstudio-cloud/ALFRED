from emergentintegrations.llm.chat import LlmChat, UserMessage
import logging


class AlfredAI:
    """Alfred AI Assistant - Processa comandos em linguagem natural"""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.system_message = """Você é Alfred, um assistente inteligente para pagamentos, gestão financeira e rotina operacional.

Sua função é ajudar o usuário a controlar o dia a dia financeiro com conversas naturais.

Você pode:
- Registrar receitas e despesas
- Identificar se um gasto é pessoal ou da empresa
- Sugerir categorias financeiras com base na descrição
- Reconhecer formas de pagamento como Pix, cartão, boleto, transferência e dinheiro
- Criar lembretes, tarefas e acompanhamentos relacionados a cobranças, contas e compromissos
- Analisar dados e fornecer insights claros em português

Quando o usuário pedir para criar algo, você deve:
1. Confirmar rapidamente o que entendeu
2. Destacar o que foi classificado, como tipo, categoria, método de pagamento, pessoal ou empresa e prazo
3. Responder de forma amigável, objetiva e útil

Se faltar algum detalhe importante, faça uma suposição razoável e deixe isso explícito."""

    async def process_message(self, user_id: str, message: str) -> dict:
        """Processa uma mensagem do usuário e retorna a resposta + ações"""

        try:
            chat = LlmChat(
                api_key=self.api_key,
                session_id=f"user_{user_id}",
                system_message=self.system_message
            ).with_model("openai", "gpt-5.1")

            user_message = UserMessage(text=message)
            response = await chat.send_message(user_message)

            if response is None:
                response = "Desculpe, não consegui processar sua mensagem no momento."
            elif not isinstance(response, str):
                response = str(response) if response else "Resposta inválida recebida."

            actions = self._detect_actions(message)

            return {
                "response": response,
                "actions": actions
            }
        except Exception as e:
            logger = logging.getLogger(__name__)
            logger.error(f"Error in AI processing: {e}")

            actions = self._detect_actions(message)

            return {
                "response": "Desculpe, houve um problema ao processar sua mensagem. Mesmo assim, consegui detectar algumas ações úteis.",
                "actions": actions
            }

    def _detect_payment_method(self, message_lower: str) -> str:
        if "pix" in message_lower:
            return "pix"
        if any(word in message_lower for word in ["cartão", "cartao", "crédito", "credito", "débito", "debito"]):
            return "card"
        if "boleto" in message_lower:
            return "boleto"
        if any(word in message_lower for word in ["transferência", "transferencia", "ted", "doc"]):
            return "transfer"
        if any(word in message_lower for word in ["dinheiro", "espécie", "especie"]):
            return "cash"
        return "other"

    def _detect_account_scope(self, message_lower: str) -> str:
        if any(word in message_lower for word in ["empresa", "pj", "cnpj", "negócio", "negocio", "corporativo"]):
            return "business"
        if any(word in message_lower for word in ["pessoal", "pf", "casa", "família", "familia"]):
            return "personal"
        return "personal"

    def _detect_category(self, message_lower: str) -> str:
        category_map = {
            "Alimentação": ["mercado", "restaurante", "lanche", "ifood", "comida", "supermercado"],
            "Transporte": ["uber", "99", "gasolina", "combustível", "combustivel", "ônibus", "onibus", "transporte"],
            "Moradia": ["aluguel", "condomínio", "condominio", "luz", "água", "agua", "internet"],
            "Equipe": ["folha", "salário", "salario", "freelancer", "colaborador", "equipe"],
            "Impostos": ["imposto", "tributo", "das", "simples nacional", "taxa"],
            "Marketing": ["anúncio", "anuncio", "tráfego", "trafego", "meta ads", "google ads", "marketing"],
            "Vendas": ["cliente", "venda", "fatura", "cobrança", "cobranca", "recebimento"],
            "Assinaturas": ["assinatura", "software", "saas", "mensalidade", "plano"],
            "Saúde": ["farmácia", "farmacia", "médico", "medico", "consulta", "exame"],
        }

        for category, keywords in category_map.items():
            if any(word in message_lower for word in keywords):
                return category
        return "Geral"

    def _detect_actions(self, message: str) -> list:
        """Detecta ações que devem ser executadas baseado na mensagem"""
        message_lower = message.lower()
        actions = []

        if any(word in message_lower for word in ["tarefa", "fazer", "preciso", "tenho que", "devo"]):
            priority = "medium"
            if any(word in message_lower for word in ["urgente", "importante", "prioritário", "prioritario"]):
                priority = "high"
            elif any(word in message_lower for word in ["depois", "quando puder"]):
                priority = "low"

            actions.append({
                "type": "create_task",
                "data": {
                    "priority": priority,
                    "detected": True
                }
            })

        if any(word in message_lower for word in ["hábito", "habito", "todo dia", "diariamente", "rotina"]):
            actions.append({
                "type": "create_habit",
                "data": {
                    "frequency": "daily",
                    "detected": True
                }
            })

        if any(word in message_lower for word in ["lembrar", "lembre-me", "não esquecer", "nao esquecer", "avise"]):
            actions.append({
                "type": "create_reminder",
                "data": {
                    "detected": True
                }
            })

        transaction_keywords = ["gastar", "gastei", "comprei", "paguei", "despesa", "recebi", "ganhei", "receita", "salário", "salario"]
        if any(word in message_lower for word in transaction_keywords):
            transaction_type = "expense"
            if any(word in message_lower for word in ["recebi", "ganhei", "receita", "salário", "salario"]):
                transaction_type = "income"

            actions.append({
                "type": "create_transaction",
                "data": {
                    "type": transaction_type,
                    "category": self._detect_category(message_lower),
                    "payment_method": self._detect_payment_method(message_lower),
                    "account_scope": self._detect_account_scope(message_lower),
                    "detected": True
                }
            })

        return actions
