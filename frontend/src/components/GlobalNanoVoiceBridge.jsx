import React, { useEffect } from "react";
import { Mic, MicOff, Sparkles } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { useNanoAssistant } from "../context/NanoAssistantContext";

const PENDING_DASHBOARD_SECTION_KEY = "nano_pending_dashboard_section";

export default function GlobalNanoVoiceBridge() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    voiceSupported,
    isWakeArmed,
    isListening,
    isProcessing,
    isSpeaking,
    voiceStatus,
    startListening,
    stopListening,
  } = useNanoAssistant();

  useEffect(() => {
    const applyPendingSection = () => {
      if (typeof window === "undefined") return;
      if (location.pathname !== "/dashboard") return;

      const pendingSection = window.localStorage.getItem(
        PENDING_DASHBOARD_SECTION_KEY,
      );
      if (!pendingSection) return;

      window.localStorage.removeItem(PENDING_DASHBOARD_SECTION_KEY);
      window.dispatchEvent(
        new CustomEvent("nano-dashboard-section-request", {
          detail: { section: pendingSection },
        }),
      );
    };

    applyPendingSection();
  }, [location.pathname]);

  useEffect(() => {
    const handleAssistantAction = (event) => {
      const action = event.detail?.action;
      if (!action || action.type !== "navigate") return;

      const route = action?.data?.route;
      const section = action?.data?.section;

      if (section) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(PENDING_DASHBOARD_SECTION_KEY, section);
        }
        if (location.pathname !== "/dashboard") {
          navigate("/dashboard");
          return;
        }
        window.dispatchEvent(
          new CustomEvent("nano-dashboard-section-request", {
            detail: { section },
          }),
        );
        return;
      }

      if (route && route !== location.pathname) {
        navigate(route);
      }
    };

    window.addEventListener("nano-assistant-action", handleAssistantAction);
    return () => {
      window.removeEventListener("nano-assistant-action", handleAssistantAction);
    };
  }, [location.pathname, navigate]);

  if (!voiceSupported) {
    return null;
  }

  const active = isWakeArmed || isListening || isProcessing || isSpeaking;

  return (
    <button
      type="button"
      onClick={active ? stopListening : startListening}
      className={`fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-xl transition ${
        active
          ? "border-red-400/35 bg-red-500/14 text-red-50"
          : "border-white/10 bg-black/35 text-zinc-200 hover:border-red-400/25 hover:text-white"
      }`}
      title={active ? "Desativar escuta global do Nano" : "Ativar escuta global do Nano"}
    >
      {active ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      <span>{active ? "Nano ouvindo" : "Ativar Nano"}</span>
      {active ? <Sparkles className="h-3.5 w-3.5 text-red-200" /> : null}
      <span className="hidden max-w-[220px] truncate text-[11px] text-zinc-300 md:inline">
        {voiceStatus}
      </span>
    </button>
  );
}
