import React from "react";
import { useVoiceAssistant } from "../hooks/useVoiceAssistant";
import NanoChatPanel from "./NanoChatPanel";
import { nanoQuickPromptMap } from "../lib/nanoTheme";

const NanoAssistantPage = ({
  financialView = "general",
  onAfterMessage,
  userName = "Heitor",
  transactions = [],
  reminders = [],
  bills = [],
  onNavigateSection,
  onNavigateRoute,
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
    error,
    chatError,
    startListening,
    stopListening,
    cancelVoiceCommand,
    interruptSpeaking,
    sendMessage,
  } = useVoiceAssistant({
    onAfterMessage,
    onAssistantAction: (action) => {
      if (action?.type === "navigate") {
        if (action?.data?.route && action.data.route !== "/dashboard") {
          onNavigateRoute?.(action.data.route);
          return;
        }
        if (action?.data?.section) {
          onNavigateSection?.(action.data.section);
        }
      }
    },
  });

  const handleQuickPrompt = (prompt) => {
    setMessage(nanoQuickPromptMap[prompt] || prompt);
  };

  return (
    <div className="h-full min-h-0 overflow-hidden">
      <NanoChatPanel
        chatHistory={chatHistory}
        message={message}
        setMessage={setMessage}
        userName={userName}
        transactions={transactions}
        reminders={reminders}
        bills={bills}
        onSend={() => sendMessage()}
        onQuickPrompt={handleQuickPrompt}
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
        isWakeArmed={isWakeArmed}
        isAwaitingVoiceCommand={isAwaitingVoiceCommand}
        voiceSupported={voiceSupported}
        error={error}
        chatError={chatError}
        onStartVoice={startListening}
        onStopVoice={stopListening}
        onCancelVoiceCommand={cancelVoiceCommand}
        onInterrupt={interruptSpeaking}
      />
    </div>
  );
};

export default NanoAssistantPage;
