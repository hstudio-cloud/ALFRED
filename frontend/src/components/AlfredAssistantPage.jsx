import React, { useMemo } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import AlfredVoiceOrb from './AlfredVoiceOrb';
import AlfredChatPanel from './AlfredChatPanel';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import { alfredQuickPrompts, alfredSuggestedCommands, alfredTheme } from '../lib/alfredTheme';
import { Building2, BriefcaseBusiness, Sparkles, Wallet } from 'lucide-react';

const scopeMeta = {
  general: {
    label: 'Visão geral',
    icon: Building2,
    description: 'Consolide despesas pessoais e empresariais em uma única leitura.'
  },
  personal: {
    label: 'Conta pessoal',
    icon: Wallet,
    description: 'O Alfred considera gastos e lembretes do seu contexto individual.'
  },
  business: {
    label: 'Conta empresa',
    icon: BriefcaseBusiness,
    description: 'O Alfred responde considerando fluxo de caixa, contas e pagamentos da empresa.'
  }
};

const AlfredAssistantPage = ({ financialView = 'general', onAfterMessage }) => {
  const {
    chatHistory,
    message,
    setMessage,
    partialTranscript,
    finalTranscript,
    isListening,
    isProcessing,
    isSpeaking,
    currentLevel,
    voiceState,
    voiceStatus,
    voiceProviderType,
    voiceSupported,
    isWakeArmed,
    error,
    startListening,
    stopListening,
    interruptSpeaking,
    sendMessage
  } = useVoiceAssistant({ onAfterMessage });

  const activeScope = scopeMeta[financialView] || scopeMeta.general;
  const ScopeIcon = activeScope.icon;

  const quickCards = useMemo(
    () => [
      {
        title: 'Registro assistido',
        description: 'Despesas, receitas, categorias e contas entram na rotina sem formulário pesado.'
      },
      {
        title: 'Separação inteligente',
        description: 'O Alfred pode sugerir quando um gasto deve ficar no pessoal ou na empresa.'
      },
      {
        title: 'Ação contínua por voz',
        description: 'Ative a voz uma vez e siga conversando sem recarregar a interface.'
      }
    ],
    []
  );

  const handlePromptClick = async (prompt) => {
    const outgoing = alfredQuickPrompts[prompt] || prompt;
    setMessage(outgoing);
    await sendMessage(outgoing);
  };

  return (
    <div className={alfredTheme.shell}>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(360px,1fr)]">
        <div className="space-y-6">
          <div className={`rounded-[32px] px-6 py-5 ${alfredTheme.glass}`}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <Badge variant="outline" className={`${alfredTheme.subtleChip} rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.24em]`}>
                  assistente financeiro premium
                </Badge>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className={`${alfredTheme.accentChip} rounded-full px-3 py-1 text-[11px]`}>
                    <ScopeIcon className="mr-2 h-3.5 w-3.5" />
                    {activeScope.label}
                  </Badge>
                  <span className="text-sm text-slate-400">{activeScope.description}</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`${alfredTheme.subtleChip} rounded-full px-3 py-1 text-[11px]`}>
                  {voiceSupported ? 'microfone disponível' : 'voz limitada'}
                </Badge>
                <Badge variant="outline" className={`${alfredTheme.subtleChip} rounded-full px-3 py-1 text-[11px]`}>
                  wake word: Alfred
                </Badge>
              </div>
            </div>
          </div>

          <AlfredVoiceOrb
            voiceState={voiceState}
            voiceStatus={voiceStatus}
            currentLevel={currentLevel}
            voiceProviderType={voiceProviderType}
            isWakeArmed={isWakeArmed}
            isSpeaking={isSpeaking}
            onStartVoice={startListening}
            onStopVoice={stopListening}
            onInterrupt={interruptSpeaking}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            {quickCards.map((item) => (
              <div key={item.title} className={`rounded-[26px] px-5 py-5 ${alfredTheme.softPanel}`}>
                <div className="flex items-center gap-2 text-cyan-200">
                  <Sparkles className="h-4 w-4" />
                  <p className="text-sm font-medium text-white">{item.title}</p>
                </div>
                <p className="mt-3 text-sm leading-7 text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>

          <div className={`rounded-[28px] px-5 py-5 ${alfredTheme.softPanel}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Sugestões de comandos</p>
                <p className="mt-2 text-sm text-slate-300">
                  Alfred pode separar seus gastos pessoais e empresariais automaticamente.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {alfredSuggestedCommands.map((prompt) => (
                <Button
                  key={prompt}
                  type="button"
                  variant="outline"
                  onClick={() => handlePromptClick(prompt)}
                  className="rounded-full border-white/10 bg-white/[0.03] px-4 text-slate-200 hover:bg-white/[0.07] hover:text-white"
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <AlfredChatPanel
          chatHistory={chatHistory}
          message={message}
          setMessage={setMessage}
          onSend={() => sendMessage()}
          isListening={isListening}
          isProcessing={isProcessing}
          isSpeaking={isSpeaking}
          partialTranscript={partialTranscript}
          finalTranscript={finalTranscript}
          voiceSupported={voiceSupported}
          isWakeArmed={isWakeArmed}
          error={error}
          onStartVoice={startListening}
          onStopVoice={stopListening}
          onInterrupt={interruptSpeaking}
        />
      </div>
    </div>
  );
};

export default AlfredAssistantPage;
