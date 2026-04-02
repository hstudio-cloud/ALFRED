import React from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import AIVoiceVisualizer from './AIVoiceVisualizer';
import { Mic, MicOff, Settings2, Square, Volume2 } from 'lucide-react';
import { alfredSuggestedCommands, alfredVoiceStateCopy, alfredTheme } from '../lib/alfredTheme';

const AlfredVoiceOrb = ({
  voiceState,
  voiceStatus,
  currentLevel,
  voiceProviderType,
  isWakeArmed,
  isSpeaking,
  onStartVoice,
  onStopVoice,
  onInterrupt
}) => {
  const copy = alfredVoiceStateCopy[voiceState] || alfredVoiceStateCopy.idle;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-cyan-300/80">Assistente Alfred</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white">
            Converse com sua central financeira
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
            Fale ou digite para registrar gastos, criar lembretes, analisar contas e organizar suas finanças pessoais e da empresa.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Badge variant="outline" className={alfredTheme.accentChip}>
            <span className="mr-2 inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            online
          </Badge>
          <Badge variant="outline" className={alfredTheme.subtleChip}>
            {isWakeArmed ? 'voz pronta' : 'voz inativa'}
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-full border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.08] hover:text-white"
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className={`rounded-[34px] p-5 ${alfredTheme.glass}`}>
        <AIVoiceVisualizer mode={voiceState === 'error' ? 'idle' : voiceState} amplitude={currentLevel} />

        <div className="mt-8 text-center">
          <p className="text-lg font-medium text-white">{copy.label}</p>
          <p className="mt-2 text-sm leading-7 text-slate-400">{voiceStatus || copy.description}</p>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Badge variant="outline" className={alfredTheme.accentChip}>
            modo ativo: {voiceState}
          </Badge>
          <Badge variant="outline" className={alfredTheme.subtleChip}>
            provider: {voiceProviderType}
          </Badge>
          <Badge variant="outline" className={alfredTheme.subtleChip}>
            intensidade: {Math.round(currentLevel * 100)}%
          </Badge>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {isWakeArmed ? (
            <Button type="button" onClick={onStopVoice} variant="outline" className="gap-2 rounded-full border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]">
              <MicOff className="h-4 w-4" />
              Desativar voz
            </Button>
          ) : (
            <Button type="button" onClick={onStartVoice} className="gap-2 rounded-full bg-cyan-400 px-5 text-slate-950 hover:bg-cyan-300">
              <Mic className="h-4 w-4" />
              Ativar voz
            </Button>
          )}

          {isSpeaking && (
            <Button type="button" onClick={onInterrupt} variant="outline" className="gap-2 rounded-full border-rose-400/20 bg-rose-400/10 px-5 text-rose-100 hover:bg-rose-400/20">
              <Square className="h-4 w-4" />
              Interromper voz
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_auto] xl:items-end">
        <div className={`rounded-[28px] px-5 py-4 ${alfredTheme.softPanel}`}>
          <p className="text-xs uppercase tracking-[0.26em] text-slate-500">Sugestao de acao</p>
          <div className="mt-3 flex items-center gap-3 text-slate-200">
            <Volume2 className="h-4 w-4 text-cyan-300" />
            <span>Diga: criar despesa de 120 reais com combustivel</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {alfredSuggestedCommands.slice(0, 3).map((chip) => (
            <Badge key={chip} variant="outline" className="border-white/10 bg-white/[0.03] px-3 py-2 text-slate-300">
              {chip}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AlfredVoiceOrb;
