export const alfredSuggestedCommands = [
  'Criar uma despesa',
  'Registrar pagamento Pix',
  'Adicionar conta da empresa',
  'Criar lembrete de vencimento',
  'Ver gastos do mes',
  'Separar despesas pessoais e empresariais',
  'Analisar meu fluxo de caixa'
];

export const alfredQuickPrompts = {
  'Criar uma despesa': 'Criar despesa de 89 reais em alimentacao',
  'Registrar pagamento Pix': 'Registrar pagamento pix para fornecedor',
  'Adicionar conta da empresa': 'Criar conta da empresa de internet dia 10',
  'Criar lembrete de vencimento': 'Lembrar vencimento do cartao dia 10',
  'Ver gastos do mes': 'Mostrar gastos da empresa este mes',
  'Separar despesas pessoais e empresariais': 'Separar despesas pessoais e empresariais',
  'Analisar meu fluxo de caixa': 'Analisar meu fluxo de caixa'
};

export const alfredVoiceStateCopy = {
  idle: {
    label: 'Pronto para ouvir',
    description: 'Ative a voz ou digite um comando financeiro.'
  },
  listening: {
    label: 'Ouvindo...',
    description: 'Estou captando sua fala agora.'
  },
  processing: {
    label: 'Processando...',
    description: 'Entendendo o pedido e organizando a melhor resposta.'
  },
  speaking: {
    label: 'Respondendo...',
    description: 'O Alfred esta explicando o que entendeu e o que fez.'
  },
  error: {
    label: 'Falha de voz',
    description: 'Algo saiu do esperado. Voce ainda pode usar o texto.'
  }
};

export const alfredTheme = {
  shell:
    'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(127,29,29,0.26),_transparent_28%),linear-gradient(180deg,_#050101_0%,_#0b0204_42%,_#120406_100%)] text-white',
  glass:
    'border border-red-500/14 bg-white/[0.035] backdrop-blur-xl shadow-[0_24px_80px_rgba(20,2,6,0.52)]',
  softPanel:
    'border border-red-500/10 bg-black/28 backdrop-blur-lg shadow-[0_20px_60px_rgba(20,2,6,0.4)]',
  accentChip:
    'border-red-400/25 bg-red-500/10 text-red-100',
  subtleChip:
    'border-white/10 bg-white/[0.04] text-zinc-300'
};
