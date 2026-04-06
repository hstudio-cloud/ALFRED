import React from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import AIVoiceVisualizer from "./AIVoiceVisualizer";
import { Mic, MicOff, Square } from "lucide-react";
import { nanoVoiceCopy } from "../lib/nanoTheme";

const NanoVoiceOrb = ({
  voiceState,
  voiceStatus,
  currentLevel,
  assistantRuntime,
  voiceProviderType,
  isWakeArmed,
  isSpeaking,
  onStartVoice,
  onStopVoice,
  onInterrupt,
}) => {
  const runtime = assistantRuntime || {};
  const statusLabel = voiceStatus || nanoVoiceCopy[voiceState] || nanoVoiceCopy.idle;

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-[240px]">
        <AIVoiceVisualizer
          mode={voiceState === "error" ? "idle" : voiceState}
          amplitude={currentLevel}
        />
      </div>

      <div className="space-y-3 text-center">
        <h3 className="text-2xl font-semibold text-white">Nano IA</h3>
        <p className="mx-auto max-w-sm text-sm leading-7 text-zinc-400">
          {statusLabel}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Badge
          variant="outline"
          className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-300"
        >
          {nanoVoiceCopy[voiceState] || nanoVoiceCopy.idle}
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-300"
        >
          {runtime.runtimeMode === "self_hosted" ? "stack local" : "stack hibrido"}
        </Badge>
        <Badge
          variant="outline"
          className="rounded-full border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-zinc-300"
        >
          {runtime.llmModel || voiceProviderType}
        </Badge>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {isWakeArmed ? (
          <Button
            type="button"
            variant="outline"
            onClick={onStopVoice}
            className="rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]"
          >
            <MicOff className="mr-2 h-4 w-4" />
            Voz ativa
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onStartVoice}
            className="rounded-full bg-red-600 px-5 text-white hover:bg-red-500"
          >
            <Mic className="mr-2 h-4 w-4" />
            Ativar voz
          </Button>
        )}

        {isSpeaking && (
          <Button
            type="button"
            variant="outline"
            onClick={onInterrupt}
            className="rounded-full border-white/10 bg-white/[0.03] px-5 text-zinc-100 hover:bg-white/[0.06]"
          >
            <Square className="mr-2 h-4 w-4" />
            Interromper
          </Button>
        )}
      </div>
    </div>
  );
};

export default NanoVoiceOrb;
