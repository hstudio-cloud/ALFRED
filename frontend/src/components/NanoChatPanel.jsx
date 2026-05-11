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
import { confirmationResponses, getRandomResponse } from "../lib/nanoResponses";
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

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const resolveLiveStatus = ({
  isListening,
  isProcessing,
  isSpeaking,
  partialTranscript,
  finalTranscript,
}) => {
  if (isProcessing) return getRandomResponse(confirmationResponses);
  if (isSpeaking) return "Respondendo via audio...";
  if (partialTranscript || finalTranscript) {
    return partialTranscript || finalTranscript;
  }
  if (isListening) return "Capturando audio...";
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
  voiceSupported,
  isWakeArmed,
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
  const latestUser = useMemo(
    () => getLatestEntry(chatHistory, "user"),
    [chatHistory],
  );
  const olderMessages = useMemo(
    () =>
      chatHistory
        .filter(
          (item) =>
            item?.id &&
            item.id !== latestAssistant?.id &&
            item.id !== latestUser?.id,
        )
        .slice(-6),
    [chatHistory, latestAssistant?.id, latestUser?.id],
  );

  const greeting = getGreeting();
  const liveTranscript = (partialTranscript || finalTranscript || "").trim();
  const voiceErrorDetail = error?.message || error?.error || "";
  const shellBusy = nanoState === "thinking" || nanoState === "executing";
  const hasExecutionData = Boolean(
    latestAssistant?.metadata?.executed_actions?.length ||
      latestAssistant?.metadata?.actions?.length ||
      latestAssistant?.metadata?.tool_results,
  );
  const showExecutionPanel =
    shellBusy || isSpeaking || (responsePulseActive && hasExecutionData);
  const latestAssistantText =
    latestAssistant?.content ||
    (shellBusy
      ? "Estou organizando a resposta e executando o que for preciso."
      : "Fale comigo para eu analisar, executar e responder de forma objetiva.");

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
    }, 2400);
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
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/5 bg-[linear-gradient(180deg,rgba(6,6,7,0.66),rgba(4,4,5,0.82))] shadow-[0_32px_110px_rgba(0,0,0,0.34)]">
      <style>{`
        @keyframes nano-clean-drift {
          0% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(-1%, 1.2%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .nano-clean-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.12) transparent;
        }
        .nano-clean-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .nano-clean-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.12);
          border-radius: 999px;
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[18%] top-[26%] h-[240px] w-[360px] rounded-full bg-[radial-gradient(circle,rgba(255,42,42,0.18),transparent_64%)] blur-3xl" />
        <div className="absolute right-[12%] top-[10%] h-[180px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(127,29,29,0.16),transparent_64%)] blur-3xl" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 30%, rgba(255,255,255,0.12) 0 1px, transparent 2px), radial-gradient(circle at 42% 16%, rgba(255,255,255,0.08) 0 1px, transparent 2px), radial-gradient(circle at 78% 24%, rgba(255,255,255,0.09) 0 1px, transparent 2px), radial-gradient(circle at 72% 74%, rgba(255,255,255,0.07) 0 1px, transparent 2px)",
            animation: "nano-clean-drift 18s ease-in-out infinite",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col px-5 pb-5 pt-6 md:px-8 md:pb-7 md:pt-8">
        <div className="flex flex-col gap-4 border-b border-white/6 pb-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.34em] text-red-300/84">
              Assistente ativo
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-[42px]">
              {greeting}, {userName || "Heitor"}.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-zinc-300">
              Estou aqui para cuidar da sua vida financeira. Pode falar comigo.
            </p>
            <div className="mt-4 h-px w-16 bg-[linear-gradient(90deg,#ff2a2a,transparent)]" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {voiceSupported ? (
              <button
                type="button"
                onClick={isWakeArmed ? onStopVoice : onStartVoice}
                className={`inline-flex h-12 items-center gap-3 rounded-full border px-5 text-sm shadow-[0_20px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl transition ${
                  isWakeArmed
                    ? "border-red-400/24 bg-red-500/14 text-red-50"
                    : "border-white/10 bg-black/24 text-zinc-200 hover:border-red-400/18 hover:text-white"
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

            <div className="inline-flex h-12 items-center gap-3 rounded-full border border-white/10 bg-black/24 px-5 text-sm text-zinc-200 shadow-[0_20px_48px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_18px_rgba(255,42,42,0.9)]" />
              Online
            </div>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="nano-clean-scroll relative min-h-0 flex-1 overflow-y-auto"
        >
          <div
            className={`grid min-h-full gap-6 py-6 ${
              showExecutionPanel ? "xl:grid-cols-[minmax(0,1fr)_320px]" : ""
            }`}
          >
            <div className="flex min-h-full flex-col gap-6">
              <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
                <div className="relative flex min-h-[250px] items-center justify-center overflow-hidden rounded-[28px] border border-white/5 bg-[linear-gradient(180deg,rgba(17,10,12,0.34),rgba(9,8,10,0.08))] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="pointer-events-none absolute inset-x-[-6%] top-1/2 h-[220px] -translate-y-1/2 bg-[radial-gradient(circle,rgba(255,42,42,0.18),transparent_58%)] blur-3xl" />
                  <div className="relative flex flex-col items-center gap-5">
                    <NanoCoreAnimation
                      nanoState={nanoState}
                      amplitude={currentLevel}
                    />

                    <AnimatePresence mode="wait">
                      {(shellBusy || isSpeaking || liveStatus) && (
                        <motion.div
                          key={nanoState}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.28 }}
                          className="rounded-full border border-red-400/16 bg-black/32 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-zinc-100 shadow-[0_16px_34px_rgba(0,0,0,0.28)]"
                        >
                          {liveStatus ||
                            (nanoState === "thinking"
                              ? "Nano analisando"
                              : nanoState === "executing"
                                ? "Nano executando"
                                : "Nano respondendo")}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {latestUser?.content ? (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                      className="ml-auto max-w-[420px] rounded-[22px] border border-red-500/12 bg-[linear-gradient(180deg,rgba(97,10,16,0.3),rgba(60,8,12,0.14))] px-4 py-3.5 text-red-50 shadow-[0_14px_36px_rgba(85,10,16,0.14)] backdrop-blur-xl"
                    >
                      <p className="text-base leading-7">{latestUser.content}</p>
                      <p className="mt-3 text-[11px] uppercase tracking-[0.22em] text-red-200/72">
                        {latestUser.created_at
                          ? formatTime(latestUser.created_at)
                          : "--:--"}
                      </p>
                    </motion.div>
                  ) : null}

                  <motion.div
                    key={latestAssistant?.id || `seed-${nanoState}`}
                    initial={{ opacity: 0, y: 16, scale: 0.99 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
                    className={`rounded-[26px] border px-5 py-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl ${
                      responsePulseActive
                        ? "border-red-400/18 bg-[radial-gradient(circle_at_top_left,rgba(255,42,42,0.12),transparent_28%),linear-gradient(180deg,rgba(18,14,16,0.9),rgba(10,9,10,0.84))]"
                        : "border-white/6 bg-[linear-gradient(180deg,rgba(18,14,16,0.86),rgba(10,9,10,0.82))]"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-red-500/10 shadow-[0_0_24px_rgba(255,42,42,0.18)] sm:flex">
                        <NanoMark className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-zinc-400">
                            <Sparkles className="h-3.5 w-3.5 text-red-300" />
                            Nano
                          </span>
                          {(shellBusy || isSpeaking) && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-red-500/[0.08] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-red-100">
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_12px_rgba(255,42,42,0.9)]" />
                              {nanoState === "thinking"
                                ? "Pensando"
                                : nanoState === "executing"
                                  ? "Executando"
                                  : "Respondendo"}
                            </span>
                          )}
                        </div>

                        <p className="mt-4 max-w-3xl whitespace-pre-wrap text-base leading-8 text-zinc-100 md:text-lg">
                          {latestAssistantText}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
                          <span>
                            {latestAssistant?.created_at
                              ? formatTime(latestAssistant.created_at)
                              : liveStatus || "Pronto para responder"}
                          </span>
                          {showExecutionPanel && (
                            <span className="inline-flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1 text-zinc-400">
                              mostrando execucao em tempo real
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {showExecutionPanel ? (
                <div className="xl:hidden">
                  <NanoExecutionPanel
                    chatHistory={chatHistory}
                    nanoState={nanoState}
                    voiceStatus={voiceStatus}
                    className="max-h-[420px]"
                  />
                </div>
              ) : null}

              {olderMessages.length ? (
                <div className="rounded-[24px] border border-white/5 bg-black/12 px-5 py-4 text-sm text-zinc-400 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-zinc-600">
                    Historico recente
                  </p>
                  <div className="mt-4 space-y-3">
                    {olderMessages.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between gap-4 border-b border-white/4 pb-3 last:border-b-0 last:pb-0"
                      >
                        <div className="flex-1">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-600">
                            {item.role === "user" ? "Voce" : "Nano"}
                          </p>
                          <p className="mt-1 line-clamp-2 leading-6">
                            {item.content}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] uppercase tracking-[0.18em] text-zinc-600">
                          {formatTime(item.created_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {!chatHistory.length && !message && !liveStatus ? (
                <div className="rounded-[28px] border border-white/6 bg-white/[0.02] px-5 py-5 backdrop-blur-xl">
                  <p className="text-[11px] uppercase tracking-[0.26em] text-zinc-500">
                    Sugestoes iniciais
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {nanoQuickPrompts.slice(0, 4).map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() =>
                          onQuickPrompt(nanoQuickPromptMap[prompt] || prompt)
                        }
                        className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-zinc-200 transition hover:border-red-400/16 hover:bg-red-500/[0.06] hover:text-white"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {chatError ? (
                <div className="flex items-start gap-3 rounded-[24px] border border-red-500/14 bg-red-500/[0.08] px-5 py-4 text-sm text-red-50 shadow-[0_18px_48px_rgba(127,29,29,0.14)] backdrop-blur-xl">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    O Nano encontrou uma instabilidade temporaria. O fluxo de
                    texto continua disponivel.
                  </span>
                </div>
              ) : null}
            </div>

            {showExecutionPanel ? (
              <aside className="hidden xl:block">
                <AnimatePresence>
                  <motion.div
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.28 }}
                  >
                    <NanoExecutionPanel
                      chatHistory={chatHistory}
                      nanoState={nanoState}
                      voiceStatus={voiceStatus}
                      className="sticky top-0 max-h-[calc(100vh-220px)]"
                    />
                  </motion.div>
                </AnimatePresence>
              </aside>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/6 pt-5">
          <div className="rounded-[28px] border border-white/6 bg-[linear-gradient(180deg,rgba(12,12,13,0.76),rgba(8,8,9,0.72))] px-4 py-4 shadow-[0_20px_56px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
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
                className="min-h-[74px] resize-none rounded-[24px] border border-transparent bg-transparent px-4 py-4 text-base text-white placeholder:text-zinc-500 focus-visible:border-red-500/20 focus-visible:ring-0"
              />

              <div className="flex items-center gap-2 pb-1">
                {voiceSupported ? (
                  <button
                    type="button"
                    onClick={isWakeArmed ? onStopVoice : onStartVoice}
                    className={`flex h-12 w-12 items-center justify-center rounded-full transition ${
                      isWakeArmed
                        ? "bg-red-500/16 text-red-50 shadow-[0_0_28px_rgba(255,42,42,0.24)]"
                        : "bg-white/[0.04] text-zinc-300 hover:bg-red-500/[0.08] hover:text-white"
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
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                    title="Interromper resposta"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                ) : null}

                {(isWakeArmed || isProcessing) ? (
                  <button
                    type="button"
                    onClick={onCancelVoiceCommand}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.04] text-zinc-200 transition hover:bg-white/[0.08]"
                    title="Cancelar comando de voz"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <Button
                  type="button"
                  onClick={onSend}
                  disabled={isProcessing}
                  className="group h-12 rounded-full bg-[linear-gradient(135deg,#ff2a2a,#b90e18)] px-5 text-white shadow-[0_0_36px_rgba(255,42,42,0.28)] transition hover:scale-[1.01] hover:shadow-[0_0_44px_rgba(255,42,42,0.34)]"
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
