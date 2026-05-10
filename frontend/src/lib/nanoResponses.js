/**
 * nanoResponses.js
 * Respostas naturais e premium do Nano IA
 * Substitui frases genéricas por linguagem mais operacional e inteligente
 */

// Respostas para confirmação de ações
export const confirmationResponses = [
  'Já organizei isso.',
  'Feito. Registrado no sistema.',
  'Pronto. Anotei aqui.',
  'Considerado. Já está registrado.',
  'Capturei a informação.',
  'Anotando... Prontinho.',
  'Entendido. Já está em andamento.',
  'Registrando agora.',
  'Isso já foi anotado.',
];

// Respostas para processamento/análise
export const processingResponses = [
  'Cruzei seus dados.',
  'Estou analisando o padrão.',
  'Lendo seu histórico...',
  'Verificando contas...',
  'Processando transações...',
  'Analisando comportamento de gastos...',
  'Consultando registros...',
  'Conectando os pontos...',
  'Processando informações financeiras...',
];

// Respostas para descobertas/insights
export const insightResponses = [
  'Encontrei um padrão importante.',
  'Percebi um aumento nos gastos.',
  'Seu saldo melhorou essa semana.',
  'Detectei uma oportunidade.',
  'Isso está acima da média.',
  'Vejo uma tendência aqui.',
  'Cruzei os dados e achei isso interessante.',
  'Analisando... Achei relevante.',
  'Observe este padrão.',
  'Isso merece atenção.',
];

// Respostas para ações completadas
export const completionResponses = [
  'Missão cumprida.',
  'Finalizado com sucesso.',
  'Tudo pronto.',
  'Operação concluída.',
  'Registrado e processado.',
  'Já está efetuado.',
  'Confirmado no sistema.',
  'Missão realizada.',
  'Ação executada.',
];

// Respostas para alertas/avisos
export const alertResponses = [
  'Você possui 2 vencimentos próximos.',
  'Seu maior gasto hoje foi combustível.',
  'Saldo caiu 12% esta semana.',
  'Existe uma cobrança pendente.',
  'Despesa acima do normal detectada.',
  'Atividade incomum notada.',
  'Recomendo revisar este gasto.',
  'Atenção: limite se aproximando.',
];

// Respostas para recomendações
export const recommendationResponses = [
  'Recomendo criar uma automação.',
  'Poderia agendar este pagamento?',
  'Essa despesa se repete? Automatize.',
  'Vi oportunidade de economizar aqui.',
  'Sugiro acompanhar essa categoria.',
  'Pode valer a pena agrupar esses pagamentos.',
  'Encontrei possibilidade de otimização.',
];

// Respostas para ações não compreendidas
export const clarificationResponses = [
  'Pode reformular? Não consegui captar bem.',
  'Preciso de mais detalhes para ajudar.',
  'Deixe eu confirmar se entendi...',
  'Desculpa, repete essa informação?',
  'Não capturei corretamente, tenta novamente?',
];

// Respostas para contexto de Estado (status da IA)
export const stateResponses = {
  idle: 'Pronto para ouvir',
  listening: 'Capturando áudio...',
  thinking: 'Processando comando...',
  executing: 'Executando ações...',
  speaking: 'Respondendo...',
};

// Exemplos de ações em execução
export const executionActions = [
  'cruzando despesas',
  'lendo agenda',
  'verificando contas',
  'analisando hábitos',
  'processando automação',
  'consultando histórico',
  'validando transações',
  'atualizando dados',
  'sincronizando informações',
  'processando boletos',
  'verificando saldo',
  'analisando padrões',
];

/**
 * Seleciona uma resposta aleatória de um array
 * @param {array} responses - Array de respostas
 * @returns {string} Resposta selecionada
 */
export const getRandomResponse = (responses) => {
  return responses[Math.floor(Math.random() * responses.length)];
};

/**
 * Obtém resposta baseada em tipo de ação
 * @param {string} actionType - Tipo de ação (confirmation, processing, insight, completion, alert, etc)
 * @returns {string} Resposta apropriada
 */
export const getResponseByType = (actionType) => {
  const responseMap = {
    confirmation: confirmationResponses,
    processing: processingResponses,
    insight: insightResponses,
    completion: completionResponses,
    alert: alertResponses,
    recommendation: recommendationResponses,
    clarification: clarificationResponses,
  };

  const responses = responseMap[actionType] || confirmationResponses;
  return getRandomResponse(responses);
};

/**
 * Formata resposta com contexto
 * @param {string} baseResponse - Resposta base
 * @param {object} context - Contexto (usuario, valor, etc)
 * @returns {string} Resposta formatada
 */
export const formatResponse = (baseResponse, context = {}) => {
  let response = baseResponse;

  // Substitui placeholders
  if (context.name) {
    response = response.replace('{name}', context.name);
  }
  if (context.value) {
    response = response.replace('{value}', context.value);
  }
  if (context.category) {
    response = response.replace('{category}', context.category);
  }
  if (context.date) {
    response = response.replace('{date}', context.date);
  }

  return response;
};

/**
 * Gera lista de ações para execução visual
 * @param {number} count - Número de ações
 * @returns {array} Lista de ações
 */
export const generateExecutionActions = (count = 5) => {
  const actions = [];
  const availableActions = [...executionActions];
  
  for (let i = 0; i < count && availableActions.length > 0; i++) {
    const idx = Math.floor(Math.random() * availableActions.length);
    actions.push({
      id: `action-${i}`,
      label: availableActions[idx],
      status: 'pending',
      timestamp: null,
    });
    availableActions.splice(idx, 1);
  }

  return actions;
};

export default {
  confirmationResponses,
  processingResponses,
  insightResponses,
  completionResponses,
  alertResponses,
  recommendationResponses,
  clarificationResponses,
  stateResponses,
  executionActions,
  getRandomResponse,
  getResponseByType,
  formatResponse,
  generateExecutionActions,
};
