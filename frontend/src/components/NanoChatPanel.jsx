import React, { useEffect, useMemo, useRef } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { AlertCircle, Mic, MicOff, Send, Square } from "lucide-react";
import { nanoQuickPromptMap, nanoQuickPrompts } from "../lib/nanoTheme";
import AIVoiceVisualizer from "./AIVoiceVisualizer";

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
  if (isProcessing) return "Nano está organizando a resposta...";
  if (isSpeaking) return "Nano está respondendo por voz.";
  if (partialTranscript || finalTranscript) return partialTranscript || finalTranscript;
  if (isListening) return "Nano está ouvindo...";
  return null;
};

const NanoChatPanel = ({
  chatHistory,
  message,
  setMessage,
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
  voiceProviderType,
  assistantRuntime,
  isWakeArmed,
  voiceSupported,
  error,
  onStartVoice,
  onStopVoice,
  onInterrupt,
}) => {
  const scrollRef = useRef(null);

  const liveStatus = useMemo(
    () =>
      resolveLiveStatus({
        isListening,
        isProcessing,
        isSpeaking,
        partialTranscript,
        finalTranscript,
      }),
    [isListening, isProcessing, isSpeaking, partialTranscript, finalTranscript]
  );

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [chatHistory, liveStatus]);

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSend();
    }
  };

  const shouldShowOverlay =
    voiceState === "listening" ||
    voiceState === "processing" ||
    voiceState === "speaking";

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="shrink-0 px-2 pb-4 pt-2">
        <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-500">
          Conversa
        </p>
        <h3 className="mt-2 text-xl font-semibold text-white">Chat do Nano IA</h3>
        <p className="mt-2 text-sm leading-6 text-zinc-400">
          Registre gastos, contas, lembretes e perguntas financeiras em linguagem natural.
        </p>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-2 py-4 pb-8"
      >
        {chatHistory.length === 0 && !liveStatus && (
          <div className="space-y-4">
            <div className="max-w-[440px] rounded-[24px] bg-white/[0.035] px-5 py-4 shadow-[0_8px_22px_rgba(2,6,23,0.16)]">
              <p className="text-sm leading-7 text-zinc-300">
                Como posso ajudar com seu financeiro hoje?
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {nanoQuickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => onQuickPrompt(nanoQuickPromptMap[prompt])}
                  className="rounded-full bg-white/[0.03] px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.06] hover:text-white"
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
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[78%] rounded-[24px] px-4 py-3 shadow-[0_10px_26px_rgba(2,6,23,0.18)] ${
                  isUser
                    ? "bg-red-600/10 text-red-50"
                    : "bg-white/[0.04] text-zinc-100"
                }`}
              >
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

        {liveStatus && (
          <div className="flex justify-start">
            <div className="max-w-[78%] rounded-[22px] bg-white/[0.035] px-4 py-3 text-sm text-zinc-300 shadow-[0_8px_22px_rgba(2,6,23,0.14)]">
              {liveStatus}
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-start">
            <div className="flex max-w-[78%] items-start gap-3 rounded-[22px] bg-rose-500/[0.08] px-4 py-3 text-sm text-rose-100 shadow-[0_8px_22px_rgba(127,29,29,0.14)]">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>O Nano encontrou uma falha temporária. O texto continua disponível.</span>
            </div>
          </div>
        )}
      </div>

      {shouldShowOverlay && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-10">
          <div className="w-full max-w-[340px] rounded-[30px] border border-white/8 bg-[linear-gradient(180deg,rgba(7,10,18,0.72),rgba(7,10,18,0.58))] px-8 py-7 text-center shadow-[0_24px_80px_rgba(2,6,23,0.28)] backdrop-blur-md">
            <div className="mx-auto max-w-[180px]">
              <AIVoiceVisualizer
                mode={voiceState === "error" ? "idle" : voiceState}
                amplitude={currentLevel}
              />
            </div>
            <p className="mt-5 text-base font-medium text-white">
              {voiceStatus ||
                (voiceState === "listening"
                  ? "Ouvindo..."
                  : voiceState === "processing"
                    ? "Processando comando..."
                    : "Respondendo...")}
            </p>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-[11px] text-zinc-400">
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
                {assistantRuntime?.runtimeMode === "self_hosted"
                  ? "stack local"
                  : "stack híbrido"}
              </span>
              <span className="rounded-full bg-white/[0.05] px-2.5 py-1">
                {assistantRuntime?.llmModel || voiceProviderType}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-10 shrink-0 px-0 pb-1 pt-3">
        <div className="rounded-[28px] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-3 shadow-[0_18px_48px_rgba(2,6,23,0.22)] backdrop-blur-md">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite ou fale um comando financeiro"
            className="min-h-[78px] resize-none border-0 bg-transparent px-1 py-1 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
          />

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {voiceSupported && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={isWakeArmed ? onStopVoice : onStartVoice}
                  className={`rounded-full border-white/10 px-4 ${
                    isWakeArmed
                      ? "bg-red-500/12 text-red-100 hover:bg-red-500/18"
                      : "bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  }`}
                >
                  {isWakeArmed ? (
                    <MicOff className="mr-2 h-4 w-4" />
                  ) : (
                    <Mic className="mr-2 h-4 w-4" />
                  )}
                  {isWakeArmed ? "Voz ativa" : "Microfone"}
                </Button>
              )}

              {isSpeaking && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onInterrupt}
                  className="rounded-full border-white/10 bg-white/[0.03] px-4 text-zinc-200 hover:bg-white/[0.06]"
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
              className="rounded-full bg-red-600 px-5 text-white hover:bg-red-500"
            >
              <Send className="mr-2 h-4 w-4" />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NanoChatPanel;
