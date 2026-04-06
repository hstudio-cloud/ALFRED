import React from 'react';
import AlfredChatPanel from './AlfredChatPanel';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';
import {
  Bell,
  BrainCircuit,
  CalendarRange,
  CircleDollarSign,
  Eye,
  FileText,
  Sparkles
} from 'lucide-react';

const scopeMeta = {
  general: {
    label: 'Visao geral',
    subtitle: 'Leitura consolidada entre pessoal e empresa.'
  },
  personal: {
    label: 'Conta pessoal',
    subtitle: 'Respostas orientadas ao seu financeiro individual.'
  },
  business: {
    label: 'Conta empresa',
    subtitle: 'Respostas focadas em caixa, contas e rotina da empresa.'
  }
};

const railItems = [
  { id: 'chat', icon: BrainCircuit, active: true },
  { id: 'visao', icon: Eye },
  { id: 'tarefas', icon: CalendarRange },
  { id: 'contas', icon: FileText },
  { id: 'alertas', icon: Bell },
  { id: 'financeiro', icon: CircleDollarSign },
  { id: 'spark', icon: Sparkles }
];

const AlfredAssistantPage = ({
  financialView = 'general',
  onAfterMessage,
  userName = 'Heitor'
}) => {
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
    assistantRuntime,
    voiceSupported,
    isWakeArmed,
    isAwaitingVoiceCommand,
    lastVoiceCommand,
    lastAssistantReply,
    error,
    startListening,
    stopListening,
    interruptSpeaking,
    sendMessage
  } = useVoiceAssistant({ onAfterMessage });

  const activeScope = scopeMeta[financialView] || scopeMeta.general;
  const firstName = (userName || 'Heitor').split(' ')[0];

  return (
    <div className="overflow-hidden rounded-[34px] border border-white/6 bg-[radial-gradient(circle_at_top,rgba(127,29,29,0.14),transparent_18%),linear-gradient(180deg,rgba(5,8,20,0.98),rgba(5,8,20,0.96))] shadow-[0_34px_110px_rgba(2,8,23,0.46)]">
      <div className="relative min-h-[780px] overflow-hidden px-6 py-8 lg:px-12 lg:py-10">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.15)_0.8px,transparent_0.8px)] [background-size:28px_28px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,rgba(239,68,68,0.06),transparent_18%),radial-gradient(circle_at_78%_74%,rgba(239,68,68,0.05),transparent_14%)]" />

        <div className="pointer-events-none absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col gap-4 lg:flex">
          {railItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.id}
                className={`flex h-10 w-10 items-center justify-center rounded-[16px] border transition ${
                  item.active
                    ? 'border-red-400/16 bg-red-500/18 text-red-100 shadow-[0_0_24px_rgba(239,68,68,0.14)]'
                    : 'border-white/6 bg-white/[0.02] text-zinc-500'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
            );
          })}
        </div>

        <div className="relative z-10 mx-auto flex max-w-[1180px] flex-col items-center">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] border border-red-400/16 bg-red-500/[0.08] shadow-[0_0_30px_rgba(239,68,68,0.1)]">
              <span className="text-3xl font-semibold text-red-100">N</span>
            </div>
            <h2 className="mt-6 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
              Ola {firstName}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-zinc-400">
              O Nano organiza sua rotina financeira com respostas mais claras e operacionais.
            </p>
            <div className="mt-5 inline-flex rounded-full border border-red-500/12 bg-red-500/[0.08] px-4 py-2 text-xs font-medium text-red-100">
              {activeScope.label}  |  {activeScope.subtitle}
            </div>
          </div>

          <div className="mt-12 w-full">
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
              currentLevel={currentLevel}
              voiceState={voiceState}
              voiceStatus={voiceStatus}
              voiceProviderType={voiceProviderType}
              assistantRuntime={assistantRuntime}
              voiceSupported={voiceSupported}
              isWakeArmed={isWakeArmed}
              isAwaitingVoiceCommand={isAwaitingVoiceCommand}
              lastVoiceCommand={lastVoiceCommand}
              lastAssistantReply={lastAssistantReply}
              error={error}
              onStartVoice={startListening}
              onStopVoice={stopListening}
              onInterrupt={interruptSpeaking}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlfredAssistantPage;
