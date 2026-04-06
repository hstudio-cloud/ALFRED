import React, { useEffect, useMemo, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import AIVoiceVisualizer from './AIVoiceVisualizer';
import {
  AlertCircle,
  Bell,
  CircleDollarSign,
  Mic,
  MicOff,
  Send,
  Square
} from 'lucide-react';
import { alfredQuickPrompts } from '../lib/alfredTheme';

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
};

const formatTime = (value) => {
  if (!value) return '';

  try {
    return new Date(value).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return '';
  }
};

const compactAssistantCopy = (message) => {
  const raw = (message?.content || '').trim();
  if (!raw) return '';
  return raw.split('\n\n')[0]?.trim() || raw;
};

const actionMeta = {
  create_transaction: {
    label: 'Movimentacoes',
    icon: CircleDollarSign,
    tint: 'bg-rose-500/[0.08] border-rose-400/12',
    detailTint: 'text-rose-200'
  },
  create_bill: {
    label: 'Contas',
    icon: CircleDollarSign,
    tint: 'bg-orange-500/[0.08] border-orange-400/12',
    detailTint: 'text-orange-200'
  },
  create_reminder: {
    label: 'Lembretes',
    icon: Bell,
    tint: 'bg-amber-500/[0.08] border-amber-400/12',
    detailTint: 'text-amber-200'
  }
};

const describeAction = (action) => {
  const payload = action?.payload || {};
  const amount = formatCurrency(payload.amount);

  if (action.type === 'create_transaction') {
    return {
      title: payload.description || payload.category || 'Nova movimentacao',
      details: [payload.account_scope === 'business' ? 'Empresa' : 'Pessoal', payload.payment_method, amount]
        .filter(Boolean)
        .join('  |  ')
    };
  }

  if (action.type === 'create_bill') {
    return {
      title: payload.description || 'Conta cadastrada',
      details: [payload.due_date, payload.status, amount].filter(Boolean).join('  |  ')
    };
  }

  if (action.type === 'create_reminder') {
    return {
      title: payload.title || payload.description || 'Lembrete criado',
      details: [payload.remind_at || payload.due_date, payload.priority].filter(Boolean).join('  |  ')
    };
  }

  return {
    title: action.message || 'Atualizacao',
    details: ''
  };
};

const buildActionGroups = (chatHistory) => {
  const actions = chatHistory
    .filter((item) => item.role === 'assistant')
    .flatMap((item) => item.metadata?.executed_actions || [])
    .filter((action) => actionMeta[action.type])
    .slice(-5)
    .reverse();

  const grouped = new Map();

  actions.forEach((action) => {
    const meta = actionMeta[action.type];
    if (!grouped.has(action.type)) {
      grouped.set(action.type, {
        key: action.type,
        meta,
        items: []
      });
    }

    grouped.get(action.type).items.push(describeAction(action));
  });

  return Array.from(grouped.values()).slice(0, 3);
};

const buildAssistantDigest = (message) => {
  const actions = message?.metadata?.executed_actions || [];
  const raw = (message?.content || '').trim();

  const intro =
    compactAssistantCopy(message) ||
    'Tudo pronto. Organizei seu pedido e atualizei o panorama.';

  const bullets = actions
    .map((action) => {
      const description = describeAction(action);
      return description.details
        ? `${description.title} - ${description.details}`
        : description.title;
    })
    .slice(0, 4);

  return {
    intro,
    bullets,
    closing:
      raw.includes('?')
        ? raw.split('?').pop()?.trim()
        : 'Se quiser, sigo com o proximo ajuste.'
  };
};

const AlfredChatPanel = ({
  chatHistory,
  message,
  setMessage,
  onSend,
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
  currentLevel,
  voiceState,
  voiceStatus,
  voiceSupported,
  isWakeArmed,
  isAwaitingVoiceCommand,
  error,
  onQuickPrompt,
  onStartVoice,
  onStopVoice,
  onInterrupt
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatHistory, isProcessing, isSpeaking]);

  const transcriptCopy = partialTranscript || finalTranscript;
  const latestAssistant = useMemo(
    () => [...chatHistory].reverse().find((item) => item.role === 'assistant'),
    [chatHistory]
  );
  const latestUser = useMemo(
    () => [...chatHistory].reverse().find((item) => item.role === 'user'),
    [chatHistory]
  );
  const actionGroups = useMemo(() => buildActionGroups(chatHistory), [chatHistory]);
  const assistantDigest = useMemo(() => buildAssistantDigest(latestAssistant), [latestAssistant]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <section className="relative min-h-[560px]">
      <div className="grid gap-10 lg:grid-cols-[440px_minmax(0,1fr)]">
        <div className="space-y-3">
          {(isProcessing || transcriptCopy || latestUser) && (
            <div className="inline-flex max-w-full rounded-[18px] border border-red-400/10 bg-red-500/[0.05] px-3.5 py-2.5 text-[13px] text-red-50 shadow-[0_14px_32px_rgba(127,29,29,0.18)]">
              <span className="truncate">
                {isProcessing
                  ? 'Entendido. Buscando suas informacoes...'
                  : transcriptCopy || latestUser?.content || 'Nano aguardando seu comando.'}
              </span>
            </div>
          )}

          {!latestAssistant && !isProcessing ? (
            <>
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[0_18px_42px_rgba(2,8,23,0.18)]">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Nano</p>
                <h3 className="mt-3 text-[24px] font-medium text-white">Como posso ajudar?</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Registre gastos, contas e lembretes com respostas mais naturais.
                </p>
              </div>

              <div className="space-y-2">
                {Object.keys(alfredQuickPrompts).slice(0, 4).map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => onQuickPrompt?.(prompt)}
                    className="w-full rounded-[18px] border border-white/8 bg-white/[0.03] px-4 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/[0.06]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              {actionGroups.map((group) => {
                const Icon = group.meta.icon;
                return (
                  <div
                    key={group.key}
                    className={`rounded-[18px] border p-3.5 shadow-[0_14px_34px_rgba(2,8,23,0.18)] ${group.meta.tint}`}
                  >
                    <div className="mb-2.5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-[14px] border border-white/8 bg-black/20">
                        <Icon className={`h-4 w-4 ${group.meta.detailTint}`} />
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-white">{group.meta.label}</p>
                        <p className="text-xs text-slate-500">{group.items.length} item{group.items.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {group.items.slice(0, 3).map((item, index) => (
                        <div
                          key={`${group.key}-${index}`}
                          className="rounded-[16px] border border-white/8 bg-white/[0.04] px-3 py-2.5"
                        >
                          <p className="text-[13px] font-medium text-slate-100">{item.title}</p>
                          {item.details && (
                            <p className="mt-1 text-[11px] leading-5 text-slate-400">{item.details}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-400/12 bg-rose-500/[0.06] px-4 py-3 text-sm text-rose-50">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-200/80" />
              <div>
                <p className="font-medium text-rose-100">Instabilidade de voz</p>
                <p className="mt-1 leading-6 text-rose-100/80">
                  Voce pode continuar por texto ou tentar o proximo comando por voz.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="w-full max-w-[420px]">
            <div className="mx-auto w-full max-w-[230px]">
              <AIVoiceVisualizer mode={voiceState === 'error' ? 'idle' : voiceState} amplitude={currentLevel} />
            </div>

            <div className="mt-8 text-center">
              <p className="text-sm leading-7 text-slate-400">
                {voiceStatus || 'Ative a voz para conversar com o Nano.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {latestAssistant && (
        <div className="mx-auto mt-10 max-w-[520px] rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-4 shadow-[0_18px_42px_rgba(2,8,23,0.22)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
            Nano  |  {formatTime(latestAssistant?.created_at)}
          </p>
          <p className="mt-3 text-[13px] leading-6 text-slate-100">
            {assistantDigest.intro || 'Tudo pronto.'}
          </p>

          {assistantDigest.bullets.length > 0 && (
            <div className="mt-3 space-y-2">
              {assistantDigest.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-3 text-[13px] text-slate-300">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-red-300" />
                  <span className="leading-6">{bullet}</span>
                </div>
              ))}
            </div>
          )}

          {assistantDigest.closing && (
            <p className="mt-3 text-[13px] leading-6 text-slate-400">{assistantDigest.closing}</p>
          )}
        </div>
      )}

      <div className="mx-auto mt-12 max-w-[860px] rounded-[28px] border border-white/8 bg-slate-950/72 px-4 py-3 shadow-[0_22px_58px_rgba(2,8,23,0.28)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/14 text-red-200">
              <Mic className="h-4 w-4" />
            </div>
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua mensagem..."
              className="h-12 rounded-full border-0 bg-transparent px-0 text-sm text-white placeholder:text-slate-500 focus-visible:ring-0"
            />
          </div>

          <div className="flex items-center justify-between gap-3 lg:justify-end">
            <div className="flex items-center gap-2">
              {voiceSupported && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={isWakeArmed ? onStopVoice : onStartVoice}
                  className={`rounded-full border-white/10 px-4 ${
                    isWakeArmed
                      ? 'bg-red-500/12 text-red-100 hover:bg-red-500/18'
                      : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  {isWakeArmed ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isWakeArmed ? 'Voz ativa' : 'Ativar voz'}
                </Button>
              )}

              {isSpeaking && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onInterrupt}
                  className="rounded-full border-rose-400/18 bg-rose-400/10 px-4 text-rose-100 hover:bg-rose-400/18"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Parar
                </Button>
              )}
            </div>

            <Button
              type="button"
              onClick={onSend}
              disabled={isProcessing}
              className="rounded-full bg-red-500 px-5 text-white hover:bg-red-400"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-end">
          <p className="text-[11px] text-slate-500">
            {isAwaitingVoiceCommand ? 'Pode falar.' : isListening ? 'Escuta ativa.' : 'Pronto.'}
          </p>
        </div>
      </div>

      <div ref={messagesEndRef} />
    </section>
  );
};

export default AlfredChatPanel;
