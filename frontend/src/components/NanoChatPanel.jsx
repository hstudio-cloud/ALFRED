import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUp,
  Mic,
  MicOff,
  Sparkles,
  Square,
  X,
} from "lucide-react";

import { nanoQuickPromptMap, nanoQuickPrompts } from "../lib/nanoTheme";
import NanoCoreAnimation from "./NanoCoreAnimation";
import NanoExecutionPanel from "./NanoExecutionPanel";
import NanoMark from "./NanoMark";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

const formatTime = (value) => {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const resolveLiveStatus = ({
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
}) => {
  if (isProcessing) return "Entendido. Organizando seu pedido agora...";
  if (isSpeaking) return "Nano esta respondendo por voz.";
  if (partialTranscript || finalTranscript) {
    return partialTranscript || finalTranscript;
  }
  if (isListening) return "Nano esta ouvindo...";
  return null;
};

const buildNanoState = ({
  isListening,
  isProcessing,
  isSpeaking,
  voiceState,
  responsePulseActive,
  processingElapsed,
}) => {
  if (voiceState === "speaking") return "speaking";
  if (isSpeaking || responsePulseActive) return "speaking";
  if (voiceState === "processing") {
    return processingElapsed < 1400 ? "thinking" : "executing";
  }
  if (isProcessing && processingElapsed < 1400) return "thinking";
  if (isProcessing) return "executing";
  if (isListening) return "idle";
  return "idle";
};

const getLatestEntry = (chatHistory, role) =>
  [...chatHistory].reverse().find((entry) => entry?.role === role);

const NanoChatPanel = ({
  chatHistory,
  message,
  setMessage,
  userName,
  onSend,
  onQuickPrompt,
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
  currentLevel,
  voiceState,
  voiceStatus,
  isWakeArmed,
  voiceSupported,
  error,
  chatError,
  onStartVoice,
  onStopVoice,
  onCancelVoiceCommand,
  onInterrupt,
}) => {
  const scrollRef = useRef(null);
  const lastAssistantMessageIdRef = useRef(null);
  const overlayTimerRef = useRef(null);
  const processingStartedAtRef = useRef(0);
  const [responsePulseActive, setResponsePulseActive] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);

  const latestAssistant = useMemo(
    () => getLatestEntry(chatHistory, "assistant"),
    [chatHistory],
  );
  const latestUser = useMemo(() => getLatestEntry(chatHistory, "user"), [chatHistory]);

  const liveStatus = useMemo(
    () =>
      resolveLiveStatus({
        isListening,
        isProcessing,
        isSpeaking,
        partialTranscript,
        finalTranscript,
      }),
    [isListening, isProcessing, isSpeaking, partialTranscript, finalTranscript],
  );

  const nanoState = useMemo(
    () =>
      buildNanoState({
        isListening,
        isProcessing,
        isSpeaking,
        voiceState,
        responsePulseActive,
        processingElapsed,
      }),
    [
      isListening,
      isProcessing,
      isSpeaking,
      voiceState,
      processingElapsed,
      responsePulseActive,
    ],
  );

  const shouldShowOverlay =
    nanoState === "thinking" ||
    nanoState === "executing" ||
    nanoState === "speaking";
  const shouldShowExecutionPanel = shouldShowOverlay;

  const showMobileCore =
    nanoState !== "idle" || chatHistory.length === 0 || isWakeArmed || isListening;

  const liveTranscript = (partialTranscript || finalTranscript || "").trim();
  const voiceErrorDetail = error?.message || error?.error || "";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, liveStatus]);

  useEffect(() => {
    const lastAssistantMessage = latestAssistant;

    if (!lastAssistantMessage?.id) return;
    if (lastAssistantMessage.id === lastAssistantMessageIdRef.current) return;

    lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    setResponsePulseActive(true);

    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
    }

    overlayTimerRef.current = setTimeout(() => {
      setResponsePulseActive(false);
      overlayTimerRef.current = null;
    }, 2200);
  }, [latestAssistant]);

  useEffect(() => {
    if (!isProcessing) {
      processingStartedAtRef.current = 0;
      setProcessingElapsed(0);
      return undefined;
    }

    if (!processingStartedAtRef.current) {
      processingStartedAtRef.current = Date.now();
    }

    const interval = window.setInterval(() => {
      setProcessingElapsed(Date.now() - processingStartedAtRef.current);
    }, 120);

    return () => window.clearInterval(interval);
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <style>{`
        @keyframes nano-message-enter {
          0% { opacity: 0; transform: translateY(14px) scale(0.985); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes nano-grid-float {
          0% { transform: translate3d(0,0,0); }
          50% { transform: translate3d(-1.5%,1%,0); }
          100% { transform: translate3d(0,0,0); }
        }
        .nano-premium-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }
        .nano-premium-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .nano-premium-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .nano-premium-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
        }
        .nano-premium-shell {
          background:
            radial-gradient(circle at 18% 16%, rgba(255, 42, 42, 0.12), transparent 22%),
            radial-gradient(circle at 78% 12%, rgba(255, 42, 42, 0.08), transparent 22%),
            radial-gradient(circle at 62% 76%, rgba(120, 10, 10, 0.16), transparent 26%),
            linear-gradient(180deg, rgba(8, 5, 7, 0.98) 0%, rgba(9, 6, 8, 0.96) 100%);
        }
        .nano-premium-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(circle at 14% 22%, rgba(255,255,255,0.12) 0 1px, transparent 2px),
            radial-gradient(circle at 38% 12%, rgba(255,255,255,0.08) 0 1px, transparent 2px),
            radial-gradient(circle at 82% 28%, rgba(255,255,255,0.09) 0 1px, transparent 2px),
            radial-gradient(circle at 64% 74%, rgba(255,255,255,0.08) 0 1px, transparent 2px),
            radial-gradient(circle at 18% 76%, rgba(255,255,255,0.07) 0 1px, transparent 2px);
          opacity: 0.3;
          animation: nano-grid-float 16s ease-in-out infinite;
          pointer-events: none;
        }
        .nano-message-enter {
          animation: nano-message-enter 360ms cubic-bezier(0.22, 1, 0.36, 1);
        }
      `}</style>

      <div className="nano-premium-shell relative flex h-full min-h-0 overflow-hidden rounded-[30px] shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
        <div className="relative z-10 h-full min-h-0 w-full">
          <div className="relative flex min-h-0 h-full flex-col overflow-hidden">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/2 top-[18%] hidden -translate-x-1/2 lg:block">
                <NanoCoreAnimation
                  nanoState="idle"
                  amplitude={currentLevel}
                  className="opacity-40"
                />
              </div>
            </div>

            <div className="relative z-10 flex min-h-0 flex-1 flex-col">
              <div
                className={`shrink-0 px-5 pb-3 pt-5 transition-all duration-500 md:px-8 md:pb-4 md:pt-7 ${
                  shouldShowExecutionPanel ? "lg:pr-[26rem]" : ""
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.26em] text-zinc-600">
                      Assistente ativo
                    </p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-[34px]">
                      Boa tarde, {userName || "Heitor"}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">
                      O Nano continua usando a mesma logica atual. Aqui ele so
                      aparece com uma camada operacional mais viva para
                      acompanhar pensamento, resposta e execucao.
                    </p>
                  </div>

                  <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 backdrop-blur-sm">
                    <Sparkles className="h-3.5 w-3.5 text-red-200" />
                    {voiceStatus || "Nano pronto para operar"}
                  </div>
                </div>
              </div>

              {showMobileCore ? (
                <div className="relative z-10 px-5 pb-2 lg:hidden">
                  <div className="rounded-[28px] border border-white/8 bg-white/[0.03] px-2 py-2 backdrop-blur-xl">
                    <NanoCoreAnimation
                      nanoState={nanoState}
                      amplitude={currentLevel}
                      className="mx-auto"
                    />
                  </div>
                </div>
              ) : null}

                <div
                  ref={scrollRef}
                className={`nano-premium-scroll relative min-h-0 flex-1 overflow-y-auto px-5 pb-56 pt-3 transition duration-500 md:px-8 ${
                  shouldShowOverlay ? "blur-[2px] saturate-75" : ""
                }`}
              >
                <div
                  className={`mx-auto flex w-full max-w-4xl flex-col gap-5 transition-all duration-500 ${
                    shouldShowExecutionPanel ? "lg:max-w-[860px] lg:pr-[26rem]" : ""
                  }`}
                >
                  <div className="inline-flex w-fit max-w-[520px] items-center gap-2 rounded-full border border-red-500/12 bg-red-500/[0.07] px-4 py-2.5 text-sm text-zinc-100 shadow-[0_14px_38px_rgba(127,29,29,0.16)] backdrop-blur-sm">
                    <span className="h-2 w-2 rounded-full bg-red-300 shadow-[0_0_16px_rgba(255,42,42,0.85)]" />
                    {voiceStatus ||
                      liveStatus ||
                      "Pronto para ouvir e organizar seu financeiro."}
                  </div>

                  {chatHistory.length === 0 && !liveStatus ? (
                    <div className="space-y-6 pt-3">
                      <div className="max-w-[620px] rounded-[28px] bg-white/[0.04] px-6 py-5 text-sm leading-7 text-zinc-300 shadow-[0_18px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
                        Posso registrar uma despesa, criar uma conta, organizar
                        um Pix, resumir sua agenda financeira ou analisar seus
                        gastos do mes. A logica continua a mesma, mas agora voce
                        acompanha tudo em modo assistente ativo.
                      </div>

                      <div className="flex max-w-4xl flex-wrap gap-3">
                        {nanoQuickPrompts.map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            onClick={() =>
                              onQuickPrompt(nanoQuickPromptMap[prompt] || prompt)
                            }
                            className="rounded-[18px] bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-300 shadow-[0_10px_26px_rgba(0,0,0,0.14)] transition duration-300 hover:-translate-y-0.5 hover:bg-red-500/[0.05] hover:text-white"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {chatHistory.map((item) => {
                    const isUser = item.role === "user";

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                        className={`nano-message-enter flex ${isUser ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`flex max-w-[820px] items-start gap-3 ${
                            isUser ? "flex-row-reverse" : ""
                          }`}
                        >
                          {!isUser ? (
                            <div className="mt-1.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-black/24 shadow-[0_0_24px_rgba(255,42,42,0.12)] backdrop-blur-sm">
                              <NanoMark className="h-[18px] w-[18px]" />
                            </div>
                          ) : null}

                          <div
                            className={`max-w-[720px] rounded-[28px] px-5 py-4 shadow-[0_18px_54px_rgba(0,0,0,0.24)] backdrop-blur-xl ${
                              isUser
                                ? "bg-[linear-gradient(180deg,rgba(120,12,18,0.52),rgba(76,10,14,0.34))] text-red-50"
                                : "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.03))] text-zinc-100"
                            }`}
                          >
                            <p className="whitespace-pre-wrap text-sm leading-7">
                              {item.content}
                            </p>
                            <div className="mt-3 flex items-center justify-between gap-4">
                              <p
                                className={`text-[11px] uppercase tracking-[0.18em] ${
                                  isUser ? "text-red-200/70" : "text-zinc-500"
                                }`}
                              >
                                {formatTime(item.created_at)}
                              </p>
                              {item.metadata?.executed_actions?.length ? (
                                <span className="rounded-full bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300">
                                  {item.metadata.executed_actions.length} acao(oes)
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}

                  {liveStatus && chatHistory.length > 0 ? (
                    <div className="flex justify-start">
                      <div className="max-w-[540px] rounded-full bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 shadow-[0_14px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl">
                        {liveStatus}
                      </div>
                    </div>
                  ) : null}

                  {chatError ? (
                    <div className="flex justify-start">
                      <div className="flex max-w-[640px] items-start gap-3 rounded-[24px] bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100 shadow-[0_14px_30px_rgba(127,29,29,0.15)] backdrop-blur-xl">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          O Nano encontrou uma falha temporaria. O chat por
                          texto continua disponivel.
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <AnimatePresence>
              {shouldShowOverlay ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: "easeInOut" }}
                  className="pointer-events-none absolute inset-0 z-20 hidden items-center justify-center bg-black/26 backdrop-blur-[6px] lg:flex"
                >
                  <div className="relative flex w-full max-w-[920px] flex-col items-center justify-center px-6">
                    <NanoCoreAnimation
                      nanoState={nanoState}
                      amplitude={currentLevel}
                      overlay
                    />
                    <div className="-mt-8 rounded-full border border-white/10 bg-black/24 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-zinc-100 shadow-[0_18px_34px_rgba(0,0,0,0.28)]">
                      {nanoState === "thinking"
                        ? "Nano analisando contexto"
                        : nanoState === "executing"
                          ? "Nano executando sua solicitacao"
                          : "Nano respondendo"}
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div
              className={`absolute bottom-5 left-1/2 z-30 w-[calc(100%-2.5rem)] max-w-[980px] -translate-x-1/2 transition-all duration-500 md:w-[calc(100%-4rem)] ${
                shouldShowExecutionPanel ? "lg:max-w-[860px] lg:-translate-x-[calc(50%+11.5rem)]" : ""
              }`}
            >
              <div className="rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-3 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-2xl">
                {isWakeArmed && liveTranscript ? (
                  <div className="mb-2 rounded-2xl bg-black/18 px-4 py-2.5 text-xs text-zinc-300">
                    <span className="mr-2 font-medium uppercase tracking-[0.14em] text-zinc-500">
                      Transcricao
                    </span>
                    {liveTranscript}
                  </div>
                ) : null}

                <div className="flex items-end gap-3">
                  <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 text-red-100 shadow-[0_0_30px_rgba(255,42,42,0.18)] md:flex">
                    <NanoMark className="h-6 w-6" />
                  </div>

                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Digite sua mensagem..."
                    className="min-h-[60px] resize-none rounded-[24px] border border-transparent bg-transparent px-3 py-3 text-sm text-white placeholder:text-zinc-500 focus-visible:border-red-500/30 focus-visible:ring-0"
                  />

                  <div className="flex items-center gap-2 pb-1">
                    {voiceSupported ? (
                      <button
                        type="button"
                        onClick={isWakeArmed ? onStopVoice : onStartVoice}
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl transition duration-300 ${
                          isWakeArmed
                            ? "bg-red-500/14 text-red-100 shadow-[0_0_24px_rgba(255,42,42,0.22)]"
                            : "bg-white/[0.03] text-zinc-300 hover:bg-red-500/[0.06] hover:text-white"
                        }`}
                        title={isWakeArmed ? "Desativar voz" : "Ativar voz"}
                      >
                        {isWakeArmed ? (
                          <MicOff className="h-4 w-4" />
                        ) : (
                          <Mic className="h-4 w-4" />
                        )}
                      </button>
                    ) : null}

                    {isSpeaking ? (
                      <button
                        type="button"
                        onClick={onInterrupt}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-200 transition hover:bg-white/[0.06]"
                        title="Interromper resposta"
                      >
                        <Square className="h-4 w-4" />
                      </button>
                    ) : null}

                    {(isWakeArmed || isProcessing) ? (
                      <button
                        type="button"
                        onClick={onCancelVoiceCommand}
                        className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.03] text-zinc-200 transition hover:bg-white/[0.06]"
                        title="Cancelar comando de voz"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}

                    <Button
                      type="button"
                      onClick={onSend}
                      disabled={isProcessing}
                      className="group h-11 rounded-2xl bg-[linear-gradient(135deg,#ff2a2a,#b80f18)] px-4 text-white shadow-[0_0_30px_rgba(255,42,42,0.26)] transition duration-300 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(255,42,42,0.32)]"
                    >
                      <ArrowUp className="h-4 w-4 transition duration-300 group-hover:-translate-y-0.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-2 flex items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                  <span>
                    {isSpeaking
                      ? "Respondendo"
                      : isProcessing
                        ? "Processando"
                        : isListening
                          ? "Escuta ativa"
                          : "Pronto"}
                  </span>
                  <span>{voiceErrorDetail || "Mesmo cerebro do dashboard e WhatsApp"}</span>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {shouldShowExecutionPanel ? (
              <motion.div
                initial={{ opacity: 0, x: 24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 18, scale: 0.98 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="absolute right-6 top-24 z-40 hidden w-[360px] lg:block"
              >
                <NanoExecutionPanel
                  chatHistory={chatHistory}
                  nanoState={nanoState}
                  voiceStatus={voiceStatus}
                  className="min-h-[620px]"
                />
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
};

export default NanoChatPanel;
