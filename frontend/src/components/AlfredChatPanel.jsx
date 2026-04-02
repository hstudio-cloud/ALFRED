import React, { useEffect, useMemo, useRef } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback } from './ui/avatar';
import { AlertCircle, CheckCircle2, Mic, MicOff, Send, Sparkles, Square, Volume2 } from 'lucide-react';
import { alfredTheme } from '../lib/alfredTheme';

const formatTimestamp = (value) => {
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

const buildAssistantLog = (message) => {
  const executedActions = message?.metadata?.executed_actions || [];
  const plannedActions = message?.metadata?.actions || [];

  if (executedActions.length) {
    return {
      mode: 'executed',
      title: 'Executado pelo Alfred',
      items: executedActions.map((action) => ({
        title: action.message || action.type || 'Ação executada',
        assumptions: action.assumptions || []
      }))
    };
  }

  if (plannedActions.length) {
    return {
      mode: 'pending',
      title: 'Aguardando mais detalhes',
      items: plannedActions.map((action) => ({
        title: action.type === 'create_transaction'
          ? 'Preparando lançamento financeiro'
          : action.type === 'create_bill'
            ? 'Preparando conta'
            : action.type === 'create_reminder'
              ? 'Preparando lembrete'
              : 'Preparando ação',
        assumptions: action.data?.assumptions || []
      }))
    };
  }

  return {
    mode: 'voice',
    title: 'Interação por voz',
    items: [
      {
        title: 'Alfred respondeu por voz nesta etapa.',
        assumptions: []
      }
    ]
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
  voiceSupported,
  isWakeArmed,
  error,
  onStartVoice,
  onStopVoice,
  onInterrupt
}) => {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [chatHistory, isListening, isProcessing, isSpeaking, partialTranscript]);

  const liveStatus = useMemo(() => {
    if (isSpeaking) {
      return {
        label: 'Alfred está respondendo por voz',
        tone: 'border-cyan-400/20 bg-cyan-400/10 text-cyan-100'
      };
    }

    if (isProcessing) {
      return {
        label: 'Alfred está pensando...',
        tone: 'border-white/10 bg-white/[0.04] text-slate-200'
      };
    }

    if (isListening || isWakeArmed) {
      return {
        label: 'Alfred está ouvindo...',
        tone: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100'
      };
    }

    return {
      label: 'Pronto para um novo comando financeiro',
      tone: 'border-white/10 bg-white/[0.03] text-slate-300'
    };
  }, [isListening, isProcessing, isSpeaking, isWakeArmed]);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <section className={`flex min-h-[740px] flex-col rounded-[30px] ${alfredTheme.glass}`}>
      <div className="border-b border-white/8 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Chat financeiro</p>
            <h2 className="mt-2 text-lg font-semibold text-white">Conversa operacional</h2>
          </div>

          <Badge variant="outline" className={`${liveStatus.tone} rounded-full px-3 py-1 text-[11px] font-medium`}>
            {liveStatus.label}
          </Badge>
        </div>

        {(partialTranscript || finalTranscript) && (
          <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-50">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-cyan-200/70">
              <Sparkles className="h-3.5 w-3.5" />
              transcrição ao vivo
            </div>
            <p className="mt-2 leading-7 text-cyan-50/90">{partialTranscript || finalTranscript}</p>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-400/15 bg-rose-400/8 px-4 py-3 text-sm text-rose-50">
            <div className="text-[11px] uppercase tracking-[0.22em] text-rose-200/80">
              status do assistente
            </div>
            <p className="mt-2 leading-7 text-rose-50/90">
              O Alfred encontrou uma falha temporária. O chat por texto continua disponível e a voz pode voltar no próximo comando.
            </p>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="h-full overflow-y-auto pr-2">
          <div className="space-y-4">
            {chatHistory.map((item, index) => {
              const isUser = item.role === 'user';
              const label = isUser ? 'Você' : 'Alfred';
              const assistantLog = !isUser ? buildAssistantLog(item) : null;

              return (
                <div
                  key={item.id || `${item.role}-${index}-${item.created_at || ''}`}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex max-w-[92%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isUser && (
                      <Avatar className="mt-1 h-9 w-9 border border-cyan-400/20 bg-cyan-400/10">
                        <AvatarFallback className="bg-transparent text-xs font-semibold text-cyan-100">
                          AF
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className={`space-y-2 ${isUser ? 'items-end text-right' : 'items-start text-left'}`}>
                      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        <span>{label}</span>
                        <span>{formatTimestamp(item.created_at)}</span>
                      </div>

                      <div
                        className={`rounded-[24px] px-4 py-3 text-sm leading-7 shadow-[0_16px_40px_rgba(2,8,23,0.24)] ${
                          isUser
                            ? 'bg-cyan-400/14 text-slate-50 ring-1 ring-cyan-400/18'
                            : 'bg-white/[0.04] text-slate-200 ring-1 ring-white/8'
                        }`}
                      >
                        {isUser ? (
                          item.content
                        ) : (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-400">
                              {assistantLog.mode === 'executed' ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                              ) : assistantLog.mode === 'pending' ? (
                                <AlertCircle className="h-3.5 w-3.5 text-amber-300" />
                              ) : (
                                <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
                              )}
                              <span>{assistantLog.title}</span>
                            </div>

                            <div className="space-y-2">
                              {assistantLog.items.map((entry, entryIndex) => (
                                <div key={`${entry.title}-${entryIndex}`} className="rounded-2xl border border-white/6 bg-black/10 px-3 py-2.5">
                                  <p className="text-sm leading-6 text-slate-100">{entry.title}</p>
                                  {entry.assumptions?.length > 0 && (
                                    <div className="mt-2 space-y-1 text-xs leading-5 text-slate-400">
                                      {entry.assumptions.map((assumption, assumptionIndex) => (
                                        <p key={`${assumption}-${assumptionIndex}`}>- {assumption}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="flex max-w-[90%] gap-3">
                  <Avatar className="mt-1 h-9 w-9 border border-cyan-400/20 bg-cyan-400/10">
                    <AvatarFallback className="bg-transparent text-xs font-semibold text-cyan-100">
                      AF
                    </AvatarFallback>
                  </Avatar>

                  <div className="rounded-[24px] bg-white/[0.04] px-4 py-3 ring-1 ring-white/8">
                    <div className="flex items-center gap-2 text-sm text-slate-200">
                      <span>Alfred está pensando...</span>
                      <span className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300 [animation-delay:-0.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 px-4 pb-4 pt-4">
        <div className="rounded-[26px] border border-white/10 bg-slate-950/70 p-3 shadow-[0_24px_70px_rgba(2,8,23,0.32)]">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={4}
            placeholder="Digite ou fale um comando financeiro"
            className="min-h-[110px] resize-none border-0 bg-transparent px-1 text-sm leading-7 text-white placeholder:text-slate-500 focus-visible:ring-0"
          />

          <div className="mt-3 flex flex-col gap-3 border-t border-white/8 pt-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs text-slate-400">
                O chat funciona como histórico do que foi executado. As perguntas e interações do Alfred devem acontecer por voz.
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Enter envia • Shift + Enter quebra linha
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {voiceSupported && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={isWakeArmed ? onStopVoice : onStartVoice}
                  className={`rounded-full border-white/10 px-4 ${
                    isWakeArmed
                      ? 'bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/18'
                      : 'bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]'
                  }`}
                >
                  {isWakeArmed ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                  {isWakeArmed ? 'Desativar voz' : 'Ativar voz'}
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
                  Interromper voz
                </Button>
              )}

              <Button
                type="button"
                onClick={onSend}
                disabled={isProcessing}
                className="rounded-full bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300"
              >
                {isSpeaking ? <Volume2 className="mr-2 h-4 w-4" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar texto
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AlfredChatPanel;
