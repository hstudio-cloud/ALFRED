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
    'min-h-screen bg-[radial-gradient(circle_at_top,_rgba(8,145,178,0.18),_transparent_26%),linear-gradient(180deg,_#04111d_0%,_#081521_48%,_#020817_100%)] text-white',
  glass:
    'border border-white/10 bg-white/[0.04] backdrop-blur-xl shadow-[0_24px_80px_rgba(2,8,23,0.45)]',
  softPanel:
    'border border-white/8 bg-slate-950/45 backdrop-blur-lg shadow-[0_20px_60px_rgba(2,8,23,0.32)]',
  accentChip:
    'border-cyan-400/25 bg-cyan-400/10 text-cyan-100',
  subtleChip:
    'border-white/10 bg-white/[0.04] text-slate-300'
};
