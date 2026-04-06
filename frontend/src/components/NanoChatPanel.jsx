import React, { useEffect, useMemo, useRef } from "react";
import { AlertCircle, Mic, MicOff, Send, Square } from "lucide-react";

import { nanoQuickPromptMap, nanoQuickPrompts } from "../lib/nanoTheme";
import AIVoiceVisualizer from "./AIVoiceVisualizer";
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
  if (partialTranscript || finalTranscript) return partialTranscript || finalTranscript;
  if (isListening) return "Nano esta ouvindo...";
  return null;
};

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
            linear-gradient(180deg, rgba(15,6,8,0.82) 0%, rgba(12,6,9,0.76) 100%);
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

      <div className="nano-scene relative flex h-full min-h-0 flex-col overflow-hidden rounded-[28px]">
        <div className="shrink-0 px-8 pb-3 pt-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-zinc-600">
            Nano IA
          </p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Ola {userName || "Heitor"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
            Use o Nano para organizar seu financeiro, registrar movimentacoes e
            entender o que precisa da sua atencao.
          </p>
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
                      onClick={() => onQuickPrompt(nanoQuickPromptMap[prompt])}
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
                        : "rounded-[26px_26px_26px_14px] bg-white/[0.04] text-zinc-100"
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

            {liveStatus && chatHistory.length > 0 && (
              <div className="flex justify-start">
                <div className="nano-floating-pill max-w-[520px] rounded-[999px] border border-red-500/12 bg-white/[0.04] px-4 py-3 text-sm text-zinc-200 shadow-[0_12px_30px_rgba(2,6,23,0.16)]">
                  {liveStatus}
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-start">
                <div className="flex max-w-[640px] items-start gap-3 rounded-[24px_24px_24px_14px] bg-rose-500/[0.08] px-5 py-4 text-sm text-rose-100 shadow-[0_14px_30px_rgba(127,29,29,0.15)]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    O Nano encontrou uma falha temporaria. O chat por texto continua disponivel.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {shouldShowOverlay && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="flex w-full max-w-[420px] flex-col items-center px-6 text-center">
              <div className="mx-auto max-w-[320px] opacity-90">
                <AIVoiceVisualizer
                  mode={voiceState === "error" ? "idle" : voiceState}
                  amplitude={currentLevel}
                />
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.28em] text-zinc-200/82">
                {voiceState === "processing"
                  ? "TRANSCREVENDO..."
                  : voiceState === "speaking"
                  ? "RESPONDENDO..."
                  : voiceState === "listening"
                  ? "OUVINDO..."
                  : "NANO ATIVO"}
              </p>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 z-20 w-[min(980px,calc(100%-6rem))] -translate-x-1/2">
          <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] px-4 py-3 shadow-[0_20px_60px_rgba(2,6,23,0.28)] backdrop-blur-xl">
            <div className="flex items-end gap-3">
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="min-h-[56px] resize-none border-0 bg-transparent px-1 py-2 text-sm text-white placeholder:text-zinc-500 focus-visible:ring-0"
              />
              <div className="flex items-center gap-2 pb-1">
                {voiceSupported && (
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
                )}

                {isSpeaking && (
                  <button
                    type="button"
                    onClick={onInterrupt}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]"
                  >
                    <Square className="h-4 w-4" />
                  </button>
                )}

                <Button
                  type="button"
                  onClick={onSend}
                  disabled={isProcessing}
                  className="h-10 rounded-full bg-red-600 px-4 text-white hover:bg-red-500"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NanoChatPanel;
