import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import AIVoiceVisualizer from './AIVoiceVisualizer';
import { Mic, MicOff, Square } from 'lucide-react';
import { alfredVoiceStateCopy, alfredTheme } from '../lib/alfredTheme';

const AlfredVoiceOrb = ({
  voiceState,
  voiceStatus,
  currentLevel,
  voiceProviderType,
  assistantRuntime,
  isWakeArmed,
  isSpeaking,
  onStartVoice,
  onStopVoice,
  onInterrupt
}) => {
  const copy = alfredVoiceStateCopy[voiceState] || alfredVoiceStateCopy.idle;
  const runtime = assistantRuntime || {};

  const stackLabel = runtime.runtimeMode === 'self_hosted'
    ? 'stack local'
    : runtime.runtimeMode === 'hosted'
      ? 'stack hospedado'
      : 'fallback';

  return (
    <div className="w-full max-w-[320px] text-center">
      <div className="mx-auto w-full max-w-[260px]">
        <AIVoiceVisualizer mode={voiceState === 'error' ? 'idle' : voiceState} amplitude={currentLevel} />
      </div>

      <div className="mt-6">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-[14px] border border-red-400/20 bg-red-500/[0.08]">
          <span className="text-base font-semibold text-red-100">N</span>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          {voiceStatus || copy.description}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        <Badge variant="outline" className={alfredTheme.subtleChip}>
          {copy.label}
        </Badge>
        <Badge variant="outline" className={alfredTheme.subtleChip}>
          {stackLabel}
        </Badge>
        <Badge variant="outline" className={alfredTheme.subtleChip}>
          {runtime.llmModel || voiceProviderType}
        </Badge>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {isWakeArmed ? (
          <Button
            type="button"
            onClick={onStopVoice}
            variant="outline"
            className="gap-2 rounded-full border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]"
          >
            <MicOff className="h-4 w-4" />
            Voz ativa
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onStartVoice}
            className="gap-2 rounded-full bg-red-500 px-5 text-white hover:bg-red-400"
          >
            <Mic className="h-4 w-4" />
            Ativar voz
          </Button>
        )}

        {isSpeaking && (
          <Button
            type="button"
            onClick={onInterrupt}
            variant="outline"
            className="gap-2 rounded-full border-rose-400/20 bg-rose-400/10 px-5 text-rose-100 hover:bg-rose-400/20"
          >
            <Square className="h-4 w-4" />
            Parar
          </Button>
        )}
      </div>
    </div>
  );
};

export default AlfredVoiceOrb;
