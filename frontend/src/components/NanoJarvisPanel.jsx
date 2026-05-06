import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Activity, AlertCircle, Mic, Radio, Sparkles, Volume2 } from "lucide-react";

import NanoChatPanel from "./NanoChatPanel";
import NanoMark from "./NanoMark";

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const resolveRuntimeLabel = ({
  isProcessing,
  isSpeaking,
  isListening,
  voiceState,
}) => {
  if (voiceState === "speaking" || isSpeaking) return "Transmitindo";
  if (voiceState === "processing" || isProcessing) return "Analisando";
  if (isListening) return "Escuta ativa";
  return "Pronto";
};

const statusToneClass = (label) => {
  switch (label) {
    case "Transmitindo":
      return "border-emerald-500/20 bg-emerald-500/10 text-emerald-200";
    case "Analisando":
      return "border-amber-500/20 bg-amber-500/10 text-amber-200";
    case "Escuta ativa":
      return "border-red-500/20 bg-red-500/10 text-red-200";
    default:
      return "border-white/10 bg-white/[0.04] text-zinc-300";
  }
};

const HudMetric = ({ icon: Icon, label, value, accent = "text-zinc-400" }) => (
  <div className="flex items-center gap-2 rounded-2xl border border-white/6 bg-white/[0.03] px-3 py-2 backdrop-blur-sm">
    <Icon className={`h-3.5 w-3.5 ${accent}`} />
    <div>
      <p className="text-[9px] uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className="mt-1 text-xs font-semibold text-zinc-100">{value}</p>
    </div>
  </div>
);

const NanoJarvisPanel = (props) => {
  const {
    userName,
    transactions = [],
    reminders = [],
    bills = [],
    isListening,
    isProcessing,
    isSpeaking,
    voiceState,
    voiceStatus,
    partialTranscript,
    finalTranscript,
  } = props;

  const [clock, setClock] = useState(
    new Date().toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    }),
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(
        new Date().toLocaleTimeString("pt-BR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const runtimeLabel = useMemo(
    () =>
      resolveRuntimeLabel({
        isProcessing,
        isSpeaking,
        isListening,
        voiceState,
      }),
    [isListening, isProcessing, isSpeaking, voiceState],
  );

  const openBills = useMemo(
    () =>
      bills.filter(
        (bill) =>
          bill?.status !== "paid" &&
          bill?.status !== "received" &&
          bill?.status !== "completed",
      ).length,
    [bills],
  );

  const transcriptPreview = (partialTranscript || finalTranscript || "").trim();

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <style>{`
        @keyframes nanoHudSweep {
          0% { transform: translateY(-120%); opacity: 0; }
          25% { opacity: 0.18; }
          100% { transform: translateY(120%); opacity: 0; }
        }
        .nano-hud-shell {
          background:
            radial-gradient(circle at top, rgba(127, 29, 29, 0.18), transparent 28%),
            linear-gradient(180deg, rgba(5, 2, 3, 0.96) 0%, rgba(10, 4, 6, 0.96) 100%);
        }
        .nano-hud-shell::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, transparent 0%, rgba(255, 42, 42, 0.035) 48%, transparent 100%);
          animation: nanoHudSweep 7s linear infinite;
          pointer-events: none;
        }
      `}</style>

      <div className="nano-hud-shell relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-white/6 shadow-[0_30px_120px_rgba(0,0,0,0.42)]">
        <div className="relative z-10 flex items-center justify-between gap-4 border-b border-white/6 bg-black/18 px-5 py-4 backdrop-blur-xl md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-red-500/12 bg-red-500/10 shadow-[0_0_24px_rgba(255,42,42,0.12)]">
              <NanoMark className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.34em] text-red-300/70">
                Nano Runtime
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm font-semibold text-white">
                  {getGreeting()}, {userName || "Heitor"}
                </span>
                <motion.span
                  animate={{ opacity: [0.45, 1, 0.45], scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  className={`h-2 w-2 rounded-full ${
                    runtimeLabel === "Transmitindo"
                      ? "bg-emerald-400"
                      : runtimeLabel === "Analisando"
                        ? "bg-amber-400"
                        : runtimeLabel === "Escuta ativa"
                          ? "bg-red-400"
                          : "bg-zinc-500"
                  }`}
                />
                <span className="text-[11px] uppercase tracking-[0.26em] text-zinc-400">
                  {runtimeLabel}
                </span>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <HudMetric
              icon={Activity}
              label="Transacoes"
              value={String(transactions.length)}
            />
            <HudMetric
              icon={AlertCircle}
              label="Pendencias"
              value={String(openBills)}
              accent={openBills > 0 ? "text-amber-300" : "text-zinc-400"}
            />
            <HudMetric
              icon={Radio}
              label="Lembretes"
              value={String(reminders.length)}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right md:block">
              <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
                Operacao online
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-200">{clock}</p>
            </div>
            <div
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.22em] ${statusToneClass(
                runtimeLabel,
              )}`}
            >
              {runtimeLabel === "Transmitindo" ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : runtimeLabel === "Escuta ativa" ? (
                <Mic className="h-3.5 w-3.5" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              {runtimeLabel}
            </div>
          </div>
        </div>

        {(voiceStatus || transcriptPreview) && (
          <div className="relative z-10 border-b border-white/6 bg-black/10 px-5 py-3 backdrop-blur-sm md:px-6">
            <p className="text-[10px] uppercase tracking-[0.26em] text-zinc-500">
              Status da sessao
            </p>
            <p className="mt-1 text-sm text-zinc-200">
              {transcriptPreview || voiceStatus}
            </p>
          </div>
        )}

        <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
          <NanoChatPanel {...props} />
        </div>
      </div>
    </section>
  );
};

export default NanoJarvisPanel;
