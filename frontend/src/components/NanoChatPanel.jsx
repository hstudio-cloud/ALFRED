import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowUp, Mic, MicOff, Sparkles, Square, X } from "lucide-react";

import { nanoQuickPromptMap, nanoQuickPrompts } from "../lib/nanoTheme";
import { confirmationResponses, getRandomResponse } from "../lib/nanoResponses";
import NanoCoreAnimation from "./NanoCoreAnimation";
import NanoExecutionPanel from "./NanoExecutionPanel";
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
  if (isProcessing) return getRandomResponse(confirmationResponses);
  if (isSpeaking) return "Nano esta respondendo por voz.";
  if (partialTranscript || finalTranscript) return partialTranscript || finalTranscript;
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
  if (isListening) return "listening";
  return "idle";
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const getLatestEntry = (chatHistory, role) =>
  [...chatHistory].reverse().find((entry) => entry?.role === role);

const NanoChatPanel = ({
  chatHistory = [],
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
  currentLevel = 0,
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
  const responsePulseTimerRef = useRef(null);
  const processingStartedAtRef = useRef(0);

  const [responsePulseActive, setResponsePulseActive] = useState(false);
  const [processingElapsed, setProcessingElapsed] = useState(0);

  const liveStatus = useMemo(
    () =>
      resolveLiveStatus({
        isListening,
        isProcessing,
        isSpeaking,
        partialTranscript,
        finalTranscript,
      }),
    [finalTranscript, isListening, isProcessing, isSpeaking, partialTranscript],
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
      processingElapsed,
      responsePulseActive,
      voiceState,
    ],
  );

  const latestAssistant = useMemo(
    () => getLatestEntry(chatHistory, "assistant"),
    [chatHistory],
  );

  const greeting = getGreeting();
  const liveTranscript = (partialTranscript || finalTranscript || "").trim();
  const voiceErrorDetail = error?.message || error?.error || "";
  const hasExecutionData = Boolean(
    latestAssistant?.metadata?.executed_actions?.length ||
      latestAssistant?.metadata?.actions?.length ||
      latestAssistant?.metadata?.tool_results,
  );
  const showExecutionPanel =
    nanoState === "thinking" ||
    nanoState === "executing" ||
    (responsePulseActive && hasExecutionData);
  const shouldShowOverlay =
    nanoState === "listening" ||
    nanoState === "thinking" ||
    nanoState === "speaking";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, liveStatus, showExecutionPanel]);

  useEffect(() => {
    const lastAssistantMessage = latestAssistant;

    if (!lastAssistantMessage?.id) return;
    if (!lastAssistantMessageIdRef.current) {
      lastAssistantMessageIdRef.current = lastAssistantMessage.id;
      return;
    }
    if (lastAssistantMessage.id === lastAssistantMessageIdRef.current) return;

    lastAssistantMessageIdRef.current = lastAssistantMessage.id;
    setResponsePulseActive(true);

    if (responsePulseTimerRef.current) {
      clearTimeout(responsePulseTimerRef.current);
    }

    responsePulseTimerRef.current = setTimeout(() => {
      setResponsePulseActive(false);
      responsePulseTimerRef.current = null;
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
      if (responsePulseTimerRef.current) {
        clearTimeout(responsePulseTimerRef.current);
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
        @keyframes nanoMessageEnter {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes nanoFloat {
          0%,100% { transform: translateY(0px); }
          50% { transform: translateY(-2px); }
        }
        .nano-chat-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.1) transparent;
        }
        .nano-chat-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .nano-chat-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .nano-chat-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 999px;
        }
        .nano-chat-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.16);
        }
        .nano-scene {
          background-image:
            radial-gradient(circle at 14% 18%, rgba(127,29,29,0.14), transparent 26%),
            radial-gradient(circle at 68% 78%, rgba(153,27,27,0.10), transparent 28%),
            radial-gradient(circle at 82% 16%, rgba(255,255,255,0.02), transparent 22%),
            radial-gradient(circle at 18% 14%, rgba(255,255,255,0.08) 0 1px, transparent 2px),
            radial-gradient(circle at 36% 22%, rgba(255,255,255,0.07) 0 1px, transparent 2px),
            radial-gradient(circle at 56% 14%, rgba(255,255,255,0.07) 0 1px, transparent 2px),
            radial-gradient(circle at 78% 26%, rgba(255,255,255,0.06) 0 1px, transparent 2px),
            radial-gradient(circle at 24% 62%, rgba(255,255,255,0.05) 0 1px, transparent 2px),
            radial-gradient(circle at 66% 58%, rgba(255,255,255,0.05) 0 1px, transparent 2px),
            linear-gradient(180deg, rgba(15,6,8,0.84) 0%, rgba(12,6,9,0.78) 100%);
          background-color: rgba(10, 4, 6, 0.62);
          background-size: auto, auto, 220px 220px, 280px 280px, 320px 320px, 360px 360px, 400px 400px, 460px 460px, auto;
        }
        .nano-message-enter {
          animation: nanoMessageEnter 320ms cubic-bezier(0.2, 0.9, 0.2, 1);
        }
        .nano-floating-pill {
          animation: nanoFloat 2.6s ease-in-out infinite;
        }
      `}</style>

      <div className="nano-scene relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/6 shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        <div className="shrink-0 px-8 pb-3 pt-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-red-300/84">
                Assistente ativo
              </p>
              <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-[42px]">
                {greeting}, {userName || "Heitor"}.
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
                Estou aqui para cuidar da sua vida financeira. Pode falar comigo.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {voiceSupported ? (
                <button
                  type="button"
                  onClick={isWakeArmed ? onStopVoice : onStartVoice}
                  className={`inline-flex h-12 items-center gap-3 rounded-full border px-5 text-sm transition ${
                    isWakeArmed
                      ? "border-red-400/24 bg-red-500/12 text-red-100"
                      : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {isWakeArmed ? (
                    <MicOff className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  <span>{isWakeArmed ? "Escuta ativa" : "Ativar voz"}</span>
                </button>
              ) : null}

              <div className="inline-flex h-12 items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 text-sm text-zinc-200">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(255,42,42,0.9)]" />
                Online
              </div>
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="nano-chat-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-8 pb-40 pt-5"
        >
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
            <div className="nano-floating-pill inline-flex w-fit max-w-[420px] rounded-[20px] border border-red-500/14 bg-red-500/[0.07] px-4 py-3 text-sm text-zinc-100 shadow-[0_12px_28px_rgba(127,29,29,0.14)] backdrop-blur-sm">
              {voiceStatus || liveStatus || "Pronto para ouvir e organizar seu financeiro."}
            </div>

            {chatHistory.length === 0 && !liveStatus && (
              <div className="space-y-5 pt-2">
                <div className="max-w-[560px] rounded-[26px_26px_26px_14px] bg-white/[0.04] px-5 py-4 text-sm leading-7 text-zinc-300 shadow-[0_14px_34px_rgba(2,6,23,0.18)]">
                  Posso registrar uma despesa, criar uma conta, organizar um Pix
                  ou analisar seus gastos do mes.
                </div>
                <div className="flex max-w-3xl flex-wrap gap-2">
                  {nanoQuickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => onQuickPrompt(nanoQuickPromptMap[prompt] || prompt)}
                      className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatHistory.map((item) => {
              const isUser = item.role === "user";

              return (
                <div
                  key={item.id}
                  className={`nano-message-enter flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[720px] px-5 py-4 shadow-[0_14px_34px_rgba(2,6,23,0.18)] ${
                      isUser
                        ? "rounded-[26px_26px_14px_26px] bg-red-600/10 text-red-50"
                        : responsePulseActive && item.id === latestAssistant?.id
                          ? "rounded-[26px_26px_26px_14px] border border-red-400/14 bg-red-500/[0.06] text-zinc-100"
                          : "rounded-[26px_26px_26px_14px] bg-white/[0.04] text-zinc-100"
                    }`}
                  >
                    {!isUser ? (
                      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
                        <Sparkles className="h-3.5 w-3.5 text-red-300" />
                        Nano
                      </div>
                    ) : null}

                    <p className="whitespace-pre-wrap text-sm leading-7">{item.content}</p>

                    <p
                      className={`mt-2 text-[11px] ${
                        isUser ? "text-red-200/70" : "text-zinc-500"
                      }`}
                    >
                      {formatTime(item.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}

            {liveStatus && chatHistory.length > 0 && (
              <div className="flex justify-start">
                <div className="nano-floating-pill max-w-[520px] rounded-[999px] border border-red-500/12 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 shadow-[0_12px_30px_rgba(2,6,23,0.16)]">
                  {liveStatus}
                </div>
              </div>
            )}

            {showExecutionPanel ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.24 }}
                className="max-w-[760px]"
              >
                <NanoExecutionPanel
                  chatHistory={chatHistory}
                  nanoState={nanoState}
                  voiceStatus={voiceStatus}
                  className="max-h-[340px] border-white/6 bg-black/22"
                />
              </motion.div>
            ) : null}

            {chatError ? (
              <div className="flex justify-start">
                <div className="flex max-w-[640px] items-start gap-3 rounded-[24px_24px_24px_14px] bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100 shadow-[0_14px_30px_rgba(127,29,29,0.15)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    O Nano encontrou uma falha temporaria. O chat por texto continua disponivel.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <AnimatePresence>
          {shouldShowOverlay ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
            >
              <div className="w-full max-w-[220px] rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,10,18,0.46),rgba(7,10,18,0.28))] px-6 py-5 text-center shadow-[0_24px_80px_rgba(2,6,23,0.2)] backdrop-blur-md">
                <div className="mx-auto max-w-[128px]">
                  <NanoCoreAnimation nanoState={nanoState} amplitude={currentLevel} />
                </div>
                <p className="mt-4 text-sm text-zinc-200">
                  {voiceStatus || liveStatus || "Nano ativo"}
                </p>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="absolute bottom-6 left-1/2 z-20 w-[min(980px,calc(100%-6rem))] -translate-x-1/2">
          <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            {isWakeArmed && liveTranscript ? (
              <div className="mb-3 rounded-[20px] bg-white/[0.035] px-4 py-3 text-sm text-zinc-300">
                <span className="mr-2 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Transcricao
                </span>
                {liveTranscript}
              </div>
            ) : null}

            <div className="flex items-end gap-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Fale com o Nano..."
                className="min-h-[56px] resize-none border-0 bg-transparent px-1 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
              />
              <div className="flex items-center gap-2 pb-1">
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={isWakeArmed ? onStopVoice : onStartVoice}
                    className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
                      isWakeArmed
                        ? "border-red-400/24 bg-red-500/12 text-red-100"
                        : "border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]"
                    }`}
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
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : null}

                {(isWakeArmed || isProcessing) ? (
                  <button
                    type="button"
                    onClick={onCancelVoiceCommand}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <Button
                  type="button"
                  onClick={onSend}
                  disabled={isProcessing}
                  className="group h-10 rounded-full bg-red-600 px-4 text-white hover:bg-red-500"
                >
                  <ArrowUp className="h-4 w-4 transition group-hover:-translate-y-0.5" />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
              <span>
                {isSpeaking
                  ? "Respondendo"
                  : isProcessing
                    ? "Processando"
                    : isListening
                      ? "Escuta ativa"
                      : "Pronto"}
              </span>
              <span>
                {voiceErrorDetail ||
                  "O Nano aprende. O Nano cuida. O Nano faz por voce."}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NanoChatPanel;
